import type { Verdict } from "../framework/types.js";
import { defineStplanValidator, fail, isActiveAtPlanPage, planField, resolveRecord } from "./stplan-utils.js";

const VALIDATOR = "stplan_holder_exists_and_active";

export const stplanHolderExistsAndActive = defineStplanValidator(VALIDATOR, (plan, _ctx, maps): Verdict[] => {
  const holder = planField(plan, "holder");
  if (holder === undefined || resolveRecord(plan, holder, maps)?.node_type !== "story_entity_record") {
    return [fail(plan, VALIDATOR, "stplan_holder_exists_and_active.missing_holder", `holder ${holder ?? "<missing>"} must resolve to an STENT record.`)];
  }
  if (!isActiveAtPlanPage(plan, holder, maps)) {
    return [fail(plan, VALIDATOR, "stplan_holder_exists_and_active.inactive_holder", `holder ${holder} must be active at created_at_page.`)];
  }
  return [];
});
