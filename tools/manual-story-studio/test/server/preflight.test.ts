import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { err } from "../../src/read/result.js";
import {
  assertRepoRootBootPreflight,
  formatStartupReadError,
} from "../../src/server/preflight.js";

function makeTempRoot(prefix: string): string {
  return mkdtempSync(path.join(os.tmpdir(), prefix));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("assertRepoRootBootPreflight fails loudly when worlds/ is missing", () => {
  const repoRoot = makeTempRoot("manual-studio-preflight-");
  try {
    assert.throws(
      () => assertRepoRootBootPreflight(repoRoot),
      (error) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /Invalid Manual Story Studio repo root/);
        assert.match(error.message, new RegExp(escapeRegExp(repoRoot)));
        assert.match(error.message, /Missing worlds directory/);
        assert.match(error.message, /--repo-root/);
        return true;
      },
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("assertRepoRootBootPreflight accepts a valid repo root with worlds", () => {
  const repoRoot = makeTempRoot("manual-studio-preflight-");
  try {
    mkdirSync(path.join(repoRoot, "worlds", "alpha-world"), { recursive: true });

    assert.doesNotThrow(() => assertRepoRootBootPreflight(repoRoot));
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("assertRepoRootBootPreflight accepts an existing but empty worlds directory", () => {
  const repoRoot = makeTempRoot("manual-studio-preflight-");
  try {
    mkdirSync(path.join(repoRoot, "worlds"), { recursive: true });

    assert.doesNotThrow(() => assertRepoRootBootPreflight(repoRoot));
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("formatStartupReadError includes resolver candidates for typed root errors", () => {
  const result = err({
    code: "repo_root_not_found",
    path: "/tmp/not-a-repo",
    cause: { candidates: ["/tmp/not-a-repo", "/repo/from-entrypoint"] },
    repair_hint: "Run from the worldloom repo root or pass --repo-root.",
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    const message = formatStartupReadError(result.error);
    assert.match(message, /repo_root_not_found/);
    assert.match(message, /\/tmp\/not-a-repo/);
    assert.match(message, /\/repo\/from-entrypoint/);
    assert.match(message, /--repo-root/);
  }
});
