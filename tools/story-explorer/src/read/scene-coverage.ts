import { openExistingIndex } from "@worldloom/world-index/index/open";
import {
  querySceneCoverage,
  type SceneCoverageBranch,
  type SceneCoverageQueryOptions,
} from "@worldloom/world-index/public/types";

import { resolveRepoRoot } from "../config/repo-root.js";
import { resolveIndexStatus } from "./index-status.js";
import type { IndexStatus } from "../view-models/index-status.js";

export interface SceneCoverageReadOptions {
  worldSlug: string;
  storySlug?: string;
  branchId?: string;
}

export interface SceneCoverageReadResult {
  worldIndexStatus: IndexStatus;
  degradedDirectRead: boolean;
  branches: SceneCoverageBranch[];
}

function queryOptions(options: SceneCoverageReadOptions): SceneCoverageQueryOptions {
  return {
    worldSlug: options.worldSlug,
    ...(options.storySlug === undefined ? {} : { storySlug: options.storySlug }),
    ...(options.branchId === undefined ? {} : { branchId: options.branchId }),
  };
}

export function readSceneCoverage(
  options: SceneCoverageReadOptions,
  repoRoot = resolveRepoRoot(),
): SceneCoverageReadResult {
  const worldIndexStatus = resolveIndexStatus(options.worldSlug, repoRoot);

  if (worldIndexStatus.kind !== "fresh") {
    return {
      worldIndexStatus,
      degradedDirectRead: true,
      branches: [],
    };
  }

  const db = openExistingIndex(repoRoot, options.worldSlug);
  try {
    return {
      worldIndexStatus,
      degradedDirectRead: false,
      branches: querySceneCoverage(db, queryOptions(options)),
    };
  } finally {
    db.close();
  }
}

export function readSceneCoverageBranch(
  options: SceneCoverageReadOptions & { branchId: string },
  repoRoot = resolveRepoRoot(),
): SceneCoverageBranch | null {
  return readSceneCoverage(options, repoRoot).branches[0] ?? null;
}
