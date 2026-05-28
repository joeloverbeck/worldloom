import assert from "node:assert/strict";
import test from "node:test";

import yaml from "js-yaml";

import type { IndexedRecord } from "../../src/framework/types.js";
import { sceneProseReceiptContent } from "../../src/structural/scene-prose-receipt-content.js";
import { context, record } from "./helpers.js";

const STORY = "red-bunny";
const RECEIPT_PATH = `stories/${STORY}/scene-prose-receipts/SCN-1.yaml`;
const PROSE_PATH = `stories/${STORY}/scene-prose/SCN-1.md`;

test("scene_prose_receipt_content passes a clean scene receipt over every included PG", async () => {
  const verdicts = await run();

  assert.deepEqual(verdicts, []);
});

test("scene_prose_receipt_content rejects included page range and state-hash drift", async () => {
  const payload = receiptPayload({
    included_pages: [
      { page_id: "PG-1", state_hash_at_attach: hash("1") },
      { page_id: "PG-2", state_hash_at_attach: hash("old") },
      { page_id: "PG-3", state_hash_at_attach: hash("3") }
    ]
  });

  const verdicts = await run({ receipt: payload });

  assert.ok(hasCode(verdicts, "scene_prose_receipt_content.included_pg_events_rendered.range_mismatch"));
  assert.ok(hasCode(verdicts, "scene_prose_receipt_content.included_pg_events_rendered.state_hash_mismatch"));
});

test("scene_prose_receipt_content rejects final choice surface mismatch and missing prose surface", async () => {
  const verdicts = await run({
    sceneOverrides: { emitted_choice_ids: ["CHC-2"] },
    prose: "The scene ends before any visible choice is presented."
  });

  assert.ok(hasCode(verdicts, "scene_prose_receipt_content.final_scene_choice_surface_visibility.choice_surface_mismatch"));
  assert.ok(hasCode(verdicts, "scene_prose_receipt_content.final_scene_choice_surface_visibility.choice_text_missing"));
});

test("scene_prose_receipt_content emits verdicts for receipt-recorded content check failures", async () => {
  const payload = receiptPayload({
    checks: {
      included_pg_events_rendered: "FAIL",
      final_scene_choice_surface_visibility: "FAIL",
      scene_range_entity_status_consistency: "WARN",
      scene_range_invented_structural_fact: "WARN",
      scene_range_forbidden_mystery_resolution: "FAIL",
      scene_prose_stchar_fidelity: "WARN",
      engine_jargon_leak: "FAIL",
      canon_claim_without_authority: "FAIL"
    }
  });

  const verdicts = await run({ receipt: payload });

  assert.equal(verdicts.find((verdict) => verdict.code.endsWith("scene_range_entity_status_consistency.warn"))?.severity, "warn");
  assert.ok(hasCode(verdicts, "scene_prose_receipt_content.included_pg_events_rendered.fail"));
  assert.ok(hasCode(verdicts, "scene_prose_receipt_content.final_scene_choice_surface_visibility.fail"));
  assert.ok(hasCode(verdicts, "scene_prose_receipt_content.scene_range_invented_structural_fact.warn"));
  assert.ok(hasCode(verdicts, "scene_prose_receipt_content.scene_range_forbidden_mystery_resolution.fail"));
  assert.ok(hasCode(verdicts, "scene_prose_receipt_content.scene_prose_stchar_fidelity.warn"));
  assert.ok(hasCode(verdicts, "scene_prose_receipt_content.engine_jargon_leak.fail"));
  assert.ok(hasCode(verdicts, "scene_prose_receipt_content.canon_claim_without_authority.fail"));
});

test("scene_prose_receipt_content scans prose for engine jargon, forbidden mysteries, and canon authority claims", async () => {
  const verdicts = await run({
    prose: "The rendered scene says PG-2 and state_delta. M-1 is solved. Hard canon says the door was always blessed. Stay with Mina."
  });

  assert.ok(hasCode(verdicts, "scene_prose_receipt_content.engine_jargon_leak.prose_contains_engine_terms"));
  assert.ok(hasCode(verdicts, "scene_prose_receipt_content.scene_range_forbidden_mystery_resolution.prose_names_forbidden_mystery"));
  assert.ok(hasCode(verdicts, "scene_prose_receipt_content.canon_claim_without_authority.prose_asserts_canon_authority"));
});

