import type { Verdict } from "../framework/types.js";
import { currentStepTargetIds, defineStplanValidator, fail, isActiveAtPlanPage, resolveRecord } from "./stplan-utils.js";

const VALIDATOR = "stplan_current_step_targets_grounded";

export const stplanCurrentStepTargetsGrounded = defineStplanValidator(VALIDATOR, (plan, _ctx, maps): Verdict[] => {
  const verdicts: Verdict[] = [];
  for (const targetId of currentStepTargetIds(plan)) {
    if (resolveRecord(plan, targetId, maps) === undefined) {
      verdicts.push(fail(plan, VALIDATOR, "stplan_current_step_targets_grounded.missing_target", `current_step.target_records entry ${targetId} must resolve to a record.`));
      continue;
    }
    if (!isActiveAtPlanPage(plan, targetId, maps)) {
      verdicts.push(fail(plan, VALIDATOR, "stplan_current_step_targets_grounded.inactive_target", `current_step.target_records entry ${targetId} must be active at created_at_page.`));
    }
  }
  return verdicts;
});
