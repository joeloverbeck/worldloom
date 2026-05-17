import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import yaml from "js-yaml";

import { PRED_TYPES } from "../../src/rules/_shared/predicate-dsl-grammar.js";
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
      record("change_log_entry", "CH-1", "_source/change-log/CH-1.yaml", {
        change_id: "CH-1",
        date: "2026-05-03",
        change_type: "addition",
        affected_fact_ids: ["CF-1"]
      })
    ])
  );

  assert.equal(result.length, 0);
});

test("record_schema_compliance accepts derived_canon and rejects mystery_reserve CF status", async () => {
  const accepted = record("canon_fact_record", "CF-1", "_source/canon/CF-1.yaml", {
    ...validCf,
    status: "derived_canon"
  });
  const rejected = record("canon_fact_record", "CF-2", "_source/canon/CF-2.yaml", {
    ...validCf,
    id: "CF-2",
    status: "mystery_reserve"
  });

  const result = await recordSchemaCompliance.run({}, context([accepted, rejected]));

  assert.ok(!result.some((verdict) => verdict.location.node_id === "CF-1"));
  assert.ok(
    result.some(
      (verdict) =>
        verdict.location.node_id === "CF-2" &&
        verdict.code === "record_schema_compliance.enum" &&
        verdict.message.includes("/status")
    )
  );
});

test("record_schema_compliance rejects accepted CFs without direct user approval provenance", async () => {
  const result = await recordSchemaCompliance.run(
    {},
    context([
      record("canon_fact_record", "CF-1", "_source/canon/CF-1.yaml", {
        ...validCf,
        source_basis: { direct_user_approval: false, derived_from: [] }
      })
    ])
  );

  assert.ok(
    result.some(
      (verdict) =>
        verdict.location.node_id === "CF-1" &&
        verdict.code === "record_schema_compliance.const" &&
        verdict.message.includes("/source_basis/direct_user_approval")
    )
  );
});

test("record_schema_compliance accepts CHAR pre-figurement in source_basis but keeps pre_figured_by CF-only", async () => {
  const accepted = record("canon_fact_record", "CF-1", "_source/canon/CF-1.yaml", {
    ...validCf,
    source_basis: { direct_user_approval: true, derived_from: ["CHAR-1"] }
  });
  const rejected = record("canon_fact_record", "CF-2", "_source/canon/CF-2.yaml", {
    ...validCf,
    id: "CF-2",
    pre_figured_by: ["CHAR-1"]
  });

  const result = await recordSchemaCompliance.run({}, context([accepted, rejected]));

  assert.ok(!result.some((verdict) => verdict.location.node_id === "CF-1"));
  assert.ok(
    result.some(
      (verdict) =>
        verdict.location.node_id === "CF-2" &&
        verdict.code === "record_schema_compliance.pattern" &&
        verdict.message.includes("/pre_figured_by/0")
    )
  );
});

test("record_schema_compliance rejects removed affected_cf_ids alias on change logs", async () => {
  const result = await recordSchemaCompliance.run(
    {},
    context([
      record("change_log_entry", "CH-1", "_source/change-log/CH-1.yaml", {
        change_id: "CH-1",
        date: "2026-05-03",
        change_type: "addition",
        affected_cf_ids: ["CF-1"]
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
            "  - CF-1",
            "open_questions_touched: []",
            "change_id: CH-1",
            "originating_skill: canon-addition",
            "---",
            "# PA-0001",
            "",
            "Body prose is unconstrained by the frontmatter schema."
          ].join("\n")
        }
      ]
    },
    context([record("canon_fact_record", "CF-1", "_source/canon/CF-1.yaml", validCf)])
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
            "- cf_records_touched: CF-1",
            "- open_questions_touched: none",
            "- change_id: CH-1"
          ].join("\n")
        }
      ]
    },
    context([record("canon_fact_record", "CF-1", "_source/canon/CF-1.yaml", validCf)])
  );

  assert.equal(result.length, 8);
  assert.ok(result.every((verdict) => verdict.code === "record_schema_compliance.required"));
});

