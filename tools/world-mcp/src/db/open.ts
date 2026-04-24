import Database from "better-sqlite3";
import { ATOMIC_LOGICAL_WORLD_FILES, CURRENT_INDEX_VERSION } from "@worldloom/world-index/public/types";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

import { createMcpError, type McpError } from "../errors";
import { resolveIndexVersionPath, resolveWorldDbPath, resolveWorldDirectory } from "./path";

const ATOMIC_LOGICAL_WORLD_FILE_SET = new Set<string>(ATOMIC_LOGICAL_WORLD_FILES);

export interface OpenIndexDbSuccess {
  db: Database.Database;
}

export type OpenIndexDbResult = OpenIndexDbSuccess | McpError;

interface FileVersionRow {
  file_path: string;
  content_hash: string;
  last_indexed_at: string;
}

function hashFileContents(source: string): string {
  return createHash("sha256").update(source.normalize("NFC"), "utf8").digest("hex");
}

function readExpectedIndexVersion(): string {
  return String(CURRENT_INDEX_VERSION);
}

function readActualIndexVersion(versionFilePath: string): string | null {
  try {
    return readFileSync(versionFilePath, "utf8").trim();
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function readNodeCount(db: Database.Database): number {
  const row = db.prepare("SELECT COUNT(*) AS count FROM nodes").get() as { count: number };
  return row.count;
}

function shouldForceFullHashCheck(): boolean {
  return process.env.WORLDLOOM_MCP_FULL_HASH_DRIFT_CHECK === "1";
}

function hasAtomicSourceDirectory(worldDirectory: string): boolean {
  return existsSync(path.join(worldDirectory, "_source"));
}

function isSyntheticAtomicLogicalFile(worldDirectory: string, filePath: string): boolean {
  return hasAtomicSourceDirectory(worldDirectory) && ATOMIC_LOGICAL_WORLD_FILE_SET.has(filePath);
}

function findDriftedFiles(
  db: Database.Database,
  worldSlug: string
): string[] {
  const rows = db
    .prepare(
      `
        SELECT file_path, content_hash, last_indexed_at
        FROM file_versions
        WHERE world_slug = ?
        ORDER BY file_path
      `
    )
    .all(worldSlug) as FileVersionRow[];

  const worldDirectory = resolveWorldDirectory(worldSlug);
  const forceFullHashCheck = shouldForceFullHashCheck();
  const driftedFiles: string[] = [];

  for (const row of rows) {
    const absolutePath = path.join(worldDirectory, row.file_path);
    if (!existsSync(absolutePath)) {
      if (isSyntheticAtomicLogicalFile(worldDirectory, row.file_path)) {
        continue;
      }

      driftedFiles.push(row.file_path);
      continue;
    }

    const fileStat = statSync(absolutePath);
    const indexedAtMs = Date.parse(row.last_indexed_at);
    const needsHashCheck =
      forceFullHashCheck || Number.isNaN(indexedAtMs) || fileStat.mtimeMs > indexedAtMs;

    if (!needsHashCheck) {
      continue;
    }

    const currentHash = hashFileContents(readFileSync(absolutePath, "utf8"));
    if (currentHash !== row.content_hash) {
      driftedFiles.push(row.file_path);
    }
  }

  return driftedFiles;
}

function indexVersionMismatchError(actual: string | null): McpError {
  const expected = readExpectedIndexVersion();

  return createMcpError(
    "index_version_mismatch",
    "World index schema version does not match the retrieval server expectation.",
    {
      expected,
      actual,
      remedy: "run world-index build"
    }
  );
}

/**
 * Open the per-world SQLite index in read-only mode and return a structured
 * MCP error for expected lifecycle failures. Unexpected filesystem or driver
 * errors still throw so callers can surface them as transport/runtime faults.
 */
export function openIndexDb(worldSlug: string): OpenIndexDbResult {
  const worldDirectory = resolveWorldDirectory(worldSlug);
  if (!existsSync(worldDirectory)) {
    return createMcpError("world_not_found", `World '${worldSlug}' does not exist.`, {
      world_slug: worldSlug
    });
  }

  const dbPath = resolveWorldDbPath(worldSlug);
  if (!existsSync(dbPath)) {
    return createMcpError("index_missing", `World index is missing for '${worldSlug}'.`, {
      world_slug: worldSlug,
      db_path: dbPath,
      remedy: "run world-index build"
    });
  }

  const versionPath = resolveIndexVersionPath(worldSlug);
  const actualVersion = readActualIndexVersion(versionPath);
  if (actualVersion !== readExpectedIndexVersion()) {
    return indexVersionMismatchError(actualVersion);
  }

  const db = new Database(dbPath, { readonly: true });

  try {
    if (readNodeCount(db) === 0) {
      db.close();
      return createMcpError("empty_index", `World index for '${worldSlug}' contains zero nodes.`, {
        world_slug: worldSlug
      });
    }

    const driftedFiles = findDriftedFiles(db, worldSlug);
    if (driftedFiles.length > 0) {
      db.close();
      return createMcpError(
        "stale_index",
        `World index for '${worldSlug}' is stale relative to source files.`,
        {
          world_slug: worldSlug,
          drifted_files: driftedFiles,
          remedy: "run world-index sync"
        }
      );
    }

    return { db };
  } catch (error) {
    db.close();
    throw error;
  }
}
