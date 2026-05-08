import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import yaml from "js-yaml";

import {
  recordSchemaCompliance,
  requiresEpistemicProfile,
  requiresExceptionGovernance
} from "../../src/structural/record-schema-compliance.js";
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

test("record_schema_compliance accepts change logs with affected_fact_ids only", async () => {
  const result = await recordSchemaCompliance.run(
    {},
    context([
      record("change_log_entry", "CH-0001", "_source/change-log/CH-0001.yaml", {
        change_id: "CH-0001",
        date: "2026-05-03",
        change_type: "addition",
        affected_fact_ids: ["CF-0001"]
      })
    ])
  );

  assert.equal(result.length, 0);
});

test("record_schema_compliance rejects removed affected_cf_ids alias on change logs", async () => {
  const result = await recordSchemaCompliance.run(
    {},
    context([
      record("change_log_entry", "CH-0001", "_source/change-log/CH-0001.yaml", {
        change_id: "CH-0001",
        date: "2026-05-03",
        change_type: "addition",
        affected_cf_ids: ["CF-0001"]
      })
    ])
  );

  assert.ok(result.some((verdict) => verdict.code === "record_schema_compliance.required"));
  assert.ok(result.some((verdict) => verdict.code === "record_schema_compliance.additionalProperties"));
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

test("record_schema_compliance accepts diegetic-artifact frontmatter with explicit world relation fields", async () => {
  const result = await recordSchemaCompliance.run(
    {
      files: [
        {
          path: "diegetic-artifacts/DA-0003-test.md",
          content: readFixture("diegetic-artifact-with-new-fields.md")
        }
      ]
    },
    context([])
  );

  assert.equal(result.length, 0);
});

test("record_schema_compliance rejects diegetic-artifact world_relation entries that are not CF ids", async () => {
  const fixture = readFixture("diegetic-artifact-with-new-fields.md").replace("    - CF-0001", "    - INV-0001");
  const result = await recordSchemaCompliance.run(
    {
      files: [
        {
          path: "diegetic-artifacts/DA-0004-test.md",
          content: fixture
        }
      ]
    },
    context([])
  );

  assert.ok(result.some((verdict) => verdict.code === "record_schema_compliance.pattern"));
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

test("record_schema_compliance accepts complete storylet records", async () => {
  const result = await recordSchemaCompliance.run(
    {},
    context([storyletRecord(completeStorylet())])
  );

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects storylets missing required structural fields", async () => {
  for (const field of ["mystery_safety", "provenance", "visibility"] as const) {
    const parsed = completeStorylet();
    delete parsed[field];

    const result = await recordSchemaCompliance.run(
      {},
      context([storyletRecord(parsed)])
    );

    assert.ok(result.some((verdict) => (
      verdict.code === "record_schema_compliance.required" &&
      verdict.message.includes(`must have required property '${field}'`)
    )));
  }
});

test("record_schema_compliance rejects storylet nested required-field omissions", async () => {
  const provenanceMissingOrigin = completeStorylet();
  delete (provenanceMissingOrigin.provenance as Record<string, unknown>).origin;

  const visibilityMissingScope = completeStorylet();
  delete (visibilityMissingScope.visibility as Record<string, unknown>).scope;

  const beatMissingTarget = completeStorylet();
  delete (((beatMissingTarget.beat_plan as Record<string, unknown>).beats as Record<string, unknown>[])[0]!).realization_target;

  const result = await recordSchemaCompliance.run(
    {},
    context([
      storyletRecord(provenanceMissingOrigin, "SLT-0002"),
      storyletRecord(visibilityMissingScope, "SLT-0003"),
      storyletRecord(beatMissingTarget, "SLT-0004")
    ])
  );

  assert.ok(result.some((verdict) => verdict.message.includes("/provenance")));
  assert.ok(result.some((verdict) => verdict.message.includes("/visibility")));
  assert.ok(result.some((verdict) => verdict.message.includes("/beat_plan/beats/0")));
});

test("record_schema_compliance enforces v2 storylet shape and retired choice templates", async () => {
  const retiredChoiceTemplate = completeStorylet();
  retiredChoiceTemplate.choice_templates = [choiceTemplate("observe")];

  const invalidShape = completeStorylet();
  invalidShape.shape = "invalid_shape";

  const invalidIntensity = completeStorylet();
  invalidIntensity.content_intensity = "extreme";

  const invalidOrigin = completeStorylet();
  (invalidOrigin.provenance as Record<string, unknown>).origin = "weird_origin";

  const invalidEffectType = completeStorylet();
  ((((invalidEffectType.effect_model as Record<string, unknown>).variants as Record<string, unknown>[])[0]!)
    .required_effects as Record<string, unknown>[])[0]!.type = "weird_effect";

  const result = await recordSchemaCompliance.run(
    {},
    context([
      storyletRecord(retiredChoiceTemplate, "SLT-0005"),
      storyletRecord(invalidShape, "SLT-0007"),
      storyletRecord(invalidIntensity, "SLT-0008"),
      storyletRecord(invalidOrigin, "SLT-0009"),
      storyletRecord(invalidEffectType, "SLT-0010")
    ])
  );

  assert.ok(result.some((verdict) => verdict.location.node_id === "SLT-0005" && verdict.message.includes("/choice_templates")));
  assert.ok(result.some((verdict) => verdict.location.node_id === "SLT-0007" && verdict.message.includes("/shape")));
  assert.ok(result.some((verdict) => verdict.location.node_id === "SLT-0008" && verdict.message.includes("/content_intensity")));
  assert.ok(result.some((verdict) => verdict.location.node_id === "SLT-0009" && verdict.message.includes("/provenance/origin")));
  assert.ok(result.some((verdict) => verdict.location.node_id === "SLT-0010" && verdict.message.includes("/effect_model/variants/0/required_effects/0/type")));
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

test("record_schema_compliance accepts canon safety blocks in populated and n_a forms", async () => {
  const records = [
    fixtureCf("cf-with-populated-epistemic-profile.yaml"),
    fixtureCf("cf-with-populated-exception-governance.yaml"),
    fixtureCf("cf-with-na-blocks.yaml")
  ];

  const result = await recordSchemaCompliance.run({}, context(records, { run_mode: "pre-apply" }));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects current capability CFs missing required canon safety blocks", async () => {
  const cf = fixtureCf("cf-missing-required-block.yaml");
  const result = await recordSchemaCompliance.run(
    {
      files: [
        {
          path: cf.file_path,
          content: ""
        }
      ]
    },
    context([cf], { run_mode: "pre-apply" })
  );

  assert.ok(result.some((verdict) => verdict.code === "record_schema_compliance.missing_exception_governance"));
  assert.ok(result.some((verdict) => verdict.message.includes("capability")));
});

test("record_schema_compliance preserves historical full-world CFs without new safety blocks", async () => {
  const result = await recordSchemaCompliance.run(
    {},
    context([
      record("canon_fact_record", "CF-0001", "_source/canon/CF-0001.yaml", {
        ...validCf,
        type: "capability"
      })
    ])
  );

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects n_a rationales without ontology category keywords", async () => {
  const result = await recordSchemaCompliance.run(
    {},
    context([fixtureCf("cf-with-bare-na.yaml")], { run_mode: "pre-apply" })
  );

  assert.ok(result.some((verdict) => verdict.code === "record_schema_compliance.na_rationale_quality"));
  assert.ok(result.some((verdict) => verdict.message.includes("/epistemic_profile/n_a")));
});

test("canon safety type taxonomy helpers classify required block types", () => {
  assert.equal(requiresExceptionGovernance("capability"), true);
  assert.equal(requiresExceptionGovernance("magic practice"), true);
  assert.equal(requiresExceptionGovernance("institution"), false);
  assert.equal(requiresEpistemicProfile("institution-with-secrecy"), true);
  assert.equal(requiresEpistemicProfile("knowledge_asymmetric_fact"), true);
  assert.equal(requiresEpistemicProfile("geography"), false);
});

function fixtureCf(filename: string) {
  const filePath = path.resolve(process.cwd(), "tests", "fixtures", filename);
  const parsed = yaml.load(readFileSync(filePath, "utf8"), { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>;
  const id = String(parsed.id);
  return record("canon_fact_record", id, `_source/canon/${id}.yaml`, parsed);
}

function readFixture(filename: string): string {
  return readFileSync(path.resolve(process.cwd(), "tests", "fixtures", filename), "utf8");
}

function completeStorylet(): Record<string, unknown> {
  return yaml.load(readFixture("story-storylet-complete.yaml"), { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>;
}

function storyletRecord(parsed: Record<string, unknown>, id = String(parsed.id ?? "SLT-0001")) {
  return record("storylet_record", id, `stories/red-bunny/_source/storylets/${id}.yaml`, {
    ...parsed,
    id
  });
}

function choiceTemplate(operation: string): Record<string, unknown> {
  return {
    operation,
    target_role: "protagonist",
    uses_fact_role: "",
    likely_effects: [],
    choice_mode: "strategic",
    poetic_effect: "obvious"
  };
}
