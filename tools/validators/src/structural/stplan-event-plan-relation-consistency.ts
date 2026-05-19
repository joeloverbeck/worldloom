import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { readSeStateRelations } from "./midstory-introduction-utils.js";
import {
  currentStepTargetIds,
  fail,
  fallbackTriggerRecordIds,
  idsInValue,
  loadStoryMaps,
  planField,
  planId,
  planStringArray,
  resolveRecord,
  resourceBasisIds,
  successConditionRecordIds
} from "./stplan-utils.js";
import { asPlainRecord, nestedRecord, stringArray, stringValue, touchedFilesInclude } from "./utils.js";

const VALIDATOR = "stplan_event_plan_relation_consistency";
const EVENT_OR_PLAN_MUTATION_OPS = new Set(["create_se_record", "create_stplan_record"]);
const EVENT_OR_PLAN_TOUCHED_FILE = /(?:^|\/)stories\/[^/]+\/_source\/(?:events\/SE|plans\/STPLAN)-\d+\.yaml$/;

const ADVANCES_NO_MATCHING_DELTA = "stplan_event_plan_relation_consistency.no_matching_delta";
const TESTS_NO_PREDICATE_TOUCH = "stplan_event_plan_relation_consistency.tests_no_predicate_touch";
const BLOCKS_NO_OBSTRUCTION_DELTA = "stplan_event_plan_relation_consistency.blocks_no_obstruction_delta";
const REVISES_NO_SUPERSESSION = "stplan_event_plan_relation_consistency.revises_no_supersession";
const FULFILLS_STATUS_MISMATCH = "stplan_event_plan_relation_consistency.fulfills_status_mismatch";
const ABANDONS_STATUS_MISMATCH = "stplan_event_plan_relation_consistency.abandons_status_mismatch";
const IGNORES_UNEXPECTED_DELTA = "stplan_event_plan_relation_consistency.ignores_unexpected_delta";

export const stplanEventPlanRelationConsistency: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: stplanEventPlanRelationConsistencyApplies,
  run: async (_input, ctx): Promise<Verdict[]> => {
    const maps = await loadStoryMaps(ctx);
    const verdicts: Verdict[] = [];
    for (const event of maps.all.filter((record) => record.node_type === "story_event_record")) {
      for (const relation of readSeStateRelations(event)) {
        const plan = resolveRecord(event, relation.targetRecord, maps);
        if (plan?.node_type !== "story_plan_record") {
          continue;
        }
        const verdict = relationVerdict(event, plan, relation.relation, maps);
        if (verdict !== undefined) {
          verdicts.push(verdict);
        }
      }
    }
    return verdicts;
  }
};

export function stplanEventPlanRelationConsistencyApplies(ctx: Context): boolean {
  if (ctx.run_mode === "full-world") {
    return true;
  }
  if (ctx.run_mode === "pre-apply") {
    return (ctx.patch_plan?.patches ?? []).some((patch) => EVENT_OR_PLAN_MUTATION_OPS.has(patch.op));
  }
  return touchedFilesInclude(ctx, EVENT_OR_PLAN_TOUCHED_FILE);
}

function relationVerdict(
  event: IndexedRecord,
  plan: IndexedRecord,
  relation: string,
  maps: Awaited<ReturnType<typeof loadStoryMaps>>
): Verdict | undefined {
  const eventId = stringValue(asPlainRecord(event.parsed).id) ?? event.node_id;
  const targetPlanId = planId(plan);

  switch (relation) {
    case "advances":
      return advancesVerdict(event, plan, eventId, targetPlanId);
    case "tests":
      return testsVerdict(event, plan, eventId, targetPlanId);
    case "blocks":
      return blocksVerdict(event, plan, eventId, targetPlanId, maps);
    case "revises":
      return revisesVerdict(event, plan, eventId, targetPlanId, maps);
    case "fulfills":
      return closureVerdict(event, plan, eventId, targetPlanId, maps, "fulfilled", FULFILLS_STATUS_MISMATCH);
    case "abandons":
      return closureVerdict(event, plan, eventId, targetPlanId, maps, "abandoned", ABANDONS_STATUS_MISMATCH);
    case "ignores":
      return ignoresVerdict(event, plan, eventId, targetPlanId);
    default:
      return undefined;
  }
}

function advancesVerdict(event: IndexedRecord, plan: IndexedRecord, eventId: string, targetPlanId: string): Verdict | undefined {
  const allowed = new Set([...currentStepTargetIds(plan), ...successConditionRecordIds(plan)]);
  if (stateDeltaCreatedOrSupersededIds(event).some((id) => allowed.has(id))) {
    return undefined;
  }
  return fail(
    plan,
    VALIDATOR,
    ADVANCES_NO_MATCHING_DELTA,
    `SE ${eventId} advances ${targetPlanId} but does not create or supersede a current-step target or success-condition record.`
  );
}

function testsVerdict(event: IndexedRecord, plan: IndexedRecord, eventId: string, targetPlanId: string): Verdict | undefined {
  const predicateIds = new Set(successConditionRecordIds(plan));
  if (stateDeltaTouchedIds(event).some((id) => predicateIds.has(id))) {
    return undefined;
  }
  return fail(
    plan,
    VALIDATOR,
    TESTS_NO_PREDICATE_TOUCH,
    `SE ${eventId} tests ${targetPlanId} but does not create, supersede, or close any success-condition predicate record.`
  );
}

