import assert from "node:assert/strict";
import test from "node:test";

import {
  assembleContextPacket,
  DEFAULT_BUDGET_SPLIT
} from "../../src/context-packet/assemble";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared";

function seedBudgetWorld(root: string): void {
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
        node_id: "seeded:INVARIANTS.md:Rule:0",
        world_slug: "seeded",
        file_path: "INVARIANTS.md",
        heading_path: "Rule",
        node_type: "invariant",
        body: `Invariant ${"brine ".repeat(120)}`
      },
      {
        node_id: "seeded:EVERYDAY_LIFE.md:Dawn:0",
        world_slug: "seeded",
        file_path: "EVERYDAY_LIFE.md",
        heading_path: "Dawn",
        node_type: "section",
        body: `Everyday ${"market ".repeat(120)}`
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
        body: "Harrowgate is the filing location."
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

test("default budget split preserves the v2 completeness-class percentages", () => {
  assert.deepEqual(DEFAULT_BUDGET_SPLIT, {
    local_authority: 0.25,
    exact_record_links: 0.15,
    scoped_local_context: 0.2,
    governing_world_context: 0.2,
    impact_surfaces: 0.1,
    overhead: 0.1
  });
});

test("assembler reports packet_incomplete_required_classes when local authority alone cannot fit", async () => {
  const root = createTempRepoRoot();

  try {
    seedBudgetWorld(root);

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
    assert.deepEqual(result.details?.retained_classes, []);
    assert.deepEqual(result.details?.missing_classes, [
      "local_authority",
      "exact_record_links",
      "scoped_local_context",
      "governing_world_context"
    ]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("budget insufficiency retains locality-first classes before dropping governing background", async () => {
  const root = createTempRepoRoot();

  try {
    seedBudgetWorld(root);

    const result = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 260
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "packet_incomplete_required_classes");
    assert.deepEqual(result.details?.retained_classes, [
      "local_authority",
      "exact_record_links",
      "scoped_local_context"
    ]);
    assert.deepEqual(result.details?.missing_classes, ["governing_world_context"]);
  } finally {
    destroyTempRepoRoot(root);
  }
});
