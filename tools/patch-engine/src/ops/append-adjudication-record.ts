import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import { VERDICT_ENUM, type VerdictEnumValue } from "@worldloom/world-index/public/canonical-vocabularies";

import { PatchEngineOpError, stageNewHybridFile } from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

export interface AdjudicationFrontmatter {
  pa_id: string;
  verdict: VerdictEnumValue;
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
  validateAdjudicationFrontmatter(op.payload.adjudication_frontmatter);

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

function validateAdjudicationFrontmatter(frontmatter: AdjudicationFrontmatter): void {
  if (!/^PA-\d{4}$/.test(frontmatter.pa_id)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${frontmatter.pa_id} is not a valid PA id`,
      record_id: frontmatter.pa_id,
      op_kind: "append_adjudication_record"
    });
  }

  if (!VERDICT_ENUM.includes(frontmatter.verdict)) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${frontmatter.verdict as string} is not a canonical adjudication verdict`,
      record_id: frontmatter.pa_id,
      op_kind: "append_adjudication_record"
    });
  }
}
