BEGIN TRANSACTION;

DROP TABLE IF EXISTS temp.v8_legacy_page_prose_nodes;

CREATE TEMP TABLE v8_legacy_page_prose_nodes AS
SELECT node_id
FROM nodes
WHERE file_path LIKE 'stories/%/pages-prose/%'
   OR file_path LIKE 'stories/%/pages-prose-plans/%'
   OR file_path LIKE 'stories/%/pages-prose-receipts/%';

DELETE FROM scoped_reference_aliases
WHERE reference_id IN (
  SELECT reference_id
  FROM scoped_references
  WHERE reference_id IN (SELECT node_id FROM v8_legacy_page_prose_nodes)
     OR source_node_id IN (SELECT node_id FROM v8_legacy_page_prose_nodes)
     OR target_node_id IN (SELECT node_id FROM v8_legacy_page_prose_nodes)
);

DELETE FROM scoped_references
WHERE reference_id IN (SELECT node_id FROM v8_legacy_page_prose_nodes)
   OR source_node_id IN (SELECT node_id FROM v8_legacy_page_prose_nodes)
   OR target_node_id IN (SELECT node_id FROM v8_legacy_page_prose_nodes);

DELETE FROM entity_aliases
WHERE entity_id IN (SELECT node_id FROM v8_legacy_page_prose_nodes)
   OR source_node_id IN (SELECT node_id FROM v8_legacy_page_prose_nodes);

DELETE FROM entities
WHERE entity_id IN (SELECT node_id FROM v8_legacy_page_prose_nodes)
   OR source_node_id IN (SELECT node_id FROM v8_legacy_page_prose_nodes);

DELETE FROM entity_mentions
WHERE node_id IN (SELECT node_id FROM v8_legacy_page_prose_nodes)
   OR resolved_entity_id IN (SELECT node_id FROM v8_legacy_page_prose_nodes);

DELETE FROM edges
WHERE source_node_id IN (SELECT node_id FROM v8_legacy_page_prose_nodes)
   OR target_node_id IN (SELECT node_id FROM v8_legacy_page_prose_nodes);

DELETE FROM anchor_checksums
WHERE node_id IN (SELECT node_id FROM v8_legacy_page_prose_nodes);

DELETE FROM nodes
WHERE node_id IN (SELECT node_id FROM v8_legacy_page_prose_nodes);

DELETE FROM file_versions
WHERE file_path LIKE 'stories/%/pages-prose/%'
   OR file_path LIKE 'stories/%/pages-prose-plans/%'
   OR file_path LIKE 'stories/%/pages-prose-receipts/%';

DROP TABLE v8_legacy_page_prose_nodes;

COMMIT;
