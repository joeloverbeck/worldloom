import assert from "node:assert/strict";
import test from "node:test";

import { stplanBlockersGrounded } from "../../src/structural/stplan-blockers-grounded.js";
import { baseRecords, context, hasCode, plan } from "./stplan-helpers.js";

test("stplan_blockers_grounded accepts active blockers", async () => {
  const verdicts = await stplanBlockersGrounded.run(undefined, context(baseRecords([plan()])));
  assert.deepEqual(verdicts, []);
});

test("stplan_blockers_grounded rejects missing blockers", async () => {
  const verdicts = await stplanBlockersGrounded.run(undefined, context(baseRecords([plan({ blockers: ["THR-404"] })])));
  assert.ok(hasCode(verdicts, "stplan_blockers_grounded.missing_blocker"));
});
