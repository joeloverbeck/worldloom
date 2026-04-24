import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";
import { CURRENT_INDEX_VERSION } from "@worldloom/world-index/public/types";

import { openIndexDb } from "../../src/db/open";

function createTempRepoRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-mcp-open-"));
  mkdirSync(path.join(root, "tools", "world-mcp"), { recursive: true });
  mkdirSync(path.join(root, "worlds"), { recursive: true });
  writeFileSync(path.join(root, "tools", "world-mcp", "package.json"), "{\n}\n", "utf8");
  return root;
}

function withRepoRoot<T>(root: string, run: () => T): T {
  const originalCwd = process.cwd();

  try {
    process.chdir(path.join(root, "tools", "world-mcp"));
    return run();
  } finally {
    process.chdir(originalCwd);
  }
}

function createSeededIndex(
  root: string,
  worldSlug: string,
  options?: {
    version?: string;
    nodeCount?: number;
    trackedFiles?: Array<{ filePath: string; content: string; lastIndexedAt: string; contentHash?: string }>;
  }
): string {
  const worldRoot = path.join(root, "worlds", worldSlug);
  const indexRoot = path.join(worldRoot, "_index");
  mkdirSync(indexRoot, { recursive: true });

  writeFileSync(
    path.join(indexRoot, "index_version.txt"),
    `${options?.version ?? String(CURRENT_INDEX_VERSION)}\n`,
    "utf8"
  );

  const dbPath = path.join(indexRoot, "world.db");
  const db = new Database(dbPath);

  try {
    db.exec(`
      CREATE TABLE nodes (
        node_id TEXT PRIMARY KEY
      );
      CREATE TABLE file_versions (
        world_slug TEXT NOT NULL,
        file_path TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        last_indexed_at TEXT NOT NULL,
        PRIMARY KEY (world_slug, file_path)
      );
    `);

    const nodeCount = options?.nodeCount ?? 1;
    for (let index = 0; index < nodeCount; index += 1) {
      db.prepare("INSERT INTO nodes (node_id) VALUES (?)").run(`node-${index + 1}`);
    }

    for (const file of options?.trackedFiles ?? []) {
      const absolutePath = path.join(worldRoot, file.filePath);
      mkdirSync(path.dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, file.content, "utf8");
      db.prepare(
        `
          INSERT INTO file_versions (world_slug, file_path, content_hash, last_indexed_at)
          VALUES (?, ?, ?, ?)
        `
      ).run(
        worldSlug,
        file.filePath,
        file.contentHash ?? hashFileContents(file.content),
        file.lastIndexedAt
      );
    }
  } finally {
    db.close();
  }

  return dbPath;
}

function hashFileContents(source: string): string {
  return createHash("sha256").update(source.normalize("NFC"), "utf8").digest("hex");
}

