import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import YAML from "yaml";

import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import {
  contentHashForText,
  isRecord,
  serializeStableYaml,
  stageNewHybridFile,
  tempPathForTarget,
  PatchEngineOpError
} from "./shared.js";
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

export async function stageRepairDiegeticArtifactClaimMapMetadata(
  env: PatchPlanEnvelope,
  op: PatchOperation & { op: "repair_diegetic_artifact_claim_map_metadata" },
  ctx: OpContext
): Promise<StagedWrite> {
  validateRepairOperation(env, op);
  const { target_record_id: recordId } = op.payload;
  const { source, targetFilePath } = await readDiegeticArtifactTarget(env, op, ctx);
  const parsed = parseHybridMarkdown(source, op.op, recordId);
  const claimMap = parsed.frontmatter.claim_map;
  if (!Array.isArray(claimMap)) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${recordId}.claim_map must be an array`,
      target_file: targetFilePath,
      op_kind: op.op,
      record_id: recordId
    });
  }

  const nextClaimMap = claimMap.map((entry) => (isRecord(entry) ? { ...entry } : entry));
  for (const update of op.payload.claim_map_updates) {
    const entry = nextClaimMap[update.index];
    if (!isRecord(entry)) {
      throw new PatchEngineOpError({
        code: "field_path_invalid",
        message: `${recordId}.claim_map[${update.index}] must be a mapping`,
        target_file: targetFilePath,
        op_kind: op.op,
        record_id: recordId
      });
    }
    if (entry.canon_status !== update.expected_canon_status || entry.cf_id !== update.expected_cf_id) {
      throw new PatchEngineOpError({
        code: "record_hash_drift",
        message: `${recordId}.claim_map[${update.index}] no longer matches expected repair precondition`,
        target_file: targetFilePath,
        op_kind: op.op,
        record_id: recordId
      });
    }
    entry.canon_status = update.canon_status;
    entry.cf_id = update.cf_id;
    const existingTrace = isRecord(entry.repair_trace) ? entry.repair_trace : {};
    entry.repair_trace = { ...existingTrace, valda_004: update.repair_trace_note };
  }

  const nextFrontmatter = {
    ...parsed.frontmatter,
    claim_map: nextClaimMap
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

function validateRepairOperation(
  env: PatchPlanEnvelope,
  op: PatchOperation & { op: "repair_diegetic_artifact_claim_map_metadata" }
): void {
  const { target_record_id: recordId, claim_map_updates: updates } = op.payload;
  if (op.target_world !== env.target_world) {
    throw new PatchEngineOpError({
      code: "target_world_mismatch",
      message: `${op.op} target_world must match envelope target_world`,
      op_kind: op.op,
      record_id: recordId
    });
  }
  if (!/^DA-[0-9]+$/.test(recordId)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${recordId} is not a valid DA id for ${op.op}`,
      op_kind: op.op,
      record_id: recordId
    });
  }
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${op.op} requires at least one claim_map update`,
      op_kind: op.op,
      record_id: recordId
    });
  }
  for (const update of updates) {
    if (!Number.isInteger(update.index) || update.index < 0) {
      throw new PatchEngineOpError({
        code: "field_path_invalid",
        message: `${op.op} claim_map update index must be a non-negative integer`,
        op_kind: op.op,
        record_id: recordId
      });
    }
    if (
      update.expected_canon_status !== "canonically_true" ||
      update.expected_cf_id !== null ||
      (update.canon_status !== "partially_true" && update.canon_status !== "contested") ||
      update.cf_id !== null ||
      typeof update.repair_trace_note !== "string" ||
      update.repair_trace_note.length === 0
    ) {
      throw new PatchEngineOpError({
        code: "unsupported_operation",
        message: `${op.op} may only retag unbacked canonically_true DA claim_map entries to partially_true or contested`,
        op_kind: op.op,
        record_id: recordId
      });
    }
  }
}

async function readDiegeticArtifactTarget(
  env: PatchPlanEnvelope,
  op: PatchOperation & { op: "repair_diegetic_artifact_claim_map_metadata" },
  ctx: OpContext
): Promise<{ source: string; targetFilePath: string }> {
  const { target_record_id: recordId } = op.payload;
  const row = ctx.db
    .prepare(
      `
        SELECT node_id, file_path
        FROM nodes
        WHERE world_slug = ?
          AND node_id = ?
          AND node_type = 'diegetic_artifact_record'
      `
    )
    .get(env.target_world, recordId) as { node_id: string; file_path: string } | undefined;

  if (row === undefined) {
    throw new PatchEngineOpError({
      code: "record_not_found",
      message: `${recordId} was not found in the world index`,
      op_kind: op.op,
      record_id: recordId
    });
  }

  if (op.target_file !== undefined && op.target_file !== row.file_path) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${op.op} target_file must match indexed DA path ${row.file_path}`,
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
      message: `${recordId} content hash drifted`,
      target_file: targetFilePath,
      op_kind: op.op,
      record_id: recordId
    });
  }

  return { source, targetFilePath };
}

function parseHybridMarkdown(
  source: string,
  opKind: "repair_diegetic_artifact_claim_map_metadata",
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
  return { frontmatter, bodyMarkdown: match[2] ?? "" };
}
