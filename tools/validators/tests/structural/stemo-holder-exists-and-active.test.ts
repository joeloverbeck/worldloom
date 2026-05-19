import assert from "node:assert/strict";
import test from "node:test";

import { stemoHolderExistsAndActive } from "../../src/structural/stemo-holder-exists-and-active.js";
import { baseRecords, context, emotion, hasCode } from "./stemo-helpers.js";

test("stemo_holder_exists_and_active accepts active holders", async () => {
  const verdicts = await stemoHolderExistsAndActive.run(undefined, context(baseRecords([emotion()])));
  assert.deepEqual(verdicts, []);
});

test("stemo_holder_exists_and_active rejects missing holders", async () => {
  const verdicts = await stemoHolderExistsAndActive.run(undefined, context(baseRecords([emotion({ holder: "STENT-404" })])));
  assert.ok(hasCode(verdicts, "stemo_holder_exists_and_active.missing_holder"));
});
