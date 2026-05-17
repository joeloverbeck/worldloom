import assert from "node:assert/strict";
import test from "node:test";

import { getNeighbors } from "../../src/tools/get-neighbors";

import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "./_shared";
import { STORY_FIXTURE_SLUG, buildStoryBundleWorld } from "./story-bundle-fixture";

test("getNeighbors resolves authored story-bundle ids through story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      getNeighbors({
        node_id: "PG-1",
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG,
        depth: 1
      })
    );

    assert.ok("seed" in result);
    assert.equal(result.seed.node_id, "PG-1");
    assert.equal(result.seed.story_slug, STORY_FIXTURE_SLUG);
    assert.deepEqual(
      result.hop1.map((node) => [node.node_id, node.node_type, node.story_slug, node.edge_types]),
      [
        ["CHC-1", "choice_record", STORY_FIXTURE_SLUG, ["parent_page"]],
        ["SLT-21", "storylet_record", STORY_FIXTURE_SLUG, ["created_at_page"]]
      ]
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getNeighbors resolves BEL authored ids through story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      getNeighbors({
        node_id: "BEL-1",
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG,
        depth: 1
      })
    );

    assert.ok("seed" in result);
    assert.equal(result.seed.node_id, "BEL-1");
    assert.equal(result.seed.node_type, "belief_record");
    assert.equal(result.seed.story_slug, STORY_FIXTURE_SLUG);
    assert.deepEqual(
      result.hop1.map((node) => [node.node_id, node.node_type, node.story_slug, node.edge_types]),
      [["SE-1", "story_event_record", STORY_FIXTURE_SLUG, ["created_at_page"]]]
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getNeighbors rejects authored story-bundle ids without story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      getNeighbors({ node_id: "PG-1", world_slug: "seeded", depth: 1 })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.equal(result.details?.field, "story_slug");
  } finally {
    destroyTempRepoRoot(root);
  }
});
