import assert from "node:assert/strict";
import test from "node:test";

import { runSubmitPatchPlanCli } from "../../src/cli/submit-patch-plan.js";
import { handleSubmitPatchPlanTool } from "../../src/tools/submit-patch-plan.js";

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function buildValidPatchPlan() {
  return {
    plan_id: "plan-001",
    target_world: "seeded",
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "canon-addition",
    expected_id_allocations: {},
    patches: [
      {
        op: "insert_before_node",
        target_world: "seeded",
        target_file: "GEOGRAPHY.md",
        payload: { body: "Brinewick expands." }
      }
    ]
  };
}

function buildMalformedOpPlan() {
  const plan = buildValidPatchPlan();
  plan.patches = [
    { payload: {}, target_world: "seeded", target_file: "GEOGRAPHY.md" } as unknown as ReturnType<
      typeof buildValidPatchPlan
    >["patches"][number]
  ];
  return plan;
}

function makeTmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "world-mcp-cli-submit-"));
}

function writeJson(dir: string, name: string, value: unknown): string {
  const filePath = path.join(dir, name);
  writeFileSync(filePath, JSON.stringify(value), "utf8");
  return filePath;
}

function writeText(dir: string, name: string, value: string): string {
  const filePath = path.join(dir, name);
  writeFileSync(filePath, value, "utf8");
  return filePath;
}

function writeDrafts(dir: string): string {
  return writeJson(dir, "drafts.json", [
    {
      path: "stories/test-story/pages-prose-plans/PG-1.md",
      content: "## 1. Story Kernel Excerpt\n\nMinimal CLI forwarding draft.\n"
    }
  ]);
}

function parseCliStderrJson(stderr: string): unknown {
  const lines = stderr.split("\n").filter((line) => line.length > 0);
  assert.match(lines[0] ?? "", /^\[world-root\] /);
  return JSON.parse(lines.slice(1).join("\n"));
}

test("cli-submit-patch-plan: CLI delegates a malformed envelope to the same engine path as MCP submission", async () => {
  const tmp = makeTmpDir();
  try {
    const planPath = writeJson(tmp, "plan.json", buildValidPatchPlan());
    const tokenPath = writeText(tmp, "token.txt", "unused-for-delegation-proof\n");

    const cliResult = await runSubmitPatchPlanCli([planPath, tokenPath]);
    const mcpResult = await handleSubmitPatchPlanTool({
      patch_plan: buildValidPatchPlan(),
      approval_token: "unused-for-delegation-proof"
    });

    assert.equal(cliResult.exitCode, 1);
    assert.equal(cliResult.stdout, "");
    assert.ok(cliResult.stderr.length > 0);

    assert.ok("code" in mcpResult);
    const cliErr = parseCliStderrJson(cliResult.stderr) as { code: string; message?: string };
    assert.equal(cliErr.code, mcpResult.code);
    assert.equal(cliErr.code, "envelope_shape_invalid");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-submit-patch-plan-errors: CLI surfaces the same invalid_input field when an op is malformed", async () => {
  const tmp = makeTmpDir();
  try {
    const planPath = writeJson(tmp, "plan.json", buildMalformedOpPlan());
    const tokenPath = writeText(tmp, "token.txt", "unused-for-validation-proof");

    const cliResult = await runSubmitPatchPlanCli([planPath, tokenPath]);
    const mcpResult = await handleSubmitPatchPlanTool({
      patch_plan: buildMalformedOpPlan(),
      approval_token: "unused-for-validation-proof"
    });

    assert.equal(cliResult.exitCode, 1);
    assert.ok("code" in mcpResult);
    assert.equal(mcpResult.code, "invalid_input");

    const cliErr = parseCliStderrJson(cliResult.stderr) as { code: string; details?: { field?: string } };
    const mcpErr = mcpResult as { code: string; details?: { field?: string } };
    assert.equal(cliErr.code, "invalid_input");
    assert.equal(cliErr.details?.field, "patch_plan.patches[0].op");
    assert.equal(cliErr.details?.field, mcpErr.details?.field);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-submit-patch-plan-errors: CLI rejects an empty approval token before delegating to the engine", async () => {
  const tmp = makeTmpDir();
  try {
    const planPath = writeJson(tmp, "plan.json", buildValidPatchPlan());
    const tokenPath = writeText(tmp, "token.txt", "   \n\t\n");

    const cliResult = await runSubmitPatchPlanCli([planPath, tokenPath]);

    assert.equal(cliResult.exitCode, 1);
    assert.equal(cliResult.stdout, "");
    assert.match(cliResult.stderr, /Token file .* is empty/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-submit-patch-plan: CLI forwards --page-plan-drafts to the submit handler path", async () => {
  const tmp = makeTmpDir();
  try {
    const planPath = writeJson(tmp, "plan.json", buildValidPatchPlan());
    const tokenPath = writeText(tmp, "token.txt", "unused-for-delegation-proof\n");
    const draftsPath = writeDrafts(tmp);

    const cliResult = await runSubmitPatchPlanCli(["--page-plan-drafts", draftsPath, planPath, tokenPath]);
    const mcpResult = await handleSubmitPatchPlanTool({
      patch_plan: buildValidPatchPlan(),
      approval_token: "unused-for-delegation-proof",
      page_plan_drafts: [
        {
          path: "stories/test-story/pages-prose-plans/PG-1.md",
          content: "## 1. Story Kernel Excerpt\n\nMinimal CLI forwarding draft.\n"
        }
      ]
    });

    assert.equal(cliResult.exitCode, 1);
    assert.ok("code" in mcpResult);
    const cliErr = parseCliStderrJson(cliResult.stderr) as { code: string };
    assert.equal(cliErr.code, mcpResult.code);
    assert.equal(cliErr.code, "envelope_shape_invalid");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-submit-patch-plan-errors: CLI rejects non-array --page-plan-drafts JSON before delegation", async () => {
  const tmp = makeTmpDir();
  try {
    const planPath = writeJson(tmp, "plan.json", buildValidPatchPlan());
    const tokenPath = writeText(tmp, "token.txt", "unused-for-validation-proof");
    const draftsPath = writeJson(tmp, "drafts.json", { path: "stories/test-story/pages-prose-plans/PG-1.md", content: "draft" });

    const cliResult = await runSubmitPatchPlanCli(["--page-plan-drafts", draftsPath, planPath, tokenPath]);

    assert.equal(cliResult.exitCode, 1);
    assert.equal(cliResult.stdout, "");
    assert.match(cliResult.stderr, /Page-plan drafts file .* must contain a JSON array/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-submit-patch-plan-errors: CLI strips trailing whitespace from the approval token before delegation", async () => {
  const tmp = makeTmpDir();
  try {
    const planPath = writeJson(tmp, "plan.json", buildValidPatchPlan());
    const tokenPath = writeText(tmp, "token.txt", "   token-with-whitespace   \n");

    const cliResult = await runSubmitPatchPlanCli([planPath, tokenPath]);
    const mcpResult = await handleSubmitPatchPlanTool({
      patch_plan: buildValidPatchPlan(),
      approval_token: "token-with-whitespace"
    });

    assert.equal(cliResult.exitCode, 1);
    assert.ok("code" in mcpResult);
    const cliErr = parseCliStderrJson(cliResult.stderr) as { code: string };
    assert.equal(cliErr.code, mcpResult.code);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
