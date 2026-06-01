import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import { err, ok, type ReadResult } from "./result.js";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

export interface WorldEntry {
  worldSlug: string;
  absolutePath: string;
  hasWorldKernel: boolean;
}

export function enumerateWorlds(repoRoot: string): ReadResult<WorldEntry[]> {
  const worldsDir = path.join(repoRoot, "worlds");
  if (!existsSync(worldsDir)) {
    return ok([]);
  }

  let entries;
  try {
    entries = readdirSync(worldsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) => SLUG_PATTERN.test(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name, "en-US"));
  } catch (cause) {
    return err({
      code: "io_error",
      path: worldsDir,
      cause,
      repair_hint: "Check file permissions on the worlds directory.",
    });
  }

  const results: WorldEntry[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(worldsDir, entry.name);
    const hasWorldKernel = existsSync(path.join(absolutePath, "WORLD_KERNEL.md"));
    if (!hasWorldKernel) {
      continue;
    }
    results.push({ worldSlug: entry.name, absolutePath, hasWorldKernel });
  }
  return ok(results);
}
