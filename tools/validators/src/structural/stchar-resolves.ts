import type { Context, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, queryStructuralRecords, stringValue } from "./utils.js";
import {
  activeIds,
  allStorySlugs,
  appliesToStcharStoryState,
  fail,
  pageId,
  recordId,
  shouldCheckRecordInPreApply,
  storyMaps,
  STCHAR_ID
} from "./stchar-utils.js";

const VALIDATOR = "stchar_resolves";

export const stcharResolves: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: appliesToStcharStoryState,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];

    for (const storySlug of allStorySlugs(records)) {
      const maps = storyMaps(records, storySlug);
      for (const entity of maps.byType.get("story_entity_record") ?? []) {
        if (!shouldCheckRecordInPreApply(entity, ctx)) {
          continue;
        }
        const bound = stringValue(asPlainRecord(entity.parsed).bound_stchar_id);
        if (bound !== undefined && STCHAR_ID.test(bound) && maps.byId.get(bound)?.node_type !== "story_character_authority_record") {
          verdicts.push(unresolved(entity, bound, "bound_stchar_id"));
        }
      }

      for (const page of maps.byType.get("page_record") ?? []) {
        if (!shouldCheckRecordInPreApply(page, ctx)) {
          continue;
        }
        for (const [index, id] of activeIds(page, "STCHAR").entries()) {
          if (maps.byId.get(id)?.node_type !== "story_character_authority_record") {
            verdicts.push(unresolved(page, id, `state_snapshot.active_records.STCHAR[${index}]`, pageId(page)));
          }
        }
      }
    }

    return verdicts;
  }
};

function unresolved(record: Parameters<typeof fail>[1], id: string, path: string, page?: string): Verdict {
  return fail(
    VALIDATOR,
    record,
    "stchar_resolves.unresolved_stchar",
    `${page ?? recordId(record)} references ${id} at ${path}, but no STCHAR record resolves in the same story bundle.`,
    { reference_id: id, reference_path: path },
    `Create ${id} in story-characters/ or replace the stale STCHAR reference.`
  );
}
