import assert from "node:assert/strict";
import test from "node:test";

import { getContextPacket } from "../../src/tools/get-context-packet";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared";

const LONG_BREAK_CONDITIONS = [
  "This invariant's break conditions must be available in full because Phase 7a cannot test a character trait against a truncated preview.",
  "The text deliberately exceeds the context packet preview length.",
  "salt ".repeat(100)
].join(" ");

test("character_generation governing context includes all invariant records and Mystery Reserve firewall fields", async () => {
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
          body: "Kernel"
        },
        {
          node_id: "CHAR-0001",
          world_slug: "seeded",
          file_path: "characters/namahan.md",
          node_type: "character_record",
          body: "---\nname: Namahan\n---\nLocal seed.\n"
        },
        {
          node_id: "ONT-1",
          world_slug: "seeded",
          file_path: "_source/invariants/ONT-1.yaml",
          node_type: "invariant",
          body: [
            "id: ONT-1",
            "category: ontological",
            "title: Bodies bind souls",
            "statement: Sentience requires embodiment.",
            "rationale: Prevents disembodied-person specialness.",
            "examples:",
            "  - Embodied people may remember their own lives.",
            "non_examples:",
            "  - Ghost narrators without a canon exception.",
            `break_conditions: ${JSON.stringify(LONG_BREAK_CONDITIONS)}`,
            "revision_difficulty: high"
          ].join("\n")
        },
        {
          node_id: "DIS-1",
          world_slug: "seeded",
          file_path: "_source/invariants/DIS-1.yaml",
          node_type: "invariant",
          body: [
            "id: DIS-1",
            "category: distribution",
            "title: Literacy is restricted",
            "statement: Literacy requires an institutional embedding.",
            "rationale: Keeps literacy from globalizing by accident.",
            "examples:",
            "  - Temple scribes.",
            "non_examples:",
            "  - Ordinary laborers reading rare scripts.",
            "break_conditions: Any ordinary character reads elite script without support.",
            "revision_difficulty: medium"
          ].join("\n")
        },
        {
          node_id: "M-1",
          world_slug: "seeded",
          file_path: "_source/mystery-reserve/M-1.yaml",
          node_type: "mystery_reserve_entry",
          body: [
            "id: M-1",
            "title: The drowned bell",
            "status: active",
            "knowns:",
            "  - Bells are heard in fog.",
            "unknowns:",
            "  - Who rings the drowned bell under Brinewick.",
            "disallowed_cheap_answers:",
            "  - A hidden clockwork automaton.",
            "common_interpretations:",
            "  - Harbor ghosts.",
            "domains_touched:",
            "  - mystery",
            "future_resolution_safety: low",
            "extensions:",
            "  - originating_cf: CF-0037",
            "    change_id: CH-0009",
            "    date: 2026-04-28",
            "    label: Stationkeeper firewall clause",
            "    body: Keep stationkeeper sub-specialties unresolved."
          ].join("\n")
        },
        {
          node_id: "M-2",
          world_slug: "seeded",
          file_path: "_source/mystery-reserve/M-2.yaml",
          node_type: "mystery_reserve_entry",
          body: [
            "id: M-2",
            "title: The salt birthmark",
            "status: passive",
            "knowns:",
            "  - Midwives track the mark.",
            "unknowns:",
            "  - Why some children are born with salt-white palms.",
            "disallowed_cheap_answers:",
            "  - A universal royal bloodline.",
            "common_interpretations:",
            "  - Tide blessing.",
            "domains_touched:",
            "  - embodiment",
            "future_resolution_safety: medium",
            "extensions: []"
          ].join("\n")
        }
      ]
    });

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "character_generation",
        world_slug: "seeded",
        seed_nodes: ["CHAR-0001"],
        token_budget: 8000
      })
    );

    assert.ok(!("code" in packet));

    const governingNodes = packet.governing_world_context.nodes;
    assert.deepEqual(
      governingNodes
        .filter((node) => node.node_type === "invariant")
        .map((node) => node.id)
        .sort(),
      ["DIS-1", "ONT-1"]
    );
    assert.deepEqual(
      governingNodes
        .filter((node) => node.node_type === "mystery_reserve_entry")
        .map((node) => node.id)
        .sort(),
      ["M-1", "M-2"]
    );

    const ont1 = governingNodes.find((node) => node.id === "ONT-1");
    assert.equal(ont1?.record?.id, "ONT-1");
    assert.equal(ont1?.record?.break_conditions, LONG_BREAK_CONDITIONS);
    assert.ok((ont1?.body_preview?.length ?? 0) < LONG_BREAK_CONDITIONS.length);

    const mystery = governingNodes.find((node) => node.id === "M-1");
    assert.deepEqual(mystery?.record, {
      id: "M-1",
      title: "The drowned bell",
      status: "active",
      knowns: ["Bells are heard in fog."],
      unknowns: ["Who rings the drowned bell under Brinewick."],
      common_interpretations: ["Harbor ghosts."],
      disallowed_cheap_answers: ["A hidden clockwork automaton."],
      domains_touched: ["mystery"],
      extensions: [
        {
          originating_cf: "CF-0037",
          change_id: "CH-0009",
          date: "2026-04-28",
          label: "Stationkeeper firewall clause",
          body: "Keep stationkeeper sub-specialties unresolved."
        }
      ]
    });
    assert.equal(
      Object.hasOwn(mystery?.record ?? {}, "what_is_unknown"),
      false,
      "projection must not expose the stale what_is_unknown key"
    );
    assert.equal(
      Object.hasOwn(mystery?.record ?? {}, "common_in_world_interpretations"),
      false,
      "projection must not expose the stale common_in_world_interpretations key"
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("canon_addition governing context does not promote every atomic invariant and Mystery Reserve record", async () => {
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
          body: "Kernel"
        },
        {
          node_id: "CF-0001",
          world_slug: "seeded",
          file_path: "_source/canon/CF-0001.yaml",
          node_type: "canon_fact_record",
          body: "id: CF-0001\nstatement: Seed fact.\n"
        },
        {
          node_id: "ONT-1",
          world_slug: "seeded",
          file_path: "_source/invariants/ONT-1.yaml",
          node_type: "invariant",
          body: "id: ONT-1\nstatement: Invariant.\n"
        },
        {
          node_id: "M-1",
          world_slug: "seeded",
          file_path: "_source/mystery-reserve/M-1.yaml",
          node_type: "mystery_reserve_entry",
          body: [
            "id: M-1",
            "title: Mystery",
            "status: active",
            "knowns:",
            "  - Something is known.",
            "unknowns:",
            "  - Mystery.",
            "common_interpretations: []",
            "disallowed_cheap_answers: []",
            "domains_touched:",
            "  - mystery",
            "future_resolution_safety: low",
            "extensions: []",
            ""
          ].join("\n")
        }
      ]
    });

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "canon_addition",
        world_slug: "seeded",
        seed_nodes: ["CF-0001"],
        token_budget: 8000
      })
    );

    assert.ok(!("code" in packet));
    assert.equal(
      packet.governing_world_context.nodes.some((node) => node.id === "ONT-1" || node.id === "M-1"),
      false
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});
