import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";

import { openIndex, SchemaVersionMismatchError } from "../src/index/open";

function createTempRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), "world-index-schema-"));
}

function cleanup(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

function openFixtureIndex(root: string): Database.Database {
  return openIndex(root, "fixture-world");
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
      assert.equal(readFileSync(versionPath, "utf8"), "1\n");

      const tables = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
        )
        .all() as Array<{ name: string }>;
      assert.deepEqual(
        tables.map(({ name }) => name),
        [
          "anchor_checksums",
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
          "idx_nodes_world_type"
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

test("version mismatches raise SchemaVersionMismatchError", () => {
  const root = createTempRoot();

  try {
    const db = openFixtureIndex(root);
    db.close();

    const versionPath = path.join(root, "worlds", "fixture-world", "_index", "index_version.txt");
    writeFileSync(versionPath, "2\n", "utf8");

    assert.throws(
      () => openFixtureIndex(root),
      (error: unknown) =>
        error instanceof SchemaVersionMismatchError &&
        error.expectedVersion === 1 &&
        error.actualVersion === "2"
    );
  } finally {
    cleanup(root);
  }
});
