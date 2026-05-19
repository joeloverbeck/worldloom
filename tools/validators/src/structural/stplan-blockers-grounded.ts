import type { Verdict } from "../framework/types.js";
import { defineStplanValidator, fail, isActiveAtPlanPage, planStringArray, resolveRecord } from "./stplan-utils.js";

const VALIDATOR = "stplan_blockers_grounded";

export const stplanBlockersGrounded = defineStplanValidator(VALIDATOR, (plan, _ctx, maps): Verdict[] => {
  const verdicts: Verdict[] = [];
  for (const blockerId of planStringArray(plan, "blockers")) {
    if (resolveRecord(plan, blockerId, maps) === undefined) {
      verdicts.push(fail(plan, VALIDATOR, "stplan_blockers_grounded.missing_blocker", `blockers entry ${blockerId} must resolve to a record.`));
      continue;
    }
    if (!isActiveAtPlanPage(plan, blockerId, maps)) {
      verdicts.push(fail(plan, VALIDATOR, "stplan_blockers_grounded.inactive_blocker", `blockers entry ${blockerId} must be active at created_at_page.`));
    }
  }
  return verdicts;
});