test("scene_prose_receipt_content skips pre-apply mode", () => {
  assert.equal(sceneProseReceiptContent.applies_to(context([], { run_mode: "pre-apply" })), false);
});

async function run(options: {
  receipt?: Record<string, unknown>;
  prose?: string;
  sceneOverrides?: Record<string, unknown>;
} = {}) {
  return sceneProseReceiptContent.run(
    {
      files: [
        { path: RECEIPT_PATH, content: yaml.dump(options.receipt ?? receiptPayload()) },
        { path: PROSE_PATH, content: options.prose ?? "The bench talk concludes with a clear invitation to stay with Mina." }
      ]
    },
    context(records(options.sceneOverrides), {
      run_mode: "incremental",
      touched_files: [RECEIPT_PATH, PROSE_PATH]
    })
  );
}

function records(sceneOverrides: Record<string, unknown> = {}): IndexedRecord[] {
  return [
    storyRecord("scene_record", "SCN-1", `stories/${STORY}/_source/scenes/SCN-1.yaml`, {
      id: "SCN-1",
      story_id: "STORY-1",
      branch_id: "BR-1",
      status: "attached",
      pg_ids: ["PG-1", "PG-2"],
      start_page_id: "PG-1",
      end_page_id: "PG-2",
      previous_scene_id: null,
      choice_surface_page_id: "PG-2",
      emitted_choice_ids: ["CHC-1"],
      title: "Bench Talk",
      slug: "bench-talk",
      prose_plan_path: "scene-prose-plans/SCN-1.md",
      prose_path: "scene-prose/SCN-1.md",
      receipt_path: "scene-prose-receipts/SCN-1.yaml",
      ...sceneOverrides
    }),
    page("PG-1", ["PG-1"], hash("1")),
    page("PG-2", ["PG-1", "PG-2"], hash("2"), { emitted_choices: ["CHC-1"] }),
    storyRecord("choice_record", "CHC-1", `stories/${STORY}/_source/choices/CHC-1.yaml`, {
      id: "CHC-1",
      story_id: "STORY-1",
      created_at_page: "PG-2",
      surface_label: "Stay with Mina",
      player_visible_intent: "Keep talking on the bench"
    }),
    record("mystery_reserve_entry", "M-1", "_source/mystery-reserve/M-1.yaml", {
      id: "M-1",
      status: "forbidden"
    })
  ];
}

function page(id: string, branchPath: string[], stateHash: string, overrides: Record<string, unknown> = {}): IndexedRecord {
  return storyRecord("page_record", id, `stories/${STORY}/_source/pages/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    branch_id: "BR-1",
    parent_page_id: branchPath.length > 1 ? branchPath[branchPath.length - 2] : null,
    branch_path: branchPath,
    turn_index: branchPath.length - 1,
    state_hash: stateHash,
    emitted_choices: [],
    ...overrides
  });
}

function storyRecord(nodeType: string, id: string, filePath: string, parsed: Record<string, unknown>): IndexedRecord {
  return {
    ...record(nodeType, id, filePath, parsed),
    story_slug: STORY
  };
}

function receiptPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    scene_id: "SCN-1",
    story_id: "STORY-1",
    branch_id: "BR-1",
    plan_path: "scene-prose-plans/SCN-1.md",
    prose_path: "scene-prose/SCN-1.md",
    checked_at: "2026-05-28T12:00:00Z",
    strict: true,
    verdict: "PASS",
    included_pages: [
      { page_id: "PG-1", state_hash_at_attach: hash("1") },
      { page_id: "PG-2", state_hash_at_attach: hash("2") }
    ],
    checks: {
      included_pg_events_rendered: "PASS",
      final_scene_choice_surface_visibility: "PASS",
      scene_range_entity_status_consistency: "PASS",
      scene_range_invented_structural_fact: "PASS",
      scene_range_forbidden_mystery_resolution: "PASS",
      scene_prose_stchar_fidelity: "PASS",
      engine_jargon_leak: "PASS",
      canon_claim_without_authority: "PASS"
    },
    ...overrides
  };
}

function hash(suffix: string): string {
  return suffix.padStart(64, "0");
}

function hasCode(verdicts: Array<{ code: string }>, code: string): boolean {
  return verdicts.some((verdict) => verdict.code === code);
}