test("openIndexDb returns world_not_found when the world directory is absent", () => {
  const root = createTempRepoRoot();

  try {
    const result = withRepoRoot(root, () => openIndexDb("missing-world"));
    assert.deepEqual(result, {
      code: "world_not_found",
      message: "World 'missing-world' does not exist.",
      details: { world_slug: "missing-world" }
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("openIndexDb returns index_missing when the world exists without world.db", () => {
  const root = createTempRepoRoot();
  mkdirSync(path.join(root, "worlds", "seeded"), { recursive: true });

  try {
    const result = withRepoRoot(root, () => openIndexDb("seeded"));
    assert.ok("code" in result);
    assert.equal(result.code, "index_missing");
    assert.equal(result.details?.world_slug, "seeded");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("openIndexDb returns index_version_mismatch for a mismatched sidecar version", () => {
  const root = createTempRepoRoot();
  createSeededIndex(root, "seeded", { version: "999" });

  try {
    const result = withRepoRoot(root, () => openIndexDb("seeded"));
    assert.deepEqual(result, {
      code: "index_version_mismatch",
      message: "World index schema version does not match the retrieval server expectation.",
      details: {
        expected: String(CURRENT_INDEX_VERSION),
        actual: "999",
        remedy: "run world-index build"
      }
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("openIndexDb returns empty_index when the index contains zero nodes", () => {
  const root = createTempRepoRoot();
  createSeededIndex(root, "seeded", { nodeCount: 0 });

  try {
    const result = withRepoRoot(root, () => openIndexDb("seeded"));
    assert.deepEqual(result, {
      code: "empty_index",
      message: "World index for 'seeded' contains zero nodes.",
      details: { world_slug: "seeded" }
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("openIndexDb returns stale_index when a tracked file drift is confirmed", () => {
  const root = createTempRepoRoot();
  createSeededIndex(root, "seeded", {
    trackedFiles: [
      {
        filePath: "INVARIANTS.md",
        content: "original\n",
        contentHash: hashFileContents("stale\n"),
        lastIndexedAt: "2026-01-01T00:00:00.000Z"
      }
    ]
  });

  const sourcePath = path.join(root, "worlds", "seeded", "INVARIANTS.md");
  utimesSync(sourcePath, new Date("2026-02-01T00:00:00.000Z"), new Date("2026-02-01T00:00:00.000Z"));

  try {
    const result = withRepoRoot(root, () => openIndexDb("seeded"));
    assert.deepEqual(result, {
      code: "stale_index",
      message: "World index for 'seeded' is stale relative to source files.",
      details: {
        world_slug: "seeded",
        drifted_files: ["INVARIANTS.md"],
        remedy: "run world-index sync"
      }
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("openIndexDb honors WORLDLOOM_MCP_FULL_HASH_DRIFT_CHECK for unchanged mtimes", () => {
  const root = createTempRepoRoot();
  createSeededIndex(root, "seeded", {
    trackedFiles: [
      {
        filePath: "WORLD_KERNEL.md",
        content: "current\n",
        contentHash: hashFileContents("indexed\n"),
        lastIndexedAt: "2026-03-01T00:00:00.000Z"
      }
    ]
  });

  const sourcePath = path.join(root, "worlds", "seeded", "WORLD_KERNEL.md");
  utimesSync(sourcePath, new Date("2026-02-01T00:00:00.000Z"), new Date("2026-02-01T00:00:00.000Z"));

  const originalFlag = process.env.WORLDLOOM_MCP_FULL_HASH_DRIFT_CHECK;
  process.env.WORLDLOOM_MCP_FULL_HASH_DRIFT_CHECK = "1";

  try {
    const result = withRepoRoot(root, () => openIndexDb("seeded"));
    assert.ok("code" in result);
    assert.equal(result.code, "stale_index");
    assert.deepEqual(result.details?.drifted_files, ["WORLD_KERNEL.md"]);
  } finally {
    if (originalFlag === undefined) {
      delete process.env.WORLDLOOM_MCP_FULL_HASH_DRIFT_CHECK;
    } else {
      process.env.WORLDLOOM_MCP_FULL_HASH_DRIFT_CHECK = originalFlag;
    }
    rmSync(root, { recursive: true, force: true });
  }
});

test("openIndexDb ignores missing atomized logical files when atomic source records are present", () => {
  const root = createTempRepoRoot();
  const dbPath = createSeededIndex(root, "seeded");
  mkdirSync(path.join(root, "worlds", "seeded", "_source", "canon"), { recursive: true });
  writeFileSync(path.join(root, "worlds", "seeded", "_source", "canon", "CF-0001.yaml"), "id: CF-0001\n", "utf8");

  const db = new Database(dbPath);
  try {
    db.prepare(
      `
        INSERT INTO file_versions (world_slug, file_path, content_hash, last_indexed_at)
        VALUES (?, ?, ?, ?)
      `
    ).run(
      "seeded",
      "CANON_LEDGER.md",
      hashFileContents("Logical atomized world concern: CANON_LEDGER.md"),
      "2026-04-01T00:00:00.000Z"
    );
  } finally {
    db.close();
  }

  try {
    const result = withRepoRoot(root, () => openIndexDb("seeded"));
    assert.ok("db" in result);
    result.db.close();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("openIndexDb returns a read-only handle when all lifecycle checks pass", () => {
  const root = createTempRepoRoot();
  createSeededIndex(root, "seeded", {
    trackedFiles: [
      {
        filePath: "INSTITUTIONS.md",
        content: "stable\n",
        lastIndexedAt: "2026-04-01T00:00:00.000Z"
      }
    ]
  });

  const sourcePath = path.join(root, "worlds", "seeded", "INSTITUTIONS.md");
  utimesSync(sourcePath, new Date("2026-03-01T00:00:00.000Z"), new Date("2026-03-01T00:00:00.000Z"));

  try {
    const result = withRepoRoot(root, () => openIndexDb("seeded"));
    assert.ok("db" in result);

    try {
      const row = result.db.prepare("SELECT COUNT(*) AS count FROM nodes").get() as { count: number };
      assert.equal(row.count, 1);
      assert.throws(() => result.db.exec("INSERT INTO nodes (node_id) VALUES ('node-2')"));
    } finally {
      result.db.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
