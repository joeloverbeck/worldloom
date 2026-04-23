import assert from "node:assert/strict";
import test from "node:test";

import { submitPatchPlan } from "../../src/tools/submit-patch-plan";

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

test("submitPatchPlan returns phase1_stub for a well-formed Phase 1 plan", async () => {
  const result = await submitPatchPlan({
    patch_plan: buildValidPatchPlan(),
    approval_token: "unused-in-phase-1"
  });

  assert.deepEqual(result, {
    code: "phase1_stub",
    message: "Engine integration activates in Phase 2 per SPEC-08."
  });
});

test("submitPatchPlan rejects a malformed plan before the Phase 1 stub", async () => {
  const result = await submitPatchPlan({
    patch_plan: {
      ...buildValidPatchPlan(),
      patches: [{ payload: {}, target_world: "seeded", target_file: "GEOGRAPHY.md" }] as unknown as ReturnType<
        typeof buildValidPatchPlan
      >["patches"]
    },
    approval_token: "unused-in-phase-1"
  });

  assert.ok("code" in result);
  assert.equal(result.code, "invalid_input");
  assert.equal(result.details?.field, "patch_plan.patches[0].op");
});

test("submitPatchPlan rejects a missing approval token before the Phase 1 stub", async () => {
  const result = await submitPatchPlan({
    patch_plan: buildValidPatchPlan(),
    approval_token: ""
  });

  assert.ok("code" in result);
  assert.equal(result.code, "invalid_input");
  assert.equal(result.details?.field, "approval_token");
});
