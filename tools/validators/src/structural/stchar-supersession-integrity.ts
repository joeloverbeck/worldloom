import type { Context, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, queryStructuralRecords, stringValue } from "./utils.js";
import {
  activeIds,
  allStorySlugs,
  appliesToStcharStoryState,
  fail,
  generatedAtPageOrdinal,
  pageId,
  recordId,
  recordPageOrdinal,
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
        const pageOrdinal = recordPageOrdinal(page);
        for (const [index, id] of activeIds(page, "STCHAR").entries()) {
          const stchar = maps.byId.get(id);
          const parsed = asPlainRecord(stchar?.parsed);
          const status = stringValue(parsed.status);
          if (stchar?.node_type !== "story_character_authority_record" || !INACTIVE_STATUSES.has(status ?? "")) {
            continue;
          }
          const supersededAt = supersessionOrdinal(parsed, maps.byId);
          if (pageOrdinal !== null && supersededAt !== null && pageOrdinal < supersededAt) {
            continue;
          }
          verdicts.push(fail(
            VALIDATOR,
            page,
            "stchar_supersession_integrity.inactive_stchar_active_on_page",
            `${pageId(page)} active_records.STCHAR[${index}] references ${id}, but that STCHAR is ${status}.`,
            {
              page_id: pageId(page),
              stchar_id: id,
              status,
              reference_path: `state_snapshot.active_records.STCHAR[${index}]`,
              superseded_at_page: supersededAt
            },
            `Replace ${id} with its active successor in ${pageId(page)}.state_snapshot.active_records.STCHAR.`
          ));
        }
      }
    }

    return verdicts;
  }
};

function supersessionOrdinal(stchar: Record<string, unknown>, byId: ReadonlyMap<string, { parsed: unknown }>): number | null {
  const supersededBy = stringValue(stchar.superseded_by);
  if (supersededBy !== undefined) {
    const successor = asPlainRecord(byId.get(supersededBy)?.parsed);
    return generatedAtPageOrdinal(successor.generated_at_page);
  }
  return generatedAtPageOrdinal(stchar.retired_at_page);
}
