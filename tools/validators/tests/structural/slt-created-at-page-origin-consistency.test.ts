import assert from "node:assert/strict";
import test from "node:test";

import { sltCreatedAtPageOriginConsistency } from "../../src/structural/slt-created-at-page-origin-consistency.js";
import { context, record } from "./helpers.js";

test("slt_created_at_page_origin_consistency rejects runtime_jit storylets without a page id", async () => {
  const verdicts = await sltCreatedAtPageOriginConsistency.run(
    undefined,
    context([storylet("SLT-1", { created_at_page: null, provenance: { origin: "runtime_jit" } })])
  );

  assert.ok(verdicts.some((verdict) => verdict.code === "slt_created_at_page_origin_mismatch"));
});

test("slt_created_at_page_origin_consistency accepts author_batch storylets with null created_at_page", async () => {
  const verdicts = await sltCreatedAtPageOriginConsistency.run(
    undefined,
    context([storylet("SLT-2", { created_at_page: null, provenance: { origin: "author_batch" } })])
  );

  assert.deepEqual(verdicts, []);
});

test("slt_created_at_page_origin_consistency accepts bootstrap_seed storylets with a page id", async () => {
  const verdicts = await sltCreatedAtPageOriginConsistency.run(
    undefined,
    context([storylet("SLT-3", { created_at_page: "PG-1", provenance: { origin: "bootstrap_seed" } })])
  );

  assert.deepEqual(verdicts, []);
});

test("slt_created_at_page_origin_consistency is pre-apply scoped to create_slt_record plans", () => {
  assert.equal(
    sltCreatedAtPageOriginConsistency.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") })),
    false
  );
  assert.equal(
    sltCreatedAtPageOriginConsistency.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_slt_record") })),
    true
  );
});

function storylet(id: string, overrides: Record<string, unknown> = {}) {
  return {
    ...record("storylet_record", `test-story:${id}`, `stories/test-story/_source/storylets/${id}.yaml`, {
      id,
      story_id: "STORY-1",
      scope: {
        visibility: "global_author_pool",
        branch_id: null
      },
      created_at_page: null,
      title: "Test storylet",
      move_family: "orient",
      preconditions: {
        hard: [{ pred: "has_affordance", args: ["decide"] }],
        soft: []
      },
      beats: [{ beat_id: "B1", function: "setup", instruction: "Frame the choice." }],
      effects: {
        create: [],
        supersede: [],
        close: []
      },
      exit_options: [
        {
          action_family: "decide",
          surface_hint: "Choose a direction.",
          likely_effects: []
        }
      ],
      saliency: {
        urgency: "medium",
        cooldown_pages: 0,
        tags: []
      },
      mystery_policy: {
        forbidden_resolutions: [],
        allowed_authority: "none"
      },
      provenance: {
        origin: "author_batch"
      },
      grounding: {
        compatible_turn_drivers: ["player_action"],
        reason_to_exist: "Supports authored orientation pressure in the fixture."
      },
      ...overrides
    }),
    story_slug: "test-story"
  };
}

function patchPlan(op: "create_pg_record" | "create_slt_record") {
  return {
    plan_id: "plan-slt-created-at-page",
    target_world: "test",
    approval_token: "placeholder",
    verdict: "story_audit",
    originating_skill: "test",
    expected_id_allocations: {},
    patches: [{ op, target_world: "test", payload: { story_slug: "test-story", record: { id: "SLT-1" } } }]
  };
}
