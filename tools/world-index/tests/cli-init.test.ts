import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

const cliPath = path.resolve(import.meta.dirname, "..", "src", "cli.js");

function createTempRepo(): string {
  return mkdtempSync(path.join(os.tmpdir(), "world-index-init-"));
}

function cleanup(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

function runCli(root: string, args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    encoding: "utf8"
  });
}

test("init creates an empty schema-applied world index", () => {
  const root = createTempRepo();

  try {
    const result = runCli(root, ["init", "test-slug"]);
    assert.equal(result.status, 0);
    assert.equal(result.stderr.trim(), "");
    assert.match(
      result.stdout,
      /Initialized empty world index at worlds[/\\]test-slug[/\\]_index[/\\]world\.db/
    );

    const dbPath = path.join(root, "worlds", "test-slug", "_index", "world.db");
    const db = new Database(dbPath, { readonly: true });
    try {
      const nodeTable = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'nodes'")
        .get() as { name: string } | undefined;
      assert.equal(nodeTable?.name, "nodes");

      const nodeCount = db.prepare("SELECT COUNT(*) AS count FROM nodes").get() as {
        count: number;
      };
      assert.equal(nodeCount.count, 0);
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});

test("init rejects an existing world index", () => {
  const root = createTempRepo();

  try {
    assert.equal(runCli(root, ["init", "test-slug"]).status, 0);

    const result = runCli(root, ["init", "test-slug"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /world_index_already_exists/);
    assert.equal(result.stdout.trim(), "");
  } finally {
    cleanup(root);
  }
});

test("init rejects invalid world slugs", () => {
  const root = createTempRepo();

  try {
    const result = runCli(root, ["init", "Invalid_Slug"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /invalid_world_slug/);
    assert.equal(result.stdout.trim(), "");
  } finally {
    cleanup(root);
  }
});

test("help lists init", () => {
  const root = createTempRepo();

  try {
    const result = runCli(root, ["--help"]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /init <world-slug>/);
    assert.equal(result.stderr.trim(), "");
  } finally {
    cleanup(root);
  }
});
