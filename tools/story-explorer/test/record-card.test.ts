import assert from "node:assert/strict";
import { test } from "node:test";

import { buildRecordCard, recordCardClasses, recordCardClassRules } from "../src/read/record-card.js";

const REPRESENTATIVE_RECORDS: Record<string, { recordId: string; body: Record<string, unknown>; expected: string }> = {
  BEL: {
    recordId: "BEL-1",
    expected: "Mara suspects the door is watched.",
    body: {
      id: "BEL-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      holder: "STENT-1",
      claim: "Mara suspects the door is watched.",
      belief_mode: "suspects",
      truth_relation: "uncertain",
      confidence: "medium",
      visibility: "private",
    },
  },
  BR: {
    recordId: "BR-1",
    expected: "Cellar route",
    body: { id: "BR-1", story_id: "STORY-1", created_at_page: "PG-1", label: "Cellar route", description: "A branch toward the cellar.", parent_branch_id: "BR-0", forked_at_page_id: "PG-1", root_page_id: "PG-1" },
  },
  CHC: {
    recordId: "CHC-1",
    expected: "Open the cellar door",
    body: {
      id: "CHC-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      surface_label: "Open the cellar door",
      player_visible_intent: "Investigate below",
      target_or_action_families: ["investigate"],
      likely_state_pressure: "curiosity",
      grounded_in: { affordance_ordinals: [1], records: ["BEL-1"] },
    },
  },
  CLK: {
    recordId: "CLK-1",
    expected: "Guard patrol",
    body: { id: "CLK-1", story_id: "STORY-1", created_at_page: "PG-1", title: "Guard patrol", clock_kind: "threat", value: 2, max: 4, driver: "SE-1", resolution_event: "SE-4", salience: "high", visibility: "public", status: "active" },
  },
  CNSQ: {
    recordId: "CNSQ-1",
    expected: "The guard becomes suspicious.",
    body: { id: "CNSQ-1", story_id: "STORY-1", created_at_page: "PG-1", status: "pending", consequence_kind: "social", description: "The guard becomes suspicious.", resolves_when: "The guard is reassured.", urgency: "high" },
  },
  DA: {
    recordId: "DA-1",
    expected: "A torn letter",
    body: { id: "DA-1", story_id: "STORY-1", created_at_page: "PG-1", title: "A torn letter", author: "Ren", genre: "letter", truth_relation: "contested" },
  },
  OBL: {
    recordId: "OBL-1",
    expected: "Mara owes Ren an answer.",
    body: { id: "OBL-1", story_id: "STORY-1", created_at_page: "PG-1", status: "open", obligation_kind: "promise", description: "Mara owes Ren an answer.", owed_by: "STENT-1", owed_to: "STENT-2", trigger_to_close: "Mara answers Ren.", urgency: "medium" },
  },
  PG: {
    recordId: "PG-1",
    expected: "PG-1",
    body: { id: "PG-1", story_id: "STORY-1", branch_id: "BR-1", parent_page_id: "PG-0", turn_index: 1 },
  },
  RSP: {
    recordId: "RSP-1",
    expected: "Clarify hidden-state evidence",
    body: { id: "RSP-1", story_id: "STORY-1", created_at_page: "PG-1", title: "Clarify hidden-state evidence", status: "open", holder: "STENT-1", recommendation: "Add evidence.", severity: "medium", finding: "Missing source.", target_record: "BEL-1" },
  },
  SAU: {
    recordId: "SAU-1",
    expected: "Branch audit",
    body: { id: "SAU-1", story_id: "STORY-1", created_at_page: "PG-1", title: "Branch audit", status: "complete", scope: "branch", verdict: "pass", audited_story: "STORY-1", audited_branch: "BR-1", summary: "No issues." },
  },
  SE: {
    recordId: "SE-1",
    expected: "npc_action",
    body: { id: "SE-1", story_id: "STORY-1", created_at_page: "PG-1", event_kind: "npc_action", actor: "STENT-1", targets: ["STENT-2"], outcome_route: "accept", world_logic_rationale: "The guard reacts to the noise.", turn_driver: "npc_action", driver_records: ["SLT-1"], pov_visibility: "perceived_directly" },
  },
  SF: {
    recordId: "SF-1",
    expected: "The cellar door is unlocked.",
    body: { id: "SF-1", story_id: "STORY-1", created_at_page: "PG-1", statement: "The cellar door is unlocked.", authority: "branch_local", derived_from: ["CF-1"], scope: "branch" },
  },
  SLB: {
    recordId: "SLB-1",
    expected: "Door pressure move",
    body: { id: "SLB-1", story_id: "STORY-1", created_at_page: "PG-1", title: "Door pressure move", move_family: "investigation", scope_visibility: "branch_scoped", branch_scope: "BR-1", status: "active" },
  },
  SLT: {
    recordId: "SLT-1",
    expected: "Investigate locked room",
    body: { id: "SLT-1", story_id: "STORY-1", created_at_page: "PG-1", title: "Investigate locked room", move_family: "investigation", scope: { visibility: "branch_scoped", branch_id: "BR-1" }, preconditions: { hard: ["record_active(BEL-1)"], soft: ["any_clock_active(clk)"] }, grounding: { compatible_turn_drivers: ["player_action"], reason_to_exist: "The locked room has unresolved pressure." }, saliency: { urgency: "medium" } },
  },
  SP: {
    recordId: "SP-1",
    expected: "Promote cellar fact",
    body: { id: "SP-1", story_id: "STORY-1", created_at_page: "PG-1", title: "Promote cellar fact", status: "draft", claim: "The cellar door is unlocked.", holder: "STENT-1", promotion_kind: "fact", target_record: "SF-1", rationale: "It is repeatedly observed." },
  },
  SREL: {
    recordId: "SREL-1",
    expected: "Mara distrusts Ren.",
    body: { id: "SREL-1", story_id: "STORY-1", created_at_page: "PG-1", axis: "trust", participants: ["STENT-1", "STENT-2"], direction: "one_way", value: -1, valence: "negative", description: "Mara distrusts Ren." },
  },
  STCHAR: {
    recordId: "STCHAR-1",
    expected: "Mara voice authority",
    body: { id: "STCHAR-1", story_id: "STORY-1", created_at_page: "PG-1", title: "Mara voice authority", name: "Mara", display_name: "Mara", status: "active", profile_kind: "protagonist", source_char_id: "CHAR-1", created_from: "bootstrap" },
  },
  STEMO: {
    recordId: "STEMO-1",
    expected: "fear",
    body: { id: "STEMO-1", story_id: "STORY-1", created_at_page: "PG-1", holder: "STENT-1", affect_kind: "fear", intensity: "high", status: "active", orientation: { toward_records: ["STENT-2"] }, appraisal_basis: ["BEL-1"], trigger_event: "SE-1", supersedes: "STEMO-0" },
  },
  STENT: {
    recordId: "STENT-1",
    expected: "Mara",
    body: { id: "STENT-1", story_id: "STORY-1", created_at_page: "PG-1", display_name: "Mara", name: "Mara", bound_stchar_id: "STCHAR-1", role_in_story: "primary_actor" },
  },
  STINT: {
    recordId: "STINT-1",
    expected: "Find the hidden key.",
    body: { id: "STINT-1", story_id: "STORY-1", created_at_page: "PG-1", holder: "STENT-1", intent: "Find the hidden key.", expires_when: "The key is found.", urgency: "high" },
  },
  STLOC: {
    recordId: "STLOC-1",
    expected: "Cellar",
    body: { id: "STLOC-1", story_id: "STORY-1", created_at_page: "PG-1", label: "Cellar", description: "A narrow room under the inn.", region: "inn", access: "restricted" },
  },
  STOBJ: {
    recordId: "STOBJ-1",
    expected: "Iron key",
    body: { id: "STOBJ-1", story_id: "STORY-1", created_at_page: "PG-1", label: "Iron key", description: "A cold key.", owner: "STENT-1", current_location: "STLOC-1" },
  },
  STPLAN: {
    recordId: "STPLAN-1",
    expected: "Open the side gate.",
    body: { id: "STPLAN-1", story_id: "STORY-1", created_at_page: "PG-1", root_intention: "STINT-1", objective: "Open the side gate.", plan_status: "active", resources: ["STOBJ-1"], next_steps: ["Find the key."] },
  },
  STQ: {
    recordId: "STQ-1",
    expected: "Who locked the cellar?",
    body: { id: "STQ-1", story_id: "STORY-1", created_at_page: "PG-1", question_kind: "dramatic_question", question_or_setup: "Who locked the cellar?", answer_conditions: "A culprit is identified.", salience: "high", audience_visibility: "explicit", status: "open" },
  },
  STSEC: {
    recordId: "STSEC-1",
    expected: "Ren hid the key.",
    body: { id: "STSEC-1", story_id: "STORY-1", created_at_page: "PG-1", secret_kind: "motive", secret_claim: "Ren hid the key.", holders: ["STENT-2"], reveal_event: "SE-9", reveal_records: ["SF-9"], salience: "medium", status: "unrevealed" },
  },
  STSTAT: {
    recordId: "STSTAT-1",
    expected: "alive",
    body: { id: "STSTAT-1", story_id: "STORY-1", created_at_page: "PG-1", entity: "STENT-1", life: "alive", agency: "free", location: "STLOC-1", conditions: ["alert"], resources: ["STOBJ-1"], affordances: ["search"] },
  },
  THR: {
    recordId: "THR-1",
    expected: "Cellar mystery",
    body: { id: "THR-1", story_id: "STORY-1", created_at_page: "PG-1", status: "active", title: "Cellar mystery", summary: "Someone hid the key.", thread_kind: "mystery", resolution_conditions: "The hidden key is explained.", urgency: "medium" },
  },
};

