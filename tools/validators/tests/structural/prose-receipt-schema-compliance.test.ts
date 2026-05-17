import assert from "node:assert/strict";
import test from "node:test";

import yaml from "js-yaml";

import { proseReceiptSchemaCompliance } from "../../src/structural/prose-receipt-schema-compliance.js";
import { context } from "./helpers.js";

const RECEIPT_PATH = "stories/red-bunny/pages-prose-receipts/PG-1.yaml";

function validReceiptPayload(): Record<string, unknown> {
  return {
    page_id: "PG-1",
    story_id: "STORY-1",
    plan_path: "pages-prose-plans/PG-1.md",
    prose_path: "pages-prose/PG-1.md",
    plan_hash: "0000000000000000000000000000000000000000000000000000000000000001",
    prose_hash: "0000000000000000000000000000000000000000000000000000000000000002",
    state_hash_at_plan_time: "0000000000000000000000000000000000000000000000000000000000000003",
    checked_at: "2026-05-16T23:53:25Z",
    strict: false,
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
      craft_critic: "NOT_RUN"
    },
    notes: ["Receipt validated."],
    repair_recommendation: "none"
  };
}

test("prose_receipt_schema_compliance accepts a contract-shaped prose receipt", async () => {
  const result = await runReceipt(validReceiptPayload());

  assert.deepEqual(result, []);
});

test("prose_receipt_schema_compliance rejects receipts missing required fields", async () => {
  const payload = validReceiptPayload();
  delete payload.repair_recommendation;

  const result = await runReceipt(payload);

  assert.ok(result.some((verdict) => (
    verdict.code === "prose_receipt_schema_compliance.required" &&
    verdict.message.includes("must have required property 'repair_recommendation'")
  )));
});

test("prose_receipt_schema_compliance rejects stale repair_recommendation tokens", async () => {
  const payload = validReceiptPayload();
  payload.repair_recommendation = "revise_plan";

  const result = await runReceipt(payload);

  assert.ok(result.some((verdict) => (
    verdict.code === "prose_receipt_schema_compliance.enum" &&
    verdict.message.includes("/repair_recommendation")
  )));
});

test("prose_receipt_schema_compliance rejects non-sha256 prose hashes", async () => {
  const payload = validReceiptPayload();
  payload.prose_hash = "not-a-sha";

  const result = await runReceipt(payload);

  assert.ok(result.some((verdict) => (
    verdict.code === "prose_receipt_schema_compliance.pattern" &&
    verdict.message.includes("/prose_hash")
  )));
});

test("prose_receipt_schema_compliance rejects extra top-level fields", async () => {
  const payload = validReceiptPayload();
  payload.repair_recommendations = "none";

  const result = await runReceipt(payload);

  assert.ok(result.some((verdict) => (
    verdict.code === "prose_receipt_schema_compliance.additionalProperties" &&
    verdict.message.includes("must NOT have additional properties")
  )));
});

test("prose_receipt_schema_compliance skips pre-apply mode", () => {
  assert.equal(proseReceiptSchemaCompliance.applies_to(context([], { run_mode: "pre-apply" })), false);
});

async function runReceipt(payload: Record<string, unknown>) {
  return proseReceiptSchemaCompliance.run(
    { files: [{ path: RECEIPT_PATH, content: yaml.dump(payload) }] },
    context([], { touched_files: [RECEIPT_PATH], run_mode: "incremental" })
  );
}
