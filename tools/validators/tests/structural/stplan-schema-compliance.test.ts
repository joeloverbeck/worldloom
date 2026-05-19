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
