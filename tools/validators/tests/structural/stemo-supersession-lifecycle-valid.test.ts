import assert from "node:assert/strict";
import test from "node:test";

import { stemoSupersessionLifecycleValid } from "../../src/structural/stemo-supersession-lifecycle-valid.js";
import { baseRecords, context, emotion, hasCode } from "./stemo-helpers.js";

test("stemo_supersession_lifecycle_valid accepts active prior emotions and transition events", async () => {
  const prior = emotion({ id: "STEMO-0" });
  const current = emotion({ supersedes: "STEMO-0", status: "settled" });
  const verdicts = await stemoSupersessionLifecycleValid.run(undefined, context(baseRecords([prior, current])));
  assert.deepEqual(verdicts, []);
});

test("stemo_supersession_lifecycle_valid rejects cycles", async () => {
  const current = emotion({ supersedes: "STEMO-1" });
  const verdicts = await stemoSupersessionLifecycleValid.run(undefined, context(baseRecords([current])));
  assert.ok(hasCode(verdicts, "stemo_supersession_lifecycle_valid.cycle"));
});

test("stemo_supersession_lifecycle_valid rejects terminal statuses without transition event", async () => {
  const verdicts = await stemoSupersessionLifecycleValid.run(
    undefined,
    context(baseRecords([emotion({ status: "transformed", trigger_event: "SE-404", created_by_event: "SE-404" })]))
  );
  assert.ok(hasCode(verdicts, "stemo_supersession_lifecycle_valid.missing_transition_event"));
});