function blocksVerdict(
  event: IndexedRecord,
  plan: IndexedRecord,
  eventId: string,
  targetPlanId: string,
  maps: Awaited<ReturnType<typeof loadStoryMaps>>
): Verdict | undefined {
  const blockers = new Set(planStringArray(plan, "blockers"));
  const touched = stateDeltaTouchedIds(event);
  if (touched.some((id) => blockers.has(id))) {
    return undefined;
  }
  if (createdSupersedingPlans(event, targetPlanId, maps).some((nextPlan) => hasAddedBlocker(plan, nextPlan, touched))) {
    return undefined;
  }
  return fail(
    plan,
    VALIDATOR,
    BLOCKS_NO_OBSTRUCTION_DELTA,
    `SE ${eventId} blocks ${targetPlanId} but does not touch an existing blocker or supersede the plan with a newly-created blocker.`
  );
}

function revisesVerdict(
  event: IndexedRecord,
  plan: IndexedRecord,
  eventId: string,
  targetPlanId: string,
  maps: Awaited<ReturnType<typeof loadStoryMaps>>
): Verdict | undefined {
  if (createdSupersedingPlans(event, targetPlanId, maps).length > 0) {
    return undefined;
  }
  return fail(
    plan,
    VALIDATOR,
    REVISES_NO_SUPERSESSION,
    `SE ${eventId} revises ${targetPlanId} but does not supersede the STPLAN record.`
  );
}

function closureVerdict(
  event: IndexedRecord,
  plan: IndexedRecord,
  eventId: string,
  targetPlanId: string,
  maps: Awaited<ReturnType<typeof loadStoryMaps>>,
  status: "fulfilled" | "abandoned",
  code: string
): Verdict | undefined {
  if (createdSupersedingPlans(event, targetPlanId, maps).some((nextPlan) => planField(nextPlan, "plan_status") === status)) {
    return undefined;
  }
  return fail(
    plan,
    VALIDATOR,
    code,
    `SE ${eventId} ${status === "fulfilled" ? "fulfills" : "abandons"} ${targetPlanId} but does not supersede the plan with plan_status: ${status}.`
  );
}

function ignoresVerdict(event: IndexedRecord, plan: IndexedRecord, eventId: string, targetPlanId: string): Verdict | undefined {
  const basisIds = new Set(planBasisIds(plan));
  const touched = stateDeltaTouchedIds(event).filter((id) => basisIds.has(id));
  if (touched.length === 0) {
    return undefined;
  }
  return fail(
    plan,
    VALIDATOR,
    IGNORES_UNEXPECTED_DELTA,
    `SE ${eventId} ignores ${targetPlanId} but its state_delta touches plan-basis record(s): ${touched.join(", ")}.`
  );
}

function stateDeltaCreatedOrSupersededIds(event: IndexedRecord): string[] {
  const stateDelta = nestedRecord(asPlainRecord(event.parsed), "state_delta");
  return [...stringArray(stateDelta.create), ...stringArray(stateDelta.supersede)];
}

function stateDeltaTouchedIds(event: IndexedRecord): string[] {
  const stateDelta = nestedRecord(asPlainRecord(event.parsed), "state_delta");
  return [...stringArray(stateDelta.create), ...stringArray(stateDelta.supersede), ...stringArray(stateDelta.close)];
}

function createdSupersedingPlans(
  event: IndexedRecord,
  targetPlanId: string,
  maps: Awaited<ReturnType<typeof loadStoryMaps>>
): IndexedRecord[] {
  const superseded = new Set(stringArray(nestedRecord(asPlainRecord(event.parsed), "state_delta").supersede));
  if (!superseded.has(targetPlanId)) {
    return [];
  }
  return stringArray(nestedRecord(asPlainRecord(event.parsed), "state_delta").create)
    .map((id) => resolveRecord(event, id, maps))
    .filter((record): record is IndexedRecord =>
      record?.node_type === "story_plan_record" &&
      stringValue(asPlainRecord(record.parsed).supersedes) === targetPlanId
    );
}

function hasAddedBlocker(previousPlan: IndexedRecord, nextPlan: IndexedRecord, touchedIds: string[]): boolean {
  const previousBlockers = new Set(planStringArray(previousPlan, "blockers"));
  return planStringArray(nextPlan, "blockers").some((id) => !previousBlockers.has(id) && touchedIds.includes(id));
}

function planBasisIds(plan: IndexedRecord): string[] {
  const ids = new Set<string>([
    planId(plan),
    ...planStringArray(plan, "belief_basis"),
    ...resourceBasisIds(plan).map((item) => item.id),
    ...planStringArray(plan, "blockers"),
    ...currentStepTargetIds(plan),
    ...successConditionRecordIds(plan),
    ...fallbackTargetIds(plan),
    ...fallbackTriggerRecordIds(plan)
  ]);
  const rootIntention = planField(plan, "root_intention");
  if (rootIntention !== undefined) {
    ids.add(rootIntention);
  }
  return [...ids].sort();
}

function fallbackTargetIds(plan: IndexedRecord): string[] {
  return idsInValue(asPlainRecord(plan.parsed).fallback_steps)
    .filter((id) => id !== planId(plan));
}
