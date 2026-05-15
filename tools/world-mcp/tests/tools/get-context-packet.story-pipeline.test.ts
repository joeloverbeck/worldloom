import assert from "node:assert/strict";
import test from "node:test";

import { getContextPacket } from "../../src/tools/get-context-packet";

import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "./_shared";
import {
  buildStoryBundleWorld,
  storyNodeId,
  STORY_FIXTURE_SLUG,
  STORY_FIXTURE_WORLD
} from "./story-bundle-fixture";

test("getContextPacket requires story_slug for story-pipeline task types", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    for (const taskType of ["story_bootstrap", "commitment_block_authoring"] as const) {
      await assert.rejects(
        () =>
          withRepoRoot(root, () =>
            getContextPacket({
              task_type: taskType,
              world_slug: STORY_FIXTURE_WORLD,
              seed_nodes: ["entity:marla-kern"]
            })
          ),
        /story_slug is required/
      );
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getContextPacket returns story_bundle_context for each story-pipeline task type", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    for (const taskType of [
      "story_turn_cycle",
      "commitment_block_authoring",
      "branching_story_health_audit",
      "story_fact_promotion_to_canon"
    ] as const) {
      const result = await withRepoRoot(root, () =>
        getContextPacket({
          task_type: taskType,
          world_slug: STORY_FIXTURE_WORLD,
          story_slug: STORY_FIXTURE_SLUG,
          seed_nodes: ["entity:marla-kern"],
          token_budget: 18000
        })
      );

      assert.ok(!("code" in result), `${taskType} should return a packet`);
      assert.equal(result.story_bundle_context?.story_slug, STORY_FIXTURE_SLUG);
      assert.equal(result.story_bundle_context?.storylet_pool_summary.total, 1);
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getContextPacket treats story_bootstrap story_slug as a target slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "story_bootstrap",
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: "new-target-story",
        seed_nodes: ["entity:marla-kern"],
        token_budget: 18000
      })
    );

    assert.ok(!("code" in result), "story_bootstrap should return a packet");
    assert.equal(result.task_header.story_slug, "new-target-story");
    assert.equal(result.story_bundle_context, null);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getContextPacket warns when story-pipeline seed_nodes contain story-local ids", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "story_turn_cycle",
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        seed_nodes: [storyNodeId(STORY_FIXTURE_SLUG, "SF-0001")],
        token_budget: 18000
      })
    );

    assert.ok(!("code" in result), "story_turn_cycle should return a packet");
    assert.deepEqual(result.task_header.warnings, ["story_local_seed_nodes_ignored"]);
  } finally {
    destroyTempRepoRoot(root);
  }
});
