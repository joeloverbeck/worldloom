import assert from "node:assert/strict";
import test from "node:test";

import yaml from "js-yaml";

import { sceneProseReceiptSchemaCompliance } from "../../src/structural/scene-prose-receipt-schema-compliance.js";
import { context } from "./helpers.js";

const RECEIPT_PATH = "stories/red-bunny/scene-prose-receipts/SCN-1.yaml";

function validReceiptPayload(): Record<string, unknown> {
  return {
    scene_id: "SCN-1",
    story_id: "STORY-1",
    branch_id: "BR-1",
    plan_path: "scene-prose-plans/SCN-1.md",
    prose_path: "scene-prose/SCN-1.md",
    checked_at: "2026-05-28T12:00:00Z",
    strict: false,
    verdict: "PASS",
    included_pages: [
      {
        page_id: "PG-1",
        state_hash_at_attach: "0000000000000000000000000000000000000000000000000000000000000001"
      },
      {
        page_id: "PG-2",
        state_hash_at_attach: "0000000000000000000000000000000000000000000000000000000000000002"
      }
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
    notes: ["Scene receipt validated."],
    repair_recommendation: "none"
  };
}

test("scene_prose_receipt_schema_compliance accepts a contract-shaped scene receipt", async () => {
  const result = await runReceipt(validReceiptPayload());

  assert.deepEqual(result, []);
});

test("scene_prose_receipt_schema_compliance accepts absent optional notes and repair recommendation", async () => {
  const payload = validReceiptPayload();
  delete payload.notes;
  delete payload.repair_recommendation;

  const result = await runReceipt(payload);

  assert.deepEqual(result, []);
});

test("scene_prose_receipt_schema_compliance rejects missing required range checks", async () => {
  const payload = validReceiptPayload();
  delete (payload.checks as Record<string, unknown>).included_pg_events_rendered;

  const result = await runReceipt(payload);

  assert.ok(result.some((verdict) => (
    verdict.code === "scene_prose_receipt_schema_compliance.required" &&
    verdict.message.includes("must have required property 'included_pg_events_rendered'")
  )));
});

test("scene_prose_receipt_schema_compliance rejects malformed included page hashes", async () => {
  const payload = validReceiptPayload();
  const includedPages = payload.included_pages as Array<Record<string, unknown>>;
  assert.ok(includedPages[0]);
  includedPages[0].state_hash_at_attach = "sha256:not-a-hash";

  const result = await runReceipt(payload);

  assert.ok(result.some((verdict) => (
    verdict.code === "scene_prose_receipt_schema_compliance.pattern" &&
    verdict.message.includes("/included_pages/0/state_hash_at_attach")
  )));
});

test("scene_prose_receipt_schema_compliance rejects extra top-level fields", async () => {
  const payload = validReceiptPayload();
  payload.plan_hash = "0000000000000000000000000000000000000000000000000000000000000001";

  const result = await runReceipt(payload);

  assert.ok(result.some((verdict) => (
    verdict.code === "scene_prose_receipt_schema_compliance.additionalProperties" &&
    verdict.message.includes("must NOT have additional properties")
  )));
});

test("scene_prose_receipt_schema_compliance skips pre-apply mode", () => {
  assert.equal(sceneProseReceiptSchemaCompliance.applies_to(context([], { run_mode: "pre-apply" })), false);
});

async function runReceipt(payload: Record<string, unknown>) {
  return sceneProseReceiptSchemaCompliance.run(
    { files: [{ path: RECEIPT_PATH, content: yaml.dump(payload) }] },
    context([], { touched_files: [RECEIPT_PATH], run_mode: "incremental" })
  );
}
