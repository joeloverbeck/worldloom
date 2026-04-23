import type Database from "better-sqlite3";

import type {
  AnchorChecksumRow,
  EntityAliasRow,
  EntityMentionRow,
  EntityRow,
  NodeRow,
  ValidationResultRow
} from "../schema/types";

export function insertNodes(db: Database.Database, rows: NodeRow[]): void {
  db.transaction((batch: NodeRow[]) => {
    const statement = db.prepare(`
      INSERT INTO nodes (
        node_id,
        world_slug,
        file_path,
        heading_path,
        byte_start,
        byte_end,
        line_start,
        line_end,
        node_type,
        body,
        content_hash,
        anchor_checksum,
        summary,
        created_at_index_version
      ) VALUES (
        @node_id,
        @world_slug,
        @file_path,
        @heading_path,
        @byte_start,
        @byte_end,
        @line_start,
        @line_end,
        @node_type,
        @body,
        @content_hash,
        @anchor_checksum,
        @summary,
        @created_at_index_version
      )
    `);

    for (const row of batch) {
      statement.run(row);
    }
  })(rows);
}

export function deleteNodesByFile(
  db: Database.Database,
  worldSlug: string,
  filePath: string
): void {
  db.transaction(() => {
    const nodeIds = (
      db
        .prepare(
          `
            SELECT node_id
            FROM nodes
            WHERE world_slug = ? AND file_path = ?
          `
        )
        .all(worldSlug, filePath) as Array<{ node_id: string }>
    ).map((row) => row.node_id);

    if (nodeIds.length === 0) {
      return;
    }

    const placeholders = nodeIds.map(() => "?").join(", ");

    db.prepare(`DELETE FROM anchor_checksums WHERE node_id IN (${placeholders})`).run(...nodeIds);
    db.prepare(`DELETE FROM entity_mentions WHERE node_id IN (${placeholders})`).run(...nodeIds);
    db.prepare(`DELETE FROM entity_aliases WHERE source_node_id IN (${placeholders})`).run(...nodeIds);
    db.prepare(`DELETE FROM entities WHERE source_node_id IN (${placeholders})`).run(...nodeIds);
    db.prepare(
      `
        DELETE FROM edges
        WHERE source_node_id IN (${placeholders})
           OR target_node_id IN (${placeholders})
      `
    ).run(...nodeIds, ...nodeIds);
    db.prepare(`DELETE FROM nodes WHERE node_id IN (${placeholders})`).run(...nodeIds);
  })();
}

export function insertAnchorChecksums(
  db: Database.Database,
  rows: AnchorChecksumRow[]
): void {
  db.transaction((batch: AnchorChecksumRow[]) => {
    const statement = db.prepare(`
      INSERT INTO anchor_checksums (
        node_id,
        anchor_form,
        checksum
      ) VALUES (
        @node_id,
        @anchor_form,
        @checksum
      )
    `);

    for (const row of batch) {
      statement.run(row);
    }
  })(rows);
}

export function insertEntities(db: Database.Database, rows: EntityRow[]): void {
  db.transaction((batch: EntityRow[]) => {
    const statement = db.prepare(`
      INSERT INTO entities (
        entity_id,
        world_slug,
        canonical_name,
        entity_kind,
        provenance_scope,
        authority_level,
        source_node_id,
        source_field
      ) VALUES (
        @entity_id,
        @world_slug,
        @canonical_name,
        @entity_kind,
        @provenance_scope,
        @authority_level,
        @source_node_id,
        @source_field
      )
    `);

    for (const row of batch) {
      statement.run(row);
    }
  })(rows);
}

export function insertEntityAliases(db: Database.Database, rows: EntityAliasRow[]): void {
  db.transaction((batch: EntityAliasRow[]) => {
    const statement = db.prepare(`
      INSERT INTO entity_aliases (
        alias_id,
        entity_id,
        alias_text,
        alias_kind,
        source_node_id
      ) VALUES (
        @alias_id,
        @entity_id,
        @alias_text,
        @alias_kind,
        @source_node_id
      )
    `);

    for (const row of batch) {
      statement.run(row);
    }
  })(rows);
}

export function insertEntityMentions(
  db: Database.Database,
  rows: EntityMentionRow[]
): void {
  db.transaction((batch: EntityMentionRow[]) => {
    const statement = db.prepare(`
      INSERT INTO entity_mentions (
        mention_id,
        node_id,
        surface_text,
        resolved_entity_id,
        resolution_kind,
        extraction_method
      ) VALUES (
        @mention_id,
        @node_id,
        @surface_text,
        @resolved_entity_id,
        @resolution_kind,
        @extraction_method
      )
    `);

    for (const row of batch) {
      statement.run(row);
    }
  })(rows);
}

export function insertValidationResults(
  db: Database.Database,
  rows: ValidationResultRow[]
): void {
  db.transaction((batch: ValidationResultRow[]) => {
    const statement = db.prepare(`
      INSERT INTO validation_results (
        world_slug,
        validator_name,
        severity,
        code,
        message,
        node_id,
        file_path,
        line_range_start,
        line_range_end,
        created_at
      ) VALUES (
        @world_slug,
        @validator_name,
        @severity,
        @code,
        @message,
        @node_id,
        @file_path,
        @line_range_start,
        @line_range_end,
        @created_at
      )
    `);

    for (const row of batch) {
      statement.run(row);
    }
  })(rows);
}
