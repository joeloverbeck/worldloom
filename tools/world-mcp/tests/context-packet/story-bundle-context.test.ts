import assert from "node:assert/strict";
import test from "node:test";

import { assembleContextPacket } from "../../src/context-packet/assemble.js";

import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "../tools/_shared.js";
import {
  buildStoryBundleWorld,
  STORY_FIXTURE_SLUG,
  STORY_FIXTURE_WORLD
} from "../tools/story-bundle-fixture.js";

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
    assert.equal(result.story_bundle_context.storylet_pool_summary.by_move_family.decision, 1);
    assert.equal(result.story_bundle_context.storylet_pool_summary.by_urgency.high, 1);
    assert.deepEqual(
      result.story_bundle_context.storylet_pool_summary.visible_records.map((record) => record.id),
      ["SLT-21"]
    );
    assert.deepEqual(
      result.story_bundle_context.storylet_pool_summary.visible_records.map((record) => [
        record.move_family,
        record.urgency
      ]),
      [["decision", "high"]]
    );
    assert.deepEqual(
      result.story_bundle_context.open_obligations.map((obligation) => obligation.id),
      ["OBL-1"]
    );
    assert.deepEqual(
      result.story_bundle_context.active_threads.map((thread) => thread.id),
      ["THR-1"]
    );
    assert.deepEqual(
      result.story_bundle_context.active_clocks.map((clock) => [clock.id, clock.value, clock.max]),
      [["CLK-1", 2, 6]]
    );
    assert.deepEqual(
      result.story_bundle_context.hidden_secrets.map((secret) => [
        secret.id,
        secret.clue_carrier_count,
        secret.discovered_clue_count
      ]),
      [["STSEC-1", 1, 1]]
    );
    assert.deepEqual(
      result.story_bundle_context.open_story_questions.map((question) => [
        question.id,
        question.question_or_setup
      ]),
      [["STQ-1", "Who rang the loft bell?"]]
    );
    assert.deepEqual(result.story_bundle_context.longest_active_branch_path, ["PG-1"]);
    assert.deepEqual(
      result.story_bundle_context.recent_pages_along_longest_active_branch.map((page) => page.id),
      ["PG-1"]
    );
    assert.deepEqual(
      result.story_bundle_context.mysteries_in_play.map((mystery) => mystery.m_id),
      ["M-1"]
    );
    assert.deepEqual(result.story_bundle_context.mystery_evidence_chains, [
      {
        mystery_id: "M-1",
        claims: [
          {
            page_id: "PG-1",
            authority: "apparent",
            status: "clue_added",
            evidence_records: ["SF-1", "SE-1"]
          }
        ]
      }
    ]);
    assert.deepEqual(
      result.story_bundle_context.cast_bind_list.map((entry) => entry.stent_id),
      ["STENT-2"]
    );
    assert.deepEqual(result.story_bundle_context.cast_bind_list[0]?.role_in_story, [
      "viewpoint",
      "primary_actor"
    ]);
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
        seed_nodes: ["CF-1"],
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

test("story_bootstrap uses story_slug as a target slug without story-bundle context", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "story_bootstrap",
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: "new-target-story",
        seed_nodes: ["entity:marla-kern"],
        token_budget: 18000
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.task_header.story_slug, "new-target-story");
    assert.equal(result.story_bundle_context, null);
  } finally {
    destroyTempRepoRoot(root);
  }
});
