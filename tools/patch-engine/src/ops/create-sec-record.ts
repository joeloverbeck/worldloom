import path from "node:path";

import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import { sectionSubdirForId, stageNewRecordFile } from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

export function stageCreateSecRecord(
  env: PatchPlanEnvelope,
  op: PatchOperation & { op: "create_sec_record" },
  ctx: OpContext
): Promise<StagedWrite> {
  const record = op.payload.sec_record;
  const subdir = sectionSubdirForId(record.id);
  return stageNewRecordFile({
    planId: env.plan_id,
    envelopeTargetWorld: env.target_world,
    opTargetWorld: op.target_world,
    opKind: "create_sec_record",
    record,
    recordId: record.id,
    idPattern: /^SEC-(ELF|INS|MTS|GEO|ECR|PAS|TML)-\d{3}$/,
    allocations: env.expected_id_allocations,
    allocationKey: "sec_ids",
    targetFilePath: path.join(ctx.worldRoot, "worlds", env.target_world, "_source", subdir, `${record.id}.yaml`)
  });
}
