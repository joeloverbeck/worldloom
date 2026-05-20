import path from "node:path";

import type { PatchOperation, PatchPlanEnvelope, StoryRecordPayload } from "../envelope/schema.js";
import {
  isStoryRecordOperation,
  STORY_RECORD_SPECS,
  type StoryRecordOperationKind
} from "./story-record-specs.js";
import { isRecord, stageNewRecordFile, PatchEngineOpError } from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

type StoryRecordOperation = Extract<PatchOperation, { op: StoryRecordOperationKind }> & {
  payload: StoryRecordPayload;
};

export function storyRecordMetadata(
  op: PatchOperation
): { storySlug: string; recordId: string; nodeId: string; nodeType: string; sourceDir: string } | null {
  if (!isStoryRecordOperation(op.op)) {
    return null;
  }
  const storyOp = op as StoryRecordOperation;
  const storySlug = storySlugFor(storyOp);
  const recordId = recordIdFor(storyOp);
  const spec = STORY_RECORD_SPECS[op.op];
  return {
    storySlug,
    recordId,
    nodeId: `${storySlug}:${recordId}`,
    nodeType: spec.nodeType,
    sourceDir: spec.sourceDir
  };
}

export function stageCreateStoryRecord(
  env: PatchPlanEnvelope,
  op: StoryRecordOperation,
  ctx: OpContext
): Promise<StagedWrite> {
  const spec = STORY_RECORD_SPECS[op.op];
  const storySlug = storySlugFor(op);
  const record = recordFor(op);
  const recordId = recordIdFor(op);

  if (!/^[a-z0-9-]+$/.test(storySlug)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${storySlug} is not a valid story slug for ${op.op}`,
      op_kind: op.op,
      record_id: recordId
    });
  }

  return stageNewRecordFile({
    planId: env.plan_id,
    envelopeTargetWorld: env.target_world,
    opTargetWorld: op.target_world,
    opKind: op.op,
    record,
    recordId,
    idPattern: spec.idPattern,
    allocations: env.expected_id_allocations,
    allocationKey: spec.allocationKey,
    targetFilePath: path.join(
      ctx.worldRoot,
      "worlds",
      env.target_world,
      "stories",
      storySlug,
      "_source",
      spec.sourceDir,
      `${recordId}.yaml`
    )
  });
}

function storySlugFor(op: StoryRecordOperation): string {
  const storySlug = op.payload.story_slug;
  if (typeof storySlug !== "string" || storySlug.length === 0) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${op.op} requires payload.story_slug`,
      op_kind: op.op
    });
  }
  return storySlug;
}

function recordFor(op: StoryRecordOperation): Record<string, unknown> {
  const record = op.payload.record;
  if (!isRecord(record)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${op.op} requires payload.record mapping`,
      op_kind: op.op
    });
  }
  return record;
}

function recordIdFor(op: StoryRecordOperation): string {
  const recordId = recordFor(op).id;
  if (typeof recordId !== "string" || recordId.length === 0) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${op.op} requires payload.record.id`,
      op_kind: op.op
    });
  }
  return recordId;
}
