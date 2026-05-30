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

// Refresh last_indexed_at without changing the stored content_hash.
// Used by sync's skip path: a re-parsed file whose hash matches the stored
// hash must still bump last_indexed_at so the MCP freshness check's
// mtime gate (mtime > last_indexed_at) does not re-hash it on every call
// and falsely flag it as drifted. This is what makes sync converge to
// build per FOUNDATIONS.md §Canonical Storage Layer.
export function touchFileVersion(
  db: Database.Database,
  worldSlug: string,
  filePath: string
): void {
  db
    .prepare(
      `
        UPDATE file_versions
        SET last_indexed_at = ?
        WHERE world_slug = ? AND file_path = ?
      `
    )
    .run(new Date().toISOString(), worldSlug, filePath);
}

export function listIndexedFiles(db: Database.Database, worldSlug: string): string[] {
  return (
    db
      .prepare(
        `
          SELECT file_path
          FROM file_versions
          WHERE world_slug = ?
          ORDER BY file_path
        `
      )
      .all(worldSlug) as Array<{ file_path: string }>
  ).map((row) => row.file_path);
}

export function removeFileVersion(
  db: Database.Database,
  worldSlug: string,
  filePath: string
): void {
  db.prepare("DELETE FROM file_versions WHERE world_slug = ? AND file_path = ?").run(
    worldSlug,
    filePath
  );
}
