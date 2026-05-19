import assert from "node:assert/strict";
import test from "node:test";

import { runValidators } from "../../src/framework/run.js";
import { structuralValidators } from "../../src/public/registry.js";
import { baseRecords, context, plan } from "../structural/stplan-helpers.js";

test("STPLAN structural validators pass together on a representative fixture", async () => {
  const run = await runValidators(structuralValidators, undefined, context(baseRecords([plan()])));
  const stplanVerdicts = run.verdicts.filter((verdict) => verdict.validator.startsWith("stplan_"));
  assert.deepEqual(stplanVerdicts, []);
  assert.equal(run.summary.validators_run.filter((name) => name.startsWith("stplan_")).length, 13);
});

test("STPLAN structural validators report targeted failures", async () => {
  const run = await runValidators(structuralValidators, undefined, context(baseRecords([
    plan({
      holder: "STENT-404",
      belief_basis: ["BEL-404"],
      blockers: ["THR-404"],
      current_step: {
        action_family: "investigate",
        target_records: ["STOBJ-404"],
        success_condition: { predicates: [{ pred: "record_active", id: "SF-404" }] }
      }
    })
  ])));
  assert.ok(run.verdicts.some((verdict) => verdict.validator === "stplan_holder_exists_and_active"));
  assert.ok(run.verdicts.some((verdict) => verdict.validator === "stplan_belief_basis_grounded"));
  assert.ok(run.verdicts.some((verdict) => verdict.validator === "stplan_blockers_grounded"));
  assert.ok(run.verdicts.some((verdict) => verdict.validator === "stplan_current_step_targets_grounded"));
});
