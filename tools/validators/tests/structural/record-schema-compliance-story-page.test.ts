import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const PAGE_FILE_PATH = "stories/foo/_source/pages/PG-0001.yaml";

function pageRecord(parsed: Record<string, unknown>) {
  return record("page_record", String(parsed.id ?? "PG-0001"), PAGE_FILE_PATH, parsed);
}

function validPagePayload(): Record<string, unknown> {
  return {
    id: "PG-0001",
    story_id: "STORY-001",
    prose_path: null,
    prose_plan_path: "pages-prose-plans/PG-0001.md",
    prose_status: "pending",
    deferred_validation_trace: {
      prose_ledger_consistency: "DEFERRED — awaiting prose render",
      prose_critic_8_axis: "DEFERRED — awaiting prose render"
    }
  };
}

test("record_schema_compliance accepts a pending PG record with null prose_path", async () => {
  const result = await recordSchemaCompliance.run({}, context([pageRecord(validPagePayload())]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance accepts a rendered PG record with a string prose_path", async () => {
  const parsed = validPagePayload();
  parsed.prose_path = "pages-prose/PG-0001.md";
  parsed.prose_status = "rendered";
  parsed.deferred_validation_trace = {
    prose_ledger_consistency: "PASS — render aligned with ledger",
    prose_critic_8_axis: "PASS — 8-axis verdict accepted"
  };

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects PG records missing prose_plan_path", async () => {
  const parsed = validPagePayload();
  delete parsed.prose_plan_path;

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("must have required property 'prose_plan_path'")
  )));
});

test("record_schema_compliance rejects PG records missing prose_status", async () => {
  const parsed = validPagePayload();
  delete parsed.prose_status;

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("must have required property 'prose_status'")
  )));
});

test("record_schema_compliance rejects PG records missing deferred_validation_trace", async () => {
  const parsed = validPagePayload();
  delete parsed.deferred_validation_trace;

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("must have required property 'deferred_validation_trace'")
  )));
});

test("record_schema_compliance rejects PG records with an invalid prose_status enum value", async () => {
  const parsed = validPagePayload();
  parsed.prose_status = "draft";

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.enum" &&
    verdict.message.includes("/prose_status")
  )));
});

test("record_schema_compliance rejects PG records with a prose_plan_path that violates the pattern", async () => {
  const parsed = validPagePayload();
  parsed.prose_plan_path = "pages-prose/PG-0001.md";

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/prose_plan_path")
  )));
});

test("record_schema_compliance rejects PG records with a prose_path string that violates the pattern", async () => {
  const parsed = validPagePayload();
  parsed.prose_path = "pages-prose-plans/PG-0001.md";

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/prose_path")
  )));
});

test("record_schema_compliance rejects PG records whose deferred_validation_trace omits a required gate key", async () => {
  const parsed = validPagePayload();
  parsed.deferred_validation_trace = {
    prose_ledger_consistency: "DEFERRED — awaiting prose render"
  };

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("must have required property 'prose_critic_8_axis'")
  )));
});

test("record_schema_compliance rejects PG records whose deferred_validation_trace carries unexpected keys", async () => {
  const parsed = validPagePayload();
  parsed.deferred_validation_trace = {
    prose_ledger_consistency: "DEFERRED — awaiting prose render",
    prose_critic_8_axis: "DEFERRED — awaiting prose render",
    extra_gate: "DEFERRED — awaiting prose render"
  };

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.additionalProperties" &&
    verdict.message.includes("/deferred_validation_trace")
  )));
});
