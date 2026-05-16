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

test("validatePatchPlanEnvelopeShape rejects misshapen world-canon create payload ids before validators run", () => {
  const cases = [
    {
      op: "create_cf_record",
      recordKey: "cf_record",
      idField: "id",
      targetFile: "_source/canon/CF-0001.yaml",
      payload: { cf_record: { title: "Missing ID" } },
      pattern: "^CF-\\d+$"
    },
    {
      op: "create_ch_record",
      recordKey: "ch_record",
      idField: "change_id",
      targetFile: "_source/change-log/CH-0001.yaml",
      payload: { ch_record: { id: "CH-0001" } },
      pattern: "^CH-\\d+$"
    },
    {
      op: "create_inv_record",
      recordKey: "inv_record",
      idField: "id",
      targetFile: "_source/invariants/ONT-0001.yaml",
      payload: { inv_record: {} },
      pattern: "^(ONT|CAU|DIS|SOC|AES)-\\d+$"
    },
    {
      op: "create_m_record",
      recordKey: "m_record",
      idField: "id",
      targetFile: "_source/mystery-reserve/M-0001.yaml",
      payload: { m_record: {} },
      pattern: "^M-\\d+$"
    },
    {
      op: "create_oq_record",
      recordKey: "oq_record",
      idField: "id",
      targetFile: "_source/open-questions/OQ-0001.yaml",
      payload: { oq_record: {} },
      pattern: "^OQ-\\d+$"
    },
    {
      op: "create_ent_record",
      recordKey: "ent_record",
      idField: "id",
      targetFile: "_source/entities/ENT-0001.yaml",
      payload: { ent_record: {} },
      pattern: "^ENT-\\d+$"
    },
    {
      op: "create_sec_record",
      recordKey: "sec_record",
      idField: "id",
      targetFile: "_source/institutions/SEC-INS-0001.yaml",
      payload: { sec_record: {} },
      pattern: "^SEC-[A-Z]{3}-\\d+$"
    }
  ];

  for (const entry of cases) {
    const plan = buildValidPatchPlan();
    plan.patches[0] = {
      op: entry.op,
      target_world: "seeded",
      target_file: entry.targetFile,
      payload: entry.payload
    } as unknown as ReturnType<typeof buildValidPatchPlan>["patches"][number];

    const error = validatePatchPlanEnvelopeShape(plan);
    const field = `patch_plan.patches[0].payload.${entry.recordKey}.${entry.idField}`;

    assert.ok(error !== null, `${entry.op} should fail envelope-shape validation`);
    assert.deepEqual(error, {
      code: "invalid_input",
      message: `${field} must be a non-empty string matching ${entry.pattern}.`,
      details: { field }
    });
  }
});

test("validatePatchPlanEnvelopeShape rejects missing inner world-canon create payload objects", () => {
  const plan = buildValidPatchPlan();
  plan.patches[0] = {
    op: "create_ch_record",
    target_world: "seeded",
    target_file: "_source/change-log/CH-0001.yaml",
    payload: {}
  } as unknown as ReturnType<typeof buildValidPatchPlan>["patches"][number];

  const error = validatePatchPlanEnvelopeShape(plan);

  assert.deepEqual(error, {
    code: "invalid_input",
    message: "patch_plan.patches[0].payload.ch_record must be an object.",
    details: { field: "patch_plan.patches[0].payload.ch_record" }
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
