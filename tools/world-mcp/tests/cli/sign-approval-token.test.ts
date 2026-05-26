import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseToken } from "../../src/approval/token.js";
import { runSignApprovalTokenCli } from "../../src/cli/sign-approval-token.js";

function makeRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-mcp-sign-root-"));
  mkdirSync(path.join(root, "docs"), { recursive: true });
  mkdirSync(path.join(root, "tools", "world-mcp"), { recursive: true });
  mkdirSync(path.join(root, "worlds"), { recursive: true });
  writeFileSync(path.join(root, "docs", "FOUNDATIONS.md"), "# Foundations\n", "utf8");
  return root;
}

test("cli-sign-approval-token: --world-root selects the secret root and emits a trace", () => {
  const root = makeRoot();
  const tmp = mkdtempSync(path.join(os.tmpdir(), "world-mcp-sign-plan-"));
  const planPath = path.join(tmp, "plan.json");
  writeFileSync(
    planPath,
    JSON.stringify({
      plan_id: "plan-001",
      target_world: "seeded",
      patches: [
        {
          op: "insert_before_node",
          target_world: "seeded",
          target_file: "WORLD_KERNEL.md",
          payload: { body: "Example." }
        }
      ]
    }),
    "utf8"
  );

  try {
    const result = runSignApprovalTokenCli(["--world-root", root, planPath]);

    assert.equal(result.exitCode, 0);
    assert.match(result.stderr, new RegExp(`^\\[world-root\\] ${escapeRegExp(root)} \\(source: explicit_flag\\)`));
    const parsed = parseToken(result.stdout.trim());
    assert.equal(parsed.payload.plan_id, "plan-001");
    assert.equal(parsed.payload.world_slug, "seeded");
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(tmp, { recursive: true, force: true });
  }
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
