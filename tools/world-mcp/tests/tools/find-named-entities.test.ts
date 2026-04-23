import assert from "node:assert/strict";
import test from "node:test";

import { findNamedEntities } from "../../src/tools/find-named-entities";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared";

function buildEntityWorld(root: string): void {
  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "entity:brinewick",
        world_slug: "seeded",
        file_path: "ONTOLOGY.md",
        node_type: "named_entity",
        body: "Brinewick"
      },
      {
        node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        world_slug: "seeded",
        file_path: "GEOGRAPHY.md",
        heading_path: "Brinewick",
        node_type: "section",
        body: "Brinewick is the salt port."
      },
      {
        node_id: "seeded:INSTITUTIONS.md:Harbor Office:0",
        world_slug: "seeded",
        file_path: "INSTITUTIONS.md",
        heading_path: "Harbor Office",
        node_type: "section",
        body: "Brinewick-the-Port appears in the charter."
      },
      {
        node_id: "seeded:EVERYDAY_LIFE.md:Dialect:0",
        world_slug: "seeded",
        file_path: "EVERYDAY_LIFE.md",
        heading_path: "Dialect",
        node_type: "section",
        body: "Brinewicker is a local adjective."
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
    aliases: [
      {
        entity_id: "entity:brinewick",
        alias_text: "Brinewick-the-Port",
        alias_kind: "exact_structured",
        source_node_id: "entity:brinewick"
      }
    ],
    mentions: [
      {
        node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        surface_text: "Brinewick",
        resolved_entity_id: "entity:brinewick",
        resolution_kind: "canonical",
        extraction_method: "exact_canonical"
      },
      {
        node_id: "seeded:INSTITUTIONS.md:Harbor Office:0",
        surface_text: "Brinewick-the-Port",
        resolved_entity_id: "entity:brinewick",
        resolution_kind: "alias",
        extraction_method: "exact_alias"
      },
      {
        node_id: "seeded:EVERYDAY_LIFE.md:Dialect:0",
        surface_text: "Brinewicker",
        resolution_kind: "unresolved",
        extraction_method: "heuristic_phrase"
      }
    ]
  });
}

test("findNamedEntities returns canonical matches for exact names", async () => {
  const root = createTempRepoRoot();

  try {
    buildEntityWorld(root);

    const result = await withRepoRoot(root, () =>
      findNamedEntities({ world_slug: "seeded", names: ["Brinewick"] })
    );

    assert.ok(!("code" in result));
    assert.equal(result.canonical_matches.length, 1);
    assert.equal(result.canonical_matches[0]?.match_kind, "canonical_name");
    assert.equal(result.canonical_matches[0]?.canonical_name, "Brinewick");
    assert.deepEqual(result.canonical_matches[0]?.mentions_by_node_type, [
      { node_type: "section", count: 2 }
    ]);
    assert.deepEqual(result.surface_matches, []);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("findNamedEntities returns alias matches in canonical_matches", async () => {
  const root = createTempRepoRoot();

  try {
    buildEntityWorld(root);

    const result = await withRepoRoot(root, () =>
      findNamedEntities({ world_slug: "seeded", names: ["Brinewick-the-Port"] })
    );

    assert.ok(!("code" in result));
    assert.equal(result.canonical_matches.length, 1);
    assert.equal(result.canonical_matches[0]?.match_kind, "alias");
    assert.equal(result.canonical_matches[0]?.matched_text, "Brinewick-the-Port");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("findNamedEntities returns unresolved exact surface matches as noncanonical", async () => {
  const root = createTempRepoRoot();

  try {
    buildEntityWorld(root);

    const result = await withRepoRoot(root, () =>
      findNamedEntities({ world_slug: "seeded", names: ["Brinewicker"] })
    );

    assert.ok(!("code" in result));
    assert.deepEqual(result.canonical_matches, []);
    assert.deepEqual(result.surface_matches, [
      {
        query: "Brinewicker",
        surface_text: "Brinewicker",
        label: "noncanonical",
        node_type: "section",
        count: 1
      }
    ]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("findNamedEntities sorts canonical exact names ahead of alias matches", async () => {
  const root = createTempRepoRoot();

  try {
    buildEntityWorld(root);

    const result = await withRepoRoot(root, () =>
      findNamedEntities({
        world_slug: "seeded",
        names: ["Brinewick-the-Port", "Brinewick"]
      })
    );

    assert.ok(!("code" in result));
    assert.deepEqual(
      result.canonical_matches.map(
        (match: { query: string; match_kind: string }) => `${match.query}:${match.match_kind}`
      ),
      ["Brinewick:canonical_name", "Brinewick-the-Port:alias"]
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});
