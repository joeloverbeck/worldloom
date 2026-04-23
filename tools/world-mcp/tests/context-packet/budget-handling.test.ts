import assert from "node:assert/strict";
import test from "node:test";

import {
  assembleContextPacket,
  DEFAULT_BUDGET_SPLIT
} from "../../src/context-packet/assemble";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared";

function seedBudgetWorld(root: string): void {
  const extraSections = Array.from({ length: 10 }, (_, index) => ({
    node_id: `seeded:GEOGRAPHY.md:Sibling:${index}`,
    world_slug: "seeded",
    file_path: "GEOGRAPHY.md",
    heading_path: `Sibling ${index}`,
    node_type: "section" as const,
    body: `Sibling context ${index} ${"salt ".repeat(30)}`
  }));

  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "seeded:WORLD_KERNEL.md:Kernel:0",
        world_slug: "seeded",
        file_path: "WORLD_KERNEL.md",
        heading_path: "Kernel",
        node_type: "section",
        body: "The world is governed by harsh brine politics."
      },
      {
        node_id: "seeded:INVARIANTS.md:Rule:0",
        world_slug: "seeded",
        file_path: "INVARIANTS.md",
        heading_path: "Rule",
        node_type: "invariant",
        body: "Salt routes remain contested."
      },
      {
        node_id: "CF-0001",
        world_slug: "seeded",
        file_path: "CANON_LEDGER.md",
        node_type: "canon_fact_record",
        body: `CF-0001 ${"brine ".repeat(100)}`
      },
      {
        node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        world_slug: "seeded",
        file_path: "GEOGRAPHY.md",
        heading_path: "Brinewick",
        node_type: "section",
        body: `Brinewick ${"harbor ".repeat(80)}`
      },
      {
        node_id: "M-1",
        world_slug: "seeded",
        file_path: "MYSTERY_RESERVE.md",
        heading_path: "M-1",
        node_type: "mystery_reserve_entry",
        body: `Mystery ${"unknown ".repeat(60)}`
      },
      ...extraSections
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
      }
    ],
    validationResults: [
      {
        world_slug: "seeded",
        validator_name: "continuity",
        severity: "warning",
        code: "risk-1",
        message: "First risk"
      },
      {
        world_slug: "seeded",
        validator_name: "continuity",
        severity: "warning",
        code: "risk-2",
        message: "Second risk"
      }
    ]
  });
}

test("default budget split preserves the spec percentages", () => {
  assert.deepEqual(DEFAULT_BUDGET_SPLIT, {
    nucleus: 0.4,
    envelope: 0.25,
    constraints: 0.15,
    suggested_impact_surfaces: 0.1,
    overhead: 0.1
  });
});

test("budget pressure drops envelope before suggested impact and open risks", async () => {
  const root = createTempRepoRoot();

  try {
    seedBudgetWorld(root);

    const generousPacket = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "canon_addition",
        world_slug: "seeded",
        seed_nodes: ["CF-0001"],
        token_budget: 4000
      })
    );
    const constrainedPacket = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "canon_addition",
        world_slug: "seeded",
        seed_nodes: ["CF-0001"],
        token_budget: 500
      })
    );

    assert.ok(!("code" in generousPacket));
    assert.ok(!("code" in constrainedPacket));
    assert.ok(constrainedPacket.nucleus.nodes.length > 0);
    assert.ok(
      constrainedPacket.envelope.nodes.length < generousPacket.envelope.nodes.length,
      "envelope should trim first under budget pressure"
    );
    assert.ok(
      constrainedPacket.suggested_impact_surfaces.nodes.length <=
        generousPacket.suggested_impact_surfaces.nodes.length
    );
    assert.ok(
      constrainedPacket.constraints.open_risks.length <= generousPacket.constraints.open_risks.length
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("assembler returns budget_exhausted_nucleus when the nucleus alone exceeds budget", async () => {
  const root = createTempRepoRoot();

  try {
    seedBudgetWorld(root);

    const result = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "canon_addition",
        world_slug: "seeded",
        seed_nodes: ["CF-0001"],
        token_budget: 50
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "budget_exhausted_nucleus");
  } finally {
    destroyTempRepoRoot(root);
  }
});
