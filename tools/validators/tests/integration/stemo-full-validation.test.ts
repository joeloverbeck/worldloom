import assert from "node:assert/strict";
import test from "node:test";

import { runValidators } from "../../src/framework/run.js";
import { structuralValidators } from "../../src/public/registry.js";
import { baseRecords, context, emotion } from "../structural/stemo-helpers.js";

test("STEMO structural validators pass together on a representative fixture", async () => {
  const run = await runValidators(structuralValidators, undefined, context(baseRecords([emotion()])));
  const stemoVerdicts = run.verdicts.filter((verdict) => verdict.validator.startsWith("stemo_"));
  assert.deepEqual(stemoVerdicts, []);
  assert.equal(run.summary.validators_run.filter((name) => name.startsWith("stemo_")).length, 9);
});

test("STEMO structural validators report targeted failures", async () => {
  const run = await runValidators(structuralValidators, undefined, context(baseRecords([
    emotion({
      holder: "STENT-404",
      appraisal_basis: ["BEL-404"],
      orientation: { toward_records: ["STENT-404"] },
      trigger_event: "SE-404",
      agency_effect: "constraining"
    })
  ])));
  assert.ok(run.verdicts.some((verdict) => verdict.validator === "stemo_holder_exists_and_active"));
  assert.ok(run.verdicts.some((verdict) => verdict.validator === "stemo_trigger_event_on_branch_path"));
  assert.ok(run.verdicts.some((verdict) => verdict.validator === "stemo_appraisal_basis_accessible_to_holder"));
  assert.ok(run.verdicts.some((verdict) => verdict.validator === "stemo_orientation_records_exist"));
  assert.ok(run.verdicts.some((verdict) => verdict.validator === "stemo_agency_effect_compatibility"));
});
