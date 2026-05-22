import assert from "node:assert/strict";
import test from "node:test";

import { stcharBoundStentReciprocity } from "../../src/structural/stchar-bound-stent-reciprocity.js";
import { context, record } from "./helpers.js";

test("stchar_bound_stent_reciprocity accepts matched reciprocal bindings", async () => {
  const verdicts = await stcharBoundStentReciprocity.run(undefined, context([
    storyRecord("story_entity_record", "STENT-1", "entities", stent("STENT-1")),
    stchar("STCHAR-1", { bound_stent_ids: ["STENT-1"] })
  ]));

  assert.deepEqual(verdicts, []);
});

test("stchar_bound_stent_reciprocity accepts background STENTs without STCHAR bindings", async () => {
  const verdicts = await stcharBoundStentReciprocity.run(undefined, context([
    storyRecord("story_entity_record", "STENT-1", "entities", stent("STENT-1", {
      role_in_story: ["background"],
      bound_stchar_id: null
    }))
  ]));

  assert.deepEqual(verdicts, []);
});

test("stchar_bound_stent_reciprocity rejects STENT to STCHAR bindings with no STCHAR back-reference", async () => {
  const verdicts = await stcharBoundStentReciprocity.run(undefined, context([
    storyRecord("story_entity_record", "STENT-1", "entities", stent("STENT-1")),
    stchar("STCHAR-1", { bound_stent_ids: [] })
  ]));

  assert.equal(verdicts[0]?.code, "stchar_bound_stent_reciprocity.missing_stchar_back_reference");
  assert.equal((verdicts[0]?.detail as { stent_id?: string }).stent_id, "STENT-1");
});

test("stchar_bound_stent_reciprocity rejects STCHAR to STENT bindings with no STENT back-reference", async () => {
  const verdicts = await stcharBoundStentReciprocity.run(undefined, context([
    storyRecord("story_entity_record", "STENT-1", "entities", stent("STENT-1", { bound_stchar_id: "STCHAR-2" })),
    stchar("STCHAR-1", { bound_stent_ids: ["STENT-1"] }),
    stchar("STCHAR-2", { bound_stent_ids: ["STENT-1"] })
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "stchar_bound_stent_reciprocity.missing_stent_back_reference");
  assert.equal((verdicts[0]?.detail as { actual_bound_stchar_id?: string }).actual_bound_stchar_id, "STCHAR-2");
});

function storyRecord(nodeType: string, id: string, sourceDir: string, parsed: Record<string, unknown>) {
  return {
    ...record(nodeType, `test-story:${id}`, `stories/test-story/_source/${sourceDir}/${id}.yaml`, parsed),
    story_slug: "test-story"
  };
}

function stent(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-1",
    supersedes: null,
    display_name: "Test Character",
    bound_stchar_id: "STCHAR-1",
    role_in_story: ["witness"],
    ...overrides
  };
}

function stchar(id: string, overrides: Record<string, unknown> = {}) {
  return {
    ...record("story_character_authority_record", `test-story:${id}`, `stories/test-story/story-characters/${id}.md`, {
      id,
      story_id: "STORY-1",
      story_slug: "test-story",
      world_slug: "test",
      source_kind: "world_char",
      source_char_id: "CHAR-1",
      source_char_hash: "sha256:" + "a".repeat(64),
      source_char_sections_used: ["Overview"],
      generated_at_page: "story_bootstrap",
      created_by_skill: "branching-story-bootstrap",
      supersedes: null,
      status: "active",
      bound_stent_ids: ["STENT-1"],
      profile_revision: 1,
      body_schema_version: "stchar.v1",
      profile_hash: "sha256:" + "b".repeat(64),
      voice_block_hash: "sha256:" + "c".repeat(64),
      ...overrides
    }),
    story_slug: "test-story"
  };
}
