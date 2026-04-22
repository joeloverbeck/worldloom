<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-10: Entity Surface Redesign — Authority-Backed Entities, Separate Mention Evidence

**Phase**: 1.5 remediation; lands after SPEC-01 and before entity-sensitive consumers rely on the graph
**Depends on**: SPEC-01
**Blocks**: SPEC-02 `find_named_entities` final contract, SPEC-02 `find_impacted_fragments` final contract, SPEC-06 pre-figuring/entity-sensitive retrieval flows

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

- structured `name` fields in `character_record` and `character_proposal_card`
- structured `title` fields in `diegetic_artifact_record`
- future explicit entity-assertion blocks attached to structured world records (see Open Questions)

Everything else is evidence only unless and until an explicit authority source exists.

### Layer model

The redesigned entity surface must preserve the distinction between modeled-world entities and scoped artifact/proposal entities. Each canonical entity carries a provenance scope:

- `world` — anchored in accepted world content
- `proposal` — anchored in proposal artifacts; deliberate retrieval target, but not world-level truth
- `diegetic` — anchored in an in-world artifact title or named referent
- `audit` — anchored in audit-local records only; not world truth

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

Because `world.db` is regenerable, the redesign may break the current entity schema cleanly rather than preserving a misleading contract.

Add a new forward migration (or rebuild-time baseline schema replacement) with:

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

### 2. Redefine `named_entity` semantics

Retain `node_type='named_entity'` for graph compatibility, but change its meaning:

- **Old meaning**: any surviving lexical candidate from Pass 3
- **New meaning**: only authority-backed canonical entities

Its human-readable `body` may remain a compact summary, but the authoritative query surface is `entities`, not string parsing from `nodes.body`.

### 3. Rebuild the extraction pipeline in two stages

#### Stage A — canonical entity construction

Construct canonical entities only from authority-bearing adapters:

- `character_record.name` -> `entity_kind='person'`, `provenance_scope='world'`
- `character_proposal_card.name` -> `entity_kind='person'`, `provenance_scope='proposal'`
- `diegetic_artifact_record.title` -> `entity_kind='text/tradition'` or `artifact`, `provenance_scope='diegetic'`
- future explicit entity-assertion adapters for CF / CH / other structured nodes

No section heading, bullet cluster, open-question heading, mystery-reserve title, or workflow heading may create a canonical entity by heuristic.

#### Stage B — alias generation

Generate aliases only under constrained, lossless rules:

- exact normalized punctuation/case forms
- explicitly asserted aliases from structured data once that surface exists

Not allowed in v1:

- honorific/title dropping (`Canon Althea Greystone` -> `Canon Althea`)
- fragment extraction from compounds (`Standard Class-C` -> `Standard Class`)
- suffix extraction from headings (`Maker-Age Linguistic Recovery` -> `Age Linguistic Recovery`)
- singular/plural guessing

This keeps ambiguity visible instead of silently hardening it into the canonical graph.

### 4. Keep heuristic scanning, but demote it to mention evidence

The existing regex-based phrase scan may continue, but only to populate unresolved `entity_mentions.surface_text`.

Consequences:

- `Sectarian Maker`, `Seal Civic`, `Standard Class`, `Enterable Maker`, `Taxonomy Extension`, `Wage Spreads`, `Term Consequences`, `Cluster Notes`, and `Claim Selection` may still be observed as raw phrase evidence if they truly occur in prose.
- They must never produce canonical `named_entity` nodes or `mentions_entity` edges unless a future explicit authority source is added.

### 5. Restrict `mentions_entity` edges to resolved canonical links

`mentions_entity` edges should be emitted only when a mention resolves to a canonical `entity_id`.

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

### 7. Add a future-facing extension seam for explicit entity assertions

The redesign intentionally leaves room for a later precision-preserving extension:

- structured `entity_assertions` blocks in CF / CH / other high-trust records
- optional alias lists on structured content records

That future work is where prose-domain entities like `Copper Weir` or `Charter Hall` should become canonical. They should not re-enter the graph via regex.

This spec does **not** force a FOUNDATIONS schema change now. It defines the architectural seam so future tickets can extend the schema truthfully.

## FOUNDATIONS Alignment

| Principle | Alignment |
|---|---|
| Core Principle | Canonical entities become modeled-world objects with explicit provenance, not accidental title-cased phrases. |
| Ontology Categories | Canonical entities can once again attach truthfully to kinds (`person`, `artifact`, `institution`, etc.) rather than defaulting to `unknown` because of heuristic promotion. |
| Canon Layers | Entity provenance scope preserves whether a named referent comes from world truth, proposal artifacts, diegetic artifacts, or audit-local text. |
| Relation Types | `mentions_entity` regains a precise meaning: relation to a modeled entity, not to document furniture. |
| No Silent Retcons | The redesign is derived-layer/tooling work only. It changes the machine-facing interpretation of existing markdown; it does not mutate canon files. |
| Write Boundaries | No world content changes are required for v1. Existing high-trust files stay untouched unless a later explicit-assertion feature is separately approved. |

## Verification

1. Fresh rebuild and verify still succeed:
   - `cd tools/world-index && npm run build`
   - `cd /home/joeloverbeck/projects/worldloom && node tools/world-index/dist/src/cli.js build animalia`
   - `cd /home/joeloverbeck/projects/worldloom && node tools/world-index/dist/src/cli.js verify animalia`
2. The repeated false-positive classes from `SPEC-01-020` through `SPEC-01-025` no longer materialize as canonical `named_entity` rows, regardless of whether their raw phrase occurrences still exist as unresolved mention evidence.
3. Structured anchors remain canonical:
   - person anchors from character records / character proposal cards remain queryable as canonical entities
   - artifact-title anchors from diegetic artifact records remain queryable as canonical entities
4. Exact-phrase retrieval still works without canonical promotion:
   - querying `find_named_entities(['Copper Weir'])` or the equivalent DB probe returns mention evidence even if no canonical entity exists yet
   - the response labels that evidence `noncanonical`
5. `find_impacted_fragments` and any graph walk using `mentions_entity` no longer depend on unresolved heuristic phrases.
6. No per-string stoplist expansion is needed for the currently reproduced residual fragments. The acceptance proof is architectural: they are disqualified by surface type, not by hand-curated banned strings.

## Out of Scope

- Retrofitting world content with explicit entity assertion blocks
- Extending `docs/FOUNDATIONS.md` schema immediately to house entity assertions
- Reconstructing every desirable domain-prose entity as canonical in v1
- Semantic entity clustering or embeddings-based entity resolution
- Honorific stripping / nickname inference / title normalization beyond lossless exact normalization
- Changing non-entity retrieval tools (`search_nodes`, `get_node`, `get_context_packet`) except where they touch the entity API contract

## Risks & Open Questions

### Risks

1. **Recall regression for prose-only world concepts.** Names like `Copper Weir`, `Charter Hall`, or `Bent Willow` may stop being canonical entities until an explicit authority source exists. This is intentional precision gain, but it reduces graph richness in the short term.

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
