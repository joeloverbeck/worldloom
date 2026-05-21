import assert from "node:assert/strict";
import test from "node:test";

import {
  OPTIONAL_ACTIVE_RECORDS_CLASSES,
  projectUnresolvedMysteryClaims,
  replayStateSnapshot,
  replayUnresolvedMysteryClaims
} from "../../src/_helpers/state-snapshot-replay.js";

const parentSnapshot = {
  canon_revision: "CH-1",
  objective_facts: ["SF-1"],
  apparent_facts: ["SF-2"],
  disputed_facts: ["SF-3"],
  reader_known_facts: ["SF-1"],
  belief_state_by_actor: { "STENT-1": ["SF-4"] },
  rumor_state: ["SF-5"],
  obligations_open: ["OBL-1"],
  obligations_paid_off: [],
  obligations_complicated: ["OBL-2"],
  obligations_abandoned: [],
  consequences_pending: ["CNSQ-1"],
  consequences_addressed: [],
  threads_active: ["THR-1"],
  relationships_current: ["SREL-1"],
  intentions_current: ["STINT-1"],
  cast_present: ["STENT-1"],
  current_location: "STLOC-1",
  accessible_locations: ["STLOC-1"],
  objects_in_scope: ["STOBJ-1"],
  inventory_by_entity: { "STENT-1": ["STOBJ-1"] },
  entity_status: { "STENT-1": { alive: true, conscious: true, present: true } }
};

test("state snapshot replay applies fact_create and fact_invalidate facets", () => {
  const records = new Map<string, Record<string, unknown>>([
    ["SF-6", { id: "SF-6", epistemic_class: "belief", known_by: ["STENT-2"], visible_to_reader: true }],
    ["SF-7", { id: "SF-7", epistemic_class: "objective" }]
  ]);

  const result = replayStateSnapshot(parentSnapshot, [
    { op_type: "fact_create", input_records: [], output_records: ["SF-6"], deterministic_payload: {} },
    { op_type: "fact_invalidate", input_records: ["SF-1"], output_records: ["SF-7"], deterministic_payload: {} }
  ], records);

  assert.deepEqual(result.objective_facts, ["SF-7"]);
  assert.deepEqual(result.reader_known_facts, ["SF-6"]);
  assert.deepEqual(result.belief_state_by_actor, {
    "STENT-1": ["SF-4"],
    "STENT-2": ["SF-6"]
  });
});

test("state snapshot replay applies obligation transitions", () => {
  const result = replayStateSnapshot(parentSnapshot, [
    { op_type: "obligation_open", input_records: [], output_records: ["OBL-3"], deterministic_payload: {} },
    { op_type: "obligation_pay_off", input_records: ["OBL-1"], output_records: ["OBL-4"], deterministic_payload: {} },
    { op_type: "obligation_complicate", input_records: ["OBL-3"], output_records: ["OBL-5"], deterministic_payload: {} },
    { op_type: "obligation_transfer", input_records: ["OBL-2"], output_records: ["OBL-6"], deterministic_payload: {} },
    { op_type: "obligation_abandon", input_records: ["OBL-6"], output_records: ["OBL-7"], deterministic_payload: {} },
    { op_type: "obligation_supersede", input_records: ["OBL-5"], output_records: ["OBL-8"], deterministic_payload: {} }
  ], new Map());

  assert.deepEqual(result.obligations_open, []);
  assert.deepEqual(result.obligations_paid_off, ["OBL-4"]);
  assert.deepEqual(result.obligations_complicated, ["OBL-8"]);
  assert.deepEqual(result.obligations_abandoned, ["OBL-7"]);
});

