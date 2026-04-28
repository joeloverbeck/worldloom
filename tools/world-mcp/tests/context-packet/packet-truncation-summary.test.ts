import assert from "node:assert/strict";
import test from "node:test";

import { assembleContextPacket } from "../../src/context-packet/assemble";
import { TRUNCATION_FALLBACK_ADVICE } from "../../src/context-packet/shared";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared";

function seedTruncationSummaryWorld(root: string): void {
  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "seeded:WORLD_KERNEL.md:Kernel:0",
        world_slug: "seeded",
        file_path: "WORLD_KERNEL.md",
        heading_path: "Kernel",
        node_type: "section",
        body: `Kernel ${"salt ".repeat(80)}`
      },
      {
        node_id: "seeded:INVARIANTS.md:Rule:0",
        world_slug: "seeded",
        file_path: "INVARIANTS.md",
        heading_path: "Rule",
        node_type: "invariant",
        body: `Invariant ${"brine ".repeat(80)}`
      },
      {
        node_id: "seeded:EVERYDAY_LIFE.md:Dawn:0",
        world_slug: "seeded",
        file_path: "EVERYDAY_LIFE.md",
        heading_path: "Dawn",
        node_type: "section",
        body: `Everyday ${"market ".repeat(80)}`
      },
      {
        node_id: "DA-0002",
        world_slug: "seeded",
        file_path: "diegetic-artifacts/report.md",
        node_type: "diegetic_artifact_record",
        body: "---\nauthor_character_id: CHAR-0002\n---\nReport body.\n"
      },
      {
        node_id: "CHAR-0002",
        world_slug: "seeded",
        file_path: "characters/melissa-threadscar.md",
        node_type: "character_record",
        body: "---\nname: Melissa Threadscar\n---\nMelissa.\n"
      },
      {
        node_id: "seeded:GEOGRAPHY.md:Harrowgate:0",
        world_slug: "seeded",
        file_path: "GEOGRAPHY.md",
        heading_path: "Harrowgate",
        node_type: "section",
        body: `Harrowgate ${"port ".repeat(60)}`
      },
      {
        node_id: "DA-0002#scoped:harrowgate:0",
        world_slug: "seeded",
        file_path: "diegetic-artifacts/report.md",
        node_type: "scoped_reference",
        body: "Harrowgate"
      }
    ],
    edges: [
      {
        source_node_id: "DA-0002",
        target_node_id: "CHAR-0002",
        edge_type: "references_record"
      },
      {
        source_node_id: "DA-0002",
        target_node_id: "DA-0002#scoped:harrowgate:0",
        edge_type: "references_scoped_name"
      },
      {
        source_node_id: "DA-0002",
        target_node_id: "seeded:GEOGRAPHY.md:Harrowgate:0",
        edge_type: "required_world_update"
      }
    ],
    scopedReferences: [
      {
        reference_id: "DA-0002#scoped:harrowgate:0",
        world_slug: "seeded",
        display_name: "Harrowgate",
        reference_kind: "place",
        relation: "filing_location",
        source_node_id: "DA-0002"
      }
    ]
  });
}

test("truncation_summary is always present with the documented schema keys", async () => {
  const root = createTempRepoRoot();

  try {
    seedTruncationSummaryWorld(root);

    const result = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 100000
      })
    );

    assert.ok(!("code" in result));
    assert.ok(result.truncation_summary !== undefined);
    assert.deepEqual(Object.keys(result.truncation_summary).sort(), [
      "dropped_layers",
      "dropped_node_ids_by_layer",
      "fallback_advice"
    ]);
    assert.deepEqual(result.truncation_summary.dropped_layers, []);
    assert.deepEqual(result.truncation_summary.dropped_node_ids_by_layer, {});
    assert.equal(result.truncation_summary.fallback_advice, TRUNCATION_FALLBACK_ADVICE);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("truncation_summary records every dropped layer and its emptied node-id list", async () => {
  const root = createTempRepoRoot();

  try {
    seedTruncationSummaryWorld(root);

    const fullPacket = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 100000
      })
    );
    assert.ok(!("code" in fullPacket));

    const expectedImpactNodeIds = fullPacket.impact_surfaces.nodes.map((node) => node.id).sort();
    const expectedScopedNodeIds = fullPacket.scoped_local_context.nodes.map((node) => node.id).sort();

    const truncated = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 800
      })
    );
    assert.ok(!("code" in truncated));

    const dropped = truncated.truncation_summary.dropped_layers;
    assert.ok(dropped.length > 0, "expected at least one dropped layer at constrained budget");

    if (dropped.includes("impact_surfaces")) {
      assert.deepEqual(
        truncated.truncation_summary.dropped_node_ids_by_layer.impact_surfaces?.slice().sort(),
        expectedImpactNodeIds
      );
    }
    if (dropped.includes("scoped_local_context")) {
      assert.deepEqual(
        truncated.truncation_summary.dropped_node_ids_by_layer.scoped_local_context?.slice().sort(),
        expectedScopedNodeIds
      );
    }

    assert.equal(truncated.truncation_summary.fallback_advice, TRUNCATION_FALLBACK_ADVICE);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("dropped layer entries appear only for layers that actually held content", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "seeded:WORLD_KERNEL.md:Kernel:0",
          world_slug: "seeded",
          file_path: "WORLD_KERNEL.md",
          heading_path: "Kernel",
          node_type: "section",
          body: `Kernel ${"salt ".repeat(120)}`
        },
        {
          node_id: "DA-0002",
          world_slug: "seeded",
          file_path: "diegetic-artifacts/report.md",
          node_type: "diegetic_artifact_record",
          body: "---\nauthor_character_id: null\n---\nReport body.\n"
        }
      ]
    });

    const result = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 400
      })
    );

    assert.ok(!("code" in result));
    for (const layer of result.truncation_summary.dropped_layers) {
      const ids = result.truncation_summary.dropped_node_ids_by_layer[layer];
      assert.ok(
        Array.isArray(ids),
        `dropped_node_ids_by_layer.${layer} must exist when ${layer} is in dropped_layers`
      );
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});
