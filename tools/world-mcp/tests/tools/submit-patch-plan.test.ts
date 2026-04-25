import assert from "node:assert/strict";
import test from "node:test";

import { handleSubmitPatchPlanTool } from "../../src/tools/submit-patch-plan";

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
