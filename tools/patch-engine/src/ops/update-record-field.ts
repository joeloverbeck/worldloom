import type { PatchOperation, PatchPlanEnvelope, RetconAttestation } from "../envelope/schema.js";
import {
  loadExistingRecord,
  PatchEngineOpError,
  requireTargetWorldMatch,
  stageExistingRecordFile
} from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

type UpdateRecordFieldOperation = PatchOperation & { op: "update_record_field" };

const RETCON_TYPES = new Set(["A", "B", "C", "D", "E", "F"]);

export function stageUpdateRecordField(
  env: PatchPlanEnvelope,
  op: UpdateRecordFieldOperation,
  ctx: OpContext
): Promise<StagedWrite> {
  const targetRecordId = op.payload.target_record_id;
  requireTargetWorldMatch({
    envelopeTargetWorld: env.target_world,
    opTargetWorld: op.target_world,
    opKind: op.op,
    recordId: targetRecordId
  });

  return stageUpdate(env, op, ctx);
}

async function stageUpdate(
  env: PatchPlanEnvelope,
  op: UpdateRecordFieldOperation,
  ctx: OpContext
): Promise<StagedWrite> {
  const targetRecordId = op.payload.target_record_id;
  const loaded = await loadExistingRecord({
    ctx,
    targetWorld: env.target_world,
    targetRecordId,
    expectedContentHash: op.expected_content_hash,
    opKind: op.op
  });

  const fieldPath = op.payload.field_path;
  if (!isValidFieldPath(fieldPath)) {
    throw fieldPathError(op.op, targetRecordId, fieldPath);
  }

  if (!isFreelyAppendable(fieldPath, op.payload.operation)) {
    const attestation = op.retcon_attestation ?? op.payload.retcon_attestation;
    validateRetconAttestation(op.op, targetRecordId, fieldPath, attestation);
  }

  applyFieldOperation(loaded.record, op, targetRecordId);

  return stageExistingRecordFile({
    planId: env.plan_id,
    opKind: op.op,
    targetFilePath: loaded.absolute_file_path,
    record: loaded.record
  });
}

function applyFieldOperation(
  record: Record<string, unknown>,
  op: UpdateRecordFieldOperation,
  targetRecordId: string
): void {
  const { field_path: fieldPath, operation, new_value: newValue } = op.payload;
  const parent = parentForPath(record, fieldPath, op.op, targetRecordId);
  const key = fieldPath[fieldPath.length - 1];
  if (key === undefined) {
    throw fieldPathError(op.op, targetRecordId, fieldPath);
  }

  switch (operation) {
    case "set":
      parent[key] = newValue;
      return;
    case "append_list": {
      const current = parent[key];
      if (current === undefined && isFreelyAppendableList(fieldPath)) {
        parent[key] = [newValue];
        return;
      }
      if (!Array.isArray(current)) {
        throw fieldPathError(op.op, targetRecordId, fieldPath);
      }
      current.push(newValue);
      return;
    }
    case "append_text": {
      const current = parent[key];
      if (current !== undefined && typeof current !== "string") {
        throw fieldPathError(op.op, targetRecordId, fieldPath);
      }
      parent[key] = appendText(current ?? "", newValue);
      return;
    }
    default:
      throw new PatchEngineOpError({
        code: "unsupported_operation",
        message: `${operation as string} is not supported by update_record_field`,
        op_kind: op.op,
        record_id: targetRecordId
      });
  }
}

function parentForPath(
  record: Record<string, unknown>,
  fieldPath: string[],
  opKind: "update_record_field",
  targetRecordId: string
): Record<string, unknown> {
  let cursor: unknown = record;
  for (const segment of fieldPath.slice(0, -1)) {
    if (!isRecord(cursor) || !Object.hasOwn(cursor, segment)) {
      throw fieldPathError(opKind, targetRecordId, fieldPath);
    }
    cursor = cursor[segment];
  }

  if (!isRecord(cursor)) {
    throw fieldPathError(opKind, targetRecordId, fieldPath);
  }
  return cursor;
}

function isFreelyAppendableList(fieldPath: string[]): boolean {
  if (fieldPath.length !== 1) {
    return false;
  }
  return (
    fieldPath[0] === "modification_history" ||
    fieldPath[0] === "extensions" ||
    fieldPath[0] === "touched_by_cf"
  );
}

function isFreelyAppendable(
  fieldPath: string[],
  operation: "set" | "append_list" | "append_text"
): boolean {
  if (operation !== "append_list" && operation !== "append_text") {
    return false;
  }

  if (fieldPath.length !== 1) {
    return false;
  }

  return (
    fieldPath[0] === "notes" ||
    fieldPath[0] === "modification_history" ||
    fieldPath[0] === "extensions" ||
    fieldPath[0] === "touched_by_cf"
  );
}

function validateRetconAttestation(
  opKind: "update_record_field",
  targetRecordId: string,
  fieldPath: string[],
  attestation: RetconAttestation | undefined
): void {
  if (
    !attestation ||
    !RETCON_TYPES.has(attestation.retcon_type) ||
    !/^CH-\d{4}$/.test(attestation.originating_ch) ||
    attestation.rationale.trim().length === 0
  ) {
    throw new PatchEngineOpError({
      code: "retcon_attestation_required",
      message: `${targetRecordId}.${fieldPath.join(".")} requires retcon_attestation`,
      op_kind: opKind,
      record_id: targetRecordId
    });
  }
}

function appendText(current: string, value: unknown): string {
  if (typeof value !== "string") {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: "append_text new_value must be a string"
    });
  }

  if (current.length === 0 || current.endsWith("\n") || value.startsWith("\n")) {
    return `${current}${value}`;
  }
  return `${current}\n${value}`;
}

function isValidFieldPath(fieldPath: unknown): fieldPath is string[] {
  return Array.isArray(fieldPath) && fieldPath.length > 0 && fieldPath.every((segment) => segment.length > 0);
}

function fieldPathError(
  opKind: "update_record_field",
  targetRecordId: string,
  fieldPath: string[]
): PatchEngineOpError {
  return new PatchEngineOpError({
    code: "field_path_invalid",
    message: `${targetRecordId}.${fieldPath.join(".")} is not a valid field path`,
    op_kind: opKind,
    record_id: targetRecordId
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
