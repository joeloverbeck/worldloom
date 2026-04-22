import { openExistingWorldIndex } from "./shared";

export function stats(worldRoot: string, worldSlug: string): number {
  const opened = openExistingWorldIndex(worldRoot, worldSlug);
  if (opened instanceof Error) {
    console.error(opened.message);
    return 1;
  }

  try {
    const counts = opened.prepare(
      `
        SELECT node_type, COUNT(*) AS count
        FROM nodes
        WHERE world_slug = ?
        GROUP BY node_type
        ORDER BY node_type
      `
    ).all(worldSlug) as Array<{ node_type: string; count: number }>;
    const freshness = opened.prepare(
      `
        SELECT file_path, last_indexed_at
        FROM file_versions
        WHERE world_slug = ?
        ORDER BY file_path
      `
    ).all(worldSlug) as Array<{ file_path: string; last_indexed_at: string }>;

    console.log(`World: ${worldSlug}`);
    console.log("");
    console.log("Node counts:");
    for (const row of counts) {
      console.log(`  ${row.node_type}: ${row.count}`);
    }
    console.log("");
    console.log("File freshness:");
    for (const row of freshness) {
      console.log(`  ${row.file_path}: ${row.last_indexed_at}`);
    }

    return 0;
  } finally {
    opened.close();
  }
}
