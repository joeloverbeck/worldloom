import { createMcpError, type McpError } from "../errors";
import { validatePatchPlan as runValidatePatchPlan } from "@worldloom/validators";
import type { Verdict } from "@worldloom/validators/public/types";

import {
  type PatchPlanEnvelope,
  validatePatchPlanEnvelopeShape
} from "./_shared";

export interface ValidatePatchPlanArgs {
  patch_plan: PatchPlanEnvelope;
}

export interface ValidatePatchPlanResponse {
  verdicts: Verdict[];
}

function invalidInput(message: string, field: string): McpError {
  return createMcpError("invalid_input", message, { field });
}

export async function validatePatchPlan(
  args: ValidatePatchPlanArgs
): Promise<ValidatePatchPlanResponse | McpError> {
  if (typeof args !== "object" || args === null || !("patch_plan" in args)) {
    return invalidInput("patch_plan is required.", "patch_plan");
  }

  const shapeError = validatePatchPlanEnvelopeShape(args.patch_plan);
  if (shapeError !== null) {
    return shapeError;
  }

  return runValidatePatchPlan(args.patch_plan as unknown as Parameters<typeof runValidatePatchPlan>[0]);
}
