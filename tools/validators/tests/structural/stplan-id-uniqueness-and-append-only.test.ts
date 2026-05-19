import assert from "node:assert/strict";
import test from "node:test";

import { stplanIdUniquenessAndAppendOnly } from "../../src/structural/stplan-id-uniqueness-and-append-only.js";
import { baseRecords, context, hasCode, plan } from "./stplan-helpers.js";

test("stplan_id_uniqueness_and_append_only accepts unique STPLAN ids", async () => {
  const verdicts = await stplanIdUniquenessAndAppendOnly.run(undefined, context(baseRecords([plan()])));
  assert.deepEqual(verdicts, []);
});

test("stplan_id_uniqueness_and_append_only rejects duplicate STPLAN ids", async () => {
  const verdicts = await stplanIdUniquenessAndAppendOnly.run(undefined, context(baseRecords([plan(), plan({ objective: "Duplicate plan." })])));
  assert.ok(hasCode(verdicts, "stplan_id_uniqueness_and_append_only.duplicate_id"));
});
