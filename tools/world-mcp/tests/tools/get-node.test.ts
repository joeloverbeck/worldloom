import assert from "node:assert/strict";
import test from "node:test";

import { getNode } from "../../src/tools/get-node";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared";

function buildSeededWorld(root: string): void {
  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "CF-0001",
        world_slug: "seeded",
        file_path: "CANON_LEDGER.md",
        node_type: "canon_fact_record",
        body: "id: CF-0001\ntitle: Brinewick Fact\nstatement: Brinewick anchors the western salt trade.\n",
        summary: null
      },
      {
        node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        world_slug: "seeded",
        file_path: "GEOGRAPHY.md",
        heading_path: "Brinewick",
        node_type: "section",
        body: "Brinewick sits on the western brine shelf."
      },
      {
        node_id: "entity:brinewick",
        world_slug: "seeded",
        file_path: "ONTOLOGY.md",
        node_type: "named_entity",
        body: "Brinewick"
      }
    ],
    edges: [
      {
        source_node_id: "CF-0001",
        target_node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        edge_type: "required_world_update"
      },
      {
        source_node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        target_node_id: "entity:brinewick",
        edge_type: "mentions_entity"
      }
    ],
    entities: [
      {
        entity_id: "entity:brinewick",
        world_slug: "seeded",
        canonical_name: "Brinewick",
        entity_kind: "place",
        source_node_id: "entity:brinewick"
      }
    ],
    mentions: [
      {
        node_id: "CF-0001",
        surface_text: "Brinewick",
        resolved_entity_id: "entity:brinewick",
        resolution_kind: "canonical",
        extraction_method: "exact_canonical"
      }
    ],
    anchors: [
      {
        node_id: "CF-0001",
        anchor_form: "```yaml\nid: CF-0001\ntitle: Brinewick Fact\n```"
      }
    ]
  });
}

test("getNode returns a fully populated YAML-backed canon fact record", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededWorld(root);

    const result = await withRepoRoot(root, () =>
      getNode({ node_id: "CF-0001", world_slug: "seeded" })
    );

    assert.ok("id" in result);
    assert.equal(result.id, "CF-0001");
    assert.equal(result.node_type, "canon_fact_record");
    assert.match(result.body, /id: CF-0001/);
    assert.equal(result.anchor_form, "```yaml\nid: CF-0001\ntitle: Brinewick Fact\n```");
    assert.equal(result.entity_mentions[0]?.canonical_name, "Brinewick");
    assert.equal(result.entity_mentions[0]?.entity_kind, "place");
    assert.equal(result.edges.length, 1);
    assert.equal(result.edges[0]?.edge_type, "required_world_update");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getNode returns a prose-backed structural node", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededWorld(root);

    const result = await withRepoRoot(root, () =>
      getNode({ node_id: "seeded:GEOGRAPHY.md:Brinewick:0" })
    );

    assert.ok("id" in result);
    assert.equal(result.node_type, "section");
    assert.equal(result.file_path, "GEOGRAPHY.md");
    assert.equal(result.heading_path, "Brinewick");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getNode resolves a structured id by scanning indexed worlds when world_slug is omitted", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededWorld(root);

    const result = await withRepoRoot(root, () => getNode({ node_id: "CF-0001" }));

    assert.ok("id" in result);
    assert.equal(result.world_slug, "seeded");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getNode returns node_not_found when the node is missing", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededWorld(root);

    const result = await withRepoRoot(root, () =>
      getNode({ node_id: "CF-9999", world_slug: "seeded" })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "node_not_found");
  } finally {
    destroyTempRepoRoot(root);
  }
});
