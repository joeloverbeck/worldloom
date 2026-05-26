import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import Database from "better-sqlite3";
import { sha256Hex } from "@worldloom/world-index/hash/content";
import { openIndex } from "@worldloom/world-index/index/open";

import { resolveRepoRoot, worldDbPath } from "../src/config/repo-root.js";
import { resolveIndexStatus } from "../src/read/index-status.js";

function createTempRepo(): string {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-index-status-"));
  mkdirSync(path.join(repoRoot, ".git"));
  mkdirSync(path.join(repoRoot, "worlds"), { recursive: true });
  return repoRoot;
}

function createWorld(repoRoot: string, worldSlug = "fixture-world"): string {
  const worldRoot = path.join(repoRoot, "worlds", worldSlug);
  mkdirSync(path.join(worldRoot, "_index"), { recursive: true });
  return worldRoot;
}

function createIndex(repoRoot: string, worldSlug: string): Database.Database {
  return openIndex(repoRoot, worldSlug);
}

function createMismatchedIndex(repoRoot: string, worldSlug: string, version = 999): Database.Database {
  const indexDir = path.join(repoRoot, "worlds", worldSlug, "_index");
  mkdirSync(indexDir, { recursive: true });
  writeFileSync(path.join(indexDir, "index_version.txt"), `${version}\n`, "utf8");

  const db = new Database(path.join(indexDir, "world.db"));
  db.exec(`
    CREATE TABLE nodes (
      node_id TEXT PRIMARY KEY,
      world_slug TEXT NOT NULL,
      file_path TEXT NOT NULL,
      heading_path TEXT,
      byte_start INTEGER NOT NULL,
      byte_end INTEGER NOT NULL,
      line_start INTEGER NOT NULL,
      line_end INTEGER NOT NULL,
      node_type TEXT NOT NULL,
      body TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      anchor_checksum TEXT NOT NULL,
      summary TEXT,
      created_at_index_version INTEGER NOT NULL
    );
    CREATE TABLE file_versions (
      world_slug TEXT NOT NULL,
      file_path TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      last_indexed_at TEXT NOT NULL,
      PRIMARY KEY (world_slug, file_path)
    );
  `);
  return db;
}

function insertNode(db: Database.Database, worldSlug: string, filePath: string, contentHash: string): void {
  db.prepare(`
    INSERT INTO nodes (
      node_id,
      world_slug,
      file_path,
      heading_path,
      byte_start,
      byte_end,
      line_start,
      line_end,
      node_type,
      body,
      content_hash,
      anchor_checksum,
      summary,
      created_at_index_version
    )
    VALUES (
      @node_id,
      @world_slug,
      @file_path,
      NULL,
      0,
      0,
      1,
      1,
      'fixture',
      'body',
      @content_hash,
      'anchor',
      NULL,
      1
    )
  `).run({
    node_id: `${filePath}#node`,
    world_slug: worldSlug,
    file_path: filePath,
    content_hash: contentHash,
  });

  db.prepare(`
    INSERT INTO file_versions (world_slug, file_path, content_hash, last_indexed_at)
    VALUES (?, ?, ?, ?)
  `).run(worldSlug, filePath, contentHash, "2026-05-26T00:00:00.000Z");
}

test("resolveIndexStatus returns missing when the world index is absent", () => {
  const repoRoot = createTempRepo();
  mkdirSync(path.join(repoRoot, "worlds", "fixture-world"), { recursive: true });

  assert.deepEqual(resolveIndexStatus("fixture-world", repoRoot), {
    kind: "missing",
    remedy: "Run `world-index build fixture-world` to enable indexed reads.",
  });
});

test("resolveIndexStatus returns version_mismatch for incompatible index versions", () => {
  const repoRoot = createTempRepo();
  createWorld(repoRoot);
  const db = createMismatchedIndex(repoRoot, "fixture-world", 999);
  db.close();

  assert.deepEqual(resolveIndexStatus("fixture-world", repoRoot), {
    kind: "version_mismatch",
    expected: 7,
    found: 999,
    remedy: "Run `world-index build fixture-world` to rebuild the index.",
  });
});

test("resolveIndexStatus returns empty when the index has no nodes", () => {
  const repoRoot = createTempRepo();
  createWorld(repoRoot);
  const db = createIndex(repoRoot, "fixture-world");
  db.close();

  assert.deepEqual(resolveIndexStatus("fixture-world", repoRoot), {
    kind: "empty",
    remedy: "Run `world-index build fixture-world` to rebuild the index.",
  });
});

test("resolveIndexStatus returns stale with drifted file paths", () => {
  const repoRoot = createTempRepo();
  const worldRoot = createWorld(repoRoot);
  const sourcePath = path.join(worldRoot, "WORLD_KERNEL.md");
  writeFileSync(sourcePath, "changed body\n", "utf8");
  const db = createIndex(repoRoot, "fixture-world");
  insertNode(db, "fixture-world", "WORLD_KERNEL.md", "old-hash");
  db.close();

  assert.deepEqual(resolveIndexStatus("fixture-world", repoRoot), {
    kind: "stale",
    driftedFiles: ["WORLD_KERNEL.md"],
    remedy: "Run `world-index sync fixture-world` to refresh indexed reads.",
  });
});

test("resolveIndexStatus returns fresh with the recorded index version", () => {
  const repoRoot = createTempRepo();
  const worldRoot = createWorld(repoRoot);
  const sourcePath = path.join(worldRoot, "WORLD_KERNEL.md");
  writeFileSync(sourcePath, "stable body\n", "utf8");
  const contentHash = sha256Hex("stable body\n");
  const db = createIndex(repoRoot, "fixture-world");
  insertNode(db, "fixture-world", "WORLD_KERNEL.md", contentHash);
  db.close();

  assert.deepEqual(resolveIndexStatus("fixture-world", repoRoot), { kind: "fresh", version: 7 });
});

test("resolveIndexStatus returns open_failed for unreadable database files", () => {
  const repoRoot = createTempRepo();
  const worldRoot = createWorld(repoRoot);
  writeFileSync(path.join(worldRoot, "_index", "index_version.txt"), "1\n", "utf8");
  writeFileSync(path.join(worldRoot, "_index", "world.db"), "not sqlite", "utf8");

  const status = resolveIndexStatus("fixture-world", repoRoot);
  assert.equal(status.kind, "open_failed");
  assert.match(status.error, /file is not a database|database disk image is malformed/);
});

test("resolveRepoRoot resolves a worktree-style root from nested directories", () => {
  const repoRoot = createTempRepo();
  const nested = path.join(repoRoot, ".claude", "worktrees", "SPEC87STOEXPBAC", "tools", "story-explorer");
  mkdirSync(nested, { recursive: true });

  assert.equal(resolveRepoRoot(nested), repoRoot);
});

test("worldDbPath returns an absolute world.db path under the repo root", () => {
  const repoRoot = createTempRepo();
  const dbPath = worldDbPath("erotica-world", repoRoot);

  assert.equal(path.isAbsolute(dbPath), true);
  assert.equal(dbPath.endsWith("worlds/erotica-world/_index/world.db"), true);
});

test("compiled IndexStatus type source exposes the six SPEC-87 variants", () => {
  const source = readFileSync(new URL("../src/view-models/index-status.d.ts", import.meta.url), "utf8");

  for (const variant of ["fresh", "missing", "version_mismatch", "empty", "stale", "open_failed"]) {
    assert.match(source, new RegExp(`kind: "${variant}"`));
  }
});
