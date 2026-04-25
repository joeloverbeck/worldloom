import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import YAML from "yaml";

import type { IdAllocations, OperationKind } from "../envelope/schema.js";
import { resolveHybridFilePath, type OpContext, type StagedWrite } from "./types.js";

export type PatchEngineOpErrorCode =
  | "field_path_invalid"
  | "file_already_exists"
  | "invalid_record_id"
  | "invalid_extension_payload"
  | "invalid_modification_history_entry"
  | "missing_expected_id_allocation"
  | "op_target_class_mismatch"
  | "record_hash_drift"
  | "record_already_exists"
  | "record_not_found"
  | "required_world_updates_mismatch"
  | "retcon_attestation_required"
  | "target_world_mismatch"
  | "target_file_missing"
  | "target_file_outside_world"
  | "unsupported_operation"
  | "unsupported_section_prefix";

export interface PatchEngineOpErrorDetails {
  code: PatchEngineOpErrorCode;
  message: string;
  target_file?: string;
  record_id?: string;
  op_kind?: OperationKind;
}

export class PatchEngineOpError extends Error {
  readonly code: PatchEngineOpErrorCode;
  readonly target_file: string | undefined;
  readonly record_id: string | undefined;
  readonly op_kind: OperationKind | undefined;

  constructor(details: PatchEngineOpErrorDetails) {
    super(details.message);
    this.name = "PatchEngineOpError";
    this.code = details.code;
    this.target_file = details.target_file;
    this.record_id = details.record_id;
    this.op_kind = details.op_kind;
  }
}

export function serializeStableYaml(value: unknown): string {
  return YAML.stringify(value, {
    lineWidth: 0,
    sortMapEntries: true
  });
}

export function contentHashForYaml(value: unknown): string {
  return sha256Hex(serializeStableYaml(value));
}

export function contentHashForText(value: string): string {
  return sha256Hex(value);
}

export function tempPathForTarget(targetFilePath: string, planId: string): string {
  return `${targetFilePath}.patch-engine.${planId}.tmp`;
}

export async function stageNewRecordFile(params: {
  planId: string;
  envelopeTargetWorld: string;
  opTargetWorld: string;
  opKind: OperationKind;
  record: unknown;
  recordId: string;
  idPattern: RegExp;
  allocations: IdAllocations;
  allocationKey: keyof IdAllocations;
  targetFilePath: string;
}): Promise<StagedWrite> {
  if (params.opTargetWorld !== params.envelopeTargetWorld) {
    throw new PatchEngineOpError({
      code: "target_world_mismatch",
      message: `${params.opKind} target_world must match envelope target_world`,
      op_kind: params.opKind,
      record_id: params.recordId
    });
  }

  if (!params.idPattern.test(params.recordId)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${params.recordId} is not a valid id for ${params.opKind}`,
      op_kind: params.opKind,
      record_id: params.recordId
    });
  }

  const expectedIds = params.allocations[params.allocationKey] ?? [];
  if (!expectedIds.includes(params.recordId)) {
    throw new PatchEngineOpError({
      code: "missing_expected_id_allocation",
      message: `${params.recordId} is not listed in expected_id_allocations.${params.allocationKey}`,
      op_kind: params.opKind,
      record_id: params.recordId
    });
  }

  if (await pathExists(params.targetFilePath)) {
    throw new PatchEngineOpError({
      code: "record_already_exists",
      message: `${params.recordId} already exists at ${params.targetFilePath}`,
      target_file: params.targetFilePath,
      record_id: params.recordId,
      op_kind: params.opKind
    });
  }

  const newContent = serializeStableYaml(params.record);
  const tempFilePath = tempPathForTarget(params.targetFilePath, params.planId);

  await mkdir(path.dirname(tempFilePath), { recursive: true });
  await writeFile(tempFilePath, newContent, "utf8");

  return {
    target_file_path: params.targetFilePath,
    temp_file_path: tempFilePath,
    new_content: newContent,
    new_hash: contentHashForYaml(params.record),
    op_kind: params.opKind
  };
}

export async function stageNewHybridFile(params: {
  planId: string;
  envelopeTargetWorld: string;
  opTargetWorld: string;
  opKind: OperationKind;
  targetFile: string | undefined;
  expectedPrefix: string;
  frontmatter: unknown;
  bodyMarkdown: string;
  ctx: OpContext;
}): Promise<StagedWrite> {
  if (params.opTargetWorld !== params.envelopeTargetWorld) {
    throw new PatchEngineOpError({
      code: "target_world_mismatch",
      message: `${params.opKind} target_world must match envelope target_world`,
      op_kind: params.opKind
    });
  }

  const resolvedPath = resolveHybridFilePath(
    params.ctx.worldRoot,
    params.envelopeTargetWorld,
    params.targetFile,
    params.expectedPrefix
  );
  if (typeof resolvedPath !== "string") {
    throw new PatchEngineOpError({
      code: resolvedPath.code,
      message: resolvedPath.detail,
      op_kind: params.opKind
    });
  }

  if (await pathExists(resolvedPath)) {
    throw new PatchEngineOpError({
      code: "file_already_exists",
      message: `${params.targetFile} already exists`,
      target_file: resolvedPath,
      op_kind: params.opKind
    });
  }

  const newContent = `---\n${serializeStableYaml(params.frontmatter)}---\n${params.bodyMarkdown}\n`;
  const tempFilePath = tempPathForTarget(resolvedPath, params.planId);

  await mkdir(path.dirname(tempFilePath), { recursive: true });
  await writeFile(tempFilePath, newContent, "utf8");

  return {
    target_file_path: resolvedPath,
    temp_file_path: tempFilePath,
    new_content: newContent,
    new_hash: contentHashForText(newContent),
    op_kind: params.opKind
  };
}

export interface ExistingRecord {
  node_id: string;
  node_type: string;
  file_path: string;
  absolute_file_path: string;
  record: Record<string, unknown>;
  current_hash: string;
}

export async function loadExistingRecord(params: {
  ctx: OpContext;
  targetWorld: string;
  targetRecordId: string;
  expectedContentHash: string | undefined;
  opKind: OperationKind;
}): Promise<ExistingRecord> {
  const row = params.ctx.db
    .prepare(
      `
        SELECT node_id, node_type, file_path
        FROM nodes
        WHERE world_slug = ? AND node_id = ?
      `
    )
    .get(params.targetWorld, params.targetRecordId) as
    | { node_id: string; node_type: string; file_path: string }
    | undefined;

  const stagedRecord = params.ctx.stagedRecords?.get(params.targetRecordId);
  if (stagedRecord !== undefined) {
    verifyExpectedContentHash(stagedRecord, params.expectedContentHash, params.opKind);
    return stagedRecord;
  }

  if (!row) {
    throw new PatchEngineOpError({
      code: "record_not_found",
      message: `${params.targetRecordId} was not found in the world index`,
      op_kind: params.opKind,
      record_id: params.targetRecordId
    });
  }

  const absoluteFilePath = path.isAbsolute(row.file_path)
    ? row.file_path
    : path.join(params.ctx.worldRoot, "worlds", params.targetWorld, row.file_path);
  const source = await readFile(absoluteFilePath, "utf8");
  const parsed = YAML.parse(source) as unknown;

  if (!isRecord(parsed)) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${params.targetRecordId} record YAML must be a mapping`,
      target_file: absoluteFilePath,
      record_id: params.targetRecordId,
      op_kind: params.opKind
    });
  }

  const currentHash = contentHashForYaml(parsed);
  verifyExpectedContentHash(
    {
      node_id: row.node_id,
      node_type: row.node_type,
      file_path: row.file_path,
      absolute_file_path: absoluteFilePath,
      record: parsed,
      current_hash: currentHash
    },
    params.expectedContentHash,
    params.opKind
  );

  return {
    node_id: row.node_id,
    node_type: row.node_type,
    file_path: row.file_path,
    absolute_file_path: absoluteFilePath,
    record: parsed,
    current_hash: currentHash
  };
}

