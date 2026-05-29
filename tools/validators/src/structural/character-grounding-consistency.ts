import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, queryStructuralRecords, stringArray, stringValue } from "./utils.js";
import {
  allStorySlugs,
  appliesToStcharStoryState,
  fail,
  recordId,
  shouldCheckRecordInPreApply,
  storyMaps,
  STCHAR_ID
} from "./stchar-utils.js";

const VALIDATOR = "character_grounding_consistency";

export const characterGroundingConsistency: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: appliesToStcharStoryState,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];

    for (const storySlug of allStorySlugs(records)) {
      const maps = storyMaps(records, storySlug);
      for (const choice of maps.byType.get("choice_record") ?? []) {
        if (shouldCheckRecordInPreApply(choice, ctx)) {
          verdicts.push(...choiceVerdicts(choice));
        }
      }
      for (const plan of maps.byType.get("story_plan_record") ?? []) {
        if (shouldCheckRecordInPreApply(plan, ctx)) {
          verdicts.push(...holderDerivedFromVerdicts(plan, "STPLAN"));
        }
      }
      for (const emotion of maps.byType.get("story_emotion_record") ?? []) {
        if (shouldCheckRecordInPreApply(emotion, ctx)) {
          verdicts.push(...holderDerivedFromVerdicts(emotion, "STEMO"));
        }
      }
    }

    return verdicts;
  }
};

function choiceVerdicts(choice: IndexedRecord): Verdict[] {
  const parsed = asPlainRecord(choice.parsed);
  const groundedIn = asPlainRecord(parsed.grounded_in);
  const groundedRecords = stringArray(groundedIn.records);
  if (!isCharacterSpecificChoice(parsed)) {
    return [];
  }
  if (groundedRecords.some((id) => STCHAR_ID.test(id))) {
    return [];
  }
  return [fail(
    VALIDATOR,
    choice,
    "character_grounding_consistency.choice_missing_stchar",
    `${recordId(choice)} is character-specific but grounded_in.records does not include an STCHAR.`,
    { choice_id: recordId(choice), grounded_in_records: groundedRecords },
    `Add the relevant STCHAR id to ${recordId(choice)}.grounded_in.records.`
  )];
}

function holderDerivedFromVerdicts(record: IndexedRecord, label: string): Verdict[] {
  const parsed = asPlainRecord(record.parsed);
  if (!declaresPersonaDerivedShape(parsed)) {
    return [];
  }
  const derivedFrom = stringArray(parsed.derived_from);
  if (derivedFrom.some((id) => STCHAR_ID.test(id))) {
    return [];
  }
  return [fail(
    VALIDATOR,
    record,
    `character_grounding_consistency.${label.toLowerCase()}_missing_stchar`,
    `${recordId(record)} declares persona-derived shape but derived_from does not include an STCHAR.`,
    { record_id: recordId(record), holder: stringValue(parsed.holder), derived_from: derivedFrom },
    `Add the holder's STCHAR id to ${recordId(record)}.derived_from.`
  )];
}

function isCharacterSpecificChoice(choice: Record<string, unknown>): boolean {
  const text = [
    choice.surface_label,
    choice.player_visible_intent,
    choice.likely_state_pressure,
    choice.success_policy
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
  return /\b(character|persona|voice|speaker|dialogue|relationship|emotion|appraisal|pressure)\b/.test(text);
}

function declaresPersonaDerivedShape(record: Record<string, unknown>): boolean {
  const derivedFrom = stringArray(record.derived_from);
  if (derivedFrom.some((id) => STCHAR_ID.test(id))) {
    return true;
  }
  return typeof record.holder === "string" && (
    stringArray(record.behavioral_pressure).length > 0 ||
    stringArray(record.appraisal_basis).length > 0 ||
    isPlainNonEmpty(record.current_step) ||
    isPlainNonEmpty(record.fallback_steps)
  );
}

function isPlainNonEmpty(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return typeof value === "object" && value !== null && Object.keys(value).length > 0;
}
