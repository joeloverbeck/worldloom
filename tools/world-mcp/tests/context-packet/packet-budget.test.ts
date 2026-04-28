import assert from "node:assert/strict";
import test from "node:test";

import { assembleContextPacket } from "../../src/context-packet/assemble";
import { estimatePacketTokens } from "../../src/context-packet/shared";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared";

function seedFiveLayerWorld(root: string): void {
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

test("packet response strictly respects token_budget at every fit point", async () => {
  const root = createTempRepoRoot();

  try {
    seedFiveLayerWorld(root);

    for (const budget of [800, 1000, 1500, 4000, 100000]) {
      const result = await withRepoRoot(root, () =>
        assembleContextPacket({
          task_type: "diegetic_artifact_generation",
          world_slug: "seeded",
          seed_nodes: ["DA-0002"],
          token_budget: budget
        })
      );

      assert.ok(!("code" in result), `budget=${budget} should have produced a packet response`);
      assert.ok(
        estimatePacketTokens(result) <= budget,
        `budget=${budget}: packet size ${estimatePacketTokens(result)} exceeded the requested budget`
      );
      assert.ok(
        result.task_header.token_budget.allocated <= budget,
        `budget=${budget}: allocated ${result.task_header.token_budget.allocated} exceeded requested budget`
      );
      assert.ok(
        result.local_authority.nodes.some((node) => node.id === "DA-0002"),
        `budget=${budget}: local_authority must still contain the seed node DA-0002`
      );
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("packet returns packet_incomplete_required_classes when even local_authority cannot fit", async () => {
  const root = createTempRepoRoot();

  try {
    seedFiveLayerWorld(root);

    const result = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 20
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "packet_incomplete_required_classes");
    assert.ok(Array.isArray(result.details?.missing_classes));
    assert.ok((result.details?.missing_classes as string[]).includes("local_authority"));
    assert.deepEqual(result.details?.retained_classes, []);

    const truncationSummary = result.details?.truncation_summary as
      | { dropped_layers: string[] }
      | undefined;
    assert.ok(truncationSummary !== undefined, "truncation_summary must be present in error details");
    assert.ok(
      truncationSummary.dropped_layers.length > 0,
      "truncation_summary must list every droppable layer that was emptied during the failed fit attempt"
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("packet retry at minimum_required_budget succeeds with local_authority intact", async () => {
  const root = createTempRepoRoot();

  try {
    seedFiveLayerWorld(root);

    const initial = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 20
      })
    );

    assert.ok("code" in initial);
    const retryBudget = (initial.details?.retry_with as { token_budget?: unknown } | undefined)
      ?.token_budget;
    assert.equal(typeof retryBudget, "number");
    assert.equal(retryBudget, initial.details?.minimum_required_budget);

    const retry = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: retryBudget as number
      })
    );

    assert.ok(!("code" in retry));
    assert.ok(estimatePacketTokens(retry) <= (retryBudget as number));
    assert.ok(retry.local_authority.nodes.some((node) => node.id === "DA-0002"));
  } finally {
    destroyTempRepoRoot(root);
  }
});
