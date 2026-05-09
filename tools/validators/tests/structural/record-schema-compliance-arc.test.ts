import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import yaml from "js-yaml";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { RECORD_TYPE_TO_SCHEMA, STRUCTURAL_NODE_TYPES } from "../../src/structural/utils.js";
import { context, record } from "./helpers.js";

test("record_schema_compliance accepts v2 scene-commitment storylets", async () => {
  const result = await recordSchemaCompliance.run({}, context([storyletRecord(completeStorylet())]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects v2 scene-commitment storylets missing structural arc blocks", async () => {
  for (const field of [
    "arc_contract",
    "dramatic_unit",
    "beat_plan",
    "execution_envelope",
    "stop_policy",
    "effect_model",
    "exit_portfolio"
  ] as const) {
    const parsed = completeStorylet();
    delete parsed[field];

    const result = await recordSchemaCompliance.run({}, context([storyletRecord(parsed)]));

    assert.ok(result.some((verdict) => (
      verdict.code === "record_schema_compliance.required" &&
      verdict.message.includes(`must have required property '${field}'`)
    )));
  }
});

test("record_schema_compliance accepts v2 scene-commitment choices with populated worthiness", async () => {
  const result = await recordSchemaCompliance.run({}, context([choiceRecord(completeChoice())]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects scene-commitment choices with empty likely effects", async () => {
  const parsed = completeChoice();
  parsed.likely_effects = [];

  const result = await recordSchemaCompliance.run({}, context([choiceRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.location.node_id === "CHC-0001" &&
    verdict.code === "record_schema_compliance.minItems" &&
    verdict.message.includes("/likely_effects")
  )));
});

test("record_schema_compliance accepts ARC_TRACE records and exposes structural registration", async () => {
  const result = await recordSchemaCompliance.run({}, context([arcTraceRecord(completeArcTrace())]));

  assert.deepEqual(result, []);
  assert.equal(RECORD_TYPE_TO_SCHEMA.arc_trace_record, "story-arc-trace");
  assert.ok((STRUCTURAL_NODE_TYPES as readonly string[]).includes("arc_trace_record"));
});

test("record_schema_compliance rejects ARC_TRACE records with malformed evidence spans", async () => {
  const parsed = completeArcTrace();
  (parsed.effect_evidence as Record<string, unknown>[])[0]!.evidence_span = { start: -1, end: 100 };

  const result = await recordSchemaCompliance.run({}, context([arcTraceRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.location.node_id === "ARCTRACE-0001" &&
    verdict.code === "record_schema_compliance.minimum" &&
    verdict.message.includes("/effect_evidence/0/evidence_span/start")
  )));
});

test("record_schema_compliance rejects ARC_TRACE records missing semantic critic verdict", async () => {
  const parsed = completeArcTrace();
  delete parsed.semantic_critic_verdict;

  const result = await recordSchemaCompliance.run({}, context([arcTraceRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.location.node_id === "ARCTRACE-0001" &&
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("semantic_critic_verdict")
  )));
});

function completeStorylet(): Record<string, unknown> {
  return yaml.load(readFixture("story-storylet-complete.yaml"), { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>;
}

function completeChoice(): Record<string, unknown> {
  return {
    id: "CHC-0001",
    story_id: "STORY-001",
    record_version: 2,
    choice_kind: "scene_commitment",
    commitment_class: "offer_practical_help",
    strategy_cluster: "careful-help",
    choice_contract: {
      user_intent: "Offer practical help.",
      guaranteed_action: "The offer is made.",
      success_policy: "contested",
      allowed_outcome_band: ["partially_succeeds"],
      forbidden_outcomes: [],
      minimum_state_change: ["relationship_trajectory"]
    },
    likely_effects: [
      {
        type: "relationship_axis_shift",
        axis: "trust",
        direction: "increase_small"
      }
    ],
    continuation_capacity: {
      post_choice_delta: {},
      valid_seed_storylets: ["SLT-0001"],
      jit_shape_spec: null
    },
    choice_worthiness: {
      strategic_question_answered: "Can help be offered without pressure?",
      strong_axes: ["relationship_trajectory"],
      expected_state_delta: {
        relationship: { possible: ["trust increases"], magnitude: "small" }
      },
      why_not_microbeat: "The choice changes the relationship's pressure state.",
      foreseeable_difference: "Accepting help creates a distinct next arc."
    }
  };
}

function completeArcTrace(): Record<string, unknown> {
  return {
    id: "ARCTRACE-0001",
    story_id: "STORY-001",
    created_at_page: "PG-0002",
    arc_realized: "SLT-0001",
    effect_variant_applied: "partial-repair",
    realized_beats: [
      {
        beat_id: "B1",
        function: "offer-help",
        evidence_span: { start: 0, end: 24 },
        realized: "true"
      }
    ],
    observed_actions: [
      {
        actor: "STENT-0001",
        action: "offers-help",
        target: "STENT-0002",
        evidence_span: { start: 0, end: 24 }
      }
    ],
    observed_claims: [
      {
        claim: "The offer was made without coercion.",
        source: "inference",
        canon_status: "story_local",
        evidence_span: { start: 0, end: 24 }
      }
    ],
    possible_violations: [],
    stop_condition_hit: {
      id: "help-accepted",
      category: "normal_exit",
      evidence_span: { start: 10, end: 24 }
    },
    effect_evidence: [
      {
        effect_ref: 0,
        realized: "true",
        evidence_span: { start: 0, end: 24 }
      }
    ],
    semantic_critic_verdict: {
      status: "pass",
      reasons: [],
      required_revision_constraints: []
    },
    notes: "Trace fixture."
  };
}

function storyletRecord(parsed: Record<string, unknown>, id = String(parsed.id ?? "SLT-0001")) {
  return record("storylet_record", id, `stories/red-bunny/_source/storylets/${id}.yaml`, {
    ...parsed,
    id
  });
}

function choiceRecord(parsed: Record<string, unknown>, id = String(parsed.id ?? "CHC-0001")) {
  return record("choice_record", id, `stories/red-bunny/_source/choices/${id}.yaml`, {
    ...parsed,
    id
  });
}

function arcTraceRecord(parsed: Record<string, unknown>, id = String(parsed.id ?? "ARCTRACE-0001")) {
  return record("arc_trace_record", id, `stories/red-bunny/_source/arc-traces/${id}.yaml`, {
    ...parsed,
    id
  });
}

function readFixture(filename: string): string {
  return readFileSync(path.resolve(process.cwd(), "tests", "fixtures", filename), "utf8");
}