test("recordCardClasses covers every SPEC-87 story-bundle record class", () => {
  assert.deepEqual(recordCardClasses(), Object.keys(REPRESENTATIVE_RECORDS).sort((left, right) => left.localeCompare(right, undefined, { numeric: true })));
});

test("recordCardClassRules exposes one rule per representative fixture", () => {
  assert.deepEqual(Object.keys(recordCardClassRules()).sort((left, right) => left.localeCompare(right, undefined, { numeric: true })), Object.keys(REPRESENTATIVE_RECORDS).sort((left, right) => left.localeCompare(right, undefined, { numeric: true })));
});

test("buildRecordCard does not use STCHAR status as a fallback summary", () => {
  const card = buildRecordCard("STCHAR-99", {
    id: "STCHAR-99",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    status: "active",
  });

  assert.equal(card.summaryLine, "STCHAR-99 (STCHAR)");
  assert.notEqual(card.summaryLine, "active");
});

test("buildRecordCard surfaces canonical SF/STEMO field names on real record shapes", () => {
  const factCard = buildRecordCard("SF-1", {
    id: "SF-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    supersedes: null,
    statement: "Ane Arrieta is 18 years old.",
    authority: "branch_local",
    derived_from: ["CF-0005"],
  });

  assert.deepEqual(factCard.primaryFields[0], { name: "statement", value: "Ane Arrieta is 18 years old." });

  const emotionCard = buildRecordCard("STEMO-15", {
    id: "STEMO-15",
    story_id: "STORY-1",
    created_at_page: "PG-6",
    created_by_event: "SE-6",
    holder: "STENT-1",
    status: "active",
    affect_kind: "confusion",
    intensity: "medium",
    orientation: { toward_records: ["STENT-3"] },
    appraisal_basis: ["BEL-15", "BEL-16"],
    trigger_event: "SE-6",
    behavioral_pressure: ["approach", "conceal", "plan", "ruminate"],
    agency_effect: "none",
    expires_when: "Ane commits a response register.",
    derived_from: ["STCHAR-1", "STEMO-10"],
    supersedes: "STEMO-10",
  });

  assert.ok(emotionCard.primaryFields.some((field) => field.name === "affect_kind" && field.value === "confusion"));
  assert.ok(emotionCard.secondaryFields.some((field) => field.name === "orientation.toward_records" && field.value.includes("STENT-3")));
});

