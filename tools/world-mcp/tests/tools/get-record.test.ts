import assert from "node:assert/strict";
import test from "node:test";

import { getRecord } from "../../src/tools/get-record";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared";

function buildSeededAtomicWorld(root: string): void {
  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "CF-0001",
        world_slug: "seeded",
        file_path: "_source/canon/CF-0001.yaml",
        node_type: "canon_fact_record",
        body: [
          "id: CF-0001",
          "title: Brinewick Fact",
          "status: hard_canon",
          "type: geography",
          "statement: Brinewick anchors the western salt trade.",
          "scope:",
          "  geographic: regional",
          "  temporal: current",
          "  social: public",
          "truth_scope:",
          "  world_level: true",
          "  diegetic_status: objective",
          "domains_affected:",
          "  - geography",
          "required_world_updates:",
          "  - GEOGRAPHY.md",
          "source_basis:",
          "  direct_user_approval: true",
          ""
        ].join("\n")
      },
      {
        node_id: "CH-0001",
        world_slug: "seeded",
        file_path: "_source/change-log/CH-0001.yaml",
        node_type: "change_log_entry",
        body: [
          "change_id: CH-0001",
          "date: 2026-04-25",
          "change_type: addition",
          "affected_fact_ids:",
          "  - CF-0001",
          "summary: Brinewick fact added.",
          "reason:",
          "  - User-approved canon addition.",
          "scope:",
          "  local_or_global: global",
          "  changes_ordinary_life: false",
          "  creates_new_story_engines: true",
          "  mystery_reserve_effect: unchanged",
          "downstream_updates:",
          "  - GEOGRAPHY.md",
          "impact_on_existing_texts: []",
          "severity_before_fix: 0",
          "severity_after_fix: 0",
          "retcon_policy_checks:",
          "  no_silent_edit: true",
          "  replacement_noted: true",
          "  no_stealth_diegetic_rewrite: true",
          "  net_contradictions_not_increased: true",
          "  world_identity_preserved: true",
          ""
        ].join("\n")
      },
      ...[
        ["ONT-1", "ontological"],
        ["CAU-1", "causal"],
        ["DIS-1", "distribution"],
        ["SOC-1", "social"],
        ["AES-1", "aesthetic_thematic"]
      ].map(([id, category]) => ({
        node_id: id!,
        world_slug: "seeded",
        file_path: `_source/invariants/${id}.yaml`,
        node_type: "invariant" as const,
        body: [
          `id: ${id}`,
          `category: ${category}`,
          `title: ${category} invariant`,
          `statement: ${category} statement.`,
          "rationale: Keeps the world coherent.",
          "examples:",
          "  - Example",
          "non_examples:",
          "  - Non-example",
          "break_conditions: User-approved revision only.",
          "revision_difficulty: high",
          "extensions: []",
          ""
        ].join("\n")
      })),
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
      },
      {
        node_id: "OQ-0001",
        world_slug: "seeded",
        file_path: "_source/open-questions/OQ-0001.yaml",
        node_type: "open_question_entry",
        body: [
          "id: OQ-0001",
          "topic: Harbor law",
          "body: Which court hears harbor disputes?",
          "when_to_resolve: Before court scenes.",
          "extensions: []",
          ""
        ].join("\n")
      },
      {
        node_id: "ENT-0001",
        world_slug: "seeded",
        file_path: "_source/entities/ENT-0001.yaml",
        node_type: "named_entity",
        body: [
          "id: ENT-0001",
          "canonical_name: Brinewick",
          "entity_kind: place",
          "aliases:",
          "  - Salt Port",
          "originating_cf: CF-0001",
          "scope_notes: Western salt trade.",
          ""
        ].join("\n")
      },
      ...[
        ["SEC-ELF-001", "EVERYDAY_LIFE"],
        ["SEC-INS-001", "INSTITUTIONS"],
        ["SEC-MTS-001", "MAGIC_OR_TECH_SYSTEMS"],
        ["SEC-GEO-001", "GEOGRAPHY"],
        ["SEC-ECR-001", "ECONOMY_AND_RESOURCES"],
        ["SEC-PAS-001", "PEOPLES_AND_SPECIES"],
        ["SEC-TML-001", "TIMELINE"]
      ].map(([id, fileClass]) => ({
        node_id: id!,
        world_slug: "seeded",
        file_path: `_source/${fileClass!.toLowerCase().replaceAll("_", "-")}/${id}.yaml`,
        node_type: "section" as const,
        body: [
          `id: ${id}`,
          `file_class: ${fileClass}`,
          "order: 1",
          `heading: ${fileClass} section`,
          "heading_level: 2",
          "body: Section body.",
          "touched_by_cf:",
          "  - CF-0001",
          "extensions: []",
          ""
        ].join("\n")
      }))
    ]
  });
}

test("getRecord returns parsed YAML records for every atomic record class", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededAtomicWorld(root);

    const expectations = [
      ["CF-0001", "canon_fact", "title", "Brinewick Fact"],
      ["CH-0001", "change_log", "summary", "Brinewick fact added."],
      ["ONT-1", "invariant", "category", "ontological"],
      ["CAU-1", "invariant", "category", "causal"],
      ["DIS-1", "invariant", "category", "distribution"],
      ["SOC-1", "invariant", "category", "social"],
      ["AES-1", "invariant", "category", "aesthetic_thematic"],
      ["M-1", "mystery_reserve", "title", "Drowned Bell"],
      ["OQ-0001", "open_question", "topic", "Harbor law"],
      ["ENT-0001", "named_entity", "canonical_name", "Brinewick"],
      ["SEC-ELF-001", "section", "file_class", "EVERYDAY_LIFE"],
      ["SEC-INS-001", "section", "file_class", "INSTITUTIONS"],
      ["SEC-MTS-001", "section", "file_class", "MAGIC_OR_TECH_SYSTEMS"],
      ["SEC-GEO-001", "section", "file_class", "GEOGRAPHY"],
      ["SEC-ECR-001", "section", "file_class", "ECONOMY_AND_RESOURCES"],
      ["SEC-PAS-001", "section", "file_class", "PEOPLES_AND_SPECIES"],
      ["SEC-TML-001", "section", "file_class", "TIMELINE"]
    ] as const;

    for (const [recordId, recordKind, field, expectedValue] of expectations) {
      const result = await withRepoRoot(root, () =>
        getRecord({ record_id: recordId, world_slug: "seeded" })
      );

      assert.ok("record" in result);
      assert.equal(result.record.record_kind, recordKind);
      assert.equal(result.record[field], expectedValue);
      assert.equal(result.content_hash.length, 64);
      assert.match(result.file_path, /^_source\//);
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecord resolves a structured record id by scanning indexed worlds when world_slug is omitted", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededAtomicWorld(root);

    const result = await withRepoRoot(root, () => getRecord({ record_id: "CF-0001" }));

    assert.ok("record" in result);
    assert.equal(result.record.record_kind, "canon_fact");
    assert.equal(result.record.id, "CF-0001");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecord returns invalid_input for unsupported record id shapes", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededAtomicWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecord({ record_id: "INVALID-FORMAT", world_slug: "seeded" })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.equal(result.details?.field, "record_id");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecord returns record_not_found for valid missing record ids", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededAtomicWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecord({ record_id: "CF-9999", world_slug: "seeded" })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "record_not_found");
    assert.equal(result.details?.record_id, "CF-9999");
  } finally {
    destroyTempRepoRoot(root);
  }
});
