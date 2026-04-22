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
    assert.deepEqual(
      entityNodes.map((node) => ({
        file_path: node.file_path,
        line_start: node.line_start,
        line_end: node.line_end,
        byte_start: node.byte_start,
        byte_end: node.byte_end
      })),
      [
        {
          file_path: "fixture-ontology.md",
          line_start: 1,
          line_end: 1,
          byte_start: 0,
          byte_end: 0
        },
        {
          file_path: "fixture-ontology.md",
          line_start: 1,
          line_end: 1,
          byte_start: 0,
          byte_end: 0
        },
        {
          file_path: "fixture-ontology.md",
          line_start: 1,
          line_end: 1,
          byte_start: 0,
          byte_end: 0
        }
      ]
    );
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

test("heuristic extraction ignores structural markdown carriers but keeps free-prose entities", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "world-index-entities-"));

  try {
    const ontologyPath = path.join(tempRoot, "fixture-ontology.md");
    writeFileSync(ontologyPath, "- Brinewick (polity)\n", "utf8");

    const registry = loadOntologyRegistry(ontologyPath);
    const source = [
      "---",
      'title: "After-Action Report on the Harrowgate Contract"',
      "---",
      "",
      "## Access Path",
      "",
      "| Gate | Result |",
      "| --- | --- |",
      "| 4 | All Phase 6 consequences drafted |",
      "",
      "Adds Mystery Reserve entry M-6 in the summary block.",
      "",
      "Althea Greystone met Atreia Selviss in free prose."
    ].join("\n");
    const { tree } = parseMarkdown(source);
    const proseNodes: NodeRow[] = [
      {
        node_id: "animalia:fixtures.md:Structural Noise:0",
        world_slug: "animalia",
        file_path: path.join(tempRoot, "fixtures.md"),
        heading_path: "Structural Noise",
        byte_start: 0,
        byte_end: 0,
        line_start: 1,
        line_end: source.split("\n").length,
        node_type: "adjudication_record",
        body: source,
        content_hash: contentHashForProse(source),
        anchor_checksum: contentHashForProse(source),
        summary: null,
        created_at_index_version: CURRENT_INDEX_VERSION
      }
    ];

    const { entityNodes, mentions } = extractEntities(tree, proseNodes, registry);
    const entityNames = new Set(entityNodes.map((node) => node.body.match(/^Canonical name: (.+?) \|/)?.[1] ?? ""));

    assert.equal(mentions.some((mention) => mention.entity_name === "Access Path"), false);
    assert.equal(mentions.some((mention) => mention.entity_name === "Action Report"), false);
    assert.equal(mentions.some((mention) => mention.entity_name === "All Phase"), false);
    assert.equal(mentions.some((mention) => mention.entity_name === "Althea Greystone"), true);
    assert.equal(mentions.some((mention) => mention.entity_name === "Atreia Selviss"), true);
    assert.equal(entityNames.has("Althea Greystone"), true);
    assert.equal(entityNames.has("Atreia Selviss"), true);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("heuristic extraction stoplists workflow labels and world-kernel headings", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "world-index-entities-"));

  try {
    const ontologyPath = path.join(tempRoot, "fixture-ontology.md");
    writeFileSync(ontologyPath, "- Copper Weir (place)\n", "utf8");

    const registry = loadOntologyRegistry(ontologyPath);
    const source = [
      "## Discovery",
      "",
      "Continuity Archivist requested Required Updates.",
      "Mystery Curator rejected No Silent Retcons drift.",
      "Primary Difference and Natural Story Engines remain template labels.",
      "Mystery Reserve is a worldbuilding contract, not an entity.",
      "Copper Weir still matters as a real place."
    ].join("\n");
    const { tree } = parseMarkdown(source);
    const proseNodes: NodeRow[] = [
      {
        node_id: "animalia:fixtures.md:Workflow Labels:0",
        world_slug: "animalia",
        file_path: path.join(tempRoot, "fixtures.md"),
        heading_path: "Workflow Labels",
        byte_start: 0,
        byte_end: 0,
        line_start: 1,
        line_end: source.split("\n").length,
        node_type: "section",
        body: source,
        content_hash: contentHashForProse(source),
        anchor_checksum: contentHashForProse(source),
        summary: null,
        created_at_index_version: CURRENT_INDEX_VERSION
      }
    ];

    const { entityNodes, mentions } = extractEntities(tree, proseNodes, registry);
    const entityNames = new Set(entityNodes.map((node) => node.body.match(/^Canonical name: (.+?) \|/)?.[1] ?? ""));

    for (const banned of [
      "Continuity Archivist",
      "Required Updates",
      "Mystery Curator",
      "No Silent Retcons",
      "Primary Difference",
      "Natural Story Engines",
      "Mystery Reserve"
    ]) {
      assert.equal(
        mentions.some((mention) => mention.entity_name === banned),
        false,
        `${banned} should be stoplisted`
      );
      assert.equal(entityNames.has(banned), false, `${banned} should not produce a named_entity`);
    }

    assert.equal(mentions.some((mention) => mention.entity_name === "Copper Weir"), true);
    assert.equal(entityNames.has("Copper Weir"), true);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
