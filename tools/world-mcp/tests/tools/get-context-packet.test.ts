import assert from "node:assert/strict";
import test from "node:test";

import { getContextPacket } from "../../src/tools/get-context-packet";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared";

function buildContextPacketWorld(root: string): void {
  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "seeded:WORLD_KERNEL.md:Kernel:0",
        world_slug: "seeded",
        file_path: "WORLD_KERNEL.md",
        heading_path: "Kernel",
        node_type: "section",
        body: "The world is defined by brine politics."
      },
      {
        node_id: "seeded:INVARIANTS.md:Salt Trade:0",
        world_slug: "seeded",
        file_path: "INVARIANTS.md",
        heading_path: "Salt Trade",
        node_type: "invariant",
        body: "Salt routes remain politically contested."
      },
      {
        node_id: "CF-0001",
        world_slug: "seeded",
        file_path: "CANON_LEDGER.md",
        node_type: "canon_fact_record",
        body: "id: CF-0001\nstatement: Brinewick anchors the western salt trade.\n"
      },
      {
        node_id: "M-1",
        world_slug: "seeded",
        file_path: "MYSTERY_RESERVE.md",
        heading_path: "M-1",
        node_type: "mystery_reserve_entry",
        body: "The original brine source remains unknown."
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
        node_id: "seeded:INSTITUTIONS.md:Harbor Office:0",
        world_slug: "seeded",
        file_path: "INSTITUTIONS.md",
        heading_path: "Harbor Office",
        node_type: "section",
        body: "The Harbor Office regulates brine exports."
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
        source_node_id: "M-1",
        target_node_id: "CF-0001",
        edge_type: "firewall_for"
      },
      {
        source_node_id: "CF-0001",
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
    validationResults: [
      {
        world_slug: "seeded",
        validator_name: "continuity",
        severity: "warning",
        code: "dangling_update",
        message: "GEOGRAPHY.md needs a synchronized update after CF-0001."
      }
    ]
  });
}

test("getContextPacket returns a fully populated canon_addition packet", async () => {
  const root = createTempRepoRoot();

  try {
    buildContextPacketWorld(root);

    const result = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "canon_addition",
        world_slug: "seeded",
        seed_nodes: ["CF-0001"],
        token_budget: 8000
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.task_header.task_type, "canon_addition");
    assert.equal(result.task_header.world_slug, "seeded");
    assert.equal(result.task_header.packet_version, 1);
    assert.ok(result.task_header.token_budget.allocated <= 8000);
    assert.ok(result.nucleus.nodes.some((node) => node.id === "CF-0001"));
    assert.ok(result.nucleus.nodes.some((node) => node.id === "M-1"));
    assert.ok(
      result.nucleus.nodes.some((node) => node.file_path === "WORLD_KERNEL.md"),
      "world kernel must be in the nucleus"
    );
    assert.ok(
      result.constraints.open_risks.some((risk) => risk.code === "dangling_update"),
      "validation_results rows should surface as open risks"
    );
    assert.ok(
      result.nucleus.nodes.some((node) => node.id === "seeded:GEOGRAPHY.md:Brinewick:0") ||
        result.suggested_impact_surfaces.nodes.some(
          (node) => node.id === "seeded:GEOGRAPHY.md:Brinewick:0"
        )
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});
