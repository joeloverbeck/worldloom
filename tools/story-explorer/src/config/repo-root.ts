import { existsSync } from "node:fs";
import path from "node:path";

function hasGitMarker(candidate: string): boolean {
  return existsSync(path.join(candidate, ".git"));
}

function findNearestGitRoot(startDir: string): string | null {
  let current = path.resolve(startDir);

  while (true) {
    if (hasGitMarker(current)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

export function resolveRepoRoot(startDir = process.cwd()): string {
  const root = findNearestGitRoot(startDir);
  if (root === null) {
    throw new Error(`Unable to resolve repository root from ${path.resolve(startDir)}`);
  }

  return root;
}

export function worldDirectoryPath(worldSlug: string, repoRoot = resolveRepoRoot()): string {
  return path.join(repoRoot, "worlds", worldSlug);
}

export function worldDbPath(worldSlug: string, repoRoot = resolveRepoRoot()): string {
  return path.join(worldDirectoryPath(worldSlug, repoRoot), "_index", "world.db");
}
