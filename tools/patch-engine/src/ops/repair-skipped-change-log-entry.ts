import { access, readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import {
  contentHashForYaml,
  isRecord,
  PatchEngineOpError,
  requireTargetWorldMatch,
  stageExistingRecordFile
} from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

type RepairSkippedChangeLogEntryOperation = PatchOperation & { op: "repair_skipped_change_log_entry" };

export async function stageRepairSkippedChangeLogEntry(
  env: PatchPlanEnvelope,
  op: RepairSkippedChangeLogEntryOperation,
  ctx: OpContext
): Promise<StagedWrite> {
  const targetChId = op.payload.target_ch_id;
  requireTargetWorldMatch({
    envelopeTargetWorld: env.target_world,
    opTargetWorld: op.target_world,
    opKind: op.op,
    recordId: targetChId
  });

  validatePayload(op);

  const targetFilePath = targetPathFor(ctx.worldRoot, env.target_world, op.target_file, targetChId, op.op);
  const existing = await loadExistingChangeLog(targetFilePath, op, targetChId);
  verifyExpectedContentHash(existing, targetFilePath, op);

  return stageExistingRecordFile({
    planId: env.plan_id,
    opKind: op.op,
    targetFilePath,
    record: op.payload.repaired_record
  });
}

function validatePayload(op: RepairSkippedChangeLogEntryOperation): void {
  const { target_ch_id: targetChId, repaired_record: repairedRecord, repair_reason: repairReason } = op.payload;
  if (!/^CH-\d+$/.test(targetChId)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${targetChId} is not a valid change-log id`,
      op_kind: op.op,
      record_id: targetChId
    });
  }
  if (!isRecord(repairedRecord) || repairedRecord.change_id !== targetChId) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `repaired_record.change_id must match ${targetChId}`,
      op_kind: op.op,
      record_id: targetChId
    });
  }
  if (typeof repairReason !== "string" || repairReason.trim().length === 0) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: "repair_reason must be a non-empty string",
      op_kind: op.op,
      record_id: targetChId
    });
  }
}

function targetPathFor(
  worldRoot: string,
  worldSlug: string,
  targetFile: string | undefined,
  targetChId: string,
  opKind: "repair_skipped_change_log_entry"
): string {
  const expectedTargetFile = `_source/change-log/${targetChId}.yaml`;
  if (targetFile !== expectedTargetFile) {
    const details = {
      code: "target_file_outside_world" as const,
      message: `repair_skipped_change_log_entry target_file must be ${expectedTargetFile}`,
      op_kind: opKind,
      record_id: targetChId
    };
    if (targetFile !== undefined) {
      return rejectTargetFile({ ...details, target_file: targetFile });
    }
    return rejectTargetFile(details);
  }
  return path.join(worldRoot, "worlds", worldSlug, expectedTargetFile);
}

function rejectTargetFile(details: {
  code: "target_file_outside_world";
  message: string;
  target_file?: string;
  op_kind: "repair_skipped_change_log_entry";
  record_id: string;
}): never {
  throw new PatchEngineOpError(details);
}

async function loadExistingChangeLog(
  targetFilePath: string,
  op: RepairSkippedChangeLogEntryOperation,
  targetChId: string
): Promise<Record<string, unknown>> {
  try {
    await access(targetFilePath);
  } catch {
    throw new PatchEngineOpError({
      code: "record_not_found",
      message: `${targetChId} was not found at ${targetFilePath}`,
      target_file: targetFilePath,
      op_kind: op.op,
      record_id: targetChId
    });
  }

  const parsed = YAML.parse(await readFile(targetFilePath, "utf8")) as unknown;
  if (!isRecord(parsed)) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${targetChId} record YAML must be a mapping`,
      target_file: targetFilePath,
      op_kind: op.op,
      record_id: targetChId
    });
  }
  const existingId = parsed.change_id ?? parsed.id;
  if (existingId !== targetChId) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${targetChId} does not match existing record id ${String(existingId)}`,
      target_file: targetFilePath,
      op_kind: op.op,
      record_id: targetChId
    });
  }
  return parsed;
}

function verifyExpectedContentHash(
  existing: Record<string, unknown>,
  targetFilePath: string,
  op: RepairSkippedChangeLogEntryOperation
): void {
  if (op.expected_content_hash === undefined) {
    return;
  }
  if (op.expected_content_hash === contentHashForYaml(existing)) {
    return;
  }
  throw new PatchEngineOpError({
    code: "record_hash_drift",
    message: `${op.payload.target_ch_id} content hash drifted`,
    target_file: targetFilePath,
    op_kind: op.op,
    record_id: op.payload.target_ch_id
  });
}
