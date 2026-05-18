import assert from "node:assert/strict";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import { noStoryStateInPlaceMutation } from "../../src/structural/no-story-state-in-place-mutation.js";
import { context, record } from "./helpers.js";

test("no_story_state_in_place_mutation is scoped to pre-apply story-state creates", () => {
  assert.equal(noStoryStateInPlaceMutation.applies_to(context([])), false);
  assert.equal(
    noStoryStateInPlaceMutation.applies_to(
      context([], { run_mode: "pre-apply", patch_plan: patchPlan([storyPatch("create_clk_record", "CLK-3")]) })
    ),
    true
  );
  assert.equal(
    noStoryStateInPlaceMutation.applies_to(
      context([], { run_mode: "pre-apply", patch_plan: patchPlan([{ op: "create_cf_record", payload: {} }]) })
    ),
    false
  );
});

test("no_story_state_in_place_mutation rejects story-bundle writes to an existing file", async () => {
  const ctx = context(
    [
      record("pressure_clock_record", "marla:CLK-2", "stories/marla/_source/clocks/CLK-2.yaml", {
        id: "CLK-2",
        status: "active"
      })
    ],
    {
      run_mode: "pre-apply",
      patch_plan: patchPlan([storyPatch("create_clk_record", "CLK-2")]),
      pre_apply_existing_files: ["stories/marla/_source/clocks/CLK-2.yaml"]
    }
  );

  const verdicts = await noStoryStateInPlaceMutation.run({}, ctx);

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "story_state_in_place_mutation");
  assert.match(verdicts[0]?.message ?? "", /existing story-state record CLK-2/);
});

test("no_story_state_in_place_mutation rejects intra-plan id collisions with different content", async () => {
  const ctx = context([], {
    run_mode: "pre-apply",
    patch_plan: patchPlan([
      storyPatch("create_clk_record", "CLK-3", { value: 3 }),
      storyPatch("create_clk_record", "CLK-3", { value: 4 })
    ]),
    pre_apply_existing_files: []
  });

  const verdicts = await noStoryStateInPlaceMutation.run({}, ctx);

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "story_state_in_place_mutation");
  assert.match(verdicts[0]?.message ?? "", /staged more than once/);
});

test("no_story_state_in_place_mutation accepts legitimate supersession to a fresh id", async () => {
  const ctx = context(
    [
      record("pressure_clock_record", "marla:CLK-2", "stories/marla/_source/clocks/CLK-2.yaml", {
        id: "CLK-2",
        status: "active"
      })
    ],
    {
      run_mode: "pre-apply",
      patch_plan: patchPlan([storyPatch("supersede_clk_record", "CLK-3", { supersedes: "CLK-2" })]),
      pre_apply_existing_files: ["stories/marla/_source/clocks/CLK-2.yaml"]
    }
  );

  const verdicts = await noStoryStateInPlaceMutation.run({}, ctx);

  assert.deepEqual(verdicts, []);
});

test("no_story_state_in_place_mutation ignores world-canon record writes", async () => {
  const ctx = context([], {
    run_mode: "pre-apply",
    patch_plan: patchPlan([
      {
        op: "create_cf_record",
        target_world: "test",
        target_file: "_source/canon/CF-1.yaml",
        payload: { cf_record: { id: "CF-1" } }
      }
    ]),
    pre_apply_existing_files: ["_source/canon/CF-1.yaml"]
  });

  assert.equal(noStoryStateInPlaceMutation.applies_to(ctx), false);
  assert.deepEqual(await noStoryStateInPlaceMutation.run({}, ctx), []);
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

function storyPatch(op: string, id: string, overrides: Record<string, unknown> = {}): unknown {
  const sourceDir = op.includes("stsec") ? "secrets" : op.includes("stq") ? "story-questions" : "clocks";
  return {
    op,
    target_world: "test",
    target_file: `stories/marla/_source/${sourceDir}/${id}.yaml`,
    payload: {
      story_slug: "marla",
      record: {
        id,
        status: "active",
        ...overrides
      }
    }
  };
}
