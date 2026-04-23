import { createMcpError, type McpError } from "../errors";

import {
  type PatchPlanEnvelope,
  validatePatchPlanEnvelopeShape
} from "./_shared";

export interface Verdict {
  validator: string;
  severity: "fail" | "warn" | "info";
  code: string;
  message: string;
  location: {
    file: string;
    line_range?: [number, number];
    node_id?: string;
  };
  suggested_fix?: string;
}

export interface ValidatePatchPlanArgs {
  patch_plan: PatchPlanEnvelope;
}

export interface ValidatePatchPlanResponse {
  verdicts: Verdict[];
}

function invalidInput(message: string, field: string): McpError {
  return createMcpError("invalid_input", message, { field });
}

function validatorsPackageLooksBuilt(): boolean {
  // Phase 2 will replace this sentinel branch with a real runtime import.
  return false;
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

  if (validatorsPackageLooksBuilt()) {
    // TODO(SPEC-04): replace the sentinel with:
    // const { validatePatchPlan } = await import("@worldloom/validators");
    // return validatePatchPlan(args.patch_plan);
  }

  return createMcpError(
    "validator_unavailable",
    "SPEC-04 validator framework not yet built; activates in Phase 2 per SPEC-08."
  );
}
