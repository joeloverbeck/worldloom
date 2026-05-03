import assert from "node:assert/strict";
import test from "node:test";

import { findImpactedFragments } from "../../src/tools/find-impacted-fragments";

import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "./_shared";
import { STORY_FIXTURE_SLUG, buildStoryBundleWorld } from "./story-bundle-fixture";

test("findImpactedFragments resolves story-bundle authored ids with story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      findImpactedFragments({
        world_slug: "seeded",
        story_slug: STORY_FIXTURE_SLUG,
        node_ids: ["SF-0001"]
      })
    );

    assert.ok(!("code" in result));
    assert.deepEqual(result.impacted, []);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("findImpactedFragments rejects story-bundle authored ids without story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      findImpactedFragments({ world_slug: "seeded", node_ids: ["SF-0001"] })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.equal(result.details?.field, "story_slug");
  } finally {
    destroyTempRepoRoot(root);
  }
});
