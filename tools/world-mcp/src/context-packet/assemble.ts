import type { NodeType } from "@worldloom/world-index/public/types";

import { openIndexDb } from "../db";
import { createMcpError, type McpError } from "../errors";
import type { TaskType } from "../ranking/profiles";

import { buildExactRecordLinks } from "./exact-record-links";
import { buildGoverningWorldContext } from "./governing-world-context";
import {
  buildLocalAuthority,
  findLocalAuthoritySourceNodeIds
} from "./local-authority";
import { buildImpactSurfaces } from "./impact-surfaces";
import { buildScopedLocalContext } from "./scoped-local-context";
import {
  DEFAULT_DELIVERY_MODE,
  DEFAULT_PACKET_VERSION,
  TRUNCATION_FALLBACK_ADVICE,
  estimatePacketTokens,
  uniqueStrings,
  type ContextPacket,
  type ContextPacketNode,
  type ContextPacketTruncationSummary,
  type DeliveryMode
} from "./shared";

export { DEFAULT_BUDGET_SPLIT, DEFAULT_PACKET_VERSION } from "./shared";
export type { ContextPacket, ContextPacketArgs } from "./shared";

const DROP_PRIORITY = [
  "impact_surfaces",
  "scoped_local_context",
  "exact_record_links",
  "governing_world_context"
] as const;

type DroppableLayer = (typeof DROP_PRIORITY)[number];

function makeEmptyTruncationSummary(): ContextPacketTruncationSummary {
  return {
    dropped_layers: [],
    dropped_node_ids_by_layer: {},
    fallback_advice: TRUNCATION_FALLBACK_ADVICE
  };
}

function makeEmptyPacket(args: {
  taskType: TaskType;
  worldSlug: string;
  seedNodes: string[];
  tokenBudget: number;
}): ContextPacket {
  return {
    task_header: {
      task_type: args.taskType,
      world_slug: args.worldSlug,
      generated_at: new Date().toISOString(),
      token_budget: {
        requested: args.tokenBudget,
        allocated: 0
      },
      seed_nodes: uniqueStrings(args.seedNodes),
      packet_version: DEFAULT_PACKET_VERSION
    },
    local_authority: {
      nodes: [],
      why_included: []
    },
    exact_record_links: {
      nodes: [],
      why_included: []
    },
    scoped_local_context: {
      nodes: [],
      why_included: []
    },
    governing_world_context: {
      active_rules: [],
      protected_surfaces: [],
      required_output_schema: [],
      prohibited_moves: [],
      open_risks: [],
      nodes: [],
      why_included: []
    },
    impact_surfaces: {
      nodes: [],
      rationale: []
    },
    truncation_summary: makeEmptyTruncationSummary()
  };
}

function isLayerEmpty(packet: ContextPacket, layer: DroppableLayer): boolean {
  switch (layer) {
    case "impact_surfaces":
      return packet.impact_surfaces.nodes.length === 0;
    case "scoped_local_context":
      return packet.scoped_local_context.nodes.length === 0;
    case "exact_record_links":
      return packet.exact_record_links.nodes.length === 0;
    case "governing_world_context": {
      const g = packet.governing_world_context;
      return (
        g.nodes.length === 0 &&
        g.active_rules.length === 0 &&
        g.protected_surfaces.length === 0 &&
        g.required_output_schema.length === 0 &&
        g.prohibited_moves.length === 0 &&
        g.open_risks.length === 0
      );
    }
  }
}

function clearLayer(packet: ContextPacket, layer: DroppableLayer): void {
  switch (layer) {
    case "impact_surfaces":
      packet.impact_surfaces = { nodes: [], rationale: [] };
      return;
    case "scoped_local_context":
      packet.scoped_local_context = { nodes: [], why_included: [] };
      return;
    case "exact_record_links":
      packet.exact_record_links = { nodes: [], why_included: [] };
      return;
    case "governing_world_context":
      packet.governing_world_context = {
        active_rules: [],
        protected_surfaces: [],
        required_output_schema: [],
        prohibited_moves: [],
        open_risks: [],
        nodes: [],
        why_included: []
      };
      return;
  }
}

function recordDrop(packet: ContextPacket, layer: DroppableLayer, nodeIds: string[]): void {
  packet.truncation_summary.dropped_layers.push(layer);
  packet.truncation_summary.dropped_node_ids_by_layer[layer] = nodeIds;
}

