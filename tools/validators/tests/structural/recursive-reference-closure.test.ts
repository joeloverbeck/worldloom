import assert from "node:assert/strict";
import test from "node:test";

import { recursiveReferenceClosure } from "../../src/structural/recursive-reference-closure.js";
import { context, record } from "./helpers.js";

const stateSnapshot = {
  objective_facts: ["SF-0002"],
  obligations_open: ["OBL-0001"],
  current_location: "STLOC-0001",
  inventory_by_entity: {
    "STENT-0001": ["STOBJ-0001"]
  }
};

test("recursive_reference_closure passes for same-branch recursive references", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records(), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("recursive_reference_closure accepts BEL records in active_records", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      state_snapshot: {
        active_records: {
          BEL: ["BEL-0001"]
        }
      }
    },
    extra: [
      storyRecord("belief_record", "BEL-0001", "beliefs", {
        id: "BEL-0001",
        story_id: "STORY-001",
        created_at_page: "PG-0001"
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("recursive_reference_closure fails for sibling-branch leakage at nested depth", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    factOverrides: {
      evidence: [{ event_id: "SE-0009" }]
    },
    extra: [
      storyRecord("story_event_record", "SE-0009", "events", {
        id: "SE-0009",
        story_id: "STORY-001",
        event_kind: "selected_choice",
        created_at_page: "PG-0099",
        ops: []
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const leak = verdicts.find((verdict) => verdict.code === "recursive_reference_closure.branch_leak");
  assert.ok(leak);
  assert.deepEqual(leak.detail, {
    reference_id: "SE-0009",
    reference_path: "state_snapshot.obligations_open[0].dependent_facts[0].evidence[0].event_id",
    referenced_file: "stories/test-story/_source/events/SE-0009.yaml",
    referenced_node_id: "test-story:SE-0009",
    created_at_page: "PG-0099"
  });
});

test("recursive_reference_closure allows global author-pool storylets", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    obligationOverrides: {
      coverage_cache: { compatible_storylets: ["SLT-0001"] }
    },
    extra: [
      storyRecord("storylet_record", "SLT-0001", "storylets", {
        id: "SLT-0001",
        story_id: "STORY-001",
        scope: { visibility: "global_author_pool", branch_id: null },
        created_at_page: null,
        provenance: { origin: "bootstrap_seed" }
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("recursive_reference_closure allows null-created branch-prefix-scoped storylets with a canonical prefix", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    obligationOverrides: {
      coverage_cache: { compatible_storylets: ["SLT-0002"] }
    },
    extra: [
      branchPrefixStorylet("SLT-0002", ["PG-0001"])
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("recursive_reference_closure rejects null-created branch-prefix-scoped storylets with sibling prefixes", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    obligationOverrides: {
      coverage_cache: { compatible_storylets: ["SLT-0002"] }
    },
    extra: [
      branchPrefixStorylet("SLT-0002", ["PG-0099"])
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const leak = verdicts.find((verdict) => verdict.code === "recursive_reference_closure.branch_leak");
  assert.ok(leak);
  assert.deepEqual(leak.detail, {
    reference_id: "SLT-0002",
    reference_path: "state_snapshot.obligations_open[0].coverage_cache.compatible_storylets[0]",
    referenced_file: "stories/test-story/_source/storylets/SLT-0002.yaml",
    referenced_node_id: "test-story:SLT-0002",
    created_at_page: null
  });
});

test("recursive_reference_closure rejects null-created branch-prefix-scoped storylets with malformed prefixes", async () => {
  const malformedValues: unknown[] = [undefined, [], ["PG-0002"], ["PG-0001", "bad"]];

  for (const [index, visible_branch_path_prefix] of malformedValues.entries()) {
    const storyletId = `SLT-001${index}`;
    const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
      obligationOverrides: {
        coverage_cache: { compatible_storylets: [storyletId] }
      },
      extra: [
        branchPrefixStorylet(storyletId, visible_branch_path_prefix)
      ]
    }), {
      run_mode: "pre-apply",
      patch_plan: patchPlan()
    }));

    assert.ok(
      verdicts.some((verdict) => verdict.code === "recursive_reference_closure.branch_leak"),
      `expected branch leak for ${JSON.stringify(visible_branch_path_prefix)}`
    );
  }
});

test("recursive_reference_closure rejects branch-scoped storylets with null created_at_page", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    obligationOverrides: {
      coverage_cache: { compatible_storylets: ["SLT-0003"] }
    },
    extra: [
      storyRecord("storylet_record", "SLT-0003", "storylets", {
        id: "SLT-0003",
        story_id: "STORY-001",
        scope: { visibility: "branch_scoped", branch_id: "BR-0001" },
        created_at_page: null,
        provenance: { origin: "runtime_jit" }
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.ok(verdicts.some((verdict) => verdict.code === "recursive_reference_closure.branch_leak"));
});

test("recursive_reference_closure passes for same-branch PG references", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    obligationOverrides: {
      reviewed_at_page: "PG-0002"
    },
    extra: [
      storyRecord("page_record", "PG-0001", "pages", {
        id: "PG-0001",
        story_id: "STORY-001",
        branch_path: ["PG-0001"],
        state_snapshot: {}
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("recursive_reference_closure fails for sibling-branch PG references", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    obligationOverrides: {
      reviewed_at_page: "PG-0099"
    },
    extra: [
      storyRecord("page_record", "PG-0099", "pages", {
        id: "PG-0099",
        story_id: "STORY-001",
        branch_path: ["PG-0001", "PG-0099"],
        state_snapshot: {}
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const leak = verdicts.find((verdict) => verdict.code === "recursive_reference_closure.branch_leak");
  assert.ok(leak);
  assert.deepEqual(leak.detail, {
    reference_id: "PG-0099",
    reference_path: "state_snapshot.obligations_open[0].reviewed_at_page",
    referenced_file: "stories/test-story/_source/pages/PG-0099.yaml",
    referenced_node_id: "test-story:PG-0099",
    created_at_page: "PG-0099"
  });
  assert.equal(leak.suggested_fix, "Replace PG-0099 with a page in this branch's branch_path.");
});

test("recursive_reference_closure passes for PG references with no created_at_page field", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      state_snapshot: {
        ...stateSnapshot,
        relationships_current: ["SREL-0001"]
      }
    },
    extra: [
      storyRecord("page_record", "PG-0001", "pages", {
        id: "PG-0001",
        story_id: "STORY-001",
        branch_path: ["PG-0001"],
        state_snapshot: {}
      }),
      storyRecord("relationship_record_story", "SREL-0001", "relationships", {
        id: "SREL-0001",
        story_id: "STORY-001",
        created_at_page: "PG-0002",
        last_meaningful_interaction: "PG-0001"
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("recursive_reference_closure ignores world-level artifact ids", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context([
    ...records({
      factOverrides: {
        evidence: [{ artifact_id: "DA-0001" }]
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

test("recursive_reference_closure fails for missing referenced records", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    obligationOverrides: {
      dependent_facts: ["SF-9999"]
    }
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.ok(verdicts.some((verdict) => verdict.code === "recursive_reference_closure.missing_record"));
  assert.equal(verdicts[0]?.message, "PG-0002 reaches missing story-local record SF-9999 via state_snapshot.obligations_open[0].dependent_facts[0]");
});

test("recursive_reference_closure skips envelopes without PG creates", () => {
  assert.equal(recursiveReferenceClosure.applies_to(context([], {
    run_mode: "pre-apply",
    patch_plan: { ...patchPlan(), patches: [] }
  })), false);
});

test("recursive_reference_closure fails for sibling storylet_realized page peers", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      storylet_realized: "SLT-0099"
    },
    extra: [
      storyRecord("storylet_record", "SLT-0099", "storylets", {
        id: "SLT-0099",
        story_id: "STORY-001",
        scope: { visibility: "branch_scoped", branch_id: "BR-0099" },
        created_at_page: "PG-0099",
        provenance: { origin: "runtime_jit" }
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const leak = verdicts.find((verdict) => verdict.code === "recursive_reference_closure.branch_leak");
  assert.ok(leak);
  assert.deepEqual(leak.detail, {
    reference_id: "SLT-0099",
    reference_path: "storylet_realized",
    referenced_file: "stories/test-story/_source/storylets/SLT-0099.yaml",
    referenced_node_id: "test-story:SLT-0099",
    created_at_page: "PG-0099"
  });
});

test("recursive_reference_closure fails for sibling applied_event_ops page peers", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      applied_event_ops: ["SE-0099"]
    },
    extra: [
      storyRecord("story_event_record", "SE-0099", "events", {
        id: "SE-0099",
        story_id: "STORY-001",
        event_kind: "selected_choice",
        created_at_page: "PG-0099",
        ops: []
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const leak = verdicts.find((verdict) => verdict.code === "recursive_reference_closure.branch_leak");
  assert.ok(leak);
  assert.deepEqual(leak.detail, {
    reference_id: "SE-0099",
    reference_path: "applied_event_ops[0]",
    referenced_file: "stories/test-story/_source/events/SE-0099.yaml",
    referenced_node_id: "test-story:SE-0099",
    created_at_page: "PG-0099"
  });
});

test("recursive_reference_closure resolves promotion claim STSTAT and SREL source records", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      applied_event_ops: ["SE-0003"]
    },
    extra: [
      storyRecord("story_event_record", "SE-0003", "events", {
        id: "SE-0003",
        story_id: "STORY-001",
        event_kind: "promotion_closeout",
        created_at_page: "PG-0002",
        promotion_claims: [
          {
            source_record: "STSTAT-0003",
            authority: "canon_candidate"
          },
          {
            source_record: "SREL-0002",
            authority: "canon_candidate"
          }
        ]
      }),
      storyRecord("story_status_record", "STSTAT-0003", "status", {
        id: "STSTAT-0003",
        story_id: "STORY-001",
        created_at_page: "PG-0002"
      }),
      storyRecord("relationship_record_story", "SREL-0002", "relationships", {
        id: "SREL-0002",
        story_id: "STORY-001",
        created_at_page: "PG-0002"
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("recursive_reference_closure fails for missing promotion claim STSTAT source records", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      applied_event_ops: ["SE-0003"]
    },
    extra: [
      storyRecord("story_event_record", "SE-0003", "events", {
        id: "SE-0003",
        story_id: "STORY-001",
        event_kind: "promotion_closeout",
        created_at_page: "PG-0002",
        promotion_claims: [
          {
            source_record: "STSTAT-0009",
            authority: "canon_candidate"
          }
        ]
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const missing = verdicts.find((verdict) => verdict.code === "recursive_reference_closure.missing_record");
  assert.ok(missing);
  assert.deepEqual(missing.detail, {
    reference_id: "STSTAT-0009",
    reference_path: "applied_event_ops[0].promotion_claims[0].source_record"
  });
});

test("recursive_reference_closure fails for missing emitted_choices page peers", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      emitted_choices: ["CHC-9999"]
    }
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const missing = verdicts.find((verdict) => verdict.code === "recursive_reference_closure.missing_record");
  assert.ok(missing);
  assert.deepEqual(missing.detail, {
    reference_id: "CHC-9999",
    reference_path: "emitted_choices[0]"
  });
});

test("recursive_reference_closure follows emitted choice effect graphs from page peers", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      emitted_choices: ["CHC-0001"],
      state_snapshot: {
        ...stateSnapshot,
        active_records: {
          STENT: ["STENT-0001"]
        }
      }
    },
    extra: [
      storyRecord("choice_record", "CHC-0001", "choices", {
        id: "CHC-0001",
        story_id: "STORY-001",
        created_at_page: "PG-0002",
        grounded_in: {
          records: ["STENT-0001"]
        },
        uses_fact: "SF-0099"
      }),
      storyRecord("story_fact_record", "SF-0099", "facts", {
        id: "SF-0099",
        story_id: "STORY-001",
        created_at_page: "PG-0099"
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const leak = verdicts.find((verdict) => verdict.code === "recursive_reference_closure.branch_leak");
  assert.ok(leak);
  assert.deepEqual(leak.detail, {
    reference_id: "SF-0099",
    reference_path: "emitted_choices[0].uses_fact",
    referenced_file: "stories/test-story/_source/facts/SF-0099.yaml",
    referenced_node_id: "test-story:SF-0099",
    created_at_page: "PG-0099"
  });
});

test("recursive_reference_closure accepts choices grounded in active records and visible affordances", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      emitted_choices: ["CHC-0001"],
      state_snapshot: {
        ...stateSnapshot,
        active_records: {
          STENT: ["STENT-0001"],
          STLOC: ["STLOC-0001"],
          STOBJ: ["STOBJ-0001"]
        },
        visible_affordances: [
          {
            ordinal: 0,
            label: "door to the alley",
            grounded_in: ["STLOC-0001", "STOBJ-0001"],
            available_to: ["STENT-0001"],
            action_families: ["move"]
          }
        ]
      }
    },
    extra: [
      storyRecord("choice_record", "CHC-0001", "choices", {
        id: "CHC-0001",
        story_id: "STORY-001",
        created_at_page: "PG-0002",
        grounded_in: {
          records: ["STENT-0001", "STLOC-0001"],
          affordance_ordinals: [0]
        }
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("recursive_reference_closure fails choices grounded in inactive records", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      emitted_choices: ["CHC-0001"],
      state_snapshot: {
        ...stateSnapshot,
        active_records: {
          STENT: ["STENT-0001"]
        }
      }
    },
    extra: [
      storyRecord("choice_record", "CHC-0001", "choices", {
        id: "CHC-0001",
        story_id: "STORY-001",
        created_at_page: "PG-0002",
        grounded_in: {
          records: ["OBL-0001"]
        }
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const missing = verdicts.find((verdict) => verdict.code === "recursive_reference_closure.choice_grounding_missing_active_record");
  assert.ok(missing);
  assert.deepEqual(missing.detail, {
    page_id: "PG-0002",
    choice_id: "CHC-0001",
    reference_id: "OBL-0001",
    reference_path: "emitted_choices[0].grounded_in.records[0]"
  });
});

test("recursive_reference_closure fails choices grounded in absent affordance ordinals", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      emitted_choices: ["CHC-0001"],
      state_snapshot: {
        ...stateSnapshot,
        active_records: {
          STENT: ["STENT-0001"]
        },
        visible_affordances: [
          {
            ordinal: 0,
            label: "door to the alley",
            grounded_in: ["STLOC-0001"],
            available_to: ["STENT-0001"],
            action_families: ["move"]
          }
        ]
      }
    },
    extra: [
      storyRecord("choice_record", "CHC-0001", "choices", {
        id: "CHC-0001",
        story_id: "STORY-001",
        created_at_page: "PG-0002",
        grounded_in: {
          records: ["STENT-0001"],
          affordance_ordinals: [3]
        }
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const missing = verdicts.find((verdict) => verdict.code === "recursive_reference_closure.choice_grounding_missing_affordance");
  assert.ok(missing);
  assert.deepEqual(missing.detail, {
    page_id: "PG-0002",
    choice_id: "CHC-0001",
    affordance_ordinal: 3,
    reference_path: "emitted_choices[0].grounded_in.affordance_ordinals[0]"
  });
});

function records(options: {
  pageOverrides?: Record<string, unknown>;
  factOverrides?: Record<string, unknown>;
  obligationOverrides?: Record<string, unknown>;
  extra?: ReturnType<typeof storyRecord>[];
} = {}) {
  return [
    storyRecord("page_record", "PG-0002", "pages", {
      id: "PG-0002",
      story_id: "STORY-001",
      branch_path: ["PG-0001", "PG-0002"],
      state_snapshot: stateSnapshot,
      created_at_page: "PG-0002",
      ...options.pageOverrides
    }),
    storyRecord("story_fact_record", "SF-0002", "facts", {
      id: "SF-0002",
      story_id: "STORY-001",
      created_at_page: "PG-0002",
      ...options.factOverrides
    }),
    storyRecord("obligation_record", "OBL-0001", "obligations", {
      id: "OBL-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001",
      dependent_facts: ["SF-0002"],
      ...options.obligationOverrides
    }),
    storyRecord("story_location_record", "STLOC-0001", "locations", {
      id: "STLOC-0001",
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
      created_at_page: "PG-0002"
    }),
    ...(options.extra ?? [])
  ];
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

function branchPrefixStorylet(id: string, visible_branch_path_prefix?: unknown) {
  return storyRecord("storylet_record", id, "storylets", {
    id,
    story_id: "STORY-001",
    scope: {
      visibility: "branch_prefix_scoped",
      branch_id: "BR-0001",
      ...(visible_branch_path_prefix === undefined ? {} : { visible_branch_path_prefix })
    },
    created_at_page: null,
    provenance: { origin: "focus_authoring" }
  });
}

function patchPlan() {
  return {
    plan_id: "plan-recursive-reference-closure",
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
