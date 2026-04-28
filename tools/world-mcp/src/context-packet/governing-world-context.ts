import type Database from "better-sqlite3";

import type { TaskType } from "../ranking/profiles";

import type {
  ContextPacketNode,
  ContextPacketRisk,
  DeliveryMode,
  PacketNodeRow
} from "./shared";
import { loadPacketNodes, parsePacketNodeRecord, uniqueStrings } from "./shared";

const GOVERNING_FILE_PATHS: Record<TaskType, string[]> = {
  canon_addition: ["WORLD_KERNEL.md", "INVARIANTS.md"],
  character_generation: [
    "WORLD_KERNEL.md",
    "INVARIANTS.md",
    "PEOPLES_AND_SPECIES.md",
    "INSTITUTIONS.md"
  ],
  diegetic_artifact_generation: ["WORLD_KERNEL.md", "INVARIANTS.md", "EVERYDAY_LIFE.md"],
  continuity_audit: ["WORLD_KERNEL.md", "INVARIANTS.md", "CANON_LEDGER.md"],
  propose_new_canon_facts: ["WORLD_KERNEL.md", "INVARIANTS.md", "CANON_LEDGER.md"],
  propose_new_characters: [
    "WORLD_KERNEL.md",
    "INVARIANTS.md",
    "PEOPLES_AND_SPECIES.md",
    "INSTITUTIONS.md",
    "EVERYDAY_LIFE.md"
  ],
  propose_new_worlds_from_preferences: ["WORLD_KERNEL.md", "ONTOLOGY.md", "INVARIANTS.md"],
  canon_facts_from_diegetic_artifacts: [
    "WORLD_KERNEL.md",
    "INVARIANTS.md",
    "CANON_LEDGER.md",
    "MYSTERY_RESERVE.md"
  ],
  other: ["WORLD_KERNEL.md", "INVARIANTS.md"]
};

const ACTIVE_RULES: Record<TaskType, string[]> = {
  canon_addition: [
    "Rule 1: no floating facts",
    "Rule 2: preserve causal integrity",
    "Rule 7: preserve Mystery Reserve deliberately"
  ],
  character_generation: [
    "Rule 4: distribution discipline",
    "Rule 7: preserve Mystery Reserve deliberately",
    "No world-level writes from generation flows"
  ],
  diegetic_artifact_generation: [
    "No silent canon mutation from diegetic generation",
    "Rule 7: preserve Mystery Reserve deliberately"
  ],
  continuity_audit: [
    "Audit-only surface; do not mutate canon directly",
    "Rule 1: no floating facts",
    "Rule 7: preserve Mystery Reserve deliberately"
  ],
  propose_new_canon_facts: [
    "Proposal-only surface; canonization happens in canon-addition",
    "Rule 1: no floating facts",
    "Rule 7: preserve Mystery Reserve deliberately"
  ],
  propose_new_characters: [
    "Proposal-only surface; character realization happens in character-generation",
    "Rule 4: distribution discipline",
    "Rule 7: preserve Mystery Reserve deliberately"
  ],
  propose_new_worlds_from_preferences: [
    "Pre-world proposal surface; create-base-world owns realization",
    "Rule 7: preserve Mystery Reserve deliberately",
    "Cross-world distinctness must be explicit when existing worlds are present"
  ],
  canon_facts_from_diegetic_artifacts: [
    "Proposal-only surface; canonization happens in canon-addition",
    "Rule 5: separate diegetic claims from world-level truth",
    "Rule 7: preserve Mystery Reserve deliberately"
  ],
  other: ["Rule 1: no floating facts", "Rule 7: preserve Mystery Reserve deliberately"]
};

const REQUIRED_OUTPUT_SCHEMA: Record<TaskType, string[]> = {
  canon_addition: ["Canon Fact Record", "Change Log Entry", "Patch plan envelope"],
  character_generation: ["Character dossier", "Scoped support artifacts only"],
  diegetic_artifact_generation: ["Diegetic artifact record", "Scoped support artifacts only"],
  continuity_audit: ["Audit record", "Optional retcon proposal follow-up"],
  propose_new_canon_facts: ["Proposal card", "Batch manifest"],
  propose_new_characters: ["Character proposal card", "Character proposal batch manifest"],
  propose_new_worlds_from_preferences: ["World proposal card", "World proposal batch manifest"],
  canon_facts_from_diegetic_artifacts: ["Proposal card", "Batch manifest"],
  other: ["Task-specific output approved by workflow"]
};

