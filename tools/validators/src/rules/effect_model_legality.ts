import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor, stringArray } from "../structural/utils.js";

const VALIDATOR = "effect_model_legality";

export const EFFECT_TYPES = [
  "relationship_axis_shift",
  "thread_pressure_delta",
  "obligation_status_change",
  "fact_create",
  "fact_invalidate",
  "consequence_open",
  "consequence_address",
  "cast_change",
  "location_change",
  "mystery_progress"
] as const;

const EFFECT_TYPE_SET = new Set<string>(EFFECT_TYPES);

export const effectModelLegality: Validator = {
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
      const allowedOutcomes = new Set(stringArray(asPlainRecord(parsed.arc_contract).allowed_outcome_band));
      const effectModel = asPlainRecord(parsed.effect_model);
      const variants = effectModel.variants;
      if (!Array.isArray(variants) || variants.length === 0) {
        addFailure(verdicts, record, "effect_model_legality.empty_variants", `${recordId(record)} effect_model.variants must contain at least one variant`, "effect_model.variants");
        continue;
      }

      variants.forEach((variant, variantIndex) => {
        if (!isRecord(variant)) {
          addFailure(verdicts, record, "effect_model_legality.invalid_variant", `${recordId(record)} effect_model.variants[${variantIndex}] must be an object`, `effect_model.variants[${variantIndex}]`);
          return;
        }
        const variantId = typeof variant.id === "string" && variant.id.length > 0 ? variant.id : `variants[${variantIndex}]`;
        if (typeof variant.id !== "string" || variant.id.length === 0) {
          addFailure(verdicts, record, "effect_model_legality.missing_variant_id", `${recordId(record)} effect_model variant at index ${variantIndex} must declare id`, `effect_model.variants[${variantIndex}].id`);
        }
        if (typeof variant.maps_to_outcome !== "string" || !allowedOutcomes.has(variant.maps_to_outcome)) {
          addFailure(
            verdicts,
            record,
            "effect_model_legality.out_of_band_outcome",
            `${recordId(record)} variant ${variantId} maps_to_outcome must be in arc_contract.allowed_outcome_band`,
            `effect_model.variants[${variantIndex}].maps_to_outcome`
          );
        }
        validateEffects(verdicts, record, variant.required_effects, variantId, variantIndex, "required_effects", true);
        validateEffects(verdicts, record, variant.forbidden_effects, variantId, variantIndex, "forbidden_effects", false);
      });
    }

    return verdicts;
  }
};

function validateEffects(
  verdicts: Verdict[],
  record: IndexedRecord,
  value: unknown,
  variantId: string,
  variantIndex: number,
  field: "required_effects" | "forbidden_effects",
  requireNonEmpty: boolean
): void {
  if (!Array.isArray(value)) {
    if (requireNonEmpty || value !== undefined) {
      addFailure(
        verdicts,
        record,
        `effect_model_legality.invalid_${field}`,
        `${recordId(record)} variant ${variantId} ${field} must be a list${requireNonEmpty ? " with at least one entry" : ""}`,
        `effect_model.variants[${variantIndex}].${field}`
      );
    }
    return;
  }
  if (requireNonEmpty && value.length === 0) {
    addFailure(
      verdicts,
      record,
      "effect_model_legality.empty_required_effects",
      `${recordId(record)} variant ${variantId} required_effects must contain at least one effect`,
      `effect_model.variants[${variantIndex}].required_effects`
    );
  }
  value.forEach((effect, effectIndex) => {
    if (!isRecord(effect) || typeof effect.type !== "string" || !EFFECT_TYPE_SET.has(effect.type)) {
      addFailure(
        verdicts,
        record,
        "effect_model_legality.unknown_effect_type",
        `${recordId(record)} variant ${variantId} ${field}[${effectIndex}].type must be a closed effect type`,
        `effect_model.variants[${variantIndex}].${field}[${effectIndex}].type`
      );
    }
  });
}

function isStoryletPath(file: string): boolean {
  return /(?:^|\/)stories\/[^/]+\/_source\/storylets\/SLT-\d{4}\.yaml$|(?:^|\/)_source\/storylets\/SLT-\d{4}\.yaml$/.test(file);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addFailure(verdicts: Verdict[], record: IndexedRecord, code: string, message: string, path: string): void {
  verdicts.push({
    validator: VALIDATOR,
    severity: "fail",
    code,
    message,
    location: locationFor(record),
    suggested_fix: `Correct ${path} so the scene-commitment arc effect model is closed and replayable.`
  });
}

function recordId(record: IndexedRecord): string {
  const parsed = asPlainRecord(record.parsed);
  return typeof parsed.id === "string" ? parsed.id : record.node_id;
}
