import assert from "node:assert/strict";
import test from "node:test";

import { stcharSourceHashMatchesSource } from "../../src/structural/stchar-source-hash-matches-source.js";
import { context, record } from "./helpers.js";

const STORY = "test-story";
const SOURCE_HASH = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const HASH = `sha256:${SOURCE_HASH}`;
const STCHAR_PATH = `stories/${STORY}/story-characters/STCHAR-1.md`;

test("stchar_source_hash_matches_source accepts a created world_char STCHAR with matching source hash", async () => {
  const verdicts = await run([sourceChar(), stchar()]);

  assert.deepEqual(verdicts, []);
});

test("stchar_source_hash_matches_source rejects a created world_char STCHAR with mismatched source hash", async () => {
  const verdicts = await run([sourceChar(), stchar({ source_char_hash: `sha256:${"a".repeat(64)}` })]);

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "stchar_source_hash_matches_source.source_char_hash_mismatch");
  assert.deepEqual(verdicts[0]?.detail, {
    source_char_id: "CHAR-1",
    expected: HASH,
    observed: `sha256:${"a".repeat(64)}`
  });
});

test("stchar_source_hash_matches_source skips story_local STCHARs", async () => {
  const verdicts = await run([
    stchar({ source_kind: "story_local", source_char_id: null, source_char_hash: null })
  ]);

  assert.deepEqual(verdicts, []);
});

test("stchar_source_hash_matches_source rejects an unresolved source CHAR", async () => {
  const verdicts = await run([stchar({ source_char_id: "CHAR-404" })]);

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "stchar_source_hash_matches_source.source_char_unresolved");
});

test("stchar_source_hash_matches_source is pre-apply only", async () => {
  assert.equal(stcharSourceHashMatchesSource.applies_to(context([sourceChar(), stchar()])), false);
  assert.deepEqual(await stcharSourceHashMatchesSource.run(undefined, context([sourceChar(), stchar()])), []);
});

async function run(records: ReturnType<typeof record>[]) {
  return stcharSourceHashMatchesSource.run(undefined, context(records, {
    run_mode: "pre-apply",
    patch_plan: {
      plan_id: "plan-stchar-source-hash",
      target_world: "test",
      approval_token: "token",
      verdict: "ACCEPT",
      originating_skill: "test",
      expected_id_allocations: { stchar_ids: ["STCHAR-1"] },
      patches: [{
        op: "append_story_character_authority_record",
        target_world: "test",
        payload: { story_slug: STORY, record: stcharFrontmatter(), body_markdown: "## Profile\n\nBody." }
      }]
    }
  }));
}

function sourceChar() {
  return {
    ...record("character_record", "CHAR-1", "characters/source-char.md", {
      character_id: "CHAR-1",
      name: "Source Character"
    }),
    content_hash: SOURCE_HASH
  };
}

function stchar(overrides: Record<string, unknown> = {}) {
  return {
    ...record("story_character_authority_record", `${STORY}:STCHAR-1`, STCHAR_PATH, stcharFrontmatter(overrides)),
    story_slug: STORY
  };
}

function stcharFrontmatter(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "STCHAR-1",
    story_id: "STORY-1",
    story_slug: STORY,
    world_slug: "test",
    source_kind: "world_char",
    source_char_id: "CHAR-1",
    source_char_hash: HASH,
    source_char_sections_used: ["Overview"],
    story_local_inputs_used: [],
    generated_at_page: "story_bootstrap",
    created_by_skill: "story-character-profile",
    supersedes: null,
    superseded_by: null,
    status: "active",
    bound_stent_ids: ["STENT-1"],
    profile_revision: 1,
    body_schema_version: "stchar.v1",
    profile_hash: `sha256:${"b".repeat(64)}`,
    voice_block_hash: `sha256:${"c".repeat(64)}`,
    page_packet_hash: `sha256:${"d".repeat(64)}`,
    ...overrides
  };
}
