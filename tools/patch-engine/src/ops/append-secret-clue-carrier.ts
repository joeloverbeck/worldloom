import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import {
  isRecord,
  loadExistingRecord,
  PatchEngineOpError,
  requireTargetWorldMatch,
  stageExistingRecordFile
} from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

type AppendSecretClueCarrierOperation = Extract<PatchOperation, { op: "append_secret_clue_carrier" }>;

export async function stageAppendSecretClueCarrier(
  env: PatchPlanEnvelope,
  op: AppendSecretClueCarrierOperation,
  ctx: OpContext
): Promise<StagedWrite> {
  const targetSecretId = op.payload.target_secret_id;
  requireSecretTarget(env, op, targetSecretId);
  validateClueCarrier(op.payload.clue_carrier, op.op, targetSecretId);

  const loaded = await loadExistingRecord({
    ctx,
    targetWorld: env.target_world,
    targetRecordId: targetSecretId,
    expectedContentHash: op.expected_content_hash,
    opKind: op.op
  });

  const carriers = loaded.record.clue_carriers;
  if (carriers !== undefined && !Array.isArray(carriers)) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${targetSecretId}.clue_carriers must be an array`,
      op_kind: op.op,
      record_id: targetSecretId
    });
  }

  loaded.record.clue_carriers = [...(Array.isArray(carriers) ? carriers : []), op.payload.clue_carrier];

  return stageExistingRecordFile({
    planId: env.plan_id,
    opKind: op.op,
    targetFilePath: loaded.absolute_file_path,
    record: loaded.record
  });
}

export function requireSecretTarget(
  env: PatchPlanEnvelope,
  op: AppendSecretClueCarrierOperation,
  targetSecretId: string
): void {
  requireTargetWorldMatch({
    envelopeTargetWorld: env.target_world,
    opTargetWorld: op.target_world,
    opKind: op.op,
    recordId: targetSecretId
  });

  if (!/^STSEC-\d+$/.test(targetSecretId)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${targetSecretId} is not a valid STSEC id`,
      op_kind: op.op,
      record_id: targetSecretId
    });
  }
}

export function validateClueCarrier(
  carrier: unknown,
  opKind: "append_secret_clue_carrier",
  recordId: string
): asserts carrier is Record<string, unknown> {
  if (!isRecord(carrier)) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: "append_secret_clue_carrier requires payload.clue_carrier mapping",
      op_kind: opKind,
      record_id: recordId
    });
  }
  if (typeof carrier.record !== "string" || !/^(DA|STOBJ|STLOC|BEL|SF|SE)-\d+$/.test(carrier.record)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: "clue_carrier.record must be a DA, STOBJ, STLOC, BEL, SF, or SE id",
      op_kind: opKind,
      record_id: recordId
    });
  }
}
