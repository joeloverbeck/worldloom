BEGIN TRANSACTION;

CREATE TABLE scene_coverage (
    world_slug TEXT NOT NULL,
    story_slug TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    active_scene_ids_json TEXT NOT NULL,
    superseded_scene_ids_json TEXT NOT NULL,
    unscened_ranges_json TEXT NOT NULL,
    pg_scene_lookup_json TEXT NOT NULL,
    scenes_json TEXT NOT NULL,
    refreshed_at TEXT NOT NULL,
    PRIMARY KEY (world_slug, story_slug, branch_id)
);
CREATE INDEX idx_scene_coverage_story ON scene_coverage(world_slug, story_slug);

COMMIT;
