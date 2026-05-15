import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runSubmitPatchPlanCli } from "../../src/cli/submit-patch-plan";

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function makeTmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "world-mcp-cli-args-"));
}

async function runCli(args: string[]): Promise<RunResult> {
  const result = await runSubmitPatchPlanCli(args);
  return {
    status: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

test("cli-submit-patch-plan-args: --help prints usage to stdout and exits 0", async () => {
  const result = await runCli(["--help"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: submit-patch-plan/);
  assert.equal(result.stderr, "");
});

test("cli-submit-patch-plan-args: missing <plan-path> prints error and exits 2", async () => {
  const result = await runCli([]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /<plan-path> is required/);
  assert.equal(result.stdout, "");
});

test("cli-submit-patch-plan-args: missing <token-path> prints error and exits 2", async () => {
  const result = await runCli(["/tmp/some-plan.json"]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /<token-path> is required/);
  assert.equal(result.stdout, "");
});

test("cli-submit-patch-plan-args: nonexistent plan file exits 1 with ENOENT-derived message on stderr", async () => {
  const tmp = makeTmpDir();
  try {
    const tokenPath = path.join(tmp, "token.txt");
    writeFileSync(tokenPath, "fake-token", "utf8");

    const planPath = path.join(tmp, "definitely-missing.json");
    const result = await runCli([planPath, tokenPath]);

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Failed to read plan file/);
    assert.match(result.stderr, /ENOENT/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-submit-patch-plan-args: nonexistent token file exits 1 with ENOENT-derived message on stderr", async () => {
  const tmp = makeTmpDir();
  try {
    const planPath = path.join(tmp, "plan.json");
    writeFileSync(planPath, JSON.stringify({ plan_id: "p", target_world: "w", patches: [{}] }), "utf8");

    const tokenPath = path.join(tmp, "definitely-missing.txt");
    const result = await runCli([planPath, tokenPath]);

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Failed to read token file/);
    assert.match(result.stderr, /ENOENT/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-submit-patch-plan-args: malformed JSON in plan file exits 1 with parse-error message on stderr", async () => {
  const tmp = makeTmpDir();
  try {
    const planPath = path.join(tmp, "plan.json");
    writeFileSync(planPath, "{not-actually-json", "utf8");
    const tokenPath = path.join(tmp, "token.txt");
    writeFileSync(tokenPath, "fake-token", "utf8");

    const result = await runCli([planPath, tokenPath]);

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /is not valid JSON/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-submit-patch-plan-args: empty token file exits 1 with empty-token message on stderr", async () => {
  const tmp = makeTmpDir();
  try {
    const planPath = path.join(tmp, "plan.json");
    writeFileSync(
      planPath,
      JSON.stringify({
        plan_id: "p",
        target_world: "w",
        approval_token: "x",
        verdict: "ACCEPT",
        originating_skill: "test",
        expected_id_allocations: {},
        patches: [{ op: "insert_before_node", target_world: "w", target_file: "X.md", payload: {} }]
      }),
      "utf8"
    );
    const tokenPath = path.join(tmp, "token.txt");
    writeFileSync(tokenPath, "   \n\t\n", "utf8");

    const result = await runCli([planPath, tokenPath]);

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Token file .* is empty/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
