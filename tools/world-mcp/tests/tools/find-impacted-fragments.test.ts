import assert from "node:assert/strict";
import test from "node:test";

import { findImpactedFragments } from "../../src/tools/find-impacted-fragments";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared";

function buildImpactWorld(root: string): void {
  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "CF-0042",
        world_slug: "seeded",
        file_path: "CANON_LEDGER.md",
        node_type: "canon_fact_record",
        body: "CF-0042"
      },
      {
        node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        world_slug: "seeded",
        file_path: "GEOGRAPHY.md",
        heading_path: "Brinewick",
        node_type: "section",
        body: "Brinewick overview."
      },
      {
        node_id: "seeded:INSTITUTIONS.md:Harbor Office:0",
        world_slug: "seeded",
        file_path: "INSTITUTIONS.md",
        heading_path: "Harbor Office",
        node_type: "section",
        body: "The Harbor Office governs Brinewick shipping."
      },
      {
        node_id: "seeded:EVERYDAY_LIFE.md:Dock Talk:0",
        world_slug: "seeded",
        file_path: "EVERYDAY_LIFE.md",
        heading_path: "Dock Talk",
        node_type: "section",
        body: "Brinewicker is a dockside adjective."
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
        source_node_id: "CF-0042",
        target_node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        edge_type: "required_world_update"
      },
      {
        source_node_id: "CF-0042",
        target_node_id: "entity:brinewick",
        edge_type: "mentions_entity"
      },
      {
        source_node_id: "seeded:INSTITUTIONS.md:Harbor Office:0",
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
        node_id: "CF-0042",
        surface_text: "Brinewick",
        resolved_entity_id: "entity:brinewick",
        resolution_kind: "canonical",
        extraction_method: "exact_canonical"
      },
      {
        node_id: "seeded:INSTITUTIONS.md:Harbor Office:0",
        surface_text: "Brinewick",
        resolved_entity_id: "entity:brinewick",
        resolution_kind: "canonical",
        extraction_method: "exact_canonical"
      },
      {
        node_id: "seeded:EVERYDAY_LIFE.md:Dock Talk:0",
        surface_text: "Brinewicker",
        resolution_kind: "unresolved",
        extraction_method: "heuristic_phrase"
      }
    ]
  });
}

test("findImpactedFragments returns required updates and canonical entity-linked fragments only", async () => {
  const root = createTempRepoRoot();

  try {
    buildImpactWorld(root);

    const result = await withRepoRoot(root, () =>
      findImpactedFragments({ world_slug: "seeded", node_ids: ["CF-0042"] })
    );

    assert.ok("impacted" in result);
    assert.deepEqual(
      result.impacted.map((fragment) => fragment.id),
      ["seeded:GEOGRAPHY.md:Brinewick:0", "seeded:INSTITUTIONS.md:Harbor Office:0"]
    );
    assert.ok(result.impacted.every((fragment) => fragment.fallback === "canonical"));
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("findImpactedFragments returns an empty set for empty input", async () => {
  const root = createTempRepoRoot();

  try {
    buildImpactWorld(root);

    const result = await withRepoRoot(root, () =>
      findImpactedFragments({ world_slug: "seeded", node_ids: [] })
    );

    assert.deepEqual(result, { impacted: [] });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("findImpactedFragments returns node_not_found for a missing source node", async () => {
  const root = createTempRepoRoot();

  try {
    buildImpactWorld(root);

    const result = await withRepoRoot(root, () =>
      findImpactedFragments({ world_slug: "seeded", node_ids: ["CF-9999"] })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "node_not_found");
  } finally {
    destroyTempRepoRoot(root);
  }
});
