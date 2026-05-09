import assert from "node:assert/strict";
import test from "node:test";

import { getRecord } from "../../src/tools/get-record";
import { getRecordField } from "../../src/tools/get-record-field";
import { getRecords } from "../../src/tools/get-records";
import { getRecordsField } from "../../src/tools/get-records-field";

import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "./_shared";
import { STORY_FIXTURE_SLUG, buildStoryBundleWorld } from "./story-bundle-fixture";

test("getRecord resolves authored story-bundle ids through story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecord({
        record_id: "SLT-0021",
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG
      })
    );

    assert.ok("record" in result);
    assert.equal(result.record.record_kind, "storylet_record");
    assert.equal(result.record.id, "SLT-0021");
    assert.equal(result.record.title, "Loft Choice");
    assert.equal(result.file_path, "stories/opening-bells/_source/storylets/SLT-0021.yaml");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecord rejects bundle-scoped ids without story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecord({ record_id: "SLT-0021", world_slug: "seeded" })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.match(result.message, /story_slug required/);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecord resolves ARC_TRACE records and supports parsed section_path projection", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const full = await withRepoRoot(root, () =>
      getRecord({
        record_id: "ARCTRACE-0001",
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG
      })
    );
    const projected = await withRepoRoot(root, () =>
      getRecord({
        record_id: "ARCTRACE-0001",
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG,
        section_path: "effect_evidence"
      })
    );
    const nested = await withRepoRoot(root, () =>
      getRecord({
        record_id: "ARCTRACE-0001",
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG,
        section_path: "semantic_critic_verdict.status"
      })
    );
    const missingStorySlug = await withRepoRoot(root, () =>
      getRecord({ record_id: "ARCTRACE-0001", world_slug: "seeded" })
    );

    assert.ok("record" in full);
    assert.equal(full.record.record_kind, "arc_trace_node");
    assert.equal(full.record.id, "ARCTRACE-0001");
    assert.equal(full.file_path, "stories/opening-bells/_source/arc-traces/ARCTRACE-0001.yaml");

    assert.ok("value" in projected);
    assert.deepEqual(projected.value, [
      {
        effect_ref: 0,
        realized: "true",
        evidence_span: {
          start: 61,
          end: 75
        }
      }
    ]);

    assert.ok("value" in nested);
    assert.equal(nested.value, "pass");

    assert.ok("code" in missingStorySlug);
    assert.equal(missingStorySlug.code, "invalid_input");
    assert.match(missingStorySlug.message, /story_slug required/);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecordField and batch retrieval support story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const field = await withRepoRoot(root, () =>
      getRecordField({
        record_id: "SLT-0021",
        field_path: ["provenance", "created_at_page"],
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG
      })
    );
    const records = await withRepoRoot(root, () =>
      getRecords({
        record_ids: ["SLT-0021", "PG-0001"],
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG
      })
    );
    const fields = await withRepoRoot(root, () =>
      getRecordsField({
        record_ids: ["SLT-0021", "PG-0001", "ARCTRACE-0001"],
        field_path: ["semantic_critic_verdict", "status"],
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG
      })
    );
    const ids = await withRepoRoot(root, () =>
      getRecordsField({
        record_ids: ["SLT-0021", "PG-0001", "ARCTRACE-0001"],
        field_path: ["id"],
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG
      })
    );

    assert.ok("value" in field);
    assert.equal(field.value, "PG-0001");

    assert.ok(!("code" in records));
    assert.equal(records.delivery_status, "inline");
    assert.deepEqual(records.records.map((entry) => entry.found), [true, true]);

    assert.ok(!("code" in fields));
    assert.deepEqual(
      fields.records.map((entry) => (entry.found ? entry.field_value : undefined)),
      [undefined, undefined, "pass"]
    );

    assert.ok(!("code" in ids));
    assert.deepEqual(
      ids.records.map((entry) => (entry.found ? entry.field_value : undefined)),
      ["SLT-0021", "PG-0001", "ARCTRACE-0001"]
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});
