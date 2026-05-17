import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import {
  loadExistingRecord,
  PatchEngineOpError,
  requireTargetWorldMatch,
  stageExistingRecordFile
} from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

type TickPressureClockOperation = Extract<PatchOperation, { op: "tick_pressure_clock" }>;

export async function stageTickPressureClock(
  env: PatchPlanEnvelope,
  op: TickPressureClockOperation,
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
  if (!/^SE-\d+$/.test(op.payload.event)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${op.payload.event} is not a valid SE event id`,
      op_kind: op.op,
      record_id: targetClockId
    });
  }
  if (!Number.isInteger(op.payload.delta) || op.payload.delta === 0) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: "tick_pressure_clock requires a non-zero integer delta",
      op_kind: op.op,
      record_id: targetClockId
    });
  }
  if (op.payload.cause.trim().length === 0) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: "tick_pressure_clock requires a non-empty cause",
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
  const value = integerField(loaded.record, "value", op.op, targetClockId);
  const max = integerField(loaded.record, "max", op.op, targetClockId);
  if (max < 1) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${targetClockId}.max must be at least 1`,
      op_kind: op.op,
      record_id: targetClockId
    });
  }

  const nextValue = value + op.payload.delta;
  if (nextValue < 0 || nextValue > max) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${targetClockId}.value would become ${nextValue}, outside [0, ${max}]`,
      op_kind: op.op,
      record_id: targetClockId
    });
  }

  const tickHistory = loaded.record.tick_history;
  if (!Array.isArray(tickHistory)) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${targetClockId}.tick_history must be an array`,
      op_kind: op.op,
      record_id: targetClockId
    });
  }

  loaded.record.value = nextValue;
  tickHistory.push({
    cause: op.payload.cause,
    delta: op.payload.delta,
    event: op.payload.event
  });

  return stageExistingRecordFile({
    planId: env.plan_id,
    opKind: op.op,
    targetFilePath: loaded.absolute_file_path,
    record: loaded.record
  });
}

function integerField(
  record: Record<string, unknown>,
  field: "value" | "max",
  opKind: "tick_pressure_clock",
  recordId: string
): number {
  const value = record[field];
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  throw new PatchEngineOpError({
    code: "field_path_invalid",
    message: `${recordId}.${field} must be an integer`,
    op_kind: opKind,
    record_id: recordId
  });
}
