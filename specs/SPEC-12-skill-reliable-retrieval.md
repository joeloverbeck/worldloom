<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-12: Skill-Reliable Retrieval — Scoped References, Structured Cross-Record Edges, and Locality-First Context Packets

**Status**: PROPOSED
**Phase**: 1.9 remediation; lands after SPEC-02 and before downstream skills rely on the current MCP surface as production-ready
**Depends on**: SPEC-01, SPEC-02, SPEC-10, SPEC-11, SPEC-07 Part A
**Blocks**: SPEC-06 any skill migration or read-side reliance that assumes the current MCP surface is sufficiently complete for truthful downstream work

## Problem Statement

Production MCP probes against `worlds/animalia` show that the server is live but not yet reliable enough for downstream skills.

Observed live behavior:

- `search_nodes("Melissa Threadscar")` returns `DA-0002` ahead of Melissa's character record even though the source record is the primary authority-bearing node.
- `find_named_entities(["Melissa Threadscar", "Mudbrook", "Rill", "Aldous", "Copperplate"])` produces no canonical or scoped answer for the names that a downstream skill would actually need to localize Melissa's dossier or the related artifact flow.
- `get_neighbors("animalia:melissa-threadscar.md:melissa-threadscar:0")` only yields `entity:canal-heartland` and `entity:vespera-nightwhisper`, even though the source file explicitly names `Mudbrook-on-the-Bend`, `Rill`, `Aldous`, `Bertram`, and `Registrar Copperplate`.
- `get_node("DA-0002")` exposes `author_character_id: CHAR-0002` in the body but does not materialize that exact structured link as retrieval-visible graph structure.
- `get_context_packet(...)` for Melissa and `DA-0002` exhausts small budgets on broad mandatory-file sweeps while still failing to deliver the source-local names and relationships a skill would need to operate truthfully.

The raw source documents confirm that the missing information is real and deliberate, not a probing mistake:

- `worlds/animalia/characters/melissa-threadscar.md` explicitly commits Melissa's current location, kinship-local names, and local pressures in frontmatter and dossier prose. The frontmatter itself parses cleanly; the retrieval miss is driven by a quoted-nickname-first canonical name (`"Threadscar" Melissa`) lacking an unquoted-form alias (`Melissa Threadscar`) and by under-declared scoped references — both repairable within this spec's authority surface without changing Melissa's canonical name.
- `worlds/animalia/characters/vespera-nightwhisper.md` explicitly names Mudbrook, Melissa, Rill, Aldous, the Common Pantheon, and the First Cat tradition.
- `worlds/animalia/diegetic-artifacts/after-action-report-harrowgate-contract.md` explicitly commits `author_character_id: CHAR-0002`, `Harrowgate`, `Charter Hall of Harrowgate`, and `Upper Drynn`.

This is not simply another SPEC-11 canonical-entity gap.

SPEC-10 and SPEC-11 intentionally made the canonical entity surface precision-first:

- only explicit authority surfaces produce canonical `named_entity` rows
- heuristic phrase scanning remains evidence-only
- exact aliases are allowed, but heuristic promotion is forbidden

That contract is still correct. The production failure is different:

1. **Downstream skills need deliberate local anchors that are not always world-level canonical ontology.** A character dossier may truthfully depend on `Rill`, `Aldous`, or `Registrar Copperplate` even when those names have not been promoted into `ONTOLOGY.md`'s world-level registry.
2. **Exact structured record-to-record links are under-modeled.** Existing id fields such as `author_character_id`, `source_artifact_id`, and `batch_id` are already machine-readable, but the retrieval graph does not expose them consistently.
3. **Context-packet completeness is currently class-blind.** The assembler spends budget on generic required-file sweeps before guaranteeing delivery of seed-local anchors, source-local relationships, and exact linked records.
4. **Ranking does not reflect trust tiers needed by skills.** A downstream skill needs "primary authority node and exact linked context first," not just "something lexically related first."

This conflicts with `docs/FOUNDATIONS.md` in a different way than SPEC-10 / SPEC-11:

- **Tooling Recommendation**: LLM agents should always receive the minimum complete input bundle for the task, not an incomplete packet that omits seed-local anchors while spending budget on broad background.
- **Core Principle**: the world model is explicit and constrained, but downstream retrieval must still preserve local structure truthfully rather than flattening it into either "canonical ontology" or "opaque prose."
- **Rule 1: No Floating Facts**: if a local name is important enough to drive downstream reasoning, it needs an explicit machine-readable retrieval surface rather than depending on prose luck.
- **Rule 6: No Silent Retcons**: the fix must not silently promote every local proper noun into hard-canon ontology just to improve recall.

The architectural gap is therefore:

> Worldloom currently has a precise canonical entity surface and a broad evidence surface, but it lacks an explicit, machine-readable middle layer for skill-relevant scoped references and exact cross-record locality.

Without that middle layer, the MCP can be alive yet still unreliable for downstream skills.

## Approach

Keep SPEC-10 and SPEC-11's precision-first canonical model intact.

Do **not** fix this by reintroducing heuristic canonical promotion.

Instead, add a second explicit retrieval layer between canonical entities and unresolved phrase evidence:

1. **Canonical entities** remain the only world-model entities that produce canonical `named_entity` nodes and canonical `mentions_entity` edges.
2. **Scoped references** become a new explicit machine-readable retrieval surface for source-local names and relationships that matter to downstream skills but are not necessarily world-level ontology.
3. **Structured cross-record edges** are extracted from exact id-bearing fields that already exist in world records.
4. **Mention evidence** remains recall/debug data only; it never upgrades itself into either canonical entities or scoped references.

The governing rule is:

> If downstream skills should rely on a local name or relationship, that reliance must be backed either by a canonical entity, an exact structured cross-record edge, or an explicit scoped-reference declaration. Prose alone is evidence, not authority.

### Trust tiers

The retrieval layer now has four trust tiers:

1. **Canonical entity** — world/proposal/diegetic canonical row backed by SPEC-10 / SPEC-11 authority surfaces.
2. **Exact structured record edge** — machine-readable foreign-key-style link between records already identified by exact ids.
3. **Scoped reference** — explicit, source-local retrieval anchor declared on an authority-bearing record; useful to skills but not promoted to world-level ontology.
4. **Mention evidence** — unresolved phrase occurrence; recall aid only.

Downstream tools must preserve these distinctions in ranking, output shape, and packet assembly.

### Scoped references are explicit, not heuristic

Scoped references must come only from machine-readable source-local declarations or exact structured field adapters. They are not inferred from arbitrary prose.

This preserves FOUNDATIONS discipline:

- no silent canon promotion
- no floating facts
- no heuristic laundering of local names into ontology

### Locality-first context packets

`get_context_packet` must guarantee seed-local completeness classes before broad background expansion.

For an authority-bearing seed node, the assembler must deliver in this order:

1. the seed node
2. exact structured record links from the seed
3. scoped references declared on the seed
4. the minimum governing kernel/invariants/fact/risk surfaces required by FOUNDATIONS for the task type
5. suggested downstream impact surfaces

If the requested budget cannot accommodate both local anchors and the task's governing completeness classes, the server must return a structured insufficiency result. It must not silently deliver a packet that is broad but locally unusable.

## Deliverables

### 1. Add a machine-readable scoped-reference surface on authority-bearing records

Authority-bearing whole-file records gain an optional structured frontmatter field:

```yaml
scoped_references:
  - name: Mudbrook
    kind: place
    relation: current_location
    aliases:
      - Mudbrook-on-the-Bend
  - name: Rill
    kind: person
    relation: apprentice_candidate
    aliases: []
```

Initial supported record types:

- `character_record`
- `character_proposal_card`
- `diegetic_artifact_record`
- `proposal_card` (for pre-figuring flows that already rely on named local targets)

Contract requirements:

- machine-readable frontmatter only
- exact names and exact aliases only
- `relation` is required and describes why this reference matters to downstream localization
- declarations are source-local retrieval metadata, not world-level ontology declarations
- a `scoped_reference` may restate a name already present in the same record's prose/body/frontmatter, but it may not introduce unsupported new facts

