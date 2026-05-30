import type { NodeType } from "@worldloom/world-index/public/types";

import { openIndexDb } from "../db/index.js";
import { createMcpError, type McpError } from "../errors.js";
import type { TaskType } from "../ranking/profiles/index.js";

import { applyTaskTypeFullBodyDelivery } from "./full-body-delivery.js";
import { buildExactRecordLinks } from "./exact-record-links.js";
import {
  buildGoverningWorldContext,
  createCharacterGenerationRecordProjection
} from "./governing-world-context.js";
import {
  buildLocalAuthority,
  findLocalAuthoritySourceNodeIds
} from "./local-authority.js";
import { buildImpactSurfaces } from "./impact-surfaces.js";
import { buildScopedLocalContext } from "./scoped-local-context.js";
import {
  CONTEXT_PACKET_ESTIMATOR_VERSION,
  DEFAULT_DELIVERY_MODE,
  DEFAULT_PACKET_VERSION,
  ENVELOPE_OVERHEAD_RESERVE_CHARS,
  GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE,
  TRUNCATION_FALLBACK_ADVICE,
  estimatePacketChars,
  estimateStablePacketChars,
  estimateStablePacketSize,
  isStoryPipelineTaskType,
  resolveHarnessCeilingChars,
  uniqueStrings,
  type ContextPacket,
  type ContextPacketGoverningSummary,
  type ContextPacketNode,
  type ContextPacketTruncationSummary,
  type DeliveryMode
} from "./shared.js";
import { persistContextPacket } from "./persistence.js";
import {
  buildStoryBundleContext,
  summarizeStoryBundleContext
} from "./story-bundle-context.js";

export { DEFAULT_BUDGET_SPLIT, DEFAULT_PACKET_VERSION } from "./shared.js";
export type { ContextPacket, ContextPacketArgs } from "./shared.js";

const DROP_PRIORITY = [
  "impact_surfaces",
  "scoped_local_context",
  "exact_record_links",
  "governing_world_context"
] as const;

type DroppableLayer = (typeof DROP_PRIORITY)[number];

