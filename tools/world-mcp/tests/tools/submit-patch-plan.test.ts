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

test("handleSubmitPatchPlanTool rejects malformed page_plan_drafts before engine delegation", async () => {
  const result = await handleSubmitPatchPlanTool({
    patch_plan: buildValidPatchPlan(),
    approval_token: "unused-for-validation-proof",
    page_plan_drafts: [{ path: "not-a-page-plan-path.md", content: "draft" }]
  });

  assertInvalidInput(result, "page_plan_drafts");
  assert.match((result as { message: string }).message, /must match stories\/<slug>\/pages-prose-plans\/PG-<integer>\.md/);
});

test("handleSubmitPatchPlanTool passes attached page-plan drafts into pre-apply validators", async () => {
  const root = createTempRepoRoot();
  seedEmptyWorld(root);

  try {
    const plan = buildPagePlanPatchPlan();
    const result = await handleSubmitPatchPlanTool({
      patch_plan: plan,
      approval_token: signPlan(plan, root),
      worldRoot: root,
      page_plan_drafts: [
        {
          path: "stories/test-story/pages-prose-plans/PG-1.md",
          content: [
            "## 1. Story Kernel Excerpt",
            "",
            "This prose-facing section leaks CF-1, BEL-2, and STENT-3."
          ].join("\n")
        }
      ]
    });

    assert.ok("code" in result);
    assert.equal(result.code, "validator_failed");
    assert.ok(
      Array.isArray(result.validators_run) &&
        result.validators_run.some(
          (entry) =>
            entry.validator_name === "page_plan_body_engine_vocabulary_cleanliness" &&
            entry.status === "fail"
        )
    );
    const detail = result.detail as { verdicts?: Array<{ code?: string }> } | undefined;
    assert.ok(
      Array.isArray(detail?.verdicts) &&
        detail.verdicts.some(
          (verdict) => verdict.code === "page_plan_body_engine_vocabulary_cleanliness.fail"
        )
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("handleSubmitPatchPlanTool does not read page-plan body bytes when drafts are absent", async () => {
  const root = createTempRepoRoot();
  seedEmptyWorld(root);

  try {
    const plan = {
      ...buildPagePlanPatchPlan(),
      plan_id: "plan-page-no-drafts-001"
    };
    const result = await handleSubmitPatchPlanTool({
      patch_plan: plan,
      approval_token: signPlan(plan, root),
      worldRoot: root
    });

    assert.ok("code" in result);
    assert.equal(result.code, "validator_failed");
    const detail = result.detail as { verdicts?: Array<{ code?: string; validator?: string }> } | undefined;
    assert.ok(
      !detail?.verdicts?.some(
        (verdict) =>
          verdict.validator === "page_plan_body_engine_vocabulary_cleanliness" ||
          verdict.code === "page_plan_body_engine_vocabulary_cleanliness.fail"
      )
    );
    assert.ok(
      Array.isArray(result.validators_run) &&
        result.validators_run.some(
          (entry) =>
            entry.validator_name === "page_plan_body_engine_vocabulary_cleanliness" &&
            entry.status === "pass"
        )
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});
