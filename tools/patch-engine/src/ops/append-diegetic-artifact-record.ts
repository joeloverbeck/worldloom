import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import { stageNewHybridFile } from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

export function stageAppendDiegeticArtifactRecord(
  env: PatchPlanEnvelope,
  op: PatchOperation & { op: "append_diegetic_artifact_record" },
  ctx: OpContext
): Promise<StagedWrite> {
  return stageNewHybridFile({
    planId: env.plan_id,
    envelopeTargetWorld: env.target_world,
    opTargetWorld: op.target_world,
    opKind: "append_diegetic_artifact_record",
    targetFile: op.target_file,
    expectedPrefix: "diegetic-artifacts",
    frontmatter: op.payload.da_record,
    bodyMarkdown: op.payload.body_markdown,
    ctx
  });
}
