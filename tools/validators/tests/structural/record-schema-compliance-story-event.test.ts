import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const FILE_PATH = "stories/test-story/_source/events/SE-0001.yaml";
const VALID_EVENT_KINDS = [
  "story_start",
  "selected_choice",
  "write_in_attempt",
  "system_repair",
  "audit_repair",
  "prose_attach",
  "promotion_closeout"
];

test("record_schema_compliance accepts every contract SE event_kind value", async () => {
  for (const eventKind of VALID_EVENT_KINDS) {
    const result = await recordSchemaCompliance.run({}, context([
      eventRecord(validEvent({ event_kind: eventKind }))
    ]));

    assert.deepEqual(result, [], eventKind);
  }
});

test("record_schema_compliance rejects retired SE event_kind values", async () => {
  for (const eventKind of ["world_block", "repair"]) {
    const result = await recordSchemaCompliance.run({}, context([
      eventRecord(validEvent({ event_kind: eventKind }))
    ]));

    assert.ok(result.some((verdict) =>
      verdict.code === "record_schema_compliance.enum" &&
      verdict.message.includes("/event_kind")
    ), eventKind);
  }
});

test("record_schema_compliance requires SE event_kind", async () => {
  const parsed = validEvent();
  delete parsed.event_kind;

  const result = await recordSchemaCompliance.run({}, context([
    eventRecord(parsed)
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("'event_kind'")
  ));
});

function eventRecord(parsed: Record<string, unknown>) {
  return {
    ...record("story_event_record", "test-story:SE-0001", FILE_PATH, parsed),
    story_slug: "test-story"
  };
}

function validEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "SE-0001",
    story_id: "STORY-001",
    event_kind: "selected_choice",
    created_at_page: "PG-0001",
    ops: [],
    ...overrides
  };
}
