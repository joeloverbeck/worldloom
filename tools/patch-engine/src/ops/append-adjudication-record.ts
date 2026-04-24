import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import { stageNewHybridFile } from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

export interface AdjudicationFrontmatter {
  id: string;
  verdict: string;
  date: string;
  originating_skill: string;
  change_id?: string;
  mystery_reserve_touched?: string[];
  invariants_touched?: string[];
  cf_records_touched?: string[];
  open_questions_touched?: string[];
}

export function stageAppendAdjudicationRecord(
  env: PatchPlanEnvelope,
  op: PatchOperation & { op: "append_adjudication_record" },
  ctx: OpContext
): Promise<StagedWrite> {
  return stageNewHybridFile({
    planId: env.plan_id,
    envelopeTargetWorld: env.target_world,
    opTargetWorld: op.target_world,
    opKind: "append_adjudication_record",
    targetFile: op.target_file,
    expectedPrefix: "adjudications",
    frontmatter: op.payload.adjudication_frontmatter,
    bodyMarkdown: op.payload.body_markdown,
    ctx
  });
}
