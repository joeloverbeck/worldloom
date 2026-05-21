import assert from "node:assert/strict";
import test from "node:test";

import { proseReceiptStcharIntegrity } from "../../src/structural/prose-receipt-stchar-integrity.js";
import { context, record } from "./helpers.js";

const HASH_A = "sha256:" + "a".repeat(64);
const HASH_B = "sha256:" + "b".repeat(64);
const HASH_C = "sha256:" + "c".repeat(64);
const HASH_D = "sha256:" + "d".repeat(64);
const STORY = "test-story";
const PLAN_PATH = `stories/${STORY}/pages-prose-plans/PG-1.md`;
const RECEIPT_PATH = `stories/${STORY}/pages-prose-receipts/PG-1.yaml`;

test("prose_receipt_stchar_integrity accepts matching authority and judgment-assisted fidelity entries", async () => {
  const verdicts = await proseReceiptStcharIntegrity.run(
    input(plan(), receipt({ fidelity: { voice_fidelity: "minor_drift" } })),
    context(baseRecords())
  );

  assert.deepEqual(verdicts, []);
});

test("prose_receipt_stchar_integrity accepts offstage_causal authority with not_applicable voice fidelity", async () => {
  const verdicts = await proseReceiptStcharIntegrity.run(
    input(
      plan({ requiredBecause: "offstage_causal", voiceLine: "" }),
      receipt({
        authority: { required_because: "offstage_causal" },
        fidelity: { voice_fidelity: "not_applicable" }
      })
    ),
    context(baseRecords())
  );

  assert.deepEqual(verdicts, []);
});

test("prose_receipt_stchar_integrity rejects missing stchar_authority entries", async () => {
  const verdicts = await proseReceiptStcharIntegrity.run(
    input(plan(), receipt({ stcharAuthority: [] })),
    context(baseRecords())
  );

  assert.equal(verdicts[0]?.code, "prose_receipt_stchar_integrity.missing_stchar_authority_entry");
});

test("prose_receipt_stchar_integrity rejects hash mismatches against page-plan packets and STCHAR records", async () => {
  const verdicts = await proseReceiptStcharIntegrity.run(
    input(plan(), receipt({ authority: { profile_hash: hashComparison(HASH_A, HASH_D) } })),
    context(baseRecords())
  );

  assert.equal(verdicts[0]?.code, "prose_receipt_stchar_integrity.hash_mismatch");
  assert.equal((verdicts[0]?.detail as { field?: string }).field, "profile_hash");
});

test("prose_receipt_stchar_integrity rejects active snapshot mismatches", async () => {
  const verdicts = await proseReceiptStcharIntegrity.run(
    input(plan(), receipt({ authority: { active_in_snapshot: false } })),
    context(baseRecords())
  );

  assert.equal(verdicts[0]?.code, "prose_receipt_stchar_integrity.snapshot_mismatch");
});

test("prose_receipt_stchar_integrity rejects missing profile_fidelity entries", async () => {
  const verdicts = await proseReceiptStcharIntegrity.run(
    input(plan(), receipt({ profileFidelity: [] })),
    context(baseRecords())
  );

  assert.equal(verdicts[0]?.code, "prose_receipt_stchar_integrity.missing_profile_fidelity_entry");
});

function input(planContent: string, receiptContent: string) {
  return {
    files: [
      { path: PLAN_PATH, content: planContent },
      { path: RECEIPT_PATH, content: receiptContent }
    ]
  };
}

function baseRecords() {
  return [
    storyRecord("story_entity_record", "STENT-1", "entities", {
      id: "STENT-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      display_name: "Test Character",
      bound_stchar_id: "STCHAR-1",
      role_in_story: ["speaker"]
    }),
    storyRecord("story_character_authority_record", "STCHAR-1", "story-characters", {
      id: "STCHAR-1",
      story_id: "STORY-1",
      status: "active",
      bound_stent_ids: ["STENT-1"],
      profile_hash: HASH_A,
      voice_block_hash: HASH_B,
      page_packet_hash: HASH_C
    }),
    storyRecord("page_record", "PG-1", "pages", {
      id: "PG-1",
      story_id: "STORY-1",
      state_snapshot: { active_records: { STENT: ["STENT-1"], STCHAR: ["STCHAR-1"] } }
    })
  ];
}

