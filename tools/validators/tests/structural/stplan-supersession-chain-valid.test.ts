import assert from "node:assert/strict";
import test from "node:test";

import { stplanSupersessionChainValid } from "../../src/structural/stplan-supersession-chain-valid.js";
import { baseRecords, context, hasCode, plan } from "./stplan-helpers.js";

test("stplan_supersession_chain_valid accepts active prior plans", async () => {
  const verdicts = await stplanSupersessionChainValid.run(undefined, context(baseRecords([
    plan({ id: "STPLAN-0", supersedes: null }),
    plan({ supersedes: "STPLAN-0" })
  ])));
  assert.deepEqual(verdicts, []);
});

test("stplan_supersession_chain_valid rejects cycles", async () => {
  const verdicts = await stplanSupersessionChainValid.run(undefined, context(baseRecords([
    plan({ supersedes: "STPLAN-1" })
  ])));
  assert.ok(hasCode(verdicts, "stplan_supersession_chain_valid.cycle"));
});
