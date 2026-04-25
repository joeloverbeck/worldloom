import { readFile } from "node:fs/promises";
import path from "node:path";

import { sync } from "@worldloom/world-index/commands/sync";
import { openExistingIndex } from "@worldloom/world-index/index/open";

import { markTokenConsumed as consumeApprovalToken, verifyApprovalToken as verifyToken } from "./approval/verify-token.js";
import { acquirePerWorldLock, type PerWorldLockOptions } from "./commit/lock.js";
import { reorderPatches } from "./commit/order.js";
import { commitStaged, unlinkAllTempFiles } from "./commit/rename.js";
import { stageAllOps } from "./commit/temp-file.js";
import type { IdAllocations, NewNodeReceipt, PatchOperation, PatchPlanEnvelope, PatchReceipt } from "./envelope/schema.js";
import { validateEnvelopeShape } from "./envelope/validate.js";
import { PatchEngineOpError } from "./ops/shared.js";
import type { OpContext } from "./ops/types.js";

export type {
  OperationKind,
  PatchOperation,
  PatchPlanEnvelope,
  PatchReceipt,
  RetconAttestation
} from "./envelope/schema.js";

export { canonicalOpHash } from "./approval/verify-token.js";

export interface SubmitPatchPlanOptions extends PerWorldLockOptions {
  worldRoot?: string;
  hmacSecretPath?: string;
  preApplyValidator?: () => Promise<{ ok: true } | EngineError> | { ok: true } | EngineError;
}

export type EngineError = {
  ok: false;
  code: string;
  message: string;
  detail?: unknown;
};

export function submitPatchPlan(
  envelopeInput: PatchPlanEnvelope,
  approval_token: string,
  opts: SubmitPatchPlanOptions = {}
): Promise<PatchReceipt | EngineError> {
  return submitPatchPlanImpl(envelopeInput, approval_token, opts);
}

async function submitPatchPlanImpl(
  envelopeInput: PatchPlanEnvelope,
  approval_token: string,
  opts: SubmitPatchPlanOptions
): Promise<PatchReceipt | EngineError> {
  const shape = validateEnvelopeShape(envelopeInput);
  if (!shape.ok) {
    return error("envelope_shape_invalid", "Patch plan envelope is malformed.", shape.errors);
  }

  const envelope = { ...shape.envelope, approval_token };
  const worldRoot = opts.worldRoot ?? process.cwd();
  const lock = await acquirePerWorldLock(worldRoot, envelope.target_world, opts);
  if (!lock.ok) {
    return error(lock.code, `World '${envelope.target_world}' is already locked.`);
  }

  let db: OpContext["db"] | undefined;
  try {
    db = openExistingIndex(worldRoot, envelope.target_world);
    const ctx: OpContext = { worldRoot, db };
    const hmacSecret = await readFile(opts.hmacSecretPath ?? defaultSecretPath(worldRoot));

    const approval = verifyToken(approval_token, envelope, {
      db,
      hmac_secret: hmacSecret
    });
    if (!approval.ok) {
      return error(approval.code, `Approval token rejected: ${approval.code}.`, approval.detail);
    }

    const allocationError = verifyExpectedIdAllocations(db, envelope.target_world, envelope.expected_id_allocations);
    if (allocationError !== null) {
      return allocationError;
    }

    const validator = await runPreApplyValidators(opts);
    if (!validator.ok) {
      return validator;
    }

    const reorderedPatches = reorderPatches(envelope.patches);
    const stageResult = await stageAllOps({ ...envelope, patches: reorderedPatches }, reorderedPatches, ctx);
    if (!stageResult.ok) {
      return normalizeThrownError(stageResult.error);
    }

    let filesWritten;
    try {
      filesWritten = await commitStaged(stageResult.staged);
    } catch (commitError) {
      await unlinkAllTempFiles(stageResult.staged);
      return normalizeThrownError(commitError);
    }

    consumeApprovalToken(approval.token_hash, envelope.plan_id, {
      db,
      hmac_secret: hmacSecret
    });

    await lock.release();
    db.close();
    db = undefined;

    const syncStartedAt = Date.now();
    let indexSyncDurationMs = -1;
    let indexSyncError: unknown;
    try {
      const exitCode = sync(worldRoot, envelope.target_world);
      if (exitCode === 0) {
        indexSyncDurationMs = Date.now() - syncStartedAt;
      } else {
        indexSyncError = `world-index sync exited ${exitCode}`;
      }
    } catch (syncError) {
      indexSyncError = syncError;
    }

    const receipt: PatchReceipt = {
      plan_id: envelope.plan_id,
      applied_at: new Date().toISOString(),
      files_written: filesWritten,
      new_nodes: collectNewNodes(reorderedPatches),
      id_allocations_consumed: envelope.expected_id_allocations,
      index_sync_duration_ms: indexSyncDurationMs
    };

    if (indexSyncError !== undefined) {
      return {
        ...receipt,
        index_sync_error: String(indexSyncError)
      } as PatchReceipt;
    }

    return receipt;
  } catch (caught) {
    return normalizeThrownError(caught);
  } finally {
    if (db !== undefined) {
      db.close();
    }
    await lock.release();
  }
}

