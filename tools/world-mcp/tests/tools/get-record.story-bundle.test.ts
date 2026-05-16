import assert from "node:assert/strict";
import test from "node:test";

import { getRecord } from "../../src/tools/get-record";
import { getRecordField } from "../../src/tools/get-record-field";
import { getRecords } from "../../src/tools/get-records";
import { getRecordsField } from "../../src/tools/get-records-field";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared";
import { STORY_FIXTURE_SLUG, buildStoryBundleWorld, storyNodeId } from "./story-bundle-fixture";

test("getRecord resolves authored story-bundle ids through story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecord({
        record_id: "SLT-21",
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG
      })
    );

    assert.ok("record" in result);
    assert.equal(result.record.record_kind, "storylet_record");
    assert.equal(result.record.id, "SLT-21");
    assert.equal(result.record.title, "Loft Choice");
    assert.equal(result.file_path, "stories/opening-bells/_source/storylets/SLT-21.yaml");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecord rejects bundle-scoped ids without story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecord({ record_id: "SLT-21", world_slug: "seeded" })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.match(result.message, /story_slug required/);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecord routes DA by story_slug presence", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "DA-0001",
          world_slug: "seeded",
          file_path: "diegetic-artifacts/world-letter.md",
          node_type: "diegetic_artifact_record",
          body: [
            "---",
            "artifact_id: DA-0001",
            "title: World Letter",
            "---",
            "# World Letter",
            "",
            "## Body",
            "",
            "A world-scoped artifact.",
            ""
          ].join("\n")
        },
        {
          node_id: storyNodeId(STORY_FIXTURE_SLUG, "DA-0001"),
          world_slug: "seeded",
          story_slug: STORY_FIXTURE_SLUG,
          file_path: `stories/${STORY_FIXTURE_SLUG}/_source/artifacts/DA-0001.yaml`,
          node_type: "story_diegetic_artifact_record",
          body: [
            "id: DA-0001",
            "title: Story Letter",
            "created_at_page: PG-1",
            "supersedes: null",
            "summary: A story-local artifact.",
            ""
          ].join("\n")
        }
      ]
    });

    const worldRecord = await withRepoRoot(root, () =>
      getRecord({ record_id: "DA-0001", world_slug: "seeded" })
    );
    const storyRecord = await withRepoRoot(root, () =>
      getRecord({
        record_id: "DA-0001",
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG
      })
    );

    assert.ok("frontmatter" in worldRecord, "expected world DA to remain a hybrid record");
    assert.equal(worldRecord.record_kind, "diegetic_artifact");
    assert.equal(worldRecord.frontmatter.title, "World Letter");

    assert.ok("record" in storyRecord, "expected story-local DA to resolve as a story record");
    assert.equal(storyRecord.record.record_kind, "story_diegetic_artifact_record");
    assert.equal(storyRecord.record.title, "Story Letter");
    assert.equal(storyRecord.file_path, `stories/${STORY_FIXTURE_SLUG}/_source/artifacts/DA-0001.yaml`);
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
        record_id: "SLT-21",
        field_path: ["provenance", "created_at_page"],
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG
      })
    );
    const records = await withRepoRoot(root, () =>
      getRecords({
        record_ids: ["SLT-21", "PG-1"],
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG
      })
    );
    const fields = await withRepoRoot(root, () =>
      getRecordsField({
        record_ids: ["SLT-21", "PG-1"],
        field_path: ["id"],
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG
      })
    );
    const ids = await withRepoRoot(root, () =>
      getRecordsField({
        record_ids: ["SLT-21", "PG-1"],
        field_path: ["id"],
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG
      })
    );

    assert.ok("value" in field);
    assert.equal(field.value, "PG-1");

    assert.ok(!("code" in records));
    assert.equal(records.delivery_status, "inline");
    assert.deepEqual(records.records.map((entry) => entry.found), [true, true]);

    assert.ok(!("code" in fields));
    assert.deepEqual(
      fields.records.map((entry) => (entry.found ? entry.field_value : undefined)),
      ["SLT-21", "PG-1"]
    );

    assert.ok(!("code" in ids));
    assert.deepEqual(
      ids.records.map((entry) => (entry.found ? entry.field_value : undefined)),
      ["SLT-21", "PG-1"]
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});
