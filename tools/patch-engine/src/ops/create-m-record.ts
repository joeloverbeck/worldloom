import path from "node:path";

import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import { stageNewRecordFile } from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

export function stageCreateMRecord(
  env: PatchPlanEnvelope,
  op: PatchOperation & { op: "create_m_record" },
  ctx: OpContext
): Promise<StagedWrite> {
  const record = op.payload.m_record;
  return stageNewRecordFile({
    planId: env.plan_id,
    envelopeTargetWorld: env.target_world,
    opTargetWorld: op.target_world,
    opKind: "create_m_record",
    record,
    recordId: record.id,
    idPattern: /^M-\d+$/,
    allocations: env.expected_id_allocations,
    allocationKey: "m_ids",
    targetFilePath: path.join(ctx.worldRoot, "worlds", env.target_world, "_source", "mystery-reserve", `${record.id}.yaml`)
  });
}
