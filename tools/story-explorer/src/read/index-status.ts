import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  SchemaVersionMismatchError,
  openExistingIndex,
  versionFilePathForWorld,
} from "@worldloom/world-index/index/open";
import { sha256Hex } from "@worldloom/world-index/hash/content";
import { ATOMIC_LOGICAL_WORLD_FILES } from "@worldloom/world-index/public/types";

import { resolveRepoRoot, worldDirectoryPath } from "../config/repo-root.js";
import type { IndexStatus } from "../view-models/index-status.js";

const ATOMIC_LOGICAL_WORLD_FILE_SET = new Set<string>(ATOMIC_LOGICAL_WORLD_FILES);

function worldIndexCommand(command: "build" | "sync", worldSlug: string): string {
  const quietSuffix = command === "sync" ? " --quiet" : "";
  return `npm exec --prefix tools/story-explorer -- world-index ${command} ${worldSlug}${quietSuffix}`;
}

function missingRemedy(worldSlug: string): string {
  return `Run \`${worldIndexCommand("build", worldSlug)}\` to enable indexed reads.`;
}

function rebuildRemedy(worldSlug: string): string {
  return `Run \`${worldIndexCommand("build", worldSlug)}\` to rebuild the index.`;
}

function staleRemedy(worldSlug: string): string {
  return `Run \`${worldIndexCommand("sync", worldSlug)}\` to refresh indexed reads.`;
}

function versionNumberFromFile(worldRoot: string, worldSlug: string): number {
  const raw = readFileSync(versionFilePathForWorld(worldRoot, worldSlug), "utf8").trim();
  const version = Number(raw);
  return Number.isInteger(version) ? version : 0;
}

function foundVersion(error: SchemaVersionMismatchError): number {
  const version = Number(error.actualVersion);
  return Number.isInteger(version) ? version : 0;
}

function isMissingIndexError(error: unknown, worldSlug: string): boolean {
  return error instanceof Error && error.message === `Index missing for world '${worldSlug}'.`;
}

function driftedFiles(worldRoot: string, worldSlug: string, rows: Array<{ file_path: string; content_hash: string }>): string[] {
  const worldDir = worldDirectoryPath(worldSlug, worldRoot);
  const drifted: string[] = [];

  for (const row of rows) {
    if (ATOMIC_LOGICAL_WORLD_FILE_SET.has(row.file_path)) {
      continue;
    }

    const absolutePath = path.join(worldDir, row.file_path);
    if (!existsSync(absolutePath)) {
      drifted.push(row.file_path);
      continue;
    }

    // YAML file_versions use parser-level canonical hashes; raw hashing would produce false stale positives.
    if (row.file_path.endsWith(".yaml")) {
      continue;
    }

    const currentHash = sha256Hex(readFileSync(absolutePath, "utf8"));
    if (currentHash !== row.content_hash) {
      drifted.push(row.file_path);
    }
  }

  return drifted;
}

export function resolveIndexStatus(worldSlug: string, repoRoot = resolveRepoRoot()): IndexStatus {
  try {
    const db = openExistingIndex(repoRoot, worldSlug);
    try {
      const nodeCount = (db.prepare("SELECT COUNT(*) AS count FROM nodes WHERE world_slug = ?").get(worldSlug) as {
        count: number;
      }).count;

      if (nodeCount === 0) {
        return { kind: "empty", remedy: rebuildRemedy(worldSlug) };
      }

      const rows = db.prepare(
        `
          SELECT file_path, content_hash
          FROM file_versions
          WHERE world_slug = ?
          ORDER BY file_path
        `
      ).all(worldSlug) as Array<{ file_path: string; content_hash: string }>;
      const drifted = driftedFiles(repoRoot, worldSlug, rows);
      if (drifted.length > 0) {
        return { kind: "stale", driftedFiles: drifted, remedy: staleRemedy(worldSlug) };
      }

      return { kind: "fresh", version: versionNumberFromFile(repoRoot, worldSlug) };
    } finally {
      db.close();
    }
  } catch (error) {
    if (isMissingIndexError(error, worldSlug)) {
      return { kind: "missing", remedy: missingRemedy(worldSlug) };
    }

    if (error instanceof SchemaVersionMismatchError) {
      return {
        kind: "version_mismatch",
        expected: error.expectedVersion,
        found: foundVersion(error),
        remedy: rebuildRemedy(worldSlug),
      };
    }

    const message = error instanceof Error ? error.message : String(error);
    return { kind: "open_failed", error: message };
  }
}
