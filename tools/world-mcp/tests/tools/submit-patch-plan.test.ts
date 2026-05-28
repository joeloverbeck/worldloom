import assert from "node:assert/strict";
import test from "node:test";

import { readOrCreateSecret, signToken } from "../../src/approval/token.js";
import { canonicalOpHash } from "../../src/package-interop.js";
import { handleSubmitPatchPlanTool } from "../../src/tools/submit-patch-plan.js";
import { createTempRepoRoot, destroyTempRepoRoot, seedWorld } from "./_shared.js";
import type { PatchOperation } from "@worldloom/patch-engine";

function buildValidPatchPlan() {
  return {
    plan_id: "plan-001",
    target_world: "seeded",
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "canon-addition",
    expected_id_allocations: {},
    patches: [
      {
        op: "insert_before_node",
        target_world: "seeded",
        target_file: "GEOGRAPHY.md",
        payload: { body: "Brinewick expands." }
      }
    ]
  };
}

function buildPagePlanPatchPlan() {
  return {
    plan_id: "plan-page-001",
    target_world: "seeded",
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "branching-story-turn-cycle",
    expected_id_allocations: {},
    patches: [
      {
        op: "create_pg_record",
        target_world: "seeded",
        target_file: "stories/test-story/_source/pages/PG-1.yaml",
        payload: {
          story_slug: "test-story",
          record: {
            id: "PG-1",
            story_id: "STORY-1",
            parent_page_id: null,
            branch_id: "BR-1",
            branch_path: ["PG-1"],
            turn_index: 0,
            input: { choice_id: null, manual_action_text: null, resolved_event_id: null },
            state_hash_parent: null,
            state_hash: "0000000000000000000000000000000000000000000000000000000000000002",
            state_snapshot: { active_records: {}, visible_affordances: [] },
            plan: {
              path: "pages-prose-plans/PG-1.md",
              plan_hash: "0000000000000000000000000000000000000000000000000000000000000001"
            },
            prose_plan_path: "pages-prose-plans/PG-1.md",
            emitted_choices: [],
            validation_trace: {
              input_legality: "PASS: fixture input is null for a root page.",
              parent_snapshot_compatibility: "PASS: no parent page exists for this fixture.",
              mystery_invariant_firewall: "PASS: fixture resolves no mysteries.",
              branch_isolation: "PASS: fixture creates only the root branch path.",
              append_only_delta: "PASS: fixture has no in-place mutations.",
              consequence_or_terminal: "PASS: fixture is a root-page validator probe.",
              plan_grounding: "PASS: fixture page plan is the validator target.",
              canon_promotion_hold: "NOT_APPLICABLE: fixture has no promotion claim.",
              turn_driver_lawfulness: "NOT_APPLICABLE: fixture has no turn driver."
            }
          }
        }
      }
    ]
  };
}

function signPlan(plan: ReturnType<typeof buildPagePlanPatchPlan>, worldRoot: string): string {
  return signToken(
    {
      plan_id: plan.plan_id,
      world_slug: plan.target_world,
      patch_hashes: plan.patches.map((patch) => canonicalOpHash(patch as PatchOperation))
    },
    readOrCreateSecret(worldRoot)
  );
}

function seedEmptyWorld(root: string): void {
  seedWorld(root, { worldSlug: "seeded", nodes: [] });
}

function assertInvalidInput(result: Awaited<ReturnType<typeof handleSubmitPatchPlanTool>>, field: string): void {
  assert.ok("code" in result);
  assert.equal(result.code, "invalid_input");
  assert.ok("details" in result);
  assert.equal(result.details?.field, field);
}

test("handleSubmitPatchPlanTool delegates operation validation to the patch engine", async () => {
  const result = await handleSubmitPatchPlanTool({
    patch_plan: buildValidPatchPlan(),
    approval_token: "unused-for-delegation-proof"
  });

  assert.ok("code" in result);
  assert.equal(result.code, "envelope_shape_invalid");
});

test("handleSubmitPatchPlanTool rejects a malformed plan before engine delegation", async () => {
  const result = await handleSubmitPatchPlanTool({
    patch_plan: {
      ...buildValidPatchPlan(),
      patches: [{ payload: {}, target_world: "seeded", target_file: "GEOGRAPHY.md" }] as unknown as ReturnType<
        typeof buildValidPatchPlan
      >["patches"]
    },
    approval_token: "unused-for-validation-proof"
  });

  assertInvalidInput(result, "patch_plan.patches[0].op");
});

test("handleSubmitPatchPlanTool rejects a missing approval token before engine delegation", async () => {
  const result = await handleSubmitPatchPlanTool({
    patch_plan: buildValidPatchPlan(),
    approval_token: ""
  });

  assertInvalidInput(result, "approval_token");
});
