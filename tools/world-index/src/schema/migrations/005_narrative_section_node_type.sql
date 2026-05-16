BEGIN TRANSACTION;

-- Schema version 5 reclassifies WORLD_KERNEL.md depth-2 spans from
-- `section` to `narrative_section`. Indexes created before v5 can already
-- have WORLD_KERNEL.md rows stored as `section` with an unchanged content hash.
-- Delete those stale rows and invalidate their file_versions entry so the next
-- incremental sync re-parses WORLD_KERNEL.md with the v5 parser vocabulary.
DROP TABLE IF EXISTS temp.v5_narrative_section_reparse_nodes;

CREATE TEMP TABLE v5_narrative_section_reparse_nodes AS
SELECT node_id
FROM nodes
WHERE node_type = 'section'
  AND file_path = 'WORLD_KERNEL.md';

DELETE FROM anchor_checksums
WHERE node_id IN (SELECT node_id FROM v5_narrative_section_reparse_nodes);

DELETE FROM entity_mentions
WHERE node_id IN (SELECT node_id FROM v5_narrative_section_reparse_nodes)
   OR resolved_entity_id IN (
    SELECT entity_id
    FROM entities
    WHERE entity_id IN (SELECT node_id FROM v5_narrative_section_reparse_nodes)
       OR source_node_id IN (SELECT node_id FROM v5_narrative_section_reparse_nodes)
  );

DELETE FROM entity_aliases
WHERE source_node_id IN (SELECT node_id FROM v5_narrative_section_reparse_nodes)
   OR entity_id IN (
    SELECT entity_id
    FROM entities
    WHERE entity_id IN (SELECT node_id FROM v5_narrative_section_reparse_nodes)
       OR source_node_id IN (SELECT node_id FROM v5_narrative_section_reparse_nodes)
  );

DELETE FROM entities
WHERE entity_id IN (SELECT node_id FROM v5_narrative_section_reparse_nodes)
   OR source_node_id IN (SELECT node_id FROM v5_narrative_section_reparse_nodes);

DELETE FROM scoped_reference_aliases
WHERE reference_id IN (
  SELECT reference_id
  FROM scoped_references
  WHERE reference_id IN (SELECT node_id FROM v5_narrative_section_reparse_nodes)
     OR source_node_id IN (SELECT node_id FROM v5_narrative_section_reparse_nodes)
     OR target_node_id IN (SELECT node_id FROM v5_narrative_section_reparse_nodes)
);

DELETE FROM scoped_references
WHERE reference_id IN (SELECT node_id FROM v5_narrative_section_reparse_nodes)
   OR source_node_id IN (SELECT node_id FROM v5_narrative_section_reparse_nodes)
   OR target_node_id IN (SELECT node_id FROM v5_narrative_section_reparse_nodes);

DELETE FROM edges
WHERE source_node_id IN (SELECT node_id FROM v5_narrative_section_reparse_nodes)
   OR target_node_id IN (SELECT node_id FROM v5_narrative_section_reparse_nodes);

DELETE FROM validation_results
WHERE file_path = 'WORLD_KERNEL.md';

DELETE FROM nodes
WHERE node_id IN (SELECT node_id FROM v5_narrative_section_reparse_nodes);

DELETE FROM file_versions
WHERE file_path = 'WORLD_KERNEL.md';

DROP TABLE v5_narrative_section_reparse_nodes;

COMMIT;
