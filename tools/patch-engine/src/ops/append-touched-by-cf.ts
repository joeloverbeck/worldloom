import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import {
  loadExistingRecord,
  PatchEngineOpError,
  requireTargetWorldMatch,
  stageExistingRecordFile
} from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

type AppendTouchedByCfOperation = PatchOperation & { op: "append_touched_by_cf" };

export async function stageAppendTouchedByCf(
  env: PatchPlanEnvelope,
  op: AppendTouchedByCfOperation,
  ctx: OpContext
): Promise<StagedWrite> {
  const targetRecordId = op.payload.target_sec_id;
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

  if (loaded.node_type !== "section") {
    throw new PatchEngineOpError({
      code: "op_target_class_mismatch",
      message: `${targetRecordId} must be a section record`,
      target_file: loaded.absolute_file_path,
      record_id: targetRecordId,
      op_kind: op.op
    });
  }

  if (!/^CF-\d{4}$/.test(op.payload.cf_id)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${op.payload.cf_id} is not a valid CF id`,
      record_id: op.payload.cf_id,
      op_kind: op.op
    });
  }

  const loadedCf = await loadExistingRecord({
    ctx,
    targetWorld: env.target_world,
    targetRecordId: op.payload.cf_id,
    expectedContentHash: undefined,
    opKind: op.op
  });
  if (loadedCf.node_type !== "canon_fact_record") {
    throw new PatchEngineOpError({
      code: "op_target_class_mismatch",
      message: `${op.payload.cf_id} must be a canon fact record`,
      target_file: loadedCf.absolute_file_path,
      record_id: op.payload.cf_id,
      op_kind: op.op
    });
  }

  const fileClass = normalizedFileClass(loaded.record.file_class);
  const requiredWorldUpdates = requiredWorldUpdatesFor(loadedCf.record);
  if (!requiredWorldUpdates.has(fileClass)) {
    throw new PatchEngineOpError({
      code: "required_world_updates_mismatch",
      message: `${targetRecordId} (file_class=${fileClass}) cites ${op.payload.cf_id}, but ${op.payload.cf_id}.required_world_updates does not include ${fileClass}; include an update_record_field op extending required_world_updates ahead of this op`,
      target_file: loaded.absolute_file_path,
      record_id: op.payload.cf_id,
      op_kind: op.op
    });
  }

  const touchedByCf = loaded.record.touched_by_cf;
  if (!Array.isArray(touchedByCf)) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${targetRecordId}.touched_by_cf must be an array`,
      target_file: loaded.absolute_file_path,
      record_id: targetRecordId,
      op_kind: op.op
    });
  }

  const noop = touchedByCf.includes(op.payload.cf_id);
  if (!noop) {
    touchedByCf.push(op.payload.cf_id);
  }

  return stageExistingRecordFile({
    planId: env.plan_id,
    opKind: op.op,
    targetFilePath: loaded.absolute_file_path,
    record: loaded.record,
    noop
  });
}

function requiredWorldUpdatesFor(record: Record<string, unknown>): Set<string> {
  const values = Array.isArray(record.required_world_updates) ? record.required_world_updates : [];
  return new Set(values.map(normalizedFileClass));
}

function normalizedFileClass(value: unknown): string {
  return String(value ?? "")
    .replace(/\.md$/i, "")
    .replace(/-/g, "_")
    .toUpperCase();
}
