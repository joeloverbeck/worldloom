BEGIN TRANSACTION;

ALTER TABLE nodes ADD COLUMN story_slug TEXT;
ALTER TABLE edges ADD COLUMN story_slug TEXT;
ALTER TABLE entity_mentions ADD COLUMN story_slug TEXT;

CREATE INDEX idx_nodes_world_story_type ON nodes(world_slug, story_slug, node_type);
CREATE INDEX idx_nodes_world_story_node ON nodes(world_slug, story_slug, node_id);
CREATE INDEX idx_edges_story ON edges(story_slug, edge_type);
CREATE INDEX idx_entity_mentions_story ON entity_mentions(story_slug, surface_text);

COMMIT;
