import type { Verdict } from "../framework/types.js";
import { asPlainRecord, stringValue } from "./utils.js";
import { defineStplanValidator, fail, isActiveAtPlanPage, planField, resolveRecord } from "./stplan-utils.js";

const VALIDATOR = "stplan_root_intention_grounded";

export const stplanRootIntentionGrounded = defineStplanValidator(VALIDATOR, (plan, _ctx, maps): Verdict[] => {
  const rootIntention = planField(plan, "root_intention");
  const holder = planField(plan, "holder");
  const record = rootIntention === undefined ? undefined : resolveRecord(plan, rootIntention, maps);
  if (rootIntention === undefined || record?.node_type !== "intention_record") {
    return [fail(plan, VALIDATOR, "stplan_root_intention_grounded.missing_intention", `root_intention ${rootIntention ?? "<missing>"} must resolve to an STINT record.`)];
  }
  if (!isActiveAtPlanPage(plan, rootIntention, maps)) {
    return [fail(plan, VALIDATOR, "stplan_root_intention_grounded.inactive_intention", `root_intention ${rootIntention} must be active at created_at_page.`)];
  }
  if (holder !== undefined && stringValue(asPlainRecord(record.parsed).holder) !== holder) {
    return [fail(plan, VALIDATOR, "stplan_root_intention_grounded.holder_mismatch", `root_intention ${rootIntention} must belong to holder ${holder}.`)];
  }
  return [];
});
