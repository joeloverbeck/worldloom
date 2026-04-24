import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { insertAnchorChecksums, insertNodes, insertScopedReferences } from "../src/index/nodes";
import { insertEdges } from "../src/index/edges";
import { openIndex } from "../src/index/open";
import { contentHashForProse } from "../src/parse/canonical";
import { extractStructuredRecordEdges } from "../src/parse/structured-edges";
import { CURRENT_INDEX_VERSION } from "../src/schema/version";
import type { NodeRow, NodeType } from "../src/schema/types";

function makeNode(nodeId: string, nodeType: NodeType, body: string, filePath = "fixtures.md"): NodeRow {
  return {
    node_id: nodeId,
    world_slug: "fixture-world",
    file_path: filePath,
    heading_path: path.basename(filePath, ".md"),
    byte_start: 0,
    byte_end: body.length,
    line_start: 1,
    line_end: body.split("\n").length,
    node_type: nodeType,
    body,
    content_hash: contentHashForProse(body),
    anchor_checksum: contentHashForProse(`anchor:${body}`),
    summary: null,
    created_at_index_version: CURRENT_INDEX_VERSION
  };
}

test("extractStructuredRecordEdges emits exact structured rows and unresolved refs truthfully", () => {
  const proseNodes = [
    makeNode(
      "DA-0002",
      "diegetic_artifact_record",
      ["---", "artifact_id: DA-0002", "title: After Action Report", "author_character_id: CHAR-0002", "---", "Body", ""].join("\n"),
      "diegetic-artifacts/after-action-report.md"
    ),
    makeNode(
      "CHAR-0002",
      "character_record",
      ["---", "character_id: CHAR-0002", "name: Melissa Threadscar", "---", "Body", ""].join("\n"),
      "characters/melissa-threadscar.md"
    ),
    makeNode(
      "BATCH-0001",
      "proposal_batch",
      ["---", "batch_id: BATCH-0001", "source_artifact_id: DA-0001", "---", "Body", ""].join("\n"),
      "proposals/batches/BATCH-0001.md"
    ),
    makeNode(
      "DA-0001",
      "diegetic_artifact_record",
      ["---", "artifact_id: DA-0001", "title: Harbor Ledger", "---", "Body", ""].join("\n"),
      "diegetic-artifacts/harbor-ledger.md"
    ),
    makeNode(
      "PR-0001",
      "proposal_card",
      ["---", "proposal_id: PR-0001", "batch_id: BATCH-0001", "---", "Body", ""].join("\n"),
      "proposals/PR-0001.md"
    ),
    makeNode(
      "BATCH-0002",
      "proposal_batch",
      ["---", "batch_id: BATCH-0002", "---", "Body", ""].join("\n"),
      "proposals/batches/BATCH-0002.md"
    ),
    makeNode(
      "PR-9999",
      "proposal_card",
      ["---", "proposal_id: PR-9999", "batch_id: BATCH-9999", "---", "Body", ""].join("\n"),
      "proposals/PR-9999.md"
    ),
    makeNode(
      "NCP-0001",
      "character_proposal_card",
      ["---", "proposal_id: NCP-0001", "batch_id: NCB-0001", "---", "Body", ""].join("\n"),
      "character-proposals/NCP-0001.md"
    ),
    makeNode(
      "NCB-0001",
      "character_proposal_batch",
      ["---", "batch_id: NCB-0001", "---", "Body", ""].join("\n"),
      "character-proposals/batches/NCB-0001.md"
    )
  ];

  const extracted = extractStructuredRecordEdges(proseNodes);

  assert.deepEqual(
    extracted.scopedReferences.map((row) => ({
      reference_id: row.reference_id,
      display_name: row.display_name,
      reference_kind: row.reference_kind,
      relation: row.relation,
      source_node_id: row.source_node_id,
      source_field: row.source_field,
      target_node_id: row.target_node_id,
      authority_level: row.authority_level
    })),
    [
      {
        reference_id: "DA-0002#structured:author_character_id:0",
        display_name: "Melissa Threadscar",
        reference_kind: "person",
        relation: "author_character_id",
        source_node_id: "DA-0002",
        source_field: "author_character_id",
        target_node_id: "CHAR-0002",
        authority_level: "exact_structured_edge"
      },
      {
        reference_id: "BATCH-0001#structured:source_artifact_id:0",
        display_name: "Harbor Ledger",
        reference_kind: "artifact",
        relation: "source_artifact_id",
        source_node_id: "BATCH-0001",
        source_field: "source_artifact_id",
        target_node_id: "DA-0001",
        authority_level: "exact_structured_edge"
      },
      {
        reference_id: "PR-0001#structured:batch_id:0",
        display_name: "BATCH-0001",
        reference_kind: "proposal_batch",
        relation: "batch_id",
        source_node_id: "PR-0001",
        source_field: "batch_id",
        target_node_id: "BATCH-0001",
        authority_level: "exact_structured_edge"
      },
      {
        reference_id: "PR-9999#structured:batch_id:0",
        display_name: "BATCH-9999",
        reference_kind: "proposal_batch",
        relation: "batch_id",
        source_node_id: "PR-9999",
        source_field: "batch_id",
        target_node_id: null,
        authority_level: "exact_structured_edge"
      },
      {
        reference_id: "NCP-0001#structured:batch_id:0",
        display_name: "NCB-0001",
        reference_kind: "character_proposal_batch",
        relation: "batch_id",
        source_node_id: "NCP-0001",
        source_field: "batch_id",
        target_node_id: "NCB-0001",
        authority_level: "exact_structured_edge"
      }
    ]
  );
  assert.deepEqual(
    extracted.edges.map((row) => ({
      source_node_id: row.source_node_id,
      target_node_id: row.target_node_id,
      target_unresolved_ref: row.target_unresolved_ref,
      edge_type: row.edge_type
    })),
    [
      {
        source_node_id: "DA-0002",
        target_node_id: "CHAR-0002",
        target_unresolved_ref: null,
        edge_type: "references_record"
      },
      {
        source_node_id: "BATCH-0001",
        target_node_id: "DA-0001",
        target_unresolved_ref: null,
        edge_type: "references_record"
      },
      {
        source_node_id: "PR-0001",
        target_node_id: "BATCH-0001",
        target_unresolved_ref: null,
        edge_type: "references_record"
      },
      {
        source_node_id: "PR-9999",
        target_node_id: null,
        target_unresolved_ref: "BATCH-9999",
        edge_type: "references_record"
      },
      {
        source_node_id: "NCP-0001",
        target_node_id: "NCB-0001",
        target_unresolved_ref: null,
        edge_type: "references_record"
      }
    ]
  );
});

