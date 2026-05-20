import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const FILE_PATH = "stories/test-story/_source/clocks/CLK-1.yaml";

test("record_schema_compliance accepts complete CLK records", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    clockRecord(validClock())
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance accepts STPLAN/STEMO targets in CLK threshold effects", async () => {
  // SPEC-47 lifecycle classes: a clock crossing can fail an actor's plan or
  // transition an emotion, and the threshold effects are materialized verbatim
  // into SE.state_delta (which already accepts STPLAN/STEMO).
  const parsed = validClock({
    thresholds: [
      {
        at: 3,
        label: "Deadline lands: escape plan collapses, dread spikes",
        effects: {
          create: ["STPLAN-2", "STEMO-2"],
          supersede: ["STPLAN-1", "STEMO-1"],
          close: ["STEMO-3"]
        }
      }
    ]
  });

  const result = await recordSchemaCompliance.run({}, context([
    clockRecord(parsed)
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects invalid CLK enum values", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    clockRecord(validClock({ clock_kind: "front", visibility: "audience_only" }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.enum" &&
    verdict.message.includes("/clock_kind")
  ));
  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.enum" &&
    verdict.message.includes("/visibility")
  ));
});

test("record_schema_compliance rejects zero tick deltas", async () => {
  const parsed = validClock({
    tick_history: [{ event: "SE-1", delta: 0, cause: "No-op tick." }]
  });

  const result = await recordSchemaCompliance.run({}, context([
    clockRecord(parsed)
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.not" &&
    verdict.message.includes("/tick_history/0/delta")
  ));
});

test("record_schema_compliance accepts STPLAN in CLK linked_records", async () => {
  // A clock can pressure an actor's tactical plan (deadline forcing revision);
  // STPLAN was missing from the curated linked_records set. STSEC stays excluded
  // by design (SPEC-42 deliberately omitted it).
  const result = await recordSchemaCompliance.run({}, context([
    clockRecord(validClock({ linked_records: ["THR-1", "STPLAN-1"] }))
  ]));

  assert.deepEqual(result, []);
});

function clockRecord(parsed: Record<string, unknown>) {
  return {
    ...record("pressure_clock_record", "test-story:CLK-1", FILE_PATH, parsed),
    story_slug: "test-story"
  };
}

function validClock(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "CLK-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    title: "Harbor patrol alert",
    clock_kind: "exposure",
    driver: "group:harbor watch",
    linked_records: ["THR-1"],
    value: 1,
    max: 4,
    salience: "medium",
    visibility: "factional",
    thresholds: [
      {
        at: 3,
        label: "Watch captain intervenes",
        effects: { create: ["CNSQ-1"], supersede: ["THR-1"], close: [] }
      }
    ],
    tick_history: [{ event: "SE-1", delta: 1, cause: "Initial patrol." }],
    status: "active",
    ...overrides
  };
}
