import assert from "node:assert/strict";
import test from "node:test";

import { assembleContextPacket } from "../../src/context-packet/assemble";

import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "../tools/_shared";
import {
  buildStoryBundleWorld,
  STORY_FIXTURE_SLUG,
  STORY_FIXTURE_WORLD
} from "../tools/story-bundle-fixture";

test("story-pipeline context packets include indexed story-bundle context", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

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
    assert.equal(result.task_header.story_slug, STORY_FIXTURE_SLUG);
    assert.ok(result.story_bundle_context !== null);
    assert.equal(result.story_bundle_context.story_slug, STORY_FIXTURE_SLUG);
    assert.equal(result.story_bundle_context.storylet_pool_summary.total, 1);
    assert.equal(result.story_bundle_context.storylet_pool_summary.by_shape.choice, 1);
    assert.equal(
      result.story_bundle_context.storylet_pool_summary.by_content_intensity.quiet,
      1
    );
    assert.deepEqual(
      result.story_bundle_context.storylet_pool_summary.visible_records.map((record) => record.id),
      ["SLT-0021"]
    );
    assert.deepEqual(
      result.story_bundle_context.open_obligations.map((obligation) => obligation.id),
      ["OBL-0001"]
    );
    assert.deepEqual(
      result.story_bundle_context.active_threads.map((thread) => thread.id),
      ["THR-0001"]
    );
    assert.deepEqual(result.story_bundle_context.longest_active_branch_path, ["PG-0001"]);
    assert.deepEqual(
      result.story_bundle_context.recent_pages_along_longest_active_branch.map((page) => page.id),
      ["PG-0001"]
    );
    assert.deepEqual(
      result.story_bundle_context.mysteries_in_play.map((mystery) => mystery.m_id),
      ["M-0001"]
    );
    assert.deepEqual(
      result.story_bundle_context.cast_bind_list.map((entry) => entry.stent_id),
      ["STENT-0002"]
    );
    assert.deepEqual(result.story_bundle_context.invariants_acknowledged, [
      "INV-social-intimacy"
    ]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("world-canon context packets expose a null story_bundle_context", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "canon_addition",
        world_slug: STORY_FIXTURE_WORLD,
        seed_nodes: ["CF-0001"],
        token_budget: 18000
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.task_header.story_slug, null);
    assert.equal(result.story_bundle_context, null);
  } finally {
    destroyTempRepoRoot(root);
  }
});