test("buildRecordCard surfaces canonical CLK/SLT/STSEC/CHC field names on real record shapes", () => {
  const clockCard = buildRecordCard("CLK-1", REPRESENTATIVE_RECORDS.CLK!.body);
  assert.ok(clockCard.secondaryFields.some((field) => field.name === "value" && field.value === "2"));
  assert.ok(clockCard.secondaryFields.some((field) => field.name === "max" && field.value === "4"));
  assert.ok(!clockCard.secondaryFields.some((field) => ["current_tick", "max_tick", "stakes"].includes(field.name)));

  const storyletCard = buildRecordCard("SLT-1", REPRESENTATIVE_RECORDS.SLT!.body);
  assert.ok(storyletCard.secondaryFields.some((field) => field.name === "scope.visibility" && field.value === "branch_scoped"));
  assert.ok(storyletCard.secondaryFields.some((field) => field.name === "preconditions.hard" && field.value.includes("record_active(BEL-1)")));
  assert.ok(storyletCard.secondaryFields.some((field) => field.name === "grounding.compatible_turn_drivers" && field.value.includes("player_action")));
  assert.equal(storyletCard.visibility, "branch_scoped");

  const secretCard = buildRecordCard("STSEC-1", REPRESENTATIVE_RECORDS.STSEC!.body);
  assert.ok(secretCard.secondaryFields.some((field) => field.name === "reveal_event" && field.value === "SE-9"));
  assert.ok(secretCard.secondaryFields.some((field) => field.name === "reveal_records" && field.value === "SF-9"));
  assert.ok(!secretCard.secondaryFields.some((field) => field.name === "reveal_conditions"));

  const choiceCard = buildRecordCard("CHC-1", REPRESENTATIVE_RECORDS.CHC!.body);
  assert.ok(choiceCard.secondaryFields.some((field) => field.name === "grounded_in.records" && field.value === "BEL-1"));
});

