import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type Database from "better-sqlite3";

import { insertEdges, resolveUnresolvedEdges } from "../src/index/edges";
import { getFileVersion, upsertFileVersion } from "../src/index/file-versions";
import { rebuildFtsIndex, shouldRebuildFts } from "../src/index/fts";
import {
  deleteNodesByFile,
  insertAnchorChecksums,
  insertEntityMentions,
  insertNodes,
  insertValidationResults
} from "../src/index/nodes";
import { openIndex } from "../src/index/open";
import { contentHashForProse } from "../src/parse/canonical";
import { CURRENT_INDEX_VERSION } from "../src/schema/version";
import type {
  AnchorChecksumRow,
  EdgeRow,
  EntityMentionRow,
  NodeRow,
  ValidationResultRow
} from "../src/schema/types";

function createTempRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), "world-index-crud-"));
}

function cleanup(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

function createDb(root: string): Database.Database {
  return openIndex(root, "fixture-world");
}

function makeNodeRow(nodeId: string, filePath: string, body = `Body for ${nodeId}`): NodeRow {
  return {
    node_id: nodeId,
    world_slug: "fixture-world",
    file_path: filePath,
    heading_path: "Section",
    byte_start: 0,
    byte_end: body.length,
    line_start: 1,
    line_end: 1,
    node_type: "section",
    body,
    content_hash: contentHashForProse(body),
    anchor_checksum: contentHashForProse(`anchor:${body}`),
    summary: null,
    created_at_index_version: CURRENT_INDEX_VERSION
  };
}

test("CRUD helpers batch insert, explicitly cascade deletes, and resolve unresolved edges", () => {
  const root = createTempRoot();

  try {
    const db = createDb(root);

    try {
      const bulkNodes = Array.from({ length: 100 }, (_, index) =>
        makeNodeRow(`bulk-${index + 1}`, "WORLD_KERNEL.md", `Bulk node ${index + 1}`)
      );
      insertNodes(db, bulkNodes);

      const nodeCount = (
        db.prepare("SELECT COUNT(*) AS count FROM nodes WHERE file_path = ?").get("WORLD_KERNEL.md") as {
          count: number;
        }
      ).count;
      assert.equal(nodeCount, 100);

      const fixtureNodes = [
        makeNodeRow("CF-0001", "CANON_LEDGER.md", "Canon fact one"),
        makeNodeRow("CF-0002", "CANON_LEDGER.md", "Canon fact two"),
        makeNodeRow("CF-0999", "OPEN_QUESTIONS.md", "Late arriving target")
      ];
      insertNodes(db, fixtureNodes);

      const mentions: EntityMentionRow[] = [
        {
          mention_id: 1,
          node_id: "CF-0001",
          entity_name: "Brinewick",
          entity_kind: "place"
        },
        {
          mention_id: 2,
          node_id: "CF-0002",
          entity_name: "The Marsh Courts",
          entity_kind: "institution"
        }
      ];
      insertEntityMentions(db, mentions);

      const anchorChecksums: AnchorChecksumRow[] = [
        {
          node_id: "CF-0001",
          anchor_form: "Canon fact one",
          checksum: "checksum-1"
        },
        {
          node_id: "CF-0002",
          anchor_form: "Canon fact two",
          checksum: "checksum-2"
        }
      ];
      insertAnchorChecksums(db, anchorChecksums);

      const validationResults: ValidationResultRow[] = [
        {
          result_id: 1,
          world_slug: "fixture-world",
          validator_name: "enumeration",
          severity: "warn",
          code: "unexpected_path",
          message: "Unexpected path found",
          node_id: null,
          file_path: "scratch.md",
          line_range_start: null,
          line_range_end: null,
          created_at: "2026-04-22T00:00:00.000Z"
        }
      ];
      insertValidationResults(db, validationResults);

      const edges: EdgeRow[] = [
        {
          edge_id: 1,
          source_node_id: "CF-0001",
          target_node_id: "CF-0002",
          target_unresolved_ref: null,
          edge_type: "derived_from"
        },
        {
          edge_id: 2,
          source_node_id: "CF-0002",
          target_node_id: null,
          target_unresolved_ref: "CF-0999",
          edge_type: "derived_from"
        },
        {
          edge_id: 3,
          source_node_id: "CF-0001",
          target_node_id: "CF-0002",
          target_unresolved_ref: null,
          edge_type: "derived_from"
        }
      ];
      insertEdges(db, edges);

      const insertedEdgeCount = (
        db.prepare("SELECT COUNT(*) AS count FROM edges").get() as { count: number }
      ).count;
      assert.equal(insertedEdgeCount, 2);

      const resolvedCount = resolveUnresolvedEdges(db);
      assert.equal(resolvedCount, 1);

      const resolvedEdge = db
        .prepare(
          "SELECT target_node_id, target_unresolved_ref FROM edges WHERE source_node_id = ?"
        )
        .get("CF-0002") as {
        target_node_id: string | null;
        target_unresolved_ref: string | null;
      };
      assert.equal(resolvedEdge.target_node_id, "CF-0999");
      assert.equal(resolvedEdge.target_unresolved_ref, null);

      deleteNodesByFile(db, "fixture-world", "CANON_LEDGER.md");

      const remainingCanonNodes = (
        db
          .prepare("SELECT COUNT(*) AS count FROM nodes WHERE file_path = ?")
          .get("CANON_LEDGER.md") as { count: number }
      ).count;
      const remainingCanonEdges = (
        db
          .prepare(
            `
              SELECT COUNT(*) AS count
              FROM edges
              WHERE source_node_id IN ('CF-0001', 'CF-0002')
                 OR target_node_id IN ('CF-0001', 'CF-0002')
            `
          )
          .get() as { count: number }
      ).count;
      const remainingCanonMentions = (
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM entity_mentions WHERE node_id IN ('CF-0001', 'CF-0002')"
          )
          .get() as { count: number }
      ).count;
      const remainingAnchorChecksums = (
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM anchor_checksums WHERE node_id IN ('CF-0001', 'CF-0002')"
          )
          .get() as { count: number }
      ).count;

      assert.equal(remainingCanonNodes, 0);
      assert.equal(remainingCanonEdges, 0);
      assert.equal(remainingCanonMentions, 0);
      assert.equal(remainingAnchorChecksums, 0);
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});

test("FTS rebuild helper and file-version helper behave on a fresh database", () => {
  const root = createTempRoot();

  try {
    const db = createDb(root);

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

      assert.equal(shouldRebuildFts(150, 1000), true);
      assert.equal(shouldRebuildFts(50, 1000), false);
      assert.equal(shouldRebuildFts(5, 0), false);

      rebuildFtsIndex(db);

      upsertFileVersion(db, "fixture-world", "WORLD_KERNEL.md", "hash-1");
      assert.equal(getFileVersion(db, "fixture-world", "WORLD_KERNEL.md"), "hash-1");

      upsertFileVersion(db, "fixture-world", "WORLD_KERNEL.md", "hash-2");
      assert.equal(getFileVersion(db, "fixture-world", "WORLD_KERNEL.md"), "hash-2");
      assert.equal(getFileVersion(db, "fixture-world", "MISSING.md"), null);
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});
