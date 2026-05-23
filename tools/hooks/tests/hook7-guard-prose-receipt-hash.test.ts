import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createTempRepoRoot,
  destroyTempRepoRoot,
  runCompiledHook
} from "./_shared.js";

function hash(content: string): string {
  return createHash("sha256").update(Buffer.from(content, "utf8")).digest("hex");
}

function storyRoot(root: string): string {
  return path.join(root, "worlds", "animalia", "stories", "red-bunny");
}

function seedProse(root: string, pageId: string, body: string): string {
  const prosePath = path.join(storyRoot(root), "pages-prose", `${pageId}.md`);
  mkdirSync(path.dirname(prosePath), { recursive: true });
  writeFileSync(prosePath, body, "utf8");
  return prosePath;
}

function receiptPath(root: string, pageId: string): string {
  return path.join(storyRoot(root), "pages-prose-receipts", `${pageId}.yaml`);
}

function receiptBody(pageId: string, proseHash: string, prosePath = `pages-prose/${pageId}.md`): string {
  return [
    `page_id: ${pageId}`,
    "story_id: STORY-1",
    "plan_path: pages-prose-plans/PG-1.md",
    `prose_path: ${prosePath}`,
    "plan_hash: " + "0".repeat(64),
    `prose_hash: ${proseHash}`,
    "state_hash_at_plan_time: " + "1".repeat(64),
    "checked_at: 2026-05-23T00:00:00Z",
    "strict: true",
    "verdict: PASS",
    "checks:",
    "  hash_integrity: PASS",
    "notes: []",
    "repair_recommendation: none",
    ""
  ].join("\n");
}

function runHook(root: string, toolName: "Edit" | "Write", toolInput: Record<string, unknown>) {
  return runCompiledHook(
    "hook7-guard-prose-receipt-hash.js",
    {
      hook_event_name: "PreToolUse",
      cwd: root,
      tool_name: toolName,
      tool_input: toolInput
    },
    { cwd: root, projectDir: root }
  );
}

test("hook7_allows_paths_outside_receipt_scope_without_parsing", () => {
  const root = createTempRepoRoot();

  try {
    const planPath = path.join(storyRoot(root), "pages-prose-plans", "PG-1.md");
    const kernelPath = path.join(storyRoot(root), "STORY_KERNEL.md");

    const planResult = runHook(root, "Write", {
      file_path: planPath,
      content: "not: valid: receipt: yaml"
    });
    const kernelResult = runHook(root, "Write", {
      file_path: kernelPath,
      content: "not: valid: receipt: yaml"
    });

    assert.equal(planResult.status, 0, planResult.stderr);
    assert.equal(planResult.stdout, "");
    assert.equal(kernelResult.status, 0, kernelResult.stderr);
    assert.equal(kernelResult.stdout, "");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook7_allows_receipt_when_prose_hash_matches_prose_file", () => {
  const root = createTempRepoRoot();

  try {
    const prose = "# Prose\nRendered text.\n";
    seedProse(root, "PG-1", prose);

    const result = runHook(root, "Write", {
      file_path: receiptPath(root, "PG-1"),
      content: receiptBody("PG-1", hash(prose))
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"permissionDecision":"allow"/);
    assert.match(result.stdout, /prose_hash matches/);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook7_denies_receipt_when_prose_hash_is_fabricated", () => {
  const root = createTempRepoRoot();

  try {
    const prose = "# Prose\nRendered text.\n";
    seedProse(root, "PG-1", prose);
    const fabricated = "f".repeat(64);

    const result = runHook(root, "Write", {
      file_path: receiptPath(root, "PG-1"),
      content: receiptBody("PG-1", fabricated)
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"permissionDecision":"deny"/);
    assert.match(result.stdout, /prose_hash mismatch/);
    assert.match(result.stdout, new RegExp(fabricated));
    assert.match(result.stdout, new RegExp(hash(prose)));
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook7_denies_receipt_with_missing_prose_hash", () => {
  const root = createTempRepoRoot();

  try {
    seedProse(root, "PG-1", "# Prose\nRendered text.\n");

    const result = runHook(root, "Write", {
      file_path: receiptPath(root, "PG-1"),
      content: receiptBody("PG-1", hash("# Prose\nRendered text.\n")).replace(/^prose_hash: .*\n/m, "")
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"permissionDecision":"deny"/);
    assert.match(result.stdout, /missing required prose_hash/);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook7_denies_receipt_with_missing_prose_path", () => {
  const root = createTempRepoRoot();

  try {
    seedProse(root, "PG-1", "# Prose\nRendered text.\n");

    const result = runHook(root, "Write", {
      file_path: receiptPath(root, "PG-1"),
      content: receiptBody("PG-1", hash("# Prose\nRendered text.\n")).replace(/^prose_path: .*\n/m, "")
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"permissionDecision":"deny"/);
    assert.match(result.stdout, /missing required prose_path/);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook7_denies_receipt_when_prose_file_is_missing", () => {
  const root = createTempRepoRoot();

  try {
    const result = runHook(root, "Write", {
      file_path: receiptPath(root, "PG-1"),
      content: receiptBody("PG-1", "0".repeat(64), "pages-prose/PG-404.md")
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"permissionDecision":"deny"/);
    assert.match(result.stdout, /Unable to read prose file/);
    assert.match(result.stdout, /PG-404\.md/);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook7_denies_unparseable_yaml_body", () => {
  const root = createTempRepoRoot();

  try {
    const result = runHook(root, "Write", {
      file_path: receiptPath(root, "PG-1"),
      content: "page_id: PG-1\n:\n"
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"permissionDecision":"deny"/);
    assert.match(result.stdout, /YAML parse failed/);
  } finally {
    destroyTempRepoRoot(root);
  }
});