function incompletePacketDetails(
  args: {
    missingClasses: string[];
    requestedBudget: number;
    minimumRequiredBudget: number;
    harnessCeilingChars: number;
    effectiveHarnessCeilingChars: number;
    minimumRequiredHarnessCeilingChars: number;
    retainedClasses: string[];
    truncationSummary: ContextPacketTruncationSummary;
  },
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const harnessCeilingIsBinding =
    args.minimumRequiredHarnessCeilingChars > args.effectiveHarnessCeilingChars;

  return {
    missing_classes: args.missingClasses,
    requested_budget: args.requestedBudget,
    minimum_required_budget: args.minimumRequiredBudget,
    ...(harnessCeilingIsBinding
      ? {}
      : { retry_with: { token_budget: args.minimumRequiredBudget } }),
    harness_ceiling_chars: args.harnessCeilingChars,
    envelope_overhead_reserve_chars: ENVELOPE_OVERHEAD_RESERVE_CHARS,
    effective_harness_ceiling_chars: args.effectiveHarnessCeilingChars,
    minimum_required_harness_ceiling_chars: args.minimumRequiredHarnessCeilingChars,
    fallback_advice: TRUNCATION_FALLBACK_ADVICE,
    ...extra,
    retained_classes: args.retainedClasses,
    truncation_summary: args.truncationSummary
  };
}

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
  storySlug?: string;
  seedNodes: string[];
  tokenBudget: number;
  harnessCeilingChars: number;
}): ContextPacket {
  return {
    task_header: {
      task_type: args.taskType,
      world_slug: args.worldSlug,
      story_slug: args.storySlug ?? null,
      generated_at: new Date().toISOString(),
      token_budget: {
        requested: args.tokenBudget,
        allocated: 0
      },
      seed_nodes: uniqueStrings(args.seedNodes),
      warnings: [],
      full_body_classes_delivered: [],
      harness_ceiling_chars: args.harnessCeilingChars,
      envelope_overhead_reserve_chars: ENVELOPE_OVERHEAD_RESERVE_CHARS,
      governing_full_body_priority: GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE[args.taskType],
      estimator_version: CONTEXT_PACKET_ESTIMATOR_VERSION,
      packet_version: DEFAULT_PACKET_VERSION,
      delivery_status: "inline"
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
    story_bundle_context: null,
    impact_surfaces: {
      nodes: [],
      rationale: []
    },
    truncation_summary: makeEmptyTruncationSummary()
  };
}

function clonePacket(packet: ContextPacket): ContextPacket {
  return JSON.parse(JSON.stringify(packet)) as ContextPacket;
}

function allPacketNodes(packet: ContextPacket): ContextPacketNode[] {
  return [
    ...packet.local_authority.nodes,
    ...packet.exact_record_links.nodes,
    ...packet.scoped_local_context.nodes,
    ...packet.governing_world_context.nodes,
    ...packet.impact_surfaces.nodes
  ];
}

function groupNodeIdsByClass(nodes: readonly ContextPacketNode[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const node of nodes) {
    grouped[node.node_type] ??= [];
    grouped[node.node_type]!.push(node.id);
  }
  return Object.fromEntries(
    Object.entries(grouped).map(([nodeType, ids]) => [nodeType, uniqueStrings(ids)])
  );
}

function buildGoverningSummary(packet: ContextPacket): ContextPacketGoverningSummary {
  const nodes = allPacketNodes(packet);
  const summary: ContextPacketGoverningSummary = {
    active_rules: [...packet.governing_world_context.active_rules],
    protected_surfaces: [...packet.governing_world_context.protected_surfaces],
    prohibited_moves: [...packet.governing_world_context.prohibited_moves],
    required_output_schema: [...packet.governing_world_context.required_output_schema],
    open_risk_ids: uniqueStrings(
      packet.governing_world_context.open_risks
        .map((risk) => risk.node_id)
        .filter((nodeId): nodeId is string => nodeId !== null)
    ),
    invariant_ids: uniqueStrings(
      nodes.filter((node) => node.node_type === "invariant").map((node) => node.id)
    ),
    seed_relevant_cf_ids: uniqueStrings(
      nodes.filter((node) => node.node_type === "canon_fact_record").map((node) => node.id)
    ),
    dropped_node_ids_by_class: groupNodeIdsByClass(nodes)
  };
  const storyBundleSummary = summarizeStoryBundleContext(packet.story_bundle_context);
  if (storyBundleSummary !== undefined) {
    summary.story_bundle_context_summary = storyBundleSummary;
  }
  return summary;
}

function buildFastSummaryPacket(packet: ContextPacket, persistedOutputPath: string): ContextPacket {
  const summary = clonePacket(packet);
  summary.task_header.delivery_status = "persisted_with_summary";
  summary.task_header.persisted_output_path = persistedOutputPath;
  summary.task_header.full_body_classes_delivered = [];
  summary.governing_summary = buildGoverningSummary(packet);

  summary.local_authority.nodes = [];
  summary.exact_record_links.nodes = [];
  summary.scoped_local_context.nodes = [];
  summary.governing_world_context.nodes = [];
  summary.story_bundle_context = null;
  summary.impact_surfaces.nodes = [];

  summary.truncation_summary = {
    dropped_layers: [],
    dropped_node_ids_by_layer: {},
    fallback_advice:
      "Full packet body persisted at task_header.persisted_output_path. Use mcp__worldloom__get_persisted_packet_slice for structured slice extraction, or mcp__worldloom__get_record / mcp__worldloom__get_records for individual records by id."
  };

  const allocated = estimateStablePacketSize(summary);
  summary.task_header.token_budget.allocated = allocated;
  return summary;
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
  effectiveHarnessCeilingChars: number
): boolean {
  return (
    estimateStablePacketSize(packet) <= requestedBudget &&
    estimateStablePacketChars(packet) <= effectiveHarnessCeilingChars
  );
}

const SCENE_COVERAGE_LAYER = "story_bundle_context.scene_coverage";

/**
 * `scene_coverage` is the lowest-priority story-bundle layer: it is trimmed
 * before any of the higher-priority DROP_PRIORITY layers. The projection is
 * prose-free, so trimming only forfeits scene/unscened membership metadata
 * (still recoverable via the governing summary's scene-coverage id fields).
 */
function trimSceneCoverage(packet: ContextPacket): void {
  const storyBundleContext = packet.story_bundle_context;
  if (storyBundleContext === null || storyBundleContext.scene_coverage === null) {
    return;
  }

  const droppedSceneIds = storyBundleContext.scene_coverage.active_scenes.map(
    (scene) => scene.scene_id
  );
  storyBundleContext.scene_coverage = null;
  packet.truncation_summary.dropped_layers.push(SCENE_COVERAGE_LAYER);
  packet.truncation_summary.dropped_node_ids_by_layer[SCENE_COVERAGE_LAYER] = droppedSceneIds;
}

function enforceBudget(
  packet: ContextPacket,
  requestedBudget: number,
  harnessCeilingChars: number
): void {
  const effectiveHarnessCeilingChars = effectivePacketBodyCeilingChars(harnessCeilingChars);
  if (!packetFitsBudget(packet, requestedBudget, effectiveHarnessCeilingChars)) {
    trimSceneCoverage(packet);
  }

  for (const layer of DROP_PRIORITY) {
    if (packetFitsBudget(packet, requestedBudget, effectiveHarnessCeilingChars)) {
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

function effectivePacketBodyCeilingChars(harnessCeilingChars: number): number {
  return Math.max(1, harnessCeilingChars - ENVELOPE_OVERHEAD_RESERVE_CHARS);
}

function usesReserveGoverningFullBodyPriority(taskType: TaskType): boolean {
  const priority = GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE[taskType];
  return priority.invariants === "reserve" || priority.mystery_reserve === "reserve";
}

function minimumPacketWithGoverningContext(packet: ContextPacket): ContextPacket {
  const minimumPacket = clonePacket(packet);
  for (const layer of ["impact_surfaces", "scoped_local_context", "exact_record_links"] as const) {
    if (!isLayerEmpty(minimumPacket, layer)) {
      clearLayer(minimumPacket, layer);
    }
  }
  return minimumPacket;
}

export async function assembleContextPacket(args: {
  task_type: TaskType;
  world_slug: string;
  story_slug?: string;
  seed_nodes: string[];
  token_budget: number;
  delivery_mode?: DeliveryMode;
  node_classes?: NodeType[];
  parent_page_id?: string;
}): Promise<ContextPacket | McpError> {
  const opened = openIndexDb(args.world_slug);
  if (!("db" in opened)) {
    return opened;
  }

  const deliveryMode: DeliveryMode = args.delivery_mode ?? DEFAULT_DELIVERY_MODE;
  const harnessCeilingChars = resolveHarnessCeilingChars();
  const effectiveHarnessCeilingChars = effectivePacketBodyCeilingChars(harnessCeilingChars);

  try {
    const packet = makeEmptyPacket({
      taskType: args.task_type,
      worldSlug: args.world_slug,
      ...(args.story_slug === undefined ? {} : { storySlug: args.story_slug }),
      seedNodes: args.seed_nodes,
      tokenBudget: args.token_budget,
      harnessCeilingChars
    });

    const localAuthoritySourceIds = await findLocalAuthoritySourceNodeIds(
      opened.db,
      args.world_slug,
      args.seed_nodes
    );
    for (const seedNodeId of localAuthoritySourceIds.unresolvedSeedNodeIds) {
      packet.task_header.warnings.push(
        `seed_node '${seedNodeId}' not found in world '${args.world_slug}'; skipped`
      );
    }
    if (
      localAuthoritySourceIds.sourceNodeIds.length === 0 &&
      localAuthoritySourceIds.unresolvedSeedNodeIds.length > 0
    ) {
      packet.task_header.warnings.push(
        "all seed_nodes were unresolved; assembled seed-independent context only"
      );
    }

    const recordProjection =
      args.task_type === "character_generation"
        ? createCharacterGenerationRecordProjection(
            opened.db,
            args.world_slug,
            localAuthoritySourceIds.sourceNodeIds
          )
        : undefined;

    packet.local_authority = buildLocalAuthority(
      opened.db,
      args.world_slug,
      localAuthoritySourceIds.sourceNodeIds,
      deliveryMode,
      recordProjection
    );
    packet.exact_record_links = buildExactRecordLinks(
      opened.db,
      args.world_slug,
      localAuthoritySourceIds.sourceNodeIds,
      packet.local_authority.nodes.map((node) => node.id),
      deliveryMode,
      recordProjection
    );
    packet.scoped_local_context = buildScopedLocalContext(
      opened.db,
      args.world_slug,
      localAuthoritySourceIds.sourceNodeIds,
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
    if (
      isStoryPipelineTaskType(args.task_type) &&
      args.task_type !== "story_bootstrap" &&
      args.story_slug !== undefined
    ) {
      const storyBundleContext = await buildStoryBundleContext(
        opened.db,
        args.world_slug,
        args.story_slug,
        args.parent_page_id === undefined ? {} : { parentPageId: args.parent_page_id }
      );
      if ("code" in storyBundleContext) {
        return storyBundleContext;
      }
      packet.story_bundle_context = storyBundleContext;
    } else {
      packet.story_bundle_context = null;
    }
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

    const fullPacketChars = estimateStablePacketChars(packet);
    if (fullPacketChars > effectiveHarnessCeilingChars) {
      const persistedPacket = clonePacket(packet);
      persistedPacket.task_header.delivery_status = "inline";
      persistedPacket.task_header.token_budget.allocated = estimateStablePacketSize(persistedPacket);
      const persistedOutputPath = persistContextPacket(persistedPacket);
      const summaryPacket = buildFastSummaryPacket(packet, persistedOutputPath);
      if (estimatePacketChars(summaryPacket) <= effectiveHarnessCeilingChars) {
        return summaryPacket;
      }
    }

    enforceBudget(packet, args.token_budget, harnessCeilingChars);

    const previewAllocated = estimateStablePacketSize(packet);
    const previewChars = estimateStablePacketChars(packet);
    if (previewAllocated > args.token_budget || previewChars > effectiveHarnessCeilingChars) {
      return createMcpError(
        "packet_incomplete_required_classes",
        "The requested budget cannot fit local_authority under the configured context-packet ceilings.",
        incompletePacketDetails({
          missingClasses: ["local_authority", ...packet.truncation_summary.dropped_layers],
          requestedBudget: args.token_budget,
          minimumRequiredBudget: previewAllocated,
          harnessCeilingChars,
          effectiveHarnessCeilingChars,
          minimumRequiredHarnessCeilingChars: previewChars,
          retainedClasses: [],
          truncationSummary: packet.truncation_summary
        })
      );
    }

    const fullBodyDeliveryResult = applyTaskTypeFullBodyDelivery(opened.db, packet, {
      taskType: args.task_type,
      worldSlug: args.world_slug,
      tokenBudget: args.token_budget,
      effectiveHarnessCeilingChars
    });
    if (!fullBodyDeliveryResult.ok) {
      return createMcpError(
        "packet_incomplete_required_classes",
        "The requested budget cannot fit required governing-context full bodies under the configured context-packet ceilings.",
        incompletePacketDetails(
          {
            missingClasses: fullBodyDeliveryResult.missing_classes,
            requestedBudget: args.token_budget,
            minimumRequiredBudget: fullBodyDeliveryResult.minimum_required_budget,
            harnessCeilingChars,
            effectiveHarnessCeilingChars,
            minimumRequiredHarnessCeilingChars:
              fullBodyDeliveryResult.minimum_required_harness_ceiling_chars,
            retainedClasses: [],
            truncationSummary: packet.truncation_summary
          },
          {
            governing_full_body_priority: packet.task_header.governing_full_body_priority
          }
        )
      );
    }

    const packetWithRequiredGoverningBodies = usesReserveGoverningFullBodyPriority(args.task_type)
      ? clonePacket(packet)
      : undefined;

    enforceBudget(packet, args.token_budget, harnessCeilingChars);
    if (
      packetWithRequiredGoverningBodies !== undefined &&
      packet.truncation_summary.dropped_layers.includes("governing_world_context")
    ) {
      const minimumPacket = minimumPacketWithGoverningContext(packetWithRequiredGoverningBodies);
      const minimumRequiredBudget = estimateStablePacketSize(minimumPacket);
      const minimumRequiredHarnessCeilingChars = estimateStablePacketChars(minimumPacket);
      return createMcpError(
        "packet_incomplete_required_classes",
        "The requested budget cannot fit required governing-context full bodies under the configured context-packet ceilings.",
        incompletePacketDetails(
          {
            missingClasses: ["governing_world_context.full_body"],
            requestedBudget: args.token_budget,
            minimumRequiredBudget,
            harnessCeilingChars,
            effectiveHarnessCeilingChars,
            minimumRequiredHarnessCeilingChars,
            retainedClasses: ["local_authority", "governing_world_context"],
            truncationSummary: minimumPacket.truncation_summary
          },
          {
            governing_full_body_priority: packet.task_header.governing_full_body_priority
          }
        )
      );
    }

    const stableAllocated = estimateStablePacketSize(packet);
    packet.task_header.token_budget.allocated = stableAllocated;
    if (stableAllocated > args.token_budget || estimatePacketChars(packet) > effectiveHarnessCeilingChars) {
      const minimumRequiredHarnessCeilingChars = estimatePacketChars(packet);
      return createMcpError(
        "packet_incomplete_required_classes",
        "The context packet exceeded the configured ceilings after full-body allocation.",
        incompletePacketDetails({
          missingClasses: ["local_authority", ...packet.truncation_summary.dropped_layers],
          requestedBudget: args.token_budget,
          minimumRequiredBudget: stableAllocated,
          harnessCeilingChars,
          effectiveHarnessCeilingChars,
          minimumRequiredHarnessCeilingChars,
          retainedClasses: [],
          truncationSummary: packet.truncation_summary
        })
      );
    }

    return packet;
  } finally {
    opened.db.close();
  }
}
