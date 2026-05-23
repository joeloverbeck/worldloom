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
      char_authority_leak: "PASS",
      craft_critic: "NOT_RUN"
    },
    notes: ["Receipt validated."],
    repair_recommendation: "none"
  };
}

function validStcharAuthority() {
  return {
    stchar_id: "STCHAR-1",
    stent_id: "STENT-1",
    display_name: "Red Bunny",
    required_because: "viewpoint character",
    packet_present: true,
    active_in_snapshot: true,
    deterministic_verdict: "PASS"
  };
}

function validProfileFidelity() {
  return {
    stchar_id: "STCHAR-1",
    voice_fidelity: "pass",
    appraisal_fidelity: "pass",
    pressure_behavior_fidelity: "minor_drift",
    relationship_conduct_fidelity: "not_applicable",
    evidence: ["Rendered voice follows the page-plan voice block."],
    repair_recommendation: "revise_prose"
  };
}

test("prose_receipt_schema_compliance accepts a contract-shaped prose receipt", async () => {
  const result = await runReceipt(validReceiptPayload());

  assert.deepEqual(result, []);
});

test("prose_receipt_schema_compliance accepts STCHAR authority and profile fidelity blocks", async () => {
  const payload = validReceiptPayload();
  payload.stchar_authority = [validStcharAuthority()];
  payload.profile_fidelity = [validProfileFidelity()];

  const result = await runReceipt(payload);

  assert.deepEqual(result, []);
});

test("prose_receipt_schema_compliance accepts absent STCHAR blocks when no qualifying character is present", async () => {
  const payload = validReceiptPayload();

  const result = await runReceipt(payload);

  assert.deepEqual(result, []);
});

test("prose_receipt_schema_compliance rejects receipts without char leak field", async () => {
  const payload = validReceiptPayload();
  delete (payload.checks as Record<string, unknown>).char_authority_leak;

  const result = await runReceipt(payload);

  assert.ok(result.some((verdict) => (
    verdict.code === "prose_receipt_schema_compliance.required" &&
    verdict.message.includes("must have required property 'char_authority_leak'")
  )));
});

test("prose_receipt_schema_compliance rejects missing-packet STCHAR entries marked pass", async () => {
  const payload = validReceiptPayload();
  payload.stchar_authority = [{
    ...validStcharAuthority(),
    packet_present: false,
    deterministic_verdict: "PASS"
  }];

  const result = await runReceipt(payload);

  assert.ok(result.some((verdict) => (
    verdict.code === "prose_receipt_schema_compliance.const" &&
    verdict.message.includes("/stchar_authority/0/deterministic_verdict")
  )));
});

test("prose_receipt_schema_compliance rejects reintroduced hash fields on STCHAR entries", async () => {
  const payload = validReceiptPayload();
  payload.stchar_authority = [{
    ...validStcharAuthority(),
    page_packet_hash: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
  }];

  const result = await runReceipt(payload);

  assert.ok(result.some((verdict) => (
    verdict.code === "prose_receipt_schema_compliance.additionalProperties" &&
    verdict.message.includes("must NOT have additional properties")
  )));
});

test("prose_receipt_schema_compliance rejects stale profile fidelity repair tokens", async () => {
  const payload = validReceiptPayload();
  payload.profile_fidelity = [{
    ...validProfileFidelity(),
    repair_recommendation: "invent_arc"
  }];

  const result = await runReceipt(payload);

  assert.ok(result.some((verdict) => (
    verdict.code === "prose_receipt_schema_compliance.enum" &&
    verdict.message.includes("/profile_fidelity/0/repair_recommendation")
  )));
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
