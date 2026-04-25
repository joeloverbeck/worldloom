import type { Context, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, stringArray } from "../structural/utils.js";
import { isCanonicalDomain } from "./_shared/domain-enum.js";
import { appliesToCanonFacts, fail, queryCanonFacts, recordIdFrom } from "./_shared/rule-utils.js";

export const rule2NoPureCosmetics: Validator = {
  name: "rule2_no_pure_cosmetics",
  severity_mode: "fail",
  applies_to: appliesToCanonFacts,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const verdicts: Verdict[] = [];

    for (const record of await queryCanonFacts(ctx)) {
      const parsed = asPlainRecord(record.parsed);
      const cfId = recordIdFrom(record);
      const domains = stringArray(parsed.domains_affected);

      if (domains.length === 0) {
        verdicts.push(fail("rule2_no_pure_cosmetics", "rule2.missing_domains_affected", `${cfId} has empty domains_affected`, record));
      }

      for (const domain of domains) {
        if (!isCanonicalDomain(domain)) {
          verdicts.push(fail("rule2_no_pure_cosmetics", "rule2.non_canonical_domain", `${cfId} uses non-canonical domain '${domain}'`, record));
        }
      }
    }

    return verdicts;
  }
};
