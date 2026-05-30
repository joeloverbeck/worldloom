import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import path from "node:path";

import Database from "better-sqlite3";

import { assembleContextPacket } from "../../src/context-packet/assemble.js";

import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "../tools/_shared.js";
import {
  buildStoryBundleWorld,
  STORY_FIXTURE_SLUG,
  STORY_FIXTURE_WORLD
} from "../tools/story-bundle-fixture.js";

function hashValue(source: string): string {
  return createHash("sha256").update(source.normalize("NFC"), "utf8").digest("hex");
}

function addLargeStoryletPool(root: string): void {
  const db = new Database(
    path.join(root, "worlds", STORY_FIXTURE_WORLD, "_index", "world.db")
  );
  try {
    const insert = db.prepare(
      `
        INSERT INTO nodes (
          node_id,
          world_slug,
          story_slug,
          file_path,
          heading_path,
          byte_start,
          byte_end,
          line_start,
          line_end,
          node_type,
          body,
          content_hash,
          anchor_checksum,
          summary,
          created_at_index_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    );

    for (let index = 22; index <= 70; index += 1) {
      const id = `SLT-${String(index).padStart(4, "0")}`;
      const body = [
        `id: ${id}`,
        `title: Large Pool Storylet ${index}`,
        "move_family: decision",
        "scope:",
        "  visibility: global_author_pool",
        "  branch_id: null",
        "saliency:",
        "  urgency: medium",
        "  cooldown_pages: 0",
        "  tags:",
        "    - pool",
        ""
      ].join("\n");
      insert.run(
        `${STORY_FIXTURE_SLUG}:${id}`,
        STORY_FIXTURE_WORLD,
        STORY_FIXTURE_SLUG,
        `stories/${STORY_FIXTURE_SLUG}/_source/storylets/${id}.yaml`,
        null,
        0,
        body.length,
        1,
        body.split("\n").length,
        "storylet_record",
        body,
        hashValue(body),
        hashValue(`${id}:${body}`),
        null,
        4
      );
    }
  } finally {
    db.close();
  }
}

function seedSceneCoverageForBranch(root: string, sceneCount: number): void {
  const db = new Database(
    path.join(root, "worlds", STORY_FIXTURE_WORLD, "_index", "world.db")
  );
  try {
    const sceneIds = Array.from({ length: sceneCount }, (_, index) => `SCN-${index + 1}`);
    const scenes = sceneIds.map((sceneId) => ({
      scene_id: sceneId,
      branch_id: "BR-1",
      supersedes: null,
      superseded: false,
      pg_ids: ["PG-1"],
      artifact_availability: {
        plan_present: true,
        prose_present: true,
        receipt_present: false,
        receipt_verdict: null
      },
      publication_indicator: "prose-present"
    }));

    db.prepare(
      `
        INSERT INTO scene_coverage (
          world_slug,
          story_slug,
          branch_id,
          active_scene_ids_json,
          superseded_scene_ids_json,
          unscened_ranges_json,
          pg_scene_lookup_json,
          scenes_json,
          refreshed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      STORY_FIXTURE_WORLD,
      STORY_FIXTURE_SLUG,
      "BR-1",
      JSON.stringify(sceneIds),
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify({ "PG-1": sceneIds }),
      JSON.stringify(scenes),
      "2026-05-30T00:00:00Z"
    );
  } finally {
    db.close();
  }
}

test("scene_coverage is the first story-bundle layer trimmed under budget pressure and carries no prose", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);
    seedSceneCoverageForBranch(root, 40);

    // Generous budget: the layer is present and prose-free by construction.
    const generous = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "commitment_block_authoring",
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        seed_nodes: ["entity:marla-kern"],
        token_budget: 18000
      })
    );
    assert.ok(!("code" in generous));
    assert.ok(generous.story_bundle_context?.scene_coverage !== null);
    assert.equal(
      /"(body|prose|prose_body)"/.test(
        JSON.stringify(generous.story_bundle_context?.scene_coverage)
      ),
      false
    );
    assert.equal(
      generous.truncation_summary.dropped_layers.includes("story_bundle_context.scene_coverage"),
      false
    );

    // Tight budget: scene_coverage trims first — before any higher-priority
    // existing layer — and that alone brings the packet under budget.
    const tight = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "commitment_block_authoring",
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        seed_nodes: ["entity:marla-kern"],
        token_budget: 2000
      })
    );
    assert.ok(!("code" in tight));
    assert.ok(tight.story_bundle_context !== null);
    assert.equal(tight.story_bundle_context.scene_coverage, null);
    assert.equal(
      tight.truncation_summary.dropped_layers[0],
      "story_bundle_context.scene_coverage"
    );
    for (const higherPriorityLayer of [
      "governing_world_context",
      "exact_record_links",
      "scoped_local_context",
      "impact_surfaces"
    ]) {
      assert.equal(
        tight.truncation_summary.dropped_layers.includes(higherPriorityLayer),
        false,
        `${higherPriorityLayer} must not trim before scene_coverage`
      );
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("persisted context-packet summaries include story-bundle context summary", async () => {
  const root = createTempRepoRoot();
  const originalCeiling = process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;

  try {
    buildStoryBundleWorld(root);
    addLargeStoryletPool(root);
    process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS = "9200";

    const result = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "commitment_block_authoring",
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        seed_nodes: ["entity:marla-kern"],
        token_budget: 18000
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.task_header.delivery_status, "persisted_with_summary");
    assert.ok(result.task_header.persisted_output_path !== undefined);
    assert.deepEqual(result.governing_summary?.story_bundle_context_summary, {
      story_slug: STORY_FIXTURE_SLUG,
      storylet_total: 50,
      visibility_filtered_storylet_count: 50,
      open_obligation_ids: ["OBL-1", "OBL-2", "OBL-3", "OBL-4", "OBL-5"],
      active_intention_ids: ["STINT-1"],
      active_status_entities: ["STENT-2"],
      active_belief_holders: ["STENT-2", "STENT-3"],
      active_relationship_participants: [["STENT-2", "STENT-3"]],
      active_location_ids: ["STLOC-1"],
      active_object_ids: ["STOBJ-1"],
      active_story_da_ids: ["DA-1"],
      active_story_character_ids: ["STCHAR-1"],
      active_plan_ids: ["STPLAN-1"],
      active_plan_holders: ["STENT-2"],
      active_emotion_ids: ["STEMO-1", "STEMO-2"],
      active_emotion_holders: ["STENT-2", "STENT-3"],
      active_thread_ids: ["THR-1"],
      active_clock_ids: ["CLK-1"],
      hidden_secret_ids: ["STSEC-1"],
      open_story_question_ids: ["STQ-1"],
      longest_active_branch_path: ["PG-1"],
      recent_page_ids: ["PG-1"],
      mystery_ids: ["M-1"],
      cast_stent_ids: ["STENT-2"],
      invariant_ids: ["INV-social-intimacy"],
      scene_coverage_active_scene_ids: [],
      scene_coverage_unscened_page_ids: []
    });
    assert.equal(result.story_bundle_context, null);
  } finally {
    if (originalCeiling === undefined) {
      delete process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;
    } else {
      process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS = originalCeiling;
    }
    destroyTempRepoRoot(root);
  }
});
