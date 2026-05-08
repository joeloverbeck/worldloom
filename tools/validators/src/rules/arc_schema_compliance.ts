import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor } from "../structural/utils.js";

const VALIDATOR = "arc_schema_compliance";

const ARC_BLOCKS = [
  "arc_contract",
  "dramatic_unit",
  "beat_plan",
  "execution_envelope",
  "stop_policy",
  "effect_model",
  "exit_portfolio"
] as const;

const BLOCK_FIELDS = {
  arc_contract: [
    "commitment_class",
    "arc_archetype",
    "actor",
    "user_intent",
    "strategic_question_answered",
    "commitment_scope",
    "success_policy",
    "allowed_outcome_band"
  ],
  dramatic_unit: ["scene_question", "entry_pressure", "value_delta_target", "natural_close_definition"],
  beat_plan: ["mode", "min_beats", "max_beats", "beats"],
  execution_envelope: ["invariants", "required_functions", "allowed_tactics", "prohibited_actions", "style_directives", "mystery_preservation"],
  stop_policy: ["normal_exits", "interrupt_before", "safety_valves"],
  effect_model: ["selected_before_render", "variants"],
  exit_portfolio: ["native_seeds", "engine_discovered_exit_budget"]
} as const;

export const arcSchemaCompliance: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && (ctx.patch_plan?.patches ?? []).some((patch) => patch.op === "create_slt_record")) ||
    (ctx.run_mode === "incremental" && ctx.touched_files.some(isStoryletPath)),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const storylets = await ctx.index.query({
      world_slug: ctx.world_slug,
      record_type: "storylet_record",
      ...(ctx.story_slug ? { story_slug: ctx.story_slug } : {})
    });
    const verdicts: Verdict[] = [];

    for (const record of storylets) {
      const parsed = asPlainRecord(record.parsed);
      if (parsed.shape !== "scene_commitment_arc") {
        continue;
      }
      for (const block of ARC_BLOCKS) {
        const value = parsed[block];
        if (!isNonEmptyObject(value)) {
          addFailure(verdicts, record, "arc_schema_compliance.missing_block", `${recordId(record)} is missing populated ${block}`, block);
          continue;
        }
        for (const field of BLOCK_FIELDS[block]) {
          if (isEmptyValue(value[field])) {
            addFailure(
              verdicts,
              record,
              "arc_schema_compliance.empty_field",
              `${recordId(record)} has empty ${block}.${field}`,
              `${block}.${field}`
            );
          }
        }
      }
    }

    return verdicts;
  }
};

function isStoryletPath(file: string): boolean {
  return /(?:^|\/)stories\/[^/]+\/_source\/storylets\/SLT-\d{4}\.yaml$|(?:^|\/)_source\/storylets\/SLT-\d{4}\.yaml$/.test(file);
}

function isNonEmptyObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length > 0;
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }
  return false;
}

function addFailure(verdicts: Verdict[], record: IndexedRecord, code: string, message: string, path: string): void {
  verdicts.push({
    validator: VALIDATOR,
    severity: "fail",
    code,
    message,
    location: locationFor(record),
    suggested_fix: `Populate ${path} for scene_commitment_arc storylets.`
  });
}

function recordId(record: IndexedRecord): string {
  const parsed = asPlainRecord(record.parsed);
  return typeof parsed.id === "string" ? parsed.id : record.node_id;
}
