import assert from "node:assert/strict";
import test from "node:test";

import { stateSnapshotIntegrity } from "../../src/structural/state-snapshot-integrity.js";
import { context, record } from "./helpers.js";

test("state_snapshot_integrity passes for a complete page snapshot", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context(records(), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("state_snapshot_integrity accepts PG-1 null inputs for story_start", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context(records({
    pageRecord: {
      id: "PG-0001",
      story_id: "STORY-001",
      input: {
        choice_id: null,
        manual_action_text: null,
        resolved_event_id: "SE-0001"
      },
      state_snapshot: completeStateSnapshot()
    },
    eventKind: "story_start",
    pageId: "PG-0001"
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan("PG-0001")
  }));

  assert.deepEqual(verdicts, []);
});

test("state_snapshot_integrity rejects non-null choice input for story_start", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context(records({
    pageRecord: {
      id: "PG-0001",
      story_id: "STORY-001",
      input: {
        choice_id: "CHC-0001",
        manual_action_text: null,
        resolved_event_id: "SE-0001"
      },
      state_snapshot: completeStateSnapshot()
    },
    eventKind: "story_start",
    pageId: "PG-0001"
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan("PG-0001")
  }));

  assertPgInputLegalityViolation(verdicts, "PG-0001", "SE-0001", "story_start");
});