test("state snapshot replay applies consequence, thread, relationship, and intention transitions", () => {
  const result = replayStateSnapshot(parentSnapshot, [
    { op_type: "consequence_open", input_records: [], output_records: ["CNSQ-2"], deterministic_payload: {} },
    { op_type: "consequence_address", input_records: ["CNSQ-1"], output_records: ["CNSQ-3"], deterministic_payload: {} },
    { op_type: "thread_supersede", input_records: ["THR-1"], output_records: ["THR-2"], deterministic_payload: {} },
    { op_type: "relationship_supersede", input_records: ["SREL-1"], output_records: ["SREL-2"], deterministic_payload: {} },
    { op_type: "intention_refresh", input_records: ["STINT-1"], output_records: ["STINT-2"], deterministic_payload: {} }
  ], new Map());

  assert.deepEqual(result.consequences_pending, ["CNSQ-2"]);
  assert.deepEqual(result.consequences_addressed, ["CNSQ-3"]);
  assert.deepEqual(result.threads_active, ["THR-2"]);
  assert.deepEqual(result.relationships_current, ["SREL-2"]);
  assert.deepEqual(result.intentions_current, ["STINT-2"]);
});

test("state snapshot replay applies cast, location, inventory, and canon sync operations", () => {
  const result = replayStateSnapshot(parentSnapshot, [
    {
      op_type: "cast_change",
      input_records: [],
      output_records: [],
      deterministic_payload: {
        add_cast: ["STENT-2"],
        entity_status: { "STENT-2": { alive: true, conscious: true, present: true } }
      }
    },
    {
      op_type: "location_change",
      input_records: [],
      output_records: [],
      deterministic_payload: { to: "STLOC-2", accessible_locations: ["STLOC-1", "STLOC-2"] }
    },
    {
      op_type: "inventory_change",
      input_records: ["STOBJ-1"],
      output_records: ["STOBJ-2"],
      deterministic_payload: { entity_id: "STENT-1", add_objects: ["STOBJ-3"] }
    },
    { op_type: "canon_sync", input_records: [], output_records: [], deterministic_payload: { canon_revision: "CH-2" } }
  ], new Map());

  assert.deepEqual(result.cast_present, ["STENT-1", "STENT-2"]);
  assert.equal(result.current_location, "STLOC-2");
  assert.deepEqual(result.accessible_locations, ["STLOC-1", "STLOC-2"]);
  assert.deepEqual(result.inventory_by_entity, { "STENT-1": ["STOBJ-2", "STOBJ-3"] });
  assert.deepEqual(result.objects_in_scope, ["STOBJ-1", "STOBJ-3", "STOBJ-2"]);
  assert.equal(result.canon_revision, "CH-2");
});

test("state snapshot replay applies canon sync change_id fallback", () => {
  const result = replayStateSnapshot(parentSnapshot, [
    { op_type: "canon_sync", input_records: [], output_records: [], deterministic_payload: { change_id: "CH-3" } }
  ], new Map());

  assert.equal(result.canon_revision, "CH-3");
});

test("active-record optional class set does not include required STCHAR", () => {
  assert.ok(!(OPTIONAL_ACTIVE_RECORDS_CLASSES as readonly string[]).includes("STCHAR"));
});

test("mystery claim projection defaults omitted evidence_records to an empty list", () => {
  assert.deepEqual(projectUnresolvedMysteryClaims([
    { mystery_id: "M-1", authority: "apparent", status: "preserved" }
  ]), [
    { mystery_id: "M-1", authority: "apparent", status: "preserved", evidence_records: [] }
  ]);
});

test("mystery claim replay preserves inherited evidence and accepts event additions", () => {
  const result = replayUnresolvedMysteryClaims(
    [{ mystery_id: "M-1", authority: "apparent", status: "preserved", evidence_records: ["SF-1"] }],
    [{ mystery_id: "M-1", authority: "apparent", status: "clue_added", evidence_records: ["SF-1", "SE-2"] }],
    ["SE-2"]
  );

  assert.deepEqual(result.drifts, []);
});

test("mystery claim replay rejects status changes without event evidence", () => {
  const result = replayUnresolvedMysteryClaims(
    [{ mystery_id: "M-1", authority: "apparent", status: "preserved", evidence_records: ["SF-1"] }],
    [{ mystery_id: "M-1", authority: "apparent", status: "narrowed", evidence_records: ["SF-1"] }],
    ["SE-2"]
  );

  assert.deepEqual(result.drifts, [
    {
      field: "unresolved_mystery_claims.M-1.status",
      expected: { authority: "apparent", status: "preserved" },
      got: { authority: "apparent", status: "narrowed" }
    }
  ]);
});
