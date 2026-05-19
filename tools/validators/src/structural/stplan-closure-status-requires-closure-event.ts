import type { Verdict } from "../framework/types.js";
import { defineStplanValidator, eventsWithClosureFor, fail, planField } from "./stplan-utils.js";

const VALIDATOR = "stplan_closure_status_requires_closure_event";
const CLOSED_STATUSES = new Set(["fulfilled", "failed", "abandoned"]);

export const stplanClosureStatusRequiresClosureEvent = defineStplanValidator(VALIDATOR, (plan, _ctx, maps): Verdict[] => {
  const status = planField(plan, "plan_status");
  if (status === undefined || !CLOSED_STATUSES.has(status)) {
    return [];
  }
  if (eventsWithClosureFor(plan, maps).length > 0) {
    return [];
  }
  return [fail(plan, VALIDATOR, "stplan_closure_status_requires_closure_event.missing_closure_event", `plan_status ${status} requires an SE world_logic_rationale plan_relation closure tag.`)];
});
