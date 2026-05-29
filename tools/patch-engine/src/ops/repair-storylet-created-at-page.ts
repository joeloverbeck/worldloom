import { access, readFile } from "node:fs/promises";
import path from "node:path";

import YAML from "yaml";

import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import {
  contentHashForYaml,
  isRecord,
  PatchEngineOpError,
  requireTargetWorldMatch,
  stageExistingRecordFile
} from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

type RepairStoryletCreatedAtPageOperation = PatchOperation & { op: "repair_storylet_created_at_page" };

const SLT_ID_PATTERN = /^SLT-\d+$/;

/**
 * Backfill the load-bearing `created_at_page` field on a stored storylet record.
 *
 * This is an idempotent, absent-only corrective: it writes `created_at_page: null`
 * only when the field is missing, and never overwrites an existing value (a
 * `runtime_jit` storylet legitimately carries a `PG-<n>` page id, and an
 * `author_batch` block carries an explicit `null`). Re-running it on a record
 * that already has the field is a no-op.
 */
export async function stageRepairStoryletCreatedAtPage(
  env: PatchPlanEnvelope,
  op: RepairStoryletCreatedAtPageOperation,
  ctx: OpContext
): Promise<StagedWrite> {
  const targetSltId = op.payload.target_slt_id;

  requireTargetWorldMatch({
    envelopeTargetWorld: env.target_world,
    opTargetWorld: op.target_world,
    opKind: op.op,
    recordId: targetSltId
  });

  validatePayload(op);

  const targetFilePath = path.join(
    ctx.worldRoot,
    "worlds",
    env.target_world,
    "stories",
    op.payload.story_slug,
    "_source",
    "storylets",
    `${targetSltId}.yaml`
  );

  const existing = await loadExistingStorylet(targetFilePath, op, targetSltId);
  verifyExpectedContentHash(existing, targetFilePath, op);

  // Idempotent and absent-only: never overwrite an existing created_at_page value.
  if ("created_at_page" in existing) {
    return stageExistingRecordFile({
      planId: env.plan_id,
      opKind: op.op,
      targetFilePath,
      record: existing,
      noop: true
    });
  }

  existing.created_at_page = null;

  return stageExistingRecordFile({
    planId: env.plan_id,
    opKind: op.op,
    targetFilePath,
    record: existing
  });
}

function validatePayload(op: RepairStoryletCreatedAtPageOperation): void {
  const storySlug: unknown = op.payload.story_slug;
  const targetSltId: unknown = op.payload.target_slt_id;
  const recordIdField = typeof targetSltId === "string" ? { record_id: targetSltId } : {};

  if (typeof storySlug !== "string" || storySlug.length === 0) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${op.op} payload.story_slug must be a non-empty string`,
      op_kind: op.op,
      ...recordIdField
    });
  }
  if (typeof targetSltId !== "string" || !SLT_ID_PATTERN.test(targetSltId)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${typeof targetSltId === "string" ? targetSltId : "(missing id)"} is not a valid storylet id`,
      op_kind: op.op,
      ...recordIdField
    });
  }
}

async function loadExistingStorylet(
  targetFilePath: string,
  op: RepairStoryletCreatedAtPageOperation,
  targetSltId: string
): Promise<Record<string, unknown>> {
  try {
    await access(targetFilePath);
  } catch {
    throw new PatchEngineOpError({
      code: "record_not_found",
      message: `${targetSltId} was not found at ${targetFilePath}`,
      target_file: targetFilePath,
      op_kind: op.op,
      record_id: targetSltId
    });
  }

  const parsed = YAML.parse(await readFile(targetFilePath, "utf8")) as unknown;
  if (!isRecord(parsed)) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${targetSltId} record YAML must be a mapping`,
      target_file: targetFilePath,
      op_kind: op.op,
      record_id: targetSltId
    });
  }
  if (parsed.id !== targetSltId) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${targetSltId} does not match existing record id ${String(parsed.id)}`,
      target_file: targetFilePath,
      op_kind: op.op,
      record_id: targetSltId
    });
  }
  return parsed;
}

function verifyExpectedContentHash(
  existing: Record<string, unknown>,
  targetFilePath: string,
  op: RepairStoryletCreatedAtPageOperation
): void {
  if (op.expected_content_hash === undefined) {
    return;
  }
  if (op.expected_content_hash === contentHashForYaml(existing)) {
    return;
  }
  throw new PatchEngineOpError({
    code: "record_hash_drift",
    message: `${op.payload.target_slt_id} content hash drifted`,
    target_file: targetFilePath,
    op_kind: op.op,
    record_id: op.payload.target_slt_id
  });
}
