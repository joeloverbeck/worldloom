import { existsSync } from "node:fs";
import path from "node:path";

const ROOT_MARKERS = [
  ["tools", "world-mcp", "package.json"],
  ["worlds"]
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

export function resolveRepoRoot(): string {
  const cwdRoot = findRepoRootFrom(process.cwd());
  if (cwdRoot !== null) {
    return cwdRoot;
  }

  const moduleRoot = findRepoRootFrom(__dirname);
  if (moduleRoot !== null) {
    return moduleRoot;
  }

  throw new Error("Unable to resolve the worldloom repo root for tools/world-mcp.");
}

export function resolveWorldDirectory(worldSlug: string): string {
  return path.join(resolveRepoRoot(), "worlds", worldSlug);
}

export function resolveWorldDbPath(worldSlug: string): string {
  return path.join(resolveWorldDirectory(worldSlug), "_index", "world.db");
}

export function resolveIndexVersionPath(worldSlug: string): string {
  return path.join(resolveWorldDirectory(worldSlug), "_index", "index_version.txt");
}

