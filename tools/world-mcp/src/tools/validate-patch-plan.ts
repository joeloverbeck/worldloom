import { createMcpError, type McpError } from "../errors";
import type { ValidatorRunReceipt } from "@worldloom/patch-engine";
import { validatePatchPlan as runValidatePatchPlan } from "@worldloom/validators";
import type { ValidatorExecution, Verdict } from "@worldloom/validators/public/types";

import {
  type PatchPlanEnvelope,
  validatePatchPlanEnvelopeShape
} from "./_shared";

export interface ValidatePatchPlanArgs {
  patch_plan: PatchPlanEnvelope;
}

export type ValidatePatchPlanResponse =
  | { status: "pass"; verdicts: Verdict[]; validators_run: ValidatorRunReceipt[] }
  | { status: "fail"; verdicts: Verdict[]; validators_run: ValidatorRunReceipt[] }
  | { status: "skipped"; reason: string; verdicts: []; validators_run: []; details?: Record<string, unknown> };

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
    if (shapeError.details !== undefined && "additional_errors" in shapeError.details) {
      return {
        status: "skipped",
        reason: shapeError.message,
        verdicts: [],
        validators_run: [],
        details: shapeError.details
      };
    }
    return { status: "skipped", reason: shapeError.message, verdicts: [], validators_run: [] };
  }

  const result = await runValidatePatchPlan(
    args.patch_plan as unknown as Parameters<typeof runValidatePatchPlan>[0]
  );
  const hasFailures = result.verdicts.some((verdict) => verdict.severity === "fail");

  return {
    status: hasFailures ? "fail" : "pass",
    verdicts: result.verdicts,
    validators_run: projectExecutionsToReceipt(result.executions)
  };
}

function projectExecutionsToReceipt(executions: ValidatorExecution[]): ValidatorRunReceipt[] {
  return executions.map((execution) => {
    const entry: ValidatorRunReceipt = {
      validator_name: execution.name,
      status: execution.status,
      duration_ms: execution.duration_ms
    };
    if (execution.detail !== undefined) {
      entry.detail = execution.detail;
    }
    return entry;
  });
}
