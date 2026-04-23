import assert from "node:assert/strict";
import test from "node:test";

import { validatePatchPlan } from "../../src/tools/validate-patch-plan";

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

test("validatePatchPlan returns validator_unavailable for a well-formed Phase 1 plan", async () => {
  const result = await validatePatchPlan({ patch_plan: buildValidPatchPlan() });

  assert.deepEqual(result, {
    code: "validator_unavailable",
    message: "SPEC-04 validator framework not yet built; activates in Phase 2 per SPEC-08."
  });
});

test("validatePatchPlan rejects a malformed plan before the Phase 1 stub", async () => {
  const result = await validatePatchPlan({
    patch_plan: {
      ...buildValidPatchPlan(),
      plan_id: ""
    }
  });

  assert.ok("code" in result);
  assert.equal(result.code, "invalid_input");
  assert.equal(result.details?.field, "patch_plan.plan_id");
});

test("validatePatchPlan rejects an empty patch list before the Phase 1 stub", async () => {
  const result = await validatePatchPlan({
    patch_plan: {
      ...buildValidPatchPlan(),
      patches: []
    }
  });

  assert.ok("code" in result);
  assert.equal(result.code, "invalid_input");
  assert.equal(result.details?.field, "patch_plan.patches");
});
