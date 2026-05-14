import assert from "node:assert/strict";
import test from "node:test";

import { replayStateSnapshot } from "../../src/_helpers/state-snapshot-replay.js";

const parentSnapshot = {
  canon_revision: "CH-0001",
  objective_facts: ["SF-0001"],
  apparent_facts: ["SF-0002"],
  disputed_facts: ["SF-0003"],
  reader_known_facts: ["SF-0001"],
  belief_state_by_actor: { "STENT-0001": ["SF-0004"] },
  rumor_state: ["SF-0005"],
  obligations_open: ["OBL-0001"],
  obligations_paid_off: [],
  obligations_complicated: ["OBL-0002"],
  obligations_abandoned: [],
  consequences_pending: ["CNSQ-0001"],
  consequences_addressed: [],
  threads_active: ["THR-0001"],
  relationships_current: ["SREL-0001"],
  intentions_current: ["STINT-0001"],
  cast_present: ["STENT-0001"],
  current_location: "STLOC-0001",
  accessible_locations: ["STLOC-0001"],
  objects_in_scope: ["STOBJ-0001"],
  inventory_by_entity: { "STENT-0001": ["STOBJ-0001"] },
  entity_status: { "STENT-0001": { alive: true, conscious: true, present: true } }
};

test("state snapshot replay applies fact_create and fact_invalidate facets", () => {
  const records = new Map<string, Record<string, unknown>>([
    ["SF-0006", { id: "SF-0006", epistemic_class: "belief", known_by: ["STENT-0002"], visible_to_reader: true }],
    ["SF-0007", { id: "SF-0007", epistemic_class: "objective" }]
  ]);

  const result = replayStateSnapshot(parentSnapshot, [
    { op_type: "fact_create", input_records: [], output_records: ["SF-0006"], deterministic_payload: {} },
    { op_type: "fact_invalidate", input_records: ["SF-0001"], output_records: ["SF-0007"], deterministic_payload: {} }
  ], records);

  assert.deepEqual(result.objective_facts, ["SF-0007"]);
  assert.deepEqual(result.reader_known_facts, ["SF-0006"]);
  assert.deepEqual(result.belief_state_by_actor, {
    "STENT-0001": ["SF-0004"],
    "STENT-0002": ["SF-0006"]
  });
});

test("state snapshot replay applies obligation transitions", () => {
  const result = replayStateSnapshot(parentSnapshot, [
    { op_type: "obligation_open", input_records: [], output_records: ["OBL-0003"], deterministic_payload: {} },
    { op_type: "obligation_pay_off", input_records: ["OBL-0001"], output_records: ["OBL-0004"], deterministic_payload: {} },
    { op_type: "obligation_complicate", input_records: ["OBL-0003"], output_records: ["OBL-0005"], deterministic_payload: {} },
    { op_type: "obligation_transfer", input_records: ["OBL-0002"], output_records: ["OBL-0006"], deterministic_payload: {} },
    { op_type: "obligation_abandon", input_records: ["OBL-0006"], output_records: ["OBL-0007"], deterministic_payload: {} },
    { op_type: "obligation_supersede", input_records: ["OBL-0005"], output_records: ["OBL-0008"], deterministic_payload: {} }
  ], new Map());

  assert.deepEqual(result.obligations_open, []);
  assert.deepEqual(result.obligations_paid_off, ["OBL-0004"]);
  assert.deepEqual(result.obligations_complicated, ["OBL-0008"]);
  assert.deepEqual(result.obligations_abandoned, ["OBL-0007"]);
});

test("state snapshot replay applies consequence, thread, relationship, and intention transitions", () => {
  const result = replayStateSnapshot(parentSnapshot, [
    { op_type: "consequence_open", input_records: [], output_records: ["CNSQ-0002"], deterministic_payload: {} },
    { op_type: "consequence_address", input_records: ["CNSQ-0001"], output_records: ["CNSQ-0003"], deterministic_payload: {} },
    { op_type: "thread_supersede", input_records: ["THR-0001"], output_records: ["THR-0002"], deterministic_payload: {} },
    { op_type: "relationship_supersede", input_records: ["SREL-0001"], output_records: ["SREL-0002"], deterministic_payload: {} },
    { op_type: "intention_refresh", input_records: ["STINT-0001"], output_records: ["STINT-0002"], deterministic_payload: {} }
  ], new Map());

  assert.deepEqual(result.consequences_pending, ["CNSQ-0002"]);
  assert.deepEqual(result.consequences_addressed, ["CNSQ-0003"]);
  assert.deepEqual(result.threads_active, ["THR-0002"]);
  assert.deepEqual(result.relationships_current, ["SREL-0002"]);
  assert.deepEqual(result.intentions_current, ["STINT-0002"]);
});

test("state snapshot replay applies cast, location, inventory, and canon sync operations", () => {
  const result = replayStateSnapshot(parentSnapshot, [
    {
      op_type: "cast_change",
      input_records: [],
      output_records: [],
      deterministic_payload: {
        add_cast: ["STENT-0002"],
        entity_status: { "STENT-0002": { alive: true, conscious: true, present: true } }
      }
    },
    {
      op_type: "location_change",
      input_records: [],
      output_records: [],
      deterministic_payload: { to: "STLOC-0002", accessible_locations: ["STLOC-0001", "STLOC-0002"] }
    },
    {
      op_type: "inventory_change",
      input_records: ["STOBJ-0001"],
      output_records: ["STOBJ-0002"],
      deterministic_payload: { entity_id: "STENT-0001", add_objects: ["STOBJ-0003"] }
    },
    { op_type: "canon_sync", input_records: [], output_records: [], deterministic_payload: { canon_revision: "CH-0002" } }
  ], new Map());

  assert.deepEqual(result.cast_present, ["STENT-0001", "STENT-0002"]);
  assert.equal(result.current_location, "STLOC-0002");
  assert.deepEqual(result.accessible_locations, ["STLOC-0001", "STLOC-0002"]);
  assert.deepEqual(result.inventory_by_entity, { "STENT-0001": ["STOBJ-0002", "STOBJ-0003"] });
  assert.deepEqual(result.objects_in_scope, ["STOBJ-0001", "STOBJ-0003", "STOBJ-0002"]);
  assert.equal(result.canon_revision, "CH-0002");
});

test("state snapshot replay applies canon sync change_id fallback", () => {
  const result = replayStateSnapshot(parentSnapshot, [
    { op_type: "canon_sync", input_records: [], output_records: [], deterministic_payload: { change_id: "CH-0003" } }
  ], new Map());

  assert.equal(result.canon_revision, "CH-0003");
});
