import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Context, IndexedRecord, Verdict } from "../framework/types.js";

export type PlainRecord = Record<string, unknown>;

export const STRUCTURAL_NODE_TYPES = [
  "canon_fact_record",
  "change_log_entry",
  "invariant",
  "mystery_reserve_entry",
  "open_question_entry",
  "named_entity",
  "section",
  "character_record",
  "diegetic_artifact_record",
  "adjudication_record"
] as const;

export const FILE_CLASS_TO_SUBDIR: Readonly<Record<string, string>> = {
  WORLD_KERNEL: "",
  ONTOLOGY: "",
  CANON_LEDGER: "canon",
  INVARIANTS: "invariants",
  MYSTERY_RESERVE: "mystery-reserve",
  OPEN_QUESTIONS: "open-questions",
  EVERYDAY_LIFE: "everyday-life",
  INSTITUTIONS: "institutions",
  MAGIC_OR_TECH_SYSTEMS: "magic-or-tech-systems",
  GEOGRAPHY: "geography",
  ECONOMY_AND_RESOURCES: "economy-and-resources",
  PEOPLES_AND_SPECIES: "peoples-and-species",
  TIMELINE: "timeline"
};

export const RECORD_TYPE_BY_SOURCE_DIR: Readonly<Record<string, string>> = {
  canon: "canon_fact_record",
  "change-log": "change_log_entry",
  invariants: "invariant",
  "mystery-reserve": "mystery_reserve_entry",
  "open-questions": "open_question_entry",
  entities: "named_entity",
  "everyday-life": "section",
  institutions: "section",
  "magic-or-tech-systems": "section",
  geography: "section",
  "economy-and-resources": "section",
  "peoples-and-species": "section",
  timeline: "section"
};

export const RECORD_TYPE_TO_SCHEMA: Readonly<Record<string, string>> = {
  canon_fact_record: "canon-fact-record",
  change_log_entry: "change-log-entry",
  invariant: "invariant",
  mystery_reserve_entry: "mystery-reserve",
  open_question_entry: "open-question",
  named_entity: "entity",
  section: "section",
  adjudication_record: "adjudication-discovery",
  character_record: "character-frontmatter",
  diegetic_artifact_record: "diegetic-artifact-frontmatter"
};

export interface FileInput {
  path: string;
  content: string;
}

