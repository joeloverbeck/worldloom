import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runValidatePatchPlanCli } from "../../src/cli/validate-patch-plan";
import { validatePatchPlan } from "../../src/tools/validate-patch-plan";
import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..", "..");
const CLI_SCRIPT = path.join(REPO_ROOT, "tools", "world-mcp", "dist", "src", "cli", "validate-patch-plan.js");

function buildValidPatchPlan() {
  return {
    plan_id: "plan-001",
    target_world: "seeded",
    approval_token: "placeholder",
    verdict: "ACCEPT",
    originating_skill: "canon-addition",
    expected_id_allocations: {},
    patches: [
      {
        op: "create_cf_record",
        target_world: "seeded",
        target_file: "_source/canon/CF-0001.yaml",
        payload: {
          cf_record: {
            id: "CF-0001",
            title: "Brinewick Harbor Office",
            status: "hard_canon",
            type: "institution",
            statement: "Brinewick maintains a harbor office.",
            scope: { geographic: "local", temporal: "current", social: "public" },
            truth_scope: { world_level: true, diegetic_status: "objective" },
            domains_affected: ["law"],
            prerequisites: ["appointed clerks"],
            distribution: {
              who_can_do_it: ["clerks"],
              who_cannot_easily_do_it: ["outsiders"],
              why_not_universal: ["requires harbor appointment"]
            },
            costs_and_limits: ["bounded staff time"],
            visible_consequences: ["posted ledgers"],
            required_world_updates: ["INSTITUTIONS"],
            source_basis: { direct_user_approval: true, derived_from: [] },
            contradiction_risk: { hard: false, soft: false },
            notes: "None",
            extensions: []
          }
        }
      },
      {
        op: "create_sec_record",
        target_world: "seeded",
        target_file: "_source/institutions/SEC-INS-001.yaml",
        payload: {
          sec_record: {
            id: "SEC-INS-001",
            file_class: "INSTITUTIONS",
            order: 1,
            heading: "Harbor Office",
            heading_level: 2,
            body: "Brinewick maintains a harbor office.",
            extensions: [],
            touched_by_cf: ["CF-0001"]
          }
        }
      }
    ]
  };
}

function buildFailingPatchPlan() {
  const plan = buildValidPatchPlan();
  (plan.patches[0]!.payload as any).cf_record.distribution.why_not_universal = [];
  return plan;
}

function buildSkippedPatchPlan() {
  const plan = buildValidPatchPlan();
  plan.patches[0]!.target_file = "";
  return plan;
}

function makeTmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "world-mcp-cli-validate-"));
}

function writeJson(dir: string, name: string, value: unknown): string {
  const filePath = path.join(dir, name);
  writeFileSync(filePath, JSON.stringify(value), "utf8");
  return filePath;
}

function seedEmptyWorld(root: string): void {
  seedWorld(root, { worldSlug: "seeded", nodes: [] });
}

test("cli-validate-patch-plan: CLI delegates pass results to the same validate handler", async () => {
  const root = createTempRepoRoot();
  const tmp = makeTmpDir();
  seedEmptyWorld(root);

  try {
    const plan = buildValidPatchPlan();
    const planPath = writeJson(tmp, "plan.json", plan);

    const cliResult = await withRepoRoot(root, () => runValidatePatchPlanCli([planPath]));
    const mcpResult = await withRepoRoot(root, () => validatePatchPlan({ patch_plan: plan }));

    assert.equal(cliResult.exitCode, 0);
    assert.equal(cliResult.stderr, "");
    assert.deepEqual(JSON.parse(cliResult.stdout), mcpResult);
    assert.deepEqual(mcpResult, { status: "pass", verdicts: [] });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
    destroyTempRepoRoot(root);
  }
});

test("cli-validate-patch-plan: CLI exits 1 and prints fail status on validator failures", async () => {
  const root = createTempRepoRoot();
  const tmp = makeTmpDir();
  seedEmptyWorld(root);

  try {
    const plan = buildFailingPatchPlan();
    const planPath = writeJson(tmp, "plan.json", plan);

    const cliResult = await withRepoRoot(root, () => runValidatePatchPlanCli([planPath]));
    const mcpResult = await withRepoRoot(root, () => validatePatchPlan({ patch_plan: plan }));

    assert.equal(cliResult.exitCode, 1);
    assert.equal(cliResult.stdout, "");
    assert.deepEqual(JSON.parse(cliResult.stderr), mcpResult);
    assert.ok("status" in mcpResult);
    assert.equal(mcpResult.status, "fail");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
    destroyTempRepoRoot(root);
  }
});

test("cli-validate-patch-plan: CLI exits 1 and prints skipped status for malformed envelopes", async () => {
  const tmp = makeTmpDir();

  try {
    const planPath = writeJson(tmp, "plan.json", buildSkippedPatchPlan());

    const cliResult = await runValidatePatchPlanCli([planPath]);

    assert.equal(cliResult.exitCode, 1);
    assert.equal(cliResult.stdout, "");
    const status = JSON.parse(cliResult.stderr) as { status: string; reason?: string };
    assert.equal(status.status, "skipped");
    assert.match(status.reason ?? "", /patch_plan\.patches\[0\]\.target_file/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-validate-patch-plan: --help prints usage to stdout and exits 0", () => {
  const result = spawnSync("node", [CLI_SCRIPT, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: validate-patch-plan/);
  assert.equal(result.stderr, "");
});

test("cli-validate-patch-plan: missing plan path exits 2", () => {
  const result = spawnSync("node", [CLI_SCRIPT], {
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /<plan-path> is required/);
});

test("cli-validate-patch-plan: nonexistent plan file exits 1", () => {
  const tmp = makeTmpDir();
  try {
    const planPath = path.join(tmp, "missing.json");
    const result = spawnSync("node", [CLI_SCRIPT, planPath], {
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Failed to read plan file/);
    assert.match(result.stderr, /ENOENT/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-validate-patch-plan: malformed JSON exits 1", () => {
  const tmp = makeTmpDir();
  try {
    const planPath = path.join(tmp, "plan.json");
    writeFileSync(planPath, "{not-json", "utf8");
    const result = spawnSync("node", [CLI_SCRIPT, planPath], {
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /is not valid JSON/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
