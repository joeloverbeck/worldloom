import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import {
  loadExistingRecord,
  PatchEngineOpError,
  requireTargetWorldMatch,
  stageExistingRecordFile
} from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

type AbandonStoryQuestionOperation = Extract<PatchOperation, { op: "abandon_story_question" }>;

export async function stageAbandonStoryQuestion(
  env: PatchPlanEnvelope,
  op: AbandonStoryQuestionOperation,
  ctx: OpContext
): Promise<StagedWrite> {
  const targetQuestionId = op.payload.target_question_id;
  requireTargetWorldMatch({
    envelopeTargetWorld: env.target_world,
    opTargetWorld: op.target_world,
    opKind: op.op,
    recordId: targetQuestionId
  });

  if (!/^STQ-\d+$/.test(targetQuestionId)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${targetQuestionId} is not a valid STQ id`,
      op_kind: op.op,
      record_id: targetQuestionId
    });
  }
  if (op.payload.abandonment_rationale.trim().length === 0) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: "abandon_story_question requires a non-empty abandonment_rationale",
      op_kind: op.op,
      record_id: targetQuestionId
    });
  }

  const loaded = await loadExistingRecord({
    ctx,
    targetWorld: env.target_world,
    targetRecordId: targetQuestionId,
    expectedContentHash: op.expected_content_hash,
    opKind: op.op
  });

  loaded.record.status = "abandoned";
  loaded.record.abandonment_rationale = op.payload.abandonment_rationale;

  return stageExistingRecordFile({
    planId: env.plan_id,
    opKind: op.op,
    targetFilePath: loaded.absolute_file_path,
    record: loaded.record
  });
}
