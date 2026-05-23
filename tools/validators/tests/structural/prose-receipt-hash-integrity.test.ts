import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import yaml from "js-yaml";

import { proseReceiptHashIntegrity } from "../../src/structural/prose-receipt-hash-integrity.js";
import { context } from "./helpers.js";

const STORY = "red-bunny";
const RECEIPT_PATH = `stories/${STORY}/pages-prose-receipts/PG-1.yaml`;
const PROSE_PATH = `stories/${STORY}/pages-prose/PG-1.md`;
const PROSE = "The moonlit hallway held its breath.\n";

test("prose_receipt_hash_integrity accepts a receipt whose prose_hash matches prose bytes", async () => {
  const verdicts = await runReceipt(receipt({ prose_hash: sha256Hex(PROSE) }), PROSE);

  assert.deepEqual(verdicts, []);
});

test("prose_receipt_hash_integrity rejects mismatched prose hashes", async () => {
  const verdicts = await runReceipt(receipt({ prose_hash: "0".repeat(64) }), PROSE);

  assert.equal(verdicts[0]?.code, "prose_receipt_hash_integrity.hash_mismatch");
  assert.deepEqual(verdicts[0]?.detail, {
    stamped_hash: "0".repeat(64),
    computed_hash: sha256Hex(PROSE),
    prose_path: PROSE_PATH
  });
});

test("prose_receipt_hash_integrity rejects receipts without prose_hash", async () => {
  const payload = receipt({ prose_hash: undefined });

  const verdicts = await runReceipt(payload, PROSE);

  assert.equal(verdicts[0]?.code, "prose_receipt_hash_integrity.missing_prose_hash");
});

test("prose_receipt_hash_integrity rejects receipts without prose_path", async () => {
  const payload = receipt({ prose_path: undefined });

  const verdicts = await runReceipt(payload, PROSE);

  assert.equal(verdicts[0]?.code, "prose_receipt_hash_integrity.missing_prose_path");
});

test("prose_receipt_hash_integrity rejects missing prose files", async () => {
  const verdicts = await withTempWorld(receipt({ prose_hash: sha256Hex(PROSE) }), undefined);

  assert.equal(verdicts[0]?.code, "prose_receipt_hash_integrity.prose_unreadable");
});

test("prose_receipt_hash_integrity rejects unparseable receipt YAML", async () => {
  const verdicts = await proseReceiptHashIntegrity.run(
    { files: [{ path: RECEIPT_PATH, content: "page_id: [unterminated\n" }] },
    context([], { touched_files: [RECEIPT_PATH], run_mode: "incremental" })
  );

  assert.equal(verdicts[0]?.code, "prose_receipt_hash_integrity.yaml_parse");
});

test("prose_receipt_hash_integrity rejects prose_path escapes", async () => {
  const verdicts = await runReceipt(receipt({ prose_path: "../outside.md", prose_hash: sha256Hex(PROSE) }), PROSE);

  assert.equal(verdicts[0]?.code, "prose_receipt_hash_integrity.path_escape");
});

test("prose_receipt_hash_integrity skips pre-apply mode", () => {
  assert.equal(proseReceiptHashIntegrity.applies_to(context([], { run_mode: "pre-apply" })), false);
});

test("prose_receipt_hash_integrity discovers full-world receipt files from world root", async () => {
  const verdicts = await withTempWorld(receipt({ prose_hash: sha256Hex(PROSE) }), PROSE);

  assert.deepEqual(verdicts, []);
});

async function runReceipt(payload: Record<string, unknown>, prose: string) {
  return proseReceiptHashIntegrity.run(
    {
      files: [
        { path: RECEIPT_PATH, content: yaml.dump(payload) },
        { path: PROSE_PATH, content: prose }
      ]
    },
    context([], { touched_files: [RECEIPT_PATH], run_mode: "incremental" })
  );
}

async function withTempWorld(payload: Record<string, unknown>, prose: string | undefined) {
  const root = mkdtempSync(path.join(os.tmpdir(), "worldloom-prose-receipt-"));
  const worldRoot = path.join(root, "worlds", "test");
  try {
    mkdirSync(path.join(worldRoot, "stories", STORY, "pages-prose-receipts"), { recursive: true });
    mkdirSync(path.join(worldRoot, "stories", STORY, "pages-prose"), { recursive: true });
    writeFileSync(path.join(worldRoot, RECEIPT_PATH), yaml.dump(payload), "utf8");
    if (prose !== undefined) {
      writeFileSync(path.join(worldRoot, PROSE_PATH), prose, "utf8");
    }

    return await proseReceiptHashIntegrity.run(
      { world_root: worldRoot },
      context([], { run_mode: "full-world", story_slug: STORY })
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function receipt(overrides: { prose_path?: string | undefined; prose_hash?: string | undefined } = {}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    page_id: "PG-1",
    story_id: "STORY-1",
    plan_path: "pages-prose-plans/PG-1.md",
    prose_path: "pages-prose/PG-1.md",
    plan_hash: "1".repeat(64),
    prose_hash: sha256Hex(PROSE),
    state_hash_at_plan_time: "3".repeat(64),
    checked_at: "2026-05-23T00:00:00Z",
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
    notes: [],
    repair_recommendation: "none"
  };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete payload[key];
    } else {
      payload[key] = value;
    }
  }

  return payload;
}

function sha256Hex(content: string): string {
  return createHash("sha256").update(Buffer.from(content, "utf8")).digest("hex");
}
