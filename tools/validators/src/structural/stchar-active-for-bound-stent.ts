import type { Context, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, queryStructuralRecords, stringValue } from "./utils.js";
import {
  activeIds,
  allStorySlugs,
  appliesToStcharStoryState,
  fail,
  isNonBackgroundEntity,
  pageId,
  recordId,
  shouldCheckRecordInPreApply,
  storyMaps
} from "./stchar-utils.js";

const VALIDATOR = "stchar_active_for_bound_stent";

export const stcharActiveForBoundStent: Validator = {
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
        const activeStchars = new Set(activeIds(page, "STCHAR"));
        for (const [index, stentId] of activeIds(page, "STENT").entries()) {
          const stent = maps.byId.get(stentId);
          const parsed = asPlainRecord(stent?.parsed);
          if (stent?.node_type !== "story_entity_record" || !isNonBackgroundEntity(parsed)) {
            continue;
          }
          const boundStcharId = stringValue(parsed.bound_stchar_id);
          if (boundStcharId !== undefined && activeStchars.has(boundStcharId)) {
            continue;
          }
          verdicts.push(fail(
            VALIDATOR,
            page,
            "stchar_active_for_bound_stent.missing_active_stchar",
            `${pageId(page)} active STENT ${stentId} binds ${boundStcharId ?? "<missing>"}, but that STCHAR is not active on the page.`,
            {
              page_id: pageId(page),
              stent_id: stentId,
              stent_path: `state_snapshot.active_records.STENT[${index}]`,
              bound_stchar_id: boundStcharId ?? null
            },
            `Add ${boundStcharId ?? "the bound STCHAR"} to ${pageId(page)}.state_snapshot.active_records.STCHAR or bind ${stentId} to the active STCHAR.`
          ));
        }
      }
    }

    return verdicts;
  }
};
