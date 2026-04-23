import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { extractEntities, loadOntologyRegistry } from "../src/parse/entities";
import { contentHashForProse } from "../src/parse/canonical";
import { CURRENT_INDEX_VERSION } from "../src/schema/version";
import type { NodeRow, NodeType } from "../src/schema/types";

function makeNode(nodeId: string, nodeType: NodeType, body: string, filePath = "fixtures.md"): NodeRow {
  return {
    node_id: nodeId,
    world_slug: "animalia",
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

function entityNames(rows: Array<{ canonical_name: string }>): string[] {
  return rows.map((row) => row.canonical_name).sort();
}

test("stage A builds canonical entities from registry and structured whole-file records", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "world-index-entities-"));

  try {
    const ontologyPath = path.join(tempRoot, "ONTOLOGY.md");
    writeFileSync(ontologyPath, "- Brinewick (polity)\n", "utf8");

    const registry = loadOntologyRegistry(ontologyPath);
    const proseNodes = [
      makeNode(
        "CHAR-0001",
        "character_record",
        "---\nname: Melissa Threadscar\nslug: threadscar-melissa\n---\nCharacter body\n",
        "characters/melissa-threadscar.md"
      ),
      makeNode(
        "NCP-0001",
        "character_proposal_card",
        "---\nname: Vespera Nightwhisper\nslug: vespera-nightwhisper\n---\nProposal body\n",
        "character-proposals/vespera-nightwhisper.md"
      ),
      makeNode(
        "DA-0001",
        "diegetic_artifact_record",
        "---\ntitle: A Season on the Circuit\nartifact_type: travelogue\n---\nArtifact body\n",
        "diegetic-artifacts/a-season-on-the-circuit.md"
      ),
      makeNode(
        "animalia:INSTITUTIONS.md:Harbor Notes:0",
        "section",
        "Brinewick and Melissa Threadscar both appear in ordinary prose."
      )
    ];

    const { entities, entityNodes } = extractEntities({ type: "root", children: [] }, proseNodes, registry);

    assert.deepEqual(entityNames(entities), [
      "A Season on the Circuit",
      "Brinewick",
      "Melissa Threadscar",
      "Vespera Nightwhisper"
    ]);
    assert.equal(
      entities.find((row) => row.canonical_name === "Brinewick")?.provenance_scope,
      "world"
    );
    assert.equal(
      entities.find((row) => row.canonical_name === "Melissa Threadscar")?.entity_kind,
      "person"
    );
    assert.equal(
      entities.find((row) => row.canonical_name === "Vespera Nightwhisper")?.provenance_scope,
      "proposal"
    );
    assert.equal(
      entities.find((row) => row.canonical_name === "A Season on the Circuit")?.entity_kind,
      "text/tradition"
    );

    const ontologyNode = entityNodes.find((row) => row.node_id === "entity:brinewick");
    assert.deepEqual(
      ontologyNode && {
        file_path: ontologyNode.file_path,
        line_start: ontologyNode.line_start,
        line_end: ontologyNode.line_end,
        byte_start: ontologyNode.byte_start,
        byte_end: ontologyNode.byte_end
      },
      {
        file_path: "ONTOLOGY.md",
        line_start: 1,
        line_end: 1,
        byte_start: 0,
        byte_end: 0
      }
    );

    const characterNode = entityNodes.find((row) => row.node_id === "entity:melissa-threadscar");
    assert.deepEqual(
      characterNode && {
        file_path: characterNode.file_path,
        line_start: characterNode.line_start,
        line_end: characterNode.line_end
      },
      {
        file_path: "characters/melissa-threadscar.md",
        line_start: 1,
        line_end: 6
      }
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("ontology registry only accepts explicit structured entries and rejects explanatory notes", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "world-index-entities-"));

  try {
    const ontologyPath = path.join(tempRoot, "ONTOLOGY.md");
    writeFileSync(
      ontologyPath,
      [
        "## Notes on Use",
        "- A canon fact may attach to multiple categories (a ward-breach event is both **event** and **hazard**; a chartered guild is both **institution** and **faction** in some polities).",
        "- Mythical-species sentients are **species**, not **artifact**, even though M-5 (Mystery Reserve) entertains the heretical possibility otherwise.",
        "- Artifact-mutated non-sentient beasts (CF-0035) attach to **hazard** + **species** (non-sentient fauna sub-category).",
        "- Maker-Age artifact destruction-resistance (CF-0039) attaches to **metaphysical_rule** + **artifact** (as a property of the artifact-as-locus).",
        ""
      ].join("\n"),
      "utf8"
    );

    const registry = loadOntologyRegistry(ontologyPath);

    assert.deepEqual(registry.entries, [
      {
        canonicalName: "Artifact-mutated non-sentient beasts",
        kind: "hazard"
      },
      {
        canonicalName: "Maker-Age artifact destruction-resistance",
        kind: "metaphysical_rule"
      }
    ]);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("stage B emits exact structured aliases and suppresses identical normalized aliases", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "world-index-entities-"));

  try {
    const ontologyPath = path.join(tempRoot, "ONTOLOGY.md");
    writeFileSync(ontologyPath, "", "utf8");

    const proseNodes = [
      makeNode(
        "CHAR-0001",
        "character_record",
        "---\nname: Threadscar Melissa\nslug: threadscar-melissa\n---\nCharacter body\n",
        "characters/threadscar-melissa.md"
      ),
      makeNode(
        "CHAR-0002",
        "character_record",
        "---\nname: Copper Weir\nslug: Copper Weir\n---\nCharacter body\n",
        "characters/copper-weir.md"
      )
    ];

    const { aliases } = extractEntities(
      { type: "root", children: [] },
      proseNodes,
      loadOntologyRegistry(ontologyPath)
    );

    assert.equal(
      aliases.some(
        (row) => row.alias_text === "threadscar-melissa" && row.alias_kind === "exact_structured"
      ),
      true
    );
    assert.equal(aliases.some((row) => row.alias_text === "Copper Weir"), false);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("stage C emits exact canonical, exact alias, and unresolved heuristic mentions", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "world-index-entities-"));

  try {
    const ontologyPath = path.join(tempRoot, "ONTOLOGY.md");
    writeFileSync(ontologyPath, "", "utf8");

    const proseNodes = [
      makeNode(
        "CHAR-0001",
        "character_record",
        "---\nname: Melissa Threadscar\nslug: threadscar-melissa\n---\nCharacter body\n",
        "characters/melissa-threadscar.md"
      ),
      makeNode(
        "animalia:INSTITUTIONS.md:Harbor Notes:0",
        "section",
        "Melissa Threadscar met threadscar-melissa beside Copper Weir."
      )
    ];

    const { entities, aliases, mentions, edges } = extractEntities(
      { type: "root", children: [] },
      proseNodes,
      loadOntologyRegistry(ontologyPath)
    );

    const melissa = entities.find((row) => row.canonical_name === "Melissa Threadscar");
    assert.ok(melissa);
    assert.equal(
      aliases.some((row) => row.entity_id === melissa.entity_id && row.alias_text === "threadscar-melissa"),
      true
    );
    assert.equal(
      mentions.some(
        (row) =>
          row.surface_text === "Melissa Threadscar" &&
          row.extraction_method === "exact_canonical" &&
          row.resolution_kind === "canonical"
      ),
      true
    );
    assert.equal(
      mentions.some(
        (row) =>
          row.surface_text === "threadscar-melissa" &&
          row.extraction_method === "exact_alias" &&
          row.resolution_kind === "alias"
      ),
      true
    );
    assert.equal(
      mentions.some(
        (row) =>
          row.surface_text === "Copper Weir" &&
          row.extraction_method === "heuristic_phrase" &&
          row.resolution_kind === "unresolved"
      ),
      true
    );
    assert.equal(
      edges.some((row) => row.target_node_id === melissa.entity_id && row.edge_type === "mentions_entity"),
      true
    );
    assert.equal(edges.some((row) => row.target_node_id === "entity:copper-weir"), false);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("stoplist only suppresses heuristic phrases and does not block exact canonical matches", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "world-index-entities-"));

  try {
    const ontologyPath = path.join(tempRoot, "ONTOLOGY.md");
    writeFileSync(ontologyPath, "- Mystery Reserve (belief)\n", "utf8");

    const proseNodes = [
      makeNode(
        "animalia:INSTITUTIONS.md:Labels:0",
        "section",
        "Mystery Reserve remains explicit here. Continuity Archivist remains workflow noise."
      )
    ];

    const { mentions, edges } = extractEntities(
      { type: "root", children: [] },
      proseNodes,
      loadOntologyRegistry(ontologyPath)
    );

    assert.equal(
      mentions.some(
        (row) =>
          row.surface_text === "Mystery Reserve" &&
          row.extraction_method === "exact_canonical" &&
          row.resolution_kind === "canonical"
      ),
      true
    );
    assert.equal(mentions.some((row) => row.surface_text === "Continuity Archivist"), false);
    assert.equal(edges.length, 1);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("mystery reserve headings remain noncanonical and can only surface as unresolved evidence", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "world-index-entities-"));

  try {
    const ontologyPath = path.join(tempRoot, "ONTOLOGY.md");
    writeFileSync(ontologyPath, "", "utf8");

    const proseNodes = [
      makeNode("M-0001", "mystery_reserve_entry", "## The Lost Hour\n\nUnknown origin.\n", "MYSTERY_RESERVE.md"),
      makeNode(
        "animalia:INSTITUTIONS.md:Rumors:0",
        "section",
        "The Lost Hour returned in tavern gossip."
      )
    ];

    const { entities, mentions, edges } = extractEntities(
      { type: "root", children: [] },
      proseNodes,
      loadOntologyRegistry(ontologyPath)
    );

    assert.equal(entities.some((row) => row.canonical_name === "The Lost Hour"), false);
    assert.equal(
      mentions.some(
        (row) =>
          row.surface_text === "The Lost Hour" &&
          row.extraction_method === "heuristic_phrase" &&
          row.resolution_kind === "unresolved"
      ),
      true
    );
    assert.equal(edges.length, 0);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