const PROHIBITED_MOVES: Record<TaskType, string[]> = {
  canon_addition: [
    "Do not overwrite world-level canon files without append-only canon process",
    "Do not resolve a Mystery Reserve entry implicitly"
  ],
  character_generation: [
    "Do not mutate mandatory world files",
    "Do not launder contested or unresolved facts into hard canon"
  ],
  diegetic_artifact_generation: [
    "Do not mutate mandatory world files",
    "Do not present diegetic claims as world-level truth without canon flow"
  ],
  continuity_audit: [
    "Do not mutate canon during an audit-only pass",
    "Do not silently retcon contradictions"
  ],
  propose_new_canon_facts: [
    "Do not write CF, CH, INV, M, OQ, ENT, or SEC records",
    "Do not treat proposal cards as accepted canon"
  ],
  propose_new_characters: [
    "Do not write character dossiers or mandatory world files",
    "Do not launder proposed character assumptions into accepted canon"
  ],
  propose_new_worlds_from_preferences: [
    "Do not mutate existing world canon files",
    "Do not resolve existing worlds' Mystery Reserve entries while comparing worlds"
  ],
  canon_facts_from_diegetic_artifacts: [
    "Do not write CF, CH, INV, M, OQ, ENT, or SEC records",
    "Do not launder diegetic narration into world-level truth without canon flow"
  ],
  other: ["Do not silently mutate canon", "Do not weaken Mystery Reserve boundaries"]
};

const PROTECTED_SURFACES = [
  "WORLD_KERNEL.md",
  "INVARIANTS.md",
  "ONTOLOGY.md",
  "TIMELINE.md",
  "GEOGRAPHY.md",
  "PEOPLES_AND_SPECIES.md",
  "INSTITUTIONS.md",
  "ECONOMY_AND_RESOURCES.md",
  "MAGIC_OR_TECH_SYSTEMS.md",
  "EVERYDAY_LIFE.md",
  "CANON_LEDGER.md",
  "OPEN_QUESTIONS.md",
  "MYSTERY_RESERVE.md",
  "adjudications/",
  "characters/",
  "diegetic-artifacts/",
  "proposals/",
  "audits/"
] as const;

function addReason(
  orderedNodeIds: string[],
  reasons: Map<string, string>,
  nodeId: string,
  reason: string
): void {
  if (!reasons.has(nodeId)) {
    orderedNodeIds.push(nodeId);
    reasons.set(nodeId, reason);
    return;
  }

  const existing = reasons.get(nodeId);
  if (existing !== undefined && !existing.includes(reason)) {
    reasons.set(nodeId, `${existing}; ${reason}`);
  }
}

function findNodeIdsByFiles(
  db: Database.Database,
  worldSlug: string,
  filePaths: readonly string[]
): string[] {
  if (filePaths.length === 0) {
    return [];
  }

  const rows = db
    .prepare(
      `
        SELECT node_id
        FROM nodes
        WHERE world_slug = ?
          AND file_path IN (${filePaths.map(() => "?").join(", ")})
        ORDER BY file_path, COALESCE(heading_path, ''), node_id
      `
    )
    .all(worldSlug, ...filePaths) as Array<{ node_id: string }>;

  return rows.map((row) => row.node_id);
}

function findFirewallNodeIds(
  db: Database.Database,
  worldSlug: string,
  protectedNodeIds: readonly string[]
): string[] {
  if (protectedNodeIds.length === 0) {
    return [];
  }

  const rows = db
    .prepare(
      `
        SELECT DISTINCT
          CASE
            WHEN e.source_node_id IN (${protectedNodeIds.map(() => "?").join(", ")}) THEN e.target_node_id
            ELSE e.source_node_id
          END AS firewall_node_id
        FROM edges e
        INNER JOIN nodes n
          ON n.node_id = CASE
            WHEN e.source_node_id IN (${protectedNodeIds.map(() => "?").join(", ")}) THEN e.target_node_id
            ELSE e.source_node_id
          END
        WHERE e.edge_type = 'firewall_for'
          AND (
            e.source_node_id IN (${protectedNodeIds.map(() => "?").join(", ")})
            OR e.target_node_id IN (${protectedNodeIds.map(() => "?").join(", ")})
          )
          AND n.world_slug = ?
          AND firewall_node_id IS NOT NULL
        ORDER BY firewall_node_id
      `
    )
    .all(
      ...protectedNodeIds,
      ...protectedNodeIds,
      ...protectedNodeIds,
      ...protectedNodeIds,
      worldSlug
    ) as Array<{ firewall_node_id: string | null }>;

  return rows
    .map((row) => row.firewall_node_id)
    .filter((nodeId): nodeId is string => nodeId !== null);
}

