import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

export interface WorldEntry {
  worldSlug: string;
  absolutePath: string;
  hasWorldKernel: boolean;
}

export function enumerateWorlds(repoRoot: string): WorldEntry[] {
  const worldsDir = path.join(repoRoot, "worlds");
  if (!existsSync(worldsDir)) {
    return [];
  }

  const entries = readdirSync(worldsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => SLUG_PATTERN.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, "en-US"));

  const results: WorldEntry[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(worldsDir, entry.name);
    const hasWorldKernel = existsSync(path.join(absolutePath, "WORLD_KERNEL.md"));
    if (!hasWorldKernel) {
      continue;
    }
    results.push({ worldSlug: entry.name, absolutePath, hasWorldKernel });
  }
  return results;
}
