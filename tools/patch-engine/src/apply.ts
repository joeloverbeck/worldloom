import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { sync } from "@worldloom/world-index/commands/sync";
import { sha256Hex } from "@worldloom/world-index/hash/content";
import { openExistingIndex } from "@worldloom/world-index/index/open";

import { markTokenConsumed as consumeApprovalToken, verifyApprovalToken as verifyToken } from "./approval/verify-token.js";
import { acquirePerWorldLock, type PerWorldLockOptions } from "./commit/lock.js";
import { reorderPatches } from "./commit/order.js";
import { commitStaged, unlinkAllTempFiles } from "./commit/rename.js";
import { stageAllOps } from "./commit/temp-file.js";
import type {
  EngineErrorCode,
  NewNodeReceipt,
  PatchOperation,
  PatchPlanEnvelope,
  PatchReceipt,
  ValidatorRunReceipt
} from "./envelope/schema.js";
import { validateEnvelopeShape } from "./envelope/validate.js";
import { PatchEngineOpError } from "./ops/shared.js";
import { storyRecordMetadata } from "./ops/create-story-record.js";
import type { OpContext } from "./ops/types.js";
import { checkIdAllocationRace } from "./pre-apply-checks/id-allocation-race.js";

export type {
  OperationKind,
  PatchOperation,
  PatchPlanEnvelope,
  PatchReceipt,
  RetconAttestation,
  ValidatorRunReceipt
} from "./envelope/schema.js";

export { OPERATION_KINDS } from "./envelope/schema.js";
export { canonicalOpHash } from "./approval/verify-token.js";
export { checkIdAllocationRace } from "./pre-apply-checks/id-allocation-race.js";
export type {
  IdAllocationRaceFailure,
  IdAllocationRaceResult
} from "./pre-apply-checks/id-allocation-race.js";

export type PreApplyValidatorSuccess = { ok: true; validators_run?: ValidatorRunReceipt[] };

export type PreApplyValidatorResult = PreApplyValidatorSuccess | EngineError;

export interface SubmitPatchPlanOptions extends PerWorldLockOptions {
  worldRoot?: string;
  hmacSecretPath?: string;
  preApplyValidator?: () => Promise<PreApplyValidatorResult> | PreApplyValidatorResult;
}

export type EngineError = {
  ok: false;
  code: EngineErrorCode;
  message: string;
  detail?: unknown;
  validators_run?: ValidatorRunReceipt[];
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

    const allocationRace = checkIdAllocationRace(db, envelope);
    if (!allocationRace.ok) {
      return error(allocationRace.code, allocationRace.message);
    }

    const staleIndex = detectStaleIndex(db, worldRoot, envelope.target_world);
    if (staleIndex !== null) {
      return staleIndex;
    }

    const validator = await runPreApplyValidators(opts);
    if (!validator.ok) {
      return validator;
    }
    const validatorsRun = validator.validators_run;

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
    if (validatorsRun !== undefined) {
      receipt.validators_run = validatorsRun;
    }

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

interface StaleIndexFile {
  file_path: string;
  on_disk_content_hash: string | null;
  indexed_content_hash: string;
}

function detectStaleIndex(db: OpContext["db"], worldRoot: string, worldSlug: string): EngineError | null {
  const rows = db
    .prepare(
      `
        SELECT file_path, content_hash
        FROM file_versions
        WHERE world_slug = ?
          AND (
            file_path LIKE 'characters/%.md'
            OR file_path LIKE 'diegetic-artifacts/%.md'
            OR file_path LIKE 'adjudications/%.md'
          )
        ORDER BY file_path
      `
    )
    .all(worldSlug) as Array<{ file_path: string; content_hash: string }>;

  const divergentFiles: StaleIndexFile[] = [];
  const worldDirectory = path.join(worldRoot, "worlds", worldSlug);
  for (const row of rows) {
    const absolutePath = path.join(worldDirectory, row.file_path);
    if (!existsSync(absolutePath)) {
      divergentFiles.push({
        file_path: row.file_path,
        on_disk_content_hash: null,
        indexed_content_hash: row.content_hash
      });
      continue;
    }

    const onDiskContentHash = sha256Hex(readFileSync(absolutePath, "utf8"));
    if (onDiskContentHash !== row.content_hash) {
      divergentFiles.push({
        file_path: row.file_path,
        on_disk_content_hash: onDiskContentHash,
        indexed_content_hash: row.content_hash
      });
    }
  }

  if (divergentFiles.length === 0) {
    return null;
  }

  return error(
    "index_stale",
    `World index is stale relative to on-disk content. Run 'node tools/world-index/dist/src/cli.js sync ${worldSlug}' before resubmitting.`,
    { divergent_files: divergentFiles }
  );
}

async function runPreApplyValidators(opts: SubmitPatchPlanOptions): Promise<PreApplyValidatorResult> {
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
        return [{ node_id: String(patch.payload.ch_record.change_id), node_type: "change_log_entry", file_path: "" }];
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
      case "create_stent_record":
      case "create_sf_record":
      case "create_se_record":
      case "create_obl_record":
      case "create_cnsq_record":
      case "create_thr_record":
      case "create_srel_record":
      case "create_stint_record":
      case "create_stloc_record":
      case "create_stobj_record":
      case "create_br_record":
      case "create_pg_record":
      case "create_chc_record":
      case "create_slt_record":
      case "create_arc_trace_record":
      case "append_story_diegetic_artifact_record": {
        const metadata = storyRecordMetadata(patch);
        return metadata === null
          ? []
          : [{ node_id: metadata.nodeId, node_type: metadata.nodeType, file_path: "" }];
      }
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
