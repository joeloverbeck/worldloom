import assert from "node:assert/strict";
import test from "node:test";

import { stemoSupersessionLifecycleValid } from "../../src/structural/stemo-supersession-lifecycle-valid.js";
import { baseRecords, context, emotion, hasCode } from "./stemo-helpers.js";

test("stemo_supersession_lifecycle_valid accepts active prior emotions and transition events", async () => {
  const prior = emotion({ id: "STEMO-0", created_at_page: "PG-1" });
  const current = emotion({ supersedes: "STEMO-0", status: "settled" });
  const verdicts = await stemoSupersessionLifecycleValid.run(undefined, context(baseRecords([prior, current])));
  assert.deepEqual(verdicts, []);
});

test("stemo_supersession_lifecycle_valid accepts natural parent-to-child supersession where the prior is dropped from active_records on the new page (snapshot_replay_equality lawfully removes superseded STEMO via state_delta.supersede)", async () => {
  // Prior was active at the parent page (PG-1).
  // New emotion is created at PG-2 and supersedes the prior.
  // PG-2.active_records.STEMO does NOT contain the prior (it was dropped via state_delta.supersede on the page-producing event).
  // The supersession lifecycle check must still pass — the prior was active in the pre-event snapshot.
  const prior = emotion({ id: "STEMO-0", created_at_page: "PG-1" });
  const current = emotion({ supersedes: "STEMO-0" });
  const verdicts = await stemoSupersessionLifecycleValid.run(undefined, context(baseRecords([prior, current])));
  assert.deepEqual(verdicts, []);
});

test("stemo_supersession_lifecycle_valid rejects supersession of a prior that was not active in the parent snapshot", async () => {
  // STEMO-99 was never active at the parent of PG-2 — supersession is unlawful.
  const current = emotion({ supersedes: "STEMO-99" });
  const verdicts = await stemoSupersessionLifecycleValid.run(undefined, context(baseRecords([current])));
  assert.ok(hasCode(verdicts, "stemo_supersession_lifecycle_valid.prior_not_active"));
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
