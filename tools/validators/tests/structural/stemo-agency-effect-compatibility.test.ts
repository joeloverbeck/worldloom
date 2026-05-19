import assert from "node:assert/strict";
import test from "node:test";

import { stemoAgencyEffectCompatibility } from "../../src/structural/stemo-agency-effect-compatibility.js";
import { baseRecords, context, emotion, eventBody, hasCode, storyRecord } from "./stemo-helpers.js";

test("stemo_agency_effect_compatibility accepts compatible active STSTAT agency", async () => {
  const constrainedStatus = storyRecord("story_status_record", "STSTAT-1", "status", {
    id: "STSTAT-1",
    created_at_page: "PG-1",
    entity: "STENT-1",
    agency: "constrained"
  });
  const verdicts = await stemoAgencyEffectCompatibility.run(
    undefined,
    context(baseRecords([constrainedStatus, emotion({ agency_effect: "constraining" })]))
  );
  assert.deepEqual(verdicts, []);
});

test("stemo_agency_effect_compatibility rejects incompatible active STSTAT agency", async () => {
  const freeStatus = storyRecord("story_status_record", "STSTAT-1", "status", {
    id: "STSTAT-1",
    created_at_page: "PG-1",
    entity: "STENT-1",
    agency: "free"
  });
  const verdicts = await stemoAgencyEffectCompatibility.run(
    undefined,
    context(baseRecords([freeStatus, emotion({ agency_effect: "constraining" })]))
  );
  assert.ok(hasCode(verdicts, "stemo_agency_effect_compatibility.unexplained_constraining_effect"));
});

test("stemo_agency_effect_compatibility accepts same-event structured relation", async () => {
  const event = storyRecord("story_event_record", "SE-2", "events", {
    ...eventBody("SE-2", "The event blocks the plan."),
    state_relations: [{ relation: "blocks", target_record: "STPLAN-1" }]
  });
  const verdicts = await stemoAgencyEffectCompatibility.run(
    undefined,
    context(baseRecords([event, emotion({ agency_effect: "constraining" })]))
  );
  assert.deepEqual(verdicts, []);
});

test("stemo_agency_effect_compatibility rejects unexplained constraining agency effects", async () => {
  const verdicts = await stemoAgencyEffectCompatibility.run(
    undefined,
    context(baseRecords([emotion({ agency_effect: "constraining" })]))
  );
  assert.ok(hasCode(verdicts, "stemo_agency_effect_compatibility.unexplained_constraining_effect"));
  assert.match(verdicts[0]?.message ?? "", /state_relations\[\] \/ non_propagation_facts\[\] entry/);
  assert.doesNotMatch(verdicts[0]?.message ?? "", /plan_relation\/non_propagation rationale/);
});
