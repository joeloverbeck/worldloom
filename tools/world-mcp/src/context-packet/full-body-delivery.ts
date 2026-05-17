import type Database from "better-sqlite3";
import YAML from "yaml";
import type { NodeType } from "@worldloom/world-index/public/types";

import type { TaskType } from "../ranking/profiles/index.js";

import {
  GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE,
  estimateStablePacketChars,
  estimateStablePacketSize,
  uniqueStrings,
  type ContextPacket,
  type ContextPacketNode
} from "./shared.js";

const FULL_BODY_LAYER_PRIORITY = [
  "local_authority",
  "governing_world_context",
  "exact_record_links"
] as const;

type FullBodyLayer = (typeof FULL_BODY_LAYER_PRIORITY)[number];

interface FullBodyRule {
  nodeType: NodeType;
  sectionFileClasses?: readonly string[];
}

const FULL_BODY_RULES_BY_TASK_TYPE: Record<TaskType, readonly FullBodyRule[]> = {
  canon_addition: [
    { nodeType: "canon_fact_record" },
    { nodeType: "invariant" },
    { nodeType: "mystery_reserve_entry" },
    { nodeType: "open_question_entry" }
  ],
  character_generation: [
    { nodeType: "canon_fact_record" },
    { nodeType: "invariant" },
    { nodeType: "mystery_reserve_entry" },
    { nodeType: "section", sectionFileClasses: ["PEOPLES_AND_SPECIES", "EVERYDAY_LIFE"] }
  ],
  diegetic_artifact_generation: [
    { nodeType: "canon_fact_record" },
    { nodeType: "invariant" },
    { nodeType: "mystery_reserve_entry" },
    { nodeType: "section", sectionFileClasses: ["TIMELINE", "INSTITUTIONS"] }
  ],
  continuity_audit: [],
  propose_new_canon_facts: [
    { nodeType: "canon_fact_record" },
    { nodeType: "invariant" },
    { nodeType: "mystery_reserve_entry" },
    { nodeType: "open_question_entry" }
  ],
  propose_new_characters: [
    { nodeType: "canon_fact_record" },
    { nodeType: "invariant" },
    { nodeType: "section", sectionFileClasses: ["PEOPLES_AND_SPECIES"] }
  ],
  propose_new_worlds_from_preferences: [],
  canon_facts_from_diegetic_artifacts: [
    { nodeType: "canon_fact_record" },
    { nodeType: "invariant" },
    { nodeType: "mystery_reserve_entry" },
    { nodeType: "diegetic_artifact_record" }
  ],
  emergent_pressure_events: [],
  story_bootstrap: [
    { nodeType: "invariant" },
    { nodeType: "mystery_reserve_entry" }
  ],
  story_turn_cycle: [
    { nodeType: "canon_fact_record" },
    { nodeType: "invariant" },
    { nodeType: "mystery_reserve_entry" }
  ],
  commitment_block_authoring: [
    { nodeType: "canon_fact_record" },
    { nodeType: "invariant" },
    { nodeType: "mystery_reserve_entry" }
  ],
  branching_story_health_audit: [
    { nodeType: "canon_fact_record" },
    { nodeType: "invariant" },
    { nodeType: "mystery_reserve_entry" }
  ],
  story_fact_promotion_to_canon: [
    { nodeType: "canon_fact_record" },
    { nodeType: "invariant" },
    { nodeType: "mystery_reserve_entry" },
    { nodeType: "open_question_entry" }
  ],
  other: []
};

function nodesForLayer(packet: ContextPacket, layer: FullBodyLayer): ContextPacketNode[] {
  switch (layer) {
    case "local_authority":
      return packet.local_authority.nodes;
    case "governing_world_context":
      return packet.governing_world_context.nodes;
    case "exact_record_links":
      return packet.exact_record_links.nodes;
  }
}

function normalizedFileClassFromPath(filePath: string): string | null {
  const segments = filePath.split("/");
  const sourceIndex = segments.indexOf("_source");
  if (sourceIndex === -1 || segments[sourceIndex + 1] === undefined) {
    return null;
  }

  return segments[sourceIndex + 1]!.replaceAll("-", "_").toUpperCase();
}

