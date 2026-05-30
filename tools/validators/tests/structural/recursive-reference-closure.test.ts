import assert from "node:assert/strict";
import test from "node:test";

import { recursiveReferenceClosure } from "../../src/structural/recursive-reference-closure.js";
import { context, record } from "./helpers.js";

const stateSnapshot = {
  objective_facts: ["SF-2"],
  obligations_open: ["OBL-1"],
  current_location: "STLOC-1",
  inventory_by_entity: {
    "STENT-1": ["STOBJ-1"]
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
          BEL: ["BEL-1"]
        }
      }
    },
    extra: [
      storyRecord("belief_record", "BEL-1", "beliefs", {
        id: "BEL-1",
        story_id: "STORY-1",
        created_at_page: "PG-1"
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("recursive_reference_closure accepts STCHAR records in active_records", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      state_snapshot: {
        active_records: {
          STCHAR: ["STCHAR-1"]
        }
      }
    },
    extra: [
      {
        ...record("story_character_authority_record", "test-story:STCHAR-1", "stories/test-story/story-characters/STCHAR-1.md", {
          id: "STCHAR-1",
          story_id: "STORY-1",
          generated_at_page: "story_bootstrap",
          source_char_id: "CHAR-1"
        }),
        story_slug: "test-story"
      }
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("recursive_reference_closure does not emit branch_leak for targets missing created_at_page (RRCDIAG-001)", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      state_snapshot: {
        ...stateSnapshot,
        active_records: {
          THR: ["THR-4"]
        }
      }
    },
    extra: [
      storyRecord("threat_record", "THR-4", "threats", {
        id: "THR-4",
        story_id: "STORY-1"
        // created_at_page intentionally omitted — schema-incomplete, owned by record_schema_compliance
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const leak = verdicts.find((verdict) => verdict.code === "recursive_reference_closure.branch_leak");
  assert.equal(leak, undefined, "missing created_at_page must not be reported as a branch_leak");
});

test("recursive_reference_closure fails for sibling-branch leakage at nested depth", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    factOverrides: {
      evidence: [{ event_id: "SE-9" }]
    },
    extra: [
      storyRecord("story_event_record", "SE-9", "events", {
        id: "SE-9",
        story_id: "STORY-1",
        event_kind: "selected_choice",
        created_at_page: "PG-99",
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
    reference_id: "SE-9",
    reference_path: "state_snapshot.obligations_open[0].dependent_facts[0].evidence[0].event_id",
    referenced_file: "stories/test-story/_source/events/SE-9.yaml",
    referenced_node_id: "test-story:SE-9",
    created_at_page: "PG-99"
  });
});

test("recursive_reference_closure allows global author-pool storylets", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    obligationOverrides: {
      coverage_cache: { compatible_storylets: ["SLT-1"] }
    },
    extra: [
      storyRecord("storylet_record", "SLT-1", "storylets", {
        id: "SLT-1",
        story_id: "STORY-1",
        scope: { visibility: "global_author_pool", branch_id: null },
        created_at_page: null,
        provenance: { origin: "bootstrap_seed" },
        grounding: {
          compatible_turn_drivers: ["player_action"],
          reason_to_exist: "Supports global author-pool reference closure checks."
        }
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
      coverage_cache: { compatible_storylets: ["SLT-2"] }
    },
    extra: [
      branchPrefixStorylet("SLT-2", ["PG-1"])
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
      coverage_cache: { compatible_storylets: ["SLT-2"] }
    },
    extra: [
      branchPrefixStorylet("SLT-2", ["PG-99"])
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const leak = verdicts.find((verdict) => verdict.code === "recursive_reference_closure.branch_leak");
  assert.ok(leak);
  assert.deepEqual(leak.detail, {
    reference_id: "SLT-2",
    reference_path: "state_snapshot.obligations_open[0].coverage_cache.compatible_storylets[0]",
    referenced_file: "stories/test-story/_source/storylets/SLT-2.yaml",
    referenced_node_id: "test-story:SLT-2",
    created_at_page: null
  });
});

test("recursive_reference_closure rejects null-created branch-prefix-scoped storylets with malformed prefixes", async () => {
  const malformedValues: unknown[] = [undefined, [], ["PG-2"], ["PG-1", "bad"]];

  for (const [index, visible_branch_path_prefix] of malformedValues.entries()) {
    const storyletId = `SLT-1${index}`;
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
      coverage_cache: { compatible_storylets: ["SLT-3"] }
    },
    extra: [
      storyRecord("storylet_record", "SLT-3", "storylets", {
        id: "SLT-3",
        story_id: "STORY-1",
        scope: { visibility: "branch_scoped", branch_id: "BR-1" },
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
      reviewed_at_page: "PG-2"
    },
    extra: [
      storyRecord("page_record", "PG-1", "pages", {
        id: "PG-1",
        story_id: "STORY-1",
        branch_path: ["PG-1"],
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
      reviewed_at_page: "PG-99"
    },
    extra: [
      storyRecord("page_record", "PG-99", "pages", {
        id: "PG-99",
        story_id: "STORY-1",
        branch_path: ["PG-1", "PG-99"],
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
    reference_id: "PG-99",
    reference_path: "state_snapshot.obligations_open[0].reviewed_at_page",
    referenced_file: "stories/test-story/_source/pages/PG-99.yaml",
    referenced_node_id: "test-story:PG-99",
    created_at_page: "PG-99"
  });
  assert.equal(leak.suggested_fix, "Replace PG-99 with a page in this branch's branch_path.");
});

test("recursive_reference_closure passes for PG references with no created_at_page field", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      state_snapshot: {
        ...stateSnapshot,
        relationships_current: ["SREL-1"]
      }
    },
    extra: [
      storyRecord("page_record", "PG-1", "pages", {
        id: "PG-1",
        story_id: "STORY-1",
        branch_path: ["PG-1"],
        state_snapshot: {}
      }),
      storyRecord("relationship_record_story", "SREL-1", "relationships", {
        id: "SREL-1",
        story_id: "STORY-1",
        created_at_page: "PG-2",
        last_meaningful_interaction: "PG-1"
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
        evidence: [{ artifact_id: "DA-1" }]
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
  assert.equal(verdicts[0]?.message, "PG-2 reaches missing story-local record SF-9999 via state_snapshot.obligations_open[0].dependent_facts[0]");
});

test("recursive_reference_closure skips envelopes without PG creates", () => {
  assert.equal(recursiveReferenceClosure.applies_to(context([], {
    run_mode: "pre-apply",
    patch_plan: { ...patchPlan(), patches: [] }
  })), false);
});

test("recursive_reference_closure fails for sibling input.choice_id page peers", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      input: {
        choice_id: "CHC-99",
        resolved_event_id: "SE-2"
      }
    },
    extra: [
      storyRecord("choice_record", "CHC-99", "choices", {
        id: "CHC-99",
        story_id: "STORY-1",
        created_at_page: "PG-99"
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const leak = verdicts.find((verdict) => verdict.code === "recursive_reference_closure.branch_leak");
  assert.ok(leak);
  assert.deepEqual(leak.detail, {
    reference_id: "CHC-99",
    reference_path: "input.choice_id",
    referenced_file: "stories/test-story/_source/choices/CHC-99.yaml",
    referenced_node_id: "test-story:CHC-99",
    created_at_page: "PG-99"
  });
});

test("recursive_reference_closure fails for sibling applied_event_ops page peers", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      applied_event_ops: ["SE-99"]
    },
    extra: [
      storyRecord("story_event_record", "SE-99", "events", {
        id: "SE-99",
        story_id: "STORY-1",
        event_kind: "selected_choice",
        created_at_page: "PG-99",
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
    reference_id: "SE-99",
    reference_path: "applied_event_ops[0]",
    referenced_file: "stories/test-story/_source/events/SE-99.yaml",
    referenced_node_id: "test-story:SE-99",
    created_at_page: "PG-99"
  });
});

test("recursive_reference_closure resolves promotion claim STSTAT and SREL source records", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      applied_event_ops: ["SE-3"]
    },
    extra: [
      storyRecord("story_event_record", "SE-3", "events", {
        id: "SE-3",
        story_id: "STORY-1",
        event_kind: "promotion_closeout",
        created_at_page: "PG-2",
        promotion_claims: [
          {
            source_record: "STSTAT-3",
            authority: "canon_candidate"
          },
          {
            source_record: "SREL-2",
            authority: "canon_candidate"
          }
        ]
      }),
      storyRecord("story_status_record", "STSTAT-3", "status", {
        id: "STSTAT-3",
        story_id: "STORY-1",
        created_at_page: "PG-2"
      }),
      storyRecord("relationship_record_story", "SREL-2", "relationships", {
        id: "SREL-2",
        story_id: "STORY-1",
        created_at_page: "PG-2"
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("recursive_reference_closure resolves SREL direction endpoints", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      state_snapshot: {
        active_records: {
          SREL: ["SREL-1"]
        }
      }
    },
    extra: [
      storyRecord("relationship_record_story", "SREL-1", "relationships", {
        id: "SREL-1",
        story_id: "STORY-1",
        created_at_page: "PG-2",
        direction: {
          kind: "directed",
          from: "STENT-1",
          to: "STENT-3"
        }
      }),
      storyRecord("story_entity_record", "STENT-1", "entities", {
        id: "STENT-1",
        story_id: "STORY-1",
        created_at_page: "PG-1"
      }),
      storyRecord("story_entity_record", "STENT-3", "entities", {
        id: "STENT-3",
        story_id: "STORY-1",
        created_at_page: "PG-2"
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("recursive_reference_closure fails for missing SREL direction endpoints", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      state_snapshot: {
        active_records: {
          SREL: ["SREL-1"]
        }
      }
    },
    extra: [
      storyRecord("relationship_record_story", "SREL-1", "relationships", {
        id: "SREL-1",
        story_id: "STORY-1",
        created_at_page: "PG-2",
        direction: {
          kind: "directed",
          from: "STENT-1",
          to: "STENT-3"
        }
      }),
      storyRecord("story_entity_record", "STENT-1", "entities", {
        id: "STENT-1",
        story_id: "STORY-1",
        created_at_page: "PG-1"
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const missing = verdicts.find((verdict) => verdict.code === "recursive_reference_closure.missing_record");
  assert.ok(missing);
  assert.deepEqual(missing.detail, {
    reference_id: "STENT-3",
    reference_path: "state_snapshot.active_records.SREL[0].direction.to"
  });
});

test("recursive_reference_closure fails for missing promotion claim STSTAT source records", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      applied_event_ops: ["SE-3"]
    },
    extra: [
      storyRecord("story_event_record", "SE-3", "events", {
        id: "SE-3",
        story_id: "STORY-1",
        event_kind: "promotion_closeout",
        created_at_page: "PG-2",
        promotion_claims: [
          {
            source_record: "STSTAT-9",
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
    reference_id: "STSTAT-9",
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
      emitted_choices: ["CHC-1"],
      state_snapshot: {
        ...stateSnapshot,
        active_records: {
          STENT: ["STENT-1"]
        }
      }
    },
    extra: [
      storyRecord("choice_record", "CHC-1", "choices", {
        id: "CHC-1",
        story_id: "STORY-1",
        created_at_page: "PG-2",
        grounded_in: {
          records: ["STENT-1"]
        },
        uses_fact: "SF-99"
      }),
      storyRecord("story_fact_record", "SF-99", "facts", {
        id: "SF-99",
        story_id: "STORY-1",
        created_at_page: "PG-99"
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const leak = verdicts.find((verdict) => verdict.code === "recursive_reference_closure.branch_leak");
  assert.ok(leak);
  assert.deepEqual(leak.detail, {
    reference_id: "SF-99",
    reference_path: "emitted_choices[0].uses_fact",
    referenced_file: "stories/test-story/_source/facts/SF-99.yaml",
    referenced_node_id: "test-story:SF-99",
    created_at_page: "PG-99"
  });
});

test("recursive_reference_closure accepts choices grounded in active records and visible affordances", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      emitted_choices: ["CHC-1"],
      state_snapshot: {
        ...stateSnapshot,
        active_records: {
          STENT: ["STENT-1"],
          STLOC: ["STLOC-1"],
          STOBJ: ["STOBJ-1"]
        },
        visible_affordances: [
          {
            ordinal: 0,
            label: "door to the alley",
            grounded_in: ["STLOC-1", "STOBJ-1"],
            available_to: ["STENT-1"],
            action_families: ["move"]
          }
        ]
      }
    },
    extra: [
      storyRecord("choice_record", "CHC-1", "choices", {
        id: "CHC-1",
        story_id: "STORY-1",
        created_at_page: "PG-2",
        grounded_in: {
          records: ["STENT-1", "STLOC-1"],
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
      emitted_choices: ["CHC-1"],
      state_snapshot: {
        ...stateSnapshot,
        active_records: {
          STENT: ["STENT-1"]
        }
      }
    },
    extra: [
      storyRecord("choice_record", "CHC-1", "choices", {
        id: "CHC-1",
        story_id: "STORY-1",
        created_at_page: "PG-2",
        grounded_in: {
          records: ["OBL-1"]
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
    page_id: "PG-2",
    choice_id: "CHC-1",
    reference_id: "OBL-1",
    reference_path: "emitted_choices[0].grounded_in.records[0]"
  });
});

test("recursive_reference_closure fails choices grounded in inactive STSTAT records", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      emitted_choices: ["CHC-1"],
      state_snapshot: {
        ...stateSnapshot,
        active_records: {
          STENT: ["STENT-1"]
        }
      }
    },
    extra: [
      storyRecord("choice_record", "CHC-1", "choices", {
        id: "CHC-1",
        story_id: "STORY-1",
        created_at_page: "PG-2",
        grounded_in: {
          records: ["STSTAT-1"]
        }
      }),
      storyRecord("story_status_record", "STSTAT-1", "status", {
        id: "STSTAT-1",
        story_id: "STORY-1",
        created_at_page: "PG-1",
        entity: "STENT-1",
        life: "alive",
        agency: "free",
        location: "STLOC-1"
      })
    ]
  }), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));

  const missing = verdicts.find((verdict) => verdict.code === "recursive_reference_closure.choice_grounding_missing_active_record");
  assert.ok(missing);
  assert.deepEqual(missing.detail, {
    page_id: "PG-2",
    choice_id: "CHC-1",
    reference_id: "STSTAT-1",
    reference_path: "emitted_choices[0].grounded_in.records[0]"
  });
});

test("recursive_reference_closure fails choices grounded in absent affordance ordinals", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    pageOverrides: {
      emitted_choices: ["CHC-1"],
      state_snapshot: {
        ...stateSnapshot,
        active_records: {
          STENT: ["STENT-1"]
        },
        visible_affordances: [
          {
            ordinal: 0,
            label: "door to the alley",
            grounded_in: ["STLOC-1"],
            available_to: ["STENT-1"],
            action_families: ["move"]
          }
        ]
      }
    },
    extra: [
      storyRecord("choice_record", "CHC-1", "choices", {
        id: "CHC-1",
        story_id: "STORY-1",
        created_at_page: "PG-2",
        grounded_in: {
          records: ["STENT-1"],
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
    page_id: "PG-2",
    choice_id: "CHC-1",
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
    storyRecord("page_record", "PG-2", "pages", {
      id: "PG-2",
      story_id: "STORY-1",
      branch_path: ["PG-1", "PG-2"],
      state_snapshot: stateSnapshot,
      created_at_page: "PG-2",
      ...options.pageOverrides
    }),
    storyRecord("story_fact_record", "SF-2", "facts", {
      id: "SF-2",
      story_id: "STORY-1",
      created_at_page: "PG-2",
      ...options.factOverrides
    }),
    storyRecord("obligation_record", "OBL-1", "obligations", {
      id: "OBL-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      dependent_facts: ["SF-2"],
      ...options.obligationOverrides
    }),
    storyRecord("story_location_record", "STLOC-1", "locations", {
      id: "STLOC-1",
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
      created_at_page: "PG-2"
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
    story_id: "STORY-1",
    scope: {
      visibility: "branch_prefix_scoped",
      branch_id: "BR-1",
      ...(visible_branch_path_prefix === undefined ? {} : { visible_branch_path_prefix })
    },
    created_at_page: null,
    provenance: { origin: "manual_authoring" },
    grounding: {
      compatible_turn_drivers: ["npc_action"],
      reason_to_exist: "Supports branch-prefix reference closure checks."
    }
  });
}

function patchPlan() {
  return {
    plan_id: "plan-recursive-reference-closure",
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
