import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseMarkdown } from "../src/parse/markdown";
import { contentHashForProse } from "../src/parse/canonical";
import { extractEntities, loadOntologyRegistry } from "../src/parse/entities";
import { CURRENT_INDEX_VERSION } from "../src/schema/version";
import type { NodeRow } from "../src/schema/types";

test("ontology registry parsing plus heuristic entities emits virtual nodes and mention rows", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "world-index-entities-"));

  try {
    const ontologyPath = path.join(tempRoot, "fixture-ontology.md");
    writeFileSync(
      ontologyPath,
      "- Brinewick (polity, coastal)\n- Salt Wardens (institution)\n",
      "utf8"
    );

    const registry = loadOntologyRegistry(ontologyPath);
    assert.deepEqual(registry.entries, [
      { canonicalName: "Brinewick", kind: "polity" },
      { canonicalName: "Salt Wardens", kind: "institution" }
    ]);

    const source = [
      "## Harbor Notes",
      "",
      "The watchmen of Brinewick reported to the Salt Wardens.",
      "Later, Brinewick sent for Harbor Watch.",
      "Once Upon the quay, nobody named a new polity."
    ].join("\n");
    const { tree } = parseMarkdown(source);
    const proseNodes: NodeRow[] = [
      {
        node_id: "animalia:INSTITUTIONS.md:Harbor Notes:0",
        world_slug: "animalia",
        file_path: path.join(tempRoot, "INSTITUTIONS.md"),
        heading_path: "Harbor Notes",
        byte_start: 0,
        byte_end: 0,
        line_start: 1,
        line_end: 5,
        node_type: "section",
        body: source,
        content_hash: contentHashForProse(source),
        anchor_checksum: contentHashForProse(source),
        summary: null,
        created_at_index_version: CURRENT_INDEX_VERSION
      }
    ];

    const { entityNodes, mentions, edges } = extractEntities(tree, proseNodes, registry);

    assert.equal(mentions.filter((mention) => mention.entity_name === "Brinewick").length, 2);
    assert.equal(mentions.filter((mention) => mention.entity_name === "Salt Wardens").length, 1);
    assert.equal(mentions.filter((mention) => mention.entity_name === "Harbor Watch").length, 1);
    assert.equal(mentions.some((mention) => mention.entity_name === "Once Upon"), false);

    assert.equal(entityNodes.some((node) => node.node_id === "entity:brinewick"), true);
    assert.equal(entityNodes.some((node) => node.node_id === "entity:salt-wardens"), true);
    assert.equal(entityNodes.some((node) => node.node_id === "entity:harbor-watch"), true);
    assert.equal(
      edges.some(
        (edge) =>
          edge.edge_type === "mentions_entity" &&
          edge.source_node_id === "animalia:INSTITUTIONS.md:Harbor Notes:0" &&
          edge.target_node_id === "entity:brinewick"
      ),
      true
    );
    assert.equal(edges.filter((edge) => edge.edge_type === "mentions_entity").length, 3);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