These declarations are the explicit answer to names such as `Rill`, `Aldous`, `Bertram`, `Registrar Copperplate`, `Charter Hall of Harrowgate`, or `Upper Drynn` when those names matter locally but are not yet world-level canonical entities.

**Backfill policy**: v1 expects incremental authoring. No batch migration across all existing authority-bearing records is required. Records without a `scoped_references` block continue to be indexed as before (empty scoped-reference surface); adding the block on a later edit is strictly additive.

### 2. Add a scoped-reference schema and graph surface

Add a new retrieval layer in `world.db`:

#### `scoped_references`

```sql
CREATE TABLE scoped_references (
    reference_id TEXT PRIMARY KEY,         -- matches nodes.node_id for node_type='scoped_reference'
    world_slug TEXT NOT NULL,
    display_name TEXT NOT NULL,
    reference_kind TEXT,
    provenance_scope TEXT NOT NULL,       -- world | proposal | diegetic | audit
    relation TEXT NOT NULL,
    source_node_id TEXT NOT NULL,
    source_field TEXT NOT NULL,           -- scoped_references | current_location | place | author_character_id | etc.
    target_node_id TEXT,                  -- nullable; set when this scoped reference resolves to an exact record node
    authority_level TEXT NOT NULL,        -- explicit_scoped_reference | exact_structured_edge
    FOREIGN KEY (source_node_id) REFERENCES nodes(node_id),
    FOREIGN KEY (target_node_id) REFERENCES nodes(node_id)
);
CREATE INDEX idx_scoped_references_name ON scoped_references(world_slug, display_name);
CREATE INDEX idx_scoped_references_source ON scoped_references(source_node_id);
```

#### `scoped_reference_aliases`

```sql
CREATE TABLE scoped_reference_aliases (
    alias_id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_id TEXT NOT NULL,
    alias_text TEXT NOT NULL,
    FOREIGN KEY (reference_id) REFERENCES scoped_references(reference_id)
);
CREATE UNIQUE INDEX idx_scoped_reference_alias_unique ON scoped_reference_aliases(reference_id, alias_text);
CREATE INDEX idx_scoped_reference_alias_text ON scoped_reference_aliases(alias_text);
```

Each scoped reference also gets a backing `nodes` row with `node_type='scoped_reference'` so existing MCP tools can expose it naturally through `search_nodes`, `get_node`, and `get_neighbors`.

#### `reference_id` format

`reference_id` is deterministic and stable across re-indexing:

```
${source_node_id}#scoped:${slug(display_name)}:${ordinal}
```

Where `slug(display_name)` is the same lowercase-kebab slug function used by canonical entity slugs (see `tools/world-index/src/parse/entities.ts:canonicalEntitySlug`), and `ordinal` is the zero-based position of the scoped-reference entry within the record's `scoped_references` list (for frontmatter-declared entries) or within the record's structured-field adapter output (for exact-structured-edge entries). The `#scoped:` marker is chosen to be unambiguously disjoint from existing node_id conventions (structured prefixes like `CF-0001`, path-slug forms like `${world}:${path}:${slug}:${ord}`, and the `entity:` prefix used for canonical `named_entity` rows).

#### New node type and edge types

This deliverable extends the closed TypeScript type unions in `tools/world-index/src/schema/types.ts`:

- **`NODE_TYPES`** gains one member: `"scoped_reference"`.
- **`EDGE_TYPES`** gains a new category `SCOPED_EDGE_TYPES = ["references_scoped_name", "references_record"] as const`, folded into `EDGE_TYPES` alongside the existing `YAML_EDGE_TYPES`, `ATTRIBUTION_EDGE_TYPES`, and `ENTITY_EDGE_TYPES`. A corresponding `ScopedEdgeType` type is exported.
- Re-export both additions through `tools/world-index/src/public/types.ts` so `tools/world-mcp` picks them up via the existing `@worldloom/world-index/public/types` path.

