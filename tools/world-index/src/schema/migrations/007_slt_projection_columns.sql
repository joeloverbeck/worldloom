BEGIN TRANSACTION;

CREATE TABLE slt_projections (
    node_id TEXT PRIMARY KEY,
    world_slug TEXT NOT NULL,
    story_slug TEXT NOT NULL,
    slt_scope_visibility TEXT,
    slt_scope_branch_id TEXT,
    slt_scope_branch_path_prefix TEXT,
    slt_provenance_origin TEXT,
    slt_move_family TEXT,
    slt_saliency_urgency TEXT,
    slt_saliency_cooldown_pages INTEGER,
    slt_mystery_policy_allowed_authority TEXT,
    candidate_projection_hash TEXT NOT NULL,
    FOREIGN KEY (node_id) REFERENCES nodes(node_id)
);

CREATE INDEX idx_slt_projections_story_scope
    ON slt_projections(world_slug, story_slug, slt_scope_visibility);
CREATE INDEX idx_slt_projections_story_move
    ON slt_projections(world_slug, story_slug, slt_move_family);
CREATE INDEX idx_slt_projections_story_saliency
    ON slt_projections(world_slug, story_slug, slt_saliency_urgency);

COMMIT;
