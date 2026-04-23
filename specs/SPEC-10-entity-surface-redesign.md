<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-10: Entity Surface Redesign — Authority-Backed Entities, Separate Mention Evidence

**Phase**: 1.5 remediation; lands after SPEC-01 and before entity-sensitive consumers rely on the graph
**Depends on**: SPEC-01
**Blocks**: SPEC-02 `find_named_entities` final contract, SPEC-02 `find_impacted_fragments` final contract, SPEC-02 `search_nodes.entity_name` filter semantics, SPEC-06 pre-figuring/entity-sensitive retrieval flows

## Problem Statement

Repeated `SPEC-01-020` through `SPEC-01-025` audit waves exposed the same architectural problem under different false-positive examples. The issue is not one more bad phrase in the stoplist. The issue is that the current index treats **canonical entity discovery** as a broad lexical heuristic over heterogeneous prose.

Current live behavior:

- `tools/world-index/src/commands/shared.ts` feeds broad prose-node types into entity extraction: `section`, `subsection`, `bullet_cluster`, plus whole-file records such as `proposal_card`, `proposal_batch`, `character_proposal_card`, `character_record`, and `diegetic_artifact_record`.
- `tools/world-index/src/parse/prose.ts` persists those nodes as large prose bodies, often including workflow headings, document labels, open-question titles, and compound phrases that are not world entities.
- `tools/world-index/src/parse/entities.ts` runs `CAPITALIZED_MULTIWORD_REGEX` over that mixed prose surface and materializes every surviving match as a `named_entity` plus `mentions_entity` edges.

That architecture conflates four different things:

1. **Canonical world entities** — actual people, institutions, places, artifacts, hazards, or named concepts that belong in the modeled world.
2. **Scoped retrieval targets** — names that are deliberate but not world-level canonical, such as proposal-local or artifact-local names.
3. **Lexical mention evidence** — useful phrase matches that help recall relevant nodes.
4. **Document furniture** — headings, labels, workflow phases, and compound fragments that happen to look title-cased.

Because those four surfaces are collapsed into one, each audit only shaves off the currently visible false positives. The next world, next file family, or next prose pattern will produce another wave.

This conflicts directly with `docs/FOUNDATIONS.md`:

- **Core Principle**: the world model is constrained and explicit, not an accidental bag of phrases.
- **Ontology Categories**: canonical facts and entities should attach to modeled categories, not emerge from heading furniture.
- **Relation Types**: `mentions_entity` should mean a relation to a modeled entity, not merely a string resemblance.

The durable fix is therefore architectural: split the precision-critical canonical entity surface from the recall-oriented lexical mention surface.

## Approach

Redesign the entity layer as **three explicitly different surfaces**:

1. **Authority-backed entities** — the only rows that materialize as canonical `named_entity` nodes and participate in `mentions_entity` edges.
2. **Entity aliases** — exact alternate forms tied to an authority-backed entity under constrained rules.
3. **Mention evidence** — phrase occurrences in prose, including unresolved heuristic phrases, used for recall and debugging but never promoted automatically into canonical entities.

The governing rule is:

> A phrase may be useful for retrieval without being trustworthy enough to become a canonical entity.

This redesign is precision-first for the canonical surface and recall-first for the mention surface.

### Authority model

An entity becomes canonical only when it has an **authority-bearing anchor**. Initial authority-bearing anchors are:

- `ONTOLOGY.md` registry entries parsed by `loadOntologyRegistry` in `tools/world-index/src/parse/entities.ts` (user-authored structured world ontology)
- structured `name` fields in `character_record` and `character_proposal_card` (YAML frontmatter)
- structured `title` fields in `diegetic_artifact_record` (YAML frontmatter)
- future explicit entity-assertion blocks attached to structured world records (see Open Questions)

Everything else is evidence only unless and until an explicit authority source exists.

### Layer model

The redesigned entity surface must preserve the distinction between modeled-world entities and scoped artifact/proposal entities. Each canonical entity carries a provenance scope:

- `world` — anchored in accepted world content (ONTOLOGY.md registry entries, accepted character records)
- `proposal` — anchored in proposal artifacts; deliberate retrieval target, but not world-level truth
- `diegetic` — anchored in an in-world artifact title or named referent
- `audit` — reserved for future use; no Stage A adapter currently produces audit-scoped entities. Retained in the enum so a later explicit-assertion surface on `audit_record` does not require a schema migration.

This avoids a second architectural mistake: treating every deliberate name as hard-canon world ontology.

### No automatic semantic promotion from heuristic phrases

Heuristic capitalized-phrase scanning may still exist, but only to populate unresolved mention evidence. It must no longer create canonical entities or `mentions_entity` edges on its own.

That means:

- no hyphen-split suffix promotion
- no heading-label promotion
- no title-prefix stripping
- no singularization / plural guessing
- no fragment capture from larger compounds

If a phrase is not backed by an authority source or exact alias rule, it stays a mention phrase and nothing more.

## Deliverables

### 1. Schema revision: separate entities, aliases, and mention evidence

Because `world.db` is regenerable and there is a single user (no production indices to migrate), the redesign **baseline-replaces `tools/world-index/src/schema/migrations/001_initial.sql`** with the new schema rather than adding a `002_*.sql` forward migration. `CURRENT_INDEX_VERSION` in `tools/world-index/src/schema/version.ts` stays at `1`; any existing `_index/` directory is rebuilt from scratch on the next `world-index build` invocation after this spec lands.

The new tables:

#### `entities`

Authoritative metadata for canonical entities.

```sql
CREATE TABLE entities (
    entity_id TEXT PRIMARY KEY,              -- matches nodes.node_id for node_type='named_entity'
    world_slug TEXT NOT NULL,
    canonical_name TEXT NOT NULL,
    entity_kind TEXT,
    provenance_scope TEXT NOT NULL,         -- world | proposal | diegetic | audit
    authority_level TEXT NOT NULL,          -- structured_anchor | explicit_assertion
    source_node_id TEXT NOT NULL,
    source_field TEXT,
    FOREIGN KEY (entity_id) REFERENCES nodes(node_id),
    FOREIGN KEY (source_node_id) REFERENCES nodes(node_id)
);
CREATE INDEX idx_entities_name ON entities(world_slug, canonical_name);
CREATE INDEX idx_entities_scope ON entities(world_slug, provenance_scope);
```

#### `entity_aliases`

Exact alternate forms tied to canonical entities.

```sql
CREATE TABLE entity_aliases (
    alias_id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id TEXT NOT NULL,
    alias_text TEXT NOT NULL,
    alias_kind TEXT NOT NULL,               -- exact_structured | explicit_alias | normalized_form
    source_node_id TEXT NOT NULL,
    FOREIGN KEY (entity_id) REFERENCES entities(entity_id),
    FOREIGN KEY (source_node_id) REFERENCES nodes(node_id)
);
CREATE UNIQUE INDEX idx_entity_alias_unique ON entity_aliases(entity_id, alias_text);
CREATE INDEX idx_entity_alias_text ON entity_aliases(alias_text);
```

`alias_kind` taxonomy:

- `exact_structured` — the alias is another structured field on the same authority source (e.g., `slug` on a `character_record`). Present only when the source has more than one canonical-bearing field.
- `explicit_alias` — the alias is declared by a future explicit-assertion block (see Deliverable 7). Not produced in v1; reserved.
- `normalized_form` — the alias is the NFC-normalized Unicode form of `canonical_name` with whitespace collapsed to single ASCII spaces and case preserved. Produced only when normalization changes the string (i.e., `canonical_name` itself is not emitted as its own alias).

#### `entity_mentions`

Replace the current free-floating `entity_name` / `entity_kind` rows with evidence rows:

```sql
CREATE TABLE entity_mentions (
    mention_id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id TEXT NOT NULL,
    surface_text TEXT NOT NULL,
    resolved_entity_id TEXT,                -- nullable; null means unresolved evidence only
    resolution_kind TEXT NOT NULL,          -- canonical | alias | unresolved
    extraction_method TEXT NOT NULL,        -- exact_canonical | exact_alias | heuristic_phrase
    FOREIGN KEY (node_id) REFERENCES nodes(node_id),
    FOREIGN KEY (resolved_entity_id) REFERENCES entities(entity_id)
);
CREATE INDEX idx_entity_mentions_surface ON entity_mentions(surface_text);
CREATE INDEX idx_entity_mentions_resolved ON entity_mentions(resolved_entity_id);
```

