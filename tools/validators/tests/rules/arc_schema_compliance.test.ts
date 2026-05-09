import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import yaml from "js-yaml";

import { arcSchemaCompliance } from "../../src/rules/arc_schema_compliance.js";
import { context, record } from "../structural/helpers.js";

test("arc_schema_compliance accepts a populated v2 scene-commitment arc", async () => {
  const result = await arcSchemaCompliance.run({}, context([storyletRecord(completeStorylet())]));

  assert.deepEqual(result, []);
});

test("arc_schema_compliance rejects each missing structural block", async () => {
  for (const block of [
    "arc_contract",
    "dramatic_unit",
    "beat_plan",
    "execution_envelope",
    "stop_policy",
    "effect_model",
    "exit_portfolio"
  ]) {
    const parsed = completeStorylet();
    delete parsed[block];

    const result = await arcSchemaCompliance.run({}, context([storyletRecord(parsed)]));

    assert.ok(result.some((verdict) => (
      verdict.code === "arc_schema_compliance.missing_block" &&
      verdict.message.includes(block)
    )), block);
  }
});

test("arc_schema_compliance rejects empty required sub-fields", async () => {
  const parsed = completeStorylet();
  (parsed.arc_contract as Record<string, unknown>).allowed_outcome_band = [];

  const result = await arcSchemaCompliance.run({}, context([storyletRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "arc_schema_compliance.empty_field" &&
    verdict.message.includes("arc_contract.allowed_outcome_band")
  )));
});

function completeStorylet(): Record<string, unknown> {
  return yaml.load(readFileSync(path.resolve(process.cwd(), "tests", "fixtures", "story-storylet-complete.yaml"), "utf8"), {
    schema: yaml.JSON_SCHEMA
  }) as Record<string, unknown>;
}

function storyletRecord(parsed: Record<string, unknown>, id = String(parsed.id ?? "SLT-0001")) {
  return record("storylet_record", id, `stories/red-bunny/_source/storylets/${id}.yaml`, {
    ...parsed,
    id
  });
}
