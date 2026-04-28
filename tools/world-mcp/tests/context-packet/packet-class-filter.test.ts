import assert from "node:assert/strict";
import test from "node:test";

import { getContextPacket } from "../../src/tools/get-context-packet";
import type {
  ContextPacket,
  ContextPacketNode
} from "../../src/context-packet/shared";

import {
  createTempRepoRoot,
  destroyTempRepoRoot,
  seedWorld,
  withRepoRoot
} from "../tools/_shared";

function seedClassFilterFixture(root: string): void {
  const filler = "filler ".repeat(40);

  const kernelNode = {
    node_id: "seeded:WORLD_KERNEL.md:Kernel:0",
    world_slug: "seeded",
    file_path: "WORLD_KERNEL.md",
    heading_path: "Kernel",
    node_type: "section" as const,
    body: `Kernel premise. ${filler}`
  };

  const invariantNodes = Array.from({ length: 4 }, (_, i) => ({
    node_id: `seeded:INVARIANTS.md:Rule-${i}:0`,
    world_slug: "seeded",
    file_path: "INVARIANTS.md",
    heading_path: `Rule-${i}`,
    node_type: "invariant" as const,
    body: `id: ONT-${i + 1}\nstatement: Invariant ${i}. ${filler}\n`
  }));

  const mysteryNodes = Array.from({ length: 5 }, (_, i) => ({
    node_id: `M-${String(i + 1).padStart(4, "0")}`,
    world_slug: "seeded",
    file_path: `_source/mystery-reserve/M-${String(i + 1).padStart(4, "0")}.yaml`,
    heading_path: null,
    node_type: "mystery_reserve_entry" as const,
    body: `id: M-${String(i + 1).padStart(4, "0")}\nstatus: open\nwhat_is_unknown: Unknown ${i}.\n`
  }));

  const canonFactNodes = Array.from({ length: 3 }, (_, i) => ({
    node_id: `CF-${String(i + 1).padStart(4, "0")}`,
    world_slug: "seeded",
    file_path: `_source/canon/CF-${String(i + 1).padStart(4, "0")}.yaml`,
    heading_path: null,
    node_type: "canon_fact_record" as const,
    body: `id: CF-${String(i + 1).padStart(4, "0")}\ntext: Canon ${i}. ${filler}\n`
  }));

  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      kernelNode,
      ...invariantNodes,
      ...mysteryNodes,
      ...canonFactNodes,
      {
        node_id: "CHAR-0001",
        world_slug: "seeded",
        file_path: "characters/protagonist.md",
        node_type: "character_record",
        body: "---\nname: Protagonist\n---\nProtagonist body."
      }
    ]
  });
}

function collectAllNodes(packet: ContextPacket): ContextPacketNode[] {
  return [
    ...packet.local_authority.nodes,
    ...packet.exact_record_links.nodes,
    ...packet.scoped_local_context.nodes,
    ...packet.governing_world_context.nodes,
    ...packet.impact_surfaces.nodes
  ];
}

test("packet-class-filter single-class restricts every layer's nodes to the requested class", async () => {
  const root = createTempRepoRoot();

  try {
    seedClassFilterFixture(root);

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "character_generation",
        world_slug: "seeded",
        seed_nodes: ["CHAR-0001"],
        token_budget: 100000,
        node_classes: ["mystery_reserve_entry"]
      })
    );
    assert.ok(!("code" in packet));

    const nodes = collectAllNodes(packet);
    assert.ok(nodes.length > 0, "filter should retain at least one mystery_reserve_entry node");

    for (const node of nodes) {
      assert.equal(
        node.node_type,
        "mystery_reserve_entry",
        `filtered node ${node.id} must be mystery_reserve_entry, got ${node.node_type}`
      );
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("packet-class-filter multi-class restricts every layer's nodes to the requested set", async () => {
  const root = createTempRepoRoot();

  try {
    seedClassFilterFixture(root);

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "character_generation",
        world_slug: "seeded",
        seed_nodes: ["CHAR-0001"],
        token_budget: 100000,
        node_classes: ["mystery_reserve_entry", "invariant"]
      })
    );
    assert.ok(!("code" in packet));

    const nodes = collectAllNodes(packet);
    assert.ok(nodes.length > 0);

    const allowed = new Set(["mystery_reserve_entry", "invariant"]);
    for (const node of nodes) {
      assert.ok(
        allowed.has(node.node_type),
        `filtered node ${node.id} must be in allowed set, got ${node.node_type}`
      );
    }

    const haveInvariant = nodes.some((n) => n.node_type === "invariant");
    const haveMystery = nodes.some((n) => n.node_type === "mystery_reserve_entry");
    assert.ok(haveInvariant, "fixture should produce at least one invariant under character_generation");
    assert.ok(haveMystery, "fixture should produce at least one mystery_reserve_entry under character_generation");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("packet-class-filter empty array yields empty layer node arrays while preserving five-layer shape", async () => {
  const root = createTempRepoRoot();

  try {
    seedClassFilterFixture(root);

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "character_generation",
        world_slug: "seeded",
        seed_nodes: ["CHAR-0001"],
        token_budget: 100000,
        node_classes: []
      })
    );
    assert.ok(!("code" in packet));

    assert.equal(packet.local_authority.nodes.length, 0);
    assert.equal(packet.exact_record_links.nodes.length, 0);
    assert.equal(packet.scoped_local_context.nodes.length, 0);
    assert.equal(packet.governing_world_context.nodes.length, 0);
    assert.equal(packet.impact_surfaces.nodes.length, 0);

    assert.ok(Array.isArray(packet.governing_world_context.active_rules));
    assert.ok(Array.isArray(packet.governing_world_context.protected_surfaces));
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("packet-class-filter rejects unsupported node_classes entries", async () => {
  const root = createTempRepoRoot();

  try {
    seedClassFilterFixture(root);

    await assert.rejects(
      withRepoRoot(root, () =>
        getContextPacket({
          task_type: "character_generation",
          world_slug: "seeded",
          seed_nodes: ["CHAR-0001"],
          token_budget: 100000,
          // @ts-expect-error - invalid node_classes entry at runtime
          node_classes: ["mystery_record"]
        })
      ),
      /node_classes/i
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("packet-class-filter filtered request yields >= mystery-record coverage of unfiltered request at the same budget", async () => {
  const root = createTempRepoRoot();

  try {
    seedClassFilterFixture(root);

    const tightBudget = 1500;

    const unfiltered = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "character_generation",
        world_slug: "seeded",
        seed_nodes: ["CHAR-0001"],
        token_budget: tightBudget
      })
    );
    assert.ok(!("code" in unfiltered));

    const filtered = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "character_generation",
        world_slug: "seeded",
        seed_nodes: ["CHAR-0001"],
        token_budget: tightBudget,
        node_classes: ["mystery_reserve_entry"]
      })
    );
    assert.ok(!("code" in filtered));

    const countMystery = (packet: ContextPacket): number =>
      collectAllNodes(packet).filter((n) => n.node_type === "mystery_reserve_entry").length;

    assert.ok(
      countMystery(filtered) >= countMystery(unfiltered),
      `filtered mystery count ${countMystery(filtered)} should be >= unfiltered mystery count ${countMystery(unfiltered)} at the same budget`
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});
