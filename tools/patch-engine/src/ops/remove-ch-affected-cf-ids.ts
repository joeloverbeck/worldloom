import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import {
  loadExistingRecord,
  PatchEngineOpError,
  requireTargetWorldMatch,
  stageExistingRecordFile
} from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

type RemoveChAffectedCfIdsOperation = PatchOperation & { op: "remove_ch_affected_cf_ids" };

export function stageRemoveChAffectedCfIds(
  env: PatchPlanEnvelope,
  op: RemoveChAffectedCfIdsOperation,
  ctx: OpContext
): Promise<StagedWrite> {
  const targetChId = op.payload.target_ch_id;
  requireTargetWorldMatch({
    envelopeTargetWorld: env.target_world,
    opTargetWorld: op.target_world,
    opKind: op.op,
    recordId: targetChId
  });

  return stageRemoval(env, op, ctx);
}

async function stageRemoval(
  env: PatchPlanEnvelope,
  op: RemoveChAffectedCfIdsOperation,
  ctx: OpContext
): Promise<StagedWrite> {
  const targetChId = op.payload.target_ch_id;
  if (!/^CH-\d+$/.test(targetChId)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${targetChId} is not a valid change-log id`,
      op_kind: op.op,
      record_id: targetChId
    });
  }

  const loaded = await loadExistingRecord({
    ctx,
    targetWorld: env.target_world,
    targetRecordId: targetChId,
    expectedContentHash: op.expected_content_hash,
    opKind: op.op
  });

  if (loaded.node_type !== "change_log_entry") {
    throw new PatchEngineOpError({
      code: "op_target_class_mismatch",
      message: `${targetChId} is a ${loaded.node_type}, not a change_log_entry`,
      op_kind: op.op,
      record_id: targetChId
    });
  }

  const nextRecord = { ...loaded.record };
  const hadAlias = Object.hasOwn(nextRecord, "affected_cf_ids");
  delete nextRecord.affected_cf_ids;

  return stageExistingRecordFile({
    planId: env.plan_id,
    opKind: op.op,
    targetFilePath: loaded.absolute_file_path,
    record: nextRecord,
    noop: !hadAlias
  });
}
