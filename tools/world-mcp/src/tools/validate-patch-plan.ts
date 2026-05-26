import { existsSync } from "node:fs";
import path from "node:path";

import { createMcpError, type McpError } from "../errors.js";
import type { ValidatorRunReceipt } from "@worldloom/patch-engine";
import type { ValidatorExecution, Verdict } from "@worldloom/validators/public/types";
import {
  checkIdAllocationRace,
  openExistingIndex,
  OPERATION_KINDS,
  validatePatchPlan as runValidatePatchPlan
} from "../package-interop.js";

import {
  type PatchPlanEnvelope,
  validatePatchPlanEnvelopeShape
} from "./_shared.js";

const OPERATION_KIND_SET = new Set<string>(OPERATION_KINDS);

export interface ValidatePatchPlanArgs {
  patch_plan: PatchPlanEnvelope;
  worldRoot?: string;
  page_plan_drafts?: ReadonlyArray<{ path: string; content: string }>;
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

  const unsupportedOp = args.patch_plan.patches.findIndex((patch) => !OPERATION_KIND_SET.has(patch.op));
  if (unsupportedOp !== -1) {
    return {
      status: "skipped",
      reason: `patch_plan.patches[${unsupportedOp}].op must be a supported operation kind.`,
      verdicts: [],
      validators_run: []
    };
  }

  const draftsShapeError = validatePagePlanDraftsShape(args.page_plan_drafts);
  if (draftsShapeError !== null) {
    return invalidInput(draftsShapeError, "page_plan_drafts");
  }

  const runOpts: { worldRoot?: string; pagePlanDrafts?: ReadonlyArray<{ path: string; content: string }> } = {};
  if (args.worldRoot !== undefined) {
    runOpts.worldRoot = args.worldRoot;
  }
  if (args.page_plan_drafts !== undefined && args.page_plan_drafts.length > 0) {
    runOpts.pagePlanDrafts = args.page_plan_drafts;
  }

  const result = await runValidatePatchPlan(
    args.patch_plan as unknown as Parameters<typeof runValidatePatchPlan>[0],
    runOpts
  );
  const allocationRace = runIdAllocationRaceCheck(args.patch_plan, args.worldRoot);
  const verdicts = allocationRace.ok
    ? result.verdicts
    : [...result.verdicts, ...allocationRace.failures.map(allocationRaceFailureToVerdict)];
  const validatorsRun = [
    ...projectExecutionsToReceipt(result.executions),
    allocationRace.execution
  ];
  const hasFailures = verdicts.some((verdict) => verdict.severity === "fail");

  return {
    status: hasFailures ? "fail" : "pass",
    verdicts,
    validators_run: validatorsRun
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

function runIdAllocationRaceCheck(envelope: PatchPlanEnvelope, worldRoot?: string): {
  ok: boolean;
  failures: Array<{
    key: string;
    expected: string;
    current?: string;
    story_slug?: string;
    message: string;
  }>;
  execution: ValidatorRunReceipt;
} {
  const startedAt = Date.now();
  const db = openExistingIndex(worldRoot ?? resolveRepoRootForWorld(envelope.target_world), envelope.target_world);
  try {
    const result = checkIdAllocationRace(
      db,
      envelope as unknown as Parameters<typeof checkIdAllocationRace>[1]
    );
    return {
      ok: result.ok,
      failures: result.ok ? [] : result.failures,
      execution: {
        validator_name: "id_allocation_race",
        status: result.ok ? "pass" : "fail",
        duration_ms: Date.now() - startedAt
      }
    };
  } finally {
    db.close();
  }
}

function allocationRaceFailureToVerdict(failure: {
  key: string;
  expected: string;
  current?: string;
  story_slug?: string;
  message: string;
}): Verdict {
  const details = [
    `key=${failure.key}`,
    `expected=${failure.expected}`,
    failure.current === undefined ? undefined : `current=${failure.current}`,
    failure.story_slug === undefined ? undefined : `story_slug=${failure.story_slug}`
  ].filter((entry): entry is string => entry !== undefined);

  return {
    validator: "id_allocation_race",
    severity: "fail",
    code: "id_allocation_race",
    message: `${failure.message} (${details.join(", ")})`,
    location: {
      file: "patch_plan.expected_id_allocations"
    },
    suggested_fix: "Re-run allocate_next_id for the offending id class, update the envelope, then re-validate and re-sign."
  };
}

const PAGE_PLAN_DRAFT_PATH = /^stories\/[^/]+\/pages-prose-plans\/PG-(0|[1-9][0-9]*)\.md$/;

function validatePagePlanDraftsShape(value: unknown): string | null {
  if (value === undefined) {
    return null;
  }
  if (!Array.isArray(value)) {
    return "page_plan_drafts must be an array of {path, content} objects when provided.";
  }
  const seenPaths = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index];
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return `page_plan_drafts[${index}] must be an object with string fields path and content.`;
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.path !== "string" || record.path.length === 0) {
      return `page_plan_drafts[${index}].path must be a non-empty string.`;
    }
    if (typeof record.content !== "string") {
      return `page_plan_drafts[${index}].content must be a string.`;
    }
    if (!PAGE_PLAN_DRAFT_PATH.test(record.path)) {
      return `page_plan_drafts[${index}].path must match stories/<slug>/pages-prose-plans/PG-<integer>.md (got '${record.path}').`;
    }
    if (seenPaths.has(record.path)) {
      return `page_plan_drafts contains duplicate path '${record.path}'.`;
    }
    seenPaths.add(record.path);
  }
  return null;
}

function resolveRepoRootForWorld(worldSlug: string): string {
  for (let current = process.cwd(); ; current = path.dirname(current)) {
    if (existsSync(path.join(current, "worlds", worldSlug, "_index", "world.db"))) {
      return current;
    }
    if (path.dirname(current) === current) {
      break;
    }
  }

  const packageRoot = path.resolve(import.meta.dirname, "../../..");
  const maybeRepoRoot = path.resolve(packageRoot, "../..");
  if (existsSync(path.join(maybeRepoRoot, "worlds", worldSlug, "_index", "world.db"))) {
    return maybeRepoRoot;
  }

  throw new Error(`index missing at worlds/${worldSlug}/_index/world.db; run 'world-index build ${worldSlug}' first`);
}
