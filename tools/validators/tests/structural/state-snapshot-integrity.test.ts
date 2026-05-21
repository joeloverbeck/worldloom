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
      id: "PG-1",
      story_id: "STORY-1",
      input: {
        choice_id: null,
        manual_action_text: null,
        resolved_event_id: "SE-1"
      },
      state_snapshot: completeStateSnapshot()
    },
    eventKind: "story_start",
    pageId: "PG-1"
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan("PG-1")
  }));

  assert.deepEqual(verdicts, []);
});

test("state_snapshot_integrity rejects non-null choice input for story_start", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context(records({
    pageRecord: {
      id: "PG-1",
      story_id: "STORY-1",
      input: {
        choice_id: "CHC-1",
        manual_action_text: null,
        resolved_event_id: "SE-1"
      },
      state_snapshot: completeStateSnapshot()
    },
    eventKind: "story_start",
    pageId: "PG-1"
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan("PG-1")
  }));

  assertPgInputLegalityViolation(verdicts, "PG-1", "SE-1", "story_start");
});

test("state_snapshot_integrity rejects missing source input for non-story_start events", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context(records({
    pageRecord: {
      id: "PG-2",
      story_id: "STORY-1",
      input: {
        choice_id: null,
        manual_action_text: null,
        resolved_event_id: "SE-1"
      },
      state_snapshot: completeStateSnapshot()
    },
    eventKind: "selected_choice"
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assertPgInputLegalityViolation(verdicts, "PG-2", "SE-1", "selected_choice");
});

test("state_snapshot_integrity accepts active_records BEL references", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context([
    storyRecord("page_record", "PG-2", "pages", {
      id: "PG-2",
      story_id: "STORY-1",
      input: {
        choice_id: "CHC-1",
        manual_action_text: null,
        resolved_event_id: "SE-1"
      },
      state_snapshot: {
        active_records: {
          STCHAR: [],
          BEL: ["BEL-1"]
        }
      }
    }),
    storyRecord("story_event_record", "SE-1", "events", {
      id: "SE-1",
      story_id: "STORY-1",
      event_kind: "selected_choice"
    }),
    storyRecord("belief_record", "BEL-1", "beliefs", {
      id: "BEL-1",
      story_id: "STORY-1",
      created_at_page: "PG-1"
    })
  ], {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("state_snapshot_integrity accepts active_records STCHAR references", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context([
    storyRecord("page_record", "PG-2", "pages", {
      id: "PG-2",
      story_id: "STORY-1",
      input: {
        choice_id: "CHC-1",
        manual_action_text: null,
        resolved_event_id: "SE-1"
      },
      state_snapshot: {
        active_records: {
          STCHAR: ["STCHAR-1"]
        }
      }
    }),
    storyRecord("story_event_record", "SE-1", "events", {
      id: "SE-1",
      story_id: "STORY-1",
      event_kind: "selected_choice"
    }),
    {
      ...record("story_character_authority_record", "test-story:STCHAR-1", "stories/test-story/story-characters/STCHAR-1.md", {
        id: "STCHAR-1",
        story_id: "STORY-1",
        generated_at_page: "story_bootstrap"
      }),
      story_slug: "test-story"
    }
  ], {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("state_snapshot_integrity normalizes absent remaining optional active-record keys", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context([
    storyRecord("page_record", "PG-2", "pages", {
      id: "PG-2",
      story_id: "STORY-1",
      input: {
        choice_id: "CHC-1",
        manual_action_text: null,
        resolved_event_id: "SE-1"
      },
      state_snapshot: {
        active_records: {
          STENT: ["STENT-1"],
          STCHAR: [],
          STSTAT: ["STSTAT-1"],
          STLOC: ["STLOC-1"]
        }
      }
    }),
    storyRecord("story_event_record", "SE-1", "events", {
      id: "SE-1",
      story_id: "STORY-1",
      event_kind: "selected_choice"
    }),
    storyRecord("story_entity_record", "STENT-1", "entities", {
      id: "STENT-1",
      story_id: "STORY-1"
    }),
    storyRecord("story_status_record", "STSTAT-1", "status", {
      id: "STSTAT-1",
      story_id: "STORY-1"
    }),
    storyRecord("story_location_record", "STLOC-1", "locations", {
      id: "STLOC-1",
      story_id: "STORY-1"
    })
  ], {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("state_snapshot_integrity fails when active_records omits STCHAR", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context([
    storyRecord("page_record", "PG-2", "pages", {
      id: "PG-2",
      story_id: "STORY-1",
      input: {
        choice_id: "CHC-1",
        manual_action_text: null,
        resolved_event_id: "SE-1"
      },
      state_snapshot: {
        active_records: {
          STENT: ["STENT-1"],
          STSTAT: ["STSTAT-1"],
          STLOC: ["STLOC-1"]
        }
      }
    }),
    storyRecord("story_event_record", "SE-1", "events", {
      id: "SE-1",
      story_id: "STORY-1",
      event_kind: "selected_choice"
    }),
    storyRecord("story_entity_record", "STENT-1", "entities", {
      id: "STENT-1",
      story_id: "STORY-1"
    }),
    storyRecord("story_status_record", "STSTAT-1", "status", {
      id: "STSTAT-1",
      story_id: "STORY-1"
    }),
    storyRecord("story_location_record", "STLOC-1", "locations", {
      id: "STLOC-1",
      story_id: "STORY-1"
    })
  ], {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.ok(verdicts.some((verdict) => (
    verdict.code === "state_snapshot_integrity.missing_required_field" &&
    (verdict.detail as { field?: string }).field === "state_snapshot.active_records.STCHAR"
  )));
});

test("state_snapshot_integrity validates CLK/STSEC/STQ active record statuses", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context([
    storyRecord("page_record", "PG-2", "pages", {
      id: "PG-2",
      story_id: "STORY-1",
      input: {
        choice_id: "CHC-1",
        manual_action_text: null,
        resolved_event_id: "SE-1"
      },
      state_snapshot: {
        active_records: {
          STCHAR: [],
          CLK: ["CLK-1", "CLK-2"],
          STSEC: ["STSEC-1", "STSEC-2"],
          STQ: ["STQ-1", "STQ-2"]
        }
      }
    }),
    storyRecord("story_event_record", "SE-1", "events", {
      id: "SE-1",
      story_id: "STORY-1",
      event_kind: "selected_choice"
    }),
    storyRecord("pressure_clock_record", "CLK-1", "clocks", {
      id: "CLK-1",
      status: "active"
    }),
    storyRecord("pressure_clock_record", "CLK-2", "clocks", {
      id: "CLK-2",
      status: "resolved"
    }),
    storyRecord("story_secret_record", "STSEC-1", "secrets", {
      id: "STSEC-1",
      status: "partially_revealed"
    }),
    storyRecord("story_secret_record", "STSEC-2", "secrets", {
      id: "STSEC-2",
      status: "revealed"
    }),
    storyRecord("story_question_record", "STQ-1", "story-questions", {
      id: "STQ-1",
      status: "open"
    }),
    storyRecord("story_question_record", "STQ-2", "story-questions", {
      id: "STQ-2",
      status: "answered"
    })
  ], {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(
    verdicts
      .filter((verdict) => verdict.code === "state_snapshot_integrity.inactive_active_record")
      .map((verdict) => (verdict.detail as { reference_id: string }).reference_id)
      .sort(),
    ["CLK-2", "STQ-2", "STSEC-2"]
  );
});

test("state_snapshot_integrity validates STPLAN and STEMO active record statuses", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context([
    storyRecord("page_record", "PG-2", "pages", {
      id: "PG-2",
      story_id: "STORY-1",
      input: {
        choice_id: "CHC-1",
        manual_action_text: null,
        resolved_event_id: "SE-1"
      },
      state_snapshot: {
        active_records: {
          STCHAR: [],
          STPLAN: ["STPLAN-1", "STPLAN-2", "STPLAN-3", "STPLAN-4", "STPLAN-5", "STPLAN-6", "STPLAN-7"],
          STEMO: ["STEMO-1", "STEMO-2", "STEMO-3", "STEMO-4", "STEMO-5"]
        }
      }
    }),
    storyRecord("story_event_record", "SE-1", "events", {
      id: "SE-1",
      story_id: "STORY-1",
      event_kind: "selected_choice"
    }),
    ...["active", "blocked", "suspended", "revised", "fulfilled", "failed", "abandoned"].map((planStatus, index) =>
      storyRecord("story_plan_record", `STPLAN-${index + 1}`, "plans", {
        id: `STPLAN-${index + 1}`,
        story_id: "STORY-1",
        plan_status: planStatus
      })
    ),
    ...["active", "suppressed", "dissociated", "settled", "transformed"].map((status, index) =>
      storyRecord("story_emotion_record", `STEMO-${index + 1}`, "emotions", {
        id: `STEMO-${index + 1}`,
        story_id: "STORY-1",
        status
      })
    )
  ], {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(
    verdicts
      .filter((verdict) => verdict.code === "state_snapshot_integrity.inactive_active_record")
      .map((verdict) => ({
        id: (verdict.detail as { reference_id: string }).reference_id,
        allowed: (verdict.detail as { allowed_statuses: string[] }).allowed_statuses
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    [
      { id: "STEMO-4", allowed: ["active", "suppressed", "dissociated"] },
      { id: "STEMO-5", allowed: ["active", "suppressed", "dissociated"] },
      { id: "STPLAN-5", allowed: ["active", "blocked", "suspended", "revised"] },
      { id: "STPLAN-6", allowed: ["active", "blocked", "suspended", "revised"] },
      { id: "STPLAN-7", allowed: ["active", "blocked", "suspended", "revised"] }
    ]
  );
});

test("state_snapshot_integrity requires evidence_records for narrowing mystery claims", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context(records({
    pageSnapshot: {
      ...completeStateSnapshot(),
      unresolved_mystery_claims: [
        {
          mystery_id: "M-1",
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
    page_id: "PG-2",
    mystery_id: "M-1",
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
          mystery_id: "M-1",
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
          mystery_id: "M-1",
          authority: "apparent",
          status: "clue_added",
          evidence_records: ["SF-1", "BEL-1", "DA-1", "SE-1"]
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
          mystery_id: "M-1",
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
      ...record("story_fact_record", "other-story:SF-1", "stories/other-story/_source/facts/SF-1.yaml", {
        id: "SF-1",
        story_id: "STORY-2"
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
      (verdict.detail as { reference_id?: string }).reference_id === "SF-1"
  ));
});

test("state_snapshot_integrity allows world-level artifact ids", async () => {
  const verdicts = await stateSnapshotIntegrity.run(undefined, context([
    ...records({
      pageSnapshot: {
        ...completeStateSnapshot(),
        objects_in_scope: ["DA-1"]
      }
    }),
    record("diegetic_artifact_record", "DA-1", "diegetic-artifacts/DA-1.md", {
      id: "DA-1",
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
  const pageId = options.pageId ?? "PG-2";
  return [
    storyRecord("page_record", pageId, "pages", options.pageRecord ?? {
      id: pageId,
      story_id: "STORY-1",
      input: {
        choice_id: "CHC-1",
        manual_action_text: null,
        resolved_event_id: "SE-1"
      },
      state_snapshot: options.pageSnapshot ?? completeStateSnapshot()
    }),
    storyRecord("story_event_record", "SE-1", "events", {
      id: "SE-1",
      story_id: "STORY-1",
      event_kind: options.eventKind ?? "selected_choice"
    }),
    ...(options.includeFact === false ? [] : [
      storyRecord("story_fact_record", "SF-1", "facts", {
        id: "SF-1",
        story_id: "STORY-1",
        created_at_page: "PG-1"
      })
    ]),
    storyRecord("belief_record", "BEL-1", "beliefs", {
      id: "BEL-1",
      story_id: "STORY-1",
      created_at_page: "PG-1"
    }),
    storyRecord("story_diegetic_artifact_record", "DA-1", "artifacts", {
      id: "DA-1",
      story_id: "STORY-1",
      created_at_page: "PG-1"
    }),
    storyRecord("story_location_record", "STLOC-1", "locations", {
      id: "STLOC-1",
      story_id: "STORY-1",
      created_at_page: "PG-1"
    }),
    storyRecord("obligation_record", "OBL-1", "obligations", {
      id: "OBL-1",
      story_id: "STORY-1",
      created_at_page: "PG-1"
    }),
    storyRecord("consequence_record", "CNSQ-1", "consequences", {
      id: "CNSQ-1",
      story_id: "STORY-1",
      created_at_page: "PG-1"
    }),
    storyRecord("thread_record", "THR-1", "threads", {
      id: "THR-1",
      story_id: "STORY-1",
      created_at_page: "PG-1"
    }),
    storyRecord("relationship_record_story", "SREL-1", "relationships", {
      id: "SREL-1",
      story_id: "STORY-1",
      created_at_page: "PG-1"
    }),
    storyRecord("intention_record", "STINT-1", "intentions", {
      id: "STINT-1",
      story_id: "STORY-1",
      created_at_page: "PG-1"
    }),
    storyRecord("story_entity_record", "STENT-1", "entities", {
      id: "STENT-1",
      story_id: "STORY-1",
      created_at_page: "PG-1"
    }),
    storyRecord("story_object_record", "STOBJ-1", "objects", {
      id: "STOBJ-1",
      story_id: "STORY-1",
      created_at_page: "PG-1"
    })
  ];
}

function completeStateSnapshot(): Record<string, unknown> {
  return {
    canon_revision: "CH-1",
    objective_facts: ["SF-1"],
    apparent_facts: [],
    disputed_facts: [],
    reader_known_facts: [],
    belief_state_by_actor: { "STENT-1": ["SF-1"] },
    rumor_state: [],
    obligations_open: ["OBL-1"],
    obligations_paid_off: [],
    obligations_complicated: [],
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
    entity_status: { "STENT-1": "present" }
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
    choice_id: eventKind === "story_start" ? "CHC-1" : null,
    manual_action_text: null
  });
}

function patchPlan(pageId = "PG-2") {
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
          record: { id: pageId, story_id: "STORY-1" }
        }
      }
    ]
  };
}
