import type { NodeType } from "@worldloom/world-index/public/types";

import { openIndexDb } from "../db";
import { createMcpError, type McpError } from "../errors";
import type { TaskType } from "../ranking/profiles";

import { applyTaskTypeFullBodyDelivery } from "./full-body-delivery";
import { buildExactRecordLinks } from "./exact-record-links";
import {
  buildGoverningWorldContext,
  createCharacterGenerationRecordProjection
} from "./governing-world-context";
import {
  buildLocalAuthority,
  findLocalAuthoritySourceNodeIds
} from "./local-authority";
import { buildImpactSurfaces } from "./impact-surfaces";
import { buildScopedLocalContext } from "./scoped-local-context";
import {
  CONTEXT_PACKET_ESTIMATOR_VERSION,
  DEFAULT_DELIVERY_MODE,
  DEFAULT_PACKET_VERSION,
  TRUNCATION_FALLBACK_ADVICE,
  estimatePacketChars,
  estimateStablePacketChars,
  estimateStablePacketSize,
  resolveHarnessCeilingChars,
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
  harnessCeilingChars: number;
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
      full_body_classes_delivered: [],
      harness_ceiling_chars: args.harnessCeilingChars,
      estimator_version: CONTEXT_PACKET_ESTIMATOR_VERSION,
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
  if (packet.truncation_summary.full_body_downgrades !== undefined) {
    const retainedDowngrades = packet.truncation_summary.full_body_downgrades.filter(
      (downgrade) => downgrade.layer !== layer
    );
    if (retainedDowngrades.length === 0) {
      delete packet.truncation_summary.full_body_downgrades;
    } else {
      packet.truncation_summary.full_body_downgrades = retainedDowngrades;
    }
  }
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

function packetFitsBudget(
  packet: ContextPacket,
  requestedBudget: number,
  harnessCeilingChars: number
): boolean {
  return (
    estimateStablePacketSize(packet) <= requestedBudget &&
    estimateStablePacketChars(packet) <= harnessCeilingChars
  );
}

function enforceBudget(
  packet: ContextPacket,
  requestedBudget: number,
  harnessCeilingChars: number
): void {
  for (const layer of DROP_PRIORITY) {
    if (packetFitsBudget(packet, requestedBudget, harnessCeilingChars)) {
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
  const harnessCeilingChars = resolveHarnessCeilingChars();

  try {
    const packet = makeEmptyPacket({
      taskType: args.task_type,
      worldSlug: args.world_slug,
      seedNodes: args.seed_nodes,
      tokenBudget: args.token_budget,
      harnessCeilingChars
    });

    const localAuthoritySourceIds = await findLocalAuthoritySourceNodeIds(
      opened.db,
      args.world_slug,
      args.seed_nodes
    );
    if ("code" in localAuthoritySourceIds) {
      return localAuthoritySourceIds;
    }

    const recordProjection =
      args.task_type === "character_generation"
        ? createCharacterGenerationRecordProjection(
            opened.db,
            args.world_slug,
            localAuthoritySourceIds
          )
        : undefined;

    packet.local_authority = buildLocalAuthority(
      opened.db,
      args.world_slug,
      localAuthoritySourceIds,
      deliveryMode,
      recordProjection
    );
    packet.exact_record_links = buildExactRecordLinks(
      opened.db,
      args.world_slug,
      localAuthoritySourceIds,
      packet.local_authority.nodes.map((node) => node.id),
      deliveryMode,
      recordProjection
    );
    packet.scoped_local_context = buildScopedLocalContext(
      opened.db,
      args.world_slug,
      localAuthoritySourceIds,
      [...packet.local_authority.nodes, ...packet.exact_record_links.nodes],
      deliveryMode,
      recordProjection
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
      deliveryMode,
      recordProjection
    );
    packet.impact_surfaces = await buildImpactSurfaces(
      opened.db,
      args.world_slug,
      [
        ...packet.local_authority.nodes,
        ...packet.exact_record_links.nodes,
        ...packet.scoped_local_context.nodes
      ],
      deliveryMode,
      recordProjection
    );

    applyClassFilter(packet, args.node_classes);

    enforceBudget(packet, args.token_budget, harnessCeilingChars);

    const previewAllocated = estimateStablePacketSize(packet);
    const previewChars = estimateStablePacketChars(packet);
    if (previewAllocated > args.token_budget || previewChars > harnessCeilingChars) {
      return createMcpError(
        "packet_incomplete_required_classes",
        "The requested budget cannot fit local_authority under the configured context-packet ceilings.",
        {
          missing_classes: ["local_authority", ...packet.truncation_summary.dropped_layers],
          requested_budget: args.token_budget,
          minimum_required_budget: previewAllocated,
          retry_with: { token_budget: previewAllocated },
          harness_ceiling_chars: harnessCeilingChars,
          minimum_required_harness_ceiling_chars: previewChars,
          retained_classes: [],
          truncation_summary: packet.truncation_summary
        }
      );
    }

    applyTaskTypeFullBodyDelivery(opened.db, packet, {
      taskType: args.task_type,
      worldSlug: args.world_slug,
      tokenBudget: args.token_budget,
      harnessCeilingChars
    });

    enforceBudget(packet, args.token_budget, harnessCeilingChars);

    const stableAllocated = estimateStablePacketSize(packet);
    packet.task_header.token_budget.allocated = stableAllocated;
    if (stableAllocated > args.token_budget || estimatePacketChars(packet) > harnessCeilingChars) {
      return createMcpError(
        "packet_incomplete_required_classes",
        "The context packet exceeded the configured ceilings after full-body allocation.",
        {
          missing_classes: ["local_authority", ...packet.truncation_summary.dropped_layers],
          requested_budget: args.token_budget,
          minimum_required_budget: stableAllocated,
          retry_with: { token_budget: stableAllocated },
          harness_ceiling_chars: harnessCeilingChars,
          minimum_required_harness_ceiling_chars: estimatePacketChars(packet),
          retained_classes: [],
          truncation_summary: packet.truncation_summary
        }
      );
    }

    return packet;
  } finally {
    opened.db.close();
  }
}
