import assert from "node:assert/strict";
import test from "node:test";

import { forbiddenStcharTamperHashFields } from "../../src/structural/forbidden-stchar-tamper-hash-fields.js";
import { context } from "./helpers.js";

const STORY = "red-bunny";
const STCHAR_PATH = `stories/${STORY}/story-characters/STCHAR-1.md`;
const RECEIPT_PATH = `stories/${STORY}/pages-prose-receipts/PG-1.yaml`;
const PLAN_PATH = `stories/${STORY}/pages-prose-plans/PG-1.md`;

test("forbidden_stchar_tamper_hash_fields accepts clean STCHAR, receipt, and page-plan surfaces", async () => {
  const verdicts = await forbiddenStcharTamperHashFields.run({
    files: [
      { path: STCHAR_PATH, content: stcharFrontmatter({}) },
      { path: RECEIPT_PATH, content: receipt({}) },
      { path: PLAN_PATH, content: pagePlan({}) }
    ]
  }, context([]));

  assert.deepEqual(verdicts, []);
});

test("forbidden_stchar_tamper_hash_fields rejects STCHAR frontmatter hash fields", async () => {
  const verdicts = await forbiddenStcharTamperHashFields.run({
    files: [{ path: STCHAR_PATH, content: stcharFrontmatter({ profile_hash: hash() }) }]
  }, context([]));

  assert.equal(verdicts[0]?.code, "forbidden_stchar_tamper_hash_fields.forbidden_field");
  assert.equal((verdicts[0]?.detail as { field?: string }).field, "profile_hash");
  assert.equal((verdicts[0]?.detail as { surface?: string }).surface, "STCHAR frontmatter");
});

test("forbidden_stchar_tamper_hash_fields rejects nested prose-receipt hash fields", async () => {
  const verdicts = await forbiddenStcharTamperHashFields.run({
    files: [{ path: RECEIPT_PATH, content: receipt({ source_char_hash: hash() }) }]
  }, context([]));

  assert.equal(verdicts[0]?.code, "forbidden_stchar_tamper_hash_fields.forbidden_field");
  assert.equal((verdicts[0]?.detail as { field?: string }).field, "source_char_hash");
  assert.equal((verdicts[0]?.detail as { path?: string }).path, "stchar_authority.0.source_char_hash");
});

test("forbidden_stchar_tamper_hash_fields rejects page-plan 16a packet hash fields", async () => {
  const verdicts = await forbiddenStcharTamperHashFields.run({
    files: [{ path: PLAN_PATH, content: pagePlan({ page_packet_hash: hash() }) }]
  }, context([]));

  assert.equal(verdicts[0]?.code, "forbidden_stchar_tamper_hash_fields.forbidden_field");
  assert.equal((verdicts[0]?.detail as { field?: string }).field, "page_packet_hash");
  assert.equal((verdicts[0]?.detail as { surface?: string }).surface, "page-plan 16a packet");
});

test("forbidden_stchar_tamper_hash_fields reports each forbidden field on each surface", async () => {
  for (const field of ["profile_hash", "voice_block_hash", "page_packet_hash", "source_char_hash"] as const) {
    const verdicts = await forbiddenStcharTamperHashFields.run({
      files: [
        { path: STCHAR_PATH, content: stcharFrontmatter({ [field]: hash() }) },
        { path: RECEIPT_PATH, content: receipt({ [field]: hash() }) },
        { path: PLAN_PATH, content: pagePlan({ [field]: hash() }) }
      ]
    }, context([]));

    assert.equal(verdicts.length, 3, field);
    assert.ok(verdicts.every((verdict) => (verdict.detail as { field?: string }).field === field), field);
  }
});

function stcharFrontmatter(extra: Record<string, unknown>): string {
  return [
    "---",
    "id: STCHAR-1",
    "story_id: STORY-1",
    "source_kind: world_char",
    "source_char_id: CHAR-1",
    ...Object.entries(extra).map(([key, value]) => `${key}: ${JSON.stringify(value)}`),
    "---",
    "",
    "## Story-Facing Identity",
    "",
    "Clean body."
  ].join("\n");
}

function receipt(extraAuthority: Record<string, unknown>): string {
  return [
    "page_id: PG-1",
    "stchar_authority:",
    "  - stchar_id: STCHAR-1",
    "    stent_id: STENT-1",
    "    display_name: Test Character",
    "    required_because: speaker",
    "    packet_present: true",
    "    active_in_snapshot: true",
    "    deterministic_verdict: PASS",
    ...Object.entries(extraAuthority).map(([key, value]) => `    ${key}: ${JSON.stringify(value)}`)
  ].join("\n");
}

function pagePlan(extraPacket: Record<string, unknown>): string {
  return [
    "# Page Plan",
    "",
    "## 16a. STCHAR-derived character authority packets",
    "",
    "- STENT-1 / STCHAR-1 - Test Character.",
    "  - Required because: speaker.",
    "  - Voice/dialogue authority: clipped STCHAR voice block.",
    ...Object.entries(extraPacket).map(([key, value]) => `  - ${key}: ${value}`),
    "",
    "## 17. Style/register notes"
  ].join("\n");
}

function hash(): string {
  return `sha256:${"a".repeat(64)}`;
}
