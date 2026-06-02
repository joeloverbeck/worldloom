import type { CurrentContext } from "../schema/current-context.js";
import {
  MANUAL_RECORD_CLASSES,
  MANUAL_RECORD_CLASS_PREFIXES,
  type ManualRecordClass,
} from "../schema/manual-story.js";
import type { KnownIds } from "./refs.js";
import type { ValidationError, ValidationResult } from "./schema.js";

export const CURRENT_CONTEXT_REFERENCE_BROKEN =
  "current-context-reference-broken";
export const CURRENT_CONTEXT_POV_NOT_IN_CAST =
  "current-context-pov-not-in-cast";

export function validateCurrentContext(
  ctx: CurrentContext,
  knownIds: KnownIds,
  knownSegmentIds: string[],
): ValidationResult {
  const errors: ValidationError[] = [];
  const knownSegments = new Set(knownSegmentIds);

  checkSingleRecord(errors, "current_location", ctx.current_location, knownIds, [
    "locations",
  ]);
  checkRecordList(errors, "current_cast", ctx.current_cast, knownIds, ["cast"]);
  checkSingleRecord(errors, "pov_holder", ctx.pov_holder, knownIds, ["cast"]);
  checkRecordList(errors, "active_pressure_clocks", ctx.active_pressure_clocks, knownIds, [
    "clocks",
  ]);
  checkRecordList(
    errors,
    "active_secrets_questions",
    ctx.active_secrets_questions,
    knownIds,
    ["secrets", "questions"],
  );
  checkAnyManualRecordList(errors, "pinned_records", ctx.pinned_records, knownIds);
  checkAnyManualRecordList(
    errors,
    "excluded_records",
    ctx.excluded_records ?? [],
    knownIds,
  );
  checkRecordList(errors, "must_not_reveal", ctx.must_not_reveal, knownIds, [
    "secrets",
    "questions",
  ]);
  checkSegment(errors, "last_accepted_segment", ctx.last_accepted_segment, knownSegments);
  checkSegment(
    errors,
    "last_reviewed_after_segment",
    ctx.last_reviewed_after_segment,
    knownSegments,
  );

  if (ctx.pov_holder !== null && !ctx.current_cast.includes(ctx.pov_holder)) {
    errors.push({
      code: CURRENT_CONTEXT_POV_NOT_IN_CAST,
      field: "pov_holder",
      message: `${ctx.pov_holder} must be included in current_cast`,
    });
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function checkSingleRecord(
  errors: ValidationError[],
  field: string,
  value: string | null,
  knownIds: KnownIds,
  classes: ManualRecordClass[],
): void {
  if (value === null) return;
  if (!isKnownInAnyClass(value, knownIds, classes)) {
    pushReferenceError(errors, field, value, describeClasses(classes));
  }
}

function checkRecordList(
  errors: ValidationError[],
  field: string,
  values: string[],
  knownIds: KnownIds,
  classes: ManualRecordClass[],
): void {
  values.forEach((value, index) => {
    if (!isKnownInAnyClass(value, knownIds, classes)) {
      pushReferenceError(errors, `${field}[${index}]`, value, describeClasses(classes));
    }
  });
}

function checkAnyManualRecordList(
  errors: ValidationError[],
  field: string,
  values: string[],
  knownIds: KnownIds,
): void {
  values.forEach((value, index) => {
    const cls = lookupClassFromId(value);
    if (cls === null || !knownIds[cls].has(value)) {
      pushReferenceError(errors, `${field}[${index}]`, value, "manual record");
    }
  });
}

function checkSegment(
  errors: ValidationError[],
  field: string,
  value: string | null,
  knownSegments: Set<string>,
): void {
  if (value === null) return;
  if (!knownSegments.has(value)) {
    pushReferenceError(errors, field, value, "segment_order");
  }
}

function isKnownInAnyClass(
  id: string,
  knownIds: KnownIds,
  classes: ManualRecordClass[],
): boolean {
  return classes.some((cls) => knownIds[cls].has(id));
}

function lookupClassFromId(id: string): ManualRecordClass | null {
  for (const cls of MANUAL_RECORD_CLASSES) {
    const prefix = MANUAL_RECORD_CLASS_PREFIXES[cls];
    if (id.startsWith(`${prefix}-`)) {
      return cls;
    }
  }
  return null;
}

function pushReferenceError(
  errors: ValidationError[],
  field: string,
  id: string,
  target: string,
): void {
  errors.push({
    code: CURRENT_CONTEXT_REFERENCE_BROKEN,
    field,
    message: `${id} not found in ${target}`,
  });
}

function describeClasses(classes: ManualRecordClass[]): string {
  return classes.join(" or ");
}
