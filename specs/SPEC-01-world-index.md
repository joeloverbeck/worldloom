<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-01: World Index — Schema, Parser, and Build Pipeline

**Phase**: 1
**Depends on**: none
**Blocks**: SPEC-02, SPEC-03, SPEC-04, SPEC-05, SPEC-06, SPEC-09

## Problem Statement

Worldloom skills currently load 6+ world files totaling 2,800–12,000 lines at pre-flight. Even with the `canon-addition` skill's "Large-file method" (grep-then-targeted-read anchored on `^id: CF-\d+`, `^change_id: CH-\d+`, `^## M-`, `^## `), every invocation re-scans monolithic files to locate structurally regular nodes (CF records, CH entries, MR sections, OQ entries, invariants, attribution comments). The model thinks in files and byte spans rather than addressable nodes.

**Empirical scale (animalia world, as of 2026-04-22)**:
- `CANON_LEDGER.md` — 8,624 lines, 47 CF records, 18 CH records
- `MYSTERY_RESERVE.md` — 899 lines, 20 M-N entries
- Thirteen mandatory world files — 12,111 lines total
- Plus 17 PA-NNNN adjudications, 2 character dossiers, 2 diegetic artifacts, 12 proposal cards (PR-NNNN) with 3 BATCH-NNNN manifests, 7 character-proposal cards (NCP-NNNN) with 1 NCB-NNNN manifest, 1 audit record (AU-NNNN), and 0 retcon-proposal cards (RP-NNNN) (the RP surface is named by `continuity-audit` but has no current emissions in animalia).

**Source context**: `brainstorming/structure-aware-retrieval.md` §1 ("Introduce a local structure-aware world index") and §2 ("Build the index with a markdown parser, not regex spaghetti"). Brainstorm decisions: TypeScript + `unified`/`remark`; SQLite + FTS5; embeddings deferred to an optional later phase; index is derived, markdown remains source of truth in Phase 1.

## Approach

A Node.js CLI (`world-index`) that parses markdown world files into typed nodes and stores them in SQLite with FTS5 for lexical search. Parsing is deterministic — no LLM calls inside the indexer. Incremental sync reparses only files whose content hash has changed since the last build. The index is per-world (one `.db` per world slug) and is regenerable from markdown at any time; deleting `_index/world.db` and running `world-index build` is canonical recovery.

**Public contract**: `worlds/<slug>/_index/world.db` is the sole public contract. Sibling tooling (`tools/world-mcp`, `tools/validators`, `tools/patch-engine`) reads `world.db` directly via its own `better-sqlite3` connection and respects `worlds/<slug>/_index/index_version.txt` for schema-version compatibility. `world-index` is a pure producer; it does **not** export a programmatic query library. Consumers open the SQLite file themselves, run queries against the stable schema documented below, and treat it as read-only.

## Deliverables

### Package location

`tools/world-index/` — standalone TypeScript package.

**npm dependencies**:
- `better-sqlite3` — synchronous SQLite driver (consumed by this package and by every reader of `world.db`)
- `unified` + `remark-parse` + `remark-gfm` — markdown AST. `remark-gfm` is required because node-type tables, edge-type tables, and attribution-annotated tables in world files all use GFM table syntax
- `yaml` — YAML parse/serialize (deterministic with key-sorting for canonical hashing)

