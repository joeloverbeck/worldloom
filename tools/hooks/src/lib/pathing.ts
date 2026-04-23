import { existsSync } from "node:fs";
import path from "node:path";

const ROOT_MARKERS = [
  ["worlds"],
  ["tools", "hooks", "README.md"]
] as const;

function hasRootMarkers(candidateRoot: string): boolean {
  return ROOT_MARKERS.every((segments) => existsSync(path.join(candidateRoot, ...segments)));
}

function findRepoRootFrom(startPath: string): string | null {
  let current = path.resolve(startPath);

  while (true) {
    if (hasRootMarkers(current)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

export function resolveRepoRoot(cwd?: string): string {
  const projectDir = process.env.CLAUDE_PROJECT_DIR;
  if (projectDir !== undefined && hasRootMarkers(projectDir)) {
    return projectDir;
  }

  if (cwd !== undefined) {
    const cwdRoot = findRepoRootFrom(cwd);
    if (cwdRoot !== null) {
      return cwdRoot;
    }
  }

  const processRoot = findRepoRootFrom(process.cwd());
  if (processRoot !== null) {
    return processRoot;
  }

  const moduleRoot = findRepoRootFrom(__dirname);
  if (moduleRoot !== null) {
    return moduleRoot;
  }

  throw new Error("Unable to resolve the worldloom repo root for tools/hooks.");
}

export function resolveWorldsRoot(cwd?: string): string {
  return path.join(resolveRepoRoot(cwd), "worlds");
}

export function resolveWorldRoot(worldSlug: string, cwd?: string): string {
  return path.join(resolveWorldsRoot(cwd), worldSlug);
}

export function resolveWorldDbPath(worldSlug: string, cwd?: string): string {
  return path.join(resolveWorldRoot(worldSlug, cwd), "_index", "world.db");
}
