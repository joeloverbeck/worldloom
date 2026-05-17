import assert from "node:assert/strict";
import test from "node:test";

import type { IndexedRecord } from "../../src/framework/types.js";
import { storyletPredicateDslParsability } from "../../src/rules/rule_storylet_predicate_dsl_parsability.js";
import { context, record } from "../structural/helpers.js";

test("storylet predicate DSL accepts nested preconditions and every contract predicate form", async () => {
  const verdicts = await storyletPredicateDslParsability.run(null, context(validReferenceRecords().concat([
    storyletRecord("SLT-1", {
      scope: { visibility: "global_author_pool", branch_id: null },
      preconditions: {
        hard: [
          { pred: "fact_true", fact: "SF-1" },
          { pred: "belief_record", holder: "STENT-1", belief_id: "BEL-1", mode: "believes", confidence_floor: "medium" },
          { pred: "entity_status", entity: "STENT-1", field: "agency", value: "free" },
          { pred: "relationship_axis", from: "role:protagonist", to: "STENT-2", axis: "trust", value: "high" },
          { pred: "obligation_open", obligation: "OBL-1" },
          { pred: "consequence_pending", consequence: "CNSQ-1" },
          { pred: "thread_active", thread: "THR-1" },
          { pred: "clock_at_least", clock: "CLK-1", value: 2 },
          { pred: "clock_below", clock: "CLK-1", value: 6 },
          { pred: "clock_full", clock: "CLK-1" },
          { pred: "secret_unrevealed", secret: "STSEC-1" },
          { pred: "secret_revealed", secret: "STSEC-1" },
          { pred: "revelation_ready", secret: "STSEC-1" },
          { pred: "any_obligation_open", alias: "urgent_debt", kind: "promise", urgency: "high", owed_by_role: "primary_actor", owed_to_role: "dependent" },
          { pred: "any_consequence_pending", alias: "pending_fallout", kind: "danger", urgency: "medium", derived_from: "SE-1" },
          { pred: "any_thread_active", alias: "active_thread", tag: "gate_repair", urgency: "low" },
          { pred: "any_clock_active", alias: "active_clock", kind: "exposure", salience: "high" },
          { pred: "any_secret_unrevealed", alias: "hidden_secret", kind: "identity", salience: "high" },
          { pred: "any_relationship_axis", alias: "trust_edge", axis: "trust", comparator: ">=", value: "medium", participant_role: "allied_actor" },
          { pred: "any_belief", alias: "public_belief", holder_role: "witness", mode: "believes", truth_relation: "contested", visibility: "public" },
          { pred: "any_intention", alias: "open_intent", holder_role: "primary_actor", urgency: "high" },
          { pred: "location", entity: "STENT-1", location: "STLOC-1" },
          { pred: "has_affordance", action_family: "communicate" },
          { pred: "record_active", record: "STSTAT-1" },
          { pred: "record_age", record: "bound:pending_fallout", comparator: ">=", pages: 3 },
          { pred: "intention_active", intention: "STINT-1" },
          { pred: "object_accessible", entity: "STENT-1", object: "STOBJ-1" },
          { pred: "artifact_accessible", entity: "STENT-1", artifact: "DA-1" },
          { pred: "affordance_available_to", entity: "STENT-1", action_family: "protect" },
          { pred: "not", predicate: { pred: "entity_status", entity: "role:protagonist", field: "life", value: "dead" } },
          { pred: "all", predicates: [{ pred: "thread_active", thread: "THR-1" }] },
          { pred: "any", predicates: [{ pred: "has_affordance", action_family: "wait" }] }
        ],
        soft: [
          { pred: "affordance_available_to", entity: "role:protagonist", action_family: "investigate" }
        ]
      },
      effects: {
        create: ["bound:pending_fallout"],
        supersede: ["bound:urgent_debt"],
        close: ["bound:active_thread", "bound:hidden_secret"]
      },
      exit_options: [
        {
          action_family: "communicate",
          surface_hint: "Name the consequence.",
          likely_effects: ["bound:trust_edge", "bound:public_belief", "bound:open_intent", "bound:active_clock"]
        }
      ]
    })
  ])));

  assert.deepEqual(verdicts, []);
});

