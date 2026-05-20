import type { Context, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, queryStructuralRecords, stringValue } from "./utils.js";
import {
  appliesToStcharStoryState,
  fail,
  isNonBackgroundEntity,
  recordId,
  shouldCheckRecordInPreApply,
  STCHAR_ID
} from "./stchar-utils.js";

const VALIDATOR = "stent_requires_stchar";

export const stentRequiresStchar: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: appliesToStcharStoryState,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];

    for (const entity of records.filter((record) => record.node_type === "story_entity_record")) {
      if (!shouldCheckRecordInPreApply(entity, ctx)) {
        continue;
      }
      const parsed = asPlainRecord(entity.parsed);
      const boundStcharId = stringValue(parsed.bound_stchar_id);
      if (!isNonBackgroundEntity(parsed)) {
        continue;
      }
      if (boundStcharId !== undefined && STCHAR_ID.test(boundStcharId)) {
        continue;
      }
      verdicts.push(fail(
        VALIDATOR,
        entity,
        "stent_requires_stchar.missing_stchar_binding",
        `${recordId(entity)} is not exactly [background] and must bind an active STCHAR via bound_stchar_id.`,
        { stent_id: recordId(entity), bound_stchar_id: parsed.bound_stchar_id ?? null },
        `Set ${recordId(entity)}.bound_stchar_id to an active STCHAR id, or make role_in_story exactly [background].`
      ));
    }

    return verdicts;
  }
};
