import assert from "node:assert/strict";
import test from "node:test";

import { getFirewallContent } from "../../src/tools/get-firewall-content";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared";

function buildSeededFirewallWorld(root: string): void {
  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "M-1",
        world_slug: "seeded",
        file_path: "_source/mystery-reserve/M-1.yaml",
        node_type: "mystery_reserve_entry",
        body: [
          "id: M-1",
          "title: Drowned Bell",
          "status: active",
          "knowns:",
          "  - The bell is heard in fog.",
          "unknowns:",
          "  - Who rings it.",
          "  - Why it sounds underwater.",
          "common_interpretations:",
          "  - Sailor omen",
          "  - Drowned-saint vigil",
          "disallowed_cheap_answers:",
          "  - It was only the wind.",
          "  - A mundane buoy with a clapper.",
          "domains_touched:",
          "  - mystery",
          "future_resolution_safety: high",
          "extensions: []",
          ""
        ].join("\n")
      },
      {
        node_id: "M-2",
        world_slug: "seeded",
        file_path: "_source/mystery-reserve/M-2.yaml",
        node_type: "mystery_reserve_entry",
        body: [
          "id: M-2",
          "title: Ash Tide",
          "status: forbidden",
          "knowns:",
          "  - Ash floats inshore each spring.",
          "unknowns:",
          "  - Source of the ash.",
          "common_interpretations: []",
          "disallowed_cheap_answers:",
          "  - A volcano at the world's edge.",
          "domains_touched:",
          "  - geography",
          "future_resolution_safety: none",
          "extensions: []",
          ""
        ].join("\n")
      },
      {
        node_id: "ONT-1",
        world_slug: "seeded",
        file_path: "_source/invariants/ONT-1.yaml",
        node_type: "invariant",
        body: [
          "id: ONT-1",
          "category: ontological",
          "title: Embodied sentience",
          "statement: Sentience requires embodied life.",
          "rationale: Keeps the ontology bounded.",
          "examples: []",
          "non_examples: []",
          "break_conditions: User-approved revision only.",
          "revision_difficulty: high",
          "extensions: []",
          ""
        ].join("\n")
      }
    ]
  });
}

function buildEmptyMysteryWorld(root: string): void {
  seedWorld(root, {
    worldSlug: "no-mysteries",
    nodes: [
      {
        node_id: "ONT-1",
        world_slug: "no-mysteries",
        file_path: "_source/invariants/ONT-1.yaml",
        node_type: "invariant",
        body: [
          "id: ONT-1",
          "category: ontological",
          "title: Solitary placeholder",
          "statement: Placeholder invariant for an empty-mystery world.",
          "rationale: Index needs at least one node.",
          "examples: []",
          "non_examples: []",
          "break_conditions: revision",
          "revision_difficulty: low",
          "extensions: []",
          ""
        ].join("\n")
      }
    ]
  });
}

test("get-firewall-content returns every M record's firewall fields when no filter is supplied", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededFirewallWorld(root);

    const result = await withRepoRoot(root, () =>
      getFirewallContent({ world_slug: "seeded" })
    );

    assert.ok("records" in result);
    assert.deepEqual(Object.keys(result.records).sort(), ["M-1", "M-2"]);
    assert.deepEqual(result.not_found, []);

    const m1 = result.records["M-1"]!;
    assert.equal(m1.title, "Drowned Bell");
    assert.equal(m1.status, "active");
    assert.deepEqual(m1.unknowns, ["Who rings it.", "Why it sounds underwater."]);
    assert.deepEqual(m1.common_interpretations, ["Sailor omen", "Drowned-saint vigil"]);
    assert.deepEqual(m1.disallowed_cheap_answers, [
      "It was only the wind.",
      "A mundane buoy with a clapper."
    ]);

    const m2 = result.records["M-2"]!;
    assert.equal(m2.status, "forbidden");
    assert.deepEqual(m2.common_interpretations, []);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("get-firewall-content returns only the requested ids when m_ids filter is supplied", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededFirewallWorld(root);

    const result = await withRepoRoot(root, () =>
      getFirewallContent({ world_slug: "seeded", m_ids: ["M-1"] })
    );

    assert.ok("records" in result);
    assert.deepEqual(Object.keys(result.records), ["M-1"]);
    assert.deepEqual(result.not_found, []);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("get-firewall-content reports unknown M ids as not_found while still returning known ids", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededFirewallWorld(root);

    const result = await withRepoRoot(root, () =>
      getFirewallContent({ world_slug: "seeded", m_ids: ["M-1", "M-99"] })
    );

    assert.ok("records" in result);
    assert.deepEqual(Object.keys(result.records), ["M-1"]);
    assert.deepEqual(result.not_found, ["M-99"]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("get-firewall-content rejects malformed m_ids entries with invalid_input", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededFirewallWorld(root);

    const result = await withRepoRoot(root, () =>
      getFirewallContent({ world_slug: "seeded", m_ids: ["not-an-id"] })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("get-firewall-content returns an empty records map for a world with no M records", async () => {
  const root = createTempRepoRoot();

  try {
    buildEmptyMysteryWorld(root);

    const result = await withRepoRoot(root, () =>
      getFirewallContent({ world_slug: "no-mysteries" })
    );

    assert.ok("records" in result);
    assert.deepEqual(result.records, {});
    assert.deepEqual(result.not_found, []);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("get-firewall-content returns world_not_found for a missing world", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededFirewallWorld(root);

    const result = await withRepoRoot(root, () =>
      getFirewallContent({ world_slug: "missing" })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "world_not_found");
  } finally {
    destroyTempRepoRoot(root);
  }
});
