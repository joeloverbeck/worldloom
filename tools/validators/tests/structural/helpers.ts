import type { Context, IndexedRecord, WorldIndexReadSurface } from "../../src/framework/types.js";

export function record(
  node_type: string,
  node_id: string,
  file_path: string,
  parsed: Record<string, unknown>
): IndexedRecord {
  return {
    node_type,
    node_id,
    file_path,
    parsed,
    world_slug: "test"
  };
}

export function context(records: IndexedRecord[], overrides: Partial<Context> = {}): Context {
  const index: WorldIndexReadSurface = {
    query: async ({ record_type }) => records.filter((item) => !record_type || item.node_type === record_type)
  };

  return {
    run_mode: "full-world",
    world_slug: "test",
    index,
    touched_files: [],
    ...overrides
  };
}

export const validCf = {
  id: "CF-0001",
  title: "Fact",
  status: "hard_canon",
  type: "institution",
  statement: "A grounded fact.",
  scope: { geographic: "local", temporal: "current", social: "public" },
  truth_scope: { world_level: true, diegetic_status: "objective" },
  domains_affected: ["law"],
  required_world_updates: ["INSTITUTIONS"],
  source_basis: { direct_user_approval: true, derived_from: [] },
  contradiction_risk: { hard: false, soft: false },
  notes: "None",
  extensions: []
};

export const validSection = {
  id: "SEC-INS-001",
  file_class: "INSTITUTIONS",
  order: 1,
  heading: "Institutions",
  heading_level: 2,
  body: "Section body.",
  extensions: [],
  touched_by_cf: ["CF-0001"]
};
