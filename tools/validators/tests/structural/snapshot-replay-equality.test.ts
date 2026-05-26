import assert from "node:assert/strict";
import test from "node:test";

import { computePgStateHash } from "@worldloom/world-index/hash/content";

import { replayActiveRecords } from "../../src/_helpers/state-snapshot-replay.js";
import { snapshotReplayEquality } from "../../src/structural/snapshot-replay-equality.js";
import { stateSnapshotIntegrity } from "../../src/structural/state-snapshot-integrity.js";
import { context, record } from "./helpers.js";

const parentSnapshot = {
  canon_revision: "CH-1",
  objective_facts: ["SF-1"],
  apparent_facts: [],
  disputed_facts: [],
  reader_known_facts: [],
  belief_state_by_actor: {},
  rumor_state: [],
  obligations_open: ["OBL-1"],
  obligations_paid_off: [],
  obligations_complicated: [],
  obligations_abandoned: [],
  consequences_pending: [],
  consequences_addressed: [],
  threads_active: ["THR-1"],
  relationships_current: ["SREL-1"],
  intentions_current: ["STINT-1"],
  cast_present: ["STENT-1"],
  current_location: "STLOC-1",
  accessible_locations: ["STLOC-1"],
  objects_in_scope: [],
  inventory_by_entity: {},
  entity_status: {},
  applied_effect_variant: null
};