test("structured-edge rows persist into scoped_references and edges tables", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-structured-"));

  try {
    const sourceNode = makeNode(
      "DA-0002",
      "diegetic_artifact_record",
      ["---", "artifact_id: DA-0002", "title: After Action Report", "author_character_id: CHAR-0002", "---", "Body", ""].join("\n"),
      "diegetic-artifacts/after-action-report.md"
    );
    const targetNode = makeNode(
      "CHAR-0002",
      "character_record",
      ["---", "character_id: CHAR-0002", "name: Melissa Threadscar", "---", "Body", ""].join("\n"),
      "characters/melissa-threadscar.md"
    );
    const extracted = extractStructuredRecordEdges([sourceNode, targetNode]);
    const db = openIndex(root, "fixture-world");

    try {
      insertNodes(db, [sourceNode, targetNode, ...extracted.scopedNodes]);
      insertAnchorChecksums(
        db,
        [sourceNode, targetNode, ...extracted.scopedNodes].map((node) => ({
          node_id: node.node_id,
          anchor_form: node.body,
          checksum: node.anchor_checksum
        }))
      );
      insertScopedReferences(db, extracted.scopedReferences);
      insertEdges(db, extracted.edges);

      const scopedRows = db
        .prepare(
          `
            SELECT reference_id, display_name, relation, authority_level, source_node_id, target_node_id
            FROM scoped_references
            ORDER BY reference_id
          `
        )
        .all() as Array<{
        reference_id: string;
        display_name: string;
        relation: string;
        authority_level: string;
        source_node_id: string;
        target_node_id: string | null;
      }>;
      assert.deepEqual(scopedRows, [
        {
          reference_id: "DA-0002#structured:author_character_id:0",
          display_name: "Melissa Threadscar",
          relation: "author_character_id",
          authority_level: "exact_structured_edge",
          source_node_id: "DA-0002",
          target_node_id: "CHAR-0002"
        }
      ]);

      const edgeRows = db
        .prepare(
          `
            SELECT source_node_id, target_node_id, target_unresolved_ref, edge_type
            FROM edges
            ORDER BY edge_id
          `
        )
        .all() as Array<{
        source_node_id: string;
        target_node_id: string | null;
        target_unresolved_ref: string | null;
        edge_type: string;
      }>;
      assert.deepEqual(edgeRows, [
        {
          source_node_id: "DA-0002",
          target_node_id: "CHAR-0002",
          target_unresolved_ref: null,
          edge_type: "references_record"
        }
      ]);
    } finally {
      db.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
