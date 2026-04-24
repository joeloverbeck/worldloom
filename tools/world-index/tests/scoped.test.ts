import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { insertAnchorChecksums, insertNodes, insertScopedReferenceAliases, insertScopedReferences } from "../src/index/nodes";
import { insertEdges } from "../src/index/edges";
import { openIndex } from "../src/index/open";
import { contentHashForProse } from "../src/parse/canonical";
import { extractScopedReferences } from "../src/parse/scoped";
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

test("extractScopedReferences emits scoped rows, aliases, edges, and warning rows truthfully", () => {
  const proseNodes = [
    makeNode(
      "CHAR-0001",
      "character_record",
      [
        "---",
        "name: Melissa Threadscar",
        "scoped_references:",
        "  - name: Mudbrook",
        "    relation: home_village",
        "    kind: place",
        "    aliases:",
        "      - Mudbrook-on-the-Bend",
        "      - mudbrook-on-the-bend",
        "  - name: Registrar Copperplate",
        "    relation: patron",
        "  - name: Broken Entry",
        "    kind: person",
        "---",
        "Body",
        ""
      ].join("\n"),
      "characters/melissa-threadscar.md"
    ),
    makeNode(
      "PROP-0001",
      "proposal_card",
      [
        "---",
        "title: Harbor Ledger Expansion",
        "scoped_references:",
        "  - name: Silt Market",
        "    relation: affected_place",
        "---",
        "Body",
        ""
      ].join("\n"),
      "proposals/harbor-ledger-expansion.md"
    ),
    makeNode(
      "CHAR-0002",
      "character_record",
      ["---", "name: No Scoped Block", "---", "Body", ""].join("\n"),
      "characters/no-scoped-block.md"
    )
  ];

  const extracted = extractScopedReferences(proseNodes);

  assert.equal(extracted.scopedReferences.length, 3);
  assert.deepEqual(
    extracted.scopedReferences.map((row) => ({
      reference_id: row.reference_id,
      display_name: row.display_name,
      provenance_scope: row.provenance_scope,
      authority_level: row.authority_level,
      source_field: row.source_field
    })),
    [
      {
        reference_id: "CHAR-0001#scoped:mudbrook:0",
        display_name: "Mudbrook",
        provenance_scope: "world",
        authority_level: "explicit_scoped_reference",
        source_field: "scoped_references"
      },
      {
        reference_id: "CHAR-0001#scoped:registrar-copperplate:1",
        display_name: "Registrar Copperplate",
        provenance_scope: "world",
        authority_level: "explicit_scoped_reference",
        source_field: "scoped_references"
      },
      {
        reference_id: "PROP-0001#scoped:silt-market:0",
        display_name: "Silt Market",
        provenance_scope: "proposal",
        authority_level: "explicit_scoped_reference",
        source_field: "scoped_references"
      }
    ]
  );
  assert.match(extracted.scopedReferences[0]!.reference_id, /^.+#scoped:[a-z0-9-]+:\d+$/);
  assert.deepEqual(
    extracted.scopedReferenceAliases.map((row) => ({
      reference_id: row.reference_id,
      alias_text: row.alias_text
    })),
    [
      {
        reference_id: "CHAR-0001#scoped:mudbrook:0",
        alias_text: "Mudbrook-on-the-Bend"
      }
    ]
  );
  assert.deepEqual(
    extracted.edges.map((row) => ({
      source_node_id: row.source_node_id,
      target_node_id: row.target_node_id,
      edge_type: row.edge_type
    })),
    [
      {
        source_node_id: "CHAR-0001",
        target_node_id: "CHAR-0001#scoped:mudbrook:0",
        edge_type: "references_scoped_name"
      },
      {
        source_node_id: "CHAR-0001",
        target_node_id: "CHAR-0001#scoped:registrar-copperplate:1",
        edge_type: "references_scoped_name"
      },
      {
        source_node_id: "PROP-0001",
        target_node_id: "PROP-0001#scoped:silt-market:0",
        edge_type: "references_scoped_name"
      }
    ]
  );
  assert.equal(extracted.validationResults.length, 1);
  assert.deepEqual(
    extracted.validationResults.map((row) => ({
      validator_name: row.validator_name,
      severity: row.severity,
      code: row.code,
      node_id: row.node_id
    })),
    [
      {
        validator_name: "scoped_reference_parse",
        severity: "warn",
        code: "malformed_scoped_reference",
        node_id: "CHAR-0001"
      }
    ]
  );
});

test("scoped reference rows persist into the new schema tables without touching entities", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-scoped-"));

  try {
    const sourceNode = makeNode(
      "CHAR-0001",
      "character_record",
      [
        "---",
        "name: Melissa Threadscar",
        "scoped_references:",
        "  - name: Mudbrook",
        "    relation: home_village",
        "    kind: place",
        "    aliases:",
        "      - Mudbrook-on-the-Bend",
        "---",
        "Body",
        ""
      ].join("\n"),
      "characters/melissa-threadscar.md"
    );
    const extracted = extractScopedReferences([sourceNode]);
    const db = openIndex(root, "fixture-world");

    try {
      insertNodes(db, [sourceNode, ...extracted.scopedNodes]);
      insertAnchorChecksums(db, [sourceNode, ...extracted.scopedNodes].map((node) => ({
        node_id: node.node_id,
        anchor_form: node.body,
        checksum: node.anchor_checksum
      })));
      insertScopedReferences(db, extracted.scopedReferences);
      insertScopedReferenceAliases(db, extracted.scopedReferenceAliases);
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
          reference_id: "CHAR-0001#scoped:mudbrook:0",
          display_name: "Mudbrook",
          relation: "home_village",
          authority_level: "explicit_scoped_reference",
          source_node_id: "CHAR-0001",
          target_node_id: null
        }
      ]);

      const aliasRows = db
        .prepare(
          "SELECT reference_id, alias_text FROM scoped_reference_aliases ORDER BY alias_id"
        )
        .all() as Array<{ reference_id: string; alias_text: string }>;
      assert.deepEqual(aliasRows, [
        {
          reference_id: "CHAR-0001#scoped:mudbrook:0",
          alias_text: "Mudbrook-on-the-Bend"
        }
      ]);

      const backingNodes = db
        .prepare(
          `
            SELECT node_id, node_type, body
            FROM nodes
            WHERE node_type = 'scoped_reference'
            ORDER BY node_id
          `
        )
        .all() as Array<{ node_id: string; node_type: string; body: string }>;
      assert.deepEqual(backingNodes, [
        {
          node_id: "CHAR-0001#scoped:mudbrook:0",
          node_type: "scoped_reference",
          body: "Scoped reference: Mudbrook | Kind: place | Relation: home_village"
        }
      ]);

      const edgeRows = db
        .prepare(
          `
            SELECT source_node_id, target_node_id, edge_type
            FROM edges
            ORDER BY edge_id
          `
        )
        .all() as Array<{ source_node_id: string; target_node_id: string | null; edge_type: string }>;
      assert.deepEqual(edgeRows, [
        {
          source_node_id: "CHAR-0001",
          target_node_id: "CHAR-0001#scoped:mudbrook:0",
          edge_type: "references_scoped_name"
        }
      ]);

      const entityCount = (
        db.prepare("SELECT COUNT(*) AS count FROM entities").get() as { count: number }
      ).count;
      assert.equal(entityCount, 0);
    } finally {
      db.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
