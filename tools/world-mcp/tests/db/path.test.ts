import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { resolveRepoRoot, resolveWorldDbPath } from "../../src/db/path";

function createTempRepoRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-mcp-path-"));
  mkdirSync(path.join(root, "tools", "world-mcp"), { recursive: true });
  mkdirSync(path.join(root, "worlds"), { recursive: true });
  writeFileSync(path.join(root, "tools", "world-mcp", "package.json"), "{\n}\n", "utf8");
  return root;
}

test("resolveWorldDbPath uses the discovered repo root without a config knob", () => {
  const root = createTempRepoRoot();
  const originalCwd = process.cwd();

  try {
    process.chdir(path.join(root, "tools", "world-mcp"));
    assert.equal(resolveRepoRoot(), root);
    assert.equal(
      resolveWorldDbPath("animalia"),
      path.join(root, "worlds", "animalia", "_index", "world.db")
    );
  } finally {
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
});

