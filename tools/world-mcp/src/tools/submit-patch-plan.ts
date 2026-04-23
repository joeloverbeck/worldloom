import { createMcpError, type McpError } from "../errors";

import {
  type PatchPlanEnvelope,
  validatePatchPlanEnvelopeShape
} from "./_shared";

export interface PatchReceipt {
  plan_id: string;
  applied_at: string;
  files_written: {
    file_path: string;
    prior_hash: string;
    new_hash: string;
    ops_applied: number;
  }[];
  new_nodes: {
    node_id: string;
    node_type: string;
    file_path: string;
  }[];
  id_allocations_consumed: {
    cf_ids?: string[];
    ch_ids?: string[];
    pa_ids?: string[];
  };
  index_sync_duration_ms: number;
}

export interface SubmitPatchPlanArgs {
  patch_plan: PatchPlanEnvelope;
  approval_token: string;
}

function invalidInput(message: string, field: string): McpError {
  return createMcpError("invalid_input", message, { field });
}

function patchEngineLooksBuilt(): boolean {
  // Phase 2 will replace this sentinel branch with a real runtime import.
  return false;
}

export async function submitPatchPlan(
  args: SubmitPatchPlanArgs
): Promise<PatchReceipt | McpError> {
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

  if (patchEngineLooksBuilt()) {
    // TODO(SPEC-03): replace the sentinel with:
    // const { submitPatchPlan } = await import("@worldloom/patch-engine");
    // return submitPatchPlan(args.patch_plan, args.approval_token);
  }

  return createMcpError(
    "phase1_stub",
    "Engine integration activates in Phase 2 per SPEC-08."
  );
}
