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
        node_id: "seeded:EVERYDAY_LIFE.md:Dawn-Market:0",
        world_slug: "seeded",
        file_path: "EVERYDAY_LIFE.md",
        heading_path: "Dawn Market",
        node_type: "section",
        body: "Morning trade begins before first light."
      },
      {
        node_id: "DA-0002",
        world_slug: "seeded",
        file_path: "diegetic-artifacts/after-action-report.md",
        node_type: "diegetic_artifact_record",
        body: "---\nauthor_character_id: CHAR-0002\n---\nFiled by Melissa from Brinewick.\n"
      },
      {
        node_id: "CHAR-0002",
        world_slug: "seeded",
        file_path: "characters/melissa-threadscar.md",
        node_type: "character_record",
        body: "---\nname: Melissa Threadscar\n---\nMelissa lives in Brinewick.\n"
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
        node_id: "DA-0002#scoped:brinewick:0",
        world_slug: "seeded",
        file_path: "diegetic-artifacts/after-action-report.md",
        node_type: "scoped_reference",
        body: "Brinewick"
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
        target_node_id: "DA-0002#scoped:brinewick:0",
        edge_type: "references_scoped_name"
      },
      {
        source_node_id: "DA-0002",
        target_node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        edge_type: "required_world_update"
      },
      {
        source_node_id: "M-1",
        target_node_id: "DA-0002",
        edge_type: "firewall_for"
      }
    ],
    scopedReferences: [
      {
        reference_id: "DA-0002#scoped:brinewick:0",
        world_slug: "seeded",
        display_name: "Brinewick",
        reference_kind: "place",
        relation: "filing_location",
        source_node_id: "DA-0002"
      }
    ],
    validationResults: [
      {
        world_slug: "seeded",
        validator_name: "continuity",
        severity: "warning",
        code: "dangling_update",
        message: "GEOGRAPHY.md needs a synchronized update after DA-0002."
      }
    ]
  });
}

test("getContextPacket returns a fully populated v2 diegetic_artifact_generation packet", async () => {
  const root = createTempRepoRoot();

  try {
    buildContextPacketWorld(root);

    const result = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 8000
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.task_header.task_type, "diegetic_artifact_generation");
    assert.equal(result.task_header.world_slug, "seeded");
    assert.equal(result.task_header.packet_version, 2);
    assert.ok(result.task_header.token_budget.allocated <= 8000);
    assert.ok(result.local_authority.nodes.some((node) => node.id === "DA-0002"));
    assert.ok(result.local_authority.nodes.some((node) => node.id === "DA-0002#scoped:brinewick:0"));
    assert.ok(result.exact_record_links.nodes.some((node) => node.id === "CHAR-0002"));
    assert.ok(
      result.scoped_local_context.nodes.some((node) => node.id === "seeded:GEOGRAPHY.md:Brinewick:0")
    );
    assert.ok(
      result.governing_world_context.nodes.some((node) => node.file_path === "WORLD_KERNEL.md"),
      "world kernel must be in the governing world context"
    );
    assert.ok(
      result.governing_world_context.open_risks.some((risk) => risk.code === "dangling_update"),
      "validation_results rows should surface as open risks"
    );
    assert.ok(
      result.governing_world_context.nodes.some((node) => node.id === "M-1") ||
        result.governing_world_context.open_risks.some(
          (risk) => risk.code === "mystery_reserve_firewall"
        )
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getContextPacket defaults canon_addition requests to a 16000 token budget", async () => {
  const root = createTempRepoRoot();

  try {
    buildContextPacketWorld(root);

    const result = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "canon_addition",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"]
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.task_header.token_budget.requested, 16000);
    assert.ok(result.task_header.token_budget.allocated <= 16000);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getContextPacket keeps the existing 8000 default for character_generation", async () => {
  const root = createTempRepoRoot();

  try {
    buildContextPacketWorld(root);

    const result = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "character_generation",
        world_slug: "seeded",
        seed_nodes: ["CHAR-0002"]
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.task_header.token_budget.requested, 8000);
    assert.ok(result.task_header.token_budget.allocated <= 8000);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getContextPacket accepts canon-pipeline-adjacent task types with specific default budgets", async () => {
  const root = createTempRepoRoot();

  try {
    buildContextPacketWorld(root);

    const cases = [
      ["propose_new_canon_facts", 15000],
      ["propose_new_characters", 15000],
      ["propose_new_worlds_from_preferences", 12000],
      ["canon_facts_from_diegetic_artifacts", 12000]
    ] as const;

    for (const [taskType, defaultBudget] of cases) {
      const result = await withRepoRoot(root, () =>
        getContextPacket({
          task_type: taskType,
          world_slug: "seeded",
          seed_nodes: ["DA-0002"]
        })
      );

      assert.ok(!("code" in result), `${taskType} should produce a packet response`);
      assert.equal(result.task_header.task_type, taskType);
      assert.equal(result.task_header.token_budget.requested, defaultBudget);
      assert.ok(result.task_header.token_budget.allocated <= defaultBudget);
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});
