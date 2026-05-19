import assert from "node:assert/strict";
import test from "node:test";

import { stplanClosureStatusRequiresClosureEvent } from "../../src/structural/stplan-closure-status-requires-closure-event.js";
import { baseRecords, context, eventBody, hasCode, plan, storyRecord } from "./stplan-helpers.js";

test("stplan_closure_status_requires_closure_event accepts closed plans with closure events", async () => {
  const event = storyRecord("story_event_record", "SE-3", "events", {
    ...eventBody("SE-3", "The event fulfills the plan."),
    state_relations: [{ relation: "fulfills", target_record: "STPLAN-1" }]
  });
  const verdicts = await stplanClosureStatusRequiresClosureEvent.run(undefined, context(baseRecords([event, plan({ plan_status: "fulfilled" })])));
  assert.deepEqual(verdicts, []);
});

test("stplan_closure_status_requires_closure_event rejects closed plans without closure events", async () => {
  const verdicts = await stplanClosureStatusRequiresClosureEvent.run(undefined, context(baseRecords([plan({ plan_status: "fulfilled" })])));
  assert.ok(hasCode(verdicts, "stplan_closure_status_requires_closure_event.missing_closure_event"));
});
