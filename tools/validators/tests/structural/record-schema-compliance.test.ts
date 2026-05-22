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

test("record_schema_compliance validates character proposal card and batch frontmatter", async () => {
  const result = await recordSchemaCompliance.run(
    {
      files: [
        markdownWithFrontmatter("character-proposals/NCP-12-maren.md", validCharacterProposalCard()),
        markdownWithFrontmatter("character-proposals/batches/NCB-3-batch.md", validCharacterProposalBatch())
      ]
    },
    context([])
  );

  assert.equal(result.length, 0);
});

test("record_schema_compliance rejects invalid character proposal card frontmatter", async () => {
  const card = validCharacterProposalCard();
  delete card.memorability_profile;

  const result = await recordSchemaCompliance.run(
    {
      files: [
        markdownWithFrontmatter("character-proposals/NCP-12-maren.md", card)
      ]
    },
    context([])
  );

  assert.ok(
    result.some(
      (verdict) =>
        verdict.location.node_id === "NCP-12" &&
        verdict.code === "record_schema_compliance.required" &&
        verdict.message.includes("memorability_profile")
    )
  );
});

test("record_schema_compliance rejects missing character proposal frontmatter", async () => {
  const result = await recordSchemaCompliance.run(
    {
      files: [
        {
          path: "character-proposals/NCP-12-maren.md",
          content: ["# Test Proposal", "", "Body prose."].join("\n")
        },
        {
          path: "character-proposals/batches/NCB-3-batch.md",
          content: ["# Test Batch", "", "Body prose."].join("\n")
        }
      ]
    },
    context([])
  );

  assert.equal(result.length, 2);
  assert.ok(result.every((verdict) => verdict.code === "record_schema_compliance.missing_frontmatter"));
  assert.ok(result.some((verdict) => verdict.location.file === "character-proposals/NCP-12-maren.md"));
  assert.ok(result.some((verdict) => verdict.location.file === "character-proposals/batches/NCB-3-batch.md"));
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
            ...validDiegeticArtifactLooseObjectLines(),
            "claim_map:",
            "  - claim: Test author witnessed the Mudbrook audit.",
            "    canon_status: canonically_true",
            "    narrator_belief: \"true\"",
            "    source: witnessed",
            "    contradiction_risk: none",
            "    mode: direct",
            "    adaptive_behavior_preserved_under_wrong_ontology: false",
            "    cf_id: CF-1",
            "    mr_id: null",
            "    repair_trace: null",
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
  const fixture = readFixture("diegetic-artifact-with-new-fields.md").replace("    - CF-1", "    - INV-0001");
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
            ...validDiegeticArtifactLooseObjectLines(),
            "claim_map:",
            "  - claim: Test author witnessed the Mudbrook audit.",
            "    canon_status: canonically_true",
            "    narrator_belief: \"true\"",
            "    source: witnessed",
            "    contradiction_risk: none",
            "    mode: direct",
            "    adaptive_behavior_preserved_under_wrong_ontology: false",
            "    cf_id: CF-1",
            "    mr_id: null",
            "    repair_trace: null",
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

test("record_schema_compliance pre-apply schema checks only touched indexed records when file inputs exist", async () => {
  const invalidMr = record("mystery_reserve_entry", "M-1", "_source/mystery-reserve/M-1.yaml", {
    id: "M-1",
    title: "Mystery",
    status: "active",
    what_is_unknown: ["legacy prose field"],
    forbidden_answers: ["legacy prose field"],
    extensions: []
  });
  const section = record("section", "SEC-INS-001", "_source/institutions/SEC-INS-001.yaml", validSection);
  const result = await recordSchemaCompliance.run(
    {
      files: [
        {
          path: section.file_path,
          content: yaml.dump(validSection)
        }
      ]
    },
    context([invalidMr, section], { run_mode: "pre-apply" })
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

function markdownWithFrontmatter(path: string, frontmatter: Record<string, unknown>) {
  return {
    path,
    content: [
      "---",
      yaml.dump(frontmatter, { lineWidth: -1 }).trimEnd(),
      "---",
      "# Test Record",
      "",
      "Body prose."
    ].join("\n")
  };
}

function validDiegeticArtifactLooseObjectLines(): string[] {
  return [
    "genre_conventions:",
    "  honors: []",
    "  breaks: []",
    "author_profile:",
    "  species: human",
    "  age_band: adult",
    "  sex_or_gender: null",
    "  class: scribe",
    "  literacy: trade-tongue literate",
    "  profession: auditor",
    "  religious_ideological_environment: nominal",
    "  political_dependency: charter office",
    "  bodily_limits: human baseline",
    "  mobility: local",
    "  archive_access: office files",
    "  rumor_access: clerks",
    "  speech_register: formal",
    "  likely_blind_spots: court gossip",
    "  trauma_history_if_relevant: null",
    "epistemic_horizon:",
    "  direct_knowledge: []",
    "  inferred_knowledge: []",
    "  secondhand_knowledge: []",
    "  wrongly_believed: []",
    "  concealable: []",
    "  impossible_knowledge: []",
    "world_consistency:",
    "  canon_facts_consulted:",
    "    - CF-1",
    "  invariants_respected: []",
    "  mystery_reserve_firewall: []",
    "  distribution_exceptions: []",
    "source_basis:",
    "  world_slug: test",
    "  brief_path: briefs/test-artifact.md",
    "  character_path: null",
    "  generated_date: 2026-05-22",
    "  user_approved: false"
  ];
}

function validCharacterProposalCard(): Record<string, unknown> {
  return {
    current_location: "River Tollhouse",
    place_of_origin: "Lower Ferry",
    date: "rain season",
    species: "human",
    age_band: "adult",
    social_position: "licensed confessor",
    profession: "toll clerk",
    kinship_situation: "estranged oath-sibling",
    religious_ideological_environment: "ledger cult",
    major_local_pressures: ["seasonal debt audit"],
    intended_narrative_role: "protagonist",
    proposal_id: "NCP-12",
    batch_id: "NCB-3",
    slug: "maren-toll-confessor",
    title: "Maren, Toll Confessor",
    niche_summary: "A toll confessor whose mercy is inseparable from debt recordkeeping.",
    depth_class: "protagonist_grade",
    proposal_family: "beloved institutional monster",
    diagnosis_target: "debt authority",
    memorability_profile: {
      seed_essence_preserved: ["Toll confession role"],
      world_produced_wound: "Her office requires public mercy and private debt collection.",
      active_appetite: "She wants one confessed debtor to name her as savior.",
      self_mythology: "She calls herself the only honest mouth in a town of ledgers.",
      irreconcilable_contradiction: "She protects debtors by making them permanently legible to creditors.",
      pressure_behavior: {
        cornered: "quotes receipt law",
        tempted: "asks who benefits",
        humiliated: "turns procedural",
        offered_power: "demands a witness",
        protecting_attachment: "lies by omission"
      },
      relational_charge: [
        {
          target_or_relation_type: "former debtor",
          need: "forgiveness",
          resentment_or_fear: "being exposed as sentimental",
          likely_harm_or_betrayal: "records the debtor's secret anyway"
        }
      ],
      moral_psychological_edge: "She believes rescue is valid only when it leaves a scar.",
      signature_scene_behaviors: ["folds receipts into charms", "counts exits before speaking", "answers prayers with fee schedules"],
      voice_under_pressure: {
        lying: "precise and priestly",
        begging: "transactional",
        threatening: "softly bureaucratic",
        grieving_or_hiding_ignorance: "recites doctrine"
      },
      cannot_be_swapped_out_because: "Only her confessional toll office makes mercy and audit the same act."
    },
    scores: {
      validity: { world_rootedness: 5 },
      memorability: { protagonist_grade_force: 5 }
    },
    canon_assumption_flags: {
      status: "canon-safe",
      edge_assumptions: [],
      implied_new_facts: []
    },
    recommended_next_step: "generate_immediately",
    critic_pass_trace: {
      phase_1_continuity_archivist: "No duplicate office found.",
      phase_2_essence_extractor: "Debt-confession essence preserved.",
      phase_3_constellation_mosaic: "Occupies an open ledger-faith niche.",
      phase_5_institutional_everyday: "Turns toll work into daily pressure.",
      phase_8_epistemic_focalization: "Knows law, not metaphysics.",
      phase_9_voice_critic: "Speech stays procedural under pressure.",
      phase_9_artifact_authorship: "Could author receipt-prayers.",
      phase_11_theme_tone: "Fresh but world-rooted.",
      blandness_executioner: "Valid-but-dull version was rejected.",
      protagonist_grade_critic: "Can carry story pressure without plot-destiny fields."
    },
    canon_safety_check: {
      invariants_respected: ["SOC-1"],
      mystery_reserve_firewall: ["M-1"],
      distribution_discipline: { canon_facts_consulted: ["CF-1"] }
    },
    source_basis: {
      world_slug: "animalia",
      batch_id: "NCB-3",
      generated_date: "2026-05-20",
      user_approved: false
    }
  };
}

function validCharacterProposalBatch(): Record<string, unknown> {
  return {
    batch_id: "NCB-3",
    world_slug: "animalia",
    generated_date: "2026-05-20",
    parameters: {
      batch_size: 7,
      depth_mix: { emblematic: 1, elastic: 3, round_load_bearing: 3 },
      spread_vs_focus: "spread",
      density_rule_mode: "auto",
      target_domains: ["river tolls"],
      taboo_areas: ["sexual coercion"],
      ordinary_vs_exceptional_mix: "balanced",
      artifact_author_share: 0.25,
      under_modeled_priority: ["debt law"],
      max_overlap_allowed: "crowded_permitted",
      story_scale_mix: { intimate: 2, local: 3, regional: 1, transregional: 1 },
      mosaic_cluster_preference: "mixed",
      upstream_audit_path: ""
    },
    registry_summary: "The registry has no toll-confessor figure.",
    card_ids: ["NCP-12"],
    dropped_card_ids: [],
    user_approved: false,
    notes: "No batch-level repairs."
  };
}