for (const [recordClass, fixture] of Object.entries(REPRESENTATIVE_RECORDS)) {
  test(`buildRecordCard creates a deterministic ${recordClass} summary`, () => {
    const card = buildRecordCard(fixture.recordId, fixture.body, ["STENT-1", "BEL-1"], {
      sourcePath: `/tmp/${fixture.recordId}.yaml`,
      contentHash: "hash",
    });

    assert.equal(card.recordClass, recordClass);
    assert.equal(card.summaryLine, fixture.expected);
    assert.ok(card.primaryFields.length >= 1);
    assert.notEqual(card.summaryLine, `${fixture.recordId} (${recordClass})`);
    assert.equal(card.rawAvailable, true);
    assert.equal(card.sourcePath, `/tmp/${fixture.recordId}.yaml`);
    assert.equal(card.contentHash, "hash");

    const rule = recordCardClassRules()[recordClass]!;
    assert.deepEqual(
      card.primaryFields.map((field) => field.name),
      rule.primaryFields
    );
    for (const secondaryField of rule.secondaryFields) {
      assert.ok(card.secondaryFields.some((field) => field.name === secondaryField), `${recordClass} missing secondary field ${secondaryField}`);
    }
    if (rule.statusField !== null) {
      assert.notEqual(card.status, null, `${recordClass} missing status field ${rule.statusField}`);
    }
    if (rule.visibilityField !== null) {
      assert.notEqual(card.visibility, null, `${recordClass} missing visibility field ${rule.visibilityField}`);
    }
    if (rule.confidenceField !== null) {
      assert.notEqual(card.confidence, null, `${recordClass} missing confidence field ${rule.confidenceField}`);
    }
    if (rule.urgencyField !== null) {
      assert.notEqual(card.urgency, null, `${recordClass} missing urgency field ${rule.urgencyField}`);
    }
    if (rule.participantFields.length > 0) {
      assert.ok(card.participants.length > 0, `${recordClass} participant fields did not resolve to record IDs`);
    }
  });
}

test("buildRecordCard computes participants, links, and provenance", () => {
  const card = buildRecordCard(
    "OBL-1",
    REPRESENTATIVE_RECORDS.OBL!.body,
    ["STENT-1"],
    { provenance: { creatingEventId: "SE-1", modifyingEventIds: ["SE-2"], evidenceRecordIds: ["BEL-1"] } }
  );

  assert.deepEqual(card.participants, ["STENT-1", "STENT-2"]);
  assert.deepEqual(
    card.links.map((link) => [link.recordId, link.activeOnCurrentPage]),
    [
      ["STENT-1", true],
      ["STENT-2", false],
    ]
  );
  assert.equal(card.provenance.createdAtPage, "PG-1");
  assert.equal(card.provenance.creatingEventId, "SE-1");
  assert.deepEqual(card.provenance.modifyingEventIds, ["SE-2"]);
  assert.deepEqual(card.provenance.evidenceRecordIds, ["BEL-1"]);
});
