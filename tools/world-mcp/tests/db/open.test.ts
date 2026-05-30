import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";
import {
  buildWorldIndex,
  CURRENT_INDEX_VERSION,
  syncWorldIndex
} from "../../src/package-interop.js";

import { openIndexDb } from "../../src/db/open.js";

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

// ---------------------------------------------------------------------------
// IDXSYNC-002 convergence + soundness regression tests
//
// These exercise the full build/sync → openIndexDb pipeline against a real
// minimal atomic world to verify that incremental `sync` converges to a
// freshness-equivalent state as a full `build` (FOUNDATIONS.md §Canonical
// Storage Layer), and that the file-level drift token is raw-bytes-based on
// both the writer (world-index) and the reader (world-mcp staleness checker).
// ---------------------------------------------------------------------------

interface MinimalAtomicWorldOptions {
  canonicalBytes: boolean;
}

function createMinimalAtomicWorld(
  root: string,
  worldSlug: string,
  options: MinimalAtomicWorldOptions
): string {
  const world = path.join(root, "worlds", worldSlug);
  mkdirSync(path.join(world, "_source", "canon"), { recursive: true });
  writeFileSync(path.join(world, "WORLD_KERNEL.md"), "# Minimal World\n", "utf8");
  writeFileSync(
    path.join(world, "ONTOLOGY.md"),
    [
      "# Ontology",
      "",
      "## Categories in Use",
      "",
      "- institution",
      "",
      "## Relation Types in Use",
      "",
      "- governs",
      "",
      "## Notes on Use",
      "",
      "Minimal fixture for IDXSYNC-002 convergence tests."
    ].join("\n"),
    "utf8"
  );

  const cfBody = [
    "id: CF-1",
    "title: Minimal canon fact",
    "status: hard_canon",
    "type: institution",
    "statement: Minimal fixture for convergence tests.",
    "scope:",
    "  geographic: local",
    "  temporal: current",
    "  social: public",
    "truth_scope:",
    "  world_level: true",
    "  diegetic_status: objective",
    "domains_affected: [institutions]",
    "required_world_updates: [INSTITUTIONS]",
    "source_basis:",
    "  direct_user_approval: true",
    "modification_history: []"
  ].join("\n");

  // When canonicalBytes=false, write the file in a form whose raw bytes
  // diverge from world-index's prose-whitespace-normalized basis: trailing
  // whitespace on a line plus extra trailing newlines. The YAML still parses
  // identically; only the bytes differ. This is the exact shape that pre-fix
  // produced perpetual false-drift because the writer stored
  // contentHashForProse(source) (normalized) while the MCP checker hashed
  // raw bytes via hashFileContents.
  const fileContent = options.canonicalBytes
    ? `${cfBody}\n`
    : `${cfBody}   \n\n\n\n`;

  writeFileSync(path.join(world, "_source", "canon", "CF-1.yaml"), fileContent, "utf8");
  return world;
}

