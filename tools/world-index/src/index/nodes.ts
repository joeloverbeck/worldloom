import type Database from "better-sqlite3";

import type {
  AnchorChecksumRow,
  ArcTraceNodeRow,
  EntityAliasRow,
  EntityMentionRow,
  EntityRow,
  NodeRow,
  ScopedReferenceAliasRow,
  ScopedReferenceRow,
  ValidationResultRow
} from "../schema/types";
import { parseYamlWithRecovery } from "../parse/yaml";

export function insertNodes(db: Database.Database, rows: NodeRow[]): void {
  db.transaction((batch: NodeRow[]) => {
    const statement = db.prepare(`
      INSERT INTO nodes (
        node_id,
        world_slug,
        story_slug,
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
        @story_slug,
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
      statement.run({ story_slug: null, ...row });
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

    db.prepare(`DELETE FROM arc_trace_observes_action_by WHERE arc_trace_id IN (${placeholders})`).run(
      ...nodeIds
    );
    db.prepare(`DELETE FROM arc_trace_realizes_arc WHERE arc_trace_id IN (${placeholders})`).run(
      ...nodeIds
    );
    db.prepare(`DELETE FROM arc_trace_describes_page WHERE arc_trace_id IN (${placeholders})`).run(
      ...nodeIds
    );
    db.prepare(`DELETE FROM arc_trace_node WHERE id IN (${placeholders})`).run(...nodeIds);
    db.prepare(`DELETE FROM anchor_checksums WHERE node_id IN (${placeholders})`).run(...nodeIds);
    db.prepare(`DELETE FROM entity_mentions WHERE node_id IN (${placeholders})`).run(...nodeIds);
    db.prepare(`DELETE FROM entity_aliases WHERE source_node_id IN (${placeholders})`).run(...nodeIds);
    db.prepare(`DELETE FROM entities WHERE source_node_id IN (${placeholders})`).run(...nodeIds);
    db.prepare(`DELETE FROM scoped_reference_aliases WHERE reference_id IN (${placeholders})`).run(
      ...nodeIds
    );
    db.prepare(
      `
        DELETE FROM scoped_references
        WHERE reference_id IN (${placeholders})
           OR source_node_id IN (${placeholders})
           OR target_node_id IN (${placeholders})
      `
    ).run(...nodeIds, ...nodeIds, ...nodeIds);
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

export function insertArcTraceRows(db: Database.Database, nodes: NodeRow[]): void {
  const rows = nodes.flatMap((node) => arcTraceRowFromNode(node));
  if (rows.length === 0) {
    return;
  }

  db.transaction((batch: ArcTraceNodeRow[]) => {
    const nodeStatement = db.prepare(`
      INSERT INTO arc_trace_node (
        id,
        arc_trace_id,
        story_slug,
        story_id,
        created_at_page,
        created_at_page_node_id,
        arc_realized,
        arc_realized_node_id,
        effect_variant_applied,
        semantic_critic_status,
        claim_text,
        action_text,
        violation_text
      ) VALUES (
        @id,
        @arc_trace_id,
        @story_slug,
        @story_id,
        @created_at_page,
        @created_at_page_node_id,
        @arc_realized,
        @arc_realized_node_id,
        @effect_variant_applied,
        @semantic_critic_status,
        @claim_text,
        @action_text,
        @violation_text
      )
    `);
    const describesPageStatement = db.prepare(`
      INSERT OR IGNORE INTO arc_trace_describes_page (arc_trace_id, page_id)
      VALUES (@id, @created_at_page_node_id)
    `);
    const realizesArcStatement = db.prepare(`
      INSERT OR IGNORE INTO arc_trace_realizes_arc (arc_trace_id, arc_id)
      VALUES (@id, @arc_realized_node_id)
    `);
    const observesActionStatement = db.prepare(`
      INSERT OR IGNORE INTO arc_trace_observes_action_by (arc_trace_id, actor_stent_id)
      VALUES (@arc_trace_id, @actor_stent_id)
    `);

    for (const row of batch) {
      nodeStatement.run(row);
      describesPageStatement.run(row);
      realizesArcStatement.run(row);
      for (const actorStentId of actorIdsForArcTrace(row.id, nodes)) {
        observesActionStatement.run({ arc_trace_id: row.id, actor_stent_id: actorStentId });
      }
    }
  })(rows);
}

function arcTraceRowFromNode(node: NodeRow): ArcTraceNodeRow[] {
  if (node.node_type !== "arc_trace_node" || !node.story_slug) {
    return [];
  }

  const parsed = parseYamlWithRecovery(node.body);
  if (!isRecord(parsed)) {
    return [];
  }

  const arcTraceId = stringField(parsed, "id");
  const storyId = stringField(parsed, "story_id");
  const createdAtPage = stringField(parsed, "created_at_page");
  const arcRealized = stringField(parsed, "arc_realized");
  const semanticCriticVerdict = recordField(parsed, "semantic_critic_verdict");
  const semanticCriticStatus = semanticCriticVerdict
    ? stringField(semanticCriticVerdict, "status")
    : null;

  if (!arcTraceId || !storyId || !createdAtPage || !arcRealized || !semanticCriticStatus) {
    return [];
  }

  return [
    {
      id: node.node_id,
      arc_trace_id: arcTraceId,
      story_slug: node.story_slug,
      story_id: storyId,
      created_at_page: createdAtPage,
      created_at_page_node_id: storyNodeId(node.story_slug, createdAtPage),
      arc_realized: arcRealized,
      arc_realized_node_id: storyNodeId(node.story_slug, arcRealized),
      effect_variant_applied: stringField(parsed, "effect_variant_applied"),
      semantic_critic_status: semanticCriticStatus,
      claim_text: joinedTextField(parsed, "observed_claims", "claim"),
      action_text: joinedTextField(parsed, "observed_actions", "action"),
      violation_text: joinedTextField(parsed, "possible_violations", "detail", "envelope_item")
    }
  ];
}

function actorIdsForArcTrace(nodeId: string, nodes: NodeRow[]): string[] {
  const node = nodes.find((candidate) => candidate.node_id === nodeId);
  if (!node || !node.story_slug) {
    return [];
  }

  const parsed = parseYamlWithRecovery(node.body);
  if (!isRecord(parsed)) {
    return [];
  }

  const actorIds = new Set<string>();
  for (const action of arrayOfRecords(parsed.observed_actions)) {
    const actor = stringField(action, "actor");
    if (actor) {
      actorIds.add(storyNodeId(node.story_slug, actor));
    }
  }
  return [...actorIds].sort((left, right) => left.localeCompare(right, "en-US"));
}

function joinedTextField(
  record: Record<string, unknown>,
  arrayField: string,
  ...textFields: string[]
): string | null {
  const values: string[] = [];
  for (const entry of arrayOfRecords(record[arrayField])) {
    for (const textField of textFields) {
      const value = stringField(entry, textField);
      if (value) {
        values.push(value);
      }
    }
  }
  return values.length > 0 ? values.join("\n") : null;
}

function storyNodeId(storySlug: string, recordId: string): string {
  return `${storySlug}:${recordId}`;
}

function recordField(record: Record<string, unknown>, field: string): Record<string, unknown> | null {
  const value = record[field];
  return isRecord(value) ? value : null;
}

function stringField(record: Record<string, unknown>, field: string): string | null {
  const value = record[field];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function arrayOfRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

export function insertScopedReferences(
  db: Database.Database,
  rows: ScopedReferenceRow[]
): void {
  db.transaction((batch: ScopedReferenceRow[]) => {
    const statement = db.prepare(`
      INSERT INTO scoped_references (
        reference_id,
        world_slug,
        display_name,
        reference_kind,
        provenance_scope,
        relation,
        source_node_id,
        source_field,
        target_node_id,
        authority_level
      ) VALUES (
        @reference_id,
        @world_slug,
        @display_name,
        @reference_kind,
        @provenance_scope,
        @relation,
        @source_node_id,
        @source_field,
        @target_node_id,
        @authority_level
      )
    `);

    for (const row of batch) {
      statement.run(row);
    }
  })(rows);
}

export function insertScopedReferenceAliases(
  db: Database.Database,
  rows: ScopedReferenceAliasRow[]
): void {
  db.transaction((batch: ScopedReferenceAliasRow[]) => {
    const statement = db.prepare(`
      INSERT INTO scoped_reference_aliases (
        alias_id,
        reference_id,
        alias_text
      ) VALUES (
        @alias_id,
        @reference_id,
        @alias_text
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
        story_slug,
        node_id,
        surface_text,
        resolved_entity_id,
        resolution_kind,
        extraction_method
      ) VALUES (
        @mention_id,
        @story_slug,
        @node_id,
        @surface_text,
        @resolved_entity_id,
        @resolution_kind,
        @extraction_method
      )
    `);

    for (const row of batch) {
      statement.run({ story_slug: null, ...row });
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