The following closed-enum consumers must opt in or opt out deliberately as part of this deliverable (silent non-handling is an implementation bug, not a default behavior):

- `tools/world-mcp/src/ranking/policy.ts`'s `RankingWeights.file_class_priority` — add an explicit weight for `"scoped_reference"` (recommended default `0`; scoped-reference nodes are surfaced via ranking bands, not file-class priority).
- `tools/world-mcp/src/ranking/profiles/` — ensure the default profile and any task-type profile include the new node type.
- `tools/world-mcp/src/context-packet/envelope.ts`'s `ENVELOPE_EDGE_TYPES` — include `"references_scoped_name"` and `"references_record"` in envelope expansion for authority-bearing seeds (see D6).
- `tools/world-mcp/src/tools/get-neighbors.ts` — no code change beyond accepting the new edge types via the existing `EdgeType` param (inherited from the enum extension), but verify the filter clause handles them.
- `tools/world-mcp/src/tools/find-impacted-fragments.ts` — **must not** traverse `references_record` or `references_scoped_name`; canonical-only traversal is preserved (see Invariants below).

#### Edge semantics

New edge types:

- `references_scoped_name` — source record -> scoped reference (backing `nodes` row with `node_type='scoped_reference'`)
- `references_record` — source record -> exact linked record node when the source field is an exact id link

Invariants:

- scoped references are never emitted as canonical `named_entity` rows
- scoped references never participate in canonical `mentions_entity` traversal
- `find_impacted_fragments` remains canonical-only (traverses only `mentions_entity` and `required_world_update`); it does **not** traverse `references_record` or `references_scoped_name` in v1. A future spec may explicitly widen it.

### 3. Extract exact structured record-to-record edges from existing fields

The retrieval graph must materialize exact structured links already present in world records.

Initial required adapters:

- `diegetic_artifact_record.author_character_id` -> `references_record` -> `character_record`
- `proposal_batch.source_artifact_id` -> `references_record` -> `diegetic_artifact_record` — **applies only to artifact-mining batch manifests** emitted by `.claude/skills/canon-facts-from-diegetic-artifacts/` (whose `templates/batch-manifest.md` carries the field). General proposal batches emitted by `propose-new-canon-facts` do not carry `source_artifact_id`; the adapter must no-op cleanly when the field is absent.
- `proposal_card.batch_id` -> `references_record` -> `proposal_batch`
- `character_proposal_card.batch_id` -> `references_record` -> `character_proposal_batch`
- any existing exact id-bearing foreign-key field already emitted in current frontmatter contracts

These exact links are higher-trust than lexical search and must appear in:

- `get_node`
- `get_neighbors`
- context-packet assembly
- ranking bands for `search_nodes`

They are explicitly **not** traversed by `find_impacted_fragments` — see D2 Invariants. A reader of D3 may naturally expect exact record-to-record links to influence impact surfaces; they do not in v1. Impact-surface semantics remain canonical-only to preserve Rule 6-safe downstream-impact reporting.

This corrects the current failure where DA-0002 visibly carries `author_character_id: CHAR-0002` but the retrieval graph does not treat that relationship as a first-class localization path.

### 4. Extend MCP retrieval outputs to expose trust tiers explicitly

#### `find_named_entities`

Expand the response to:

```yaml
canonical_matches: []
scoped_matches: []
surface_matches: []
```

`scoped_matches` rows must include:

- `reference_id`
- `display_name`
- `reference_kind`
- `relation`
- `provenance_scope`
- `source_node_id`
- `target_node_id` when exact record resolution exists
- `match_kind` (`display_name` | `alias_text`)

**Sort invariants** for `scoped_matches` (parallel to the existing rules for `canonical_matches` and `surface_matches` in `tools/world-mcp/src/tools/find-named-entities.ts:175-199`): sort by `match_kind` (`display_name` before `alias_text`), then by `query`, then by `display_name`, then by `reference_id`.

This preserves SPEC-10's canonical-vs-evidence split while adding the missing middle tier needed by skills.

