import assert from "node:assert/strict";
import test from "node:test";

import { stplanCurrentStepTargetsGrounded } from "../../src/structural/stplan-current-step-targets-grounded.js";
import { baseRecords, context, hasCode, plan } from "./stplan-helpers.js";

test("stplan_current_step_targets_grounded accepts active target records", async () => {
  const verdicts = await stplanCurrentStepTargetsGrounded.run(undefined, context(baseRecords([plan()])));
  assert.deepEqual(verdicts, []);
});

test("stplan_current_step_targets_grounded rejects missing target records", async () => {
  const verdicts = await stplanCurrentStepTargetsGrounded.run(undefined, context(baseRecords([
    plan({ current_step: { action_family: "investigate", target_records: ["STOBJ-404"], success_condition: { predicates: [] } } })
  ])));
  assert.ok(hasCode(verdicts, "stplan_current_step_targets_grounded.missing_target"));
});