```
tools/world-index/
├── package.json
├── tsconfig.json
├── src/
│   ├── cli.ts                    # entry point
│   ├── commands/
│   │   ├── build.ts
│   │   ├── sync.ts
│   │   ├── inspect.ts
│   │   ├── stats.ts
│   │   └── verify.ts
│   ├── parse/
│   │   ├── markdown.ts           # Pass 1: mdast via remark
│   │   ├── yaml.ts               # Pass 2: YAML extraction
│   │   ├── semantic.ts           # Pass 3: world-semantic (ids, entities, edges)
│   │   ├── canonical.ts          # Pass 4: canonical-form hashing
│   │   └── entities.ts           # entity-name scanner
│   ├── schema/
│   │   ├── migrations/001_initial.sql
│   │   └── types.ts              # TypeScript interfaces
│   ├── index/
│   │   ├── open.ts               # SQLite connection + migration runner
│   │   ├── nodes.ts              # node CRUD
│   │   ├── edges.ts              # edge CRUD
│   │   └── fts.ts                # FTS5 wiring
│   └── hash/
│       └── content.ts            # deterministic canonical-form + anchor hashing
├── tests/
│   ├── fixtures/                 # small markdown samples
│   └── integration/
│       └── build-animalia.test.ts
└── dist/                         # compiled JS; gitignored
```

### SQLite schema (8 tables)

```sql
-- nodes: primary atomic unit
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

-- edges: typed relations between nodes
CREATE TABLE edges (
    edge_id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_node_id TEXT NOT NULL,
    target_node_id TEXT,
    target_unresolved_ref TEXT,       -- "CF-0099" before that CF exists
    edge_type TEXT NOT NULL,          -- see edge_type enum below
    FOREIGN KEY (source_node_id) REFERENCES nodes(node_id)
);
CREATE INDEX idx_edges_source ON edges(source_node_id, edge_type);
CREATE INDEX idx_edges_target ON edges(target_node_id, edge_type);

-- entity_mentions
CREATE TABLE entity_mentions (
    mention_id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    entity_kind TEXT,                 -- person | place | polity | artifact | organization | species | ritual | etc.
    FOREIGN KEY (node_id) REFERENCES nodes(node_id)
);
CREATE INDEX idx_entity_name ON entity_mentions(entity_name);

-- file_versions: incremental-sync state
CREATE TABLE file_versions (
    world_slug TEXT NOT NULL,
    file_path TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    last_indexed_at TEXT NOT NULL,
    PRIMARY KEY (world_slug, file_path)
);

-- anchor_checksums: engine-consumable edit anchors
CREATE TABLE anchor_checksums (
    node_id TEXT PRIMARY KEY,
    anchor_form TEXT NOT NULL,        -- the exact markdown span used for localization
    checksum TEXT NOT NULL,
    FOREIGN KEY (node_id) REFERENCES nodes(node_id)
);

-- fts_nodes: FTS5 virtual table over node bodies (external-content)
CREATE VIRTUAL TABLE fts_nodes USING fts5(
    node_id UNINDEXED,
    body,
    heading_path,
    summary,
    content='nodes',
    content_rowid='rowid'
);

-- FTS5 sync triggers keep fts_nodes coherent with nodes under normal CRUD;
-- full rebuild is reserved for the >10% churn case documented in §Incremental sync algorithm.
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

-- summaries: hierarchical summaries (populated in Phase 1.5; see Out of Scope)
CREATE TABLE summaries (
    summary_id INTEGER PRIMARY KEY AUTOINCREMENT,
    world_slug TEXT NOT NULL,
    scope TEXT NOT NULL,              -- node | section | file | world
    target_id TEXT NOT NULL,
    body TEXT NOT NULL,
    token_count INTEGER,
    produced_at TEXT NOT NULL
);

-- validation_results: last-run validator state (populated by SPEC-04)
CREATE TABLE validation_results (
    result_id INTEGER PRIMARY KEY AUTOINCREMENT,
    world_slug TEXT NOT NULL,
    validator_name TEXT NOT NULL,
    severity TEXT NOT NULL,           -- fail | warn | info
    code TEXT NOT NULL,
    message TEXT NOT NULL,
    node_id TEXT,
    file_path TEXT,
    line_range_start INTEGER,
    line_range_end INTEGER,
    created_at TEXT NOT NULL
);
```

### Node types (19)

