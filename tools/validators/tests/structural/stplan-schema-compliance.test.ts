import assert from "node:assert/strict";
import test from "node:test";

import { stplanSchemaCompliance } from "../../src/structural/stplan-schema-compliance.js";
import { baseRecords, context, hasCode, plan } from "./stplan-helpers.js";

test("stplan_schema_compliance accepts contract-shaped STPLAN records", async () => {
  const verdicts = await stplanSchemaCompliance.run(undefined, context(baseRecords([plan()])));
  assert.deepEqual(verdicts, []);
});

test("stplan_schema_compliance rejects malformed STPLAN records", async () => {
  const invalid = plan({ risk_posture: "reckless", plan_status: "dramatic_arc" });
  const verdicts = await stplanSchemaCompliance.run(undefined, context(baseRecords([invalid])));
  assert.ok(hasCode(verdicts, "stplan_schema_compliance.additionalProperties"));
  assert.ok(hasCode(verdicts, "stplan_schema_compliance.enum"));
});

test("stplan_schema_compliance enforces active-lifecycle required fields", async () => {
  const missingCurrentStep = plan({ current_step: undefined });
  const emptyBeliefBasis = plan({ belief_basis: [] });

  const currentStepVerdicts = await stplanSchemaCompliance.run(undefined, context(baseRecords([missingCurrentStep])));
  assert.ok(hasCode(currentStepVerdicts, "stplan_schema_compliance.required"));

  const beliefBasisVerdicts = await stplanSchemaCompliance.run(undefined, context(baseRecords([emptyBeliefBasis])));
  assert.ok(hasCode(beliefBasisVerdicts, "stplan_schema_compliance.minItems"));
});

test("stplan_schema_compliance allows terminal plans without live-step grounding", async () => {
  const terminalPlan = plan({ plan_status: "abandoned", belief_basis: [], current_step: undefined });
  const verdicts = await stplanSchemaCompliance.run(undefined, context(baseRecords([terminalPlan])));
  assert.deepEqual(verdicts, []);
});