#### `get_node`

Add:

- `structured_links` — exact record-to-record links extracted from id-bearing fields
- `scoped_references` — source-local retrieval anchors declared on the node or derived from exact structured edge adapters

#### `get_neighbors`

Include `references_record` and `references_scoped_name` in graph expansion and filtering. (The `EdgeType` enum extension in D2 makes these accepted values on the existing `edge_types` param; no new parameter is needed.)

#### `search_nodes`

Keep the existing canonical `entity_name` filter semantics from SPEC-02 / SPEC-10. Do not silently widen `entity_name`.

Add both filter surfaces, with the interaction:

- `include_scoped_references: boolean` — broad gate. Defaults to `false` for backward compatibility with existing SPEC-02 callers (the `entity_name` filter and open text search stay canonical-only unless the caller opts in). When `true`, lexical/open-text queries also match against scoped-reference `display_name` and `alias_text`.
- `reference_name: string` — exact scoped-reference match, mirroring the existing `entity_name` filter's exact-match semantics. When `reference_name` is set, `include_scoped_references` is implicitly `true` for that call (the dedicated filter already signals intent).

This interaction preserves SPEC-02 callers (existing `entity_name` users see no tier drift) while giving new callers both a precise scoped filter and a broad opt-in.

Responses must surface `match_basis` so callers know whether a hit came from:

- exact id
- canonical entity
- exact structured record edge
- scoped reference
- lexical evidence

The `match_basis` field is added to `SearchNodeResult` in `tools/world-mcp/src/tools/_shared.ts` with the union type:

```ts
match_basis: "exact_id" | "canonical_entity" | "structured_record_edge" | "scoped_reference" | "lexical_evidence";
```

Tie-breaks follow the ranking band priority in D5 (exact id first, lexical last).

### 5. Redesign ranking as trust-tier-first, locality-aware ordering

Update ranking bands to:

1. exact id match
2. exact canonical entity match
3. exact structured record-edge match
4. exact scoped-reference match
5. weighted lexical / graph ranking

Within band 5, add a locality bonus for:

- authority-bearing source node hit
- source node directly linked via `references_record`
- source node directly linked via `references_scoped_name`

This prevents a lexically rich related artifact from outranking the primary source record when the query is actually anchored on a local authority-bearing character or artifact record.

#### Required `RankingCandidate` extensions

The `RankingCandidate` interface in `tools/world-mcp/src/ranking/policy.ts:3-15` gains two new `0 | 1` signals:

```ts
exact_structured_record_edge_match: 0 | 1;
exact_scoped_reference_match: 0 | 1;
```

`sqlToCandidates` in `tools/world-mcp/src/tools/_shared.ts:193-215` must populate both fields. The supporting SQL joins on the new `scoped_references` table for `exact_scoped_reference_match` (match when the query equals `scoped_references.display_name` or any `scoped_reference_aliases.alias_text` on a scoped reference attached to the candidate node) and on `edges` with `edge_type IN ('references_record', 'references_scoped_name')` for `exact_structured_record_edge_match` (match when the query resolves to the target node via an exact structured edge from the candidate). Both follow the existing `EXISTS (SELECT 1 FROM ...)` pattern used for `exact_entity_match_in_target_field`.

`getCandidateBand` in `tools/world-mcp/src/ranking/policy.ts:32-42` must return band priorities corresponding to the 5-band model (with band 5 — "weighted lexical / graph ranking" — being the current band 0 fallthrough). Higher band = higher priority, and the existing `compareRankedCandidates` comparator reverses in the expected direction.

### 6. Upgrade context packets to v2 with completeness classes and locality-first guarantees

`get_context_packet` bumps `packet_version` from `1` to `2` and adopts locality-first assembly.

