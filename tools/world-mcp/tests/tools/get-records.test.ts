import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getRecord } from "../../src/tools/get-record";
import { getRecords } from "../../src/tools/get-records";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared";

const CHAR_FILE_BODY = [
  "---",
  "character_id: CHAR-0001",
  "slug: brinewick-keeper",
  "name: Brinewick Keeper",
  "world_consistency:",
  "  canon_facts_consulted:",
  "    - CF-0001",
  "---",
  "# Brinewick Keeper",
  "",
  "## Capabilities",
  "",
  "- keeps the lighthouse lens clean",
  ""
].join("\n");

const DA_FILE_BODY = [
  "---",
  "artifact_id: DA-0001",
  "slug: harbor-note",
  "title: Harbor Note",
  "---",
  "# Harbor Note",
  "",
  "## Body",
  "",
  "The salt count is complete.",
  ""
].join("\n");

function buildSeededWorld(root: string): void {
  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "CF-0001",
        world_slug: "seeded",
        file_path: "_source/canon/CF-0001.yaml",
        heading_path: "CF-0001",
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
        node_id: "SEC-GEO-001",
        world_slug: "seeded",
        file_path: "_source/geography/SEC-GEO-001.yaml",
        heading_path: "SEC-GEO-001",
        node_type: "section",
        body: [
          "id: SEC-GEO-001",
          "file_class: GEOGRAPHY",
          "order: 1",
          "heading: Brinewick",
          "heading_level: 2",
          "body: Brinewick is a salt-port city.",
          "touched_by_cf:",
          "  - CF-0001",
          "extensions: []",
          ""
        ].join("\n")
      },
      {
        node_id: "M-1",
        world_slug: "seeded",
        file_path: "_source/mystery-reserve/M-1.yaml",
        heading_path: "M-1",
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
        node_id: "CHAR-0001",
        world_slug: "seeded",
        file_path: "characters/brinewick-keeper.md",
        heading_path: "Brinewick Keeper",
        node_type: "character_record",
        body: CHAR_FILE_BODY
      },
      {
        node_id: "DA-0001",
        world_slug: "seeded",
        file_path: "diegetic-artifacts/harbor-note.md",
        heading_path: "Harbor Note",
        node_type: "diegetic_artifact_record",
        body: DA_FILE_BODY
      }
    ]
  });
}

test("getRecords returns ordered singular getRecord payloads for atomic and hybrid records", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededWorld(root);
    const recordIds = ["CF-0001", "SEC-GEO-001", "M-1", "CHAR-0001", "DA-0001"];

    const result = await withRepoRoot(root, () =>
      getRecords({ record_ids: recordIds, world_slug: "seeded" })
    );

    assert.ok(!("code" in result));
    assert.equal(result.delivery_status, "inline");
    assert.deepEqual(result.records.map((entry) => entry.record_id), recordIds);
    assert.deepEqual(result.records.map((entry) => entry.found), [true, true, true, true, true]);

    for (const entry of result.records) {
      assert.equal(entry.found, true);
      const singular = await withRepoRoot(root, () =>
        getRecord({ record_id: entry.record_id, world_slug: "seeded" })
      );

      assert.ok(!("code" in singular));
      assert.deepEqual(entry.record, singular);
      assert.equal(entry.content_hash, singular.content_hash);
      assert.equal(entry.file_path, singular.file_path);
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecords keeps partial failures in request order", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecords({
        record_ids: ["CF-0001", "CF-9999", "INVALID-FORMAT", "CHAR-0001"],
        world_slug: "seeded"
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.delivery_status, "inline");
    assert.deepEqual(result.records.map((entry) => entry.record_id), [
      "CF-0001",
      "CF-9999",
      "INVALID-FORMAT",
      "CHAR-0001"
    ]);
    assert.deepEqual(result.records.map((entry) => entry.found), [true, false, false, true]);

    const missing = result.records[1]!;
    assert.equal(missing.found, false);
    assert.equal(missing.error.code, "record_not_found");

    const invalid = result.records[2]!;
    assert.equal(invalid.found, false);
    assert.equal(invalid.error.code, "invalid_input");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecords persists full batch JSON and returns a bounded summary when over ceiling", async () => {
  const root = createTempRepoRoot();
  const originalCeiling = process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;
  const originalResultsDir = process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR;
  const resultsDir = path.join(root, "tool-results");

  try {
    buildSeededWorld(root);
    mkdirSync(resultsDir, { recursive: true });
    process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS = "5600";
    process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR = resultsDir;

    const result = await withRepoRoot(root, () =>
      getRecords({
        record_ids: ["CF-0001", "SEC-GEO-001", "M-1", "CHAR-0001", "DA-0001"],
        world_slug: "seeded"
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.delivery_status, "persisted_with_summary");
    assert.match(result.persisted_output_path, /tool-results\/.*get_records-5-.*\.json$/);
    assert.equal(result.summary.tool, "get_records");
    assert.equal(result.summary.record_count, 5);
    assert.deepEqual(result.summary.suggested_slice_paths[0], "records[0]");
    assert.ok(result.summary.records.every((entry) => "record_id" in entry));

    const persisted = JSON.parse(readFileSync(result.persisted_output_path, "utf8")) as {
      delivery_status?: string;
      records?: unknown[];
    };
    assert.equal(persisted.delivery_status, "inline");
    assert.equal(persisted.records?.length, 5);
  } finally {
    if (originalCeiling === undefined) {
      delete process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;
    } else {
      process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS = originalCeiling;
    }
    if (originalResultsDir === undefined) {
      delete process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR;
    } else {
      process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR = originalResultsDir;
    }
    destroyTempRepoRoot(root);
  }
});