function storyRecord(nodeType: string, id: string, sourceDir: string, parsed: Record<string, unknown>) {
  const filePath = sourceDir === "story-characters"
    ? `stories/${STORY}/story-characters/${id}.md`
    : `stories/${STORY}/_source/${sourceDir}/${id}.yaml`;
  return {
    ...record(nodeType, `${STORY}:${id}`, filePath, parsed),
    story_slug: STORY
  };
}

function plan(options: { requiredBecause?: string; voiceLine?: string } = {}): string {
  return [
    "# Page Plan",
    "",
    "## 16a. STCHAR-derived character authority packets",
    "",
    "- STENT-1 / STCHAR-1 - Test Character.",
    `  - Required because: ${options.requiredBecause ?? "speaker"}.`,
    `  - Hashes: profile_hash=${HASH_A}; voice_block_hash=${HASH_B}; page_packet_hash=${HASH_C}.`,
    options.voiceLine ?? "  - Voice/dialogue authority: clipped STCHAR voice block.",
    "  - Relevant appraisal rules: protect the secret.",
    "",
    "## 17. Style/register notes",
    ""
  ].join("\n");
}

function receipt(options: {
  stcharAuthority?: Array<Record<string, unknown>>;
  profileFidelity?: Array<Record<string, unknown>>;
  authority?: Record<string, unknown>;
  fidelity?: Record<string, unknown>;
} = {}): string {
  return JSON.stringify({
    page_id: "PG-1",
    story_id: "STORY-1",
    plan_path: "pages-prose-plans/PG-1.md",
    prose_path: "pages-prose/PG-1.md",
    plan_hash: "1".repeat(64),
    prose_hash: "2".repeat(64),
    state_hash_at_plan_time: "3".repeat(64),
    checked_at: "2026-05-21T00:00:00Z",
    strict: true,
    verdict: "PASS",
    checks: {
      hash_integrity: "PASS",
      engine_jargon_leak: "PASS",
      forbidden_mystery_resolution: "PASS",
      required_event_rendered: "PASS",
      choice_consequence_visibility: "PASS",
      entity_status_consistency: "PASS",
      invented_structural_fact: "PASS",
      canon_claim_without_authority: "PASS",
      char_authority_leak: "PASS",
      craft_critic: "NOT_RUN"
    },
    stchar_authority: options.stcharAuthority ?? [{ ...validStcharAuthority(), ...options.authority }],
    profile_fidelity: options.profileFidelity ?? [{ ...validProfileFidelity(), ...options.fidelity }],
    notes: [],
    repair_recommendation: "none"
  });
}

function validStcharAuthority() {
  return {
    stchar_id: "STCHAR-1",
    stent_id: "STENT-1",
    display_name: "Test Character",
    required_because: "speaker",
    packet_present: true,
    active_in_snapshot: true,
    profile_hash: hashComparison(HASH_A, HASH_A),
    voice_block_hash: hashComparison(HASH_B, HASH_B),
    page_packet_hash: hashComparison(HASH_C, HASH_C),
    deterministic_verdict: "PASS"
  };
}

function validProfileFidelity() {
  return {
    stchar_id: "STCHAR-1",
    voice_fidelity: "pass",
    appraisal_fidelity: "pass",
    pressure_behavior_fidelity: "pass",
    relationship_conduct_fidelity: "pass",
    evidence: ["Rendered line follows the page-plan packet."],
    repair_recommendation: "none"
  };
}

function hashComparison(expected: string, observed: string | null) {
  return {
    expected,
    observed,
    verdict: expected === observed ? "PASS" : "FAIL"
  };
}
