import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { openExistingIndex } from "@worldloom/world-index/index/open";
import { sha256Hex } from "@worldloom/world-index/hash/content";
import YAML from "yaml";

import { resolveRepoRoot } from "../config/repo-root.js";
import { resolveIndexStatus } from "./index-status.js";

export type ParsedRecord = Record<string, unknown>;

export interface RawRecord {
  body: string;
  parsed: ParsedRecord;
  sourcePath: string;
  contentHash: string;
}

export interface IndexedRecordBody {
  recordId: string;
  body: string;
  parsed: ParsedRecord;
  sourcePath: string | null;
}

const RECORD_SOURCE_DIRS: Record<string, string> = {
  BEL: "beliefs",
  BR: "branches",
  CHC: "choices",
  CLK: "clocks",
  CNSQ: "consequences",
  DA: "artifacts",
  OBL: "obligations",
  PG: "pages",
  SCN: "scenes",
  SE: "events",
  SF: "facts",
  SLT: "storylets",
  STEMO: "emotions",
  STENT: "entities",
  STINT: "intentions",
  STLOC: "locations",
  STOBJ: "objects",
  STPLAN: "plans",
  STQ: "story-questions",
  SREL: "relationships",
  STSEC: "secrets",
  STSTAT: "status",
  THR: "threads",
};

const DIRECT_MARKDOWN_DIRS: Record<string, string> = {
  SAU: "audits",
  SLB: "storylet-batches",
  SP: "story-promotions",
  STCHAR: "story-characters",
};

export function storyDirectory(repoRoot: string, worldSlug: string, storySlug: string): string {
  return path.join(repoRoot, "worlds", worldSlug, "stories", storySlug);
}

export function recordClass(recordId: string): string {
  return recordId.split("-", 1)[0] ?? recordId;
}

export function recordSourceDir(recordId: string): string {
  const sourceDir = RECORD_SOURCE_DIRS[recordClass(recordId)];
  if (sourceDir === undefined) {
    throw new Error(`Unsupported story-bundle record class for ${recordId}`);
  }
  return sourceDir;
}

export function recordSourcePath(
  worldSlug: string,
  storySlug: string,
  recordId: string,
  repoRoot = resolveRepoRoot()
): string {
  return path.join(storyDirectory(repoRoot, worldSlug, storySlug), "_source", recordSourceDir(recordId), `${recordId}.yaml`);
}

export function parseRecordBody(body: string): ParsedRecord {
  if (body.startsWith("---\n") || body.startsWith("---\r\n")) {
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(body);
    if (match !== null) {
      const frontmatter = YAML.parse(match[1] ?? "") as unknown;
      return {
        ...(frontmatter !== null && typeof frontmatter === "object" && !Array.isArray(frontmatter)
          ? (frontmatter as ParsedRecord)
          : {}),
        body: match[2] ?? "",
      };
    }
  }

  const parsed = YAML.parse(body) as unknown;
  if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as ParsedRecord;
  }

  const heading = /^#\s+(.+)$/m.exec(body);
  if (heading !== null) {
    return {
      title: heading[1],
      body,
    };
  }

  throw new Error("Record body did not parse to an object");
}

async function findRecordByPrefix(directory: string, recordId: string): Promise<string | null> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const matched = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter(
        (name) =>
          name === `${recordId}.md` ||
          name === `${recordId}.yaml` ||
          name.startsWith(`${recordId}-`) && (name.endsWith(".md") || name.endsWith(".yaml")),
      )
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))[0];
    return matched === undefined ? null : path.join(directory, matched);
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function findRspPath(base: string, recordId: string): Promise<string | null> {
  const auditsRoot = path.join(base, "audits");
  try {
    const audits = await readdir(auditsRoot, { withFileTypes: true });
    for (const audit of audits.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }))) {
      if (!audit.isDirectory() || !audit.name.startsWith("SAU-")) {
        continue;
      }
      const candidate = await findRecordByPrefix(
        path.join(auditsRoot, audit.name, "remediation-storylet-proposals"),
        recordId,
      );
      if (candidate !== null) {
        return candidate;
      }
    }
    return null;
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function directRecordPath(
  worldSlug: string,
  storySlug: string,
  recordId: string,
  repoRoot: string,
): Promise<string> {
  const base = storyDirectory(repoRoot, worldSlug, storySlug);
  const klass = recordClass(recordId);
  if (klass === "RSP") {
    const rspPath = await findRspPath(base, recordId);
    if (rspPath !== null) {
      return rspPath;
    }
  }

  const markdownDir = DIRECT_MARKDOWN_DIRS[klass];
  if (markdownDir !== undefined) {
    const sourcePath = await findRecordByPrefix(path.join(base, markdownDir), recordId);
    if (sourcePath !== null) {
      return sourcePath;
    }
  }

  return recordSourcePath(worldSlug, storySlug, recordId, repoRoot);
}

