import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import {
  loadExistingRecord,
  PatchEngineOpError,
  requireTargetWorldMatch,
  stageExistingRecordFile
} from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

type AnswerStoryQuestionOperation = Extract<PatchOperation, { op: "answer_story_question" }>;

export async function stageAnswerStoryQuestion(
  env: PatchPlanEnvelope,
  op: AnswerStoryQuestionOperation,
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
  if (!/^SE-\d+$/.test(op.payload.answer_event)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${op.payload.answer_event} is not a valid SE event id`,
      op_kind: op.op,
      record_id: targetQuestionId
    });
  }
  for (const recordId of op.payload.answer_records) {
    if (!/^[A-Z]+-\d+$/.test(recordId)) {
      throw new PatchEngineOpError({
        code: "invalid_record_id",
        message: `${recordId} is not a valid answer_records entry`,
        op_kind: op.op,
        record_id: targetQuestionId
      });
    }
  }

  const loaded = await loadExistingRecord({
    ctx,
    targetWorld: env.target_world,
    targetRecordId: targetQuestionId,
    expectedContentHash: op.expected_content_hash,
    opKind: op.op
  });

  const currentAnswerRecords = loaded.record.answer_records;
  const nextAnswerRecords = Array.isArray(currentAnswerRecords)
    ? currentAnswerRecords.filter((item): item is string => typeof item === "string")
    : [];
  for (const recordId of op.payload.answer_records) {
    if (!nextAnswerRecords.includes(recordId)) {
      nextAnswerRecords.push(recordId);
    }
  }

  loaded.record.status = op.payload.status;
  loaded.record.answer_event = op.payload.answer_event;
  loaded.record.answer_records = nextAnswerRecords;

  return stageExistingRecordFile({
    planId: env.plan_id,
    opKind: op.op,
    targetFilePath: loaded.absolute_file_path,
    record: loaded.record
  });
}
