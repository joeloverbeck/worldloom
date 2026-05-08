import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor, stringArray } from "../structural/utils.js";
import { EFFECT_TYPES } from "./effect_model_legality.js";

const VALIDATOR = "effect_model_replay_safety";

const EFFECT_TO_EVENT_OPS: Readonly<Record<(typeof EFFECT_TYPES)[number], readonly string[]>> = {
  relationship_axis_shift: ["relationship_supersede"],
  thread_pressure_delta: ["thread_supersede"],
  obligation_status_change: [
    "obligation_open",
    "obligation_pay_off",
    "obligation_complicate",
    "obligation_supersede",
    "obligation_transfer"
  ],
  fact_create: ["fact_create"],
  fact_invalidate: ["fact_invalidate"],
  consequence_open: ["consequence_open"],
  consequence_address: ["consequence_address"],
  cast_change: ["cast_change"],
  location_change: ["location_change"],
  mystery_progress: ["mystery_progress"]
};

export const effectModelReplaySafety: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && (ctx.patch_plan?.patches ?? []).some((patch) =>
      patch.op === "create_pg_record" ||
      patch.op === "create_se_record" ||
      patch.op === "create_slt_record"
    )) ||
    (ctx.run_mode === "incremental" && ctx.touched_files.some(isReplayRelevantPath)),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const [pages, storylets, events] = await Promise.all([
      ctx.index.query({
        world_slug: ctx.world_slug,
        record_type: "page_record",
        ...(ctx.story_slug ? { story_slug: ctx.story_slug } : {})
      }),
      ctx.index.query({
        world_slug: ctx.world_slug,
        record_type: "storylet_record",
        ...(ctx.story_slug ? { story_slug: ctx.story_slug } : {})
      }),
      ctx.index.query({
        world_slug: ctx.world_slug,
        record_type: "story_event_record",
        ...(ctx.story_slug ? { story_slug: ctx.story_slug } : {})
      })
    ]);
    const storyletsById = new Map(storylets.map((record) => [recordId(record), record]));
    const eventsById = new Map(events.map((record) => [recordId(record), record]));
    const verdicts: Verdict[] = [];

    for (const page of pages) {
      validatePage(verdicts, page, storyletsById, eventsById);
    }

    return verdicts;
  }
};

