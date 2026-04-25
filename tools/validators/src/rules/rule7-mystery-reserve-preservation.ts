import { MYSTERY_STATUS_ENUM, mysteryResolutionSafetyForStatus } from "@worldloom/world-index/public/canonical-vocabularies";
import type { Context, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord } from "../structural/utils.js";
import { appliesToMysteryReserve, fail, nonEmptyArray, queryMysteryReserve, recordIdFrom } from "./_shared/rule-utils.js";

const VALIDATOR = "rule7_mystery_reserve_preservation";

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

      const status = typeof parsed.status === "string" ? parsed.status : "";
      if (!(MYSTERY_STATUS_ENUM as readonly string[]).includes(status)) {
        verdicts.push(fail(VALIDATOR, "rule7.invalid_status", `${mrId} has invalid status '${status}'`, record));
      } else {
        const allowed = mysteryResolutionSafetyForStatus(status);
        const safety = typeof parsed.future_resolution_safety === "string" ? parsed.future_resolution_safety : "";
        if (!(allowed as readonly string[]).includes(safety)) {
          verdicts.push(
            fail(
              VALIDATOR,
              "rule7.future_resolution_safety_status_mismatch",
              `${mrId} has future_resolution_safety '${safety}' but status '${status}' allows only [${allowed.join(", ")}]`,
              record
            )
          );
        }
      }
    }

    return verdicts;
  }
};
