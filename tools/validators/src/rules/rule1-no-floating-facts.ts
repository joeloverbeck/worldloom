import type { Context, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord } from "../structural/utils.js";
import { appliesToCanonFacts, fail, nonEmptyArray, queryCanonFacts, recordIdFrom } from "./_shared/rule-utils.js";

const OPERATIONAL_TYPES = new Set([
  "capability",
  "artifact",
  "technology",
  "institution",
  "ritual",
  "event",
  "craft",
  "resource_distribution"
]);

export const rule1NoFloatingFacts: Validator = {
  name: "rule1_no_floating_facts",
  severity_mode: "fail",
  applies_to: appliesToCanonFacts,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const verdicts: Verdict[] = [];

    for (const record of await queryCanonFacts(ctx)) {
      const parsed = asPlainRecord(record.parsed);
      const cfId = recordIdFrom(record);
      const scope = asPlainRecord(parsed.scope);

      if (!nonEmptyArray(parsed.domains_affected)) {
        verdicts.push(fail("rule1_no_floating_facts", "rule1.missing_domains_affected", `${cfId} has empty domains_affected`, record));
      }

      if (Object.keys(scope).length === 0) {
        verdicts.push(fail("rule1_no_floating_facts", "rule1.missing_scope", `${cfId} has no scope object`, record));
      } else {
        for (const field of ["geographic", "temporal", "social"]) {
          if (typeof scope[field] !== "string" || scope[field].length === 0) {
            verdicts.push(fail("rule1_no_floating_facts", `rule1.missing_scope_${field}`, `${cfId} has no scope.${field}`, record));
          }
        }
      }

      if (!nonEmptyArray(parsed.costs_and_limits)) {
        verdicts.push(fail("rule1_no_floating_facts", "rule1.missing_costs_and_limits", `${cfId} has empty costs_and_limits`, record));
      }

      if (!nonEmptyArray(parsed.visible_consequences)) {
        verdicts.push(fail("rule1_no_floating_facts", "rule1.missing_visible_consequences", `${cfId} has empty visible_consequences`, record));
      }

      if (typeof parsed.type === "string" && OPERATIONAL_TYPES.has(parsed.type) && !nonEmptyArray(parsed.prerequisites)) {
        verdicts.push(fail("rule1_no_floating_facts", "rule1.missing_prerequisites", `${cfId} has operational type ${parsed.type} but empty prerequisites`, record));
      }
    }

    return verdicts;
  }
};
