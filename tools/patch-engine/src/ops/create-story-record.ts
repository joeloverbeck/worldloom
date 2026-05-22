import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import YAML from "yaml";

import type {
  PatchOperation,
  PatchPlanEnvelope,
  RemoveStoryCharacterAuthorityBodyHashNoteFieldPayload,
  RemoveStoryCharacterAuthorityFrontmatterFieldPayload,
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

type RemoveStoryCharacterAuthorityFrontmatterFieldOperation = Extract<
  PatchOperation,
  { op: "remove_story_character_authority_frontmatter_field" }
> & {
  payload: RemoveStoryCharacterAuthorityFrontmatterFieldPayload;
};

type RemoveStoryCharacterAuthorityBodyHashNoteFieldOperation = Extract<
  PatchOperation,
  { op: "remove_story_character_authority_body_hash_note_field" }
> & {
  payload: RemoveStoryCharacterAuthorityBodyHashNoteFieldPayload;
};

type StoryCharacterAuthorityMaintenanceOperation =
  | RemoveStoryCharacterAuthorityFrontmatterFieldOperation
  | RemoveStoryCharacterAuthorityBodyHashNoteFieldOperation;

export function storyRecordMetadata(
  op: PatchOperation
): { storySlug: string; recordId: string; nodeId: string; nodeType: string; sourceDir: string } | null {
  if (
    op.op === "remove_story_character_authority_frontmatter_field" ||
    op.op === "remove_story_character_authority_body_hash_note_field"
  ) {
    const storySlug = op.payload.story_slug;
    const recordId = op.payload.target_record_id;
    return {
      storySlug,
      recordId,
      nodeId: `${storySlug}:${recordId}`,
      nodeType: "story_character_authority_record",
      sourceDir: "story-characters"
    };
  }
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

export async function stageRemoveStoryCharacterAuthorityFrontmatterField(
  env: PatchPlanEnvelope,
  op: RemoveStoryCharacterAuthorityFrontmatterFieldOperation,
  ctx: OpContext
): Promise<StagedWrite> {
  validateStcharMaintenanceOperation(env, op);
  const { target_record_id: recordId, field_name: fieldName } = op.payload;
  const { source, targetFilePath } = await readStcharMaintenanceTarget(env, op, ctx);

  const parsed = parseHybridMarkdown(source, op.op, recordId);
  if (!Object.hasOwn(parsed.frontmatter, fieldName)) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${recordId}.${fieldName} is not present in STCHAR frontmatter`,
      target_file: targetFilePath,
      op_kind: op.op,
      record_id: recordId
    });
  }

  const nextFrontmatter = { ...parsed.frontmatter };
  delete nextFrontmatter[fieldName];
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

export async function stageRemoveStoryCharacterAuthorityBodyHashNoteField(
  env: PatchPlanEnvelope,
  op: RemoveStoryCharacterAuthorityBodyHashNoteFieldOperation,
  ctx: OpContext
): Promise<StagedWrite> {
  validateStcharMaintenanceOperation(env, op);
  const { target_record_id: recordId, field_name: fieldName } = op.payload;
  const { source, targetFilePath } = await readStcharMaintenanceTarget(env, op, ctx);
  const parsed = parseHybridMarkdown(source, op.op, recordId);
  const nextBody = removeHashNoteField(parsed.bodyMarkdown, fieldName, op.op, recordId, targetFilePath);
  const newContent = `---\n${serializeStableYaml(parsed.frontmatter)}---\n${nextBody}`;
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

function validateStcharMaintenanceOperation(
  env: PatchPlanEnvelope,
  op: StoryCharacterAuthorityMaintenanceOperation
): void {
  const { story_slug: storySlug, target_record_id: recordId, field_name: fieldName } = op.payload;
  if (!/^[a-z0-9-]+$/.test(storySlug)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${storySlug} is not a valid story slug for ${op.op}`,
      op_kind: op.op,
      record_id: recordId
    });
  }
  if (!/^STCHAR-(0|[1-9][0-9]*)$/.test(recordId)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${recordId} is not a valid STCHAR id for ${op.op}`,
      op_kind: op.op,
      record_id: recordId
    });
  }
  if (fieldName !== "page_packet_hash") {
    throw new PatchEngineOpError({
      code: "unsupported_operation",
      message: `${op.op} may only remove legacy page_packet_hash metadata`,
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
}

async function readStcharMaintenanceTarget(
  env: PatchPlanEnvelope,
  op: StoryCharacterAuthorityMaintenanceOperation,
  ctx: OpContext
): Promise<{ row: { node_id: string; file_path: string }; source: string; targetFilePath: string }> {
  const { story_slug: storySlug, target_record_id: recordId } = op.payload;
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
    .get(env.target_world, storySlug, recordId, `${storySlug}:${recordId}`) as
    | { node_id: string; file_path: string }
    | undefined;

  if (row === undefined) {
    throw new PatchEngineOpError({
      code: "record_not_found",
      message: `${recordId} was not found in story ${storySlug}`,
      op_kind: op.op,
      record_id: recordId
    });
  }

  if (op.target_file !== undefined && op.target_file !== row.file_path) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${op.op} target_file must match indexed STCHAR path ${row.file_path}`,
      target_file: op.target_file,
      op_kind: op.op,
      record_id: recordId
    });
  }

  const targetFilePath = path.isAbsolute(row.file_path)
    ? row.file_path
    : path.join(ctx.worldRoot, "worlds", env.target_world, row.file_path);
  const source = await readFile(targetFilePath, "utf8");
  const currentHash = contentHashForText(source);
  if (op.expected_content_hash !== undefined && op.expected_content_hash !== currentHash) {
    throw new PatchEngineOpError({
      code: "record_hash_drift",
      message: `${row.node_id} content hash drifted`,
      target_file: targetFilePath,
      op_kind: op.op,
      record_id: row.node_id
    });
  }

  return { row, source, targetFilePath };
}

function removeHashNoteField(
  bodyMarkdown: string,
  fieldName: "page_packet_hash",
  opKind: RemoveStoryCharacterAuthorityBodyHashNoteFieldOperation["op"],
  recordId: string,
  targetFilePath: string
): string {
  const fieldClause = `; ${fieldName} over the §16a packet projection authored for this bundle`;
  if (!bodyMarkdown.includes(fieldClause)) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${recordId} body hash note does not contain legacy ${fieldName} clause`,
      target_file: targetFilePath,
      op_kind: opKind,
      record_id: recordId
    });
  }
  return bodyMarkdown.replace(fieldClause, "");
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
  opKind: StoryCharacterAuthorityOperation["op"] | StoryCharacterAuthorityMaintenanceOperation["op"],
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
