import assert from "node:assert/strict";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import { pageAffordanceIntegrity } from "../../src/structural/page-affordance-integrity.js";
import { context, record } from "./helpers.js";

test("page_affordance_integrity is scoped to full-world and pre-apply PG creates", () => {
  assert.equal(pageAffordanceIntegrity.applies_to(context([])), true);
  assert.equal(
    pageAffordanceIntegrity.applies_to(context([], {
      run_mode: "pre-apply",
      patch_plan: patchPlan([storyPatch("create_pg_record", "PG-1")])
    })),
    true
  );
  assert.equal(
    pageAffordanceIntegrity.applies_to(context([], {
      run_mode: "pre-apply",
      patch_plan: patchPlan([storyPatch("create_se_record", "SE-1")])
    })),
    false
  );
});

test("page_affordance_integrity rejects duplicate ordinals", async () => {
  const ctx = context([
    page("PG-1", {
      visible_affordances: [
        affordance({ ordinal: 2 }),
        affordance({ ordinal: 2, label: "second exit" })
      ]
    })
  ]);

  const verdicts = await pageAffordanceIntegrity.run({}, ctx);

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "page_affordance_duplicate_ordinal");
  assert.match(verdicts[0]?.message ?? "", /repeats ordinal 2/);
});

test("page_affordance_integrity rejects inactive grounded_in references", async () => {
  const ctx = context([
    page("PG-1", {
      active_records: activeRecords({ STOBJ: [] }),
      visible_affordances: [
        affordance({ grounded_in: ["STOBJ-4"] })
      ]
    })
  ]);

  const verdicts = await pageAffordanceIntegrity.run({}, ctx);

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "page_affordance_inactive_grounding");
  assert.match(verdicts[0]?.message ?? "", /STOBJ-4/);
});

test("page_affordance_integrity rejects inactive available_to references", async () => {
  const ctx = context([
    page("PG-1", {
      active_records: activeRecords({ STENT: [] }),
      visible_affordances: [
        affordance({ available_to: ["STENT-1"] })
      ]
    })
  ]);

  const verdicts = await pageAffordanceIntegrity.run({}, ctx);

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "page_affordance_inactive_available_to");
  assert.match(verdicts[0]?.message ?? "", /STENT-1/);
});

test("page_affordance_integrity rejects unknown action families", async () => {
  const ctx = context([
    page("PG-1", {
      visible_affordances: [
        affordance({ action_families: ["fly"] })
      ]
    })
  ]);

  const verdicts = await pageAffordanceIntegrity.run({}, ctx);

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "page_affordance_unknown_action_family");
  assert.match(verdicts[0]?.message ?? "", /fly/);
});

test("page_affordance_integrity accepts active references and enum action families", async () => {
  const ctx = context([
    page("PG-1", {
      visible_affordances: [
        affordance({ ordinal: 0, grounded_in: ["STLOC-1"], available_to: ["STENT-1"], action_families: ["move"] }),
        affordance({ ordinal: 1, grounded_in: ["STOBJ-1"], available_to: ["STENT-2"], action_families: ["investigate", "use"] })
      ]
    })
  ]);

  assert.deepEqual(await pageAffordanceIntegrity.run({}, ctx), []);
});

function patchPlan(patches: unknown[]): PatchPlanEnvelope {
  return {
    plan_id: "plan-001",
    target_world: "test",
    approval_token: "token",
    verdict: "ACCEPT",
    originating_skill: "branching-story-turn-cycle",
    expected_id_allocations: {},
    patches
  } as unknown as PatchPlanEnvelope;
}

function storyPatch(op: string, id: string): unknown {
  return {
    op,
    target_world: "test",
    target_file: `stories/marla/_source/pages/${id}.yaml`,
    payload: {
      story_slug: "marla",
      record: { id }
    }
  };
}

function page(id: string, overrides: Record<string, unknown> = {}) {
  return {
    ...record("page_record", `marla:${id}`, `stories/marla/_source/pages/${id}.yaml`, {
      id,
      story_id: "STORY-1",
      state_snapshot: {
        active_records: activeRecords(),
        visible_affordances: [
          affordance()
        ],
        ...overrides
      }
    }),
    story_slug: "marla"
  };
}

function activeRecords(overrides: Record<string, string[]> = {}): Record<string, string[]> {
  return {
    STENT: ["STENT-1", "STENT-2"],
    STLOC: ["STLOC-1"],
    STOBJ: ["STOBJ-1"],
    ...overrides
  };
}

function affordance(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ordinal: 0,
    label: "door to the alley",
    grounded_in: ["STLOC-1"],
    available_to: ["STENT-1"],
    action_families: ["move"],
    ...overrides
  };
}
