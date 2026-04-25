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
    await requireCfCoversSectionFileClass(env, op, ctx, loaded.record);
    autoAddTouchedByCf(loaded.record, op.payload.extension.originating_cf, op.op, targetRecordId);
  }

  return stageExistingRecordFile({
    planId: env.plan_id,
    opKind: op.op,
    targetFilePath: loaded.absolute_file_path,
    record: loaded.record
  });
}

async function requireCfCoversSectionFileClass(
  env: PatchPlanEnvelope,
  op: AppendExtensionOperation,
  ctx: OpContext,
  sectionRecord: Record<string, unknown>
): Promise<void> {
  const cfId = op.payload.extension.originating_cf;
  const loadedCf = await loadExistingRecord({
    ctx,
    targetWorld: env.target_world,
    targetRecordId: cfId,
    expectedContentHash: undefined,
    opKind: op.op
  });
  if (loadedCf.node_type !== "canon_fact_record") {
    throw new PatchEngineOpError({
      code: "op_target_class_mismatch",
      message: `${cfId} must be a canon fact record`,
      target_file: loadedCf.absolute_file_path,
      record_id: cfId,
      op_kind: op.op
    });
  }

  const fileClass = normalizedFileClass(sectionRecord.file_class);
  const requiredWorldUpdates = requiredWorldUpdatesFor(loadedCf.record);
  if (!requiredWorldUpdates.has(fileClass)) {
    throw new PatchEngineOpError({
      code: "required_world_updates_mismatch",
      message: `${op.payload.target_record_id} (file_class=${fileClass}) cites ${cfId}, but ${cfId}.required_world_updates does not include ${fileClass}; include an update_record_field op extending required_world_updates ahead of this op`,
      record_id: cfId,
      op_kind: op.op
    });
  }
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
