import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type Database from "better-sqlite3";

import { insertEdges } from "../src/index/edges";
import {
  deleteNodesByFile,
  insertAnchorChecksums,
  insertEntities,
  insertEntityAliases,
  insertEntityMentions,
  insertNodes
} from "../src/index/nodes";
import { openIndex } from "../src/index/open";
import { contentHashForProse } from "../src/parse/canonical";
import { CURRENT_INDEX_VERSION } from "../src/schema/version";
import type {
  AnchorChecksumRow,
  EntityAliasRow,
  EntityMentionRow,
  EntityRow,
  NodeRow
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

function makeNodeRow(nodeId: string, filePath: string, nodeType: NodeRow["node_type"] = "section"): NodeRow {
  const body = `Body for ${nodeId}`;
  return {
    node_id: nodeId,
    world_slug: "fixture-world",
    file_path: filePath,
    heading_path: "Section",
    byte_start: 0,
    byte_end: body.length,
    line_start: 1,
    line_end: 1,
    node_type: nodeType,
    body,
    content_hash: contentHashForProse(body),
    anchor_checksum: contentHashForProse(`anchor:${body}`),
    summary: null,
    created_at_index_version: CURRENT_INDEX_VERSION
  };
}

test("entity helpers insert the three-surface chain and enforce FK integrity", () => {
  const root = createTempRoot();

  try {
    const db = createDb(root);

    try {
      const nodes = [
        makeNodeRow("CF-0001", "CANON_LEDGER.md"),
        makeNodeRow("entity:brinewick", "ONTOLOGY.md", "named_entity")
      ];
      insertNodes(db, nodes);

      const anchorChecksums: AnchorChecksumRow[] = [
        {
          node_id: "entity:brinewick",
          anchor_form: "Canonical name: Brinewick | Kind: polity | Mentions: 1",
          checksum: "anchor-1"
        }
      ];
      insertAnchorChecksums(db, anchorChecksums);

      const entities: EntityRow[] = [
        {
          entity_id: "entity:brinewick",
          world_slug: "fixture-world",
          canonical_name: "Brinewick",
          entity_kind: "polity",
          provenance_scope: "world",
          authority_level: "structured_anchor",
          source_node_id: "entity:brinewick",
          source_field: null
        }
      ];
      insertEntities(db, entities);

      const aliases: EntityAliasRow[] = [
        {
          alias_id: 1,
          entity_id: "entity:brinewick",
          alias_text: "The Brinewick March",
          alias_kind: "explicit_alias",
          source_node_id: "entity:brinewick"
        }
      ];
      insertEntityAliases(db, aliases);

      const mentions: EntityMentionRow[] = [
        {
          mention_id: 1,
          node_id: "CF-0001",
          surface_text: "Brinewick",
          resolved_entity_id: "entity:brinewick",
          resolution_kind: "canonical",
          extraction_method: "exact_canonical"
        }
      ];
      insertEntityMentions(db, mentions);

      insertEdges(db, [
        {
          edge_id: 1,
          source_node_id: "CF-0001",
          target_node_id: "entity:brinewick",
          target_unresolved_ref: null,
          edge_type: "mentions_entity"
        }
      ]);

      assert.equal(
        (db.prepare("SELECT COUNT(*) AS count FROM entities").get() as { count: number }).count,
        1
      );
      assert.equal(
        (db.prepare("SELECT COUNT(*) AS count FROM entity_aliases").get() as { count: number }).count,
        1
      );
      assert.equal(
        (db.prepare("SELECT COUNT(*) AS count FROM entity_mentions").get() as { count: number }).count,
        1
      );

      assert.throws(
        () =>
          insertEntityAliases(db, [
            {
              alias_id: 2,
              entity_id: "entity:missing",
              alias_text: "Missing Alias",
              alias_kind: "explicit_alias",
              source_node_id: "entity:brinewick"
            }
          ]),
        /FOREIGN KEY/
      );

      assert.throws(
        () =>
          insertEntityMentions(db, [
            {
              mention_id: 2,
              node_id: "CF-0001",
              surface_text: "Missing Alias",
              resolved_entity_id: "entity:missing",
              resolution_kind: "alias",
              extraction_method: "exact_alias"
            }
          ]),
        /FOREIGN KEY/
      );
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});

test("deleteNodesByFile removes file-owned nodes and attached mention evidence", () => {
  const root = createTempRoot();

  try {
    const db = createDb(root);

    try {
      const fixtureNodes = [
        makeNodeRow("CF-0001", "CANON_LEDGER.md"),
        makeNodeRow("CF-0002", "CANON_LEDGER.md"),
        makeNodeRow("CF-0999", "OPEN_QUESTIONS.md")
      ];
      insertNodes(db, fixtureNodes);

      insertEntityMentions(db, [
        {
          mention_id: 1,
          node_id: "CF-0001",
          surface_text: "Brinewick",
          resolved_entity_id: null,
          resolution_kind: "unresolved",
          extraction_method: "heuristic_phrase"
        },
        {
          mention_id: 2,
          node_id: "CF-0002",
          surface_text: "The Marsh Courts",
          resolved_entity_id: null,
          resolution_kind: "unresolved",
          extraction_method: "heuristic_phrase"
        }
      ]);

      deleteNodesByFile(db, "fixture-world", "CANON_LEDGER.md");

      assert.equal(
        (db.prepare("SELECT COUNT(*) AS count FROM nodes WHERE file_path = 'CANON_LEDGER.md'").get() as {
          count: number;
        }).count,
        0
      );
      assert.equal(
        (db
          .prepare("SELECT COUNT(*) AS count FROM entity_mentions WHERE node_id IN ('CF-0001', 'CF-0002')")
          .get() as { count: number }).count,
        0
      );
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});
