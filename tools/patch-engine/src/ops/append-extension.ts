import type { ExtensionPayload, PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import {
  loadExistingRecord,
  PatchEngineOpError,
  requireTargetWorldMatch,
  stageExistingRecordFile
} from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

type AppendExtensionOperation = PatchOperation & { op: "append_extension" };

const EXTENSION_TARGET_TYPES = new Set([
  "invariant",
  "mystery_reserve_entry",
  "open_question_entry",
  "section"
]);

export async function stageAppendExtension(
  env: PatchPlanEnvelope,
  op: AppendExtensionOperation,
  ctx: OpContext
): Promise<StagedWrite> {
  const targetRecordId = op.payload.target_record_id;
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

  if (!EXTENSION_TARGET_TYPES.has(loaded.node_type)) {
    throw new PatchEngineOpError({
      code: "op_target_class_mismatch",
      message: `${targetRecordId} must be an INV, M, OQ, or SEC record`,
      target_file: loaded.absolute_file_path,
      record_id: targetRecordId,
      op_kind: op.op
    });
  }

  validateExtension(op.payload.extension, op.op, targetRecordId);
  const extensions = loaded.record.extensions;
  if (!Array.isArray(extensions)) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${targetRecordId}.extensions must be an array`,
      target_file: loaded.absolute_file_path,
      record_id: targetRecordId,
      op_kind: op.op
    });
  }

  extensions.push(op.payload.extension);
  if (loaded.node_type === "section") {
    autoAddTouchedByCf(loaded.record, op.payload.extension.originating_cf, op.op, targetRecordId);
  }

  return stageExistingRecordFile({
    planId: env.plan_id,
    opKind: op.op,
    targetFilePath: loaded.absolute_file_path,
    record: loaded.record
  });
}

function autoAddTouchedByCf(
  record: Record<string, unknown>,
  cfId: string,
  opKind: "append_extension",
  targetRecordId: string
): void {
  const touchedByCf = record.touched_by_cf;
  if (!Array.isArray(touchedByCf)) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${targetRecordId}.touched_by_cf must be an array`,
      op_kind: opKind,
      record_id: targetRecordId
    });
  }

  if (!touchedByCf.includes(cfId)) {
    touchedByCf.push(cfId);
  }
}

function validateExtension(
  extension: ExtensionPayload,
  opKind: "append_extension",
  targetRecordId: string
): void {
  const fields: Array<keyof ExtensionPayload> = ["originating_cf", "change_id", "date", "label", "body"];
  const missingField = fields.find(
    (field) => typeof extension[field] !== "string" || extension[field].trim().length === 0
  );
  if (missingField || !/^CF-\d{4}$/.test(extension.originating_cf) || !/^CH-\d{4}$/.test(extension.change_id)) {
    throw new PatchEngineOpError({
      code: "invalid_extension_payload",
      message: `${targetRecordId} extension payload is malformed`,
      op_kind: opKind,
      record_id: targetRecordId
    });
  }
}
