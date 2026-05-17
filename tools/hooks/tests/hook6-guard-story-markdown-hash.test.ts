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

function seedPg(root: string, pageId: string, planHash: string): void {
  const pgPath = path.join(storyRoot(root), "_source", "pages", `${pageId}.yaml`);
  mkdirSync(path.dirname(pgPath), { recursive: true });
  writeFileSync(
    pgPath,
    [
      `id: ${pageId}`,
      "plan:",
      `  plan_hash: ${planHash}`,
      "state_hash: 0".repeat(64),
      ""
    ].join("\n"),
    "utf8"
  );
}

function seedPlan(root: string, pageId: string, body: string): string {
  const planPath = path.join(storyRoot(root), "pages-prose-plans", `${pageId}.md`);
  mkdirSync(path.dirname(planPath), { recursive: true });
  writeFileSync(planPath, body, "utf8");
  return planPath;
}

function runHook(root: string, toolName: "Edit" | "Write", toolInput: Record<string, unknown>) {
  return runCompiledHook(
    "hook6-guard-story-markdown-hash.js",
    {
      hook_event_name: "PreToolUse",
      cwd: root,
      tool_name: toolName,
      tool_input: toolInput
    },
    { cwd: root, projectDir: root }
  );
}

test("hook6_blocks_pg_plan_write_when_hash_mismatches", () => {
  const root = createTempRepoRoot();

  try {
    const originalBody = "# Plan\nOriginal.\n";
    const nextBody = "# Plan\nChanged.\n";
    const planPath = seedPlan(root, "PG-1", originalBody);
    seedPg(root, "PG-1", hash(originalBody));

    const result = runHook(root, "Edit", {
      file_path: planPath,
      old_string: "Original.",
      new_string: "Changed."
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"permissionDecision":"deny"/);
    assert.match(result.stdout, /compute-pg-hashes\.js/);
    assert.match(result.stdout, new RegExp(hash(nextBody)));
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook6_allows_pg_plan_write_when_hash_matches", () => {
  const root = createTempRepoRoot();

  try {
    const nextBody = "# Plan\nAlready stamped.\n";
    const planPath = seedPlan(root, "PG-1", "# Plan\nOriginal.\n");
    seedPg(root, "PG-1", hash(nextBody));

    const result = runHook(root, "Edit", {
      file_path: planPath,
      old_string: "Original.",
      new_string: "Already stamped."
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook6_allows_pg_plan_first_write_when_no_pg_record_exists", () => {
  const root = createTempRepoRoot();

  try {
    const planPath = path.join(storyRoot(root), "pages-prose-plans", "PG-7.md");
    const result = runHook(root, "Write", {
      file_path: planPath,
      content: "# Plan\nFresh bootstrap.\n"
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook6_blocks_index_update_when_referenced_plan_hash_mismatches", () => {
  const root = createTempRepoRoot();

  try {
    const planBody = "# Plan\nOn disk drift.\n";
    seedPlan(root, "PG-1", planBody);
    seedPg(root, "PG-1", hash("# Plan\nStamped elsewhere.\n"));
    const indexPath = path.join(storyRoot(root), "INDEX.md");

    const result = runHook(root, "Write", {
      file_path: indexPath,
      content: "# Story\n\n- PG-1\n"
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"permissionDecision":"deny"/);
    assert.match(result.stdout, /PG-1/);
    assert.match(result.stdout, /compute-pg-hashes\.js/);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook6_allows_index_update_when_all_referenced_plan_hashes_match", () => {
  const root = createTempRepoRoot();

  try {
    const pg1Body = "# Plan\nOne.\n";
    const pg2Body = "# Plan\nTwo.\n";
    seedPlan(root, "PG-1", pg1Body);
    seedPlan(root, "PG-2", pg2Body);
    seedPg(root, "PG-1", hash(pg1Body));
    seedPg(root, "PG-2", hash(pg2Body));
    const indexPath = path.join(storyRoot(root), "INDEX.md");

    const result = runHook(root, "Write", {
      file_path: indexPath,
      content: "# Story\n\n- PG-1\n- PG-2\n"
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook6_allows_unrelated_markdown_writes", () => {
  const root = createTempRepoRoot();

  try {
    const prosePath = path.join(storyRoot(root), "pages-prose", "PG-1.md");
    const result = runHook(root, "Write", {
      file_path: prosePath,
      content: "# Prose\nRendered story text.\n"
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
  } finally {
    destroyTempRepoRoot(root);
  }
});