**Migration posture**: v1 is removed outright. v2 replaces it wholesale. No backward-compatibility shim is provided. Consumers of the packet (SPEC-06 Part A skills, which have not yet landed) will consume v2 only. `DEFAULT_PACKET_VERSION` in `tools/world-mcp/src/context-packet/shared.ts:64` flips to `2`; the typed `packet_version: 1` literal on `ContextPacket` (shared.ts:41) becomes `packet_version: 2`; `DEFAULT_BUDGET_SPLIT` (shared.ts:66-72) is re-keyed to match the new layer names; `estimatePacketTokens` (shared.ts:111-146) is rewritten to iterate the new layers; `docs/CONTEXT-PACKET-CONTRACT.md` is regenerated to document the v2 shape (see D8).

New contract requirements:

- the assembler distinguishes `local_authority`, `exact_record_links`, `scoped_local_context`, `governing_world_context`, and `impact_surfaces` as explicit completeness classes
- authority-bearing seeds must include local-authority classes before broad background expansion
- task-type profiles may still require `WORLD_KERNEL`, `INVARIANTS`, relevant CFs, contradictions, and Mystery Reserve constraints, but those requirements must be satisfied minimally and deliberately rather than by broad file sweeps
- if required completeness classes do not fit, return structured error `packet_incomplete_required_classes` with:
  - `missing_classes`
  - `requested_budget`
  - `minimum_required_budget`
  - `retained_classes`

**Error subsumption**: the existing `budget_exhausted_nucleus` error (emitted at `tools/world-mcp/src/context-packet/assemble.ts:143-152` when the required nucleus exceeds the requested budget) is subsumed by `packet_incomplete_required_classes`. In v2, the former nucleus-exhaustion case is reported as `packet_incomplete_required_classes` with `missing_classes` naming the specific completeness class (`["local_authority"]` for seed-local-authority shortfalls; `["governing_world_context"]` for FOUNDATIONS-required context shortfalls; multiple classes when appropriate). There is exactly one completeness-insufficiency error code after v2; `budget_exhausted_nucleus` is removed.

This is the FOUNDATIONS-aligned answer to the current failure mode where the packet is formally large but still locally insufficient.

### 7. Add live-corpus proof on `animalia` and require truthing of production authority records

Implementation of this spec is not complete until live `animalia` proofs demonstrate:

1. Melissa's authority-bearing source is truthful against SPEC-11. If `melissa-threadscar.md` is missing aliases, scoped references, or structured-field bindings needed for downstream localization, those gaps must be repaired — or the proof must explicitly fail as a content-blocking defect. The current record parses cleanly; the expected repairs are (a) an `aliases: [Melissa Threadscar]` entry on the existing frontmatter so the unquoted-form probe resolves canonically against the `"Threadscar" Melissa` name, and (b) a `scoped_references` block naming the local actors and places (`Rill`, `Aldous`, `Bertram`, `Registrar Copperplate`, `Mudbrook-on-the-Bend`, etc.) that downstream skills would legitimately need.
2. `find_named_entities` can surface `Melissa Threadscar` canonically and `Mudbrook`, `Rill`, `Aldous`, `Bertram`, `Copperplate`, `Harrowgate`, and `Charter Hall of Harrowgate` through canonical/scoped tiers rather than unresolved evidence only.
3. `get_neighbors` for Melissa and DA-0002 exposes exact record links and source-local references that match the raw documents.
4. `get_context_packet` for Melissa and DA-0002 can return a truthful packet under a realistic skill budget without dropping seed-local anchors.

**Phase 1 write carve-out**: the live-corpus repairs in this deliverable require direct `Edit`/`Write` calls against `worlds/animalia/characters/melissa-threadscar.md`, `worlds/animalia/characters/vespera-nightwhisper.md`, and `worlds/animalia/diegetic-artifacts/after-action-report-harrowgate-contract.md`. Hook 3 (engine-only mutation guard) is Phase 2 work per `SPEC-05 Part B`; in Phase 1 the patch engine is not yet wired, so direct hand-edits to authority-bearing record frontmatter are permitted and expected for this deliverable. Phase 2 will route equivalent future edits through patch plans; this spec's corpus repair is a one-time Phase 1 action.

This spec therefore owns both the retrieval architecture and the live production proof that the architecture is sufficient for downstream skills.

### 8. Update consumer docs and skill guidance

