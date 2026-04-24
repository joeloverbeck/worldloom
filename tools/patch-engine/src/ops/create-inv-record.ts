import path from "node:path";

import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import { stageNewRecordFile } from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

export function stageCreateInvRecord(
  env: PatchPlanEnvelope,
  op: PatchOperation & { op: "create_inv_record" },
  ctx: OpContext
): Promise<StagedWrite> {
  const record = op.payload.inv_record;
  return stageNewRecordFile({
    planId: env.plan_id,
    envelopeTargetWorld: env.target_world,
    opTargetWorld: op.target_world,
    opKind: "create_inv_record",
    record,
    recordId: record.id,
    idPattern: /^(ONT|CAU|DIS|SOC|AES)-\d+$/,
    allocations: env.expected_id_allocations,
    allocationKey: "inv_ids",
    targetFilePath: path.join(ctx.worldRoot, "worlds", env.target_world, "_source", "invariants", `${record.id}.yaml`)
  });
}
