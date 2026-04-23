import type Database from "better-sqlite3";

import type { TaskType } from "../ranking/profiles";

import type { ContextPacketNode, ContextPacketRisk } from "./shared";

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
  other: ["Rule 1: no floating facts", "Rule 7: preserve Mystery Reserve deliberately"]
};

const REQUIRED_OUTPUT_SCHEMA: Record<TaskType, string[]> = {
  canon_addition: ["Canon Fact Record", "Change Log Entry", "Patch plan envelope"],
  character_generation: ["Character dossier", "Scoped support artifacts only"],
  diegetic_artifact_generation: ["Diegetic artifact record", "Scoped support artifacts only"],
  continuity_audit: ["Audit record", "Optional retcon proposal follow-up"],
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
];

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

export async function buildConstraints(
  db: Database.Database,
  worldSlug: string,
  taskType: TaskType,
  nucleusNodes: ContextPacketNode[]
): Promise<{
  active_rules: string[];
  protected_surfaces: string[];
  required_output_schema: string[];
  prohibited_moves: string[];
  open_risks: ContextPacketRisk[];
}> {
  const nucleusFirewalls = nucleusNodes
    .filter((node) => node.node_type === "mystery_reserve_entry")
    .map((node) => `Mystery Reserve firewall present in packet nucleus: ${node.id}`);

  return {
    active_rules: ACTIVE_RULES[taskType],
    protected_surfaces: PROTECTED_SURFACES,
    required_output_schema: REQUIRED_OUTPUT_SCHEMA[taskType],
    prohibited_moves: PROHIBITED_MOVES[taskType],
    open_risks: [...nucleusFirewalls.map((message) => ({
      severity: "info",
      code: "mystery_reserve_firewall",
      message,
      node_id: null,
      file_path: "MYSTERY_RESERVE.md"
    } satisfies ContextPacketRisk)), ...loadOpenRisks(db, worldSlug)]
  };
}
