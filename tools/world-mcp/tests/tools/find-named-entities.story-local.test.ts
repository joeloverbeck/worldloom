import assert from "node:assert/strict";
import test from "node:test";

import { findNamedEntities } from "../../src/tools/find-named-entities.js";

import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "./_shared.js";
import { STORY_FIXTURE_SLUG, buildStoryBundleWorld } from "./story-bundle-fixture.js";

test("findNamedEntities returns story-local matches alongside canonical matches", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      findNamedEntities({
        world_slug: "seeded",
        names: ["Marla Kern"],
        story_slug: STORY_FIXTURE_SLUG
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.canonical_matches.length, 1);
    assert.equal(result.canonical_matches[0]?.entity_id, "entity:marla-kern");
    assert.deepEqual(result.canonical_matches[0]?.mentions_by_node_type, []);
    assert.deepEqual(
      result.story_local_matches?.map((match) => [
        match.node_id,
        match.node_type,
        match.story_slug,
        match.matched_text,
        match.match_kind
      ]),
      [
        ["SLT-21", "storylet_record", STORY_FIXTURE_SLUG, "Marla Kern", "canonical_entity"],
        ["STENT-2", "story_entity_record", STORY_FIXTURE_SLUG, "Marla Kern", "canonical_entity"]
      ]
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("findNamedEntities omits story-local matches when story_slug is absent", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      findNamedEntities({ world_slug: "seeded", names: ["Marla Kern"] })
    );

    assert.ok(!("code" in result));
    assert.equal(result.canonical_matches.length, 1);
    assert.equal(result.story_local_matches, undefined);
  } finally {
    destroyTempRepoRoot(root);
  }
});
