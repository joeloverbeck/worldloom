import assert from "node:assert/strict";
import test from "node:test";

import { listRecords } from "../../src/tools/list-records";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared";

function buildSeededRecordWorld(root: string): void {
  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
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
          "examples:",
          "  - Speaking animals",
          "non_examples:",
          "  - Disembodied machine minds",
          "break_conditions: User-approved revision only.",
          "revision_difficulty: high",
          "extensions: []",
          ""
        ].join("\n")
      },
      {
        node_id: "SOC-1",
        world_slug: "seeded",
        file_path: "_source/invariants/SOC-1.yaml",
        node_type: "invariant",
        body: [
          "id: SOC-1",
          "category: social",
          "title: Public oaths matter",
          "statement: Public oaths carry social consequence.",
          "rationale: Keeps institutions legible.",
          "examples:",
          "  - Guild witnesses",
          "non_examples:",
          "  - Private jokes",
          "break_conditions: User-approved revision only.",
          "revision_difficulty: medium",
          "extensions: []",
          ""
        ].join("\n")
      },
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
          "common_interpretations:",
          "  - Sailor omen",
          "disallowed_cheap_answers:",
          "  - It was only the wind.",
          "domains_touched:",
          "  - mystery",
          "future_resolution_safety: high",
          "extensions: []",
          ""
        ].join("\n")
      }
    ]
  });
}

test("listRecords returns every record for a requested atomic record type", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({ world_slug: "seeded", record_type: "invariant_record" })
    );

    assert.ok("records" in result);
    assert.equal(result.total, 2);
    assert.equal(result.truncated, false);
    assert.deepEqual(
      result.records.map((record) => record.record_id),
      ["ONT-1", "SOC-1"]
    );
    assert.equal(result.records[0]?.record_kind, "invariant");
    assert.equal(result.records[0]?.title, "Embodied sentience");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords field projection always includes record_id and requested fields only", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "mystery_record",
        fields: ["disallowed_cheap_answers"]
      })
    );

    assert.ok("records" in result);
    assert.equal(result.total, 1);
    assert.deepEqual(Object.keys(result.records[0]!).sort(), [
      "disallowed_cheap_answers",
      "record_id"
    ]);
    assert.deepEqual(result.records[0]?.disallowed_cheap_answers, ["It was only the wind."]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords returns typed errors for unsupported record types and missing worlds", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const unsupported = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "unsupported" as any
      })
    );
    assert.ok("code" in unsupported);
    assert.equal(unsupported.code, "invalid_input");

    const missingWorld = await withRepoRoot(root, () =>
      listRecords({ world_slug: "missing", record_type: "invariant_record" })
    );
    assert.ok("code" in missingWorld);
    assert.equal(missingWorld.code, "world_not_found");
  } finally {
    destroyTempRepoRoot(root);
  }
});