When SPEC-12 lands, the following must update in the same pass:

- `docs/FOUNDATIONS.md` machine-facing layer wording where it currently implies that `get_context_packet` alone already guarantees downstream sufficiency
- `docs/CONTEXT-PACKET-CONTRACT.md` — **regenerated** for packet v2 (not amended): the v1 example YAML, layer semantics, and assembly discipline sections must be rewritten against the v2 completeness-class shape (`local_authority`, `exact_record_links`, `scoped_local_context`, `governing_world_context`, `impact_surfaces`) since v1 is removed outright (see D6)
- `docs/MACHINE-FACING-LAYER.md` for the new trust tiers — add a short section on the scoped-reference middle tier alongside the existing canonical-entity and lexical-evidence surfaces
- `CLAUDE.md` §Machine-facing-layer integration — add a sentence naming the scoped-reference middle tier alongside the existing localization surfaces (`search_nodes`, `get_node`, `get_neighbors`, `find_named_entities`, `find_impacted_fragments`) so future readers understand the trust-tier layering at project-level
- *(forward-compat note, not a present-day edit)* once SPEC-06 Part A introduces MCP-consuming skill prose in `.claude/skills/`, that prose must not assume the post-SPEC-12 surface can localize local anchors only through canonical entities or unresolved evidence. The present-day `.claude/skills/` corpus does not consume MCP tools directly (grep of `.claude/skills/*/**.md` for `mcp__worldloom__*` / `get_context_packet` / `find_named_entities` returns zero matches), so there is no current-day skill guidance to rewrite — SPEC-06 Part A will author that guidance against the post-SPEC-12 surface from the start. `.codex/skills/` is out of scope for this bullet; grep confirms those four SKILL.md files (`audit-world-index`, `implement-ticket`, `post-ticket-review`, `skill-audit`) do not reference MCP tools at all.

## FOUNDATIONS Alignment

| FOUNDATIONS surface | Alignment | Rationale |
|---|---|---|
| Core Principle | aligns | The fix adds explicit machine-readable locality instead of inferring structure from prose accidents. |
| Rule 1: No Floating Facts | aligns | Skill-relevant local names move onto explicit retrieval surfaces rather than depending on prose luck. |
| Rule 6: No Silent Retcons | aligns | Scoped references are not promoted into hard-canon ontology; trust tiers stay explicit. |
| Tooling Recommendation | aligns | `get_context_packet` becomes closer to the promised minimum complete bundle rather than a locally incomplete approximation. |
| Canon Layers | aligns | Scoped references are retrieval metadata and source-local anchors, not automatic hard-canon world ontology. |
| Mandatory World Files | aligns | World-level canonical entities still belong in `ONTOLOGY.md`; local record-specific anchors belong on the authority-bearing records that already carry the relevant local truth. |
| Change Control Policy | aligns | If a scoped reference would introduce a new world fact rather than restating existing record-supported truth, it requires the normal canon-mutating flow. |

No conflict with FOUNDATIONS was found. The point of the spec is to make the machine-facing layer match FOUNDATIONS more truthfully, not to widen canon by convenience.

## Verification

### Structural

1. `world.db` contains `scoped_references` and `scoped_reference_aliases`, and `nodes` includes `node_type='scoped_reference'`.
2. `tools/world-index` public types re-export the extended `NODE_TYPES` (includes `"scoped_reference"`) and the new `SCOPED_EDGE_TYPES` folded into `EDGE_TYPES` (`"references_record"`, `"references_scoped_name"`).
3. `tools/world-index` emits `references_record` and `references_scoped_name` edges without widening canonical `mentions_entity`.
4. `tools/world-mcp` exposes `scoped_matches`, `structured_links`, and packet v2 insufficiency results; the v2 `DEFAULT_PACKET_VERSION` constant is `2`, the v1 constant is removed, and `packet_incomplete_required_classes` is the sole completeness-insufficiency error (`budget_exhausted_nucleus` is removed).
5. `tools/world-mcp` ranking code orders exact structured links and scoped references above lexical fallback, using the extended `RankingCandidate` signals (`exact_structured_record_edge_match`, `exact_scoped_reference_match`).
6. `tools/world-mcp` `search_nodes` exposes both `include_scoped_references` and `reference_name` filters with the documented interaction (passing `reference_name` implies `include_scoped_references=true`).

