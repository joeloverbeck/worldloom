import assert from "node:assert/strict";
import test from "node:test";

import {
  computeStcharProfileHash,
  computeStcharVoiceBlockHash
} from "@worldloom/world-index/hash/content";

import { REQUIRED_STCHAR_SECTIONS, stcharBodyIntegrity } from "../../src/structural/stchar-body-integrity.js";
import { context, record } from "./helpers.js";

const STORY = "test-story";
const HASH = `sha256:${"a".repeat(64)}`;
const FILE_PATH = `stories/${STORY}/story-characters/STCHAR-1.md`;

test("stchar_body_integrity accepts complete exactly-once STCHAR body sections", async () => {
  const verdicts = await run(body());

  assert.deepEqual(verdicts, []);
});

test("stchar_body_integrity rejects missing required STCHAR body sections", async () => {
  const verdicts = await run(body({ omit: "Relationship-Specific Behavior" }));

  assert.ok(verdicts.some((verdict) => verdict.code === "stchar_body_integrity.missing_section"));
  assert.ok(verdicts.some((verdict) => verdict.message.includes("Relationship-Specific Behavior")));
});

test("stchar_body_integrity rejects duplicated required STCHAR body sections", async () => {
  const verdicts = await run(body({ duplicate: "Pressure Behavior" }));

  assert.ok(verdicts.some((verdict) => verdict.code === "stchar_body_integrity.duplicate_section"));
});

test("stchar_body_integrity rejects empty required STCHAR sections", async () => {
  const verdicts = await run(body({ empty: "Voice Bible / Dialogue Authority" }));

  assert.ok(verdicts.some((verdict) => verdict.code === "stchar_body_integrity.empty_section"));
  assert.ok(verdicts.some((verdict) => verdict.message.includes("Voice Bible / Dialogue Authority")));
});

test("stchar_body_integrity rejects empty Page-Plan Voice Block", async () => {
  const verdicts = await run(body({ empty: "Page-Plan Voice Block" }));

  assert.ok(verdicts.some((verdict) => verdict.code === "stchar_body_integrity.empty_section"));
  assert.ok(verdicts.some((verdict) => verdict.message.includes("Page-Plan Voice Block")));
});

test("stchar_body_integrity rejects malformed STCHAR hash frontmatter", async () => {
  const verdicts = await run(body(), { profile_hash: "sha256:ABC" });

  assert.ok(verdicts.some((verdict) => verdict.code === "stchar_body_integrity.hash_shape"));
});

test("stchar_body_integrity rejects profile_hash that does not match the body recompute", async () => {
  const verdicts = await run(body(), { profile_hash: HASH });
  const mismatch = verdicts.find((verdict) =>
    verdict.code === "stchar_body_integrity.hash_mismatch" &&
    (verdict.detail as { field?: string }).field === "profile_hash"
  );

  assert.ok(mismatch);
  assert.match((mismatch.detail as { expected?: string }).expected ?? "", /^sha256:[0-9a-f]{64}$/);
});

test("stchar_body_integrity rejects voice_block_hash that does not match the body recompute", async () => {
  const verdicts = await run(body(), { voice_block_hash: HASH });
  const mismatch = verdicts.find((verdict) =>
    verdict.code === "stchar_body_integrity.hash_mismatch" &&
    (verdict.detail as { field?: string }).field === "voice_block_hash"
  );

  assert.ok(mismatch);
  assert.match((mismatch.detail as { expected?: string }).expected ?? "", /^sha256:[0-9a-f]{64}$/);
});

test("stchar_body_integrity runs for append_story_character_authority_record pre-apply plans", async () => {
  assert.equal(stcharBodyIntegrity.applies_to(context([], {
    run_mode: "pre-apply",
    patch_plan: {
      plan_id: "plan-stchar-body-integrity",
      target_world: "test",
      approval_token: "token",
      verdict: "ACCEPT",
      originating_skill: "test",
      expected_id_allocations: { stchar_ids: ["STCHAR-1"] },
      patches: [{
        op: "append_story_character_authority_record",
        target_world: "test",
        payload: { story_slug: STORY, record: stcharFrontmatter(), body_markdown: body() }
      }]
    }
  })), true);
});

async function run(markdownBody: string, overrides: Record<string, unknown> = {}) {
  const stchar = stcharRecord(markdownBody, overrides);
  return stcharBodyIntegrity.run({
    files: [{ path: FILE_PATH, content: hybrid(stchar.parsed as Record<string, unknown>, markdownBody) }]
  }, context([stchar]));
}

function stcharRecord(markdownBody: string, overrides: Record<string, unknown> = {}) {
  return {
    ...record("story_character_authority_record", `${STORY}:STCHAR-1`, FILE_PATH, stcharFrontmatter(overrides, markdownBody)),
    story_slug: STORY
  };
}

function stcharFrontmatter(overrides: Record<string, unknown> = {}, markdownBody = body()): Record<string, unknown> {
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
    profile_hash: `sha256:${computeStcharProfileHash(markdownBody)}`,
    voice_block_hash: `sha256:${computeStcharVoiceBlockHash(markdownBody)}`,
    page_packet_hash: HASH,
    ...overrides
  };
}

function hybrid(frontmatter: Record<string, unknown>, markdownBody: string): string {
  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${formatYamlValue(value)}`)
    .join("\n");
  return `---\n${yaml}\n---\n\n${markdownBody}`;
}

function formatYamlValue(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
  return JSON.stringify(value);
}

function body(options: { omit?: string; duplicate?: string; empty?: string } = {}): string {
  const sections = REQUIRED_STCHAR_SECTIONS
    .filter((section) => section !== options.omit)
    .flatMap((section) => section === options.duplicate ? [section, section] : [section]);
  return sections
    .map((section) => `## ${section}\n\n${section === options.empty ? "" : `${section} authority prose.`}`)
    .join("\n\n");
}