test("storylet predicate DSL rejects legacy belief predicate and free-claim belief_record argument", async () => {
  const verdicts = await storyletPredicateDslParsability.run(null, context(validReferenceRecords().concat([
    storyletRecord("SLT-8", {
      scope: { visibility: "global_author_pool", branch_id: null },
      preconditions: {
        hard: [
          { pred: "belief", holder: "STENT-1", belief_id: "BEL-1" },
          { pred: "belief_record", holder: "STENT-1", belief_id: "the king is dead" },
          { pred: "any_belief", alias: "public_belief", mode: "knows" }
        ]
      },
      exit_options: [
        {
          action_family: "communicate",
          surface_hint: "Name the belief.",
          likely_effects: ["bound:public_belief"]
        }
      ]
    })
  ])));

  assert.ok(verdicts.some((verdict) =>
    verdict.code === "predicate.unknown_pred" &&
    verdict.message.includes("preconditions.hard[0]")
  ));
  assert.ok(verdicts.some((verdict) =>
    verdict.code === "belief_record_argument_invalid" &&
    verdict.message.includes("preconditions.hard[1].belief_id")
  ));
  assert.ok(!verdicts.some((verdict) =>
    verdict.message.includes("preconditions.hard[2]")
  ));
});

test("storylet predicate DSL rejects malformed record_age comparators and page counts", async () => {
  const verdicts = await storyletPredicateDslParsability.run(null, context(validReferenceRecords().concat([
    storyletRecord("SLT-7", {
      scope: { visibility: "global_author_pool", branch_id: null },
      preconditions: {
        hard: [
          { pred: "any_consequence_pending", alias: "pending_fallout", kind: "danger", urgency: "medium" },
          { pred: "record_age", record: "bound:pending_fallout", comparator: ">", pages: 3 },
          { pred: "record_age", record: "bound:pending_fallout", comparator: ">=", pages: "three" }
        ]
      }
    })
  ])));

  assert.ok(verdicts.some((verdict) =>
    verdict.code === "predicate.invalid_enum" &&
    verdict.message.includes("preconditions.hard[1].comparator")
  ));
  assert.ok(verdicts.some((verdict) =>
    verdict.code === "predicate.invalid_integer" &&
    verdict.message.includes("preconditions.hard[2].pages")
  ));
});

test("storylet predicate DSL rejects bound effect aliases with no binding precondition", async () => {
  const verdicts = await storyletPredicateDslParsability.run(null, context(validReferenceRecords().concat([
    storyletRecord("SLT-5", {
      scope: { visibility: "global_author_pool", branch_id: null },
      preconditions: {
        hard: [
          { pred: "has_affordance", action_family: "communicate" }
        ]
      },
      effects: {
        supersede: ["bound:missing_debt"]
      },
      exit_options: [
        {
          action_family: "communicate",
          surface_hint: "Ask after the debt.",
          likely_effects: ["bound:missing_consequence"]
        }
      ]
    })
  ])));

  assert.ok(verdicts.some((verdict) =>
    verdict.code === "predicate.unbound_alias" &&
    verdict.message.includes("effects.supersede[0]")
  ));
  assert.ok(verdicts.some((verdict) =>
    verdict.code === "predicate.unbound_alias" &&
    verdict.message.includes("exit_options[0].likely_effects[0]")
  ));
});

test("storylet predicate DSL rejects existential predicates in branch-scoped execution blocks", async () => {
  const verdicts = await storyletPredicateDslParsability.run(null, context(validReferenceRecords().concat([
    storyletRecord("SLT-6", {
      scope: { visibility: "branch_scoped", branch_id: "BR-1" },
      preconditions: {
        hard: [
          { pred: "any_obligation_open", alias: "debt" }
        ]
      }
    })
  ])));

  assert.ok(verdicts.some((verdict) =>
    verdict.code === "predicate.invalid_scope" &&
    verdict.message.includes("global_author_pool or branch_prefix_scoped")
  ));
});

test("storylet predicate DSL rejects unknown pred, prose, invalid enum, invalid refs, malformed nested shape, and deep recursion", async () => {
  const verdicts = await storyletPredicateDslParsability.run(null, context(validReferenceRecords().concat([
    storyletRecord("SLT-2", {
      preconditions: {
        hard: [
          { pred: "epistemic", fact: "SF-1", class: "belief", certainty_min: 0.5 },
          "the protagonist should feel ready",
          { pred: "affordance_available_to", entity: "STENT-1", action_family: "escape" },
          { pred: "object_accessible", entity: "STENT-1", object: "STOBJ-9999" },
          { pred: "record_active", record: "SE-1" },
          nestedNot(11)
        ],
        soft: "not-a-list"
      }
    })
  ])));

  const codes = verdicts.map((verdict) => verdict.code);
  assert.ok(codes.includes("predicate.unknown_pred"));
  assert.ok(codes.includes("predicate.expected_object"));
  assert.ok(codes.includes("predicate.invalid_enum"));
  assert.ok(codes.includes("predicate.unresolved_reference"));
  assert.ok(codes.includes("predicate.invalid_reference"));
  assert.ok(codes.includes("predicate.expected_list"));
  assert.ok(codes.includes("predicate.recursion_depth"));
  assert.match(verdicts.find((verdict) => verdict.code === "predicate.unknown_pred")?.message ?? "", /SLT-2/);
});

