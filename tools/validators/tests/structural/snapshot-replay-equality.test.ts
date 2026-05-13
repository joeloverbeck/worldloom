import assert from "node:assert/strict";
import test from "node:test";

import { snapshotReplayEquality } from "../../src/structural/snapshot-replay-equality.js";
import { context, record } from "./helpers.js";

const parentSnapshot = {
  canon_revision: "CH-0001",
  objective_facts: ["SF-0001"],
  apparent_facts: [],
  disputed_facts: [],
  reader_known_facts: [],
  belief_state_by_actor: {},
  rumor_state: [],
  obligations_open: ["OBL-0001"],
  obligations_paid_off: [],
  obligations_complicated: [],
  obligations_abandoned: [],
  consequences_pending: [],
  consequences_addressed: [],
  threads_active: ["THR-0001"],
  relationships_current: ["SREL-0001"],
  intentions_current: ["STINT-0001"],
  cast_present: ["STENT-0001"],
  current_location: "STLOC-0001",
  accessible_locations: ["STLOC-0001"],
  objects_in_scope: [],
  inventory_by_entity: {},
  entity_status: {},
  applied_effect_variant: null
};

const nextSnapshot = {
  ...parentSnapshot,
  objective_facts: ["SF-0001", "SF-0002"],
  obligations_open: ["OBL-0002"],
  threads_active: ["THR-0002"],
  relationships_current: ["SREL-0002"],
  intentions_current: ["STINT-0002"],
  applied_effect_variant: "useful-lie"
};