test("record_schema_compliance accepts diegetic-artifact frontmatter with scoped_references", async () => {
  const result = await recordSchemaCompliance.run(
    {
      files: [
        {
          path: "diegetic-artifacts/DA-1-test.md",
          content: [
            "---",
            "artifact_id: DA-1",
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
            "# DA-1",
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
          path: "diegetic-artifacts/DA-3-test.md",
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
          path: "diegetic-artifacts/DA-4-test.md",
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
          path: "diegetic-artifacts/DA-2-test.md",
          content: [
            "---",
            "artifact_id: DA-2",
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
            "# DA-2",
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

test("record_schema_compliance enforces story fact authority", async () => {
  const valid = storyFactRecord({
    authority: "branch_local"
  }, "SF-1");
  const missingAuthority = storyFactRecord({}, "SF-2");
  const invalidAuthority = storyFactRecord({
    authority: "objective"
  }, "SF-3");

  const result = await recordSchemaCompliance.run(
    {},
    context([valid, missingAuthority, invalidAuthority])
  );

  assert.ok(!result.some((verdict) => verdict.location.node_id === "SF-1"));
  assert.ok(result.some((verdict) =>
    verdict.location.node_id === "SF-2" &&
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("authority")
  ));
  assert.ok(result.some((verdict) =>
    verdict.location.node_id === "SF-3" &&
    verdict.code === "record_schema_compliance.enum"
  ));
});

test("record_schema_compliance enforces story obligation urgency", async () => {
  const valid = storyObligationRecord({
    urgency: "high"
  }, "OBL-1");
  const missingUrgency = storyObligationRecord({}, "OBL-2");
  const invalidUrgency = storyObligationRecord({
    urgency: "immediate"
  }, "OBL-3");

  const result = await recordSchemaCompliance.run(
    {},
    context([valid, missingUrgency, invalidUrgency])
  );

  assert.ok(!result.some((verdict) => verdict.location.node_id === "OBL-1"));
  assert.ok(result.some((verdict) =>
    verdict.location.node_id === "OBL-2" &&
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("urgency")
  ));
  assert.ok(result.some((verdict) =>
    verdict.location.node_id === "OBL-3" &&
    verdict.code === "record_schema_compliance.enum"
  ));
});

test("record_schema_compliance enforces story consequence urgency", async () => {
  const valid = storyConsequenceRecord({
    urgency: "medium"
  }, "CNSQ-1");
  const missingUrgency = storyConsequenceRecord({}, "CNSQ-2");
  const invalidUrgency = storyConsequenceRecord({
    urgency: "eventual"
  }, "CNSQ-3");

  const result = await recordSchemaCompliance.run(
    {},
    context([valid, missingUrgency, invalidUrgency])
  );

  assert.ok(!result.some((verdict) => verdict.location.node_id === "CNSQ-1"));
  assert.ok(result.some((verdict) =>
    verdict.location.node_id === "CNSQ-2" &&
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("urgency")
  ));
  assert.ok(result.some((verdict) =>
    verdict.location.node_id === "CNSQ-3" &&
    verdict.code === "record_schema_compliance.enum"
  ));
});

test("record_schema_compliance accepts branch-prefix-scoped storylets with canonical nested prefix", async () => {
  const storylet = completeStorylet();
  storylet.scope = {
    visibility: "branch_prefix_scoped",
    branch_id: "BR-1",
    visible_branch_path_prefix: ["PG-1"]
  };

  const result = await recordSchemaCompliance.run(
    {},
    context([storyletRecord(storylet)])
  );

  assert.deepEqual(result, []);
});

test("record_schema_compliance accepts storylet bound effect references and rejects prose labels", async () => {
  const validBoundEffects = completeStorylet();
  validBoundEffects.effects = {
    create: ["bound:new_debt"],
    supersede: ["OBL-1"],
    close: ["bound:old_thread"]
  };
  validBoundEffects.exit_options = [
    {
      action_family: "communicate",
      surface_hint: "Ask one bounded follow-up question.",
      likely_effects: ["bound:new_debt", "CNSQ-1"]
    }
  ];

  const invalidLabel = completeStorylet();
  invalidLabel.exit_options = [
    {
      action_family: "communicate",
      surface_hint: "Ask one bounded follow-up question.",
      likely_effects: ["limited-disclosure"]
    }
  ];

  const result = await recordSchemaCompliance.run(
    {},
    context([
      storyletRecord(validBoundEffects, "SLT-15"),
      storyletRecord(invalidLabel, "SLT-16")
    ])
  );

  assert.ok(!result.some((verdict) => verdict.location.node_id === "SLT-15"));
  assert.ok(result.some((verdict) =>
    verdict.location.node_id === "SLT-16" &&
    verdict.message.includes("/exit_options/0/likely_effects/0")
  ));
});

test("record_schema_compliance enforces storylet predicate object shape", async () => {
  const validPredicate = completeStorylet();
  validPredicate.preconditions = {
    hard: [{ pred: "record_active", record: "STENT-1" }],
    soft: [{ pred: "has_affordance", action_family: "communicate" }]
  };

  const missingPred = completeStorylet();
  missingPred.preconditions = {
    hard: [{ predicate: "record_active", args: { target: "STENT-1" } }],
    soft: []
  };

  const unknownPred = completeStorylet();
  unknownPred.preconditions = {
    hard: [{ pred: "unknown_predicate", record: "STENT-1" }],
    soft: []
  };

  const result = await recordSchemaCompliance.run(
    {},
    context([
      storyletRecord(validPredicate, "SLT-17"),
      storyletRecord(missingPred, "SLT-18"),
      storyletRecord(unknownPred, "SLT-19")
    ])
  );

  assert.ok(!result.some((verdict) => verdict.location.node_id === "SLT-17"));
  assert.ok(result.some((verdict) =>
    verdict.location.node_id === "SLT-18" &&
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("must have required property 'pred'")
  ));
  assert.ok(result.some((verdict) =>
    verdict.location.node_id === "SLT-19" &&
    verdict.code === "record_schema_compliance.enum" &&
    verdict.message.includes("/preconditions/hard/0/pred")
  ));
});

test("record_schema_compliance storylet predicate schema mirrors runtime predicate names", () => {
  const schema = JSON.parse(readFixture("../../src/schemas/story-storylet.schema.json")) as {
    $defs: {
      predicateObject: {
        properties: {
          pred: {
            enum: string[];
          };
        };
      };
    };
  };

  assert.deepEqual(schema.$defs.predicateObject.properties.pred.enum, [...PRED_TYPES]);
});

test("record_schema_compliance rejects malformed branch-prefix-scoped storylet prefix fields", async () => {
  const missingPrefix = completeStorylet();
  missingPrefix.scope = {
    visibility: "branch_prefix_scoped",
    branch_id: "BR-1"
  };

  const emptyPrefix = completeStorylet();
  emptyPrefix.scope = {
    visibility: "branch_prefix_scoped",
    branch_id: "BR-1",
    visible_branch_path_prefix: []
  };

  const legacyTopLevelPrefix = completeStorylet();
  legacyTopLevelPrefix.scope = {
    visibility: "branch_prefix_scoped",
    branch_id: "BR-1",
    visible_branch_path_prefix: ["PG-1"]
  };
  legacyTopLevelPrefix.visible_branch_path_prefix = ["PG-1"];

  const globalWithPrefix = completeStorylet();
  (globalWithPrefix.scope as Record<string, unknown>).visible_branch_path_prefix = ["PG-1"];

  const result = await recordSchemaCompliance.run(
    {},
    context([
      storyletRecord(missingPrefix, "SLT-11"),
      storyletRecord(emptyPrefix, "SLT-12"),
      storyletRecord(legacyTopLevelPrefix, "SLT-13"),
      storyletRecord(globalWithPrefix, "SLT-14")
    ])
  );

  assert.ok(result.some((verdict) => verdict.location.node_id === "SLT-11" && verdict.code === "record_schema_compliance.required"));
  assert.ok(result.some((verdict) => verdict.location.node_id === "SLT-12" && verdict.message.includes("/scope/visible_branch_path_prefix")));
  assert.ok(result.some((verdict) => verdict.location.node_id === "SLT-13" && verdict.code === "record_schema_compliance.additionalProperties"));
  assert.ok(result.some((verdict) => verdict.location.node_id === "SLT-14" && verdict.message.includes("/scope")));
});

test("record_schema_compliance rejects storylets missing required structural fields", async () => {
  for (const field of ["move_family", "preconditions", "beats", "mystery_policy"] as const) {
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

  const scopeMissingVisibility = completeStorylet();
  delete (scopeMissingVisibility.scope as Record<string, unknown>).visibility;

  const beatMissingTarget = completeStorylet();
  delete ((beatMissingTarget.beats as Record<string, unknown>[])[0]!).instruction;

  const result = await recordSchemaCompliance.run(
    {},
    context([
      storyletRecord(provenanceMissingOrigin, "SLT-2"),
      storyletRecord(scopeMissingVisibility, "SLT-3"),
      storyletRecord(beatMissingTarget, "SLT-4")
    ])
  );

  assert.ok(result.some((verdict) => verdict.message.includes("/provenance")));
  assert.ok(result.some((verdict) => verdict.message.includes("/scope")));
  assert.ok(result.some((verdict) => verdict.message.includes("/beats/0")));
});

test("record_schema_compliance enforces minimalist storylet shape and retired legacy fields", async () => {
  const legacyChoiceTemplate = completeStorylet();
  legacyChoiceTemplate.choice_templates = [choiceTemplate("observe")];

  const legacyShape = completeStorylet();
  legacyShape.shape = "scene_commitment_arc";

  const invalidMoveFamily = completeStorylet();
  invalidMoveFamily.move_family = "aftermath";

  const invalidOrigin = completeStorylet();
  (invalidOrigin.provenance as Record<string, unknown>).origin = "weird_origin";

  const invalidActionFamily = completeStorylet();
  ((invalidActionFamily.exit_options as Record<string, unknown>[])[0]!).action_family = "custom";

  const result = await recordSchemaCompliance.run(
    {},
    context([
      storyletRecord(legacyChoiceTemplate, "SLT-5"),
      storyletRecord(legacyShape, "SLT-7"),
      storyletRecord(invalidMoveFamily, "SLT-8"),
      storyletRecord(invalidOrigin, "SLT-9"),
      storyletRecord(invalidActionFamily, "SLT-10")
    ])
  );

  assert.ok(result.some((verdict) => verdict.location.node_id === "SLT-5" && verdict.code === "record_schema_compliance.additionalProperties"));
  assert.ok(result.some((verdict) => verdict.location.node_id === "SLT-7" && verdict.code === "record_schema_compliance.additionalProperties"));
  assert.ok(result.some((verdict) => verdict.location.node_id === "SLT-8" && verdict.message.includes("/move_family")));
  assert.ok(result.some((verdict) => verdict.location.node_id === "SLT-9" && verdict.message.includes("/provenance/origin")));
  assert.ok(result.some((verdict) => verdict.location.node_id === "SLT-10" && verdict.message.includes("/exit_options/0/action_family")));
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
      record("canon_fact_record", "CF-1", "_source/canon/CF-1.yaml", validCf)
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
      record("canon_fact_record", "CF-1", "_source/canon/CF-1.yaml", {
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
  return {
    id: "SLT-1",
    story_id: "STORY-1",
    scope: {
      visibility: "global_author_pool",
      branch_id: null
    },
    created_at_page: null,
    title: "Complete commitment block",
    move_family: "protection",
    preconditions: {
      hard: [],
      soft: []
    },
    beats: [
      {
        beat_id: "B1",
        function: "setup",
        instruction: "Establish the damaged gate and Mara's boundary."
      },
      {
        beat_id: "B2",
        function: "action",
        instruction: "Offer practical help without forcing disclosure."
      },
      {
        beat_id: "B3",
        function: "exit",
        instruction: "Close on the next concrete commitment."
      }
    ],
    effects: {
      create: [],
      supersede: [],
      close: []
    },
    exit_options: [
      {
        action_family: "communicate",
        surface_hint: "Ask one bounded follow-up question.",
        likely_effects: ["OBL-1"]
      }
    ],
    saliency: {
      urgency: "medium",
      cooldown_pages: 0,
      tags: ["gate-repair"]
    },
    mystery_policy: {
      forbidden_resolutions: [],
      allowed_authority: "apparent"
    },
    provenance: {
      origin: "manual_authoring"
    }
  };
}

function storyletRecord(parsed: Record<string, unknown>, id = String(parsed.id ?? "SLT-1")) {
  return record("storylet_record", id, `stories/red-bunny/_source/storylets/${id}.yaml`, {
    ...parsed,
    id
  });
}

function storyFactRecord(overrides: Record<string, unknown>, id: string) {
  return record("story_fact_record", id, `stories/red-bunny/_source/facts/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-1",
    statement: "The gate is damaged.",
    derived_from: [],
    ...overrides
  });
}

function storyObligationRecord(overrides: Record<string, unknown>, id: string) {
  return record("obligation_record", id, `stories/red-bunny/_source/obligations/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-1",
    status: "open",
    obligation_kind: "promise",
    description: "Mara owes Ren a guarded answer.",
    owed_by: "STENT-1",
    owed_to: "STENT-2",
    trigger_to_close: "Mara gives Ren a truthful answer or transfers the debt.",
    ...overrides
  });
}

function storyConsequenceRecord(overrides: Record<string, unknown>, id: string) {
  return record("consequence_record", id, `stories/red-bunny/_source/consequences/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-1",
    status: "pending",
    consequence_kind: "public_pressure",
    description: "The public accusation will alter how witnesses respond.",
    resolves_when: "The accusation is answered or displaced by stronger evidence.",
    derived_from: ["SE-1"],
    ...overrides
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
