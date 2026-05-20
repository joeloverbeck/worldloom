import assert from "node:assert/strict";
import test from "node:test";

import { getRecord } from "../../src/tools/get-record.js";
import { getRecordField } from "../../src/tools/get-record-field.js";
import { getRecords } from "../../src/tools/get-records.js";
import { getRecordsField } from "../../src/tools/get-records-field.js";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared.js";
import { STORY_FIXTURE_SLUG, buildStoryBundleWorld, storyNodeId } from "./story-bundle-fixture.js";

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

test("getRecord resolves BEL story-bundle records through story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecord({
        record_id: "BEL-1",
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG
      })
    );
    const holder = await withRepoRoot(root, () =>
      getRecord({
        record_id: "BEL-1",
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG,
        section_path: "holder"
      })
    );

    assert.ok("record" in result);
    assert.equal(result.record.record_kind, "belief_record");
    assert.equal(result.record.id, "BEL-1");
    assert.equal(result.record.holder, "STENT-2");
    assert.equal(result.record.claim, "Marla believes the loft is empty.");
    assert.equal(result.record.belief_mode, "believes");
    assert.equal(result.record.truth_relation, "false");
    assert.equal(result.record.confidence, "likely");
    assert.equal(result.record.visibility, "private");
    assert.equal(result.file_path, "stories/opening-bells/_source/beliefs/BEL-1.yaml");

    assert.ok("value" in holder);
    assert.equal(holder.record_kind, "belief_record");
    assert.equal(holder.section_path, "holder");
    assert.equal(holder.value, "STENT-2");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecord resolves CLK, STSEC, and STQ story-bundle records through story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const clock = await withRepoRoot(root, () =>
      getRecord({
        record_id: "CLK-1",
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG
      })
    );
    const secret = await withRepoRoot(root, () =>
      getRecord({
        record_id: "STSEC-1",
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG
      })
    );
    const question = await withRepoRoot(root, () =>
      getRecord({
        record_id: "STQ-1",
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG
      })
    );

    assert.ok("record" in clock);
    assert.equal(clock.record.record_kind, "pressure_clock_record");
    assert.equal(clock.record.id, "CLK-1");
    assert.equal(clock.record.clock_kind, "danger");
    assert.equal(clock.file_path, "stories/opening-bells/_source/clocks/CLK-1.yaml");

    assert.ok("record" in secret);
    assert.equal(secret.record.record_kind, "story_secret_record");
    assert.equal(secret.record.id, "STSEC-1");
    assert.equal(secret.record.secret_kind, "event_cause");
    assert.equal(secret.file_path, "stories/opening-bells/_source/secrets/STSEC-1.yaml");

    assert.ok("record" in question);
    assert.equal(question.record.record_kind, "story_question_record");
    assert.equal(question.record.id, "STQ-1");
    assert.equal(question.record.question_or_setup, "Who rang the loft bell?");
    assert.equal(question.file_path, "stories/opening-bells/_source/story-questions/STQ-1.yaml");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecord resolves STPLAN and STEMO story-bundle records through story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const plan = await withRepoRoot(root, () =>
      getRecord({
        record_id: "STPLAN-1",
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG
      })
    );
    const emotion = await withRepoRoot(root, () =>
      getRecord({
        record_id: "STEMO-1",
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG
      })
    );

    assert.ok("record" in plan);
    assert.equal(plan.record.record_kind, "story_plan_record");
    assert.equal(plan.record.id, "STPLAN-1");
    assert.equal(plan.record.supersedes, "STPLAN-0");
    assert.equal(plan.file_path, "stories/opening-bells/_source/plans/STPLAN-1.yaml");

    assert.ok("record" in emotion);
    assert.equal(emotion.record.record_kind, "story_emotion_record");
    assert.equal(emotion.record.id, "STEMO-1");
    assert.equal(emotion.record.supersedes, "STEMO-0");
    assert.equal(emotion.file_path, "stories/opening-bells/_source/emotions/STEMO-1.yaml");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecord resolves STCHAR and projects hybrid sections through story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const full = await withRepoRoot(root, () =>
      getRecord({
        record_id: "STCHAR-1",
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG
      })
    );
    const sourceChar = await withRepoRoot(root, () =>
      getRecord({
        record_id: "STCHAR-1",
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG,
        section_path: "frontmatter.source_char_id"
      })
    );
    const voiceBlock = await withRepoRoot(root, () =>
      getRecord({
        record_id: "STCHAR-1",
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG,
        section_path: "body.Page-Plan Voice Block"
      })
    );

    assert.ok("frontmatter" in full);
    assert.equal(full.record_kind, "story_character_authority_record");
    assert.equal(full.record_id, "opening-bells:STCHAR-1");
    assert.equal(full.frontmatter.id, "STCHAR-1");
    assert.deepEqual(full.frontmatter.bound_stent_ids, ["STENT-2"]);
    assert.match(full.body_sections["Page-Plan Voice Block"] ?? "", /clipped, observant phrasing/);
    assert.equal(full.file_path, "stories/opening-bells/story-characters/STCHAR-1.md");

    assert.ok("value" in sourceChar);
    assert.equal(sourceChar.value, "CHAR-1");
    assert.ok("value" in voiceBlock);
    assert.match(String(voiceBlock.value), /avoid direct world-character dossier text/);
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
        record_ids: ["SLT-21", "BEL-1", "PG-1", "CLK-1", "STSEC-1", "STQ-1"],
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
    assert.deepEqual(records.records.map((entry) => entry.found), [true, true, true, true, true, true]);
    assert.equal(records.records[1]?.found, true);
    if (records.records[1]?.found) {
      assert.ok("record" in records.records[1].record);
      const belRecord = records.records[1].record.record as Record<string, unknown>;
      assert.equal(belRecord.record_kind, "belief_record");
      assert.equal(belRecord.id, "BEL-1");
    }
    assert.equal(records.records[3]?.found, true);
    if (records.records[3]?.found) {
      assert.ok("record" in records.records[3].record);
      const clockRecord = records.records[3].record.record as Record<string, unknown>;
      assert.equal(clockRecord.record_kind, "pressure_clock_record");
      assert.equal(clockRecord.id, "CLK-1");
    }

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
