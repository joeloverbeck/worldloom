import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, queryStructuralRecords, stringArray, stringValue } from "./utils.js";
import {
  allStorySlugs,
  appliesToStcharStoryState,
  fail,
  isNonBackgroundEntity,
  recordId,
  shouldCheckRecordInPreApply,
  storyMaps,
  STCHAR_ID,
  STENT_ID
} from "./stchar-utils.js";

const VALIDATOR = "stchar_bound_stent_reciprocity";

export const stcharBoundStentReciprocity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: appliesToStcharStoryState,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];

    for (const storySlug of allStorySlugs(records)) {
      const maps = storyMaps(records, storySlug);

      for (const stent of maps.byType.get("story_entity_record") ?? []) {
        if (!shouldCheckRecordInPreApply(stent, ctx)) {
          continue;
        }
        const parsed = asPlainRecord(stent.parsed);
        if (!isNonBackgroundEntity(parsed)) {
          continue;
        }
        const stentId = recordId(stent);
        const stcharId = stringValue(parsed.bound_stchar_id);
        if (!stcharId || !STCHAR_ID.test(stcharId)) {
          continue;
        }
        const stchar = maps.byId.get(stcharId);
        if (stchar?.node_type !== "story_character_authority_record") {
          continue;
        }
        if (!stringArray(asPlainRecord(stchar.parsed).bound_stent_ids).includes(stentId)) {
          verdicts.push(missingStcharBackReference(stent, stentId, stcharId));
        }
      }

      for (const stchar of maps.byType.get("story_character_authority_record") ?? []) {
        if (!shouldCheckRecordInPreApply(stchar, ctx)) {
          continue;
        }
        const stcharId = recordId(stchar);
        for (const [index, stentId] of stringArray(asPlainRecord(stchar.parsed).bound_stent_ids).entries()) {
          if (!STENT_ID.test(stentId)) {
            continue;
          }
          const stent = maps.byId.get(stentId);
          const stentParsed = asPlainRecord(stent?.parsed);
          const actualBound = stringValue(stentParsed.bound_stchar_id);
          if (stent?.node_type !== "story_entity_record" || actualBound !== stcharId) {
            verdicts.push(missingStentBackReference(stchar, stcharId, stentId, index, actualBound));
          }
        }
      }
    }

    return verdicts;
  }
};

function missingStcharBackReference(stent: IndexedRecord, stentId: string, stcharId: string): Verdict {
  return fail(
    VALIDATOR,
    stent,
    "stchar_bound_stent_reciprocity.missing_stchar_back_reference",
    `${stentId}.bound_stchar_id points to ${stcharId}, but ${stcharId}.bound_stent_ids[] does not include ${stentId}.`,
    { stent_id: stentId, stchar_id: stcharId, reference_path: "bound_stchar_id" },
    `Add ${stentId} to ${stcharId}.bound_stent_ids[] or replace ${stentId}.bound_stchar_id with the reciprocal STCHAR id.`
  );
}

function missingStentBackReference(
  stchar: IndexedRecord,
  stcharId: string,
  stentId: string,
  index: number,
  actualBound: string | undefined
): Verdict {
  return fail(
    VALIDATOR,
    stchar,
    "stchar_bound_stent_reciprocity.missing_stent_back_reference",
    `${stcharId}.bound_stent_ids[${index}] names ${stentId}, but that STENT ${actualBound ? `points to ${actualBound}` : "does not point back"}.`,
    {
      stchar_id: stcharId,
      stent_id: stentId,
      actual_bound_stchar_id: actualBound ?? null,
      reference_path: `bound_stent_ids[${index}]`
    },
    `Set ${stentId}.bound_stchar_id to ${stcharId}, or remove ${stentId} from ${stcharId}.bound_stent_ids[].`
  );
}
