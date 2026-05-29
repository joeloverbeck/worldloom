import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import YAML from "yaml";

import { stageRepairStoryletCreatedAtPage } from "../../src/ops/repair-storylet-created-at-page.js";
import { contentHashForYaml } from "../../src/ops/shared.js";
import type { PatchOperation, PatchPlanEnvelope } from "../../src/envelope/schema.js";
import type { OpContext } from "../../src/ops/types.js";

const TARGET_WORLD = "test-world";
const STORY_SLUG = "red-bunny";

function makeCtx(): { ctx: OpContext; worldRoot: string } {
  const worldRoot = mkdtempSync(path.join(tmpdir(), "repair-slt-cap-"));
  const ctx: OpContext = {
    worldRoot,
    db: undefined as unknown as import("better-sqlite3").Database
  };
  return { ctx, worldRoot };
}

function storyletPath(worldRoot: string, sltId: string): string {
  return path.join(
    worldRoot,
    "worlds",
    TARGET_WORLD,
    "stories",
    STORY_SLUG,
    "_source",
    "storylets",
    `${sltId}.yaml`
  );
}

function writeStorylet(worldRoot: string, sltId: string, record: Record<string, unknown>): string {
  const abs = storyletPath(worldRoot, sltId);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, YAML.stringify(record, { lineWidth: 0, sortMapEntries: true }), "utf8");
  return abs;
}

const baseEnvelope: PatchPlanEnvelope = {
  plan_id: "PLAN-1",
  target_world: TARGET_WORLD,
  approval_token: "token",
  verdict: "approved",
  originating_skill: "test",
  expected_id_allocations: {},
  patches: []
};

function repairOp(
  sltId: string,
  overrides: Partial<Extract<PatchOperation, { op: "repair_storylet_created_at_page" }>> = {}
): Extract<PatchOperation, { op: "repair_storylet_created_at_page" }> {
  return {
    op: "repair_storylet_created_at_page",
    target_world: TARGET_WORLD,
    payload: { story_slug: STORY_SLUG, target_slt_id: sltId },
    ...overrides
  };
}

test("absent created_at_page is backfilled with null", async () => {
  const { ctx, worldRoot } = makeCtx();
  writeStorylet(worldRoot, "SLT-20", { id: "SLT-20", title: "Negotiate" });

  const staged = await stageRepairStoryletCreatedAtPage(baseEnvelope, repairOp("SLT-20"), ctx);

  assert.equal(staged.noop, undefined);
  const parsed = YAML.parse(readFileSync(staged.temp_file_path, "utf8")) as Record<string, unknown>;
  assert.ok("created_at_page" in parsed, "created_at_page must be present after repair");
  assert.equal(parsed.created_at_page, null);
  assert.equal(parsed.id, "SLT-20");
  assert.equal(parsed.title, "Negotiate");
});

test("explicit null created_at_page is a no-op", async () => {
  const { ctx, worldRoot } = makeCtx();
  writeStorylet(worldRoot, "SLT-21", { id: "SLT-21", created_at_page: null, title: "Settle" });

  const staged = await stageRepairStoryletCreatedAtPage(baseEnvelope, repairOp("SLT-21"), ctx);

  assert.equal(staged.noop, true);
  const parsed = YAML.parse(readFileSync(staged.temp_file_path, "utf8")) as Record<string, unknown>;
  assert.equal(parsed.created_at_page, null);
});

test("non-null created_at_page (runtime_jit PG id) is never overwritten", async () => {
  const { ctx, worldRoot } = makeCtx();
  writeStorylet(worldRoot, "SLT-22", { id: "SLT-22", created_at_page: "PG-7", title: "JIT" });

  const staged = await stageRepairStoryletCreatedAtPage(baseEnvelope, repairOp("SLT-22"), ctx);

  assert.equal(staged.noop, true);
  const parsed = YAML.parse(readFileSync(staged.temp_file_path, "utf8")) as Record<string, unknown>;
  assert.equal(parsed.created_at_page, "PG-7");
});

test("missing record throws record_not_found", async () => {
  const { ctx } = makeCtx();
  await assert.rejects(stageRepairStoryletCreatedAtPage(baseEnvelope, repairOp("SLT-99"), ctx), /record_not_found|was not found/);
});

test("id mismatch throws invalid_record_id", async () => {
  const { ctx, worldRoot } = makeCtx();
  writeStorylet(worldRoot, "SLT-23", { id: "SLT-999", title: "Mismatch" });

  await assert.rejects(
    stageRepairStoryletCreatedAtPage(baseEnvelope, repairOp("SLT-23"), ctx),
    /does not match existing record id/
  );
});

test("invalid target_slt_id pattern is rejected", async () => {
  const { ctx } = makeCtx();
  await assert.rejects(
    stageRepairStoryletCreatedAtPage(baseEnvelope, repairOp("PG-3"), ctx),
    /is not a valid storylet id/
  );
});

test("empty story_slug is rejected", async () => {
  const { ctx } = makeCtx();
  await assert.rejects(
    stageRepairStoryletCreatedAtPage(
      baseEnvelope,
      repairOp("SLT-20", { payload: { story_slug: "", target_slt_id: "SLT-20" } }),
      ctx
    ),
    /story_slug must be a non-empty string/
  );
});

test("target_world mismatch is rejected", async () => {
  const { ctx, worldRoot } = makeCtx();
  writeStorylet(worldRoot, "SLT-24", { id: "SLT-24" });
  await assert.rejects(
    stageRepairStoryletCreatedAtPage(baseEnvelope, repairOp("SLT-24", { target_world: "other-world" }), ctx),
    /target_world must match/
  );
});

test("content-hash drift is rejected", async () => {
  const { ctx, worldRoot } = makeCtx();
  const record = { id: "SLT-25", title: "Drift" };
  writeStorylet(worldRoot, "SLT-25", record);

  await assert.rejects(
    stageRepairStoryletCreatedAtPage(
      baseEnvelope,
      repairOp("SLT-25", { expected_content_hash: "deadbeef" }),
      ctx
    ),
    /content hash drifted|record_hash_drift/
  );

  // The matching hash passes (sanity: confirms the guard is value-correct, not always-throwing).
  const staged = await stageRepairStoryletCreatedAtPage(
    baseEnvelope,
    repairOp("SLT-25", { expected_content_hash: contentHashForYaml(record) }),
    ctx
  );
  assert.equal(staged.noop, undefined);
});