function applyClassFilter(
  packet: ContextPacket,
  nodeClasses: readonly NodeType[] | undefined
): void {
  if (nodeClasses === undefined) {
    return;
  }

  const allowed = new Set<NodeType>(nodeClasses);
  const keep = (node: ContextPacketNode): boolean => allowed.has(node.node_type);

  packet.local_authority.nodes = packet.local_authority.nodes.filter(keep);
  packet.exact_record_links.nodes = packet.exact_record_links.nodes.filter(keep);
  packet.scoped_local_context.nodes = packet.scoped_local_context.nodes.filter(keep);
  packet.governing_world_context.nodes = packet.governing_world_context.nodes.filter(keep);
  packet.impact_surfaces.nodes = packet.impact_surfaces.nodes.filter(keep);
}

function estimateStablePacketSize(packet: ContextPacket): number {
  const originalAllocated = packet.task_header.token_budget.allocated;
  const originalRequested = packet.task_header.token_budget.requested;
  try {
    let candidate = estimatePacketTokens(packet);
    for (;;) {
      packet.task_header.token_budget.allocated = candidate;
      packet.task_header.token_budget.requested = Math.max(originalRequested, candidate);
      const adjusted = estimatePacketTokens(packet);
      if (adjusted <= candidate) {
        return candidate;
      }
      candidate = adjusted;
    }
  } finally {
    packet.task_header.token_budget.allocated = originalAllocated;
    packet.task_header.token_budget.requested = originalRequested;
  }
}

function enforceBudget(packet: ContextPacket, requestedBudget: number): void {
  for (const layer of DROP_PRIORITY) {
    if (estimateStablePacketSize(packet) <= requestedBudget) {
      return;
    }
    if (isLayerEmpty(packet, layer)) {
      continue;
    }

    const nodeIds = packet[layer].nodes.map((node) => node.id);
    clearLayer(packet, layer);
    recordDrop(packet, layer, nodeIds);
  }
}


export async function assembleContextPacket(args: {
  task_type: TaskType;
  world_slug: string;
  seed_nodes: string[];
  token_budget: number;
  delivery_mode?: DeliveryMode;
  node_classes?: NodeType[];
}): Promise<ContextPacket | McpError> {
  const opened = openIndexDb(args.world_slug);
  if (!("db" in opened)) {
    return opened;
  }

  const deliveryMode: DeliveryMode = args.delivery_mode ?? DEFAULT_DELIVERY_MODE;

  try {
    const packet = makeEmptyPacket({
      taskType: args.task_type,
      worldSlug: args.world_slug,
      seedNodes: args.seed_nodes,
      tokenBudget: args.token_budget
    });

    const localAuthoritySourceIds = await findLocalAuthoritySourceNodeIds(
      opened.db,
      args.world_slug,
      args.seed_nodes
    );
    if ("code" in localAuthoritySourceIds) {
      return localAuthoritySourceIds;
    }

    packet.local_authority = buildLocalAuthority(
      opened.db,
      args.world_slug,
      localAuthoritySourceIds,
      deliveryMode
    );
    packet.exact_record_links = buildExactRecordLinks(
      opened.db,
      args.world_slug,
      localAuthoritySourceIds,
      packet.local_authority.nodes.map((node) => node.id),
      deliveryMode
    );
    packet.scoped_local_context = buildScopedLocalContext(
      opened.db,
      args.world_slug,
      localAuthoritySourceIds,
      [...packet.local_authority.nodes, ...packet.exact_record_links.nodes],
      deliveryMode
    );
    packet.governing_world_context = await buildGoverningWorldContext(
      opened.db,
      args.world_slug,
      args.task_type,
      [
        ...packet.local_authority.nodes,
        ...packet.exact_record_links.nodes,
        ...packet.scoped_local_context.nodes
      ],
      deliveryMode
    );
    packet.impact_surfaces = await buildImpactSurfaces(
      opened.db,
      args.world_slug,
      [
        ...packet.local_authority.nodes,
        ...packet.exact_record_links.nodes,
        ...packet.scoped_local_context.nodes
      ],
      deliveryMode
    );

    applyClassFilter(packet, args.node_classes);

    enforceBudget(packet, args.token_budget);

    const stableAllocated = estimateStablePacketSize(packet);
    if (stableAllocated > args.token_budget) {
      return createMcpError(
        "packet_incomplete_required_classes",
        "The requested token budget cannot fit local_authority alone.",
        {
          missing_classes: ["local_authority", ...packet.truncation_summary.dropped_layers],
          requested_budget: args.token_budget,
          minimum_required_budget: stableAllocated,
          retry_with: { token_budget: stableAllocated },
          retained_classes: [],
          truncation_summary: packet.truncation_summary
        }
      );
    }

    packet.task_header.token_budget.allocated = stableAllocated;

    return packet;
  } finally {
    opened.db.close();
  }
}
