import type { Context, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord } from "../structural/utils.js";
import { appliesToMysteryReserve, fail, nonEmptyArray, queryMysteryReserve, recordIdFrom } from "./_shared/rule-utils.js";

const VALIDATOR = "rule7_mystery_reserve_preservation";
const VALID_STATUSES = new Set(["active", "passive", "forbidden"]);
const VALID_FUTURE_RESOLUTION_SAFETY = new Set(["low", "medium", "high"]);

export const rule7MysteryReservePreservation: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: appliesToMysteryReserve,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const verdicts: Verdict[] = [];

    for (const record of await queryMysteryReserve(ctx)) {
      const parsed = asPlainRecord(record.parsed);
      const mrId = recordIdFrom(record);

      for (const field of ["unknowns", "knowns", "disallowed_cheap_answers", "domains_touched"]) {
        if (!nonEmptyArray(parsed[field])) {
          verdicts.push(fail(VALIDATOR, `rule7.missing_${field}`, `${mrId} has empty ${field}`, record));
        }
      }

      if (typeof parsed.status !== "string" || !VALID_STATUSES.has(parsed.status)) {
        verdicts.push(fail(VALIDATOR, "rule7.invalid_status", `${mrId} has invalid status '${String(parsed.status)}'`, record));
      }

      if (
        typeof parsed.future_resolution_safety !== "string" ||
        !VALID_FUTURE_RESOLUTION_SAFETY.has(parsed.future_resolution_safety)
      ) {
        verdicts.push(
          fail(
            VALIDATOR,
            "rule7.invalid_future_resolution_safety",
            `${mrId} has invalid future_resolution_safety '${String(parsed.future_resolution_safety)}'`,
            record
          )
        );
      }
    }

    return verdicts;
  }
};
