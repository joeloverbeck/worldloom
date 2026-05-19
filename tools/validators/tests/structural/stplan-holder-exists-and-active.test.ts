import assert from "node:assert/strict";
import test from "node:test";

import { stplanHolderExistsAndActive } from "../../src/structural/stplan-holder-exists-and-active.js";
import { baseRecords, context, hasCode, page, plan } from "./stplan-helpers.js";

test("stplan_holder_exists_and_active accepts active holders", async () => {
  const verdicts = await stplanHolderExistsAndActive.run(undefined, context(baseRecords([plan()])));
  assert.deepEqual(verdicts, []);
});

test("stplan_holder_exists_and_active rejects missing or inactive holders", async () => {
  const records = baseRecords([page("PG-2", { STINT: ["STINT-1"] }), plan({ holder: "STENT-404" })]);
  const verdicts = await stplanHolderExistsAndActive.run(undefined, context(records));
  assert.ok(hasCode(verdicts, "stplan_holder_exists_and_active.missing_holder"));
});
