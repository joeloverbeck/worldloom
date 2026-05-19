import type { Verdict } from "../framework/types.js";
import { defineStplanValidator, fail, isActiveAtPlanPage, isRecordAccessibleToHolder, planField, planStringArray, resolveRecord } from "./stplan-utils.js";

const VALIDATOR = "stplan_belief_basis_grounded";

export const stplanBeliefBasisGrounded = defineStplanValidator(VALIDATOR, (plan, _ctx, maps): Verdict[] => {
  const holder = planField(plan, "holder");
  const verdicts: Verdict[] = [];
  for (const beliefId of planStringArray(plan, "belief_basis")) {
    const belief = resolveRecord(plan, beliefId, maps);
    if (belief?.node_type !== "belief_record") {
      verdicts.push(fail(plan, VALIDATOR, "stplan_belief_basis_grounded.missing_belief", `belief_basis entry ${beliefId} must resolve to a BEL record.`));
      continue;
    }
    if (!isActiveAtPlanPage(plan, beliefId, maps)) {
      verdicts.push(fail(plan, VALIDATOR, "stplan_belief_basis_grounded.inactive_belief", `belief_basis entry ${beliefId} must be active at created_at_page.`));
    }
    if (holder !== undefined && !isRecordAccessibleToHolder(belief, holder)) {
      verdicts.push(fail(plan, VALIDATOR, "stplan_belief_basis_grounded.inaccessible_belief", `belief_basis entry ${beliefId} must be accessible to holder ${holder}.`));
    }
  }
  return verdicts;
});
