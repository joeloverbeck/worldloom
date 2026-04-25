import type { Context, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord } from "../structural/utils.js";
import { appliesToCanonFacts, fail, nonEmptyArray, queryCanonFacts, recordIdFrom } from "./_shared/rule-utils.js";

const NON_GLOBAL_GEOGRAPHIC = new Set(["local", "regional", "cosmic"]);
const NON_PUBLIC_SOCIAL = new Set(["restricted_group", "elite", "secret", "rumor"]);

export const rule4NoGlobalizationByAccident: Validator = {
  name: "rule4_no_globalization_by_accident",
  severity_mode: "fail",
  applies_to: appliesToCanonFacts,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const verdicts: Verdict[] = [];

    for (const record of await queryCanonFacts(ctx)) {
      const parsed = asPlainRecord(record.parsed);
      const scope = asPlainRecord(parsed.scope);
      const geographic = typeof scope.geographic === "string" ? scope.geographic : "";
      const social = typeof scope.social === "string" ? scope.social : "";
      const limitedScope = NON_GLOBAL_GEOGRAPHIC.has(geographic) || NON_PUBLIC_SOCIAL.has(social);

      if (!limitedScope) {
        continue;
      }

      const distribution = asPlainRecord(parsed.distribution);
      if (!nonEmptyArray(distribution.why_not_universal)) {
        verdicts.push(
          fail(
            "rule4_no_globalization_by_accident",
            "rule4.missing_why_not_universal",
            `${recordIdFrom(record)} has limited scope but empty distribution.why_not_universal`,
            record
          )
        );
      }
    }

    return verdicts;
  }
};
