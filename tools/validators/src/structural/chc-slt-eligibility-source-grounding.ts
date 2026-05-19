import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor, queryRecordsByType, stringArray, stringValue, touchedFilesInclude } from "./utils.js";

const VALIDATOR = "chc_slt_eligibility_source_grounding";
const RECORD_ID = /^(?:STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT|STPLAN|STEMO)-\d+$/;
const RECORD_ID_GLOBAL = /\b(?:STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT|STPLAN|STEMO)-\d+\b/g;
const BACKGROUND_MARKER = /eligibility_background_only\s*:\s*([^.;\n]+)/i;

export const chcSltEligibilitySourceGrounding: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && (ctx.patch_plan?.patches ?? []).some(isStoryPageChoiceOrStoryletPatch)) ||
    (ctx.run_mode === "incremental" &&
      touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/_source\/(?:pages\/PG-\d+|choices\/CHC-\d+|storylets\/SLT-\d+)\.yaml$|(?:^|\/)_source\/(?:pages\/PG-\d+|choices\/CHC-\d+|storylets\/SLT-\d+)\.yaml$/)),
  skip_reason: "story page, CHC, or SLT eligibility grounding only",
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const choices = await queryRecordsByType(ctx, "choice_record");
    const storylets = await queryRecordsByType(ctx, "storylet_record");
    const storyletsByKey = recordMap(storylets);
    const verdicts: Verdict[] = [];

    for (const choice of choices) {
      const parsedChoice = asPlainRecord(choice.parsed);
      const storyletId = stringValue(parsedChoice.associated_commitment_block);
      if (storyletId === undefined) {
        continue;
      }
      const storylet = storyletsByKey.get(scopedKey(choice.story_slug, storyletId)) ?? storyletsByKey.get(unscopedKey(storyletId));
      if (storylet === undefined) {
        continue;
      }

      const eligibilityIds = predicateRecordIds(storylet);
      if (eligibilityIds.size === 0) {
        continue;
      }

      const groundedIds = new Set(stringArray(asPlainRecord(parsedChoice.grounded_in).records));
      if (hasIntersection(groundedIds, eligibilityIds) || hasBackgroundRationale(parsedChoice, eligibilityIds)) {
        continue;
      }

      if (hasClassOverlap(groundedIds, eligibilityIds)) {
        verdicts.push(weakGrounding(choice, storylet, groundedIds, eligibilityIds));
      } else {
        verdicts.push(missingGrounding(choice, storylet, groundedIds, eligibilityIds));
      }
    }

    return verdicts;
  }
};

function isStoryPageChoiceOrStoryletPatch(patch: { op: string }): boolean {
  return patch.op === "create_pg_record" || patch.op === "create_chc_record" || patch.op === "create_slt_record";
}

function recordMap(records: readonly IndexedRecord[]): Map<string, IndexedRecord> {
  const byKey = new Map<string, IndexedRecord>();
  for (const record of records) {
    const id = recordId(record);
    byKey.set(unscopedKey(id), record);
    byKey.set(scopedKey(record.story_slug, id), record);
  }
  return byKey;
}

function predicateRecordIds(storylet: IndexedRecord): ReadonlySet<string> {
  const parsed = asPlainRecord(storylet.parsed);
  const preconditions = asPlainRecord(parsed.preconditions);
  const ids = new Set<string>();
  collectRecordIds(preconditions.hard, ids);
  collectRecordIds(preconditions.soft, ids);
  return ids;
}

function collectRecordIds(value: unknown, ids: Set<string>): void {
  if (typeof value === "string") {
    if (RECORD_ID.test(value)) {
      ids.add(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectRecordIds(item, ids);
    }
    return;
  }
  if (typeof value !== "object" || value === null) {
    return;
  }
  for (const item of Object.values(value)) {
    collectRecordIds(item, ids);
  }
}

function hasBackgroundRationale(choice: Record<string, unknown>, eligibilityIds: ReadonlySet<string>): boolean {
  const pressure = stringValue(choice.likely_state_pressure);
  if (pressure === undefined) {
    return false;
  }
  const marker = BACKGROUND_MARKER.exec(pressure);
  if (marker === null) {
    return false;
  }
  const value = marker[1]?.trim() ?? "";
  if (/\ball\b/i.test(value)) {
    return true;
  }
  const citedIds = new Set(value.match(RECORD_ID_GLOBAL) ?? []);
  return hasIntersection(citedIds, eligibilityIds);
}

function hasIntersection(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  for (const value of left) {
    if (right.has(value)) {
      return true;
    }
  }
  return false;
}

function hasClassOverlap(groundedIds: ReadonlySet<string>, eligibilityIds: ReadonlySet<string>): boolean {
  const groundedClasses = new Set([...groundedIds].map(recordClass));
  for (const id of eligibilityIds) {
    if (groundedClasses.has(recordClass(id))) {
      return true;
    }
  }
  return false;
}

function recordClass(id: string): string {
  return id.split("-")[0] ?? id;
}

function recordId(record: IndexedRecord): string {
  return stringValue(asPlainRecord(record.parsed).id) ?? record.node_id.split(":").pop() ?? record.node_id;
}

function unscopedKey(id: string): string {
  return id;
}

function scopedKey(storySlug: string | null | undefined, id: string): string {
  return storySlug === undefined || storySlug === null ? id : `${storySlug}:${id}`;
}

function missingGrounding(
  choice: IndexedRecord,
  storylet: IndexedRecord,
  groundedIds: ReadonlySet<string>,
  eligibilityIds: ReadonlySet<string>
): Verdict {
  return verdict(
    "fail",
    "chc_slt_eligibility_source_grounding.missing_eligibility_source",
    `${recordId(choice)} is associated with ${recordId(storylet)} but grounds in no selecting predicate record and carries no eligibility_background_only rationale.`,
    choice,
    storylet,
    groundedIds,
    eligibilityIds,
    `Ground ${recordId(choice)} in at least one of ${[...eligibilityIds].join(", ")}, or add an eligibility_background_only rationale to likely_state_pressure.`
  );
}

function weakGrounding(
  choice: IndexedRecord,
  storylet: IndexedRecord,
  groundedIds: ReadonlySet<string>,
  eligibilityIds: ReadonlySet<string>
): Verdict {
  return verdict(
    "warn",
    "chc_slt_eligibility_source_grounding.weak_incidental_grounding",
    `${recordId(choice)} is associated with ${recordId(storylet)} and grounds in the same record class as a selecting predicate, but not the exact predicate record.`,
    choice,
    storylet,
    groundedIds,
    eligibilityIds,
    `Ground ${recordId(choice)} in the exact predicate record, or add an eligibility_background_only rationale to likely_state_pressure.`
  );
}

function verdict(
  severity: "fail" | "warn",
  code: string,
  message: string,
  choice: IndexedRecord,
  storylet: IndexedRecord,
  groundedIds: ReadonlySet<string>,
  eligibilityIds: ReadonlySet<string>,
  suggested_fix: string
): Verdict {
  return {
    validator: VALIDATOR,
    severity,
    code,
    message,
    location: locationFor(choice),
    detail: {
      choice_id: recordId(choice),
      associated_commitment_block: recordId(storylet),
      grounded_records: [...groundedIds].sort(),
      eligibility_records: [...eligibilityIds].sort()
    },
    suggested_fix
  };
}
