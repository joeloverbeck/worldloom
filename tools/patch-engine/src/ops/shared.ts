import { createHash } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import yaml from "js-yaml";

import type { IdAllocations, OperationKind } from "../envelope/schema.js";
import type { StagedWrite } from "./types.js";

export type PatchEngineOpErrorCode =
  | "invalid_record_id"
  | "missing_expected_id_allocation"
  | "record_already_exists"
  | "target_world_mismatch"
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
  return yaml.dump(value, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: true
  });
}

export function contentHashForYaml(value: unknown): string {
  return sha256Hex(serializeStableYaml(value));
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

async function pathExists(filePath: string): Promise<boolean> {
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
