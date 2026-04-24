import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import {
  loadExistingRecord,
  PatchEngineOpError,
  requireTargetWorldMatch,
  stageExistingRecordFile
} from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

type AppendModificationHistoryEntryOperation = PatchOperation & {
  op: "append_modification_history_entry";
};

export async function stageAppendModificationHistoryEntry(
  env: PatchPlanEnvelope,
  op: AppendModificationHistoryEntryOperation,
  ctx: OpContext
): Promise<StagedWrite> {
  const targetRecordId = op.payload.target_cf_id;
  requireTargetWorldMatch({
    envelopeTargetWorld: env.target_world,
    opTargetWorld: op.target_world,
    opKind: op.op,
    recordId: targetRecordId
  });

  const loaded = await loadExistingRecord({
    ctx,
    targetWorld: env.target_world,
    targetRecordId,
    expectedContentHash: op.expected_content_hash,
    opKind: op.op
  });

  if (loaded.node_type !== "canon_fact_record") {
    throw new PatchEngineOpError({
      code: "op_target_class_mismatch",
      message: `${targetRecordId} must be a canon fact record`,
      target_file: loaded.absolute_file_path,
      record_id: targetRecordId,
      op_kind: op.op
    });
  }

  validatePayload(op);
  const modificationHistory = loaded.record.modification_history;
  if (modificationHistory !== undefined && !Array.isArray(modificationHistory)) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${targetRecordId}.modification_history must be an array`,
      target_file: loaded.absolute_file_path,
      record_id: targetRecordId,
      op_kind: op.op
    });
  }

  const entry = {
    change_id: op.payload.change_id,
    originating_cf: op.payload.originating_cf,
    date: op.payload.date,
    summary: op.payload.summary
  };

  loaded.record.modification_history = [...(modificationHistory ?? []), entry];

  return stageExistingRecordFile({
    planId: env.plan_id,
    opKind: op.op,
    targetFilePath: loaded.absolute_file_path,
    record: loaded.record
  });
}

function validatePayload(op: AppendModificationHistoryEntryOperation): void {
  const payload = op.payload as Record<string, unknown>;
  if (
    typeof payload.change_id !== "string" ||
    !/^CH-\d{4}$/.test(payload.change_id) ||
    typeof payload.originating_cf !== "string" ||
    !/^CF-\d{4}$/.test(payload.originating_cf) ||
    typeof payload.date !== "string" ||
    payload.date.trim().length === 0 ||
    typeof payload.summary !== "string" ||
    payload.summary.trim().length === 0
  ) {
    throw new PatchEngineOpError({
      code: "invalid_modification_history_entry",
      message: `${op.payload.target_cf_id} modification history entry is malformed`,
      record_id: op.payload.target_cf_id,
      op_kind: op.op
    });
  }
}
