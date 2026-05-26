import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { resolveWorldRoot } from "../src/cli-world-root.js";

function makeRoot(prefix = "world-index-root-"): string {
  const root = mkdtempSync(path.join(os.tmpdir(), prefix));
  mkdirSync(path.join(root, "docs"), { recursive: true });
  mkdirSync(path.join(root, "worlds"), { recursive: true });
  writeFileSync(path.join(root, "docs", "FOUNDATIONS.md"), "# Foundations\n", "utf8");
  return root;
}

test("resolveWorldRoot: explicit flag wins over env var and cwd discovery", () => {
  const flagRoot = makeRoot();
  const envRoot = makeRoot();
  const cwdRoot = makeRoot();
  const nested = path.join(cwdRoot, "tools", "world-index", "dist");
  mkdirSync(nested, { recursive: true });

  try {
    const resolved = resolveWorldRoot({ flag: flagRoot, envVar: envRoot, cwd: nested });

    assert.equal(resolved.ok, true);
    assert.equal(resolved.ok ? resolved.worldRoot : "", flagRoot);
    assert.equal(resolved.ok ? resolved.source : "", "explicit_flag");
  } finally {
    rmSync(flagRoot, { recursive: true, force: true });
    rmSync(envRoot, { recursive: true, force: true });
    rmSync(cwdRoot, { recursive: true, force: true });
  }
});

test("resolveWorldRoot: env var wins over auto-discovery when no flag is present", () => {
  const envRoot = makeRoot();
  const cwdRoot = makeRoot();
  const nested = path.join(cwdRoot, "tools", "world-index");
  mkdirSync(nested, { recursive: true });

  try {
    const resolved = resolveWorldRoot({ envVar: envRoot, cwd: nested });

    assert.equal(resolved.ok, true);
    assert.equal(resolved.ok ? resolved.worldRoot : "", envRoot);
    assert.equal(resolved.ok ? resolved.source : "", "env_var");
  } finally {
    rmSync(envRoot, { recursive: true, force: true });
    rmSync(cwdRoot, { recursive: true, force: true });
  }
});

test("resolveWorldRoot: auto-discovery walks upward and requires both markers", () => {
  const root = makeRoot();
  const nested = path.join(root, "tools", "world-index", "dist");
  mkdirSync(nested, { recursive: true });

  try {
    const resolved = resolveWorldRoot({ cwd: nested });

    assert.equal(resolved.ok, true);
    assert.equal(resolved.ok ? resolved.worldRoot : "", root);
    assert.equal(resolved.ok ? resolved.source : "", "auto_discovery");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("resolveWorldRoot: invalid explicit flag fails without falling back", () => {
  const invalidFlagRoot = mkdtempSync(path.join(os.tmpdir(), "world-index-invalid-root-"));
  const envRoot = makeRoot();

  try {
    const resolved = resolveWorldRoot({ flag: invalidFlagRoot, envVar: envRoot, cwd: envRoot });

    assert.equal(resolved.ok, false);
    assert.match(resolved.ok ? "" : resolved.message, /--world-root=.*not a valid worldloom project root/);
    assert.deepEqual(resolved.attempted, [`--world-root=${invalidFlagRoot}`]);
  } finally {
    rmSync(invalidFlagRoot, { recursive: true, force: true });
    rmSync(envRoot, { recursive: true, force: true });
  }
});

test("resolveWorldRoot: missing markers produce a clear attempted-path failure", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-no-markers-"));
  const nested = path.join(root, "child");
  mkdirSync(nested, { recursive: true });

  try {
    const resolved = resolveWorldRoot({ cwd: nested });

    assert.equal(resolved.ok, false);
    assert.match(resolved.ok ? "" : resolved.message, /World root resolution failed/);
    assert.ok(resolved.attempted.some((entry) => entry === `auto-discovery: ${nested}`));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