test("snapshot_replay_equality passes for a clean page-cycle envelope", async () => {
  const verdicts = await snapshotReplayEquality.run(undefined, context(recordsFor(nextSnapshot, "hash-next"), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("snapshot_replay_equality compares active_records snapshots with BEL entries", async () => {
  const activeRecordsSnapshot = {
    active_records: {
      BEL: ["BEL-0001"]
    }
  };
  const verdicts = await snapshotReplayEquality.run(undefined, context([
    record("page_record", "test-story:PG-0001", "stories/test-story/_source/pages/PG-0001.yaml", {
      id: "PG-0001",
      story_id: "STORY-001",
      state_snapshot: activeRecordsSnapshot,
      state_hash: "hash-parent"
    }),
    record("story_event_record", "test-story:SE-0002", "stories/test-story/_source/events/SE-0002.yaml", {
      id: "SE-0002",
      story_id: "STORY-001",
      event_kind: "selected_choice",
      ops: [],
      state_hash_after: "hash-next"
    }),
    record("belief_record", "test-story:BEL-0001", "stories/test-story/_source/beliefs/BEL-0001.yaml", {
      id: "BEL-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001"
    }),
    record("page_record", "test-story:PG-0002", "stories/test-story/_source/pages/PG-0002.yaml", {
      id: "PG-0002",
      story_id: "STORY-001",
      parent_page_id: "PG-0001",
      applied_event_ops: ["SE-0002"],
      state_snapshot: activeRecordsSnapshot,
      state_hash: "hash-next"
    })
  ], {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("snapshot_replay_equality emits field-level drift details", async () => {
  const drifted = { ...nextSnapshot, obligations_open: ["OBL-0001"] };
  const verdicts = await snapshotReplayEquality.run(undefined, context(recordsFor(drifted, "hash-next"), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const drift = verdicts.find((verdict) => verdict.code === "snapshot_replay_equality.snapshot_drift");
  assert.ok(drift);
  assert.deepEqual((drift.detail as { drifts: unknown[] }).drifts, [
    { field: "obligations_open", expected: ["OBL-0002"], got: ["OBL-0001"] }
  ]);
});

test("snapshot_replay_equality ignores only workflow-stamped state_snapshot fields", async () => {
  const workflowStamped = {
    ...nextSnapshot,
    applied_effect_variant: "different-workflow-stamp"
  };

  const verdicts = await snapshotReplayEquality.run(undefined, context(recordsFor(workflowStamped, "hash-next"), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("snapshot_replay_equality verifies the last event hash", async () => {
  const verdicts = await snapshotReplayEquality.run(undefined, context(recordsFor(nextSnapshot, "wrong-hash"), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.ok(verdicts.some((verdict) => verdict.code === "snapshot_replay_equality.state_hash_mismatch"));
});

test("snapshot_replay_equality resolves parent and event ids within the page story scope", async () => {
  const collidingParent = {
    ...record("page_record", "other-story:PG-0001", "stories/other-story/_source/pages/PG-0001.yaml", {
      id: "PG-0001",
      story_id: "STORY-001",
      state_snapshot: { objective_facts: ["SF-9999"] },
      state_hash: "other-story-hash"
    }),
    story_slug: "other-story"
  };
  const verdicts = await snapshotReplayEquality.run(undefined, context([
    ...recordsFor(nextSnapshot, "hash-next"),
    collidingParent
  ], {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("snapshot_replay_equality skips envelopes without PG creates", () => {
  assert.equal(snapshotReplayEquality.applies_to(context([], { run_mode: "pre-apply", patch_plan: { ...patchPlan(), patches: [] } })), false);
});

function recordsFor(pageSnapshot: Record<string, unknown>, pageHash: string) {
  return [
    record("page_record", "test-story:PG-0001", "stories/test-story/_source/pages/PG-0001.yaml", {
      id: "PG-0001",
      story_id: "STORY-001",
      state_snapshot: parentSnapshot,
      state_hash: "hash-parent"
    }),
    record("story_fact_record", "test-story:SF-0002", "stories/test-story/_source/facts/SF-0002.yaml", {
      id: "SF-0002",
      story_id: "STORY-001",
      epistemic_class: "objective"
    }),
    record("story_event_record", "test-story:SE-0002", "stories/test-story/_source/events/SE-0002.yaml", {
      id: "SE-0002",
      story_id: "STORY-001",
      event_kind: "selected_choice",
      ops: [
        { op_id: "OP-0001", op_type: "fact_create", input_records: [], output_records: ["SF-0002"], deterministic_payload: {} },
        { op_id: "OP-0002", op_type: "obligation_supersede", input_records: ["OBL-0001"], output_records: ["OBL-0002"], deterministic_payload: {} },
        { op_id: "OP-0003", op_type: "thread_supersede", input_records: ["THR-0001"], output_records: ["THR-0002"], deterministic_payload: {} },
        { op_id: "OP-0004", op_type: "relationship_supersede", input_records: ["SREL-0001"], output_records: ["SREL-0002"], deterministic_payload: {} },
        { op_id: "OP-0005", op_type: "intention_refresh", input_records: ["STINT-0001"], output_records: ["STINT-0002"], deterministic_payload: {} }
      ],
      state_hash_before: "hash-parent",
      state_hash_after: "hash-next"
    }),
    record("page_record", "test-story:PG-0002", "stories/test-story/_source/pages/PG-0002.yaml", {
      id: "PG-0002",
      story_id: "STORY-001",
      parent_page_id: "PG-0001",
      storylet_realized: "SLT-0001",
      applied_event_ops: ["SE-0002"],
      state_snapshot: pageSnapshot,
      state_hash: pageHash
    }),
    record("storylet_record", "test-story:SLT-0001", "stories/test-story/_source/storylets/SLT-0001.yaml", {
      id: "SLT-0001",
      story_id: "STORY-001",
      effect_model: {
        variants: [
          {
            id: "useful-lie",
            required_effects: [
              { type: "fact_create" },
              { type: "obligation_status_change" },
              { type: "thread_pressure_delta" },
              { type: "relationship_axis_shift" }
            ]
          }
        ]
      }
    })
  ];
}

function patchPlan() {
  return {
    plan_id: "plan-snapshot-replay",
    target_world: "test",
    approval_token: "placeholder",
    verdict: "page_cycle_accept",
    originating_skill: "branching-story-page-cycle",
    expected_id_allocations: { pg_ids: ["PG-0002"] },
    patches: [
      {
        op: "create_pg_record" as const,
        target_world: "test",
        payload: {
          story_slug: "test-story",
          record: { id: "PG-0002", story_id: "STORY-001" }
        }
      }
    ]
  };
}
