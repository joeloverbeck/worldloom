import assert from "node:assert/strict";
import test from "node:test";

import { stplanPredicateReferences } from "../../src/structural/stplan-predicate-references.js";
import { fallbackTriggerRecordIds } from "../../src/structural/stplan-utils.js";
import { baseRecords, context, hasCode, plan, storyRecord } from "./stplan-helpers.js";

test("stplan_predicate_references accepts parseable predicates with resolvable record ids", async () => {
  const records = baseRecords([
    plan({
      current_step: {
        action_family: "investigate",
        target_records: ["STOBJ-1"],
        success_condition: {
          predicates: [
            { pred: "record_active", record: "SF-1" },
            { pred: "location", entity: "STENT-1", location: "STLOC-1" }
          ]
        }
      }
    })
  ]);

  const verdicts = await stplanPredicateReferences.run(undefined, context(records));

  assert.deepEqual(verdicts, []);
});

test("stplan_predicate_references rejects unparseable success-condition predicates", async () => {
  const records = baseRecords([
    plan({
      current_step: {
        action_family: "investigate",
        target_records: ["STOBJ-1"],
        success_condition: { predicates: [{ pred: "INVALID_GRAMMAR" }] }
      }
    })
  ]);

  const verdicts = await stplanPredicateReferences.run(undefined, context(records));

  assert.ok(hasCode(verdicts, "stplan_predicate_references.predicate_unparseable"));
});

test("stplan_predicate_references rejects unresolved record references", async () => {
  const records = baseRecords([
    plan({
      current_step: {
        action_family: "investigate",
        target_records: ["STOBJ-1"],
        success_condition: { predicates: [{ pred: "record_active", record: "STPLAN-9999" }] }
      }
    })
  ]);

  const verdicts = await stplanPredicateReferences.run(undefined, context(records));

  assert.ok(hasCode(verdicts, "stplan_predicate_references.predicate_record_unresolved"));
});

test("stplan_predicate_references accepts fallback trigger predicates with resolvable ids", async () => {
  const records = baseRecords([
    storyRecord("story_plan_record", "STPLAN-2", "plans", {
      id: "STPLAN-2",
      created_at_page: "PG-1",
      plan_status: "active"
    }),
    plan({
      fallback_steps: [
        {
          action_family: "evade",
          target_records: ["STPLAN-2"],
          trigger_predicates: [{ pred: "record_active", record: "STPLAN-2" }]
        }
      ]
    })
  ]);

  const verdicts = await stplanPredicateReferences.run(undefined, context(records));

  assert.deepEqual(verdicts, []);
});

test("stplan_predicate_references reports success and fallback failures together", async () => {
  const records = baseRecords([
    plan({
      current_step: {
        action_family: "investigate",
        target_records: ["STOBJ-1"],
        success_condition: { predicates: [{ pred: "INVALID_GRAMMAR" }] }
      },
      fallback_steps: [
        {
          action_family: "evade",
          target_records: ["STPLAN-9999"],
          trigger_predicates: [{ pred: "record_active", record: "STPLAN-9999" }]
        }
      ]
    })
  ]);

  const verdicts = await stplanPredicateReferences.run(undefined, context(records));

  assert.ok(hasCode(verdicts, "stplan_predicate_references.predicate_unparseable"));
  assert.ok(hasCode(verdicts, "stplan_predicate_references.predicate_record_unresolved"));
});

test("fallbackTriggerRecordIds returns ids from fallback trigger_predicates", () => {
  const fallbackPlan = plan({
    fallback_steps: [
      {
        action_family: "evade",
        target_records: ["STPLAN-2"],
        trigger_predicates: [
          { pred: "record_active", record: "STPLAN-2" },
          { pred: "emotion_active", entity: "STENT-1", affect: "fear" }
        ]
      }
    ]
  });

  assert.deepEqual(fallbackTriggerRecordIds(fallbackPlan), ["STENT-1", "STPLAN-2"]);
});