### Functional

7. A fixture diegetic artifact with `author_character_id` yields an exact `references_record` edge to the character record.
8. A fixture character record with `scoped_references` yields `scoped_matches` for exact queries without creating canonical `named_entity` rows.
9. `find_named_entities` preserves the canonical-vs-scoped-vs-surface distinction for the same query set, with `scoped_matches` sorted by `match_kind` → `query` → `display_name` → `reference_id`.
10. `get_context_packet` returns `packet_incomplete_required_classes` (with the appropriate `missing_classes` naming) when local completeness and governing completeness cannot both fit inside budget, including the former `budget_exhausted_nucleus` case (now `missing_classes: ["local_authority"]` or equivalent).
11. `search_nodes` exposes `match_basis` and ranks the primary authority-bearing source record ahead of merely related lexical hits when exact structured locality exists.
12. `find_impacted_fragments` does not traverse `references_record` or `references_scoped_name`; only canonical `mentions_entity` and `required_world_update` edges drive impact expansion.

### Live-corpus proof

13. Production `animalia` queries for Melissa, Vespera, DA-0002, Mudbrook, Rill, Aldous, Bertram, Copperplate, Harrowgate, and Charter Hall of Harrowgate return truthful canonical/scoped/structured-link results consistent with the source documents.
14. Melissa's dossier and DA-0002 no longer require raw document inspection to recover the source-local names and exact record links that downstream skills need.
15. Packet v2 for Melissa and DA-0002 succeeds within a realistic skill budget while preserving both local anchors and FOUNDATIONS-required governing context.

## Out of Scope

- Reversing SPEC-10 / SPEC-11 by heuristically promoting arbitrary prose names to canonical entities
- Treating scoped references as hard-canon world ontology
- Widening `find_impacted_fragments` to scoped-reference or structured-record-edge traversal in v1
- Solving every local prose-reference surface in one pass without explicit declarations
- Rewriting world content to add new names that the current source files do not already support
- Batch-migrating every existing authority-bearing record to carry `scoped_references`; v1 is incremental-authoring only
- Retaining a v1 `get_context_packet` shape alongside v2; v1 is removed outright
- Semantic-embedding retrieval; exact and structured retrieval remain primary

## Risks & Open Questions

### Risks

1. **Metadata sprawl on world records.** Adding `scoped_references` to frontmatter could become noisy if authors treat it as a second narrative summary. Mitigation: keep the block exact, terse, and relation-driven.
2. **False confidence from partially migrated corpora.** If some production records declare scoped references and others do not, downstream skills may overtrust coverage. Mitigation: packet v2 must surface insufficiency when completeness classes are missing.
3. **Schema/tool complexity.** A new middle layer touches both `tools/world-index` and `tools/world-mcp`. Mitigation: keep canonical entities unchanged and add scoped references as a clearly separated surface.
4. **Corpus-truthing cost.** Production reliability requires repairing under-aliased or under-declared authority-bearing records such as Melissa's file. Mitigation: make live-corpus proof an explicit completion gate rather than a side effect.
5. **v1-to-v2 packet break.** Dropping v1 outright is only safe because no production consumer currently depends on `get_context_packet` (SPEC-06 Part A skill rewrites have not yet landed). Mitigation: sequence SPEC-12 ahead of SPEC-06 Part A in `specs/IMPLEMENTATION-ORDER.md` (already reflected at Tier 2.25) so the first consumers author against v2 directly.

### Open Questions

1. Should `scoped_references` support a future `scope_note` or `confidence_note`, or should v1 remain exact-name + relation only? (Deferred to a later spec.)
2. Which additional whole-file record types beyond the initial four should gain `scoped_references` in v1, and which should wait for a later spec? (Deferred to a later spec when real cases arise.)
