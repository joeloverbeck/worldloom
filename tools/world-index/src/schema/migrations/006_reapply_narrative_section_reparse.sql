BEGIN TRANSACTION;

-- Version 5 originally shipped as a comment-only parser-vocabulary migration.
-- Indexes that already recorded version 5 will not rerun migration 005 after it
-- is corrected, so version 6 reapplies the same stale-row invalidation for
-- already-upgraded local DBs.
DROP TABLE IF EXISTS temp.v6_narrative_section_reparse_nodes;

CREATE TEMP TABLE v6_narrative_section_reparse_nodes AS
SELECT node_id
FROM nodes
WHERE node_type = 'section'
  AND file_path = 'WORLD_KERNEL.md';

DELETE FROM anchor_checksums
WHERE node_id IN (SELECT node_id FROM v6_narrative_section_reparse_nodes);

DELETE FROM entity_mentions
WHERE node_id IN (SELECT node_id FROM v6_narrative_section_reparse_nodes)
   OR resolved_entity_id IN (
    SELECT entity_id
    FROM entities
    WHERE entity_id IN (SELECT node_id FROM v6_narrative_section_reparse_nodes)
       OR source_node_id IN (SELECT node_id FROM v6_narrative_section_reparse_nodes)
  );

DELETE FROM entity_aliases
WHERE source_node_id IN (SELECT node_id FROM v6_narrative_section_reparse_nodes)
   OR entity_id IN (
    SELECT entity_id
    FROM entities
    WHERE entity_id IN (SELECT node_id FROM v6_narrative_section_reparse_nodes)
       OR source_node_id IN (SELECT node_id FROM v6_narrative_section_reparse_nodes)
  );

DELETE FROM entities
WHERE entity_id IN (SELECT node_id FROM v6_narrative_section_reparse_nodes)
   OR source_node_id IN (SELECT node_id FROM v6_narrative_section_reparse_nodes);

DELETE FROM scoped_reference_aliases
WHERE reference_id IN (
  SELECT reference_id
  FROM scoped_references
  WHERE reference_id IN (SELECT node_id FROM v6_narrative_section_reparse_nodes)
     OR source_node_id IN (SELECT node_id FROM v6_narrative_section_reparse_nodes)
     OR target_node_id IN (SELECT node_id FROM v6_narrative_section_reparse_nodes)
);

DELETE FROM scoped_references
WHERE reference_id IN (SELECT node_id FROM v6_narrative_section_reparse_nodes)
   OR source_node_id IN (SELECT node_id FROM v6_narrative_section_reparse_nodes)
   OR target_node_id IN (SELECT node_id FROM v6_narrative_section_reparse_nodes);

DELETE FROM edges
WHERE source_node_id IN (SELECT node_id FROM v6_narrative_section_reparse_nodes)
   OR target_node_id IN (SELECT node_id FROM v6_narrative_section_reparse_nodes);

DELETE FROM validation_results
WHERE file_path = 'WORLD_KERNEL.md';

DELETE FROM nodes
WHERE node_id IN (SELECT node_id FROM v6_narrative_section_reparse_nodes);

DELETE FROM file_versions
WHERE file_path = 'WORLD_KERNEL.md';

DROP TABLE v6_narrative_section_reparse_nodes;

COMMIT;