test("openIndexDb stays non-stale after sync bumps mtime on a non-canonical-bytes file (IDXSYNC-002 Fix A+B convergence)", async () => {
  const root = createTempRepoRoot();
  const worldSlug = "converge";
  const world = createMinimalAtomicWorld(root, worldSlug, { canonicalBytes: false });
  const sourcePath = path.join(world, "_source", "canon", "CF-1.yaml");

  try {
    assert.equal(buildWorldIndex(root, worldSlug, { quiet: true }), 0);

    const afterBuild = withRepoRoot(root, () => openIndexDb(worldSlug));
    assert.ok("db" in afterBuild, JSON.stringify(afterBuild));
    afterBuild.db.close();

    // Touch the file: bump mtime past last_indexed_at without changing bytes.
    // Pre-fix this triggered the MCP mtime gate to re-hash the file, where
    // raw-bytes hash mismatched the stored prose-normalized hash, flagging
    // stale_index. Sync would then be unable to clear it because its
    // shouldProcess=false skip path neither refreshed last_indexed_at nor
    // re-stored the hash; only a full build reset both.
    await new Promise((resolve) => setTimeout(resolve, 25));
    const future = new Date(Date.now() + 60_000);
    utimesSync(sourcePath, future, future);

    assert.equal(syncWorldIndex(root, worldSlug, { quiet: true }), 0);

    const afterSync = withRepoRoot(root, () => openIndexDb(worldSlug));
    assert.ok(
      "db" in afterSync,
      `sync should converge to a non-stale index but got: ${JSON.stringify(afterSync)}`
    );
    afterSync.db.close();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("openIndexDb stays non-stale after build under WORLDLOOM_MCP_FULL_HASH_DRIFT_CHECK=1 for non-canonical-bytes files (IDXSYNC-002 Fix B soundness)", () => {
  const root = createTempRepoRoot();
  const worldSlug = "soundness";
  createMinimalAtomicWorld(root, worldSlug, { canonicalBytes: false });

  const originalFlag = process.env.WORLDLOOM_MCP_FULL_HASH_DRIFT_CHECK;
  process.env.WORLDLOOM_MCP_FULL_HASH_DRIFT_CHECK = "1";

  try {
    assert.equal(buildWorldIndex(root, worldSlug, { quiet: true }), 0);

    const result = withRepoRoot(root, () => openIndexDb(worldSlug));
    assert.ok(
      "db" in result,
      `with FULL_HASH=1, build should produce a non-stale index even for non-canonical bytes but got: ${JSON.stringify(result)}`
    );
    result.db.close();
  } finally {
    if (originalFlag === undefined) {
      delete process.env.WORLDLOOM_MCP_FULL_HASH_DRIFT_CHECK;
    } else {
      process.env.WORLDLOOM_MCP_FULL_HASH_DRIFT_CHECK = originalFlag;
    }
    rmSync(root, { recursive: true, force: true });
  }
});

test("sync removes file_versions entries for deleted _source records (IDXSYNC-002 deletion regression)", () => {
  const root = createTempRepoRoot();
  const worldSlug = "deletion";
  const world = createMinimalAtomicWorld(root, worldSlug, { canonicalBytes: true });

  // Add a second canon fact to delete (deleting the only file would leave the
  // world without atomic source records and short-circuit sync).
  const cfTwoPath = path.join(world, "_source", "canon", "CF-2.yaml");
  writeFileSync(
    cfTwoPath,
    [
      "id: CF-2",
      "title: Secondary canon fact",
      "status: hard_canon",
      "type: institution",
      "statement: Secondary fixture for deletion test.",
      "scope:",
      "  geographic: local",
      "  temporal: current",
      "  social: public",
      "truth_scope:",
      "  world_level: true",
      "  diegetic_status: objective",
      "domains_affected: [institutions]",
      "required_world_updates: [INSTITUTIONS]",
      "source_basis:",
      "  direct_user_approval: true",
      "modification_history: []"
    ].join("\n") + "\n",
    "utf8"
  );

  try {
    assert.equal(buildWorldIndex(root, worldSlug, { quiet: true }), 0);

    const dbPath = path.join(root, "worlds", worldSlug, "_index", "world.db");
    {
      const db = new Database(dbPath, { readonly: true });
      try {
        const present = db
          .prepare("SELECT COUNT(*) AS count FROM file_versions WHERE world_slug = ? AND file_path = ?")
          .get(worldSlug, "_source/canon/CF-2.yaml") as { count: number };
        assert.equal(present.count, 1, "CF-2 should be indexed after build");
      } finally {
        db.close();
      }
    }

    unlinkSync(cfTwoPath);
    assert.equal(syncWorldIndex(root, worldSlug, { quiet: true }), 0);

    {
      const db = new Database(dbPath, { readonly: true });
      try {
        const present = db
          .prepare("SELECT COUNT(*) AS count FROM file_versions WHERE world_slug = ? AND file_path = ?")
          .get(worldSlug, "_source/canon/CF-2.yaml") as { count: number };
        assert.equal(present.count, 0, "sync should remove file_versions entry for deleted CF-2");

        const nodes = db
          .prepare("SELECT COUNT(*) AS count FROM nodes WHERE world_slug = ? AND file_path = ?")
          .get(worldSlug, "_source/canon/CF-2.yaml") as { count: number };
        assert.equal(nodes.count, 0, "sync should delete nodes for removed CF-2");
      } finally {
        db.close();
      }
    }

    const result = withRepoRoot(root, () => openIndexDb(worldSlug));
    assert.ok("db" in result, JSON.stringify(result));
    result.db.close();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
