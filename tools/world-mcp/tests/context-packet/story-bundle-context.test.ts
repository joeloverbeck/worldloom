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
      ["OBL-1", "OBL-2", "OBL-3", "OBL-4", "OBL-5"]
    );
    assert.deepEqual(
      result.story_bundle_context.open_obligations.map((obligation) => Object.keys(obligation)),
      Array.from({ length: 5 }, () => [
        "id",
        "obligation_kind",
        "description",
        "owed_by",
        "owed_to",
        "urgency",
        "trigger_to_close",
        "status"
      ])
    );
    assert.deepEqual(
      result.story_bundle_context.open_obligations.map((obligation) => [
        obligation.id,
        obligation.obligation_kind,
        obligation.description,
        obligation.owed_by,
        obligation.owed_to,
        obligation.urgency,
        obligation.trigger_to_close,
        obligation.status
      ]),
      [
        [
          "OBL-1",
          "promise",
          "Pay off the loft setup.",
          "STENT-2",
          "public",
          "high",
          "Marla reveals why the loft bell rang.",
          "open"
        ],
        [
          "OBL-2",
          "debt",
          "Marla owes the stairwell watcher a true answer.",
          "STENT-2",
          "group:watch",
          "medium",
          "Marla gives the watcher a true answer.",
          "open"
        ],
        [
          "OBL-3",
          "moral",
          "Marla must decide whether to warn the public.",
          "STENT-2",
          "public",
          "low",
          "The public warning is either made or deliberately withheld.",
          "open"
        ],
        [
          "OBL-4",
          "protection",
          "Marla must keep the loft child unseen.",
          "STENT-2",
          "STENT-2",
          "high",
          "The child is moved beyond the watch patrol.",
          "open"
        ],
        [
          "OBL-5",
          "promise",
          "Marla promised to leave a signal if the roof path is clear.",
          "STENT-2",
          "public",
          "medium",
          "A roof-path signal is left or the promise is superseded.",
          "open"
        ]
      ]
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
