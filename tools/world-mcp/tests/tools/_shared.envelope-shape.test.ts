import assert from "node:assert/strict";
import test from "node:test";

import type { McpError } from "../../src/errors";
import { validatePatchPlanEnvelopeShape } from "../../src/tools/_shared";

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
        op: "create_cf_record",
        target_world: "seeded",
        target_file: "_source/canon/CF-0001.yaml",
        payload: { cf_record: { id: "CF-0001" } }
      }
    ]
  };
}

function additionalErrors(error: McpError): McpError[] {
  assert.ok(error.details !== undefined);
  assert.ok(Array.isArray(error.details.additional_errors));
  return error.details.additional_errors as McpError[];
}

test("validatePatchPlanEnvelopeShape keeps single-error McpError shape unchanged", () => {
  const plan = buildValidPatchPlan();
  plan.patches[0]!.target_file = "";

  const error = validatePatchPlanEnvelopeShape(plan);

  assert.deepEqual(error, {
    code: "invalid_input",
    message: "patch_plan.patches[0].target_file must be a non-empty string.",
    details: { field: "patch_plan.patches[0].target_file" }
  });
});

test("validatePatchPlanEnvelopeShape reports all patch shape errors while preserving the first field", () => {
  const plan = buildValidPatchPlan();
  plan.patches = [
    { op: "", target_world: "seeded", target_file: "", payload: {} },
    { op: "create_ch_record", target_world: "", target_file: "_source/change-log/CH-0001.yaml" },
    "not-an-object"
  ] as unknown as ReturnType<typeof buildValidPatchPlan>["patches"];

  const error = validatePatchPlanEnvelopeShape(plan);

  assert.ok(error !== null);
  assert.equal(error.code, "invalid_input");
  assert.equal(error.details?.field, "patch_plan.patches[0].op");

  const remaining = additionalErrors(error);
  assert.deepEqual(
    remaining.map((entry) => entry.details?.field),
    [
      "patch_plan.patches[0].target_file",
      "patch_plan.patches[1].target_world",
      "patch_plan.patches[1].payload",
      "patch_plan.patches[2]"
    ]
  );
});