| node_type | Extracted from | Body contains |
|---|---|---|
| `canon_fact_record` | Fenced YAML in `CANON_LEDGER.md` CFs section | Full YAML record |
| `change_log_entry` | Fenced YAML in `CANON_LEDGER.md` Change Log section | Full YAML entry |
| `mystery_reserve_entry` | `MYSTERY_RESERVE.md` `^## M-N` sections | Section body |
| `open_question_entry` | `OPEN_QUESTIONS.md` `^## ` sections | Section body |
| `adjudication_record` | `adjudications/PA-NNNN-*.md` (per-file) | Full file body |
| `invariant` | `INVARIANTS.md` named invariant blocks (ONT-N / CAU-N / DIS-N / SOC-N / AES-N) | Full invariant block |
| `ontology_category` | `ONTOLOGY.md` category entries | Category body |
| `section` | `^## ` in any domain file | Section body |
| `subsection` | `^### ` in any domain file | Subsection body |
| `bullet_cluster` | Top-level bullet runs within sections (nested bullets deferred) | Bullet run text |
| `character_record` | `characters/*.md` (per-file) | Full file body |
| `diegetic_artifact_record` | `diegetic-artifacts/*.md` (per-file) | Full file body |
| `proposal_card` | `proposals/PR-NNNN-*.md` (per-file) | Full file body |
| `proposal_batch` | `proposals/batches/BATCH-NNNN.md` (per-file) | Full file body |
| `character_proposal_card` | `character-proposals/NCP-NNNN-*.md` (per-file) | Full file body |
| `character_proposal_batch` | `character-proposals/batches/NCB-NNNN.md` (per-file) | Full file body |
| `retcon_proposal_card` | `audits/AU-NNNN/retcon-proposals/RP-NNNN-*.md` (per-file, nested under an audit directory) | Full file body |
| `audit_record` | `audits/AU-NNNN-*.md` (per-file) | Full file body |
| `named_entity` | Discovered during Pass 3 entity scan (virtual; backed by `entity_mentions`) | Canonical entity name + mention list |

### Edge types (13)

YAML-field-derived edges (source is always a YAML-backed node — CF, CH, MR, OQ):

- `derived_from` — CF → CF (from `source_basis.derived_from`)
- `required_world_update` — CF → domain file (from `required_world_updates`)
- `affected_fact` — CH → CF (from `affected_fact_ids`)
- `modified_by` — CF → CH (from `modification_history[].change_id` inside the CF; one edge per entry)
- `originates_in` — CH → CF (from the CH's own `originating_cf` field; one edge per CH. Pass 3 reads the field from the `change_log_entry` node only, never from embedded `modification_history` copies, to avoid duplicate edges)
- `pre_figured_by` — CF → DA or CHAR (from CF YAML field `pre_figured_by:` — array of DA-NNNN / CHAR-NNNN ids; forward-looking, empty in most current worlds)
- `applies_to` — CF → MR entry (cross-application commitments; extracted from CF YAML or attribution prose; field TBD by canon-addition template)
- `pressures` — CF → OQ entry (cross-reference in CF YAML or OQ-targeting prose)
- `resolves` — CF → OQ entry (cross-reference in CF YAML closing an OQ)
- `firewall_for` — MR entry → CF (forbidden-answer firewall, extracted from MR YAML or MR body)

Attribution-comment-derived edges (source is always a prose-structured node — `section`, `subsection`, or `bullet_cluster`; attribution comments mid-table-row attach to the containing `subsection`):

- `patched_by` — section/subsection/bullet_cluster → CF (from `<!-- added by CF-NNNN -->` attribution comments embedded in domain-file prose)
- `clarified_by` — section/subsection/bullet_cluster → CH (from `<!-- clarified by CH-NNNN -->` attribution comments; reserved for post-hoc CH-only clarifications; currently unused in animalia but named by CH-0014 prose as a future extension)

Entity edges (virtual):

- `mentions_entity` — any node → `named_entity` (virtual; backed by `entity_mentions`)

### Node ID scheme

- Structured-id-bearing nodes use their world-level id: `CF-0021`, `CH-0014`, `PA-0017`, `M-1`, `DA-0003`, `CHAR-0007`, `PR-0042`, `BATCH-0011`, `NCP-0007`, `NCB-0001`, `AU-0002`, `RP-0005`
- Generic structural nodes use `<world>:<file>:<heading-path>:<index>`: `animalia:EVERYDAY_LIFE.md:(a)-Heartland:Leisure:0`
- Named-entity virtual nodes use `entity:<canonical-slug>`: `entity:brinewick`, `entity:the-maker-civilization`

### Parser pipeline (4 passes)

**Pass 1 — Markdown AST** (`remark-parse`): produces mdast with position. Extracts `heading`, `list`, `listItem`, `paragraph`, `html` (for comments), `code` (for fenced yaml) nodes.

**Pass 2 — YAML extraction**: walks `code` nodes with `lang === 'yaml'`; parses each with the `yaml` package; validates against `CanonFactRecord` / `ChangeLogEntry` / `ModificationHistoryEntry` TypeScript interfaces. These interfaces derive their field lists directly from `docs/FOUNDATIONS.md` §Canon Fact Record Schema; any drift between the interfaces and FOUNDATIONS is a bug in the indexer, not in the ledger. The parser is **permissive about unknown top-level fields** — unknown fields are preserved inside the node's `body` text for downstream validators (this keeps the indexer forward-compatible with SPEC-09's conditionally-mandatory `exception_governance` / `action_space` blocks, which land post-SPEC-01 under a grandfather clause). Parse failure records a `yaml_parse_integrity` row in `validation_results` and skips the block (block still produces a node with partial body).