test("state_snapshot_integrity rejects missing source input for non-story_start events", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context(records({
    pageRecord: {
      id: "PG-0002",
      story_id: "STORY-001",
      input: {
        choice_id: null,
        manual_action_text: null,
        resolved_event_id: "SE-0001"
      },
      state_snapshot: completeStateSnapshot()
    },
    eventKind: "selected_choice"
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assertPgInputLegalityViolation(verdicts, "PG-0002", "SE-0001", "selected_choice");
});

test("state_snapshot_integrity accepts active_records BEL references", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context([
    storyRecord("page_record", "PG-0002", "pages", {
      id: "PG-0002",
      story_id: "STORY-001",
      input: {
        choice_id: "CHC-0001",
        manual_action_text: null,
        resolved_event_id: "SE-0001"
      },
      state_snapshot: {
        active_records: {
          BEL: ["BEL-0001"]
        }
      }
    }),
    storyRecord("story_event_record", "SE-0001", "events", {
      id: "SE-0001",
      story_id: "STORY-001",
      event_kind: "selected_choice"
    }),
    storyRecord("belief_record", "BEL-0001", "beliefs", {
      id: "BEL-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001"
    })
  ], {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("state_snapshot_integrity requires evidence_records for narrowing mystery claims", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context(records({
    pageSnapshot: {
      ...completeStateSnapshot(),
      unresolved_mystery_claims: [
        {
          mystery_id: "M-0001",
          authority: "apparent",
          status: "narrowed",
          evidence_records: []
        }
      ]
    }
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const required = verdicts.find((verdict) => verdict.code === "state_snapshot_integrity.mystery_evidence_required");
  assert.ok(required);
  assert.deepEqual(required.detail, {
    page_id: "PG-0002",
    mystery_id: "M-0001",
    status: "narrowed",
    field: "state_snapshot.unresolved_mystery_claims[0].evidence_records"
  });
});

test("state_snapshot_integrity allows preserved mystery claims without evidence_records", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context(records({
    pageSnapshot: {
      ...completeStateSnapshot(),
      unresolved_mystery_claims: [
        {
          mystery_id: "M-0001",
          authority: "apparent",
          status: "preserved",
          evidence_records: []
        }
      ]
    }
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("state_snapshot_integrity resolves story-local mystery evidence records", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context(records({
    pageSnapshot: {
      ...completeStateSnapshot(),
      unresolved_mystery_claims: [
        {
          mystery_id: "M-0001",
          authority: "apparent",
          status: "clue_added",
          evidence_records: ["SF-0001", "BEL-0001", "DA-0001", "SE-0001"]
        }
      ]
    }
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("state_snapshot_integrity rejects missing story-local mystery evidence records", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context(records({
    pageSnapshot: {
      ...completeStateSnapshot(),
      unresolved_mystery_claims: [
        {
          mystery_id: "M-0001",
          authority: "apparent",
          status: "clue_added",
          evidence_records: ["SF-9999"]
        }
      ]
    }
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const dangling = verdicts.find((verdict) => verdict.code === "state_snapshot_integrity.dangling_reference");
  assert.ok(dangling);
  assert.deepEqual(dangling.detail, {
    reference_id: "SF-9999",
    reference_path: "state_snapshot.unresolved_mystery_claims[0].evidence_records[0]"
  });
});

test("state_snapshot_integrity fails when required fields are missing", async () => {
  const { current_location: _currentLocation, entity_status: _entityStatus, ...snapshot } = completeStateSnapshot();
  const verdicts = await stateSnapshotIntegrity.run(undefined, context(records({ pageSnapshot: snapshot }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.ok(verdicts.some((verdict) => verdict.code === "state_snapshot_integrity.missing_required_field"));
  assert.ok(verdicts.some((verdict) => (verdict.detail as { field?: string }).field === "state_snapshot.current_location"));
  assert.ok(verdicts.some((verdict) => (verdict.detail as { field?: string }).field === "state_snapshot.entity_status"));
});

test("state_snapshot_integrity fails for dangling snapshot references", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context(records({
    pageSnapshot: {
      ...completeStateSnapshot(),
      obligations_open: ["OBL-9999"]
    }
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const dangling = verdicts.find((verdict) => verdict.code === "state_snapshot_integrity.dangling_reference");
  assert.ok(dangling);
  assert.deepEqual(dangling.detail, {
    reference_id: "OBL-9999",
    reference_path: "state_snapshot.obligations_open[0]"
  });
});

test("state_snapshot_integrity resolves ids within the same story scope", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context([
    ...records({ includeFact: false }),
    {
      ...record("story_fact_record", "other-story:SF-0001", "stories/other-story/_source/facts/SF-0001.yaml", {
        id: "SF-0001",
        story_id: "STORY-002"
      }),
      story_slug: "other-story"
    }
  ], {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.ok(verdicts.some(
    (verdict) =>
      verdict.code === "state_snapshot_integrity.dangling_reference" &&
      (verdict.detail as { reference_id?: string }).reference_id === "SF-0001"
  ));
});

test("state_snapshot_integrity allows world-level artifact ids", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context([
    ...records({
      pageSnapshot: {
        ...completeStateSnapshot(),
        objects_in_scope: ["DA-0001"]
      }
    }),
    record("diegetic_artifact_record", "DA-0001", "diegetic-artifacts/DA-0001.md", {
      id: "DA-0001",
      title: "World artifact"
    })
  ], {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("state_snapshot_integrity skips envelopes without PG creates", () => {
  assert.equal(stateSnapshotIntegrity.applies_to(context([], {
    run_mode: "pre-apply",
    patch_plan: { ...patchPlan(), patches: [] }
  })), false);
});

function records(options: {
  pageRecord?: Record<string, unknown>;
  pageSnapshot?: Record<string, unknown>;
  includeFact?: boolean;
  eventKind?: string;
  pageId?: string;
} = {}) {
  const pageId = options.pageId ?? "PG-0002";
  return [
    storyRecord("page_record", pageId, "pages", options.pageRecord ?? {
      id: pageId,
      story_id: "STORY-001",
      input: {
        choice_id: "CHC-0001",
        manual_action_text: null,
        resolved_event_id: "SE-0001"
      },
      state_snapshot: options.pageSnapshot ?? completeStateSnapshot()
    }),
    storyRecord("story_event_record", "SE-0001", "events", {
      id: "SE-0001",
      story_id: "STORY-001",
      event_kind: options.eventKind ?? "selected_choice"
    }),
    ...(options.includeFact === false ? [] : [
      storyRecord("story_fact_record", "SF-0001", "facts", {
        id: "SF-0001",
        story_id: "STORY-001",
        created_at_page: "PG-0001"
      })
    ]),
    storyRecord("belief_record", "BEL-0001", "beliefs", {
      id: "BEL-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001"
    }),
    storyRecord("story_diegetic_artifact_record", "DA-0001", "artifacts", {
      id: "DA-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001"
    }),
    storyRecord("story_location_record", "STLOC-0001", "locations", {
      id: "STLOC-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001"
    }),
    storyRecord("obligation_record", "OBL-0001", "obligations", {
      id: "OBL-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001"
    }),
    storyRecord("consequence_record", "CNSQ-0001", "consequences", {
      id: "CNSQ-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001"
    }),
    storyRecord("thread_record", "THR-0001", "threads", {
      id: "THR-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001"
    }),
    storyRecord("relationship_record_story", "SREL-0001", "relationships", {
      id: "SREL-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001"
    }),
    storyRecord("intention_record", "STINT-0001", "intentions", {
      id: "STINT-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001"
    }),
    storyRecord("story_entity_record", "STENT-0001", "entities", {
      id: "STENT-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001"
    }),
    storyRecord("story_object_record", "STOBJ-0001", "objects", {
      id: "STOBJ-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001"
    })
  ];
}

function completeStateSnapshot(): Record<string, unknown> {
  return {
    canon_revision: "CH-0001",
    objective_facts: ["SF-0001"],
    apparent_facts: [],
    disputed_facts: [],
    reader_known_facts: [],
    belief_state_by_actor: { "STENT-0001": ["SF-0001"] },
    rumor_state: [],
    obligations_open: ["OBL-0001"],
    obligations_paid_off: [],
    obligations_complicated: [],
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
    entity_status: { "STENT-0001": "present" }
  };
}

function storyRecord(
  nodeType: string,
  id: string,
  sourceDir: string,
  parsed: Record<string, unknown>
) {
  return {
    ...record(nodeType, `test-story:${id}`, `stories/test-story/_source/${sourceDir}/${id}.yaml`, parsed),
    story_slug: "test-story"
  };
}

function assertPgInputLegalityViolation(
  verdicts: readonly { code: string; detail?: unknown }[],
  pageId: string,
  resolvedEventId: string,
  eventKind: string
) {
  const violation = verdicts.find((verdict) => verdict.code === "state_snapshot_integrity.pg_input_legality_violation");

  assert.ok(violation);
  assert.deepEqual(violation.detail, {
    page_id: pageId,
    resolved_event_id: resolvedEventId,
    event_kind: eventKind,
    choice_id: eventKind === "story_start" ? "CHC-0001" : null,
    manual_action_text: null
  });
}

function patchPlan(pageId = "PG-0002") {
  return {
    plan_id: "plan-state-snapshot-integrity",
    target_world: "test",
    approval_token: "placeholder",
    verdict: "page_cycle_accept",
    originating_skill: "branching-story-page-cycle",
    expected_id_allocations: { pg_ids: [pageId] },
    patches: [
      {
        op: "create_pg_record" as const,
        target_world: "test",
        payload: {
          story_slug: "test-story",
          record: { id: pageId, story_id: "STORY-001" }
        }
      }
    ]
  };
}
