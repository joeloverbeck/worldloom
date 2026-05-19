import type { Verdict } from "../framework/types.js";
import { defineStplanValidator, fail, isActiveAtPlanPage, planField, planId, resolveRecord } from "./stplan-utils.js";

const VALIDATOR = "stplan_supersession_chain_valid";

export const stplanSupersessionChainValid = defineStplanValidator(VALIDATOR, (plan, _ctx, maps): Verdict[] => {
  const verdicts: Verdict[] = [];
  const seen = new Set([planId(plan)]);
  let cursor = planField(plan, "supersedes");
  if (cursor !== undefined && !isActiveAtPlanPage(plan, cursor, maps)) {
    verdicts.push(fail(plan, VALIDATOR, "stplan_supersession_chain_valid.prior_not_active", `supersedes target ${cursor} must be active at created_at_page.`));
  }
  while (cursor !== undefined) {
    if (seen.has(cursor)) {
      verdicts.push(fail(plan, VALIDATOR, "stplan_supersession_chain_valid.cycle", `supersedes chain cycles through ${cursor}.`));
      break;
    }
    seen.add(cursor);
    const record = resolveRecord(plan, cursor, maps);
    if (record?.node_type !== "story_plan_record") {
      verdicts.push(fail(plan, VALIDATOR, "stplan_supersession_chain_valid.missing_prior", `supersedes target ${cursor} must resolve to an STPLAN record.`));
      break;
    }
    cursor = planField(record, "supersedes");
  }
  return verdicts;
});
