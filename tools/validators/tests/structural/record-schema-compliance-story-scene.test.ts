import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const SCENE_FILE_PATH = "stories/foo/_source/scenes/SCN-1.yaml";

function sceneRecord(parsed: Record<string, unknown>) {
  return record("scene_record", String(parsed.id ?? "SCN-1"), SCENE_FILE_PATH, parsed);
}

function validScenePayload(): Record<string, unknown> {
  return {
    id: "SCN-1",
    story_id: "STORY-1",
    branch_id: "BR-1",
    supersedes: null,
    pg_ids: ["PG-1", "PG-2"],
    start_page_id: "PG-1",
    end_page_id: "PG-2",
    previous_scene_id: null,
    choice_surface_page_id: "PG-2",
    emitted_choice_ids: ["CHC-1"],
    title: "Bench scene",
    slug: "bench-scene",
    scene_descriptor: "A continuous bench exchange.",
    boundary_rationale: "The POV, location, cast, and exchange remain continuous.",
    prose_plan_path: "scene-prose-plans/SCN-1.md",
    prose_path: "scene-prose/SCN-1.md",
    receipt_path: "scene-prose-receipts/SCN-1.yaml"
  };
}

test("record_schema_compliance accepts a contract-shaped SCN record", async () => {
  const result = await recordSchemaCompliance.run({}, context([sceneRecord(validScenePayload())]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance accepts optional SCN descriptor fields absent", async () => {
  const parsed = validScenePayload();
  delete parsed.previous_scene_id;
  delete parsed.scene_descriptor;
  delete parsed.boundary_rationale;

  const result = await recordSchemaCompliance.run({}, context([sceneRecord(parsed)]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance accepts SCN supersession lineage", async () => {
  const parsed = validScenePayload();
  parsed.id = "SCN-2";
  parsed.supersedes = "SCN-1";
  parsed.prose_plan_path = "scene-prose-plans/SCN-2.md";
  parsed.prose_path = "scene-prose/SCN-2.md";
  parsed.receipt_path = "scene-prose-receipts/SCN-2.yaml";

  const result = await recordSchemaCompliance.run({}, context([sceneRecord(parsed)]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects stray SCN status", async () => {
  const parsed = validScenePayload();
  parsed.status = "rendered";

  const result = await recordSchemaCompliance.run({}, context([sceneRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.additionalProperties" &&
    verdict.message.includes("must NOT have additional properties")
  )));
});

test("record_schema_compliance rejects SCN additional properties", async () => {
  for (const extraField of ["render_kind", "source_pg_fingerprint"]) {
    const parsed = validScenePayload();
    parsed[extraField] = "stale";

    const result = await recordSchemaCompliance.run({}, context([sceneRecord(parsed)]));

    assert.ok(result.some((verdict) => (
      verdict.code === "record_schema_compliance.additionalProperties" &&
      verdict.message.includes("must NOT have additional properties")
    )), extraField);
  }
});

test("record_schema_compliance rejects malformed SCN routing fields", async () => {
  const parsed = validScenePayload();
  parsed.id = "SCN-0001";
  parsed.prose_path = "pages-prose/PG-1.md";

  const result = await recordSchemaCompliance.run({}, context([sceneRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/id")
  )));
  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/prose_path")
  )));
});
