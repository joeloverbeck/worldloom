import type { Context, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, queryStructuralRecords, stringValue } from "./utils.js";
import {
  activeIds,
  allStorySlugs,
  appliesToStcharStoryState,
  branchPath,
  fail,
  pageId,
  recordId,
  shouldCheckRecordInPreApply,
  storyMaps
} from "./stchar-utils.js";

const VALIDATOR = "stchar_supersession_integrity";
const INACTIVE_STATUSES = new Set(["superseded", "retired"]);

export const stcharSupersessionIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: appliesToStcharStoryState,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];

    for (const storySlug of allStorySlugs(records)) {
      const maps = storyMaps(records, storySlug);
      for (const page of maps.byType.get("page_record") ?? []) {
        if (!shouldCheckRecordInPreApply(page, ctx)) {
          continue;
        }
        for (const [index, id] of activeIds(page, "STCHAR").entries()) {
          const stchar = maps.byId.get(id);
          const parsed = asPlainRecord(stchar?.parsed);
          const status = stringValue(parsed.status);
          if (stchar?.node_type !== "story_character_authority_record" || !INACTIVE_STATUSES.has(status ?? "")) {
            continue;
          }
          const successorId = stringValue(parsed.superseded_by);
          const successorRecord = maps.byId.get(successorId ?? "");
          const supersessionPageId = stringValue(asPlainRecord(successorRecord?.parsed).generated_at_page) ??
            stringValue(parsed.retired_at_page) ??
            null;
          if (supersessionPageId === null || !branchPath(page).includes(supersessionPageId)) {
            continue;
          }
          const successorPhrase = successorId === undefined
            ? "No successor STCHAR is recorded for this retired STCHAR."
            : `The successor STCHAR ${successorId} must be active here.`;
          verdicts.push(fail(
            VALIDATOR,
            page,
            "stchar_supersession_integrity.inactive_stchar_active_on_descendant",
            `${pageId(page)} active_records.STCHAR[${index}] references ${id}, but that STCHAR is ${status} and ${pageId(page)} is a descendant of supersession page ${supersessionPageId}. ${successorPhrase}`,
            {
              page_id: pageId(page),
              stchar_id: id,
              status,
              reference_path: `state_snapshot.active_records.STCHAR[${index}]`,
              supersession_page_id: supersessionPageId,
              successor_stchar_id: successorId ?? null
            },
            successorId === undefined
              ? `Remove retired ${id} from ${pageId(page)}.state_snapshot.active_records.STCHAR.`
              : `Replace ${id} with ${successorId} in ${pageId(page)}.state_snapshot.active_records.STCHAR.`
          ));
        }
      }
    }

    return verdicts;
  }
};
