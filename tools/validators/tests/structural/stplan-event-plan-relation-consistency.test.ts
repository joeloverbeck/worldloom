import assert from "node:assert/strict";
import test from "node:test";

import { stplanEventPlanRelationConsistency } from "../../src/structural/stplan-event-plan-relation-consistency.js";
import { baseRecords, context, eventBody, hasCode, plan, storyRecord } from "./stplan-helpers.js";

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
