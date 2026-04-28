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
    assert.ok(Array.isArray(result.details?.missing_classes));
    assert.ok((result.details?.missing_classes as string[]).includes("local_authority"));
    assert.equal(
      (result.details?.retry_with as { token_budget?: unknown } | undefined)?.token_budget,
      result.details?.minimum_required_budget
    );
    const truncationSummary = result.details?.truncation_summary as
      | { dropped_layers: string[]; fallback_advice: string }
      | undefined;
    assert.ok(truncationSummary !== undefined);
    assert.ok(truncationSummary.dropped_layers.length > 0);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("budget pressure drops impact_surfaces first while preserving local_authority intact", async () => {
  const root = createTempRepoRoot();

  try {
    seedBudgetWorld(root);

    const tightResult = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 700
      })
    );

    assert.ok(!("code" in tightResult));
    assert.ok(tightResult.task_header.token_budget.allocated <= 700);
    assert.ok(tightResult.local_authority.nodes.some((node) => node.id === "DA-0002"));
    assert.ok(
      tightResult.truncation_summary.dropped_layers.includes("impact_surfaces"),
      "impact_surfaces should be the first layer dropped under budget pressure"
    );
    for (const dropped of tightResult.truncation_summary.dropped_layers) {
      assert.ok(
        ["impact_surfaces", "scoped_local_context", "exact_record_links", "governing_world_context"].includes(
          dropped
        ),
        `unexpected dropped layer ${dropped}`
      );
    }

    const wideResult = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 100000
      })
    );

    assert.ok(!("code" in wideResult));
    assert.deepEqual(wideResult.truncation_summary.dropped_layers, []);
    assert.deepEqual(wideResult.truncation_summary.dropped_node_ids_by_layer, {});
  } finally {
    destroyTempRepoRoot(root);
  }
});
