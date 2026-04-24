import { existsSync } from "node:fs";
import type Database from "better-sqlite3";

import { insertValidationResults } from "../index/nodes";
import { ATOMIC_LOGICAL_WORLD_FILES, parseAtomicSourceFile } from "../parse/atomic";
import type { NodeRow, ValidationResultRow } from "../schema/types";
import { openExistingWorldIndex, parseWorldFile, resolveWorldDirectory } from "./shared";

export function verify(worldRoot: string, worldSlug: string): number {
  const opened = openExistingWorldIndex(worldRoot, worldSlug);
  if (opened instanceof Error) {
    console.error(opened.message);
    return 1;
  }

  try {
    const fileRows = opened.prepare(
      `
        SELECT file_path, content_hash
        FROM file_versions
        WHERE world_slug = ?
        ORDER BY file_path
      `
    ).all(worldSlug) as Array<{ file_path: string; content_hash: string }>;

    const results: ValidationResultRow[] = [];
    let resultId = 1;

    for (const row of fileRows) {
      const absolutePath = `${resolveWorldDirectory(worldRoot, worldSlug)}/${row.file_path}`;
      if (isAtomicLogicalFile(row.file_path) && !existsSync(absolutePath)) {
        continue;
      }

      if (!existsSync(absolutePath)) {
        results.push(createDriftResult(resultId, worldSlug, row.file_path, null, "Indexed file is missing on disk."));
        resultId += 1;
        continue;
      }

      const parsed = row.file_path.startsWith("_source/")
        ? parseAtomicSourceFile(worldRoot, worldSlug, row.file_path)
        : parseWorldFile(worldRoot, worldSlug, row.file_path);
      const storedNodes = loadStoredFileNodes(opened, worldSlug, row.file_path);
      const storedById = new Map(storedNodes.map((node) => [node.node_id, node]));
      const parsedById = new Map(parsed.nodes.map((node) => [node.node_id, node]));
      const fileResultStart = results.length;

      for (const parsedNode of parsed.nodes) {
        const stored = storedById.get(parsedNode.node_id);
        if (!stored) {
          results.push(
            createDriftResult(
              resultId,
              worldSlug,
              row.file_path,
              parsedNode.node_id,
              `Node '${parsedNode.node_id}' exists on disk but not in the index.`
            )
          );
          resultId += 1;
          continue;
        }

        if (stored.content_hash !== parsedNode.content_hash) {
          results.push(
            createDriftResult(
              resultId,
              worldSlug,
              row.file_path,
              parsedNode.node_id,
              `Stored hash ${stored.content_hash} does not match computed hash ${parsedNode.content_hash}.`
            )
          );
          resultId += 1;
        }
      }

      for (const stored of storedNodes) {
        if (!parsedById.has(stored.node_id)) {
          results.push(
            createDriftResult(
              resultId,
              worldSlug,
              row.file_path,
              stored.node_id,
              `Indexed node '${stored.node_id}' is no longer produced by the parser.`
            )
          );
          resultId += 1;
        }
      }

      if (results.length === fileResultStart && row.content_hash !== parsed.contentHash) {
        results.push(
          createDriftResult(
            resultId,
            worldSlug,
            row.file_path,
            null,
            `Stored file hash ${row.content_hash} does not match computed hash ${parsed.contentHash}.`
          )
        );
        resultId += 1;
      }
    }

    clearPreviousDriftResults(opened, worldSlug);

    if (results.length > 0) {
      insertValidationResults(opened, results);
      return 1;
    }

    return 0;
  } finally {
    opened.close();
  }
}

function isAtomicLogicalFile(filePath: string): boolean {
  return (ATOMIC_LOGICAL_WORLD_FILES as readonly string[]).includes(filePath);
}

function clearPreviousDriftResults(db: Database.Database, worldSlug: string): void {
  db.prepare(
    `
      DELETE FROM validation_results
      WHERE world_slug = ?
        AND validator_name = 'drift_check'
    `
  ).run(worldSlug);
}

function loadStoredFileNodes(
  db: Database.Database,
  worldSlug: string,
  filePath: string
): Array<Pick<NodeRow, "node_id" | "content_hash">> {
  return db
    .prepare(
      `
        SELECT node_id, content_hash
        FROM nodes
        WHERE world_slug = ?
          AND file_path = ?
          AND node_type != 'scoped_reference'
          AND (
            node_type != 'named_entity'
            OR (file_path LIKE '_source/entities/%' AND node_id NOT LIKE 'entity:%')
          )
        ORDER BY node_id
      `
    )
    .all(worldSlug, filePath) as Array<Pick<NodeRow, "node_id" | "content_hash">>;
}

function createDriftResult(
  resultId: number,
  worldSlug: string,
  filePath: string,
  nodeId: string | null,
  message: string
): ValidationResultRow {
  return {
    result_id: resultId,
    world_slug: worldSlug,
    validator_name: "drift_check",
    severity: "fail",
    code: "content_hash_drift",
    message,
    node_id: nodeId,
    file_path: filePath,
    line_range_start: null,
    line_range_end: null,
    created_at: new Date().toISOString()
  };
}
