import path from "node:path";

import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import { stageNewRecordFile } from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

export function stageCreateChRecord(
  env: PatchPlanEnvelope,
  op: PatchOperation & { op: "create_ch_record" },
  ctx: OpContext
): Promise<StagedWrite> {
  const record = op.payload.ch_record;
  return stageNewRecordFile({
    planId: env.plan_id,
    envelopeTargetWorld: env.target_world,
    opTargetWorld: op.target_world,
    opKind: "create_ch_record",
    record,
    recordId: record.change_id,
    idPattern: /^CH-\d{4}$/,
    allocations: env.expected_id_allocations,
    allocationKey: "ch_ids",
    targetFilePath: path.join(ctx.worldRoot, "worlds", env.target_world, "_source", "change-log", `${record.change_id}.yaml`)
  });
}
