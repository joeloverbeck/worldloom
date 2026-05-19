import type { Validator, Verdict } from "../framework/types.js";
import { eventCreatedOrSupersededIds, fail, loadStoryMaps, planAdvanceRelations, resolveRecord, stplanValidatorApplies, currentStepTargetIds, successConditionRecordIds } from "./stplan-utils.js";

const VALIDATOR = "stplan_event_plan_relation_consistency";

export const stplanEventPlanRelationConsistency: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: stplanValidatorApplies,
  run: async (_input, ctx): Promise<Verdict[]> => {
    const maps = await loadStoryMaps(ctx);
    const verdicts: Verdict[] = [];
    for (const relation of planAdvanceRelations(maps)) {
      const plan = resolveRecord(relation.event, relation.planId, maps);
      if (plan?.node_type !== "story_plan_record") {
        continue;
      }
      const allowed = new Set([...currentStepTargetIds(plan), ...successConditionRecordIds(plan)]);
      const changed = eventCreatedOrSupersededIds(relation.event);
      if (!changed.some((id) => allowed.has(id))) {
        verdicts.push(fail(plan, VALIDATOR, "stplan_event_plan_relation_consistency.no_matching_delta", `SE ${relation.event.node_id} advances ${relation.planId} but does not create or supersede a current-step target or success-condition record.`));
      }
    }
    return verdicts;
  }
};
