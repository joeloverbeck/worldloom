import {
  submitPatchPlan,
  type EngineError,
  type PatchReceipt
} from "@worldloom/patch-engine";

import { createMcpError, type McpError } from "../errors";

import {
  type PatchPlanEnvelope,
  validatePatchPlanEnvelopeShape
} from "./_shared";

type EnginePatchPlanEnvelope = Parameters<typeof submitPatchPlan>[0];

export interface SubmitPatchPlanArgs {
  patch_plan: PatchPlanEnvelope;
  approval_token: string;
}

function invalidInput(message: string, field: string): McpError {
  return createMcpError("invalid_input", message, { field });
}

export async function handleSubmitPatchPlanTool(
  args: SubmitPatchPlanArgs
): Promise<PatchReceipt | EngineError | McpError> {
  if (typeof args !== "object" || args === null || !("patch_plan" in args)) {
    return invalidInput("patch_plan is required.", "patch_plan");
  }

  const shapeError = validatePatchPlanEnvelopeShape(args.patch_plan);
  if (shapeError !== null) {
    return shapeError;
  }

  if (typeof args.approval_token !== "string" || args.approval_token.trim().length === 0) {
    return invalidInput("approval_token must be a non-empty string.", "approval_token");
  }

  return submitPatchPlan(args.patch_plan as unknown as EnginePatchPlanEnvelope, args.approval_token);
}