**Pass 3 — World-semantic**:
- ID reference scan: `/\b(CF|CH|PA|M|DA|CHAR|PR|BATCH|NCP|NCB|AU|RP)-\d+\b/g` across every node body produces candidate edges (unresolved if target node not yet indexed)
- Named-entity extraction via ONTOLOGY.md entity registry + capitalized-multiword heuristic (tunable; starts conservative)
- Edge extraction from YAML structured fields: `source_basis.derived_from` → `derived_from`; `required_world_updates` → `required_world_update`; `affected_fact_ids` (in CH YAML) → `affected_fact`; `modification_history[].change_id` (in CF YAML) → `modified_by`; `originating_cf` (read only from the `change_log_entry` node, never from the embedded `modification_history` copy inside the CF) → `originates_in`; `pre_figured_by` (in CF YAML) → `pre_figured_by`; etc.
- Attribution-comment extraction: `<!--\s*(added|clarified|modified)\s+by\s+(CF|CH)-\d+\s*-->` produces attribution edges (`patched_by` when the target is a CF; `clarified_by` when the target is a CH; the verb in the comment is informational and does not select the edge type). **Source-node rule**: the edge source is the **nearest enclosing structural node** — `subsection` if one exists between the comment and the nearest `section`, else `section`; for comments appearing inside GFM table cells, the source is the containing `subsection` (or `section` if no subsection). Comments inside fenced code blocks are ignored. This rule keeps edge sources deterministic across rebuilds.

**Pass 4 — Canonical-form hashing**:
- For YAML nodes: `content_hash = sha256(serialize_stable(parsed))` (keys sorted, whitespace normalized)
- For prose nodes: `content_hash = sha256(normalize_whitespace(body))` (trailing whitespace stripped, consecutive newlines collapsed to two)
- For all nodes: `anchor_checksum = sha256(preceding_3_lines + node_body + following_3_lines)`

`content_hash` is what the patch engine compares as `expected_content_hash`. `anchor_checksum` is what detects surrounding-context drift.

### CLI contract

```
world-index build <world-slug>           # full rebuild; destroys and recreates world.db
world-index sync <world-slug>            # incremental; reparses only changed files
world-index inspect <node-id>            # dump single node as JSON
world-index stats <world-slug>           # counts by node_type; file freshness
world-index verify <world-slug>          # re-hash everything; flag drift vs stored
world-index --version
world-index --help
```

