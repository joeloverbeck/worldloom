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

test("recursive_reference_closure fails for sibling-branch leakage at nested depth", async () => {
  const verdicts = await recursiveReferenceClosure.run(undefined, context(records({
    factOverrides: {
      evidence: [{ event_id: "SE-0009" }]
    },
    extra: [
      storyRecord("story_event_record", "SE-0009", "events", {
        id: "SE-0009",
        story_id: "STORY-001",
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
        provenance: { origin: "bootstrap_seed", created_at_page: null },
        visibility: { scope: "global_author_pool" }
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

function records(options: {
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
      created_at_page: "PG-0002"
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