function defaultSecretPath(worldRoot: string): string {
  return path.join(worldRoot, "tools", "world-mcp", ".secret");
}

function verifyExpectedIdAllocations(
  db: OpContext["db"],
  worldSlug: string,
  allocations: IdAllocations
): EngineError | null {
  const classByKey: Array<[keyof IdAllocations, string, RegExp, number, boolean]> = [
    ["cf_ids", "CF", /^CF-(\d{4})$/, 4, true],
    ["ch_ids", "CH", /^CH-(\d{4})$/, 4, true],
    ["inv_ids", "INV", /^INV-(\d+)$/, 1, false],
    ["m_ids", "M", /^M-(\d+)$/, 1, false],
    ["oq_ids", "OQ", /^OQ-(\d{4})$/, 4, true],
    ["ent_ids", "ENT", /^ENT-(\d{4})$/, 4, true],
    ["pa_ids", "PA", /^PA-(\d{4})$/, 4, true],
    ["char_ids", "CHAR", /^CHAR-(\d{4})$/, 4, true],
    ["da_ids", "DA", /^DA-(\d{4})$/, 4, true]
  ];

  for (const [key, prefix, regex, width, zeroPad] of classByKey) {
    const ids = allocations[key];
    if (ids === undefined || ids.length === 0) {
      continue;
    }

    const nextId = nextIdFor(db, worldSlug, prefix, regex, width, zeroPad);
    if (ids[0] !== nextId) {
      return error("id_allocation_race", `${key} allocation race: expected ${ids[0]}, current next id is ${nextId}.`);
    }
  }

  const secIds = allocations.sec_ids ?? [];
  for (const secId of secIds) {
    const match = /^(SEC-[A-Z]{3})-\d{3}$/.exec(secId);
    if (match === null) {
      return error("id_allocation_race", `Invalid sec_ids allocation ${secId}.`);
    }
    const prefix = match[1] ?? "";
    const nextId = nextIdFor(db, worldSlug, prefix, new RegExp(`^${prefix}-(\\d{3})$`), 3, true);
    if (secId !== nextId) {
      return error("id_allocation_race", `sec_ids allocation race: expected ${secId}, current next id is ${nextId}.`);
    }
  }

  return null;
}

function nextIdFor(
  db: OpContext["db"],
  worldSlug: string,
  prefix: string,
  regex: RegExp,
  width: number,
  zeroPad: boolean
): string {
  const rows = db
    .prepare(
      `
        SELECT node_id
        FROM nodes
        WHERE world_slug = ?
        ORDER BY node_id
      `
    )
    .all(worldSlug) as Array<{ node_id: string }>;

  let maxValue = 0;
  for (const row of rows) {
    const match = regex.exec(row.node_id);
    if (match === null) {
      continue;
    }
    maxValue = Math.max(maxValue, Number.parseInt(match[1] ?? "0", 10));
  }

  const nextValue = maxValue + 1;
  return `${prefix}-${zeroPad ? String(nextValue).padStart(width, "0") : String(nextValue)}`;
}

async function runPreApplyValidators(opts: SubmitPatchPlanOptions): Promise<{ ok: true } | EngineError> {
  if (opts.preApplyValidator !== undefined) {
    return opts.preApplyValidator();
  }

  return error(
    "validator_unavailable",
    "SPEC-04 validator framework is not yet implemented; patch-engine apply fails closed before source writes."
  );
}

function collectNewNodes(patches: PatchOperation[]): NewNodeReceipt[] {
  return patches.flatMap((patch) => {
    switch (patch.op) {
      case "create_cf_record":
        return [{ node_id: String(patch.payload.cf_record.id), node_type: "canon_fact_record", file_path: "" }];
      case "create_ch_record":
        return [{ node_id: String(patch.payload.ch_record.id), node_type: "change_log_entry", file_path: "" }];
      case "create_inv_record":
        return [{ node_id: String(patch.payload.inv_record.id), node_type: "invariant", file_path: "" }];
      case "create_m_record":
        return [{ node_id: String(patch.payload.m_record.id), node_type: "mystery_reserve_entry", file_path: "" }];
      case "create_oq_record":
        return [{ node_id: String(patch.payload.oq_record.id), node_type: "open_question_entry", file_path: "" }];
      case "create_ent_record":
        return [{ node_id: String(patch.payload.ent_record.id), node_type: "named_entity", file_path: "" }];
      case "create_sec_record":
        return [{ node_id: String(patch.payload.sec_record.id), node_type: "section", file_path: "" }];
      default:
        return [];
    }
  });
}

function normalizeThrownError(caught: unknown): EngineError {
  if (caught instanceof PatchEngineOpError) {
    return error(caught.code, caught.message, {
      target_file: caught.target_file,
      record_id: caught.record_id,
      op_kind: caught.op_kind
    });
  }

  if (caught instanceof Error) {
    return error("patch_engine_error", caught.message);
  }

  return error("patch_engine_error", "Unknown patch-engine error.", caught);
}

function error(code: string, message: string, detail?: unknown): EngineError {
  const result: EngineError = {
    ok: false,
    code,
    message
  };
  if (detail !== undefined) {
    result.detail = detail;
  }
  return result;
}
