import assert from "node:assert/strict";
import test from "node:test";

import { searchNodes } from "../../src/tools/search-nodes";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared";

function longBody(prefix: string): string {
  return `${prefix} ${"lorem ipsum ".repeat(40)}`.trim();
}

test("searchNodes keeps an exact node id hit at the top and truncates to twenty results", async () => {
  const root = createTempRepoRoot();

  try {
    const fillerNodes = Array.from({ length: 22 }, (_, index) => ({
      node_id: `animalia:GEOGRAPHY.md:Brinewick:${index + 1}`,
      world_slug: "seeded",
      file_path: "GEOGRAPHY.md",
      heading_path: `Brinewick ${index + 1}`,
      node_type: "section" as const,
      body: `Brinewick harbor note ${index + 1} cross-references CF-0001`
    }));

    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "CF-0001",
          world_slug: "seeded",
          file_path: "CANON_LEDGER.md",
          node_type: "canon_fact_record",
          body: "id: CF-0001\nstatement: Brinewick survives on brine trade and anchors CF-0001.\n",
          summary: null
        },
        ...fillerNodes
      ]
    });

    const result = await withRepoRoot(root, () =>
      searchNodes({ query: "CF-0001", filters: { world_slug: "seeded" } })
    );

    assert.ok("nodes" in result);
    assert.equal(result.nodes.length, 20);
    assert.equal(result.nodes[0]?.id, "CF-0001");
    assert.equal(result.nodes[0]?.summary, null);
    assert.ok((result.nodes[0]?.body_preview.length ?? 0) <= 200);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("searchNodes honors a node_type filter", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "CF-0001",
          world_slug: "seeded",
          file_path: "CANON_LEDGER.md",
          node_type: "canon_fact_record",
          body: "Brinewick canon fact"
        },
        {
          node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
          world_slug: "seeded",
          file_path: "GEOGRAPHY.md",
          heading_path: "Brinewick",
          node_type: "section",
          body: "Brinewick section"
        }
      ]
    });

    const result = await withRepoRoot(root, () =>
      searchNodes({ query: "Brinewick", filters: { world_slug: "seeded", node_type: "section" } })
    );

    assert.ok("nodes" in result);
    assert.deepEqual(
      result.nodes.map((node) => node.node_type),
      ["section"]
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("searchNodes entity_name filter matches canonical names and aliases but not unresolved surface text", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "CF-0001",
          world_slug: "seeded",
          file_path: "CANON_LEDGER.md",
          node_type: "canon_fact_record",
          body: "Brinewick is the salt port."
        },
        {
          node_id: "CF-0002",
          world_slug: "seeded",
          file_path: "CANON_LEDGER.md",
          node_type: "canon_fact_record",
          body: "Known Alias appears here but never resolves."
        },
        {
          node_id: "entity:brinewick",
          world_slug: "seeded",
          file_path: "ONTOLOGY.md",
          node_type: "named_entity",
          body: "Brinewick"
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
          alias_text: "Known Alias",
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
        },
        {
          node_id: "CF-0002",
          surface_text: "Known Alias",
          resolved_entity_id: null,
          resolution_kind: "unresolved",
          extraction_method: "heuristic_phrase"
        }
      ]
    });

    const result = await withRepoRoot(root, () =>
      searchNodes({
        query: "Brinewick",
        filters: { world_slug: "seeded", entity_name: "Known Alias" }
      })
    );

    assert.ok("nodes" in result);
    assert.deepEqual(
      result.nodes.map((node) => node.id),
      ["CF-0001"]
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("searchNodes preserves a null summary and truncates long previews", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "CF-0001",
          world_slug: "seeded",
          file_path: "CANON_LEDGER.md",
          node_type: "canon_fact_record",
          body: longBody("Brinewick summary fallback"),
          summary: null
        }
      ]
    });

    const result = await withRepoRoot(root, () =>
      searchNodes({ query: "Brinewick", filters: { world_slug: "seeded" } })
    );

    assert.ok("nodes" in result);
    assert.equal(result.nodes[0]?.summary, null);
    assert.ok((result.nodes[0]?.body_preview.length ?? 0) <= 200);
  } finally {
    destroyTempRepoRoot(root);
  }
});