function verifyExpectedContentHash(
  record: ExistingRecord,
  expectedContentHash: string | undefined,
  opKind: OperationKind
): void {
  if (expectedContentHash === undefined) {
    return;
  }
  if (expectedContentHash === record.current_hash) {
    return;
  }
  throw new PatchEngineOpError({
    code: "record_hash_drift",
    message: `${record.node_id} content hash drifted`,
    target_file: record.absolute_file_path,
    record_id: record.node_id,
    op_kind: opKind
  });
}

export async function stageExistingRecordFile(params: {
  planId: string;
  opKind: OperationKind;
  targetFilePath: string;
  record: Record<string, unknown>;
  noop?: boolean;
}): Promise<StagedWrite> {
  const newContent = serializeStableYaml(params.record);
  const tempFilePath = tempPathForTarget(params.targetFilePath, params.planId);

  await mkdir(path.dirname(tempFilePath), { recursive: true });
  await writeFile(tempFilePath, newContent, "utf8");

  const stagedWrite: StagedWrite = {
    target_file_path: params.targetFilePath,
    temp_file_path: tempFilePath,
    new_content: newContent,
    new_hash: contentHashForYaml(params.record),
    op_kind: params.opKind
  };
  if (params.noop !== undefined) {
    stagedWrite.noop = params.noop;
  }
  return stagedWrite;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function requireTargetWorldMatch(params: {
  envelopeTargetWorld: string;
  opTargetWorld: string;
  opKind: OperationKind;
  recordId: string;
}): void {
  if (params.opTargetWorld !== params.envelopeTargetWorld) {
    throw new PatchEngineOpError({
      code: "target_world_mismatch",
      message: `${params.opKind} target_world must match envelope target_world`,
      op_kind: params.opKind,
      record_id: params.recordId
    });
  }
}

export function sectionSubdirForId(recordId: string): string {
  const match = /^SEC-(ELF|INS|MTS|GEO|ECR|PAS|TML)-\d{3}$/.exec(recordId);
  if (!match) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${recordId} is not a valid section record id`,
      op_kind: "create_sec_record",
      record_id: recordId
    });
  }

  const prefix = match[1];
  switch (prefix) {
    case "ELF":
      return "everyday-life";
    case "INS":
      return "institutions";
    case "MTS":
      return "magic-or-tech-systems";
    case "GEO":
      return "geography";
    case "ECR":
      return "economy-and-resources";
    case "PAS":
      return "peoples-and-species";
    case "TML":
      return "timeline";
    default:
      throw new PatchEngineOpError({
        code: "unsupported_section_prefix",
        message: `${prefix} is not a supported section prefix`,
        op_kind: "create_sec_record",
        record_id: recordId
      });
  }
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input.normalize("NFC"), "utf8").digest("hex");
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
