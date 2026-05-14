import type { Context, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor, queryStructuralRecords, stringArray } from "./utils.js";

export const storyFactAuthority: Validator = {
  name: "story_fact_authority",
  severity_mode: "fail",
  applies_to: () => true,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];

    for (const record of records) {
      if (record.node_type !== "story_fact_record") {
        continue;
      }

      const parsed = asPlainRecord(record.parsed);
      if (parsed.authority !== "canon_linked") {
        continue;
      }

      const derivedFrom = stringArray(parsed.derived_from);
      if (derivedFrom.some((id) => /^CF-\d+$/.test(id))) {
        continue;
      }

      verdicts.push({
        validator: "story_fact_authority",
        severity: "fail",
        code: "story_fact_authority.canon_linked_missing_cf_parent",
        message: `${record.node_id} has authority canon_linked but derived_from does not include a CF-<integer> parent`,
        location: locationFor(record),
        detail: {
          authority: "canon_linked",
          derived_from: derivedFrom
        }
      });
    }

    return verdicts;
  }
};
