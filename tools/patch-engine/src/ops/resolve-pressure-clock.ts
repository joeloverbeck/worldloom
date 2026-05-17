import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import {
  loadExistingRecord,
  PatchEngineOpError,
  requireTargetWorldMatch,
  stageExistingRecordFile
} from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

type ResolvePressureClockOperation = Extract<PatchOperation, { op: "resolve_pressure_clock" }>;

export async function stageResolvePressureClock(
  env: PatchPlanEnvelope,
  op: ResolvePressureClockOperation,
  ctx: OpContext
): Promise<StagedWrite> {
  const targetClockId = op.payload.target_clock_id;
  requireTargetWorldMatch({
    envelopeTargetWorld: env.target_world,
    opTargetWorld: op.target_world,
    opKind: op.op,
    recordId: targetClockId
  });

  if (!/^CLK-\d+$/.test(targetClockId)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${targetClockId} is not a valid CLK id`,
      op_kind: op.op,
      record_id: targetClockId
    });
  }
  if (!/^SE-\d+$/.test(op.payload.resolution_event)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${op.payload.resolution_event} is not a valid SE event id`,
      op_kind: op.op,
      record_id: targetClockId
    });
  }

  const loaded = await loadExistingRecord({
    ctx,
    targetWorld: env.target_world,
    targetRecordId: targetClockId,
    expectedContentHash: op.expected_content_hash,
    opKind: op.op
  });

  loaded.record.status = "resolved";
  loaded.record.resolution_event = op.payload.resolution_event;

  return stageExistingRecordFile({
    planId: env.plan_id,
    opKind: op.op,
    targetFilePath: loaded.absolute_file_path,
    record: loaded.record
  });
}
