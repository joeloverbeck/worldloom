import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor, queryStructuralRecords, touchedFilesInclude } from "./utils.js";

const VALIDATOR = "narrative_shape_field_rejection";
const NARRATIVE_SHAPE_CREATE_OPS = new Set([
  "create_clk_record",
  "create_stsec_record",
  "create_thr_record",
  "create_srel_record",
  "create_stent_record"
]);
const COVERED_NODE_TYPES = new Set([
  "pressure_clock_record",
  "story_secret_record",
  "thread_record",
  "relationship_record_story",
  "story_entity_record"
]);
const PROHIBITED_FIELDS = [
  "expected_payoff_mode",
  "act_position",
  "midpoint",
  "climax",
  "dramatic_curve_position",
  "tension_arc",
  "expected_chapter",
  "scene_sequence"
] as const;

export const narrativeShapeFieldRejection: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => NARRATIVE_SHAPE_CREATE_OPS.has(patch.op)) === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/(?:clocks|secrets|threads|relationships|entities)\/(?:CLK|STSEC|THR|SREL|STENT)-\d+\.yaml$/),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    return records.flatMap((record) => narrativeShapeVerdicts(record));
  }
};

function narrativeShapeVerdicts(record: IndexedRecord): Verdict[] {
  if (!COVERED_NODE_TYPES.has(record.node_type)) {
    return [];
  }

  const parsed = asPlainRecord(record.parsed);
  const verdicts: Verdict[] = [];
  for (const field of PROHIBITED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(parsed, field)) {
      verdicts.push(forbiddenField(record, field));
    }
  }
  return verdicts;
}

function forbiddenField(record: IndexedRecord, field: string): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code: "narrative_shape_forbidden_field",
    message: `${record.node_id} contains prohibited narrative-shape field '${field}'.`,
    location: locationFor(record),
    detail: {
      field,
      node_type: record.node_type
    },
    suggested_fix: `Remove '${field}'. Story records must encode present causal state, not dramatic position or future payoff shape.`
  };
}
