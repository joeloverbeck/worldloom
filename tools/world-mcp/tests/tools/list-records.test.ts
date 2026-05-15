import assert from "node:assert/strict";
import test from "node:test";

import { listRecords } from "../../src/tools/list-records";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared";

interface FullBodyTestRecord {
  record_id: string;
  content_hash: string;
  file_path: string;
  body: Record<string, unknown>;
}

const CHAR_ONE_FILE_BODY = [
  "---",
  "character_id: CHAR-0001",
  "slug: vespera-nightwhisper",
  "name: Vespera Nightwhisper",
  "world_consistency:",
  "  invariants_respected:",
  "    - ONT-1",
  "  mystery_reserve_firewall:",
  "    - M-1",
  "  canon_facts_consulted:",
  "    - CF-0001",
  "---",
  "# Vespera Nightwhisper",
  "",
  "## Material Reality",
  "",
  "She lives in the salt port and walks the harbor each dawn.",
  ""
].join("\n");

const CHAR_TWO_FILE_BODY = [
  "---",
  "character_id: CHAR-0002",
  "slug: alaric-brine",
  "name: Alaric Brine",
  "---",
  "# Alaric Brine",
  "",
  "## Material Reality",
  "",
  "He keeps the lighthouse ledgers.",
  ""
].join("\n");

const DA_FILE_BODY = [
  "---",
  "artifact_id: DA-0001",
  "slug: harbor-letter",
  "title: Harbor Letter",
  "author: Anonymous Salt-Clerk",
  "---",
  "# Harbor Letter",
  "",
  "## Body",
  "",
  "Sirs, the salt has been counted.",
  ""
].join("\n");

