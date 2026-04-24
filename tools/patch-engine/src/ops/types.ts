import type Database from "better-sqlite3";
import path from "node:path";

import type { OperationKind } from "../envelope/schema.js";

export interface OpContext {
  worldRoot: string;
  db: Database.Database;
}

export interface StagedWrite {
  target_file_path: string;
  temp_file_path: string;
  new_content: string;
  new_hash: string;
  op_kind: OperationKind;
  noop?: boolean;
}

export interface HybridFilePathError {
  code: "target_file_missing" | "target_file_outside_world";
  detail: string;
}

export function resolveHybridFilePath(
  worldRoot: string,
  worldSlug: string,
  targetFile: string | undefined,
  expectedPrefix: string
): string | HybridFilePathError {
  if (!targetFile) {
    return {
      code: "target_file_missing",
      detail: "hybrid-file ops require target_file"
    };
  }

  const worldPath = path.resolve(worldRoot, "worlds", worldSlug);
  const resolvedPath = path.resolve(worldPath, targetFile);
  const relativePath = path.relative(worldPath, resolvedPath).split(path.sep).join("/");
  const normalizedPrefix = expectedPrefix.endsWith("/") ? expectedPrefix : `${expectedPrefix}/`;

  if (relativePath.startsWith("../") || relativePath === ".." || path.isAbsolute(relativePath)) {
    return {
      code: "target_file_outside_world",
      detail: `${targetFile} resolves outside worlds/${worldSlug}`
    };
  }

  if (!relativePath.startsWith(normalizedPrefix)) {
    return {
      code: "target_file_outside_world",
      detail: `${targetFile} must resolve under ${normalizedPrefix}`
    };
  }

  return resolvedPath;
}
