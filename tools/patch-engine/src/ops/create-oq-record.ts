import path from "node:path";

import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import { stageNewRecordFile } from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

export function stageCreateOqRecord(
  env: PatchPlanEnvelope,
  op: PatchOperation & { op: "create_oq_record" },
  ctx: OpContext
): Promise<StagedWrite> {
  const record = op.payload.oq_record;
  return stageNewRecordFile({
    planId: env.plan_id,
    envelopeTargetWorld: env.target_world,
    opTargetWorld: op.target_world,
    opKind: "create_oq_record",
    record,
    recordId: record.id,
    idPattern: /^OQ-\d{4}$/,
    allocations: env.expected_id_allocations,
    allocationKey: "oq_ids",
    targetFilePath: path.join(ctx.worldRoot, "worlds", env.target_world, "_source", "open-questions", `${record.id}.yaml`)
  });
}
