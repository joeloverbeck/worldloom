import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor } from "../structural/utils.js";

const VALIDATOR = "choice_worthiness_completeness";

const STRONG_AXES = new Set([
  "relationship_trajectory",
  "obligation_state",
  "information_posture",
  "risk_cost_exposure",
  "route_or_scene_type",
  "thread_pressure",
  "irreversibility",
  "character_intention"
]);

const WORTHINESS_FIELDS = [
  "strategic_question_answered",
  "strong_axes",
  "expected_state_delta",
  "why_not_microbeat",
  "foreseeable_difference"
] as const;

export const choiceWorthinessCompleteness: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && (ctx.patch_plan?.patches ?? []).some((patch) => patch.op === "create_chc_record")) ||
    (ctx.run_mode === "incremental" && ctx.touched_files.some(isChoicePath)),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const choices = await ctx.index.query({
      world_slug: ctx.world_slug,
      record_type: "choice_record",
      ...(ctx.story_slug ? { story_slug: ctx.story_slug } : {})
    });
    const verdicts: Verdict[] = [];

    for (const record of choices) {
      const parsed = asPlainRecord(record.parsed);
      if (parsed.choice_kind !== "scene_commitment") {
        continue;
      }
      if (!Array.isArray(parsed.likely_effects) || parsed.likely_effects.length === 0) {
        addFailure(verdicts, record, "choice_worthiness_completeness.empty_likely_effects", `${recordId(record)} likely_effects must be non-empty`, "likely_effects");
      }
      const worthiness = parsed.choice_worthiness;
      if (!isNonEmptyObject(worthiness)) {
        addFailure(verdicts, record, "choice_worthiness_completeness.missing_block", `${recordId(record)} choice_worthiness must be populated`, "choice_worthiness");
        continue;
      }
      for (const field of WORTHINESS_FIELDS) {
        if (isEmptyValue(worthiness[field])) {
          addFailure(verdicts, record, "choice_worthiness_completeness.empty_field", `${recordId(record)} choice_worthiness.${field} must be populated`, `choice_worthiness.${field}`);
        }
      }
      if (Array.isArray(worthiness.strong_axes)) {
        worthiness.strong_axes.forEach((axis, index) => {
          if (typeof axis !== "string" || !STRONG_AXES.has(axis)) {
            addFailure(
              verdicts,
              record,
              "choice_worthiness_completeness.invalid_strong_axis",
              `${recordId(record)} choice_worthiness.strong_axes[${index}] must be a canonical strong_axis`,
              `choice_worthiness.strong_axes[${index}]`
            );
          }
        });
      }
    }

    return verdicts;
  }
};

function isChoicePath(file: string): boolean {
  return /(?:^|\/)stories\/[^/]+\/_source\/choices\/CHC-\d{4}\.yaml$|(?:^|\/)_source\/choices\/CHC-\d{4}\.yaml$/.test(file);
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
    suggested_fix: `Populate ${path} for scene_commitment choices.`
  });
}

function recordId(record: IndexedRecord): string {
  const parsed = asPlainRecord(record.parsed);
  return typeof parsed.id === "string" ? parsed.id : record.node_id;
}
