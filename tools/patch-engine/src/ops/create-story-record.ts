import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import YAML from "yaml";

import type {
  PatchOperation,
  PatchPlanEnvelope,
  StoryCharacterAuthorityPayload,
  StoryRecordPayload
} from "../envelope/schema.js";
import {
  isStoryRecordOperation,
  STORY_RECORD_SPECS,
  type StoryRecordOperationKind
} from "./story-record-specs.js";
import {
  contentHashForText,
  isRecord,
  serializeStableYaml,
  stageNewHybridFile,
  stageNewRecordFile,
  tempPathForTarget,
  PatchEngineOpError
} from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

type StoryRecordOperation = Extract<PatchOperation, { op: StoryRecordOperationKind }> & {
  payload: StoryRecordPayload;
};

type StoryCharacterAuthorityOperation = Extract<
  PatchOperation,
  { op: "append_story_character_authority_record" | "supersede_story_character_authority_record" }
> & {
  payload: StoryCharacterAuthorityPayload;
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

export async function stageStoryCharacterAuthorityRecord(
  env: PatchPlanEnvelope,
  op: StoryCharacterAuthorityOperation,
  ctx: OpContext
): Promise<StagedWrite[]> {
  const storySlug = storySlugFor(op);
  const record = recordFor(op);
  const recordId = recordIdFor(op);
  const spec = STORY_RECORD_SPECS[op.op];

  validateStoryRecordBasics(env, op, storySlug, recordId);
  if (typeof op.payload.body_markdown !== "string") {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${op.op} requires payload.body_markdown`,
      op_kind: op.op,
      record_id: recordId
    });
  }

  const newWrite = await stageNewHybridFile({
    planId: env.plan_id,
    envelopeTargetWorld: env.target_world,
    opTargetWorld: op.target_world,
    opKind: op.op,
    targetFile: path.join("stories", storySlug, spec.sourceDir, `${recordId}.md`),
    expectedPrefix: path.join("stories", storySlug, spec.sourceDir),
    frontmatter: record,
    bodyMarkdown: op.payload.body_markdown,
    ctx
  });

  if (op.op !== "supersede_story_character_authority_record") {
    return [newWrite];
  }

  const supersedes = record.supersedes;
  if (typeof supersedes !== "string" || !spec.idPattern.test(supersedes)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${op.op} requires payload.record.supersedes to name the predecessor STCHAR`,
      op_kind: op.op,
      record_id: recordId
    });
  }

  return [await stageSupersededStcharPredecessor(env, op, ctx, storySlug, supersedes, recordId), newWrite];
}

function validateStoryRecordBasics(
  env: PatchPlanEnvelope,
  op: StoryCharacterAuthorityOperation,
  storySlug: string,
  recordId: string
): void {
  const spec = STORY_RECORD_SPECS[op.op];
  if (!/^[a-z0-9-]+$/.test(storySlug)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${storySlug} is not a valid story slug for ${op.op}`,
      op_kind: op.op,
      record_id: recordId
    });
  }
  if (op.target_world !== env.target_world) {
    throw new PatchEngineOpError({
      code: "target_world_mismatch",
      message: `${op.op} target_world must match envelope target_world`,
      op_kind: op.op,
      record_id: recordId
    });
  }
  if (!spec.idPattern.test(recordId)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${recordId} is not a valid id for ${op.op}`,
      op_kind: op.op,
      record_id: recordId
    });
  }
  const expectedIds = env.expected_id_allocations[spec.allocationKey] ?? [];
  if (!expectedIds.includes(recordId)) {
    throw new PatchEngineOpError({
      code: "missing_expected_id_allocation",
      message: `${recordId} is not listed in expected_id_allocations.${spec.allocationKey}`,
      op_kind: op.op,
      record_id: recordId
    });
  }
}

async function stageSupersededStcharPredecessor(
  env: PatchPlanEnvelope,
  op: StoryCharacterAuthorityOperation,
  ctx: OpContext,
  storySlug: string,
  supersedes: string,
  supersededBy: string
): Promise<StagedWrite> {
  const row = ctx.db
    .prepare(
      `
        SELECT node_id, file_path
        FROM nodes
        WHERE world_slug = ?
          AND story_slug = ?
          AND node_id IN (?, ?)
          AND node_type = 'story_character_authority_record'
        ORDER BY node_id
      `
    )
    .get(env.target_world, storySlug, supersedes, `${storySlug}:${supersedes}`) as
    | { node_id: string; file_path: string }
    | undefined;

  if (row === undefined) {
    throw new PatchEngineOpError({
      code: "record_not_found",
      message: `${supersedes} was not found in story ${storySlug}`,
      op_kind: op.op,
      record_id: supersedes
    });
  }

  const targetFilePath = path.isAbsolute(row.file_path)
    ? row.file_path
    : path.join(ctx.worldRoot, "worlds", env.target_world, row.file_path);
  const source = await readFile(targetFilePath, "utf8");
  const parsed = parseHybridMarkdown(source, op.op, supersedes);
  const nextFrontmatter = {
    ...parsed.frontmatter,
    status: "superseded",
    superseded_by: supersededBy
  };
  const newContent = `---\n${serializeStableYaml(nextFrontmatter)}---\n${parsed.bodyMarkdown}`;
  const tempFilePath = tempPathForTarget(targetFilePath, env.plan_id);

  await mkdir(path.dirname(tempFilePath), { recursive: true });
  await writeFile(tempFilePath, newContent, "utf8");

  return {
    target_file_path: targetFilePath,
    temp_file_path: tempFilePath,
    new_content: newContent,
    new_hash: contentHashForText(newContent),
    op_kind: op.op
  };
}

function parseHybridMarkdown(
  source: string,
  opKind: StoryCharacterAuthorityOperation["op"],
  recordId: string
): { frontmatter: Record<string, unknown>; bodyMarkdown: string } {
  const match = /^---\n([\s\S]*?)---\n?([\s\S]*)$/.exec(source);
  if (match === null) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${recordId} must be hybrid markdown with YAML frontmatter`,
      op_kind: opKind,
      record_id: recordId
    });
  }
  const frontmatter = YAML.parse(match[1] ?? "") as unknown;
  if (!isRecord(frontmatter)) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${recordId} frontmatter must be a mapping`,
      op_kind: opKind,
      record_id: recordId
    });
  }
  const bodyMarkdown = match[2] ?? "";
  return { frontmatter, bodyMarkdown };
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
