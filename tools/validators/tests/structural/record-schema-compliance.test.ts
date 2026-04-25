import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record, validCf, validSection } from "./helpers.js";

test("record_schema_compliance rejects prose-sourced MR fields and accepts data-layer MR fields", async () => {
  const invalidMr = record("mystery_reserve_entry", "M-1", "_source/mystery-reserve/M-1.yaml", {
    id: "M-1",
    title: "Mystery",
    status: "active",
    what_is_unknown: ["wrong field"],
    forbidden_answers: ["wrong field"],
    extensions: []
  });
  const validMr = record("mystery_reserve_entry", "M-2", "_source/mystery-reserve/M-2.yaml", {
    id: "M-2",
    title: "Mystery",
    status: "active",
    knowns: ["known"],
    unknowns: ["unknown"],
    common_interpretations: [],
    disallowed_cheap_answers: [],
    domains_touched: ["belief"],
    future_resolution_safety: "medium",
    extensions: []
  });

  const result = await recordSchemaCompliance.run({}, context([invalidMr, validMr]));

  assert.ok(result.some((verdict) => verdict.location.node_id === "M-1"));
  assert.ok(!result.some((verdict) => verdict.location.node_id === "M-2"));
});

test("record_schema_compliance rejects SEC id/file_class mismatches", async () => {
  const section = record("section", "SEC-GEO-001", "_source/peoples-and-species/SEC-GEO-001.yaml", {
    ...validSection,
    id: "SEC-GEO-001",
    file_class: "PEOPLES_AND_SPECIES"
  });

  const result = await recordSchemaCompliance.run({}, context([section]));

  assert.ok(result.some((verdict) => verdict.code === "record_schema_compliance.pattern"));
});

test("record_schema_compliance validates adjudication frontmatter", async () => {
  const result = await recordSchemaCompliance.run(
    {
      files: [
        {
          path: "adjudications/PA-0001-test.md",
          content: [
            "---",
            "pa_id: PA-0001",
            "date: 2026-04-25",
            "verdict: ACCEPT",
            "mystery_reserve_touched: []",
            "invariants_touched: []",
            "cf_records_touched:",
            "  - CF-0001",
            "open_questions_touched: []",
            "change_id: CH-0001",
            "originating_skill: canon-addition",
            "---",
            "# PA-0001",
            "",
            "Body prose is unconstrained by the frontmatter schema."
          ].join("\n")
        }
      ]
    },
    context([record("canon_fact_record", "CF-0001", "_source/canon/CF-0001.yaml", validCf)])
  );

  assert.equal(result.length, 0);
});

test("record_schema_compliance rejects legacy adjudication body-only Discovery blocks", async () => {
  const result = await recordSchemaCompliance.run(
    {
      files: [
        {
          path: "adjudications/PA-0001-test.md",
          content: [
            "# PA-0001",
            "",
            "## Discovery",
            "- pa_id: PA-0001",
            "- date: 2026-04-25",
            "- verdict: accept",
            "- mystery_reserve_touched: none",
            "- invariants_touched: none",
            "- cf_records_touched: CF-0001",
            "- open_questions_touched: none",
            "- change_id: CH-0001"
          ].join("\n")
        }
      ]
    },
    context([record("canon_fact_record", "CF-0001", "_source/canon/CF-0001.yaml", validCf)])
  );

  assert.equal(result.length, 8);
  assert.ok(result.every((verdict) => verdict.code === "record_schema_compliance.required"));
});

test("record_schema_compliance accepts diegetic-artifact frontmatter with scoped_references", async () => {
  const result = await recordSchemaCompliance.run(
    {
      files: [
        {
          path: "diegetic-artifacts/DA-0001-test.md",
          content: [
            "---",
            "artifact_id: DA-0001",
            "slug: test-artifact",
            "title: Test Artifact",
            "artifact_type: report",
            "author: Test Author",
            "author_character_id: null",
            "date: 2026-04-25",
            "place: Mudbrook",
            "audience: internal",
            "scoped_references:",
            "  - name: Mudbrook",
            "    kind: place",
            "    relation: event_location",
            "  - name: Long Board",
            "    kind: institution",
            "    relation: crew_vouch_site",
            "    aliases:",
            "      - Long Board tavern",
            "communicative_purpose: narrate",
            "desired_relation_to_truth: accurate",
            "author_profile: {}",
            "epistemic_horizon: {}",
            "claim_map: []",
            "world_consistency: {}",
            "source_basis: {}",
            "---",
            "# DA-0001",
            "",
            "Body prose."
          ].join("\n")
        }
      ]
    },
    context([])
  );

  assert.equal(result.length, 0);
});

test("record_schema_compliance rejects diegetic-artifact scoped_references entries missing required fields", async () => {
  const result = await recordSchemaCompliance.run(
    {
      files: [
        {
          path: "diegetic-artifacts/DA-0002-test.md",
          content: [
            "---",
            "artifact_id: DA-0002",
            "slug: bad-artifact",
            "title: Bad Artifact",
            "artifact_type: report",
            "author: Test Author",
            "author_character_id: null",
            "date: 2026-04-25",
            "place: Mudbrook",
            "audience: internal",
            "scoped_references:",
            "  - name: Mudbrook",
            "communicative_purpose: narrate",
            "desired_relation_to_truth: accurate",
            "author_profile: {}",
            "epistemic_horizon: {}",
            "claim_map: []",
            "world_consistency: {}",
            "source_basis: {}",
            "---",
            "# DA-0002",
            "",
            "Body prose."
          ].join("\n")
        }
      ]
    },
    context([])
  );

  assert.ok(result.some((verdict) => verdict.code === "record_schema_compliance.required"));
});

test("record_schema_compliance ignores derived index nodes that share authority node types", async () => {
  const result = await recordSchemaCompliance.run(
    {},
    context([
      record("named_entity", "entity:canal-heartland", "_source/entities", {
        body: "Canonical name: Canal Heartland"
      }),
      record("section", "animalia:WORLD_KERNEL.md:Genre Contract:0", "WORLD_KERNEL.md", {
        body: "## Genre Contract"
      }),
      record("canon_fact_record", "CF-0001", "_source/canon/CF-0001.yaml", validCf)
    ])
  );

  assert.deepEqual(result, []);
});