test("storylet predicate DSL rejects legacy entity_status axis argument", async () => {
  const verdicts = await storyletPredicateDslParsability.run(null, context(validReferenceRecords().concat([
    storyletRecord("SLT-3", {
      preconditions: {
        hard: [
          { pred: "entity_status", entity: "STENT-1", axis: "agency", value: "free" }
        ]
      }
    })
  ])));

  assert.ok(verdicts.some((verdict) =>
    verdict.code === "predicate.invalid_enum" &&
    verdict.message.includes("preconditions.hard[0].field")
  ));
});

test("storylet predicate DSL rejects missing nested hard list", async () => {
  const verdicts = await storyletPredicateDslParsability.run(null, context([
    storyletRecord("SLT-4", { preconditions: { soft: [] } })
  ]));

  assert.ok(verdicts.some((verdict) => verdict.code === "predicate.expected_list"));
});

test("storylet predicate DSL applies to touched storylet files in incremental mode", () => {
  assert.equal(
    storyletPredicateDslParsability.applies_to(
      context([], {
        run_mode: "incremental",
        touched_files: ["stories/marla-kern-seduction/_source/storylets/SLT-1.yaml"]
      })
    ),
    true
  );
});

test("storylet predicate DSL participates in Shape B storylet pre-apply plans", () => {
  assert.equal(
    storyletPredicateDslParsability.applies_to(
      context([], {
        run_mode: "pre-apply",
        patch_plan: {
          plan_id: "predicate-dsl-test",
          target_world: "clean",
          approval_token: "test-token",
          verdict: "ACCEPT",
          originating_skill: "test",
          expected_id_allocations: {},
          patches: [
            {
              op: "create_slt_record",
              target_world: "clean",
              payload: {
                story_slug: "marla",
                record: {}
              }
            }
          ]
        }
      })
    ),
    true
  );
});

function validReferenceRecords(): IndexedRecord[] {
  return [
    record("story_fact_record", "marla:SF-1", "stories/marla/_source/facts/SF-1.yaml", { id: "SF-1" }),
    record("story_entity_record", "marla:STENT-1", "stories/marla/_source/entities/STENT-1.yaml", { id: "STENT-1" }),
    record("story_entity_record", "marla:STENT-2", "stories/marla/_source/entities/STENT-2.yaml", { id: "STENT-2" }),
    record("belief_record", "marla:BEL-1", "stories/marla/_source/beliefs/BEL-1.yaml", { id: "BEL-1" }),
    record("obligation_record", "marla:OBL-1", "stories/marla/_source/obligations/OBL-1.yaml", { id: "OBL-1" }),
    record("consequence_record", "marla:CNSQ-1", "stories/marla/_source/consequences/CNSQ-1.yaml", { id: "CNSQ-1" }),
    record("thread_record", "marla:THR-1", "stories/marla/_source/threads/THR-1.yaml", { id: "THR-1" }),
    record("pressure_clock_record", "marla:CLK-1", "stories/marla/_source/clocks/CLK-1.yaml", { id: "CLK-1" }),
    record("story_secret_record", "marla:STSEC-1", "stories/marla/_source/secrets/STSEC-1.yaml", { id: "STSEC-1" }),
    record("relationship_record_story", "marla:SREL-1", "stories/marla/_source/relationships/SREL-1.yaml", { id: "SREL-1" }),
    record("intention_record", "marla:STINT-1", "stories/marla/_source/intentions/STINT-1.yaml", { id: "STINT-1" }),
    record("story_location_record", "marla:STLOC-1", "stories/marla/_source/locations/STLOC-1.yaml", { id: "STLOC-1" }),
    record("story_object_record", "marla:STOBJ-1", "stories/marla/_source/objects/STOBJ-1.yaml", { id: "STOBJ-1" }),
    record("story_diegetic_artifact_record", "marla:DA-1", "stories/marla/_source/artifacts/DA-1.yaml", { id: "DA-1" }),
    record("story_status_record", "marla:STSTAT-1", "stories/marla/_source/status/STSTAT-1.yaml", { id: "STSTAT-1" })
  ];
}

function storyletRecord(id: string, parsed: Record<string, unknown>): IndexedRecord {
  return record("storylet_record", `marla:${id}`, `stories/marla/_source/storylets/${id}.yaml`, { id, ...parsed });
}

function nestedNot(depth: number): Record<string, unknown> {
  let predicate: Record<string, unknown> = { pred: "entity_status", entity: "role:protagonist", field: "life", value: "alive" };
  for (let index = 0; index < depth; index += 1) {
    predicate = { pred: "not", predicate };
  }
  return predicate;
}
