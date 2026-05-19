import assert from "node:assert/strict";
import test from "node:test";

import { stemoEnumCompliance } from "../../src/structural/stemo-enum-compliance.js";
import { baseRecords, context, emotion, hasCode } from "./stemo-helpers.js";

test("stemo_enum_compliance accepts closed enum values", async () => {
  const verdicts = await stemoEnumCompliance.run(undefined, context(baseRecords([emotion()])));
  assert.deepEqual(verdicts, []);
});

test("stemo_enum_compliance rejects invalid or duplicate enum values", async () => {
  const verdicts = await stemoEnumCompliance.run(
    undefined,
    context(baseRecords([emotion({ affect_kind: "surprise", behavioral_pressure: ["flee", "flee", "teleport"] })]))
  );
  assert.ok(hasCode(verdicts, "stemo_enum_compliance.invalid_affect_kind"));
  assert.ok(hasCode(verdicts, "stemo_enum_compliance.duplicate_behavioral_pressure"));
  assert.ok(hasCode(verdicts, "stemo_enum_compliance.invalid_behavioral_pressure"));
});

test("stemo_enum_compliance accepts null affect_kind only for dissociated status", async () => {
  const dissociated = emotion({ status: "dissociated", affect_kind: null, behavioral_pressure: [] });
  const verdicts = await stemoEnumCompliance.run(undefined, context(baseRecords([dissociated])));
  assert.deepEqual(verdicts, []);
});