The old `entity_name` / `entity_kind` columns are intentionally removed. Canonical names and kinds now live in `entities`; raw phrase evidence now lives in `surface_text`.

#### Migration Surface

Because the baseline-replacement drops `entity_name` / `entity_kind` and introduces new tables, the following downstream touch points must change in lockstep. Ticket decomposition should map each line to a reviewable diff:

- `tools/world-index/src/schema/migrations/001_initial.sql` — replace `entity_mentions` definition; add `entities` and `entity_aliases`.
- `tools/world-index/src/schema/types.ts` — replace `EntityMentionRow` shape; add `EntityRow` and `EntityAliasRow` interfaces.
- `tools/world-index/src/index/nodes.ts` — rewrite `insertEntityMentions` to the new column set; add `insertEntities` and `insertEntityAliases` helpers.
- `tools/world-index/src/parse/entities.ts` — pipeline rewrite per Deliverable 3 (Stage A + Stage B + demoted heuristic Stage C).
- `tools/world-index/src/commands/shared.ts` — update `finalizeEntityState` (write order: `entities` → `entity_aliases` → `entity_mentions` → `edges`); update `clearEntityState` to truncate the new tables; reconsider membership of `ENTITY_SOURCE_NODE_TYPES` (spec explicitly scopes authority sources to `ontology_category`, `character_record`, `character_proposal_card`, `diegetic_artifact_record`; `proposal_card`, `proposal_batch`, `character_proposal_batch`, `retcon_proposal_card`, `section`, `subsection`, `bullet_cluster`, `mystery_reserve_entry`, `open_question_entry`, `invariant` remain as mention-evidence sources only).
- `tools/world-index/src/commands/inspect.ts` — expand the JSON payload to include the new `entities` + `entity_aliases` rows, not just `entity_mentions`.
- `tools/world-index/src/commands/verify.ts` — unchanged in intent, but confirm the `node_type != 'named_entity'` exclusion still holds (it should).
- `tools/world-index/src/parse/stoplist.ts` — stoplist is retained and repurposed: it gates which heuristic phrases are allowed into `entity_mentions` with `extraction_method='heuristic_phrase'`. It no longer influences canonical promotion, because no canonical promotion runs against heuristic candidates in the new pipeline.
- `tools/world-index/tests/entities.test.ts` — full rewrite against the new three-surface contract.
- `tools/world-index/tests/schema.test.ts` — update the expected table list to include `entities` and `entity_aliases`.
- `tools/world-index/tests/crud.test.ts`, `tests/commands.test.ts`, `tests/integration/build-animalia.test.ts` — update any assertions that inspect `entity_name` / `entity_kind`.

### 2. Redefine `named_entity` semantics

Retain `node_type='named_entity'` for graph compatibility, but change its meaning:

- **Old meaning**: any surviving lexical candidate from Pass 3
- **New meaning**: only authority-backed canonical entities

Its human-readable `body` may remain a compact summary, but the authoritative query surface is `entities`, not string parsing from `nodes.body`.

The backing `nodes` row for each canonical entity inherits its provenance coordinates (`file_path`, `line_start`, `line_end`, `byte_start`, `byte_end`) from its Stage A source node (the row identified by `entities.source_node_id`), so that `inspect`, anchor-drift detection, and any line-range rendering remain coherent. The current `ONTOLOGY.md`-as-virtual-file-path convention is retained **only** for registry-sourced entities whose Stage A source is the ONTOLOGY.md registry itself; those entities keep a sentinel zero-width span at line 1 of `ONTOLOGY.md` as they do today.

### 3. Rebuild the extraction pipeline in three stages

#### Stage A — canonical entity construction

Construct canonical entities only from authority-bearing adapters:

- `ONTOLOGY.md` registry entries (via `loadOntologyRegistry`) → `entity_kind` taken from the registry entry's kind annotation, `provenance_scope='world'`, `authority_level='structured_anchor'`, `source_field=null`. Retained as the most aligned source with FOUNDATIONS §Ontology Categories.
- `character_record.name` → `entity_kind='person'`, `provenance_scope='world'`
- `character_proposal_card.name` → `entity_kind='person'`, `provenance_scope='proposal'`
- `diegetic_artifact_record.title` → `entity_kind='text/tradition'` or `artifact` (adapter-chosen per artifact subtype), `provenance_scope='diegetic'`
- future explicit entity-assertion adapters for CF / CH / other structured nodes (Deliverable 7)

**Frontmatter extraction mechanism**: `tools/world-index/src/parse/prose.ts`'s `extractProseNodes` gains a shared YAML-frontmatter parse step that runs for every whole-file record (`character_record`, `character_proposal_card`, `diegetic_artifact_record`, and existing whole-file records whose frontmatter may be consulted later). The parsed frontmatter is carried on the in-memory `NodeRow` as a non-persisted sidecar field (`frontmatter?: Record<string, unknown>`), consumed by Stage A adapters in `entities.ts`, and then discarded before DB insert. Parse failures emit a `validation_results` row with `validator_name='frontmatter_parse'`, `severity='warn'`, do not block indexing, and cause the affected record to contribute zero canonical entities (the record still participates as a mention-evidence source).

No section heading, bullet cluster, open-question heading, mystery-reserve title, or workflow heading may create a canonical entity by heuristic.

#### Stage B — alias generation

Generate aliases only under constrained, lossless rules:

- exact normalized punctuation/case forms (`alias_kind='normalized_form'`) — emitted only when NFC normalization with whitespace collapse changes the canonical string
- additional structured fields on the same authority source (`alias_kind='exact_structured'`) — for example, `character_record.slug` as an alias of `character_record.name`
- explicitly asserted aliases from structured data once that surface exists (`alias_kind='explicit_alias'`) — reserved; not produced in v1

Not allowed in v1:

- honorific/title dropping (`Canon Althea Greystone` -> `Canon Althea`)
- fragment extraction from compounds (`Standard Class-C` -> `Standard Class`)
- suffix extraction from headings (`Maker-Age Linguistic Recovery` -> `Age Linguistic Recovery`)
- singular/plural guessing

This keeps ambiguity visible instead of silently hardening it into the canonical graph.

#### Stage C — mention-evidence scanning

The existing regex-based phrase scan (`CAPITALIZED_MULTIWORD_REGEX`) becomes Stage C. It produces rows into `entity_mentions` with:

- `extraction_method='exact_canonical'` when the surface text exactly matches an `entities.canonical_name` (populates `resolved_entity_id`, `resolution_kind='canonical'`)
- `extraction_method='exact_alias'` when the surface text exactly matches an `entity_aliases.alias_text` (populates `resolved_entity_id` via the alias's `entity_id`, `resolution_kind='alias'`)
- `extraction_method='heuristic_phrase'` otherwise (`resolved_entity_id=NULL`, `resolution_kind='unresolved'`)

The `CAPITALIZED_MULTIWORD_STOPLIST` in `tools/world-index/src/parse/stoplist.ts` continues to gate `heuristic_phrase` emission (not canonical promotion, which no longer runs against heuristic candidates).

### 4. Keep heuristic scanning, but demote it to mention evidence

(See Stage C above for the concrete wiring.) Consequences:

- `Sectarian Maker`, `Seal Civic`, `Standard Class`, `Enterable Maker`, `Taxonomy Extension`, `Wage Spreads`, `Term Consequences`, `Cluster Notes`, and `Claim Selection` may still be observed as raw phrase evidence if they truly occur in prose.
- They must never produce canonical `named_entity` nodes or `mentions_entity` edges unless a future explicit authority source is added.

### 5. Restrict `mentions_entity` edges to resolved canonical links

`mentions_entity` edges are emitted only when a mention resolves to a canonical `entity_id` (i.e., `resolution_kind IN ('canonical', 'alias')`).

Unresolved surface-text mentions remain queryable in `entity_mentions`, but they do not participate in the graph.

This restores the meaning of the edge:

> `node X mentions modeled entity Y`

rather than:

> `node X contains a title-cased phrase resembling Y`

### 6. Update SPEC-02 consumer contracts

#### `find_named_entities(names)`

Keep the tool name, but change the output contract to separate precision from recall:

- `canonical_matches`: exact canonical-name or alias matches, grouped by entity and then by mentioning node type
- `surface_matches`: unresolved exact surface-text matches, grouped by node type and clearly labeled `noncanonical`

Default sort order:

1. canonical exact name
2. canonical exact alias
3. unresolved exact surface text

Heuristic semantic grouping is out of scope.

#### `find_impacted_fragments(node_ids)`

Use canonical `mentions_entity` edges only. If an implementation wants a phrase-search fallback, it must be explicit and flagged `noncanonical_fallback`; it cannot silently share the same ranking weight as canonical entity links.

#### `search_nodes.entity_name` filter

The existing `search_nodes` filter `entity_name?` matches against **canonical name OR alias exact match only** (i.e., `entities.canonical_name` or `entity_aliases.alias_text`). It never matches `entity_mentions.surface_text` with `resolution_kind='unresolved'`. Callers that want to locate nodes by unresolved surface phrase should use `find_named_entities(names).surface_matches` instead, which makes the noncanonical character of the result explicit.

### 7. Add a future-facing extension seam for explicit entity assertions

The redesign intentionally leaves room for a later precision-preserving extension:

- structured `entity_assertions` blocks in CF / CH / other high-trust records
- optional alias lists on structured content records
- `audit_record`-sourced entity assertions (the reason `provenance_scope='audit'` is reserved in the enum)

That future work is where prose-domain entities like `Copper Weir` or `Charter Hall` should become canonical. They should not re-enter the graph via regex.

This spec does **not** force a FOUNDATIONS schema change now. It defines the architectural seam so future tickets can extend the schema truthfully.

## FOUNDATIONS Alignment

| Principle | Alignment |
|---|---|
| Core Principle | Canonical entities become modeled-world objects with explicit provenance, not accidental title-cased phrases. |
| Ontology Categories | Canonical entities attach truthfully to kinds via `entities.entity_kind`, populated by Stage A adapters from structured-anchor source fields (ONTOLOGY.md registry kind annotation; adapter-fixed kind for `character_record`/`character_proposal_card`/`diegetic_artifact_record`). Heuristic promotion no longer produces `entity_kind='unknown'` rows. |
| Canon Layers | Entity provenance scope preserves whether a named referent comes from world truth, proposal artifacts, diegetic artifacts, or audit-local text. |
| Relation Types | `mentions_entity` regains a precise meaning: relation to a modeled entity, not to document furniture. |
| No Silent Retcons | The redesign is derived-layer/tooling work only. It changes the machine-facing interpretation of existing markdown; it does not mutate canon files. |
| Write Boundaries | No world content changes are required for v1. Existing high-trust files stay untouched unless a later explicit-assertion feature is separately approved. |
| Rule 5 No Consequence Evasion (tooling-layer) | The Migration Surface subsection under Deliverable 1 enumerates every downstream consumer of the removed `entity_name`/`entity_kind` columns, so ticket decomposition cannot silently ship a half-migrated repo. |

## Verification

1. Fresh rebuild and verify still succeed:
   - `cd tools/world-index && npm run build`
   - `cd /home/joeloverbeck/projects/worldloom && node tools/world-index/dist/src/cli.js build animalia`
   - `cd /home/joeloverbeck/projects/worldloom && node tools/world-index/dist/src/cli.js verify animalia`
2. Post-migration schema shape: the `schema.test.ts` expected-tables list includes `entities` and `entity_aliases` alongside the redesigned `entity_mentions`. The redesigned `entity_mentions` row shape has columns `mention_id`, `node_id`, `surface_text`, `resolved_entity_id`, `resolution_kind`, `extraction_method` (and no `entity_name` / `entity_kind`). Indexes `idx_entities_name`, `idx_entities_scope`, `idx_entity_alias_unique`, `idx_entity_alias_text`, `idx_entity_mentions_surface`, `idx_entity_mentions_resolved` exist.
3. The repeated false-positive classes from `SPEC-01-020` through `SPEC-01-025` no longer materialize as canonical `named_entity` rows, regardless of whether their raw phrase occurrences still exist as unresolved mention evidence.
4. Structured anchors remain canonical:
   - ONTOLOGY.md registry entries remain queryable as canonical entities with `provenance_scope='world'`
   - person anchors from character records / character proposal cards remain queryable as canonical entities
   - artifact-title anchors from diegetic artifact records remain queryable as canonical entities
5. Exact-phrase retrieval still works without canonical promotion:
   - querying `find_named_entities(['Copper Weir'])` or the equivalent DB probe returns mention evidence even if no canonical entity exists yet
   - the response labels that evidence `noncanonical`
6. `find_impacted_fragments` and any graph walk using `mentions_entity` no longer depend on unresolved heuristic phrases.
7. No per-string stoplist expansion is needed for the currently reproduced residual fragments. The acceptance proof is architectural: they are disqualified by surface type, not by hand-curated banned strings.

## Out of Scope

- Retrofitting world content with explicit entity assertion blocks
- Extending `docs/FOUNDATIONS.md` schema immediately to house entity assertions
- Reconstructing every desirable domain-prose entity as canonical in v1
- Semantic entity clustering or embeddings-based entity resolution
- Honorific stripping / nickname inference / title normalization beyond lossless exact normalization
- Changing non-entity retrieval tools (`search_nodes`, `get_node`, `get_context_packet`) except where they touch the entity API contract

## Risks & Open Questions

### Risks

1. **Recall regression for prose-only world concepts.** Names like `Copper Weir`, `Charter Hall`, or `Bent Willow` may stop being canonical entities until an explicit authority source exists. This is intentional precision gain, but it reduces graph richness in the short term. Concretely: SPEC-06 canon-addition Part A's pre-figuring diegetic-artifact scan and Phase 12a axis-(a)(b)(c) mechanical scan both rely on `find_named_entities` and the `mentions_entity` graph respectively. Expect recall to drop for prose-only names; SPEC-06's impact-analysis weighting (particularly the pre-figuring scan on proposal-named entities) may need recalibration after this spec lands.

2. **Consumer migration cost.** SPEC-02 and any direct SQLite readers will need to stop treating `entity_mentions` as if every row were a canonical entity. This is a real contract change, not a transparent patch.

3. **Proposal-scope ambiguity.** Proposal-local names are deliberate retrieval targets but not world truth. If consumers forget to filter by `provenance_scope`, they may over-trust proposal entities. The scope field must therefore be part of the public contract, not an internal convenience.

4. **Stoplist complacency risk.** Once unresolved phrases no longer poison the canonical graph, it may still be tempting to keep growing the stoplist for cosmetic reasons. That should be resisted unless the unresolved evidence surface itself becomes noisy enough to harm exact-surface retrieval.

### Open Questions

1. **Which future structured surface should authoritatively canonize prose-domain entities?**
   Options:
   - add `entity_assertions` to CF YAML
   - add explicit local assertion blocks to domain files
   - allow curated alias/entity registries in a separate machine-facing file
   This spec leaves the seam open but does not choose among them.

2. **Should proposal-derived entities remain in the same `entities` table as world entities?**
   Current answer: yes, with explicit `provenance_scope`. Alternative: split into separate tables. Revisit only if consumer complexity becomes unmanageable.

3. **Should exact-surface fallback participate in impact routing at all?**
   Current answer: only as explicit `noncanonical_fallback`, never as the same weight as canonical graph links. Revisit if real skill workflows prove that too restrictive.

4. **Should canonical entity generation eventually include accepted CF titles/statements?**
   Current answer: not without an explicit assertion seam. CF prose is still prose; the redesign is specifically about stopping implicit semantic promotion from prose shape alone.