const PA_FILE_BODY = [
  "---",
  "pa_id: PA-0001",
  "verdict: accept",
  "summary: Brinewick fact accepted.",
  "---",
  "# PA-0001 - accept",
  "",
  "## Adjudication Notes",
  "",
  "The proposal was accepted on first pass.",
  ""
].join("\n");

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
      },
      {
        node_id: "CF-0001",
        world_slug: "seeded",
        file_path: "_source/canon/CF-0001.yaml",
        node_type: "canon_fact_record",
        body: [
          "id: CF-0001",
          "title: Embodied Speech",
          "status: hard_canon",
          "type: capability",
          "statement: Speaking animals rely on embodied breath.",
          "scope:",
          "  geographic: global",
          "  temporal: current",
          "  social: public",
          "truth_scope:",
          "  world_level: true",
          "  diegetic_status: objective",
          "domains_affected:",
          "  - ontology",
          "required_world_updates:",
          "  - ONTOLOGY.md",
          "source_basis:",
          "  direct_user_approval: true",
          "costs_and_limits:",
          "  - Speech requires breath.",
          "visible_consequences:",
          "  - Speech changes social access.",
          "distribution:",
          "  why_not_universal: Body plans vary.",
          "epistemic_profile:",
          "  known_to: public",
          "extensions: []",
          ""
        ].join("\n")
      },
      {
        node_id: "CH-0001",
        world_slug: "seeded",
        file_path: "_source/change-log/CH-0001.yaml",
        node_type: "change_log_entry",
        body: [
          "id: CH-0001",
          "date: 2026-04-30",
          "summary: Added embodied speech.",
          "change_type: canon_addition",
          "affected_records:",
          "  - CF-0001",
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
          "question: Who first codified embodied speech law?",
          "status: open",
          "domains_touched:",
          "  - law",
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
          "name: Brinewick",
          "entity_type: place",
          "aliases:",
          "  - Salt Port",
          "extensions: []",
          ""
        ].join("\n")
      },
      {
        node_id: "seeded:WORLD_KERNEL.md:Kernel:0",
        world_slug: "seeded",
        file_path: "WORLD_KERNEL.md",
        node_type: "narrative_section",
        body: "The kernel is primary-authored narrative prose, not atomic SEC YAML."
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
          "heading: Public Speech",
          "heading_level: 2",
          "body: Public speech is shaped by breath and body.",
          "touched_by_cf:",
          "  - CF-0001",
          "extensions: []",
          ""
        ].join("\n")
      },
      {
        node_id: "CHAR-0002",
        world_slug: "seeded",
        file_path: "characters/alaric-brine.md",
        node_type: "character_record",
        body: CHAR_TWO_FILE_BODY
      },
      {
        node_id: "CHAR-0001",
        world_slug: "seeded",
        file_path: "characters/vespera-nightwhisper.md",
        node_type: "character_record",
        body: CHAR_ONE_FILE_BODY
      },
      {
        node_id: "DA-0001",
        world_slug: "seeded",
        file_path: "diegetic-artifacts/harbor-letter.md",
        node_type: "diegetic_artifact_record",
        body: DA_FILE_BODY
      },
      {
        node_id: "PA-0001",
        world_slug: "seeded",
        file_path: "adjudications/PA-0001-accept.md",
        node_type: "adjudication_record",
        body: PA_FILE_BODY
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
    const record = result.records[0] as Record<string, unknown> | undefined;
    assert.equal(record?.record_kind, "invariant");
    assert.equal(record?.title, "Embodied sentience");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords section_record excludes WORLD_KERNEL narrative sections", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({ world_slug: "seeded", record_type: "section_record", include_full_body: true })
    );

    assert.ok("records" in result);
    assert.equal(result.total, 1);
    assert.deepEqual(
      result.records.map((record) => record.record_id),
      ["SEC-ELF-001"]
    );
    assert.deepEqual(
      result.records.map((record) => (record as FullBodyTestRecord).file_path),
      ["_source/everyday-life/SEC-ELF-001.yaml"]
    );
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
    const record = result.records[0] as Record<string, unknown> | undefined;
    assert.deepEqual(record?.disallowed_cheap_answers, ["It was only the wind."]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords rejects unknown atomic projection fields for non-empty record sets", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "invariant_record",
        fields: ["nonexistent_field"]
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.equal(result.details?.field, "fields");
    assert.deepEqual(result.details?.unknown_projection_keys, ["nonexistent_field"]);
    assert.equal(result.details?.record_type, "invariant_record");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords preserves valid atomic projection fields", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "invariant_record",
        fields: ["title", "category"]
      })
    );

    assert.ok("records" in result);
    assert.equal(result.total, 2);
    assert.deepEqual(result.records[0], {
      record_id: "ONT-1",
      title: "Embodied sentience",
      category: "ontological"
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords filters atomic records by scalar, array membership, and AND semantics", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const scalar = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "invariant_record",
        filters: { category: "ontological" },
        fields: ["title", "category"]
      })
    );
    assert.ok("records" in scalar);
    assert.deepEqual(scalar.records.map((record) => record.record_id), ["ONT-1"]);
    assert.equal((scalar.records[0] as Record<string, unknown>).category, "ontological");

    const array = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "invariant_record",
        filters: { category: ["ontological", "social"] },
        fields: ["category"]
      })
    );
    assert.ok("records" in array);
    assert.deepEqual(array.records.map((record) => record.record_id), ["ONT-1", "SOC-1"]);

    const combined = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "invariant_record",
        filters: { category: ["ontological", "social"], revision_difficulty: "medium" },
        fields: ["category", "revision_difficulty"]
      })
    );
    assert.ok("records" in combined);
    assert.deepEqual(combined.records.map((record) => record.record_id), ["SOC-1"]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords filters against array-valued fields", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "open_question_record",
        filters: { domains_touched: "law" },
        fields: ["question", "domains_touched"]
      })
    );

    assert.ok("records" in result);
    assert.equal(result.total, 1);
    assert.equal(result.records[0]?.record_id, "OQ-0001");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords treats absent and empty filters as byte-identical", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const absent = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "mystery_record",
        fields: ["title", "status"]
      })
    );
    const empty = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "mystery_record",
        fields: ["title", "status"],
        filters: {}
      })
    );

    assert.deepEqual(empty, absent);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords rejects unknown filter keys for non-empty record sets", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "invariant_record",
        filters: { missing_field: "value" }
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.equal(result.details?.field, "filters");
    assert.deepEqual(result.details?.unknown_filter_keys, ["missing_field"]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords include_full_body returns get_record-style metadata and parsed bodies", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "mystery_record",
        fields: ["title"],
        include_full_body: true
      })
    );

    assert.ok("records" in result);
    assert.equal(result.total, 1);
    const record = result.records[0]! as FullBodyTestRecord;
    assert.equal(record.record_id, "M-1");
    assert.equal(record.file_path, "_source/mystery-reserve/M-1.yaml");
    assert.equal(typeof record.content_hash, "string");
    assert.ok("body" in record);
    assert.deepEqual(Object.keys(record).sort(), [
      "body",
      "content_hash",
      "file_path",
      "record_id"
    ]);
    assert.equal(record.body.record_kind, "mystery_reserve");
    assert.deepEqual(record.body.disallowed_cheap_answers, ["It was only the wind."]);
    assert.deepEqual(record.body.extensions, []);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords include_full_body covers every supported atomic record type", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const expectedKinds = new Map([
      ["canon_fact", "canon_fact"],
      ["change_log_entry", "change_log"],
      ["invariant_record", "invariant"],
      ["mystery_record", "mystery_reserve"],
      ["open_question_record", "open_question"],
      ["named_entity_record", "named_entity"],
      ["section_record", "section"]
    ]);

    for (const [recordType, expectedKind] of expectedKinds) {
      const result = await withRepoRoot(root, () =>
        listRecords({
          world_slug: "seeded",
          record_type: recordType as Parameters<typeof listRecords>[0]["record_type"],
          include_full_body: true
        })
      );

      assert.ok("records" in result);
      assert.ok(result.total >= 1);
      const record = result.records[0]! as FullBodyTestRecord;
      assert.ok("body" in record);
      assert.equal(record.body.record_kind, expectedKind);
      assert.equal(typeof record.content_hash, "string");
      assert.equal(typeof record.file_path, "string");
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords returns compact metadata for supported hybrid record types", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({ world_slug: "seeded", record_type: "diegetic_artifact_record" })
    );

    assert.ok("records" in result);
    assert.equal(result.total, 1);
    assert.equal(result.truncated, false);
    assert.deepEqual(result.records[0], {
      record_id: "DA-0001",
      record_kind: "diegetic_artifact",
      title: "Harbor Letter",
      content_hash: result.records[0]!.content_hash,
      file_path: "diegetic-artifacts/harbor-letter.md"
    });
    assert.equal(typeof result.records[0]!.content_hash, "string");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords filters hybrid records by frontmatter fields", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "character_record",
        filters: { slug: "vespera-nightwhisper" },
        fields: ["title", "file_path"]
      })
    );

    assert.ok("records" in result);
    assert.equal(result.total, 1);
    assert.deepEqual(result.records, [
      {
        record_id: "CHAR-0001",
        title: "Vespera Nightwhisper",
        file_path: "characters/vespera-nightwhisper.md"
      }
    ]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords rejects unknown hybrid projection fields against metadata wrapper", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "character_record",
        fields: ["frontmatter.character_id"]
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.equal(result.details?.field, "fields");
    assert.deepEqual(result.details?.unknown_projection_keys, ["frontmatter.character_id"]);
    assert.equal(result.details?.record_type, "character_record");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords rejects partially invalid hybrid projection fields", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "character_record",
        fields: ["title", "frontmatter.slug"]
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.deepEqual(result.details?.unknown_projection_keys, ["frontmatter.slug"]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords preserves valid hybrid projection fields", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "character_record",
        fields: ["title"]
      })
    );

    assert.ok("records" in result);
    assert.deepEqual(result.records, [
      {
        record_id: "CHAR-0001",
        title: "Vespera Nightwhisper"
      },
      {
        record_id: "CHAR-0002",
        title: "Alaric Brine"
      }
    ]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords returns hybrid records in id order and supports field projection", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "character_record",
        fields: ["record_id", "file_path"]
      })
    );

    assert.ok("records" in result);
    assert.equal(result.total, 2);
    assert.deepEqual(result.records, [
      {
        record_id: "CHAR-0001",
        file_path: "characters/vespera-nightwhisper.md"
      },
      {
        record_id: "CHAR-0002",
        file_path: "characters/alaric-brine.md"
      }
    ]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords include_full_body returns parsed hybrid frontmatter and body sections", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "character_record",
        fields: ["file_path"],
        include_full_body: true
      })
    );

    assert.ok("records" in result);
    assert.equal(result.total, 2);
    const record = result.records[0]! as FullBodyTestRecord;
    assert.equal(record.record_id, "CHAR-0001");
    assert.equal(record.file_path, "characters/vespera-nightwhisper.md");
    assert.equal(typeof record.content_hash, "string");
    assert.deepEqual(Object.keys(record).sort(), [
      "body",
      "content_hash",
      "file_path",
      "record_id"
    ]);
    assert.equal(record.body.record_kind, "character");
    const frontmatter = record.body.frontmatter as Record<string, unknown>;
    assert.equal(frontmatter.character_id, "CHAR-0001");
    const bodySections = record.body.body_sections as Record<string, string>;
    assert.ok(bodySections["Material Reality"]?.includes("salt port"));
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords include_full_body ignores invalid projection fields", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "character_record",
        fields: ["frontmatter.character_id"],
        include_full_body: true
      })
    );

    assert.ok("records" in result);
    assert.equal(result.total, 2);
    const record = result.records[0]! as FullBodyTestRecord;
    assert.equal(record.record_id, "CHAR-0001");
    assert.ok("body" in record);
    const frontmatter = record.body.frontmatter as Record<string, unknown>;
    assert.equal(frontmatter.character_id, "CHAR-0001");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords include_full_body covers every supported hybrid record type", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededRecordWorld(root);

    const expectedKinds = new Map([
      ["character_record", "character"],
      ["diegetic_artifact_record", "diegetic_artifact"],
      ["adjudication_record", "adjudication"]
    ]);

    for (const [recordType, expectedKind] of expectedKinds) {
      const result = await withRepoRoot(root, () =>
        listRecords({
          world_slug: "seeded",
          record_type: recordType as Parameters<typeof listRecords>[0]["record_type"],
          include_full_body: true
        })
      );

      assert.ok("records" in result);
      assert.ok(result.total >= 1);
      const record = result.records[0]! as FullBodyTestRecord;
      assert.equal(record.body.record_kind, expectedKind);
      assert.ok("frontmatter" in record.body);
      assert.ok("body_sections" in record.body);
      assert.equal(typeof record.content_hash, "string");
      assert.equal(typeof record.file_path, "string");
    }
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
