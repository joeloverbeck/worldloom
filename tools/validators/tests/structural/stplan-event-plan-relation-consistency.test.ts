import assert from "node:assert/strict";
import test from "node:test";

import {
  stplanEventPlanRelationConsistency,
  stplanEventPlanRelationConsistencyApplies
} from "../../src/structural/stplan-event-plan-relation-consistency.js";
import { baseRecords, context, eventBody, hasCode, plan, storyRecord } from "./stplan-helpers.js";

test("stplan_event_plan_relation_consistency is scoped to full-world, create_se_record plans, and touched event or plan files", () => {
  assert.equal(stplanEventPlanRelationConsistencyApplies(context([])), true);
  assert.equal(
    stplanEventPlanRelationConsistencyApplies(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") })),
    true
  );
  assert.equal(
    stplanEventPlanRelationConsistencyApplies(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_stplan_record") })),
    true
  );
  assert.equal(
    stplanEventPlanRelationConsistencyApplies(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") })),
    false
  );
  assert.equal(
    stplanEventPlanRelationConsistencyApplies(context([], { run_mode: "incremental", touched_files: ["stories/test-story/_source/events/SE-3.yaml"] })),
    true
  );
  assert.equal(
    stplanEventPlanRelationConsistencyApplies(context([], { run_mode: "incremental", touched_files: ["stories/test-story/_source/plans/STPLAN-1.yaml"] })),
    true
  );
});

test("stplan_event_plan_relation_consistency accepts advancing events that mutate target records", async () => {
  const event = storyRecord("story_event_record", "SE-3", "events", {
    ...eventBody("SE-3", "The event advances the plan.", { supersede: ["STOBJ-1"] }),
    state_relations: [{ relation: "advances", target_record: "STPLAN-1" }]
  });
  const verdicts = await stplanEventPlanRelationConsistency.run(undefined, context(baseRecords([event, plan()])));
  assert.deepEqual(verdicts, []);
});

test("stplan_event_plan_relation_consistency rejects advancing events without target mutation", async () => {
  const event = storyRecord("story_event_record", "SE-3", "events", {
    ...eventBody("SE-3", "The event advances the plan.", { supersede: ["BEL-1"] }),
    state_relations: [{ relation: "advances", target_record: "STPLAN-1" }]
  });
  const verdicts = await stplanEventPlanRelationConsistency.run(undefined, context(baseRecords([event, plan()])));
  assert.ok(hasCode(verdicts, "stplan_event_plan_relation_consistency.no_matching_delta"));
});

test("stplan_event_plan_relation_consistency accepts test relations that touch success-condition predicate records", async () => {
  const event = relationEvent("tests", { supersede: ["SF-1"] });
  const verdicts = await stplanEventPlanRelationConsistency.run(undefined, context(baseRecords([event, plan()])));
  assert.deepEqual(verdicts, []);
});

test("stplan_event_plan_relation_consistency rejects test relations without predicate-record touches", async () => {
  const event = relationEvent("tests", { supersede: ["BEL-1"] });
  const verdicts = await stplanEventPlanRelationConsistency.run(undefined, context(baseRecords([event, plan()])));
  assert.ok(hasCode(verdicts, "stplan_event_plan_relation_consistency.tests_no_predicate_touch"));
});

test("stplan_event_plan_relation_consistency accepts block relations that touch existing blockers", async () => {
  const event = relationEvent("blocks", { close: ["THR-1"] });
  const verdicts = await stplanEventPlanRelationConsistency.run(undefined, context(baseRecords([event, plan()])));
  assert.deepEqual(verdicts, []);
});

test("stplan_event_plan_relation_consistency rejects block relations without obstruction deltas", async () => {
  const event = relationEvent("blocks", { supersede: ["BEL-1"] });
  const verdicts = await stplanEventPlanRelationConsistency.run(undefined, context(baseRecords([event, plan()])));
  assert.ok(hasCode(verdicts, "stplan_event_plan_relation_consistency.blocks_no_obstruction_delta"));
});

test("stplan_event_plan_relation_consistency accepts revise relations that supersede the plan", async () => {
  const nextPlan = plan({ id: "STPLAN-2", supersedes: "STPLAN-1" });
  const event = relationEvent("revises", { create: ["STPLAN-2"], supersede: ["STPLAN-1"] });
  const verdicts = await stplanEventPlanRelationConsistency.run(undefined, context(baseRecords([event, plan(), nextPlan])));
  assert.deepEqual(verdicts, []);
});

test("stplan_event_plan_relation_consistency rejects revise relations without plan supersession", async () => {
  const event = relationEvent("revises", { supersede: ["BEL-1"] });
  const verdicts = await stplanEventPlanRelationConsistency.run(undefined, context(baseRecords([event, plan()])));
  assert.ok(hasCode(verdicts, "stplan_event_plan_relation_consistency.revises_no_supersession"));
});

test("stplan_event_plan_relation_consistency accepts fulfill relations that supersede to fulfilled status", async () => {
  const nextPlan = plan({ id: "STPLAN-2", supersedes: "STPLAN-1", plan_status: "fulfilled" });
  const event = relationEvent("fulfills", { create: ["STPLAN-2"], supersede: ["STPLAN-1"] });
  const verdicts = await stplanEventPlanRelationConsistency.run(undefined, context(baseRecords([event, plan(), nextPlan])));
  assert.deepEqual(verdicts, []);
});

test("stplan_event_plan_relation_consistency rejects fulfill relations without fulfilled status", async () => {
  const nextPlan = plan({ id: "STPLAN-2", supersedes: "STPLAN-1", plan_status: "blocked" });
  const event = relationEvent("fulfills", { create: ["STPLAN-2"], supersede: ["STPLAN-1"] });
  const verdicts = await stplanEventPlanRelationConsistency.run(undefined, context(baseRecords([event, plan(), nextPlan])));
  assert.ok(hasCode(verdicts, "stplan_event_plan_relation_consistency.fulfills_status_mismatch"));
});

test("stplan_event_plan_relation_consistency accepts abandon relations that supersede to abandoned status", async () => {
  const nextPlan = plan({ id: "STPLAN-2", supersedes: "STPLAN-1", plan_status: "abandoned" });
  const event = relationEvent("abandons", { create: ["STPLAN-2"], supersede: ["STPLAN-1"] });
  const verdicts = await stplanEventPlanRelationConsistency.run(undefined, context(baseRecords([event, plan(), nextPlan])));
  assert.deepEqual(verdicts, []);
});

test("stplan_event_plan_relation_consistency rejects abandon relations without abandoned status", async () => {
  const nextPlan = plan({ id: "STPLAN-2", supersedes: "STPLAN-1", plan_status: "failed" });
  const event = relationEvent("abandons", { create: ["STPLAN-2"], supersede: ["STPLAN-1"] });
  const verdicts = await stplanEventPlanRelationConsistency.run(undefined, context(baseRecords([event, plan(), nextPlan])));
  assert.ok(hasCode(verdicts, "stplan_event_plan_relation_consistency.abandons_status_mismatch"));
});

test("stplan_event_plan_relation_consistency accepts ignore relations that do not touch plan basis", async () => {
  const event = relationEvent("ignores", { create: ["CLK-1"] });
  const verdicts = await stplanEventPlanRelationConsistency.run(undefined, context(baseRecords([event, plan()])));
  assert.deepEqual(verdicts, []);
});

test("stplan_event_plan_relation_consistency rejects ignore relations that touch plan basis", async () => {
  const event = relationEvent("ignores", { supersede: ["BEL-1"] });
  const verdicts = await stplanEventPlanRelationConsistency.run(undefined, context(baseRecords([event, plan()])));
  assert.ok(hasCode(verdicts, "stplan_event_plan_relation_consistency.ignores_unexpected_delta"));
});

function relationEvent(relation: string, delta: Record<string, string[]>) {
  return storyRecord("story_event_record", "SE-3", "events", {
    ...eventBody("SE-3", `The event ${relation} the plan.`, delta),
    state_relations: [{ relation, target_record: "STPLAN-1" }]
  });
}

function patchPlan(op: string) {
  return { patches: [{ op }] } as any;
}