function validatePage(
  verdicts: Verdict[],
  page: IndexedRecord,
  storyletsById: ReadonlyMap<string, IndexedRecord>,
  eventsById: ReadonlyMap<string, IndexedRecord>
): void {
  const parsedPage = asPlainRecord(page.parsed);
  const pageId = recordId(page);
  const stateSnapshot = asPlainRecord(parsedPage.state_snapshot);
  const appliedVariant = stateSnapshot.applied_effect_variant;

  if (pageId === "PG-0001" && appliedVariant === null) {
    return;
  }
  if (typeof appliedVariant !== "string" || appliedVariant.length === 0) {
    addFailure(verdicts, page, "effect_model_replay_safety.missing_applied_effect_variant", `${pageId} state_snapshot.applied_effect_variant must name the realized arc variant`, "state_snapshot.applied_effect_variant");
    return;
  }
  if (typeof parsedPage.storylet_realized !== "string" || parsedPage.storylet_realized.length === 0) {
    addFailure(verdicts, page, "effect_model_replay_safety.missing_storylet_realized", `${pageId} storylet_realized must name the realized arc`, "storylet_realized");
    return;
  }

  const storylet = storyletsById.get(parsedPage.storylet_realized);
  if (storylet === undefined) {
    addFailure(verdicts, page, "effect_model_replay_safety.missing_realized_arc", `${pageId} storylet_realized references missing ${parsedPage.storylet_realized}`, "storylet_realized");
    return;
  }

  const variant = variantById(storylet, appliedVariant);
  if (variant === undefined) {
    addFailure(verdicts, page, "effect_model_replay_safety.unknown_variant", `${pageId} applied_effect_variant '${appliedVariant}' is not a variant id on ${recordId(storylet)}`, "state_snapshot.applied_effect_variant");
    return;
  }

  const requiredEffects = Array.isArray(variant.required_effects) ? variant.required_effects.filter(isRecord) : [];
  if (requiredEffects.length === 0) {
    addFailure(verdicts, page, "effect_model_replay_safety.empty_required_effects", `${pageId} applied variant '${appliedVariant}' has no required_effects to replay`, "state_snapshot.applied_effect_variant");
    return;
  }

  const eventIds = stringArray(parsedPage.applied_event_ops);
  if (eventIds.length === 0) {
    addFailure(verdicts, page, "effect_model_replay_safety.missing_applied_event_ops", `${pageId} applied_event_ops must name the SE records that apply variant '${appliedVariant}'`, "applied_event_ops");
    return;
  }

  const opTypes = eventIds.flatMap((eventId) => {
    const event = eventsById.get(eventId);
    if (event === undefined) {
      addFailure(verdicts, page, "effect_model_replay_safety.missing_event_record", `${pageId} applied_event_ops references missing ${eventId}`, "applied_event_ops");
      return [];
    }
    return eventOpTypes(event);
  });
  if (opTypes.length === 0) {
    addFailure(verdicts, page, "effect_model_replay_safety.empty_event_ops", `${pageId} applied_event_ops do not contain replayable SE.ops`, "applied_event_ops");
    return;
  }

  const unusedOpTypes = [...opTypes];
  requiredEffects.forEach((effect, effectIndex) => {
    const effectType = effect.type;
    if (typeof effectType !== "string" || !(effectType in EFFECT_TO_EVENT_OPS)) {
      addFailure(
        verdicts,
        page,
        "effect_model_replay_safety.unknown_effect_type",
        `${pageId} required_effects[${effectIndex}].type is not a closed effect type`,
        `effect_model.variants.${appliedVariant}.required_effects[${effectIndex}].type`
      );
      return;
    }
    const expectedOps = EFFECT_TO_EVENT_OPS[effectType as keyof typeof EFFECT_TO_EVENT_OPS];
    const matchedIndex = unusedOpTypes.findIndex((opType) => expectedOps.includes(opType));
    if (matchedIndex === -1) {
      addFailure(
        verdicts,
        page,
        "effect_model_replay_safety.missing_derived_event_op",
        `${pageId} applied SE.ops do not derive required_effects[${effectIndex}] type '${effectType}'`,
        `effect_model.variants.${appliedVariant}.required_effects[${effectIndex}]`
      );
      return;
    }
    unusedOpTypes.splice(matchedIndex, 1);
  });
}

function variantById(storylet: IndexedRecord, variantId: string): Record<string, unknown> | undefined {
  const variants = asPlainRecord(asPlainRecord(storylet.parsed).effect_model).variants;
  if (!Array.isArray(variants)) {
    return undefined;
  }
  return variants.filter(isRecord).find((variant) => variant.id === variantId);
}

function eventOpTypes(event: IndexedRecord): string[] {
  const ops = asPlainRecord(event.parsed).ops;
  if (!Array.isArray(ops)) {
    return [];
  }
  return ops
    .filter(isRecord)
    .map((op) => op.op_type)
    .filter((opType): opType is string => typeof opType === "string" && opType.length > 0);
}

function isReplayRelevantPath(file: string): boolean {
  return /(?:^|\/)stories\/[^/]+\/_source\/(?:pages\/PG|events\/SE|storylets\/SLT)-\d{4}\.yaml$/.test(file);
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
    suggested_fix: `Correct ${path} so the page's applied variant can be replayed from deterministic SE.ops.`
  });
}

function recordId(record: IndexedRecord): string {
  const parsed = asPlainRecord(record.parsed);
  return typeof parsed.id === "string" ? parsed.id : record.node_id;
}