export async function readRawRecord(
  worldSlug: string,
  storySlug: string,
  recordId: string,
  repoRoot = resolveRepoRoot()
): Promise<RawRecord> {
  const sourcePath = await directRecordPath(worldSlug, storySlug, recordId, repoRoot);
  const body = await readFile(sourcePath, "utf8");
  return {
    body,
    parsed: parseRecordBody(body),
    sourcePath,
    contentHash: sha256Hex(body),
  };
}

export async function readIndexedRecord(
  worldSlug: string,
  storySlug: string,
  recordId: string,
  repoRoot = resolveRepoRoot()
): Promise<IndexedRecordBody | null> {
  if (resolveIndexStatus(worldSlug, repoRoot).kind !== "fresh") {
    return null;
  }

  const db = openExistingIndex(repoRoot, worldSlug);
  try {
    const row = db
      .prepare(
        `
          SELECT node_id, file_path, body
          FROM nodes
          WHERE world_slug = ?
            AND story_slug = ?
            AND (node_id = ? OR node_id = ?)
          ORDER BY node_id
          LIMIT 1
        `
      )
      .get(worldSlug, storySlug, recordId, `${storySlug}:${recordId}`) as
      | { node_id: string; file_path: string; body: string }
      | undefined;

    if (row === undefined) {
      return null;
    }

    return {
      recordId,
      body: row.body,
      parsed: parseRecordBody(row.body),
      sourcePath: row.file_path === "" ? null : path.join(repoRoot, "worlds", worldSlug, row.file_path),
    };
  } finally {
    db.close();
  }
}

export async function readRecord(
  worldSlug: string,
  storySlug: string,
  recordId: string,
  repoRoot = resolveRepoRoot()
): Promise<RawRecord> {
  const indexed = await readIndexedRecord(worldSlug, storySlug, recordId, repoRoot);
  if (indexed !== null) {
    const sourcePath = indexed.sourcePath ?? recordSourcePath(worldSlug, storySlug, recordId, repoRoot);
    return {
      body: indexed.body,
      parsed: indexed.parsed,
      sourcePath,
      contentHash: sha256Hex(indexed.body),
    };
  }
  return readRawRecord(worldSlug, storySlug, recordId, repoRoot);
}

export async function listRecordIds(
  worldSlug: string,
  storySlug: string,
  recordPrefix: string,
  repoRoot = resolveRepoRoot()
): Promise<string[]> {
  const sourceDir = path.join(storyDirectory(repoRoot, worldSlug, storySlug), "_source", recordSourceDir(`${recordPrefix}-0`));
  try {
    const entries = await readdir(sourceDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.startsWith(`${recordPrefix}-`) && entry.name.endsWith(".yaml"))
      .map((entry) => entry.name.slice(0, -".yaml".length))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function listPageRecords(
  worldSlug: string,
  storySlug: string,
  repoRoot = resolveRepoRoot()
): Promise<RawRecord[]> {
  if (resolveIndexStatus(worldSlug, repoRoot).kind === "fresh") {
    const db = openExistingIndex(repoRoot, worldSlug);
    try {
      const rows = db
        .prepare(
          `
            SELECT node_id, file_path, body
            FROM nodes
            WHERE world_slug = ?
              AND story_slug = ?
              AND node_type = 'page_record'
            ORDER BY node_id
          `
        )
        .all(worldSlug, storySlug) as Array<{ node_id: string; file_path: string; body: string }>;
      return rows.map((row) => ({
        body: row.body,
        parsed: parseRecordBody(row.body),
        sourcePath: row.file_path === "" ? recordSourcePath(worldSlug, storySlug, row.node_id, repoRoot) : path.join(repoRoot, "worlds", worldSlug, row.file_path),
        contentHash: sha256Hex(row.body),
      }));
    } finally {
      db.close();
    }
  }

  const pageIds = await listRecordIds(worldSlug, storySlug, "PG", repoRoot);
  return Promise.all(pageIds.map((pageId) => readRawRecord(worldSlug, storySlug, pageId, repoRoot)));
}

export function recordExists(worldSlug: string, storySlug: string, recordId: string, repoRoot = resolveRepoRoot()): boolean {
  return existsSync(recordSourcePath(worldSlug, storySlug, recordId, repoRoot));
}
