BEGIN TRANSACTION;

CREATE TABLE nodes (
    node_id TEXT PRIMARY KEY,
    world_slug TEXT NOT NULL,
    file_path TEXT NOT NULL,
    heading_path TEXT,
    byte_start INTEGER NOT NULL,
    byte_end INTEGER NOT NULL,
    line_start INTEGER NOT NULL,
    line_end INTEGER NOT NULL,
    node_type TEXT NOT NULL,
    body TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    anchor_checksum TEXT NOT NULL,
    summary TEXT,
    created_at_index_version INTEGER NOT NULL
);
CREATE INDEX idx_nodes_world_type ON nodes(world_slug, node_type);
CREATE INDEX idx_nodes_file ON nodes(world_slug, file_path);

CREATE TABLE edges (
    edge_id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_node_id TEXT NOT NULL,
    target_node_id TEXT,
    target_unresolved_ref TEXT,
    edge_type TEXT NOT NULL,
    FOREIGN KEY (source_node_id) REFERENCES nodes(node_id)
);
CREATE INDEX idx_edges_source ON edges(source_node_id, edge_type);
CREATE INDEX idx_edges_target ON edges(target_node_id, edge_type);

CREATE TABLE entity_mentions (
    mention_id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    entity_kind TEXT,
    FOREIGN KEY (node_id) REFERENCES nodes(node_id)
);
CREATE INDEX idx_entity_name ON entity_mentions(entity_name);

CREATE TABLE file_versions (
    world_slug TEXT NOT NULL,
    file_path TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    last_indexed_at TEXT NOT NULL,
    PRIMARY KEY (world_slug, file_path)
);

CREATE TABLE anchor_checksums (
    node_id TEXT PRIMARY KEY,
    anchor_form TEXT NOT NULL,
    checksum TEXT NOT NULL,
    FOREIGN KEY (node_id) REFERENCES nodes(node_id)
);

CREATE VIRTUAL TABLE fts_nodes USING fts5(
    node_id UNINDEXED,
    body,
    heading_path,
    summary,
    content='nodes',
    content_rowid='rowid'
);

CREATE TRIGGER nodes_ai AFTER INSERT ON nodes BEGIN
    INSERT INTO fts_nodes(rowid, node_id, body, heading_path, summary)
    VALUES (new.rowid, new.node_id, new.body, new.heading_path, new.summary);
END;

CREATE TRIGGER nodes_ad AFTER DELETE ON nodes BEGIN
    INSERT INTO fts_nodes(fts_nodes, rowid, node_id, body, heading_path, summary)
    VALUES ('delete', old.rowid, old.node_id, old.body, old.heading_path, old.summary);
END;

CREATE TRIGGER nodes_au AFTER UPDATE ON nodes BEGIN
    INSERT INTO fts_nodes(fts_nodes, rowid, node_id, body, heading_path, summary)
    VALUES ('delete', old.rowid, old.node_id, old.body, old.heading_path, old.summary);
    INSERT INTO fts_nodes(rowid, node_id, body, heading_path, summary)
    VALUES (new.rowid, new.node_id, new.body, new.heading_path, new.summary);
END;

CREATE TABLE summaries (
    summary_id INTEGER PRIMARY KEY AUTOINCREMENT,
    world_slug TEXT NOT NULL,
    scope TEXT NOT NULL,
    target_id TEXT NOT NULL,
    body TEXT NOT NULL,
    token_count INTEGER,
    produced_at TEXT NOT NULL
);

CREATE TABLE validation_results (
    result_id INTEGER PRIMARY KEY AUTOINCREMENT,
    world_slug TEXT NOT NULL,
    validator_name TEXT NOT NULL,
    severity TEXT NOT NULL,
    code TEXT NOT NULL,
    message TEXT NOT NULL,
    node_id TEXT,
    file_path TEXT,
    line_range_start INTEGER,
    line_range_end INTEGER,
    created_at TEXT NOT NULL
);

COMMIT;