const nextSnapshot = {
  ...parentSnapshot,
  objective_facts: ["SF-1", "SF-2"],
  obligations_open: ["OBL-2"],
  threads_active: ["THR-2"],
  relationships_current: ["SREL-2"],
  intentions_current: ["STINT-2"],
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
      BEL: ["BEL-1"]
    }
  };
  const verdicts = await snapshotReplayEquality.run(undefined, context([
    record("page_record", "test-story:PG-1", "stories/test-story/_source/pages/PG-1.yaml", {
      id: "PG-1",
      story_id: "STORY-1",
      state_snapshot: activeRecordsSnapshot,
      state_hash: "hash-parent"
    }),
    record("story_event_record", "test-story:SE-2", "stories/test-story/_source/events/SE-2.yaml", {
      id: "SE-2",
      story_id: "STORY-1",
      event_kind: "selected_choice",
      ops: [],
      state_hash_after: "hash-next"
    }),
    record("belief_record", "test-story:BEL-1", "stories/test-story/_source/beliefs/BEL-1.yaml", {
      id: "BEL-1",
      story_id: "STORY-1",
      created_at_page: "PG-1"
    }),
    record("page_record", "test-story:PG-2", "stories/test-story/_source/pages/PG-2.yaml", {
      id: "PG-2",
      story_id: "STORY-1",
      parent_page_id: "PG-1",
      applied_event_ops: ["SE-2"],
      state_snapshot: activeRecordsSnapshot,
      state_hash: "hash-next"
    })
  ], {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("snapshot_replay_equality replays new-schema SE state_delta active_records", async () => {
  const childPage = newSchemaChildPage(newSchemaExpectedActiveRecords());
  const verdicts = await snapshotReplayEquality.run(undefined, context(newSchemaRecords(childPage), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("snapshot_replay_equality and state_snapshot_integrity both accept inactive created CLK outside active_records", async () => {
  const activeRecords = { STCHAR: [], CLK: [] };
  const page: Record<string, unknown> = {
    id: "PG-3",
    story_id: "STORY-1",
    parent_page_id: "PG-2",
    input: {
      choice_id: null,
      manual_action_text: null,
      resolved_event_id: "SE-3"
    },
    state_snapshot: {
      active_records: activeRecords,
      entity_status: {},
      unresolved_mystery_claims: []
    },
    plan: { plan_hash: "1".repeat(64) },
    emitted_choices: [],
    validation_trace: {
      input_legality: "PASS: audit repair event is system-authored."
    }
  };
  const records = [
    record("page_record", "test-story:PG-2", "stories/test-story/_source/pages/PG-2.yaml", {
      id: "PG-2",
      story_id: "STORY-1",
      state_snapshot: {
        active_records: activeRecords,
        unresolved_mystery_claims: []
      }
    }),
    record("story_event_record", "test-story:SE-3", "stories/test-story/_source/events/SE-3.yaml", {
      id: "SE-3",
      story_id: "STORY-1",
      event_kind: "audit_repair",
      state_delta: {
        create: ["CLK-2"],
        supersede: [],
        close: []
      }
    }),
    record("pressure_clock_record", "test-story:CLK-2", "stories/test-story/_source/clocks/CLK-2.yaml", {
      id: "CLK-2",
      story_id: "STORY-1",
      created_at_page: "PG-3",
      status: "resolved",
      resolution_event: "SE-3"
    }),
    record("page_record", "test-story:PG-3", "stories/test-story/_source/pages/PG-3.yaml", page)
  ];
  const ctx = context(records, {
    run_mode: "pre-apply",
    patch_plan: {
      ...patchPlan(),
      expected_id_allocations: { pg_ids: ["PG-3"] },
      patches: [
        {
          op: "create_pg_record" as const,
          target_world: "test",
          payload: {
            story_slug: "test-story",
            record: { id: "PG-3", story_id: "STORY-1" }
          }
        }
      ]
    }
  });

  assert.deepEqual(await snapshotReplayEquality.run(undefined, ctx), []);
  assert.deepEqual(await stateSnapshotIntegrity.run(undefined, ctx), []);
});

test("snapshot_replay_equality accepts maintenance PGs grounded by audit-only SE state_delta", async () => {
  const parentActiveRecords = {
    ...newSchemaParentActiveRecords(),
    SREL: ["SREL-1"],
    STPLAN: ["STPLAN-1"],
    STEMO: ["STEMO-1"]
  };
  const maintenanceActiveRecords = replayActiveRecords(parentActiveRecords, {
    create: ["SREL-2", "STPLAN-2", "STEMO-2"],
    supersede: ["STEMO-1"],
    close: []
  }, new Map());
  const page: Record<string, unknown> = {
    id: "PG-2",
    story_id: "STORY-1",
    parent_page_id: "PG-1",
    input: {
      choice_id: null,
      manual_action_text: null,
      resolved_event_id: "SE-2"
    },
    state_hash_parent: "0".repeat(64),
    state_snapshot: {
      active_records: maintenanceActiveRecords,
      visible_affordances: [],
      entity_status: {},
      unresolved_mystery_claims: [],
      continuation: { has_eligible_commitment_block: true, terminal_status: "open", terminal_rationale: null }
    },
    plan: {
      plan_hash: "1".repeat(64)
    },
    emitted_choices: [],
    validation_trace: {
      input_legality: "PASS: maintenance event is system-authored."
    }
  };

  const verdicts = await snapshotReplayEquality.run(undefined, context([
    record("page_record", "test-story:PG-1", "stories/test-story/_source/pages/PG-1.yaml", {
      id: "PG-1",
      story_id: "STORY-1",
      state_snapshot: {
        active_records: parentActiveRecords,
        unresolved_mystery_claims: []
      },
      state_hash: "0".repeat(64)
    }),
    record("story_event_record", "test-story:SE-2", "stories/test-story/_source/events/SE-2.yaml", {
      id: "SE-2",
      story_id: "STORY-1",
      event_kind: "audit_repair",
      state_delta: {
        create: ["SREL-2", "STPLAN-2", "STEMO-2"],
        supersede: ["STEMO-1"],
        close: []
      }
    }),
    record("page_record", "test-story:PG-2", "stories/test-story/_source/pages/PG-2.yaml", {
      ...page,
      state_hash: computePgStateHash(page)
    })
  ], {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("snapshot_replay_equality normalizes missing optional parent active-record keys", async () => {
  const childPage = newSchemaChildPage({
    ...newSchemaExpectedActiveRecords(),
    DA: [],
    CLK: [],
    STSEC: [],
    STQ: []
  });
  const verdicts = await snapshotReplayEquality.run(undefined, context(newSchemaRecords(childPage), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("snapshot_replay_equality reports missing required STCHAR active-record key", async () => {
  const { STCHAR: _stchar, ...activeRecordsWithoutStchar } = newSchemaExpectedActiveRecords();
  const childPage = newSchemaChildPage(activeRecordsWithoutStchar);
  const verdicts = await snapshotReplayEquality.run(undefined, context(newSchemaRecords(childPage), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const drift = verdicts.find((verdict) => verdict.code === "snapshot_replay_equality.snapshot_drift");
  assert.ok(drift);
  assert.deepEqual((drift.detail as { drifts: unknown[] }).drifts, [
    { field: "active_records.STCHAR", expected: [], got: null }
  ]);
});

test("snapshot_replay_equality ignores audit-only SE records that are not page inputs", async () => {
  const childPage = newSchemaChildPage(newSchemaExpectedActiveRecords());
  const verdicts = await snapshotReplayEquality.run(undefined, context([
    ...newSchemaRecords(childPage),
    record("story_event_record", "test-story:SE-3", "stories/test-story/_source/events/SE-3.yaml", {
      id: "SE-3",
      story_id: "STORY-1",
      event_kind: "prose_attach",
      state_delta: {
        create: [],
        supersede: [],
        close: []
      }
    })
  ], {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("snapshot_replay_equality derives entity_status from active STSTAT records", async () => {
  const childPage = newSchemaChildPage(newSchemaExpectedActiveRecords(), {
    "STENT-1": { life: "dead", agency: "dead", location: "STLOC-1" }
  });
  const verdicts = await snapshotReplayEquality.run(undefined, context(newSchemaRecords(childPage), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("snapshot_replay_equality reports entity_status drift from active STSTAT records", async () => {
  const childPage = newSchemaChildPage(newSchemaExpectedActiveRecords(), {
    "STENT-1": { life: "alive", agency: "free", location: "STLOC-1" }
  });
  const verdicts = await snapshotReplayEquality.run(undefined, context(newSchemaRecords(childPage), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const drift = verdicts.find((verdict) => verdict.code === "snapshot_replay_equality.snapshot_drift");
  assert.ok(drift);
  assert.deepEqual((drift.detail as { drifts: unknown[] }).drifts, [
    {
      field: "entity_status",
      expected: { "STENT-1": { life: "dead", agency: "dead", location: "STLOC-1" } },
      got: { "STENT-1": { life: "alive", agency: "free", location: "STLOC-1" } }
    }
  ]);
});

test("snapshot_replay_equality reports new-schema active_records class drift", async () => {
  const childPage = newSchemaChildPage({
    ...newSchemaExpectedActiveRecords(),
    OBL: ["OBL-1"]
  });
  const verdicts = await snapshotReplayEquality.run(undefined, context(newSchemaRecords(childPage), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const drift = verdicts.find((verdict) => verdict.code === "snapshot_replay_equality.snapshot_drift");
  assert.ok(drift);
  assert.deepEqual((drift.detail as { drifts: unknown[] }).drifts, [
    { field: "active_records.OBL", expected: ["OBL-1", "OBL-2"], got: ["OBL-1"] }
  ]);
});

test("snapshot_replay_equality replays CLK active records", async () => {
  const parentSnapshot = newSchemaParentActiveRecords();
  const pageSnapshot = replayActiveRecords(parentSnapshot, {
    create: ["CLK-1"],
    supersede: [],
    close: []
  }, new Map([["CLK-1", { id: "CLK-1", status: "active" }]]));

  assert.deepEqual(pageSnapshot.CLK, ["CLK-1"]);
});

test("snapshot_replay_equality replays STSEC active records", async () => {
  const parentSnapshot = newSchemaParentActiveRecords();
  const pageSnapshot = replayActiveRecords(parentSnapshot, {
    create: ["STSEC-1"],
    supersede: [],
    close: []
  }, new Map([["STSEC-1", { id: "STSEC-1", status: "hidden" }]]));

  assert.deepEqual(pageSnapshot.STSEC, ["STSEC-1"]);
});

test("snapshot_replay_equality replays STQ active records", async () => {
  const parentSnapshot = newSchemaParentActiveRecords();
  const pageSnapshot = replayActiveRecords(parentSnapshot, {
    create: ["STQ-1"],
    supersede: [],
    close: []
  }, new Map([["STQ-1", { id: "STQ-1", status: "open" }]]));

  assert.deepEqual(pageSnapshot.STQ, ["STQ-1"]);
});

test("snapshot_replay_equality replays STPLAN and STEMO active records", async () => {
  const parentSnapshot = newSchemaParentActiveRecords();
  const pageSnapshot = replayActiveRecords(parentSnapshot, {
    create: ["STPLAN-1", "STEMO-1"],
    supersede: [],
    close: []
  }, new Map([
    ["STPLAN-1", { id: "STPLAN-1", plan_status: "active" }],
    ["STEMO-1", { id: "STEMO-1", status: "active" }]
  ]));

  assert.deepEqual(pageSnapshot.STPLAN, ["STPLAN-1"]);
  assert.deepEqual(pageSnapshot.STEMO, ["STEMO-1"]);
});

test("snapshot_replay_equality replays STCHAR active records", async () => {
  const parentSnapshot = newSchemaParentActiveRecords();
  const pageSnapshot = replayActiveRecords(parentSnapshot, {
    create: ["STCHAR-1"],
    supersede: [],
    close: []
  }, new Map());

  assert.deepEqual(pageSnapshot.STCHAR, ["STCHAR-1"]);
});

test("snapshot_replay_equality reports new-schema canonical state_hash mismatches", async () => {
  const childPage = {
    ...newSchemaChildPage(newSchemaExpectedActiveRecords()),
    state_hash: "f".repeat(64)
  };
  const verdicts = await snapshotReplayEquality.run(undefined, context(newSchemaRecords(childPage), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.ok(verdicts.some((verdict) => verdict.code === "snapshot_replay_equality.state_hash_mismatch"));
});

test("snapshot_replay_equality accepts accumulated mystery evidence from the resolved event", async () => {
  const childPage = newSchemaChildPage(newSchemaExpectedActiveRecords(), undefined, [
    {
      mystery_id: "M-1",
      authority: "apparent",
      status: "clue_added",
      evidence_records: ["SF-1", "SF-2"]
    }
  ]);
  const verdicts = await snapshotReplayEquality.run(undefined, context(newSchemaRecords(childPage, [
    {
      mystery_id: "M-1",
      authority: "apparent",
      status: "preserved",
      evidence_records: ["SF-1"]
    }
  ]), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("snapshot_replay_equality reports mystery evidence drift", async () => {
  const childPage = newSchemaChildPage(newSchemaExpectedActiveRecords(), undefined, [
    {
      mystery_id: "M-1",
      authority: "apparent",
      status: "clue_added",
      evidence_records: ["SF-1", "SF-3"]
    }
  ]);
  const verdicts = await snapshotReplayEquality.run(undefined, context(newSchemaRecords(childPage, [
    {
      mystery_id: "M-1",
      authority: "apparent",
      status: "preserved",
      evidence_records: ["SF-1"]
    }
  ]), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const drift = verdicts.find((verdict) => verdict.code === "snapshot_replay_equality.snapshot_drift");
  assert.ok(drift);
  assert.deepEqual((drift.detail as { drifts: unknown[] }).drifts, [
    {
      field: "unresolved_mystery_claims.M-1.status",
      expected: { authority: "apparent", status: "preserved" },
      got: { authority: "apparent", status: "clue_added" }
    },
    {
      field: "unresolved_mystery_claims.M-1.evidence_records",
      expected: {
        inherited: ["SF-1"],
        event_evidence_records: ["SE-2", "SF-2"]
      },
      got: ["SF-1", "SF-3"]
    }
  ]);
});

test("snapshot_replay_equality emits field-level drift details", async () => {
  const drifted = { ...nextSnapshot, obligations_open: ["OBL-1"] };
  const verdicts = await snapshotReplayEquality.run(undefined, context(recordsFor(drifted, "hash-next"), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const drift = verdicts.find((verdict) => verdict.code === "snapshot_replay_equality.snapshot_drift");
  assert.ok(drift);
  assert.deepEqual((drift.detail as { drifts: unknown[] }).drifts, [
    { field: "obligations_open", expected: ["OBL-2"], got: ["OBL-1"] }
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
    ...record("page_record", "other-story:PG-1", "stories/other-story/_source/pages/PG-1.yaml", {
      id: "PG-1",
      story_id: "STORY-1",
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
    record("page_record", "test-story:PG-1", "stories/test-story/_source/pages/PG-1.yaml", {
      id: "PG-1",
      story_id: "STORY-1",
      state_snapshot: parentSnapshot,
      state_hash: "hash-parent"
    }),
    record("story_fact_record", "test-story:SF-2", "stories/test-story/_source/facts/SF-2.yaml", {
      id: "SF-2",
      story_id: "STORY-1",
      epistemic_class: "objective"
    }),
    record("story_event_record", "test-story:SE-2", "stories/test-story/_source/events/SE-2.yaml", {
      id: "SE-2",
      story_id: "STORY-1",
      event_kind: "selected_choice",
      ops: [
        { op_id: "OP-0001", op_type: "fact_create", input_records: [], output_records: ["SF-2"], deterministic_payload: {} },
        { op_id: "OP-0002", op_type: "obligation_supersede", input_records: ["OBL-1"], output_records: ["OBL-2"], deterministic_payload: {} },
        { op_id: "OP-0003", op_type: "thread_supersede", input_records: ["THR-1"], output_records: ["THR-2"], deterministic_payload: {} },
        { op_id: "OP-0004", op_type: "relationship_supersede", input_records: ["SREL-1"], output_records: ["SREL-2"], deterministic_payload: {} },
        { op_id: "OP-0005", op_type: "intention_refresh", input_records: ["STINT-1"], output_records: ["STINT-2"], deterministic_payload: {} }
      ],
      state_hash_before: "hash-parent",
      state_hash_after: "hash-next"
    }),
    record("page_record", "test-story:PG-2", "stories/test-story/_source/pages/PG-2.yaml", {
      id: "PG-2",
      story_id: "STORY-1",
      parent_page_id: "PG-1",
      applied_event_ops: ["SE-2"],
      state_snapshot: pageSnapshot,
      state_hash: pageHash
    }),
    record("storylet_record", "test-story:SLT-1", "stories/test-story/_source/storylets/SLT-1.yaml", {
      id: "SLT-1",
      story_id: "STORY-1",
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
      },
      grounding: {
        compatible_turn_drivers: ["npc_action"],
        reason_to_exist: "Supports snapshot replay effect-model comparison."
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
    expected_id_allocations: { pg_ids: ["PG-2"] },
    patches: [
      {
        op: "create_pg_record" as const,
        target_world: "test",
        payload: {
          story_slug: "test-story",
          record: { id: "PG-2", story_id: "STORY-1" }
        }
      }
    ]
  };
}

function newSchemaRecords(
  childPage: Record<string, unknown>,
  parentMysteryClaims: readonly Record<string, unknown>[] = []
) {
  return [
    record("page_record", "test-story:PG-1", "stories/test-story/_source/pages/PG-1.yaml", {
      id: "PG-1",
      story_id: "STORY-1",
      state_snapshot: {
        active_records: newSchemaParentActiveRecords(),
        unresolved_mystery_claims: parentMysteryClaims
      },
      state_hash: "0".repeat(64)
    }),
    record("story_event_record", "test-story:SE-2", "stories/test-story/_source/events/SE-2.yaml", {
      id: "SE-2",
      story_id: "STORY-1",
      state_delta: {
        create: ["SF-2", "OBL-2", "CHC-2", "STSTAT-2"],
        supersede: ["STINT-1", "THR-1", "STSTAT-1"],
        close: ["BEL-1"]
      }
    }),
    record("story_status_record", "test-story:STSTAT-1", "stories/test-story/_source/status/STSTAT-1.yaml", {
      id: "STSTAT-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      entity: "STENT-1",
      life: "alive",
      agency: "free",
      location: "STLOC-1",
      derived_from: ["SE-1"]
    }),
    record("story_status_record", "test-story:STSTAT-2", "stories/test-story/_source/status/STSTAT-2.yaml", {
      id: "STSTAT-2",
      story_id: "STORY-1",
      created_at_page: "PG-2",
      supersedes: "STSTAT-1",
      entity: "STENT-1",
      life: "dead",
      agency: "dead",
      location: "STLOC-1",
      derived_from: ["SE-2"]
    }),
    record("page_record", "test-story:PG-2", "stories/test-story/_source/pages/PG-2.yaml", childPage)
  ];
}

function newSchemaChildPage(
  activeRecords: Record<string, readonly string[]>,
  entityStatus: Record<string, unknown> = { "STENT-1": { life: "dead", agency: "dead", location: "STLOC-1" } },
  mysteryClaims: readonly Record<string, unknown>[] = []
): Record<string, unknown> {
  const page: Record<string, unknown> = {
    id: "PG-2",
    story_id: "STORY-1",
    parent_page_id: "PG-1",
    input: { resolved_event_id: "SE-2" },
    state_hash_parent: "0".repeat(64),
    state_snapshot: {
      active_records: activeRecords,
      visible_affordances: ["CHC-2"],
      entity_status: entityStatus,
      unresolved_mystery_claims: mysteryClaims,
      continuation: { next_storylets: ["SLT-2"] }
    },
    plan: {
      path: "pages-prose-plans/PG-2.md",
      plan_hash: "1".repeat(64)
    },
    validation_trace: {
      parent_snapshot_compatibility: "matched parent state_hash"
    }
  };

  return {
    ...page,
    state_hash: computePgStateHash(page)
  };
}

function newSchemaParentActiveRecords(): Record<string, string[]> {
  return {
    STENT: ["STENT-1"],
    STCHAR: [],
    STINT: ["STINT-1"],
    SF: ["SF-1"],
    BEL: ["BEL-1"],
    OBL: ["OBL-1"],
    CNSQ: [],
    THR: ["THR-1"],
    SREL: [],
    STLOC: ["STLOC-1"],
    STOBJ: [],
    DA: [],
    STSTAT: ["STSTAT-1"],
    STPLAN: [],
    STEMO: []
  };
}

function newSchemaExpectedActiveRecords(): Record<string, string[]> {
  return {
    STENT: ["STENT-1"],
    STCHAR: [],
    STINT: [],
    SF: ["SF-1", "SF-2"],
    BEL: [],
    OBL: ["OBL-1", "OBL-2"],
    CNSQ: [],
    THR: [],
    SREL: [],
    STLOC: ["STLOC-1"],
    STOBJ: [],
    DA: [],
    STSTAT: ["STSTAT-2"],
    STPLAN: [],
    STEMO: []
  };
}
