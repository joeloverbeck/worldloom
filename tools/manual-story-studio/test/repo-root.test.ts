import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { resolveRepoRoot } from "../src/repo-root.js";

function makeTempRoot(prefix: string): string {
  return mkdtempSync(path.join(os.tmpdir(), prefix));
}

function markRepoRoot(repoRoot: string): void {
  mkdirSync(path.join(repoRoot, "worlds"), { recursive: true });
  mkdirSync(path.join(repoRoot, "docs"), { recursive: true });
  writeFileSync(path.join(repoRoot, "docs", "FOUNDATIONS.md"), "# Foundations\n");
}

function compiledEntryPointUrl(repoRoot: string): string {
  return pathToFileURL(
    path.join(repoRoot, "tools", "manual-story-studio", "dist", "src", "cli.js"),
  ).href;
}

test("resolveRepoRoot returns explicit --repo-root value before auto-detection", () => {
  const repoRoot = makeTempRoot("manual-studio-repo-root-");
  const explicit = path.join(repoRoot, "explicit-root");
  const cwdRoot = path.join(repoRoot, "cwd-root");
  try {
    markRepoRoot(cwdRoot);
    mkdirSync(path.join(cwdRoot, "nested"), { recursive: true });

    const result = resolveRepoRoot({
      explicit,
      cwd: path.join(cwdRoot, "nested"),
      entryPointUrl: compiledEntryPointUrl(cwdRoot),
    });

    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value, path.resolve(explicit));
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("resolveRepoRoot walks up from cwd to the nearest marker-bearing repo root", () => {
  const repoRoot = makeTempRoot("manual-studio-repo-root-");
  try {
    markRepoRoot(repoRoot);
    const nested = path.join(repoRoot, "tools", "manual-story-studio");
    mkdirSync(nested, { recursive: true });

    const result = resolveRepoRoot({
      cwd: nested,
      entryPointUrl: compiledEntryPointUrl(path.join(repoRoot, "elsewhere")),
    });

    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value, repoRoot);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("resolveRepoRoot falls back to the compiled entry-point repo root", () => {
  const repoRoot = makeTempRoot("manual-studio-repo-root-");
  const outside = makeTempRoot("manual-studio-outside-");
  try {
    markRepoRoot(repoRoot);

    const result = resolveRepoRoot({
      cwd: outside,
      entryPointUrl: compiledEntryPointUrl(repoRoot),
    });

    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value, repoRoot);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("resolveRepoRoot returns a typed error when no candidate has repo markers", () => {
  const entryPointRoot = makeTempRoot("manual-studio-repo-root-");
  const outside = makeTempRoot("manual-studio-outside-");
  try {
    const result = resolveRepoRoot({
      cwd: outside,
      entryPointUrl: compiledEntryPointUrl(entryPointRoot),
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, "repo_root_not_found");
      assert.equal(result.error.path, path.resolve(outside));
      assert.match(result.error.repair_hint, /--repo-root/);
    }
  } finally {
    rmSync(entryPointRoot, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});
