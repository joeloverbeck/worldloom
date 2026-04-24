BEGIN TRANSACTION;

CREATE TABLE scoped_references (
    reference_id TEXT PRIMARY KEY,
    world_slug TEXT NOT NULL,
    display_name TEXT NOT NULL,
    reference_kind TEXT,
    provenance_scope TEXT NOT NULL,
    relation TEXT NOT NULL,
    source_node_id TEXT NOT NULL,
    source_field TEXT NOT NULL,
    target_node_id TEXT,
    authority_level TEXT NOT NULL,
    FOREIGN KEY (reference_id) REFERENCES nodes(node_id),
    FOREIGN KEY (source_node_id) REFERENCES nodes(node_id),
    FOREIGN KEY (target_node_id) REFERENCES nodes(node_id)
);
CREATE INDEX idx_scoped_references_name ON scoped_references(world_slug, display_name);
CREATE INDEX idx_scoped_references_source ON scoped_references(source_node_id);

CREATE TABLE scoped_reference_aliases (
    alias_id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_id TEXT NOT NULL,
    alias_text TEXT NOT NULL,
    FOREIGN KEY (reference_id) REFERENCES scoped_references(reference_id)
);
CREATE UNIQUE INDEX idx_scoped_reference_alias_unique ON scoped_reference_aliases(reference_id, alias_text);
CREATE INDEX idx_scoped_reference_alias_text ON scoped_reference_aliases(alias_text);

COMMIT;
