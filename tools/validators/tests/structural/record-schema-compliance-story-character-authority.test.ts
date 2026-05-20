import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const FILE_PATH = "stories/test-story/story-characters/STCHAR-1.md";
const HASH = "sha256:0000000000000000000000000000000000000000000000000000000000000001";

test("record_schema_compliance accepts complete STCHAR frontmatter", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    stcharRecord(validStchar())
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance requires STCHAR hashes", async () => {
  const parsed = validStchar();
  delete parsed.voice_block_hash;

  const result = await recordSchemaCompliance.run({}, context([
    stcharRecord(parsed)
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("'voice_block_hash'")
  ));
});

test("record_schema_compliance rejects malformed STCHAR ids", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    stcharRecord(validStchar({ id: "STCHAR-X" }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/id")
  ));
});

test("record_schema_compliance requires world-char STCHAR provenance", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    stcharRecord(validStchar({ source_char_id: null, source_char_hash: null }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.message.includes("/source_char_id") ||
    verdict.message.includes("/source_char_hash")
  ));
});

test("record_schema_compliance rejects story-local STCHAR with world CHAR provenance", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    stcharRecord(validStchar({ source_kind: "story_local", source_char_id: "CHAR-1", source_char_hash: HASH }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.type" &&
    (verdict.message.includes("/source_char_id") || verdict.message.includes("/source_char_hash"))
  ));
});

function stcharRecord(parsed: Record<string, unknown>) {
  return {
    ...record("story_character_authority_record", "test-story:STCHAR-1", FILE_PATH, parsed),
    story_slug: "test-story"
  };
}

function validStchar(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "STCHAR-1",
    story_id: "STORY-1",
    story_slug: "test-story",
    world_slug: "test-world",
    source_kind: "world_char",
    source_char_id: "CHAR-1",
    source_char_hash: HASH,
    source_char_sections_used: ["Voice", "Pressure Behavior"],
    story_local_inputs_used: [],
    generated_at_page: "story_bootstrap",
    created_by_skill: "story-character-profile",
    supersedes: null,
    superseded_by: null,
    status: "active",
    bound_stent_ids: ["STENT-1"],
    profile_revision: 1,
    body_schema_version: "stchar.v1",
    profile_hash: HASH,
    voice_block_hash: HASH,
    page_packet_hash: HASH,
    ...overrides
  };
}