export function isPlainRecord(value: unknown): value is PlainRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asPlainRecord(value: unknown): PlainRecord {
  return isPlainRecord(value) ? value : {};
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function nestedRecord(record: PlainRecord, key: string): PlainRecord {
  return asPlainRecord(record[key]);
}

export function nestedRecords(record: PlainRecord, key: string): PlainRecord[] {
  const value = record[key];
  return Array.isArray(value) ? value.filter(isPlainRecord) : [];
}

export function locationFor(record: IndexedRecord): Verdict["location"] {
  return {
    file: record.file_path,
    node_id: record.node_id
  };
}

export function touchedFilesInclude(ctx: Context, pattern: RegExp): boolean {
  return ctx.touched_files.some((file) => pattern.test(toPosixPath(file)));
}

export async function queryStructuralRecords(ctx: Context): Promise<IndexedRecord[]> {
  const byKey = new Map<string, IndexedRecord>();

  for (const recordType of STRUCTURAL_NODE_TYPES) {
    for (const record of await ctx.index.query({ record_type: recordType, world_slug: ctx.world_slug })) {
      if (!isStructuralAuthorityRecord(record)) {
        continue;
      }
      byKey.set(`${record.node_type}:${record.node_id}:${record.file_path}`, record);
    }
  }

  return [...byKey.values()];
}

export async function queryRecordsByType(ctx: Context, recordType: string): Promise<IndexedRecord[]> {
  return ctx.index.query({ record_type: recordType, world_slug: ctx.world_slug });
}

export function fileInputsFrom(input: unknown, ctx: Context): FileInput[] {
  const record = asPlainRecord(input);
  const explicitFiles = record.files;
  if (Array.isArray(explicitFiles) && explicitFiles.length > 0) {
    return explicitFiles
      .filter(isPlainRecord)
      .map((file) => ({
        path: String(file.path ?? ""),
        content: String(file.content ?? "")
      }))
      .filter((file) => file.path.length > 0);
  }

  const worldRoot = worldRootFrom(input, ctx);
  if (!worldRoot) {
    return [];
  }

  const files: FileInput[] = [];
  for (const relativePath of listSupportedWorldFiles(worldRoot)) {
    files.push({
      path: toPosixPath(relativePath),
      content: readFileSync(path.join(worldRoot, relativePath), "utf8")
    });
  }
  return files;
}

export function worldRootFrom(input: unknown, ctx: Context): string | undefined {
  const record = asPlainRecord(input);
  const direct =
    stringValue(record.world_root) ??
    stringValue(record.worldRoot) ??
    stringValue(record.world_directory) ??
    stringValue(record.worldDirectory);
  if (direct) {
    return path.resolve(direct);
  }

  const repoRoot =
    stringValue(record.repo_root) ??
    stringValue(record.repoRoot) ??
    path.resolve(process.cwd(), "../..");
  const candidate = path.join(repoRoot, "worlds", ctx.world_slug);
  return existsSync(candidate) ? candidate : undefined;
}

export function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function isStructuralAuthorityRecord(record: IndexedRecord): boolean {
  const filePath = toPosixPath(record.file_path);
  const nodeId = record.node_id;

  if (record.node_type === "canon_fact_record") {
    return /^_source\/canon\/CF-\d+\.yaml$/.test(filePath) && /^CF-\d+$/.test(nodeId);
  }
  if (record.node_type === "change_log_entry") {
    return /^_source\/change-log\/CH-\d+\.yaml$/.test(filePath) && /^CH-\d+$/.test(nodeId);
  }
  if (record.node_type === "invariant") {
    return /^_source\/invariants\/[^/]+\.yaml$/.test(filePath);
  }
  if (record.node_type === "mystery_reserve_entry") {
    return /^_source\/mystery-reserve\/M-\d+\.yaml$/.test(filePath) && /^M-\d+$/.test(nodeId);
  }
  if (record.node_type === "open_question_entry") {
    return /^_source\/open-questions\/OQ-\d+\.yaml$/.test(filePath) && /^OQ-\d+$/.test(nodeId);
  }
  if (record.node_type === "named_entity") {
    return /^_source\/entities\/ENT-\d+\.yaml$/.test(filePath) && /^ENT-\d+$/.test(nodeId);
  }
  if (record.node_type === "section") {
    return /^_source\/(?:everyday-life|institutions|magic-or-tech-systems|geography|economy-and-resources|peoples-and-species|timeline)\/SEC-[A-Z]{3}-\d+\.yaml$/.test(filePath);
  }
  if (record.node_type === "character_record") {
    return /^characters\/[^/]+\.md$/.test(filePath);
  }
  if (record.node_type === "diegetic_artifact_record") {
    return /^diegetic-artifacts\/[^/]+\.md$/.test(filePath);
  }
  if (record.node_type === "adjudication_record") {
    return /^adjudications\/PA-\d+[^/]*\.md$/.test(filePath);
  }

  return false;
}

function listSupportedWorldFiles(worldRoot: string): string[] {
  const sourceRoot = path.join(worldRoot, "_source");
  const files: string[] = [];

  if (existsSync(sourceRoot)) {
    for (const dir of Object.keys(RECORD_TYPE_BY_SOURCE_DIR)) {
      const absoluteDir = path.join(sourceRoot, dir);
      if (!existsSync(absoluteDir)) {
        continue;
      }
      for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith(".yaml")) {
          files.push(path.join("_source", dir, entry.name));
        }
      }
    }
  }

  for (const dir of ["characters", "diegetic-artifacts", "adjudications"]) {
    const absoluteDir = path.join(worldRoot, dir);
    if (!existsSync(absoluteDir)) {
      continue;
    }
    for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(path.join(dir, entry.name));
      }
    }
  }

  return files.sort((left, right) => left.localeCompare(right, "en-US"));
}
