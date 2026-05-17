import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import {
  loadExistingRecord,
  PatchEngineOpError,
  requireTargetWorldMatch,
  stageExistingRecordFile
} from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

type RevealStorySecretOperation = Extract<PatchOperation, { op: "reveal_story_secret" }>;

export async function stageRevealStorySecret(
  env: PatchPlanEnvelope,
  op: RevealStorySecretOperation,
  ctx: OpContext
): Promise<StagedWrite> {
  const targetSecretId = op.payload.target_secret_id;
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
  if (!/^SE-\d+$/.test(op.payload.reveal_event)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${op.payload.reveal_event} is not a valid SE event id`,
      op_kind: op.op,
      record_id: targetSecretId
    });
  }
  for (const recordId of op.payload.reveal_records) {
    if (!/^(BEL|SF|DA|STQ)-\d+$/.test(recordId)) {
      throw new PatchEngineOpError({
        code: "invalid_record_id",
        message: `${recordId} is not a valid reveal_records entry`,
        op_kind: op.op,
        record_id: targetSecretId
      });
    }
  }

  const loaded = await loadExistingRecord({
    ctx,
    targetWorld: env.target_world,
    targetRecordId: targetSecretId,
    expectedContentHash: op.expected_content_hash,
    opKind: op.op
  });

  const currentRevealRecords = loaded.record.reveal_records;
  const nextRevealRecords = Array.isArray(currentRevealRecords)
    ? currentRevealRecords.filter((item): item is string => typeof item === "string")
    : [];
  for (const recordId of op.payload.reveal_records) {
    if (!nextRevealRecords.includes(recordId)) {
      nextRevealRecords.push(recordId);
    }
  }

  loaded.record.status = "revealed";
  loaded.record.reveal_event = op.payload.reveal_event;
  loaded.record.reveal_records = nextRevealRecords;

  return stageExistingRecordFile({
    planId: env.plan_id,
    opKind: op.op,
    targetFilePath: loaded.absolute_file_path,
    record: loaded.record
  });
}
