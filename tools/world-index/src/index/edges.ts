import type Database from "better-sqlite3";

import type { EdgeRow } from "../schema/types";

export function insertEdges(db: Database.Database, rows: EdgeRow[]): void {
  db.transaction((batch: EdgeRow[]) => {
    const statement = db.prepare(`
      INSERT INTO edges (
        edge_id,
        source_node_id,
        target_node_id,
        target_unresolved_ref,
        edge_type
      ) VALUES (
        @edge_id,
        @source_node_id,
        @target_node_id,
        @target_unresolved_ref,
        @edge_type
      )
    `);

    for (const row of batch) {
      statement.run(row);
    }
  })(dedupeEdges(rows));
}

export function resolveUnresolvedEdges(db: Database.Database): number {
  const result = db
    .prepare(
      `
        UPDATE edges
        SET
          target_node_id = (
            SELECT node_id
            FROM nodes
            WHERE node_id = edges.target_unresolved_ref
            LIMIT 1
          ),
          target_unresolved_ref = NULL
        WHERE target_unresolved_ref IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM nodes
            WHERE node_id = edges.target_unresolved_ref
          )
      `
    )
    .run();

  return result.changes;
}

export function dedupeEdges(rows: EdgeRow[]): EdgeRow[] {
  const deduped = new Map<string, EdgeRow>();

  for (const row of rows) {
    const targetKey = row.target_node_id ?? row.target_unresolved_ref ?? "__null__";
    const key = [row.source_node_id, row.edge_type, targetKey].join("\u0000");
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, row);
      continue;
    }

    if (existing.target_node_id === null && row.target_node_id !== null) {
      deduped.set(key, row);
    }
  }

  return [...deduped.values()];
}
