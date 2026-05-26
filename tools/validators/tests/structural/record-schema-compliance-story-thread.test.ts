import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const FILE_PATH = "stories/test-story/_source/threads/THR-1.yaml";

test("record_schema_compliance accepts complete THR records", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    threadRecord(validThread())
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance accepts a THR derived from the clock that is its tension", async () => {
  // The central regression this fixes: a thread whose tension *is* a pressure
  // clock (CLK) could not previously cite it in derived_from, because the THR
  // derived_from union predated SPEC-42. The widened canonical pattern now
  // admits CLK/STSEC/STQ/STSTAT/STPLAN/STEMO as legitimate provenance.
  const result = await recordSchemaCompliance.run({}, context([
    threadRecord(validThread({ derived_from: ["CLK-1", "STSEC-1", "STPLAN-1", "STEMO-1"] }))
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance accepts STCHAR in THR derived_from", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    threadRecord(validThread({ derived_from: ["STCHAR-1", "STENT-1", "STEMO-1"] }))
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance still rejects unknown classes in THR derived_from", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    threadRecord(validThread({ derived_from: ["NOPE-1"] }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/derived_from/0")
  ));
});

function threadRecord(parsed: Record<string, unknown>) {
  return {
    ...record("thread_record", "test-story:THR-1", FILE_PATH, parsed),
    story_slug: "test-story"
  };
}

function validThread(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "THR-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    status: "active",
    title: "The danger clock is winding down",
    summary: "The men who cornered Ane may still be near, and night is coming.",
    urgency: "high",
    ...overrides
  };
}
