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
      },
      {
        node_id: "CHAR-0002",
        world_slug: "seeded",
        file_path: "characters/melissa-threadscar.md",
        node_type: "character_record",
        body: "---\nname: Melissa Threadscar\n---\nMelissa lives in Mudbrook-on-the-Bend.\n"
      },
      {
        node_id: "DA-0002",
        world_slug: "seeded",
        file_path: "diegetic-artifacts/after-action-report.md",
        node_type: "diegetic_artifact_record",
        body: "---\nauthor_character_id: CHAR-0002\n---\nFiled by Melissa.\n"
      },
      {
        node_id: "seeded:EVERYDAY_LIFE.md:Quiet-Market:0",
        world_slug: "seeded",
        file_path: "EVERYDAY_LIFE.md",
        heading_path: "Quiet Market",
        node_type: "section",
        body: "Vendors trade quietly at dawn."
      },
      {
        node_id: "CHAR-0002#scoped:mudbrook:0",
        world_slug: "seeded",
        file_path: "characters/melissa-threadscar.md",
        node_type: "scoped_reference",
        body: "Mudbrook"
      },
      {
        node_id: "CHAR-0002#scoped:rill:1",
        world_slug: "seeded",
        file_path: "characters/melissa-threadscar.md",
        node_type: "scoped_reference",
        body: "Rill"
      },
      {
        node_id: "DA-0002#scoped:melissa-threadscar:0",
        world_slug: "seeded",
        file_path: "diegetic-artifacts/after-action-report.md",
        node_type: "scoped_reference",
        body: "Melissa Threadscar"
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
      },
      {
        source_node_id: "DA-0002",
        target_node_id: "CHAR-0002",
        edge_type: "references_record"
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
    scopedReferences: [
      {
        reference_id: "CHAR-0002#scoped:mudbrook:0",
        world_slug: "seeded",
        display_name: "Mudbrook",
        reference_kind: "place",
        relation: "current_location",
        source_node_id: "CHAR-0002"
      },
      {
        reference_id: "CHAR-0002#scoped:rill:1",
        world_slug: "seeded",
        display_name: "Rill",
        reference_kind: "person",
        relation: "apprentice_candidate",
        source_node_id: "CHAR-0002"
      },
      {
        reference_id: "DA-0002#scoped:melissa-threadscar:0",
        world_slug: "seeded",
        display_name: "Melissa Threadscar",
        reference_kind: "person",
        relation: "author_character_id",
        source_node_id: "DA-0002",
        source_field: "author_character_id",
        target_node_id: "CHAR-0002",
        authority_level: "exact_structured_edge"
      }
    ],
    scopedReferenceAliases: [
      {
        reference_id: "CHAR-0002#scoped:mudbrook:0",
        alias_text: "Mudbrook-on-the-Bend"
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
    assert.deepEqual(result.structured_links, []);
    assert.deepEqual(result.scoped_references, []);
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
    assert.deepEqual(result.structured_links, []);
    assert.deepEqual(result.scoped_references, []);
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

test("getNode exposes explicit scoped references with aliases", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededWorld(root);

    const result = await withRepoRoot(root, () =>
      getNode({ node_id: "CHAR-0002", world_slug: "seeded" })
    );

    assert.ok("id" in result);
    assert.equal(result.id, "CHAR-0002");
    assert.deepEqual(result.structured_links, []);
    assert.deepEqual(result.scoped_references, [
      {
        reference_id: "CHAR-0002#scoped:mudbrook:0",
        display_name: "Mudbrook",
        reference_kind: "place",
        relation: "current_location",
        authority_level: "explicit_scoped_reference",
        target_node_id: null,
        aliases: ["Mudbrook-on-the-Bend"]
      },
      {
        reference_id: "CHAR-0002#scoped:rill:1",
        display_name: "Rill",
        reference_kind: "person",
        relation: "apprentice_candidate",
        authority_level: "explicit_scoped_reference",
        target_node_id: null,
        aliases: []
      }
    ]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getNode exposes structured links and structured-edge scoped references while preserving edges", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededWorld(root);

    const result = await withRepoRoot(root, () =>
      getNode({ node_id: "DA-0002", world_slug: "seeded" })
    );

    assert.ok("id" in result);
    assert.deepEqual(result.structured_links, [
      {
        edge_id: result.structured_links[0]!.edge_id,
        edge_type: "references_record",
        target_node_id: "CHAR-0002",
        target_unresolved_ref: null,
        source_field: "author_character_id"
      }
    ]);
    assert.deepEqual(result.scoped_references, [
      {
        reference_id: "DA-0002#scoped:melissa-threadscar:0",
        display_name: "Melissa Threadscar",
        reference_kind: "person",
        relation: "author_character_id",
        authority_level: "exact_structured_edge",
        target_node_id: "CHAR-0002",
        aliases: []
      }
    ]);
    assert.equal(
      result.edges.filter((edge) => edge.edge_type === "references_record").length,
      1
    );
    assert.equal(
      result.edges.find((edge) => edge.edge_type === "references_record")?.other_node_id,
      "CHAR-0002"
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getNode returns empty structured retrieval arrays when the node has no scoped data", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededWorld(root);

    const result = await withRepoRoot(root, () =>
      getNode({ node_id: "seeded:EVERYDAY_LIFE.md:Quiet-Market:0", world_slug: "seeded" })
    );

    assert.ok("id" in result);
    assert.deepEqual(result.structured_links, []);
    assert.deepEqual(result.scoped_references, []);
  } finally {
    destroyTempRepoRoot(root);
  }
});
