import type Database from "better-sqlite3";

export function getFileVersion(
  db: Database.Database,
  worldSlug: string,
  filePath: string
): string | null {
  const row = db
    .prepare(
      `
        SELECT content_hash
        FROM file_versions
        WHERE world_slug = ? AND file_path = ?
      `
    )
    .get(worldSlug, filePath) as { content_hash: string } | undefined;

  return row?.content_hash ?? null;
}

export function upsertFileVersion(
  db: Database.Database,
  worldSlug: string,
  filePath: string,
  contentHash: string
): void {
  db
    .prepare(
      `
        INSERT INTO file_versions (
          world_slug,
          file_path,
          content_hash,
          last_indexed_at
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT(world_slug, file_path) DO UPDATE SET
          content_hash = excluded.content_hash,
          last_indexed_at = excluded.last_indexed_at
      `
    )
    .run(worldSlug, filePath, contentHash, new Date().toISOString());
}
