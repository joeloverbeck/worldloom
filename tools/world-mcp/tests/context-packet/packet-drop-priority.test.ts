import assert from "node:assert/strict";
import test from "node:test";

import { assembleContextPacket } from "../../src/context-packet/assemble";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared";

function seedDropPriorityWorld(root: string): void {
  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "seeded:WORLD_KERNEL.md:Kernel:0",
        world_slug: "seeded",
        file_path: "WORLD_KERNEL.md",
        heading_path: "Kernel",
        node_type: "section",
        body: `Kernel ${"salt ".repeat(60)}`
      },
      {
        node_id: "seeded:INVARIANTS.md:Rule:0",
        world_slug: "seeded",
        file_path: "INVARIANTS.md",
        heading_path: "Rule",
        node_type: "invariant",
        body: `Invariant ${"brine ".repeat(60)}`
      },
      {
        node_id: "seeded:EVERYDAY_LIFE.md:Dawn:0",
        world_slug: "seeded",
        file_path: "EVERYDAY_LIFE.md",
        heading_path: "Dawn",
        node_type: "section",
        body: `Everyday ${"market ".repeat(60)}`
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
        body: `Harrowgate ${"port ".repeat(50)}`
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

const DROP_PRIORITY_ORDER = [
  "impact_surfaces",
  "scoped_local_context",
  "exact_record_links",
  "governing_world_context"
] as const;

function isSubsequenceOfPriorityOrder(dropped: readonly string[]): boolean {
  let priorityIndex = 0;
  for (const layer of dropped) {
    while (
      priorityIndex < DROP_PRIORITY_ORDER.length &&
      DROP_PRIORITY_ORDER[priorityIndex] !== layer
    ) {
      priorityIndex += 1;
    }
    if (priorityIndex >= DROP_PRIORITY_ORDER.length) {
      return false;
    }
    priorityIndex += 1;
  }
  return true;
}

test("dropped layers always follow priority order: impact → scoped → exact → governing", async () => {
  const root = createTempRepoRoot();

  try {
    seedDropPriorityWorld(root);

    for (const budget of [60, 400, 700, 720, 800, 1500, 4000]) {
      const result = await withRepoRoot(root, () =>
        assembleContextPacket({
          task_type: "diegetic_artifact_generation",
          world_slug: "seeded",
          seed_nodes: ["DA-0002"],
          token_budget: budget
        })
      );

      const dropped =
        "code" in result
          ? ((result.details?.truncation_summary as { dropped_layers: string[] } | undefined)
              ?.dropped_layers ?? [])
          : result.truncation_summary.dropped_layers;

      assert.ok(
        isSubsequenceOfPriorityOrder(dropped),
        `budget=${budget}: dropped order ${JSON.stringify(dropped)} must be a subsequence of ${JSON.stringify(DROP_PRIORITY_ORDER)}`
      );
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("local_authority and task_header survive every drop pass", async () => {
  const root = createTempRepoRoot();

  try {
    seedDropPriorityWorld(root);

    for (const budget of [400, 700, 720, 800, 1500, 4000]) {
      const result = await withRepoRoot(root, () =>
        assembleContextPacket({
          task_type: "diegetic_artifact_generation",
          world_slug: "seeded",
          seed_nodes: ["DA-0002"],
          token_budget: budget
        })
      );

      assert.ok(
        !("code" in result),
        `budget=${budget}: expected packet response, got error code ${"code" in result ? result.code : "n/a"}`
      );
      assert.ok(
        result.local_authority.nodes.some((node) => node.id === "DA-0002"),
        `budget=${budget}: local_authority must still contain the seed node DA-0002`
      );
      assert.equal(
        result.task_header.task_type,
        "diegetic_artifact_generation",
        `budget=${budget}: task_header must remain populated`
      );
      assert.ok(
        result.task_header.seed_nodes.includes("DA-0002"),
        `budget=${budget}: task_header.seed_nodes must remain populated`
      );
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("at strict budget pressure, lower-priority layers are dropped before higher-priority layers", async () => {
  const root = createTempRepoRoot();

  try {
    seedDropPriorityWorld(root);

    const budgets = [400, 700, 720, 800];
    const droppedSets: string[][] = [];
    for (const budget of budgets) {
      const result = await withRepoRoot(root, () =>
        assembleContextPacket({
          task_type: "diegetic_artifact_generation",
          world_slug: "seeded",
          seed_nodes: ["DA-0002"],
          token_budget: budget
        })
      );
      assert.ok(!("code" in result), `budget=${budget}: expected packet response`);
      droppedSets.push(result.truncation_summary.dropped_layers);
    }

    for (let i = 1; i < droppedSets.length; i += 1) {
      const tighter = droppedSets[i - 1] ?? [];
      const looser = droppedSets[i] ?? [];
      assert.ok(
        looser.every((layer) => tighter.includes(layer)),
        `relaxing the budget cannot resurrect a higher-priority drop without first restoring lower-priority layers; tighter=${JSON.stringify(tighter)} looser=${JSON.stringify(looser)}`
      );
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});
