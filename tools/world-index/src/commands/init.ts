import { existsSync } from "node:fs";
import path from "node:path";

import { databasePathForWorld, openIndex } from "../index/open";

const WORLD_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidWorldSlug(value: string): boolean {
  return WORLD_SLUG_PATTERN.test(value);
}

export function init(worldRoot: string, worldSlug: string): number {
  if (!isValidWorldSlug(worldSlug)) {
    process.stderr.write(
      `invalid_world_slug: '${worldSlug}' must be lowercase kebab-case using letters, numbers, and hyphens.\n`
    );
    return 2;
  }

  const databasePath = databasePathForWorld(worldRoot, worldSlug);
  if (existsSync(databasePath)) {
    process.stderr.write(
      [
        `world_index_already_exists: worlds/${worldSlug}/_index/world.db already exists.`,
        "Use 'world-index sync <world-slug>' to refresh, or remove the file first."
      ].join(" ") + "\n"
    );
    return 1;
  }

  const db = openIndex(worldRoot, worldSlug);
  db.close();

  process.stdout.write(
    `Initialized empty world index at ${path.join("worlds", worldSlug, "_index", "world.db")}\n`
  );
  return 0;
}
