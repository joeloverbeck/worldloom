import assert from "node:assert/strict";
import test from "node:test";

import { stemoTriggerEventOnBranchPath } from "../../src/structural/stemo-trigger-event-on-branch-path.js";
import { baseRecords, context, emotion, eventBody, hasCode, page, storyRecord } from "./stemo-helpers.js";

test("stemo_trigger_event_on_branch_path accepts branch-path trigger events", async () => {
  const verdicts = await stemoTriggerEventOnBranchPath.run(undefined, context(baseRecords([emotion()])));
  assert.deepEqual(verdicts, []);
});

test("stemo_trigger_event_on_branch_path rejects off-branch trigger events", async () => {
  const offBranchEvent = storyRecord("story_event_record", "SE-3", "events", eventBody("SE-3", "Future event."));
  const offBranchPage = page("PG-3", { SE: ["SE-3"] });
  const verdicts = await stemoTriggerEventOnBranchPath.run(
    undefined,
    context(baseRecords([offBranchPage, offBranchEvent, emotion({ trigger_event: "SE-3" })]))
  );
  assert.ok(hasCode(verdicts, "stemo_trigger_event_on_branch_path.off_branch_trigger_event"));
});
