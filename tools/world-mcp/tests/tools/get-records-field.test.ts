import assert from "node:assert/strict";
import test from "node:test";

import { getRecords } from "../../src/tools/get-records.js";
import { getRecordsField } from "../../src/tools/get-records-field.js";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared.js";

function cfId(index: number): string {
  return `CF-${String(index).padStart(4, "0")}`;
}

function buildCfBody(index: number): string {
  const id = cfId(index);
  return [
    `id: ${id}`,
    `title: Brinewick Fact ${index}`,
    "status: hard_canon",
    "type: capability",
    `statement: Brinewick salt crews maintain practice ${index}.`,
    "scope:",
    "  geographic: regional",
    "  temporal: current",
    "  social: public",
    "truth_scope:",
    "  world_level: true",
    "  diegetic_status: objective",
    "distribution:",
    "  who_can_do_it:",
    "    - licensed salt crews",
    "  who_cannot_do_it:",
    "    - unlicensed apprentices",
    "  regional_variation:",
    "    Brinewick: common",
    "costs_and_limits:",
    "  - training takes years",
    "domains_affected:",
    "  - economy",
    "required_world_updates:",
    "  - SEC-ECR-001",
    "source_basis:",
    "  direct_user_approval: true",
    "extensions:",
    "  - type: note",
    `    body: Salt practice ${index} has a long instructional note that should not be returned by field projection.`,
    ""
  ].join("\n");
}

function buildSeededWorld(root: string): void {
  const cfNodes = Array.from({ length: 17 }, (_, index) => {
    const oneBased = index + 1;
    return {
      node_id: cfId(oneBased),
      world_slug: "seeded",
      file_path: `_source/canon/${cfId(oneBased)}.yaml`,
      heading_path: cfId(oneBased),
      node_type: "canon_fact_record" as const,
      body: buildCfBody(oneBased)
    };
  });

  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      ...cfNodes,
      {
        node_id: "SEC-ELF-001",
        world_slug: "seeded",
        file_path: "_source/everyday-life/SEC-ELF-001.yaml",
        heading_path: "SEC-ELF-001",
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
      },
      {
        node_id: "NCP-0001",
        world_slug: "seeded",
        file_path: "character-proposals/NCP-0001.md",
        heading_path: "NCP-0001",
        node_type: "character_proposal_card",
        body: "---\nid: NCP-0001\n---\n\n## Proposal\nProposal body.\n"
      }
    ]
  });
}

test("getRecordsField returns ordered field projections with provenance", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecordsField({
        record_ids: ["CF-0001", "CF-0002", "CF-0003"],
        field_path: ["distribution", "who_can_do_it"],
        world_slug: "seeded"
      })
    );

    assert.ok(!("code" in result));
    assert.deepEqual(result.field_path, ["distribution", "who_can_do_it"]);
    assert.deepEqual(result.records.map((entry) => entry.record_id), [
      "CF-0001",
      "CF-0002",
      "CF-0003"
    ]);
    assert.deepEqual(result.records.map((entry) => entry.found), [true, true, true]);

    for (const entry of result.records) {
      assert.equal(entry.found, true);
      assert.deepEqual(entry.field_value, ["licensed salt crews"]);
      assert.equal(entry.content_hash.length, 64);
      assert.match(entry.file_path, /^_source\/canon\/CF-\d{4}\.yaml$/);
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecordsField keeps partial failures in request order", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecordsField({
        record_ids: ["CF-0001", "CF-9999", "INVALID-FORMAT", "CF-0002"],
        field_path: ["title"],
        world_slug: "seeded"
      })
    );

    assert.ok(!("code" in result));
    assert.deepEqual(result.records.map((entry) => entry.record_id), [
      "CF-0001",
      "CF-9999",
      "INVALID-FORMAT",
      "CF-0002"
    ]);
    assert.deepEqual(result.records.map((entry) => entry.found), [true, false, false, true]);

    assert.equal(result.records[0]!.found, true);
    assert.equal(result.records[0]!.field_value, "Brinewick Fact 1");
    assert.equal(result.records[1]!.found, false);
    assert.equal(result.records[1]!.error.code, "record_not_found");
    assert.equal(result.records[2]!.found, false);
    assert.equal(result.records[2]!.error.code, "invalid_input");
    assert.equal(result.records[3]!.found, true);
    assert.equal(result.records[3]!.field_value, "Brinewick Fact 2");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecordsField returns actionable hybrid errors alongside atomic successes", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecordsField({
        record_ids: ["CF-0001", "NCP-0001", "CF-0002"],
        field_path: ["title"],
        world_slug: "seeded"
      })
    );

    assert.ok(!("code" in result));
    assert.deepEqual(result.records.map((entry) => entry.record_id), [
      "CF-0001",
      "NCP-0001",
      "CF-0002"
    ]);
    assert.equal(result.records[0]!.found, true);
    assert.equal(result.records[0]!.field_value, "Brinewick Fact 1");
    assert.equal(result.records[1]!.found, false);
    assert.equal(result.records[1]!.error.code, "invalid_input");
    assert.match(
      result.records[1]!.error.message,
      /get_record\(record_id, section_path='frontmatter\.<field>'\)/
    );
    assert.match(
      result.records[1]!.error.message,
      /get_record\(record_id, section_path='body\.<section>'\)/
    );
    assert.equal(result.records[2]!.found, true);
    assert.equal(result.records[2]!.field_value, "Brinewick Fact 2");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecordsField returns per-id field path errors alongside successes", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecordsField({
        record_ids: ["CF-0001", "SEC-ELF-001"],
        field_path: ["distribution", "who_can_do_it"],
        world_slug: "seeded"
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.records[0]!.found, true);
    assert.deepEqual(result.records[0]!.field_value, ["licensed salt crews"]);
    assert.equal(result.records[1]!.found, false);
    assert.equal(result.records[1]!.error.code, "record_field_not_found");
    assert.equal(result.records[1]!.error.details?.missing_segment, "distribution");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecordsField supports numeric array path segments", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecordsField({
        record_ids: ["SEC-ELF-001"],
        field_path: ["extensions", 0, "body"],
        world_slug: "seeded"
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.records[0]!.found, true);
    assert.equal(result.records[0]!.field_value, "Salt port routines changed.");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getRecordsField response size stays bounded compared with full-record batches", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededWorld(root);
    const recordIds = Array.from({ length: 17 }, (_, index) => cfId(index + 1));

    const projected = await withRepoRoot(root, () =>
      getRecordsField({
        record_ids: recordIds,
        field_path: ["distribution", "who_can_do_it"],
        world_slug: "seeded"
      })
    );
    const full = await withRepoRoot(root, () =>
      getRecords({
        record_ids: recordIds,
        world_slug: "seeded"
      })
    );

    assert.ok(!("code" in projected));
    assert.ok(!("code" in full));
    assert.equal(projected.records.length, 17);
    assert.ok(JSON.stringify(projected).length < JSON.stringify(full).length / 3);
  } finally {
    destroyTempRepoRoot(root);
  }
});
