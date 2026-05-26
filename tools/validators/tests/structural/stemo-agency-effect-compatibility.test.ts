import assert from "node:assert/strict";
import test from "node:test";

import { stemoAgencyEffectCompatibility } from "../../src/structural/stemo-agency-effect-compatibility.js";
import { baseRecords, choice, context, emotion, eventBody, hasCode, plan, srel, storyRecord } from "./stemo-helpers.js";

test("stemo_agency_effect_compatibility accepts constraining STEMO when holder STSTAT agency is externally constrained", async (t) => {
  for (const agency of ["constrained", "coerced", "captive", "incapacitated", "unconscious", "dead"]) {
    await t.test(agency, async () => {
      const status = storyRecord("story_status_record", "STSTAT-1", "status", {
        id: "STSTAT-1",
        created_at_page: "PG-1",
        entity: "STENT-1",
        agency
      });
      const verdicts = await stemoAgencyEffectCompatibility.run(
        undefined,
        context(baseRecords([status, emotion({ agency_effect: "constraining" })]))
      );
      assert.deepEqual(verdicts, []);
    });
  }
});

test("stemo_agency_effect_compatibility accepts constraining STEMO when a CHC grounds in this STEMO", async () => {
  const verdicts = await stemoAgencyEffectCompatibility.run(
    undefined,
    context(baseRecords([choice(), emotion({ agency_effect: "constraining" })]))
  );
  assert.deepEqual(verdicts, []);
});

test("stemo_agency_effect_compatibility accepts constraining STEMO when a holder-matched STPLAN derives from this STEMO", async () => {
  const verdicts = await stemoAgencyEffectCompatibility.run(
    undefined,
    context(baseRecords([plan(), emotion({ agency_effect: "constraining" })]))
  );
  assert.deepEqual(verdicts, []);
});

test("stemo_agency_effect_compatibility accepts constraining STEMO when a holder-participating SREL derives from this STEMO", async () => {
  const verdicts = await stemoAgencyEffectCompatibility.run(
    undefined,
    context(baseRecords([srel(), emotion({ agency_effect: "constraining" })]))
  );
  assert.deepEqual(verdicts, []);
});

test("stemo_agency_effect_compatibility rejects constraining STEMO with no downstream grounding and free holder STSTAT", async () => {
  const verdicts = await stemoAgencyEffectCompatibility.run(
    undefined,
    context(baseRecords([emotion({ agency_effect: "constraining" })]))
  );
  assert.ok(hasCode(verdicts, "stemo_agency_effect_compatibility.unexplained_constraining_effect"));
  assert.match(verdicts[0]?.message ?? "", /downstream grounding/);
  assert.doesNotMatch(verdicts[0]?.message ?? "", /state_relations\[\] \/ non_propagation_facts\[\] entry/);
});

test("stemo_agency_effect_compatibility ignores STEMO with agency_effect none", async () => {
  const verdicts = await stemoAgencyEffectCompatibility.run(
    undefined,
    context(baseRecords([emotion({ agency_effect: "none" })]))
  );
  assert.deepEqual(verdicts, []);
});

test("stemo_agency_effect_compatibility no longer accepts SE.non_propagation_facts entries as constrained-agency receipts", async () => {
  const event = storyRecord("story_event_record", "SE-2", "events", {
    ...eventBody("SE-2", "The event leaves no accessible witness trace."),
    non_propagation_facts: [{ reason: "event_leaves_no_accessible_trace", group: "direct_witnesses", records: [] }]
  });
  const verdicts = await stemoAgencyEffectCompatibility.run(
    undefined,
    context(baseRecords([event, emotion({ agency_effect: "constraining" })]))
  );
  assert.ok(hasCode(verdicts, "stemo_agency_effect_compatibility.unexplained_constraining_effect"));
});

test("stemo_agency_effect_compatibility no longer accepts SE.state_relations entries as constrained-agency receipts", async () => {
  const event = storyRecord("story_event_record", "SE-2", "events", {
    ...eventBody("SE-2", "The event blocks the plan."),
    state_relations: [{ relation: "blocks", target_record: "STPLAN-1" }]
  });
  const verdicts = await stemoAgencyEffectCompatibility.run(
    undefined,
    context(baseRecords([event, emotion({ agency_effect: "constraining" })]))
  );
  assert.ok(hasCode(verdicts, "stemo_agency_effect_compatibility.unexplained_constraining_effect"));
});
