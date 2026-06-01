import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { enumerateWorlds } from "../../src/read/worlds.js";
import type { ReadResult } from "../../src/read/result.js";
import type { WorldEntry } from "../../src/read/worlds.js";

function createFixtureRepoRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), "manual-studio-worlds-"));
}

function unwrap(result: ReadResult<WorldEntry[]>): WorldEntry[] {
  if (!result.ok) assert.fail(`expected ok result, got ${result.error.code}`);
  return result.value;
}

test("enumerateWorlds returns empty array when worlds/ directory is absent", () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    assert.deepEqual(unwrap(enumerateWorlds(repoRoot)), []);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("enumerateWorlds lists only directories that contain a WORLD_KERNEL.md", () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    const worldsRoot = path.join(repoRoot, "worlds");
    mkdirSync(path.join(worldsRoot, "alpha-world"), { recursive: true });
    writeFileSync(path.join(worldsRoot, "alpha-world", "WORLD_KERNEL.md"), "# Alpha\n");
    mkdirSync(path.join(worldsRoot, "beta-world"), { recursive: true });
    writeFileSync(path.join(worldsRoot, "beta-world", "WORLD_KERNEL.md"), "# Beta\n");
    mkdirSync(path.join(worldsRoot, "not-a-world"), { recursive: true });

    const results = unwrap(enumerateWorlds(repoRoot));

    assert.equal(results.length, 2);
    assert.equal(results[0]?.worldSlug, "alpha-world");
    assert.equal(results[0]?.hasWorldKernel, true);
    assert.equal(results[1]?.worldSlug, "beta-world");
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("enumerateWorlds skips directories whose names don't match the slug pattern", () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    const worldsRoot = path.join(repoRoot, "worlds");
    mkdirSync(path.join(worldsRoot, "World!"), { recursive: true });
    writeFileSync(path.join(worldsRoot, "World!", "WORLD_KERNEL.md"), "# Bad\n");
    mkdirSync(path.join(worldsRoot, "Bad Spaces"), { recursive: true });
    writeFileSync(path.join(worldsRoot, "Bad Spaces", "WORLD_KERNEL.md"), "# Bad\n");
    mkdirSync(path.join(worldsRoot, "valid-world"), { recursive: true });
    writeFileSync(path.join(worldsRoot, "valid-world", "WORLD_KERNEL.md"), "# Valid\n");

    const results = unwrap(enumerateWorlds(repoRoot));

    assert.equal(results.length, 1);
    assert.equal(results[0]?.worldSlug, "valid-world");
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