function findCharacterGenerationRequiredNodeIds(
  db: Database.Database,
  worldSlug: string
): Array<{ node_id: string; reason: string }> {
  const rows = db
    .prepare(
      `
        SELECT node_id, node_type
        FROM nodes
        WHERE world_slug = ?
          AND node_type IN ('invariant', 'mystery_reserve_entry')
        ORDER BY
          CASE node_type
            WHEN 'invariant' THEN 0
            WHEN 'mystery_reserve_entry' THEN 1
            ELSE 2
          END,
          node_id
      `
    )
    .all(worldSlug) as Array<{ node_id: string; node_type: string }>;

  return rows.map((row) => ({
    node_id: row.node_id,
    reason:
      row.node_type === "mystery_reserve_entry"
        ? "character_generation requires every Mystery Reserve firewall record"
        : "character_generation requires every invariant record"
  }));
}

function projectCharacterGenerationGoverningRecord(
  row: PacketNodeRow
): Record<string, unknown> | undefined {
  const parsed = parsePacketNodeRecord(row);
  if (parsed === undefined) {
    return undefined;
  }

  if (row.node_type === "invariant") {
    return parsed;
  }

  if (row.node_type === "mystery_reserve_entry") {
    return {
      id: parsed.id,
      status: parsed.status,
      what_is_unknown: parsed.what_is_unknown,
      disallowed_cheap_answers: parsed.disallowed_cheap_answers,
      common_in_world_interpretations: parsed.common_in_world_interpretations
    };
  }

  return undefined;
}

function loadOpenRisks(db: Database.Database, worldSlug: string): ContextPacketRisk[] {
  const rows = db
    .prepare(
      `
        SELECT severity, code, message, node_id, file_path
        FROM validation_results
        WHERE world_slug = ?
        ORDER BY datetime(created_at) DESC, result_id DESC
      `
    )
    .all(worldSlug) as Array<{
      severity: string;
      code: string;
      message: string;
      node_id: string | null;
      file_path: string | null;
    }>;

  return rows.map((row) => ({
    severity: row.severity,
    code: row.code,
    message: row.message,
    node_id: row.node_id,
    file_path: row.file_path
  }));
}

export async function buildGoverningWorldContext(
  db: Database.Database,
  worldSlug: string,
  taskType: TaskType,
  localityNodes: readonly ContextPacketNode[],
  deliveryMode: DeliveryMode
): Promise<{
  active_rules: string[];
  protected_surfaces: string[];
  required_output_schema: string[];
  prohibited_moves: string[];
  open_risks: ContextPacketRisk[];
  nodes: ContextPacketNode[];
  why_included: string[];
}> {
  const orderedNodeIds: string[] = [];
  const reasons = new Map<string, string>();

  for (const nodeId of findNodeIdsByFiles(db, worldSlug, GOVERNING_FILE_PATHS[taskType])) {
    addReason(orderedNodeIds, reasons, nodeId, `${taskType} governing file required by FOUNDATIONS`);
  }

  if (taskType === "character_generation") {
    for (const row of findCharacterGenerationRequiredNodeIds(db, worldSlug)) {
      addReason(orderedNodeIds, reasons, row.node_id, row.reason);
    }
  }

  for (const nodeId of findFirewallNodeIds(
    db,
    worldSlug,
    uniqueStrings(localityNodes.map((node) => node.id))
  )) {
    addReason(orderedNodeIds, reasons, nodeId, "Mystery Reserve firewall for the locality-first packet");
  }

  const nodes =
    taskType === "character_generation"
      ? loadPacketNodes(db, worldSlug, orderedNodeIds, {
          recordProjection: projectCharacterGenerationGoverningRecord,
          deliveryMode
        })
      : loadPacketNodes(db, worldSlug, orderedNodeIds, { deliveryMode });
  const firewallRisks = nodes
    .filter((node) => node.node_type === "mystery_reserve_entry")
    .map((node) => ({
      severity: "info",
      code: "mystery_reserve_firewall",
      message: `Mystery Reserve firewall present in governing_world_context: ${node.id}`,
      node_id: node.id,
      file_path: node.file_path
    }) satisfies ContextPacketRisk);

  return {
    active_rules: ACTIVE_RULES[taskType],
    protected_surfaces: [...PROTECTED_SURFACES],
    required_output_schema: REQUIRED_OUTPUT_SCHEMA[taskType],
    prohibited_moves: PROHIBITED_MOVES[taskType],
    open_risks: [...firewallRisks, ...loadOpenRisks(db, worldSlug)],
    nodes,
    why_included: nodes.map((node) => reasons.get(node.id) ?? "governing world context")
  };
}