Exit codes: `0` success, `1` generic failure, `2` invalid world slug, `3` missing mandatory file, `4` parse failure above threshold.

### Index location

`worlds/<world-slug>/_index/world.db` (gitignored via `.gitignore` update in SPEC-08 Phase 0). A companion `worlds/<world-slug>/_index/index_version.txt` records the schema migration version.

### File-enumeration inventory

The indexer consumes exactly the following paths under `worlds/<slug>/`:

- World-level `.md` files (the 13 mandatory files listed in FOUNDATIONS.md §Mandatory World Files)
- `adjudications/*.md` (except `INDEX.md`)
- `characters/*.md` (except `INDEX.md`)
- `diegetic-artifacts/*.md` (except `INDEX.md`)
- `proposals/*.md` (except `INDEX.md`) and `proposals/batches/*.md`
- `character-proposals/*.md` (except `INDEX.md`) and `character-proposals/batches/*.md`
- `audits/*.md` (except `INDEX.md`) and `audits/*/retcon-proposals/*.md`

Excluded paths (never parsed):

- `worlds/<slug>/_index/` (machine-generated, gitignored)
- `worlds/<slug>/_source/` (reserved for Phase 3 atomic source files, gitignored)
- Hidden dotfiles (any file whose basename starts with `.`)
- `INDEX.md` files at every level (human-facing navigation, mechanically derivable)

Anything else under `worlds/<slug>/` is ignored with a warning-severity row in `validation_results` so the user can notice unexpected content.

### Incremental sync algorithm

1. Enumerate all markdown files under `worlds/<slug>/` per the §File-enumeration inventory above
2. Compute content hash of each file
3. For each file whose hash differs from `file_versions.content_hash` (or is absent):
   - Delete all nodes where `(world_slug, file_path)` matches (FTS5 trigger `nodes_ad` removes the matching FTS rows)
   - Cascade delete edges where source or target is deleted
   - Cascade delete entity_mentions for deleted nodes
   - Re-run all 4 parser passes (FTS5 trigger `nodes_ai` populates FTS rows on re-insert)
   - Upsert `file_versions` row
4. Re-resolve unresolved edges: for each `edges.target_unresolved_ref`, look up if a node now exists; if so, populate `target_node_id` and clear `target_unresolved_ref`
5. FTS5 stays coherent automatically via the `nodes_ai` / `nodes_ad` / `nodes_au` triggers. When node churn exceeds 10% of total (heuristic: reparsed-file count × average-nodes-per-file ÷ total-nodes), issue `INSERT INTO fts_nodes(fts_nodes) VALUES('rebuild')` once at end of sync to compact the FTS5 index — this is a maintenance optimization, not a correctness requirement.

### Error model

- Parse failures recorded as `validation_results` rows (severity `warn` for recoverable, `fail` for corrupt AST)
- Duplicate ids stored normally; `id_uniqueness` validator (SPEC-04) flags on next run
- Missing mandatory file → exit code 3 with clear message
- Schema version mismatch → exit code 1; user runs `world-index build` to rebuild from scratch (migrations are forward-only in Phase 1)

## FOUNDATIONS Alignment

| Principle | Alignment |
|---|---|
| §Tooling Recommendation | Concrete realization: "current World Kernel / Invariants / relevant CF records / affected domain files / unresolved contradictions / mystery reserve entries" is now indexed as queryable nodes |
| §Mandatory World Files | Preserved — index is derived; markdown remains source of truth |
| §Canon Fact Record Schema | Unchanged; records stay as fenced YAML in `CANON_LEDGER.md` |
| Rule 6 No Silent Retcons | YAML `modification_history` indexed as first-class edges (`modified_by`, `originates_in`); attribution comments indexed as distinct `patched_by` / `clarified_by` edges so prose-patch audit trails stay separable from fact-modification audit trails |
| Rule 7 Preserve Mystery Deliberately | `mystery_reserve_entry` node type; `M-N → CF-NNNN` firewall extensions indexed as `firewall_for` edges |

