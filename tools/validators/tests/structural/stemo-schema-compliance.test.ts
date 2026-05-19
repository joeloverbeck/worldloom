import assert from "node:assert/strict";
import test from "node:test";

import { stemoSchemaCompliance } from "../../src/structural/stemo-schema-compliance.js";
import { baseRecords, context, emotion, hasCode } from "./stemo-helpers.js";

test("stemo_schema_compliance accepts contract-shaped STEMO records", async () => {
  const verdicts = await stemoSchemaCompliance.run(undefined, context(baseRecords([emotion()])));
  assert.deepEqual(verdicts, []);
});

test("stemo_schema_compliance accepts dissociated records with null affect_kind", async () => {
  const dissociated = emotion({
    status: "dissociated",
    affect_kind: null,
    intensity: undefined,
    appraisal_basis: [],
    behavioral_pressure: []
  });
  const verdicts = await stemoSchemaCompliance.run(undefined, context(baseRecords([dissociated])));
  assert.deepEqual(verdicts, []);
});

test("stemo_schema_compliance rejects malformed STEMO records", async () => {
  const invalid = emotion({ affect_kind: null, mood_arc: "rising" });
  const verdicts = await stemoSchemaCompliance.run(undefined, context(baseRecords([invalid])));
  assert.ok(hasCode(verdicts, "stemo_schema_compliance.additionalProperties"));
  assert.ok(hasCode(verdicts, "stemo_schema_compliance.type"));
});
