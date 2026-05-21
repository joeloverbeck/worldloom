import assert from "node:assert/strict";
import test from "node:test";

import { getContextPacket } from "../../src/tools/get-context-packet.js";
import { GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE } from "../../src/context-packet/shared.js";

import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "../tools/_shared.js";
import {
  buildStoryBundleWorld,
  STORY_FIXTURE_SLUG,
  STORY_FIXTURE_WORLD
} from "../tools/story-bundle-fixture.js";

test("story_character_profile requires story_slug and returns story-bundle context", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    await assert.rejects(
      () =>
        withRepoRoot(root, () =>
          getContextPacket({
            task_type: "story_character_profile",
            world_slug: STORY_FIXTURE_WORLD,
            seed_nodes: ["CHAR-1"]
          })
        ),
      /story_slug is required/
    );

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "story_character_profile",
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        seed_nodes: ["CHAR-1"],
        token_budget: 12000
      })
    );

    assert.ok(!("code" in packet));
    assert.equal(packet.task_header.task_type, "story_character_profile");
    assert.equal(packet.story_bundle_context?.story_slug, STORY_FIXTURE_SLUG);
    assert.equal(packet.story_bundle_context?.active_story_characters.length, 1);
    assert.deepEqual(
      packet.task_header.governing_full_body_priority,
      GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE.story_character_profile
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("story_character_profile delivers source CHAR full body when it fits", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "story_character_profile",
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        seed_nodes: ["CHAR-1"],
        token_budget: 12000
      })
    );

    assert.ok(!("code" in packet));
    const sourceCharacter = packet.local_authority.nodes.find((node) => node.id === "CHAR-1");
    assert.equal(sourceCharacter?.node_type, "character_record");
    assert.match(sourceCharacter?.full_body ?? "", /Marla Kern is a canonical source character/);
    assert.ok(packet.task_header.full_body_classes_delivered.includes("character_record"));
  } finally {
    destroyTempRepoRoot(root);
  }
});
