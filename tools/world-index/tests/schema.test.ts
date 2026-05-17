import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";

import { parseWorldFile, syncWorldIndex } from "../src/commands/shared.js";
import { openIndex, SchemaVersionMismatchError } from "../src/index/open.js";
import { CURRENT_INDEX_VERSION } from "../src/schema/version.js";
import { cleanup as cleanupAtomicRoot, createAtomicRepoRoot } from "./helpers/atomic-fixture.js";

const INITIAL_MIGRATION_SQL = readFileSync(
  path.resolve(import.meta.dirname, "..", "..", "src", "schema", "migrations", "001_initial.sql"),
  "utf8"
);

function createTempRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), "world-index-schema-"));
}

function cleanup(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

function openFixtureIndex(root: string): Database.Database {
  return openIndex(root, "fixture-world");
}

function createVersionOneIndex(root: string): void {
  const indexDirectory = path.join(root, "worlds", "fixture-world", "_index");
  const databasePath = path.join(indexDirectory, "world.db");
  const versionPath = path.join(indexDirectory, "index_version.txt");

  mkdirSync(indexDirectory, { recursive: true });

  const db = new Database(databasePath);
  try {
    db.exec(INITIAL_MIGRATION_SQL);
  } finally {
    db.close();
  }

  writeFileSync(versionPath, "1\n", "utf8");
}

function readMigration(version: number): string {
  const migrationDirectory = path.resolve(import.meta.dirname, "..", "..", "src", "schema", "migrations");
  const fileName = readdirSync(migrationDirectory).find((entry) =>
    entry.startsWith(String(version).padStart(3, "0"))
  );

  assert.notEqual(fileName, undefined);

  return readFileSync(path.join(migrationDirectory, fileName as string), "utf8");
}

function createIndexWithStaleWorldKernel(
  root: string,
  worldSlug: string,
  recordedVersion: 4 | 5
): void {
  const indexDirectory = path.join(root, "worlds", worldSlug, "_index");
  const databasePath = path.join(indexDirectory, "world.db");
  const versionPath = path.join(indexDirectory, "index_version.txt");
  const parsed = parseWorldFile(root, worldSlug, "WORLD_KERNEL.md");

  mkdirSync(indexDirectory, { recursive: true });

  const db = new Database(databasePath);
  try {
    db.exec([1, 2, 3, 4].map((version) => readMigration(version)).join("\n"));
    db
      .prepare(
        `
          INSERT INTO nodes (
            node_id,
            world_slug,
            story_slug,
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
          ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
        `
      )
      .run(
        `${worldSlug}:WORLD_KERNEL.md:Genre Contract:0`,
        worldSlug,
        "WORLD_KERNEL.md",
        "WORLD_KERNEL.md > Genre Contract",
        0,
        10,
        1,
        3,
        "section",
        "The old parser stored this row as a section.",
        parsed.contentHash,
        "stale-anchor",
        4
      );
    db
      .prepare("INSERT INTO anchor_checksums (node_id, anchor_form, checksum) VALUES (?, ?, ?)")
      .run(`${worldSlug}:WORLD_KERNEL.md:Genre Contract:0`, "Genre Contract", "stale-anchor");
    db
      .prepare(
        `
          INSERT INTO file_versions (
            world_slug,
            file_path,
            content_hash,
            last_indexed_at
          ) VALUES (?, ?, ?, ?)
        `
      )
      .run(worldSlug, "WORLD_KERNEL.md", parsed.contentHash, "2026-05-16T00:00:00.000Z");
  } finally {
    db.close();
  }

  writeFileSync(versionPath, `${recordedVersion}\n`, "utf8");
}

test("openIndex creates the DB, sidecar, schema objects, and write pragmas", () => {
  const root = createTempRoot();

  try {
    const db = openFixtureIndex(root);

    try {
      const dbPath = path.join(root, "worlds", "fixture-world", "_index", "world.db");
      const versionPath = path.join(
        root,
        "worlds",
        "fixture-world",
        "_index",
        "index_version.txt"
      );

      assert.equal(existsSync(dbPath), true);
      assert.equal(readFileSync(versionPath, "utf8"), `${CURRENT_INDEX_VERSION}\n`);

      const tables = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
        )
        .all() as Array<{ name: string }>;
      assert.deepEqual(
        tables.map(({ name }) => name),
        [
          "anchor_checksums",
          "approval_tokens_consumed",
          "edges",
          "entities",
          "entity_aliases",
          "entity_mentions",
          "file_versions",
          "fts_nodes",
          "fts_nodes_config",
          "fts_nodes_data",
          "fts_nodes_docsize",
          "fts_nodes_idx",
          "nodes",
          "scoped_reference_aliases",
          "scoped_references",
          "sqlite_sequence",
          "summaries",
          "validation_results"
        ]
      );

      const indexes = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
        .all() as Array<{ name: string }>;
      assert.deepEqual(
        indexes.map(({ name }) => name),
        [
          "idx_edges_source",
          "idx_edges_story",
          "idx_edges_target",
          "idx_entities_name",
          "idx_entities_scope",
          "idx_entity_alias_text",
          "idx_entity_alias_unique",
          "idx_entity_mentions_resolved",
          "idx_entity_mentions_story",
          "idx_entity_mentions_surface",
          "idx_nodes_file",
          "idx_nodes_world_story_node",
          "idx_nodes_world_story_type",
          "idx_nodes_world_type",
          "idx_scoped_reference_alias_text",
          "idx_scoped_reference_alias_unique",
          "idx_scoped_references_name",
          "idx_scoped_references_source"
        ]
      );

      const triggers = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name"
        )
        .all() as Array<{ name: string }>;
      assert.deepEqual(
        triggers.map(({ name }) => name),
        ["nodes_ad", "nodes_ai", "nodes_au"]
      );

      const nodeColumns = db.pragma("table_info(nodes)") as Array<{ name: string }>;
      assert.equal(nodeColumns.some((column) => column.name === "story_slug"), true);
      const edgeColumns = db.pragma("table_info(edges)") as Array<{ name: string }>;
      assert.equal(edgeColumns.some((column) => column.name === "story_slug"), true);
      const mentionColumns = db.pragma("table_info(entity_mentions)") as Array<{ name: string }>;
      assert.equal(mentionColumns.some((column) => column.name === "story_slug"), true);

      const foreignKeys = db.pragma("foreign_keys", { simple: true }) as number;
      assert.equal(foreignKeys, 1);

      const journalMode = db.pragma("journal_mode", { simple: true }) as string;
      assert.equal(journalMode.toLowerCase(), "wal");
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});

test("FTS triggers keep insert, delete, and update search results coherent", () => {
  const root = createTempRoot();

  try {
    const db = openFixtureIndex(root);

    try {
      const fixtureSqlPath = path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "tests",
        "fixtures",
        "empty-db-init.sql"
      );
      db.exec(readFileSync(fixtureSqlPath, "utf8"));

      const matchCount = (term: string): number => {
        const row = db
          .prepare("SELECT COUNT(*) AS count FROM fts_nodes WHERE fts_nodes MATCH ?")
          .get(term) as { count: number };
        return row.count;
      };

      assert.equal(matchCount("foo"), 1);

      db.prepare("UPDATE nodes SET body = ?, summary = ? WHERE node_id = ?").run(
        "new baz",
        "updated row",
        "node-1"
      );
      assert.equal(matchCount("foo"), 0);
      assert.equal(matchCount("baz"), 1);

      db.prepare("DELETE FROM nodes WHERE node_id = ?").run("node-1");
      assert.equal(matchCount("baz"), 0);
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});

test("openIndex upgrades a version-1 index to the current schema version", () => {
  const root = createTempRoot();

  try {
    createVersionOneIndex(root);

    const db = openFixtureIndex(root);
    try {
      const versionPath = path.join(root, "worlds", "fixture-world", "_index", "index_version.txt");
      assert.equal(readFileSync(versionPath, "utf8"), `${CURRENT_INDEX_VERSION}\n`);

      const tables = db
        .prepare(
          `
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name IN ('approval_tokens_consumed', 'scoped_references', 'scoped_reference_aliases')
            ORDER BY name
          `
        )
        .all() as Array<{ name: string }>;
      assert.deepEqual(tables.map(({ name }) => name), [
        "approval_tokens_consumed",
        "scoped_reference_aliases",
        "scoped_references"
      ]);
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});

function assertStaleWorldKernelSectionReparses(recordedVersion: 4 | 5): void {
  const worldSlug = "fixture-world";
  const root = createAtomicRepoRoot(worldSlug);
  const worldKernelPath = path.join(root, "worlds", worldSlug, "WORLD_KERNEL.md");
  writeFileSync(
    worldKernelPath,
    [
      "# Fixture Kernel",
      "",
      "## Genre Contract",
      "",
      "A fixture world for migration testing.",
      "",
      "## Chronotope",
      "",
      "A harbor in test time."
    ].join("\n"),
    "utf8"
  );

  try {
    createIndexWithStaleWorldKernel(root, worldSlug, recordedVersion);

    const db = openIndex(root, worldSlug);
    try {
      const staleCount = db
        .prepare(
          `
            SELECT COUNT(*) AS count
            FROM nodes
            WHERE world_slug = ?
              AND file_path = 'WORLD_KERNEL.md'
              AND node_type = 'section'
          `
        )
        .get(worldSlug) as { count: number };
      assert.equal(staleCount.count, 0);

      const fileVersionCount = db
        .prepare(
          `
            SELECT COUNT(*) AS count
            FROM file_versions
            WHERE world_slug = ?
              AND file_path = 'WORLD_KERNEL.md'
          `
        )
        .get(worldSlug) as { count: number };
      assert.equal(fileVersionCount.count, 0);
    } finally {
      db.close();
    }

    const syncResult = syncWorldIndex(root, worldSlug);
    assert.equal(syncResult.exitCode, 0);

    const migrated = openIndex(root, worldSlug);
    try {
      const staleCount = migrated
        .prepare(
          `
            SELECT COUNT(*) AS count
            FROM nodes
            WHERE world_slug = ?
              AND file_path = 'WORLD_KERNEL.md'
              AND node_type = 'section'
          `
        )
        .get(worldSlug) as { count: number };
      assert.equal(staleCount.count, 0);

      const narrativeCount = migrated
        .prepare(
          `
            SELECT COUNT(*) AS count
            FROM nodes
            WHERE world_slug = ?
              AND file_path = 'WORLD_KERNEL.md'
              AND node_type = 'narrative_section'
          `
        )
        .get(worldSlug) as { count: number };
      assert.equal(narrativeCount.count, 2);

      const fileVersionCount = migrated
        .prepare(
          `
            SELECT COUNT(*) AS count
            FROM file_versions
            WHERE world_slug = ?
              AND file_path = 'WORLD_KERNEL.md'
          `
        )
        .get(worldSlug) as { count: number };
      assert.equal(fileVersionCount.count, 1);
    } finally {
      migrated.close();
    }
  } finally {
    cleanupAtomicRoot(root);
  }
}

test("parser-vocabulary migrations invalidate stale file versions before sync", () => {
  assertStaleWorldKernelSectionReparses(4);
});

test("repair migration handles indexes that already recorded the v5 no-op migration", () => {
  assertStaleWorldKernelSectionReparses(5);
});

test("version mismatches raise SchemaVersionMismatchError", () => {
  const root = createTempRoot();

  try {
    const db = openFixtureIndex(root);
    db.close();

    const versionPath = path.join(root, "worlds", "fixture-world", "_index", "index_version.txt");
    const futureVersion = CURRENT_INDEX_VERSION + 1;
    writeFileSync(versionPath, `${futureVersion}\n`, "utf8");

    assert.throws(
      () => openFixtureIndex(root),
      (error: unknown) =>
        error instanceof SchemaVersionMismatchError &&
        error.expectedVersion === CURRENT_INDEX_VERSION &&
        error.actualVersion === String(futureVersion)
    );
  } finally {
    cleanup(root);
  }
});
