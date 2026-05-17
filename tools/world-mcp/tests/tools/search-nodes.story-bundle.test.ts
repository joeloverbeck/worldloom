import assert from "node:assert/strict";
import test from "node:test";

import { searchNodes } from "../../src/tools/search-nodes.js";

import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "./_shared.js";
import {
  STORY_FIXTURE_OTHER_SLUG,
  STORY_FIXTURE_SLUG,
  buildStoryBundleWorld
} from "./story-bundle-fixture.js";

test("searchNodes scopes lexical search to the requested story bundle", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const current = await withRepoRoot(root, () =>
      searchNodes({
        query: "loft",
        filters: { world_slug: "seeded", story_slug: STORY_FIXTURE_SLUG },
        exhaustive: true
      })
    );
    const other = await withRepoRoot(root, () =>
      searchNodes({
        query: "loft",
        filters: { world_slug: "seeded", story_slug: STORY_FIXTURE_OTHER_SLUG },
        exhaustive: true
      })
    );

    assert.ok("nodes" in current);
    assert.deepEqual(
      current.nodes.map((node) => [node.id, node.node_type, node.story_slug]),
      [
        ["opening-bells:BEL-1", "belief_record", STORY_FIXTURE_SLUG],
        ["opening-bells:DA-1", "story_diegetic_artifact_record", STORY_FIXTURE_SLUG],
        ["opening-bells:OBL-1", "obligation_record", STORY_FIXTURE_SLUG],
        ["opening-bells:PG-1", "page_record", STORY_FIXTURE_SLUG],
        ["opening-bells:SE-1", "story_event_record", STORY_FIXTURE_SLUG],
        ["opening-bells:SF-1", "story_fact_record", STORY_FIXTURE_SLUG],
        ["opening-bells:SLT-21", "storylet_record", STORY_FIXTURE_SLUG]
      ]
    );

    assert.ok("nodes" in other);
    assert.deepEqual(other.nodes, []);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("searchNodes without story_slug keeps default world-canon scope", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      searchNodes({ query: "loft", filters: { world_slug: "seeded" }, exhaustive: true })
    );

    assert.ok("nodes" in result);
    assert.deepEqual(result.nodes, []);
  } finally {
    destroyTempRepoRoot(root);
  }
});