## Verification

- **Unit**: parser passes tested against fixture markdown (3-4 small worlds covering all 19 node types)
- **Integration**: `world-index build animalia` succeeds; node counts match manual enumeration at the time of the run (as of 2026-04-22: 47 CF records, 18 CH entries, 20 MR entries, 17 PA adjudications, 2 characters, 2 diegetic artifacts, 12 proposal cards + 3 BATCH manifests, 7 character-proposal cards + 1 NCB manifest, 1 audit record, 0 retcon-proposal cards, plus sections/subsections). Counts are not frozen — they grow as canon is added; the test re-enumerates before asserting.
- **Incremental**: touch `CANON_LEDGER.md` → `world-index sync animalia` reparses only that file (verified by elapsed time + per-file log lines)
- **Determinism**: `world-index build` run twice produces identical `content_hash` values across all nodes
- **Drift detection**: `world-index verify` after manual markdown edit flags the edited node
- **Schema stability**: SQL migration 001 is a frozen baseline; any field addition ships as migration 002 and is documented

## Out of Scope

- Vector / semantic retrieval — deferred; SPEC-02's retrieval policy uses it only as a fallback in a future sub-phase
- LLM-generated summaries — `summaries` table exists but is populated by a later Phase 1.5 deliverable (not spec'd here)
- Nested bullet clusters — only top-level bullets produce `bullet_cluster` nodes in Phase 1
- Cross-world queries — index is per-world
- Live file watching — sync is invoked by hook or manually
- Historical snapshots / time travel — each `world.db` represents current state only
- Repo-level content outside `worlds/<slug>/` — `briefs/` (user-provided inputs), `docs/` (pipeline-level contracts), `specs/`, `tickets/`, `brainstorming/`, `archive/`, and `.claude/` are **not** parsed. The indexer's scope is world canon, not pipeline state.
- Programmatic query library — sibling packages read `world.db` directly (see §Public contract); this package does not export a query API

## Risks & Open Questions

- **Named-entity extraction heuristics** may under- or over-match on prose. Mitigation: start with ONTOLOGY.md registry + capitalized-span heuristic; tune via `world-validate` feedback in SPEC-04.
- **Bullet-cluster boundaries** in deeply-nested lists are subjective. Mitigation: top-level only in Phase 1; extend if skill rewrite reveals need.
- **YAML block location** in `CANON_LEDGER.md` relies on section heading (`## Canon Fact Records` vs `## Change Log`). If these headings drift across worlds, Pass 2's CF-vs-CH discrimination must become more robust (currently via section ancestor). Mitigation: `create-base-world` mandates these exact headings; enforce via validator.
- **Large-file parse time** on 8,624-line `CANON_LEDGER.md`: should parse in <2s on commodity hardware; verified in integration test. If slower, implement streaming parse.
- **SPEC-09 CF-schema extension (forward-compat)**: SPEC-09 Phase 2.5 adds two conditionally-mandatory CF blocks (`exception_governance`, and the Rule-11 `action_space` surface) under a grandfather clause — historical CFs remain valid; new CFs meet the strict regime. SPEC-01's permissive unknown-field posture (Pass 2) absorbs this without re-work; the `CanonFactRecord` interface gains optional fields when SPEC-09 lands, and the validator-rule-12 trace-register query reads them from the node body. No breaking migration.
- **CLAUDE.md ID Allocation drift**: NCP-NNNN / NCB-NNNN are emitted by `propose-new-characters` (confirmed: 7 NCP + 1 NCB in animalia) but are not yet listed in `CLAUDE.md` §ID Allocation Conventions. SPEC-01 indexes them regardless (per §File-enumeration inventory). Closing the CLAUDE.md gap is out of scope for this spec; flagged for the next docs update (SPEC-07 or a separate ticket).
