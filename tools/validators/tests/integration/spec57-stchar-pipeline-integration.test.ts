import assert from "node:assert/strict";
import test from "node:test";

import yaml from "js-yaml";

import type { Context, IndexedEdge, IndexedRecord, Validator, WorldIndexReadSurface } from "../../src/framework/types.js";
import { runValidators } from "../../src/framework/run.js";
import { storyletPredicateDslParsability } from "../../src/rules/rule_storylet_predicate_dsl_parsability.js";
import { noCharAuthorityInStoryRuntime } from "../../src/structural/no-char-authority-in-story-runtime.js";
import { proseReceiptSchemaCompliance } from "../../src/structural/prose-receipt-schema-compliance.js";

const STORY_SLUG = "red-bunny";
const RECEIPT_PATH = `stories/${STORY_SLUG}/pages-prose-receipts/PG-1.yaml`;
const PAGE_PLAN_PATH = `stories/${STORY_SLUG}/pages-prose-plans/PG-1.md`;
const SPEC57_VALIDATORS = [
  proseReceiptSchemaCompliance,
  noCharAuthorityInStoryRuntime,
  storyletPredicateDslParsability
] as const satisfies readonly Validator[];

test("SPEC-57 machine surfaces compose over STCHAR receipts, CHAR leak checks, and STCHAR predicates", async () => {
  const input = fileInputs([
    { path: RECEIPT_PATH, content: yaml.dump(validReceiptPayload()) },
    { path: PAGE_PLAN_PATH, content: "Render from STCHAR-1 voice authority." }
  ]);
  const ctx = context(recordsWithStoryletPredicate("STCHAR-1"), [], [RECEIPT_PATH, PAGE_PLAN_PATH]);

  const run = await runValidators(SPEC57_VALIDATORS, input, ctx);

  assert.deepEqual(run.summary.validators_run, SPEC57_VALIDATORS.map((validator) => validator.name));
  assert.equal(run.summary.fail_count, 0);
  assert.deepEqual(run.verdicts, []);
});

test("SPEC-57 machine surfaces reject invalid STCHAR authority packets and CHAR page-plan authority", async () => {
  const expectedFailCodes = [
    "prose_receipt_schema_compliance.const",
    "no_char_authority_in_story_runtime.char_authority_text_leak"
  ];
  const input = fileInputs([
    { path: RECEIPT_PATH, content: yaml.dump(receiptWithInvalidStcharAuthority()) },
    { path: PAGE_PLAN_PATH, content: "Use CHAR-7's dossier voice as operational authority." }
  ]);
  const ctx = context(recordsWithStoryletPredicate("STCHAR-1"), [], [RECEIPT_PATH, PAGE_PLAN_PATH]);

  const run = await runValidators(SPEC57_VALIDATORS, input, ctx);
  const actualCodes = new Set(run.verdicts.map((verdict) => verdict.code));

  assert.deepEqual(run.summary.validators_run, SPEC57_VALIDATORS.map((validator) => validator.name));
  for (const code of expectedFailCodes) {
    assert.ok(actualCodes.has(code), `${code} missing from ${[...actualCodes].join(", ")}`);
  }
  assert.ok(run.verdicts.some((verdict) =>
    verdict.code === "prose_receipt_schema_compliance.const" &&
    verdict.message.includes("/stchar_authority/0/deterministic_verdict")
  ));
});

function recordsWithStoryletPredicate(recordActiveId: string): IndexedRecord[] {
  return [
    record("story_character_authority_record", "STCHAR-1", "story-characters/STCHAR-1.md", {
      id: "STCHAR-1",
      story_id: "STORY-1",
      story_slug: STORY_SLUG,
      world_slug: "test",
      source_kind: "world_char",
      source_char_id: "CHAR-1",
      source_char_hash: "sha256:" + "a".repeat(64),
      source_char_sections_used: ["Overview"],
      generated_at_page: "story_bootstrap",
      created_by_skill: "story-character-profile",
      supersedes: null,
      status: "active",
      bound_stent_ids: ["STENT-1"],
      profile_revision: 1,
      body_schema_version: "stchar.v1",
      profile_hash: "sha256:" + "b".repeat(64),
      voice_block_hash: "sha256:" + "c".repeat(64)
    }),
    record("storylet_record", "SLT-1", "_source/storylets/SLT-1.yaml", {
      id: "SLT-1",
      story_id: "STORY-1",
      preconditions: {
        hard: [{ pred: "record_active", record: recordActiveId }],
        soft: []
      }
    })
  ];
}

function validReceiptPayload(): Record<string, unknown> {
  return {
    page_id: "PG-1",
    story_id: "STORY-1",
    plan_path: "pages-prose-plans/PG-1.md",
    prose_path: "pages-prose/PG-1.md",
    plan_hash: "0".repeat(64),
    prose_hash: "1".repeat(64),
    state_hash_at_plan_time: "2".repeat(64),
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
    stchar_authority: [validStcharAuthority()],
    profile_fidelity: [{
      stchar_id: "STCHAR-1",
      voice_fidelity: "pass",
      appraisal_fidelity: "pass",
      pressure_behavior_fidelity: "pass",
      relationship_conduct_fidelity: "not_applicable",
      evidence: ["Rendered voice follows the page-plan packet."],
      repair_recommendation: "none"
    }],
    notes: ["STCHAR packet checked."],
    repair_recommendation: "none"
  };
}

function receiptWithInvalidStcharAuthority(): Record<string, unknown> {
  return {
    ...validReceiptPayload(),
    stchar_authority: [{
      ...validStcharAuthority(),
      packet_present: false,
      page_packet_hash: {
        ...validHashComparison("d"),
        observed: "sha256:" + "e".repeat(64),
        verdict: "FAIL"
      },
      deterministic_verdict: "PASS"
    }]
  };
}

function validStcharAuthority(): Record<string, unknown> {
  return {
    stchar_id: "STCHAR-1",
    stent_id: "STENT-1",
    display_name: "Red Bunny",
    required_because: "viewpoint character",
    packet_present: true,
    active_in_snapshot: true,
    profile_hash: validHashComparison("b"),
    voice_block_hash: validHashComparison("c"),
    page_packet_hash: validHashComparison("d"),
    deterministic_verdict: "PASS"
  };
}

function validHashComparison(hex: string): Record<string, unknown> {
  const value = "sha256:" + hex.repeat(64);
  return { expected: value, observed: value, verdict: "PASS" };
}

function fileInputs(files: Array<{ path: string; content: string }>): { files: Array<{ path: string; content: string }> } {
  return { files };
}

function record(nodeType: string, id: string, relativePath: string, parsed: Record<string, unknown>): IndexedRecord {
  return {
    node_type: nodeType,
    node_id: `${STORY_SLUG}:${id}`,
    file_path: `stories/${STORY_SLUG}/${relativePath}`,
    parsed,
    world_slug: "test",
    story_slug: STORY_SLUG
  };
}

function context(records: IndexedRecord[], edges: IndexedEdge[], touchedFiles: string[]): Context {
  const index: WorldIndexReadSurface = {
    query: async ({ record_type, story_slug }) =>
      records.filter((item) =>
        (!record_type || item.node_type === record_type) &&
        (!story_slug || item.story_slug === story_slug)
      ),
    queryEdges: async ({ edge_type }) =>
      edges.filter((item) => !edge_type || item.edge_type === edge_type)
  };

  return {
    run_mode: "full-world",
    world_slug: "test",
    story_slug: STORY_SLUG,
    index,
    touched_files: touchedFiles
  };
}
