import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { computePgStateHash } from "@worldloom/world-index/hash/content";

import { runComputePgHashesCli } from "../../src/cli/compute-pg-hashes";

function makeTmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "world-mcp-cli-compute-pg-hashes-"));
}

function writeText(dir: string, name: string, value: string): string {
  const filePath = path.join(dir, name);
  writeFileSync(filePath, value, "utf8");
  return filePath;
}

test("cli-compute-pg-hashes: --help prints usage to stdout and exits 0", async () => {
  const result = await runComputePgHashesCli(["--help"]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Usage: compute-pg-hashes/);
  assert.equal(result.stderr, "");
});

test("cli-compute-pg-hashes: missing args exit 2 with usage", async () => {
  const result = await runComputePgHashesCli([]);

  assert.equal(result.exitCode, 2);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /--plan <path> is required/);
  assert.match(result.stderr, /Usage: compute-pg-hashes/);
});

test("cli-compute-pg-hashes: reports missing plan and PG files", async () => {
  const result = await runComputePgHashesCli([
    "--plan",
    "/tmp/worldloom-missing-plan.md",
    "--pg",
    "/tmp/worldloom-missing-pg.yaml"
  ]);

  assert.equal(result.exitCode, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Failed to read plan file/);
});

test("cli-compute-pg-hashes: reports malformed YAML", async () => {
  const tmp = makeTmpDir();
  try {
    const planPath = writeText(tmp, "PG-2.md", "Plan bytes\n");
    const pgPath = writeText(tmp, "PG-2.yaml", "id: [unterminated\n");

    const result = await runComputePgHashesCli(["--plan", planPath, "--pg", pgPath]);

    assert.equal(result.exitCode, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /not valid YAML or JSON/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-compute-pg-hashes: computes plan_hash and state_hash from a YAML PG draft", async () => {
  const tmp = makeTmpDir();
  try {
    const planBody = "Final page plan bytes.\nDo not normalize.\n";
    const planPath = writeText(tmp, "PG-2.md", planBody);
    const pgPath = writeText(
      tmp,
      "PG-2.yaml",
      [
        "id: PG-2",
        "story_id: STORY-1",
        "state_hash: placeholder",
        "prose_plan_path: pages-prose-plans/PG-2.md",
        "prose_path: pages-prose/PG-2.md",
        "prose_receipt_path: null",
        "plan:",
        "  plan_hash: placeholder",
        "validation_trace:",
        "  input_legality: 'PASS: checked'",
        "  branch_isolation: 'PASS: checked'",
        ""
      ].join("\n")
    );

    const result = await runComputePgHashesCli(["--plan", planPath, "--pg", pgPath]);
    const output = JSON.parse(result.stdout) as { plan_hash: string; state_hash: string };
    const expectedPlanHash = createHash("sha256")
      .update(Buffer.from(planBody, "utf8"))
      .digest("hex");
    const expectedStateHash = computePgStateHash({
      id: "PG-2",
      story_id: "STORY-1",
      state_hash: "placeholder",
      prose_plan_path: "pages-prose-plans/PG-2.md",
      prose_path: "pages-prose/PG-2.md",
      prose_receipt_path: null,
      plan: {
        plan_hash: expectedPlanHash
      },
      validation_trace: {
        input_legality: "PASS: checked",
        branch_isolation: "PASS: checked"
      }
    });

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    assert.equal(output.plan_hash, expectedPlanHash);
    assert.equal(output.state_hash, expectedStateHash);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
