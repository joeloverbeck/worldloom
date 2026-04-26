import assert from "node:assert/strict";
import test from "node:test";

import { getRecordField } from "../../src/tools/get-record-field";

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
        node_id: "SEC-ELF-001",
        world_slug: "seeded",
        file_path: "_source/everyday-life/SEC-ELF-001.yaml",
        node_type: "section",
        body: [
          "id: SEC-ELF-001",
          "file_class: EVERYDAY_LIFE",
          "order: 1",
          "heading: Everyday Life",
          "heading_level: 2",
          "body: Section body.",
          "touched_by_cf:",
          "  - CF-0001",
          "extensions:",
          "  - type: note",
          "    originating_cf: CF-0001",
          "    body: Salt port routines changed.",
          ""
        ].join("\n")
      }
    ]
  });
}

test("getRecordField returns a scalar field with record provenance", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededAtomicWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecordField({ record_id: "CF-0001", field_path: ["title"], world_slug: "seeded" })
    );

    assert.ok("value" in result);
    assert.equal(result.value, "Brinewick Fact");
    assert.equal(result.content_hash.length, 64);
    assert.equal(result.file_path, "_source/canon/CF-0001.yaml");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecordField returns a nested array field by numeric segment", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededAtomicWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecordField({
        record_id: "SEC-ELF-001",
        field_path: ["extensions", 0, "body"],
        world_slug: "seeded"
      })
    );

    assert.ok("value" in result);
    assert.equal(result.value, "Salt port routines changed.");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecordField does not coerce string path segments into array indices", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededAtomicWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecordField({
        record_id: "SEC-ELF-001",
        field_path: ["extensions", "0", "body"],
        world_slug: "seeded"
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "record_field_not_found");
    assert.equal(result.details?.missing_segment, "0");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecordField returns record_field_not_found for missing paths", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededAtomicWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecordField({
        record_id: "SEC-ELF-001",
        field_path: ["extensions", 0, "missing"],
        world_slug: "seeded"
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "record_field_not_found");
    assert.equal(result.details?.missing_segment, "missing");
    assert.equal(result.details?.missing_segment_index, 2);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecordField reuses getRecord invalid_input for unsupported record id shapes", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededAtomicWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecordField({ record_id: "INVALID-FORMAT", field_path: ["title"], world_slug: "seeded" })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.equal(result.details?.field, "record_id");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecordField reuses getRecord record_not_found for valid missing record ids", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededAtomicWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecordField({ record_id: "CF-9999", field_path: ["title"], world_slug: "seeded" })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "record_not_found");
    assert.equal(result.details?.record_id, "CF-9999");
  } finally {
    destroyTempRepoRoot(root);
  }
});
