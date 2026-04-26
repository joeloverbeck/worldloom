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
    assert.equal(result.nodes[0]?.match_basis, "exact_id");
    assert.ok((result.nodes[0]?.body_preview.length ?? 0) <= 200);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("searchNodes exhaustive mode returns all matches sorted by node id with match locations", async () => {
  const root = createTempRepoRoot();

  try {
    const nodes = Array.from({ length: 22 }, (_, index) => ({
      node_id: `SEED-${String(index + 1).padStart(4, "0")}`,
      world_slug: "seeded",
      file_path: "CANON_LEDGER.md",
      heading_path: index === 4 ? "Needle civic heading" : null,
      node_type: "canon_fact_record" as const,
      body: index === 9 ? "Neutral body text." : `Needle body mention ${index + 1}.`,
      summary: index === 9 ? "Needle summary only." : null
    }));

    seedWorld(root, {
      worldSlug: "seeded",
      nodes
    });

    const result = await withRepoRoot(root, () =>
      searchNodes({ query: "Needle", filters: { world_slug: "seeded" }, exhaustive: true })
    );

    assert.ok("nodes" in result);
    assert.equal(result.nodes.length, 22);
    assert.deepEqual(
      result.nodes.map((node) => node.id),
      nodes.map((node) => node.node_id).sort((left, right) => left.localeCompare(right))
    );
    assert.equal(result.nodes[4]?.id, "SEED-0005");
    assert.deepEqual(result.nodes[4]?.match_locations, ["body", "heading_path"]);
    assert.equal(result.nodes[9]?.id, "SEED-0010");
    assert.deepEqual(result.nodes[9]?.match_locations, ["summary"]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("searchNodes exhaustive mode returns an empty result for no matches", async () => {
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
        }
      ]
    });

    const result = await withRepoRoot(root, () =>
      searchNodes({ query: "Needle", filters: { world_slug: "seeded" }, exhaustive: true })
    );

    assert.ok("nodes" in result);
    assert.deepEqual(result.nodes, []);
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
    assert.ok(result.nodes.every((node) => node.match_basis === "lexical_evidence"));
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
    assert.equal(result.nodes[0]?.match_basis, "canonical_entity");
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
    assert.equal(result.nodes[0]?.match_basis, "lexical_evidence");
    assert.ok((result.nodes[0]?.body_preview.length ?? 0) <= 200);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("searchNodes can include scoped-reference matches in open-text search", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "CHAR-0002",
          world_slug: "seeded",
          file_path: "characters/melissa.md",
          node_type: "character_record",
          body: "Melissa keeps records in the marsh office."
        },
        {
          node_id: "CHAR-0002#scoped:mudbrook:0",
          world_slug: "seeded",
          file_path: "characters/melissa.md",
          node_type: "scoped_reference",
          body: "Scoped reference: Mudbrook"
        }
      ],
      scopedReferences: [
        {
          reference_id: "CHAR-0002#scoped:mudbrook:0",
          world_slug: "seeded",
          display_name: "Mudbrook",
          relation: "current_location",
          source_node_id: "CHAR-0002",
          authority_level: "explicit_scoped_reference"
        }
      ]
    });

    const result = await withRepoRoot(root, () =>
      searchNodes({
        query: "Mudbrook",
        filters: { world_slug: "seeded", include_scoped_references: true }
      })
    );

    assert.ok("nodes" in result);
    assert.deepEqual(
      result.nodes.map((node) => node.id),
      ["CHAR-0002"]
    );
    assert.equal(result.nodes[0]?.match_basis, "scoped_reference");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("searchNodes does not include scoped-reference matches by default", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "CHAR-0002",
          world_slug: "seeded",
          file_path: "characters/melissa.md",
          node_type: "character_record",
          body: "Melissa keeps records in the marsh office."
        },
        {
          node_id: "CHAR-0002#scoped:mudbrook:0",
          world_slug: "seeded",
          file_path: "characters/melissa.md",
          node_type: "scoped_reference",
          body: "Scoped reference: Mudbrook"
        }
      ],
      scopedReferences: [
        {
          reference_id: "CHAR-0002#scoped:mudbrook:0",
          world_slug: "seeded",
          display_name: "Mudbrook",
          relation: "current_location",
          source_node_id: "CHAR-0002",
          authority_level: "explicit_scoped_reference"
        }
      ]
    });

    const result = await withRepoRoot(root, () =>
      searchNodes({
        query: "Mudbrook",
        filters: { world_slug: "seeded" }
      })
    );

    assert.ok("nodes" in result);
    assert.deepEqual(result.nodes, []);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("searchNodes reference_name filter returns exact scoped-reference matches with blank query", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "CHAR-0002",
          world_slug: "seeded",
          file_path: "characters/melissa.md",
          node_type: "character_record",
          body: "Melissa keeps records in the marsh office."
        },
        {
          node_id: "CHAR-0002#scoped:mudbrook:0",
          world_slug: "seeded",
          file_path: "characters/melissa.md",
          node_type: "scoped_reference",
          body: "Scoped reference: Mudbrook"
        }
      ],
      scopedReferences: [
        {
          reference_id: "CHAR-0002#scoped:mudbrook:0",
          world_slug: "seeded",
          display_name: "Mudbrook",
          relation: "current_location",
          source_node_id: "CHAR-0002",
          authority_level: "explicit_scoped_reference"
        }
      ]
    });

    const result = await withRepoRoot(root, () =>
      searchNodes({
        query: "",
        filters: { world_slug: "seeded", reference_name: "Mudbrook" }
      })
    );

    assert.ok("nodes" in result);
    assert.deepEqual(
      result.nodes.map((node) => node.id),
      ["CHAR-0002"]
    );
    assert.equal(result.nodes[0]?.match_basis, "scoped_reference");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("searchNodes promotes exact structured-edge matches to structured_record_edge match_basis", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "DA-0002",
          world_slug: "seeded",
          file_path: "diegetic/report.md",
          node_type: "diegetic_artifact_record",
          body: "After-action report with an author reference."
        },
        {
          node_id: "DA-0002#structured:author_character_id:0",
          world_slug: "seeded",
          file_path: "diegetic/report.md",
          node_type: "scoped_reference",
          body: "Structured reference: Melissa Threadscar"
        }
      ],
      scopedReferences: [
        {
          reference_id: "DA-0002#structured:author_character_id:0",
          world_slug: "seeded",
          display_name: "Melissa Threadscar",
          relation: "author_character_id",
          source_node_id: "DA-0002",
          authority_level: "exact_structured_edge"
        }
      ]
    });

    const result = await withRepoRoot(root, () =>
      searchNodes({
        query: "",
        filters: { world_slug: "seeded", reference_name: "Melissa Threadscar" }
      })
    );

    assert.ok("nodes" in result);
    assert.deepEqual(
      result.nodes.map((node) => node.id),
      ["DA-0002"]
    );
    assert.equal(result.nodes[0]?.match_basis, "structured_record_edge");
  } finally {
    destroyTempRepoRoot(root);
  }
});
