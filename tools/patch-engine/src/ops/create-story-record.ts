import path from "node:path";

import type {
  IdAllocations,
  OperationKind,
  PatchOperation,
  PatchPlanEnvelope,
  StoryRecordPayload
} from "../envelope/schema.js";
import { isRecord, stageNewRecordFile, PatchEngineOpError } from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

interface StoryRecordSpec {
  allocationKey: keyof IdAllocations;
  idPattern: RegExp;
  nodeType: string;
  prefix: string;
  sourceDir: string;
}

export type StoryRecordOperationKind =
  | "create_stent_record"
  | "create_ststat_record"
  | "create_sf_record"
  | "create_se_record"
  | "create_obl_record"
  | "create_cnsq_record"
  | "create_thr_record"
  | "create_srel_record"
  | "create_stint_record"
  | "create_stloc_record"
  | "create_stobj_record"
  | "create_br_record"
  | "create_pg_record"
  | "create_chc_record"
  | "create_slt_record"
  | "create_bel_record"
  | "create_clk_record"
  | "supersede_clk_record"
  | "create_stsec_record"
  | "supersede_stsec_record"
  | "create_stq_record"
  | "supersede_stq_record"
  | "append_story_diegetic_artifact_record";

type StoryRecordOperation = Extract<PatchOperation, { op: StoryRecordOperationKind }> & {
  payload: StoryRecordPayload;
};

const STORY_RECORD_OPERATION_KINDS: readonly StoryRecordOperationKind[] = [
  "create_stent_record",
  "create_ststat_record",
  "create_sf_record",
  "create_se_record",
  "create_obl_record",
  "create_cnsq_record",
  "create_thr_record",
  "create_srel_record",
  "create_stint_record",
  "create_stloc_record",
  "create_stobj_record",
  "create_br_record",
  "create_pg_record",
  "create_chc_record",
  "create_slt_record",
  "create_bel_record",
  "create_clk_record",
  "supersede_clk_record",
  "create_stsec_record",
  "supersede_stsec_record",
  "create_stq_record",
  "supersede_stq_record",
  "append_story_diegetic_artifact_record"
];

const STORY_RECORD_OPERATION_KIND_SET = new Set<OperationKind>(STORY_RECORD_OPERATION_KINDS);

export const STORY_RECORD_SPECS: Readonly<Record<StoryRecordOperationKind, StoryRecordSpec>> = {
  create_stent_record: {
    allocationKey: "stent_ids",
    idPattern: /^STENT-\d+$/,
    nodeType: "story_entity_record",
    prefix: "STENT",
    sourceDir: "entities"
  },
  create_ststat_record: {
    allocationKey: "ststat_ids",
    idPattern: /^STSTAT-\d+$/,
    nodeType: "story_status_record",
    prefix: "STSTAT",
    sourceDir: "status"
  },
  create_sf_record: {
    allocationKey: "sf_ids",
    idPattern: /^SF-\d+$/,
    nodeType: "story_fact_record",
    prefix: "SF",
    sourceDir: "facts"
  },
  create_se_record: {
    allocationKey: "se_ids",
    idPattern: /^SE-\d+$/,
    nodeType: "story_event_record",
    prefix: "SE",
    sourceDir: "events"
  },
  create_obl_record: {
    allocationKey: "obl_ids",
    idPattern: /^OBL-\d+$/,
    nodeType: "obligation_record",
    prefix: "OBL",
    sourceDir: "obligations"
  },
  create_cnsq_record: {
    allocationKey: "cnsq_ids",
    idPattern: /^CNSQ-\d+$/,
    nodeType: "consequence_record",
    prefix: "CNSQ",
    sourceDir: "consequences"
  },
  create_thr_record: {
    allocationKey: "thr_ids",
    idPattern: /^THR-\d+$/,
    nodeType: "thread_record",
    prefix: "THR",
    sourceDir: "threads"
  },
  create_srel_record: {
    allocationKey: "srel_ids",
    idPattern: /^SREL-\d+$/,
    nodeType: "relationship_record_story",
    prefix: "SREL",
    sourceDir: "relationships"
  },
  create_stint_record: {
    allocationKey: "stint_ids",
    idPattern: /^STINT-\d+$/,
    nodeType: "intention_record",
    prefix: "STINT",
    sourceDir: "intentions"
  },
  create_stloc_record: {
    allocationKey: "stloc_ids",
    idPattern: /^STLOC-\d+$/,
    nodeType: "story_location_record",
    prefix: "STLOC",
    sourceDir: "locations"
  },
  create_stobj_record: {
    allocationKey: "stobj_ids",
    idPattern: /^STOBJ-\d+$/,
    nodeType: "story_object_record",
    prefix: "STOBJ",
    sourceDir: "objects"
  },
  create_br_record: {
    allocationKey: "br_ids",
    idPattern: /^BR-\d+$/,
    nodeType: "branch_record",
    prefix: "BR",
    sourceDir: "branches"
  },
  create_pg_record: {
    allocationKey: "pg_ids",
    idPattern: /^PG-\d+$/,
    nodeType: "page_record",
    prefix: "PG",
    sourceDir: "pages"
  },
  create_chc_record: {
    allocationKey: "chc_ids",
    idPattern: /^CHC-\d+$/,
    nodeType: "choice_record",
    prefix: "CHC",
    sourceDir: "choices"
  },
  create_slt_record: {
    allocationKey: "slt_ids",
    idPattern: /^SLT-\d+$/,
    nodeType: "storylet_record",
    prefix: "SLT",
    sourceDir: "storylets"
  },
  create_bel_record: {
    allocationKey: "bel_ids",
    idPattern: /^BEL-\d+$/,
    nodeType: "belief_record",
    prefix: "BEL",
    sourceDir: "beliefs"
  },
  create_clk_record: {
    allocationKey: "clk_ids",
    idPattern: /^CLK-\d+$/,
    nodeType: "pressure_clock_record",
    prefix: "CLK",
    sourceDir: "clocks"
  },
  supersede_clk_record: {
    allocationKey: "clk_ids",
    idPattern: /^CLK-\d+$/,
    nodeType: "pressure_clock_record",
    prefix: "CLK",
    sourceDir: "clocks"
  },
  create_stsec_record: {
    allocationKey: "stsec_ids",
    idPattern: /^STSEC-\d+$/,
    nodeType: "story_secret_record",
    prefix: "STSEC",
    sourceDir: "secrets"
  },
  supersede_stsec_record: {
    allocationKey: "stsec_ids",
    idPattern: /^STSEC-\d+$/,
    nodeType: "story_secret_record",
    prefix: "STSEC",
    sourceDir: "secrets"
  },
  create_stq_record: {
    allocationKey: "stq_ids",
    idPattern: /^STQ-\d+$/,
    nodeType: "story_question_record",
    prefix: "STQ",
    sourceDir: "story-questions"
  },
  supersede_stq_record: {
    allocationKey: "stq_ids",
    idPattern: /^STQ-\d+$/,
    nodeType: "story_question_record",
    prefix: "STQ",
    sourceDir: "story-questions"
  },
  append_story_diegetic_artifact_record: {
    allocationKey: "story_da_ids",
    idPattern: /^DA-\d+$/,
    nodeType: "story_diegetic_artifact_record",
    prefix: "DA",
    sourceDir: "artifacts"
  }
};

export function isStoryRecordOperation(op: OperationKind): op is StoryRecordOperationKind {
  return STORY_RECORD_OPERATION_KIND_SET.has(op);
}

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
