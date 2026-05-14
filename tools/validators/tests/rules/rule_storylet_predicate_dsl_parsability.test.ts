import assert from "node:assert/strict";
import test from "node:test";

import type { IndexedRecord } from "../../src/framework/types.js";
import { storyletPredicateDslParsability } from "../../src/rules/rule_storylet_predicate_dsl_parsability.js";
import { context, record } from "../structural/helpers.js";

test("storylet predicate DSL accepts nested preconditions and every contract predicate form", async () => {
  const verdicts = await storyletPredicateDslParsability.run(null, context(validReferenceRecords().concat([
    storyletRecord("SLT-0001", {
      preconditions: {
        hard: [
          { pred: "fact_true", fact: "SF-0001" },
          { pred: "belief", holder: "STENT-0001", claim: "BEL-0001", mode: "believes", confidence_floor: "medium" },
          { pred: "entity_status", entity: "STENT-0001", field: "agency", value: "free" },
          { pred: "relationship_axis", from: "role:protagonist", to: "STENT-0002", axis: "trust", value: "high" },
          { pred: "obligation_open", obligation: "OBL-0001" },
          { pred: "consequence_pending", consequence: "CNSQ-0001" },
          { pred: "thread_active", thread: "THR-0001" },
          { pred: "location", entity: "STENT-0001", location: "STLOC-0001" },
          { pred: "has_affordance", action_family: "communicate" },
          { pred: "record_active", record: "STSTAT-0001" },
          { pred: "intention_active", intention: "STINT-0001" },
          { pred: "object_accessible", entity: "STENT-0001", object: "STOBJ-0001" },
          { pred: "artifact_accessible", entity: "STENT-0001", artifact: "DA-0001" },
          { pred: "affordance_available_to", entity: "STENT-0001", action_family: "protect" },
          { pred: "not", predicate: { pred: "entity_status", entity: "role:protagonist", field: "life", value: "dead" } },
          { pred: "all", predicates: [{ pred: "thread_active", thread: "THR-0001" }] },
          { pred: "any", predicates: [{ pred: "has_affordance", action_family: "wait" }] }
        ],
        soft: [
          { pred: "affordance_available_to", entity: "role:protagonist", action_family: "investigate" }
        ]
      }
    })
  ])));

  assert.deepEqual(verdicts, []);
});

test("storylet predicate DSL rejects unknown pred, prose, invalid enum, invalid refs, malformed nested shape, and deep recursion", async () => {
  const verdicts = await storyletPredicateDslParsability.run(null, context(validReferenceRecords().concat([
    storyletRecord("SLT-0002", {
      preconditions: {
        hard: [
          { pred: "epistemic", fact: "SF-0001", class: "belief", certainty_min: 0.5 },
          "the protagonist should feel ready",
          { pred: "affordance_available_to", entity: "STENT-0001", action_family: "escape" },
          { pred: "object_accessible", entity: "STENT-0001", object: "STOBJ-9999" },
          { pred: "record_active", record: "SE-0001" },
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
  assert.match(verdicts.find((verdict) => verdict.code === "predicate.unknown_pred")?.message ?? "", /SLT-0002/);
});

test("storylet predicate DSL rejects legacy entity_status axis argument", async () => {
  const verdicts = await storyletPredicateDslParsability.run(null, context(validReferenceRecords().concat([
    storyletRecord("SLT-0003", {
      preconditions: {
        hard: [
          { pred: "entity_status", entity: "STENT-0001", axis: "agency", value: "free" }
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
    storyletRecord("SLT-0004", { preconditions: { soft: [] } })
  ]));

  assert.ok(verdicts.some((verdict) => verdict.code === "predicate.expected_list"));
});

test("storylet predicate DSL applies to touched storylet files in incremental mode", () => {
  assert.equal(
    storyletPredicateDslParsability.applies_to(
      context([], {
        run_mode: "incremental",
        touched_files: ["stories/marla-kern-seduction/_source/storylets/SLT-0001.yaml"]
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
    record("story_fact_record", "marla:SF-0001", "stories/marla/_source/facts/SF-0001.yaml", { id: "SF-0001" }),
    record("story_entity_record", "marla:STENT-0001", "stories/marla/_source/entities/STENT-0001.yaml", { id: "STENT-0001" }),
    record("story_entity_record", "marla:STENT-0002", "stories/marla/_source/entities/STENT-0002.yaml", { id: "STENT-0002" }),
    record("belief_record", "marla:BEL-0001", "stories/marla/_source/beliefs/BEL-0001.yaml", { id: "BEL-0001" }),
    record("obligation_record", "marla:OBL-0001", "stories/marla/_source/obligations/OBL-0001.yaml", { id: "OBL-0001" }),
    record("consequence_record", "marla:CNSQ-0001", "stories/marla/_source/consequences/CNSQ-0001.yaml", { id: "CNSQ-0001" }),
    record("thread_record", "marla:THR-0001", "stories/marla/_source/threads/THR-0001.yaml", { id: "THR-0001" }),
    record("relationship_record_story", "marla:SREL-0001", "stories/marla/_source/relationships/SREL-0001.yaml", { id: "SREL-0001" }),
    record("intention_record", "marla:STINT-0001", "stories/marla/_source/intentions/STINT-0001.yaml", { id: "STINT-0001" }),
    record("story_location_record", "marla:STLOC-0001", "stories/marla/_source/locations/STLOC-0001.yaml", { id: "STLOC-0001" }),
    record("story_object_record", "marla:STOBJ-0001", "stories/marla/_source/objects/STOBJ-0001.yaml", { id: "STOBJ-0001" }),
    record("story_diegetic_artifact_record", "marla:DA-0001", "stories/marla/_source/artifacts/DA-0001.yaml", { id: "DA-0001" }),
    record("story_status_record", "marla:STSTAT-0001", "stories/marla/_source/status/STSTAT-0001.yaml", { id: "STSTAT-0001" })
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