function normalizedFileClassFromBody(body: string): string | null {
  let parsed: unknown;
  try {
    parsed = YAML.parse(body);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const fileClass = (parsed as Record<string, unknown>).file_class;
  return typeof fileClass === "string" ? fileClass.trim().toUpperCase() : null;
}

function matchesRule(node: ContextPacketNode, body: string, rule: FullBodyRule): boolean {
  if (node.node_type !== rule.nodeType) {
    return false;
  }

  if (rule.sectionFileClasses === undefined) {
    return true;
  }

  const allowed = new Set(rule.sectionFileClasses);
  const fileClass = normalizedFileClassFromBody(body) ?? normalizedFileClassFromPath(node.file_path);
  return fileClass !== null && allowed.has(fileClass);
}

function isHighValueNode(
  taskType: TaskType,
  node: ContextPacketNode,
  body: string
): boolean {
  return FULL_BODY_RULES_BY_TASK_TYPE[taskType].some((rule) => matchesRule(node, body, rule));
}

function isReserveGoverningNode(taskType: TaskType, node: ContextPacketNode): boolean {
  const priority = GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE[taskType];
  if (node.node_type === "invariant") {
    return priority.invariants === "reserve";
  }
  if (node.node_type === "mystery_reserve_entry") {
    return priority.mystery_reserve === "reserve";
  }
  return false;
}

function loadBodiesByNodeId(
  db: Database.Database,
  worldSlug: string,
  nodeIds: readonly string[]
): Map<string, string> {
  const uniqueNodeIds = uniqueStrings(nodeIds);
  if (uniqueNodeIds.length === 0) {
    return new Map();
  }

  const rows = db
    .prepare(
      `
        SELECT node_id, body
        FROM nodes
        WHERE world_slug = ?
          AND node_id IN (${uniqueNodeIds.map(() => "?").join(", ")})
      `
    )
    .all(worldSlug, ...uniqueNodeIds) as Array<{ node_id: string; body: string }>;

  return new Map(rows.map((row) => [row.node_id, row.body]));
}

function recordFullBodyDowngrade(packet: ContextPacket, layer: FullBodyLayer, node: ContextPacketNode): void {
  const existing = packet.truncation_summary.full_body_downgrades ?? [];
  existing.push({
    layer,
    node_id: node.id,
    node_type: node.node_type,
    reason: "high_value_full_body_budget_exceeded"
  });
  packet.truncation_summary.full_body_downgrades = existing;
}

function refreshDeliveredClasses(packet: ContextPacket): void {
  const delivered = new Set<NodeType>();
  for (const layer of FULL_BODY_LAYER_PRIORITY) {
    for (const node of nodesForLayer(packet, layer)) {
      if (node.full_body !== undefined) {
        delivered.add(node.node_type);
      }
    }
  }
  packet.task_header.full_body_classes_delivered = [...delivered].sort();
}

export type FullBodyDeliveryResult =
  | { ok: true }
  | {
      ok: false;
      missing_classes: string[];
      minimum_required_budget: number;
      minimum_required_harness_ceiling_chars: number;
    };

function packetExceedsCeilings(
  packet: ContextPacket,
  tokenBudget: number,
  effectiveHarnessCeilingChars: number
): boolean {
  return (
    estimateStablePacketSize(packet) > tokenBudget ||
    estimateStablePacketChars(packet) > effectiveHarnessCeilingChars
  );
}

function applyReserveGoverningBodies(
  packet: ContextPacket,
  args: {
    taskType: TaskType;
  },
  bodiesByNodeId: ReadonlyMap<string, string>
): FullBodyDeliveryResult {
  const reserveNodes = packet.governing_world_context.nodes.filter((node) =>
    isReserveGoverningNode(args.taskType, node)
  );
  if (reserveNodes.length === 0) {
    return { ok: true };
  }

  for (const node of reserveNodes) {
    const body = bodiesByNodeId.get(node.id);
    if (body === undefined) {
      continue;
    }

    node.full_body = body;
  }

  return { ok: true };
}

export function applyTaskTypeFullBodyDelivery(
  db: Database.Database,
  packet: ContextPacket,
  args: {
    taskType: TaskType;
    worldSlug: string;
    tokenBudget: number;
    effectiveHarnessCeilingChars: number;
  }
): FullBodyDeliveryResult {
  const rules = FULL_BODY_RULES_BY_TASK_TYPE[args.taskType];
  if (rules.length === 0) {
    packet.task_header.full_body_classes_delivered = [];
    return { ok: true };
  }

  const candidateNodeIds = FULL_BODY_LAYER_PRIORITY.flatMap((layer) =>
    nodesForLayer(packet, layer).map((node) => node.id)
  );
  const bodiesByNodeId = loadBodiesByNodeId(db, args.worldSlug, candidateNodeIds);

  const reserveResult = applyReserveGoverningBodies(packet, args, bodiesByNodeId);
  if (!reserveResult.ok) {
    refreshDeliveredClasses(packet);
    return reserveResult;
  }

  for (const layer of FULL_BODY_LAYER_PRIORITY) {
    for (const node of nodesForLayer(packet, layer)) {
      if (node.full_body !== undefined || isReserveGoverningNode(args.taskType, node)) {
        continue;
      }
      const body = bodiesByNodeId.get(node.id);
      if (body === undefined || !isHighValueNode(args.taskType, node, body)) {
        continue;
      }

      node.full_body = body;
      if (packetExceedsCeilings(packet, args.tokenBudget, args.effectiveHarnessCeilingChars)) {
        delete node.full_body;
        recordFullBodyDowngrade(packet, layer, node);
      }
    }
  }

  refreshDeliveredClasses(packet);
  return { ok: true };
}
