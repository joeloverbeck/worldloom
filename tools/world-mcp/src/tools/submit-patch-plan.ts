import {
  submitPatchPlan,
  type EngineError,
  type PatchReceipt,
  type ValidatorRunReceipt
} from "@worldloom/patch-engine";
import {
  validatePatchPlan as runPreApplyValidators,
  type ValidatorExecution
} from "@worldloom/validators";

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

  const envelope = args.patch_plan as unknown as EnginePatchPlanEnvelope;

  return submitPatchPlan(envelope, args.approval_token, {
    preApplyValidator: async () => {
      try {
        const { verdicts, executions } = await runPreApplyValidators(envelope);
        const validators_run = projectExecutionsToReceipt(executions);
        const failures = verdicts.filter((verdict) => verdict.severity === "fail");
        if (failures.length > 0) {
          return {
            ok: false,
            code: "validator_failed",
            message: `Pre-apply validators reported ${failures.length} failure(s).`,
            detail: { verdicts: failures },
            validators_run
          };
        }
        return { ok: true, validators_run };
      } catch (err) {
        return {
          ok: false,
          code: "validator_error",
          message: err instanceof Error ? err.message : String(err)
        };
      }
    }
  });
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
