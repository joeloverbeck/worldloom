import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";

import { openIndex, SchemaVersionMismatchError } from "../src/index/open";
import { CURRENT_INDEX_VERSION } from "../src/schema/version";

const INITIAL_MIGRATION_SQL = readFileSync(
  path.resolve(__dirname, "..", "..", "src", "schema", "migrations", "001_initial.sql"),
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
          "idx_edges_target",
          "idx_entities_name",
          "idx_entities_scope",
          "idx_entity_alias_text",
          "idx_entity_alias_unique",
          "idx_entity_mentions_resolved",
          "idx_entity_mentions_surface",
          "idx_nodes_file",
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
        __dirname,
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
