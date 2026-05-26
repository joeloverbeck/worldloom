import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { resolveRepoRoot, worldDbPath } from "../config/repo-root.js";
import { resolveIndexStatus } from "./index-status.js";
import type { WorldSummary } from "../view-models/world-summary.js";

function directoryEntries(parent: string): string[] {
  try {
    return readdirSync(parent)
      .filter((entry) => !entry.startsWith("."))
      .filter((entry) => statSync(path.join(parent, entry)).isDirectory())
      .sort();
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function displayNameFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function enumerateWorlds(repoRoot = resolveRepoRoot()): Promise<WorldSummary[]> {
  const worldsRoot = path.join(repoRoot, "worlds");

  return directoryEntries(worldsRoot).map((worldSlug) => {
    const worldPath = path.join(worldsRoot, worldSlug);
    const indexStatus = resolveIndexStatus(worldSlug, repoRoot);
    const storiesRoot = path.join(worldPath, "stories");
    const driftedFiles = indexStatus.kind === "stale" ? indexStatus.driftedFiles : [];
    const errors = indexStatus.kind === "open_failed" ? [indexStatus.error] : [];

    return {
      worldSlug,
      displayName: displayNameFromSlug(worldSlug),
      path: worldPath,
      indexStatus,
      storyCount: directoryEntries(storiesRoot).length,
      hasWorldDb: existsSync(worldDbPath(worldSlug, repoRoot)),
      indexVersion: indexStatus.kind === "fresh" ? indexStatus.version : null,
      driftedFiles,
      errors,
    };
  });
}
