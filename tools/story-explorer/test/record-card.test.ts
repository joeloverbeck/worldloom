import assert from "node:assert/strict";
import { test } from "node:test";

import { buildRecordCard, recordCardClasses } from "../src/read/record-card.js";

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
      confidence: "medium",
      visibility: "private",
    },
  },
  BR: {
    recordId: "BR-1",
    expected: "Cellar route",
    body: { id: "BR-1", story_id: "STORY-1", created_at_page: "PG-1", label: "Cellar route", parent_branch_id: null },
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
      grounded_in: ["BEL-1"],
    },
  },
  CLK: {
    recordId: "CLK-1",
    expected: "Guard patrol",
    body: { id: "CLK-1", story_id: "STORY-1", created_at_page: "PG-1", title: "Guard patrol", salience: "high", visibility: "public", status: "active" },
  },
  CNSQ: {
    recordId: "CNSQ-1",
    expected: "The guard becomes suspicious.",
    body: { id: "CNSQ-1", story_id: "STORY-1", created_at_page: "PG-1", status: "pending", consequence_kind: "social", description: "The guard becomes suspicious.", urgency: "high" },
  },
  DA: {
    recordId: "DA-1",
    expected: "A torn letter",
    body: { id: "DA-1", story_id: "STORY-1", created_at_page: "PG-1", title: "A torn letter", truth_relation: "contested" },
  },
  OBL: {
    recordId: "OBL-1",
    expected: "Mara owes Ren an answer.",
    body: { id: "OBL-1", story_id: "STORY-1", created_at_page: "PG-1", status: "open", obligation_kind: "promise", description: "Mara owes Ren an answer.", owed_by: "STENT-1", owed_to: "STENT-2", urgency: "medium" },
  },
  PG: {
    recordId: "PG-1",
    expected: "PG-1",
    body: { id: "PG-1", story_id: "STORY-1", branch_id: "BR-1", parent_page_id: null, turn_index: 0 },
  },
  RSP: {
    recordId: "RSP-1",
    expected: "Clarify hidden-state evidence",
    body: { id: "RSP-1", story_id: "STORY-1", created_at_page: "PG-1", title: "Clarify hidden-state evidence", status: "open", holder: "STENT-1", severity: "medium" },
  },
  SAU: {
    recordId: "SAU-1",
    expected: "Branch audit",
    body: { id: "SAU-1", story_id: "STORY-1", created_at_page: "PG-1", title: "Branch audit", status: "complete", verdict: "pass" },
  },
  SE: {
    recordId: "SE-1",
    expected: "npc_action",
    body: { id: "SE-1", story_id: "STORY-1", created_at_page: "PG-1", event_kind: "npc_action", actor: "STENT-1", targets: ["STENT-2"], outcome_route: "accept", pov_visibility: "perceived_directly" },
  },
  SF: {
    recordId: "SF-1",
    expected: "The cellar door is unlocked.",
    body: { id: "SF-1", story_id: "STORY-1", created_at_page: "PG-1", claim: "The cellar door is unlocked.", authority: "branch_local" },
  },
  SLB: {
    recordId: "SLB-1",
    expected: "Door pressure move",
    body: { id: "SLB-1", story_id: "STORY-1", created_at_page: "PG-1", title: "Door pressure move", move_family: "investigation", scope_visibility: "branch_scoped" },
  },
  SLT: {
    recordId: "SLT-1",
    expected: "Investigate locked room",
    body: { id: "SLT-1", story_id: "STORY-1", created_at_page: "PG-1", title: "Investigate locked room", author_scope: { visibility: "branch_scoped" }, saliency: { urgency: "medium" } },
  },
  SP: {
    recordId: "SP-1",
    expected: "Promote cellar fact",
    body: { id: "SP-1", story_id: "STORY-1", created_at_page: "PG-1", title: "Promote cellar fact", status: "draft", target_record: "SF-1" },
  },
  SREL: {
    recordId: "SREL-1",
    expected: "Mara distrusts Ren.",
    body: { id: "SREL-1", story_id: "STORY-1", created_at_page: "PG-1", axis: "trust", participants: ["STENT-1", "STENT-2"], direction: "one_way", value: -1, valence: "negative", description: "Mara distrusts Ren." },
  },
  STCHAR: {
    recordId: "STCHAR-1",
    expected: "Mara voice authority",
    body: { id: "STCHAR-1", story_id: "STORY-1", created_at_page: "PG-1", title: "Mara voice authority", status: "active" },
  },
  STEMO: {
    recordId: "STEMO-1",
    expected: "fear",
    body: { id: "STEMO-1", story_id: "STORY-1", created_at_page: "PG-1", holder: "STENT-1", emotion: "fear", intensity: "high", status: "active", target: "STENT-2" },
  },
  STENT: {
    recordId: "STENT-1",
    expected: "Mara",
    body: { id: "STENT-1", story_id: "STORY-1", created_at_page: "PG-1", display_name: "Mara", bound_stchar_id: "STCHAR-1", role_in_story: "primary_actor" },
  },
  STINT: {
    recordId: "STINT-1",
    expected: "Find the hidden key.",
    body: { id: "STINT-1", story_id: "STORY-1", created_at_page: "PG-1", holder: "STENT-1", intent: "Find the hidden key.", urgency: "high" },
  },
  STLOC: {
    recordId: "STLOC-1",
    expected: "Cellar",
    body: { id: "STLOC-1", story_id: "STORY-1", created_at_page: "PG-1", label: "Cellar", description: "A narrow room under the inn." },
  },
  STOBJ: {
    recordId: "STOBJ-1",
    expected: "Iron key",
    body: { id: "STOBJ-1", story_id: "STORY-1", created_at_page: "PG-1", label: "Iron key", description: "A cold key.", owner: "STENT-1", current_location: "STLOC-1" },
  },
  STPLAN: {
    recordId: "STPLAN-1",
    expected: "Open the side gate.",
    body: { id: "STPLAN-1", story_id: "STORY-1", created_at_page: "PG-1", root_intention: "STINT-1", objective: "Open the side gate.", plan_status: "active" },
  },
  STQ: {
    recordId: "STQ-1",
    expected: "Who locked the cellar?",
    body: { id: "STQ-1", story_id: "STORY-1", created_at_page: "PG-1", question_kind: "dramatic_question", question_or_setup: "Who locked the cellar?", salience: "high", audience_visibility: "explicit", status: "open" },
  },
  STSEC: {
    recordId: "STSEC-1",
    expected: "Ren hid the key.",
    body: { id: "STSEC-1", story_id: "STORY-1", created_at_page: "PG-1", secret_kind: "motive", secret_claim: "Ren hid the key.", holders: ["STENT-2"], salience: "medium", status: "unrevealed" },
  },
  STSTAT: {
    recordId: "STSTAT-1",
    expected: "alive",
    body: { id: "STSTAT-1", story_id: "STORY-1", created_at_page: "PG-1", entity: "STENT-1", life: "alive", agency: "free", location: "STLOC-1" },
  },
  THR: {
    recordId: "THR-1",
    expected: "Cellar mystery",
    body: { id: "THR-1", story_id: "STORY-1", created_at_page: "PG-1", status: "active", title: "Cellar mystery", summary: "Someone hid the key.", urgency: "medium" },
  },
};

test("recordCardClasses covers every SPEC-87 story-bundle record class", () => {
  assert.deepEqual(recordCardClasses(), Object.keys(REPRESENTATIVE_RECORDS).sort((left, right) => left.localeCompare(right, undefined, { numeric: true })));
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
    assert.equal(card.rawAvailable, true);
    assert.equal(card.sourcePath, `/tmp/${fixture.recordId}.yaml`);
    assert.equal(card.contentHash, "hash");
  });
}

test("buildRecordCard computes chips, participants, links, and provenance", () => {
  const card = buildRecordCard(
    "OBL-1",
    REPRESENTATIVE_RECORDS.OBL!.body,
    ["STENT-1"],
    { provenance: { creatingEventId: "SE-1", modifyingEventIds: ["SE-2"], evidenceRecordIds: ["BEL-1"] } }
  );

  assert.deepEqual(card.chips, [
    { label: "status", value: "open" },
    { label: "urgency", value: "medium" },
  ]);
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
