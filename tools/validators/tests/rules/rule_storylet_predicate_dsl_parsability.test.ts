import assert from "node:assert/strict";
import test from "node:test";

import type { IndexedRecord } from "../../src/framework/types.js";
import { storyletPredicateDslParsability } from "../../src/rules/rule_storylet_predicate_dsl_parsability.js";
import { context, record } from "../structural/helpers.js";

test("storylet predicate DSL accepts every documented structural predicate form", async () => {
  const verdicts = await storyletPredicateDslParsability.run(null, context(validReferenceRecords().concat([
    storyletRecord("SLT-0001", {
      hard_preconds: [
        { pred: "fact_true", fact: "SF-0001" },
        { pred: "fact_matches", subject: "role:protagonist", predicate: "knows", object: "secret" },
        { pred: "entity_state", entity: "STENT-0001", property: "present", op: "==", value: true },
        { pred: "relationship", from: "role:protagonist", to: "role:antagonist", axis: "trust", op: ">=", value: 2 },
        { pred: "consequence_pending", kind: "social_pressure", salience_min: 4 },
        { pred: "obligation_open", matcher: { id: "OBL-0001", status: "open", payoff_mode_filter: ["literal_fulfillment"] } },
        { pred: "location", current_location: "role:current_location" },
        { pred: "epistemic", fact: "SF-0001", class: "belief", certainty_min: 0.4 },
        { pred: "not", predicate: { pred: "entity_state", entity: "role:protagonist", property: "restrained", op: "==", value: true } },
        { pred: "all", predicates: [{ pred: "time_of_day", op: "==", value: "evening" }] },
        { pred: "any", predicates: [{ pred: "time_of_week", op: "in", value: ["weekday", "weekend"] }] },
        { pred: "relationship_state", between: ["role:protagonist", "role:antagonist"], property: "prior_meeting", op: "==", value: false },
        { pred: "time_in_story", op: "==", value: "post_ebau" },
        { pred: "time_since_event", event_kind: "prior_encounter", op: ">=", value: "days:1" },
        { pred: "world_property", property: "ambient_register", op: "==", value: "gold_hour" },
        { pred: "obligation_state", obligation_id: "OBL-0001", property: "status", op: "==", value: "open" },
        { pred: "location_kind", location: "STLOC-0001", op: "in", value: ["cafe", "gallery"] },
        { pred: "location_id", op: "==", value: "entity:gaztelufit" },
        { pred: "location_class", location: "role:current_location", op: "==", value: "centro_wealth_register" }
      ],
      soft_preconds: [{ pred: "world_property", property: "story_specific_scalar", op: "!=", value: "custom_value" }],
      cast_requirements: [
        { role: "protagonist", predicates: [{ pred: "entity_state", entity: "role:protagonist", property: "present", op: "==", value: true }] }
      ],
      location_requirements: [{ pred: "location_kind", location: "role:current_location", op: "==", value: "story_local_place" }],
      choice_templates: [
        { operation: "pursue", preconditions: [{ pred: "time_in_story", op: "==", value: "story_specific_tag" }] }
      ]
    })
  ])));

  assert.deepEqual(verdicts, []);
});

test("storylet predicate DSL rejects unknown pred, prose, invalid enum, invalid refs, malformed open values, and deep recursion", async () => {
  const verdicts = await storyletPredicateDslParsability.run(null, context(validReferenceRecords().concat([
    storyletRecord("SLT-0002", {
      hard_preconds: [
        { pred: "phase_of_moon", value: "waning" },
        "the protagonist should feel ready",
        { pred: "epistemic", fact: "SF-0001", class: "secret_truth", certainty_min: 0.5 },
        { pred: "fact_true", fact: "SF-9999" },
        { pred: "time_in_story", op: "==", value: "Not A Tag" },
        nestedNot(11)
      ]
    })
  ])));

  const codes = verdicts.map((verdict) => verdict.code);
  assert.ok(codes.includes("predicate.unknown_pred"));
  assert.ok(codes.includes("predicate.expected_object"));
  assert.ok(codes.includes("predicate.invalid_enum"));
  assert.ok(codes.includes("predicate.unresolved_reference"));
  assert.ok(codes.includes("predicate.invalid_open_value"));
  assert.ok(codes.includes("predicate.recursion_depth"));
  assert.match(verdicts.find((verdict) => verdict.code === "predicate.unknown_pred")?.message ?? "", /SLT-0002/);
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

test("storylet predicate DSL does not participate in pre-apply before Shape B routing", () => {
  assert.equal(
    storyletPredicateDslParsability.applies_to(
      context([], {
        run_mode: "pre-apply",
        touched_files: ["stories/marla-kern-seduction/_source/storylets/SLT-0001.yaml"]
      })
    ),
    false
  );
});

function validReferenceRecords(): IndexedRecord[] {
  return [
    record("story_fact_record", "marla:SF-0001", "stories/marla/_source/facts/SF-0001.yaml", { id: "SF-0001" }),
    record("story_entity_record", "marla:STENT-0001", "stories/marla/_source/entities/STENT-0001.yaml", { id: "STENT-0001" }),
    record("story_entity_record", "marla:STENT-0002", "stories/marla/_source/entities/STENT-0002.yaml", { id: "STENT-0002" }),
    record("story_location_record", "marla:STLOC-0001", "stories/marla/_source/locations/STLOC-0001.yaml", { id: "STLOC-0001" }),
    record("obligation_record", "marla:OBL-0001", "stories/marla/_source/obligations/OBL-0001.yaml", { id: "OBL-0001" })
  ];
}

function storyletRecord(id: string, parsed: Record<string, unknown>): IndexedRecord {
  return record("storylet_record", `marla:${id}`, `stories/marla/_source/storylets/${id}.yaml`, { id, ...parsed });
}

function nestedNot(depth: number): Record<string, unknown> {
  let predicate: Record<string, unknown> = { pred: "entity_state", entity: "role:protagonist", property: "present", op: "==", value: true };
  for (let index = 0; index < depth; index += 1) {
    predicate = { pred: "not", predicate };
  }
  return predicate;
}
