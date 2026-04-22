import type Database from "better-sqlite3";

export function rebuildFtsIndex(db: Database.Database): void {
  db.exec("INSERT INTO fts_nodes(fts_nodes) VALUES('rebuild')");
}

export function shouldRebuildFts(changedNodeCount: number, totalNodeCount: number): boolean {
  return totalNodeCount > 0 && changedNodeCount / totalNodeCount > 0.1;
}
