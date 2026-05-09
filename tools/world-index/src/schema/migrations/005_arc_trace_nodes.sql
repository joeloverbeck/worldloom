BEGIN TRANSACTION;

CREATE TABLE arc_trace_node (
    id TEXT PRIMARY KEY,
    arc_trace_id TEXT NOT NULL,
    story_slug TEXT NOT NULL,
    story_id TEXT NOT NULL,
    created_at_page TEXT NOT NULL,
    created_at_page_node_id TEXT NOT NULL,
    arc_realized TEXT NOT NULL,
    arc_realized_node_id TEXT NOT NULL,
    effect_variant_applied TEXT,
    semantic_critic_status TEXT NOT NULL,
    claim_text TEXT,
    action_text TEXT,
    violation_text TEXT,
    FOREIGN KEY (id) REFERENCES nodes(node_id)
);
CREATE INDEX idx_arc_trace_story ON arc_trace_node(story_slug);
CREATE INDEX idx_arc_trace_page ON arc_trace_node(created_at_page_node_id);
CREATE INDEX idx_arc_trace_arc ON arc_trace_node(arc_realized_node_id);

CREATE TABLE arc_trace_describes_page (
    arc_trace_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    PRIMARY KEY (arc_trace_id, page_id),
    FOREIGN KEY (arc_trace_id) REFERENCES arc_trace_node(id)
);

CREATE TABLE arc_trace_realizes_arc (
    arc_trace_id TEXT NOT NULL,
    arc_id TEXT NOT NULL,
    PRIMARY KEY (arc_trace_id, arc_id),
    FOREIGN KEY (arc_trace_id) REFERENCES arc_trace_node(id)
);

CREATE TABLE arc_trace_observes_action_by (
    arc_trace_id TEXT NOT NULL,
    actor_stent_id TEXT NOT NULL,
    PRIMARY KEY (arc_trace_id, actor_stent_id),
    FOREIGN KEY (arc_trace_id) REFERENCES arc_trace_node(id)
);

CREATE VIRTUAL TABLE arc_trace_node_fts USING fts5(
    arc_trace_id UNINDEXED,
    claim_text,
    action_text,
    violation_text,
    content='arc_trace_node',
    content_rowid='rowid'
);

CREATE TRIGGER arc_trace_node_ai AFTER INSERT ON arc_trace_node BEGIN
    INSERT INTO arc_trace_node_fts(rowid, arc_trace_id, claim_text, action_text, violation_text)
    VALUES (new.rowid, new.id, new.claim_text, new.action_text, new.violation_text);
END;

CREATE TRIGGER arc_trace_node_ad AFTER DELETE ON arc_trace_node BEGIN
    INSERT INTO arc_trace_node_fts(arc_trace_node_fts, rowid, arc_trace_id, claim_text, action_text, violation_text)
    VALUES ('delete', old.rowid, old.id, old.claim_text, old.action_text, old.violation_text);
END;

CREATE TRIGGER arc_trace_node_au AFTER UPDATE ON arc_trace_node BEGIN
    INSERT INTO arc_trace_node_fts(arc_trace_node_fts, rowid, arc_trace_id, claim_text, action_text, violation_text)
    VALUES ('delete', old.rowid, old.id, old.claim_text, old.action_text, old.violation_text);
    INSERT INTO arc_trace_node_fts(rowid, arc_trace_id, claim_text, action_text, violation_text)
    VALUES (new.rowid, new.id, new.claim_text, new.action_text, new.violation_text);
END;

COMMIT;
