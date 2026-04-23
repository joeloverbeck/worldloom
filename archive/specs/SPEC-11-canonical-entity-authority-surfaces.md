<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-11: Canonical Entity Authority Surfaces — Explicit Registry, Malformed-Source Discipline, Exact Alias Declarations

**Status**: COMPLETED

**Phase**: 1.75 remediation; lands after SPEC-10 and before entity-sensitive consumers treat the current canonical surface as complete
**Depends on**: SPEC-10
**Blocks**: SPEC-02 `find_named_entities` completeness expectations, SPEC-02 `search_nodes.entity_name` trust boundary, SPEC-06 any skill that assumes current canonical entities cover the intended named world model

## Problem Statement

SPEC-10 fixed the precision failure where heuristic phrase scanning over-promoted document furniture into canonical `named_entity` rows. The live `animalia` rebuild now passes that precision contract. A different problem remains: the current authority surface is too narrow and too silent about its omissions.

Current live behavior in `tools/world-index/src/parse/entities.ts`:

- canonical entities come only from `ONTOLOGY.md` lines that match the narrow `loadOntologyRegistry()` bullet grammar
- whole-file authority adapters only consume `character_record.name`, `character_proposal_card.name`, and `diegetic_artifact_record.title`
- malformed frontmatter on those authority-bearing whole-file records is silently skipped
- exact aliases come only from the structured `slug` field on character and proposal records

That leaves three observed gaps:

1. **Silent undercapture inside intended authority sources.** `worlds/animalia/characters/melissa-threadscar.md` is a `character_record` with a frontmatter `name`, but the `name` line is malformed YAML (`name: "Threadscar" Melissa`). The current extractor silently skips the record instead of surfacing a canonical-source validation failure, so the live index misses an intended canonical person.

2. **World-entity authority in `ONTOLOGY.md` is not machine-readable by contract.** `loadOntologyRegistry()` only accepts specific bullet-line shapes. It ignores the main ontology table and any named world entity not restated in the narrow bullet grammar. In live `animalia`, names such as `Brinewick`, `Mudbrook`, `Harrowgate`, `Canal Heartland`, `Lock-keeper guild`, and `Ash-Seal` are clearly part of the modeled world, but they do not become canonical entities unless they happen to be restated in the current bullet grammar.

3. **Exact alternates are underdeclared.** The current alias model is intentionally exact-only, but the structured authority surfaces provide almost no way to declare exact alternate forms beyond `slug`. When a world wants both `Canon Althea Greystone` and `Althea Greystone` to resolve to the same canonical entity, the current system offers no explicit structured declaration path.

### Inheritance from SPEC-10's unshipped frontmatter-parse reservation

SPEC-10's §Deliverable 3 Stage A reserved a `validation_results` row with `validator_name='frontmatter_parse'`, `severity='warn'` for the same malformed-frontmatter case described in gap 1. SPEC-10 also reserved a non-persisted `frontmatter?: Record<string, unknown>` sidecar on `NodeRow` that Stage A adapters were to consume. Both behaviors were absorbed into SPEC-10's "all landed" Outcome but did not actually ship — `grep frontmatter_parse tools/world-index/src/` returns zero matches, and `NodeRow` (`tools/world-index/src/schema/types.ts:192-207`) has no `frontmatter` sidecar. SPEC-11 Deliverable 2 therefore both **completes** SPEC-10's reserved validator name and **sharpens** its semantics for authority-bearing whole-file records (the broader frontmatter-parse case stays available under the same validator name with a different `code`). This is not a SPEC-10 retcon; it lands the reserved name at its intended place. Updating SPEC-10's archived Outcome to reflect partial-landing is a separate follow-up the user may pursue if desired.

This is an architectural gap, not just another cleanup ticket, because it defines what counts as a canonical entity in the structured world model. It directly touches `docs/FOUNDATIONS.md`:

- **Core Principle**: the world is a constrained model, not a bag of cool facts or a grab-bag of whatever names happened to be observed in prose
- **Ontology Categories**: named world entities should attach to explicit modeled categories
- **Mandatory World Files**: `ONTOLOGY.md` is the right durable home for explicit world-entity authority, not a separate ad hoc file
- **Tooling Recommendation**: canon consumers should read structured world state rather than infer ontology from prose accidents

The durable fix is therefore to formalize canonical entity authority surfaces explicitly: exact machine-readable declarations for world entities, exact structured authority fields for whole-file records, exact alias declarations where ambiguity must be resolved deliberately, and validation when an intended authority source is malformed.

## Approach

Keep SPEC-10's precision-first split. Do **not** return to heuristic canonical promotion.

Instead, refine the authority model:

1. **Canonical entities remain authority-backed only.** No prose scraping upgrade. No title-case heuristics. No implicit promotion from descriptive fields.
2. **World-level named entities move onto an explicit structured registry inside `ONTOLOGY.md`.** The parser stops treating incidental note bullets as a machine contract. Bullets that previously contributed canonical entries are demoted to **mention evidence only** as of this spec's landing — they remain visible to retrieval through the existing Stage C scan over `ontology_category` body content (`tools/world-index/src/parse/entities.ts:272+`), but they no longer produce canonical `named_entity` rows. No transitional dual-authority window is introduced.
3. **Whole-file authority sources stay narrow but become strict about malformation and explicit about aliases.** If a record is intended to be authority-bearing and its frontmatter is malformed, the index must emit a validation result instead of silently dropping it.
4. **Exact aliases become declarative.** The system gains an explicit structured path for exact alternate forms instead of relying on inferred title stripping or prose heuristics.

The governing rule is:

> If a name should be canonical, it must be declared on an authority surface that is both machine-readable and aligned with the modeled world.

This keeps the canonical surface precise while making it more complete in the specific places where the world already expresses deliberate named-entity intent.

### Conflict resolution between authority surfaces

A registry entry and a whole-file record may both declare the same `canonical_name`. When they do, **both survive as distinct canonical entities** with different `provenance_scope` (`world` for the registry entry; `world` / `proposal` / `diegetic` per `authoritySourceForNode` for the whole-file record). The existing collision-fallback in `canonicalEntitySlug` (`tools/world-index/src/parse/entities.ts:561-576`) appends a sha256 suffix to disambiguate the second slug. This preserves SPEC-10's "precision-first, visibility-over-auto-merging" stance: callers see two distinct rows with explicit provenance rather than a silent merge or a silent drop. If live worlds prove this a recurring foot-gun, a future spec may upgrade to a validation-result-on-collision rule, but v1 keeps current behavior.

## Deliverables

### 1. Explicit `ONTOLOGY.md` named-entity registry

Add an explicit machine-readable registry section to `ONTOLOGY.md` for named world entities.

The registry MUST be a fenced YAML block (opening ```` ```yaml ````) immediately following a stable level-2 heading `## Named Entity Registry`. The parser locates the registry by searching for that heading and consuming the first subsequent fenced YAML block; missing or duplicate registries emit a validation result rather than silently selecting one. Free-form prose elsewhere in `ONTOLOGY.md` is unaffected.

Required shape:

```yaml
named_entities:
  - canonical_name: Brinewick
    entity_kind: place
    aliases: []
  - canonical_name: Ash-Seal
    entity_kind: institution
    aliases:
      - Ash-Seal company
```

Contract requirements:

- machine-readable without line-shape heuristics
- human-editable inside the existing mandatory `ONTOLOGY.md`
- one entity per entry with explicit `canonical_name` and `entity_kind`
- optional exact `aliases`
- optional future-safe metadata fields allowed only if additive

`loadOntologyRegistry()` must be rewritten to read this explicit registry and reject or warn on malformed entries. **The old note-bullet scraping is removed in the same ticket** that lands the registry parser; bullets that previously matched the legacy grammar no longer produce canonical entities. They remain available as mention evidence through Stage C's normal scan over `ontology_category` bodies, so retrieval recall is preserved without a parallel canonical authority path.

### 2. Malformed authority-source discipline

Whole-file authority-bearing records (`character_record`, `character_proposal_card`, `diegetic_artifact_record`) must no longer fail silently when their frontmatter is malformed.

Required behavior:

- frontmatter parse failures on authority-bearing whole-file records emit a `validation_results` row reusing SPEC-10's reserved `validator_name='frontmatter_parse'` with the new `code='malformed_authority_source'`
- severity stays `warn` (consistent with SPEC-10's reservation) but the proof surface (Deliverable 4) and `verify` surface assert on the code, so the omission is no longer silent in practice
- the file still indexes as a prose node for evidence purposes
- the missing canonical entity is visible as a validation failure, not silent absence
- `verify` and capstone proof surfaces can report or assert on this state truthfully

Reusing `frontmatter_parse` (rather than a new validator name) matches the existing convention where one validator emits multiple `code` values (e.g., `yaml_parse_integrity` / `yaml_syntax_error`, `semantic_edge_extraction` / `unresolved_attribution_target`). This also lands SPEC-10's reserved name at its intended place. A future broader frontmatter-parse case (non-authority records) may reuse the same `validator_name` with a different `code` without breaking SPEC-11 consumers.

This is intentionally stricter than the current silent skip because the affected file is claiming to be an authority surface.

### 3. Exact alias declarations for whole-file authority records

Add explicit exact alias support on authority-bearing whole-file records.

Required behavior:

- `character_record`, `character_proposal_card`, and `diegetic_artifact_record` may declare `aliases: []` in frontmatter
- these become `entity_aliases.alias_text` rows with `alias_kind='exact_structured'`
- existing `slug` alias behavior for character/proposal records remains as an exact alias source
- explicit `aliases: []` entries are merged with existing structured-field-derived aliases (currently only `slug` on character/proposal records) and **deduplicated by normalized alias text** (`normalizeSurface` then `normalizeLookupKey` per `tools/world-index/src/parse/entities.ts:635-641`); the merged result carries `alias_kind='exact_structured'`
- no title-prefix stripping, title suffix extraction, honorific dropping, or other inferred alternates are added

This preserves SPEC-10's exact-only alias discipline while giving authors an explicit way to declare trusted alternates.

### 4. Canonical-source coverage proof

Add a proof surface that distinguishes:

- intentional evidence-only names
- malformed authority sources
- missing explicit declarations on world-level ontology entities

The proof lane must cover at least:

- a malformed `character_record` frontmatter case that emits a `validator_name='frontmatter_parse'` / `code='malformed_authority_source'` validation result rather than silently disappearing
- an explicit `ONTOLOGY.md` registry entry that becomes canonical after rebuild
- an explicit whole-file alias declaration that resolves as an alias without inventing a second canonical entity

## FOUNDATIONS Alignment

| FOUNDATIONS surface | Alignment | Rationale |
|---|---|---|
| Core Principle | aligns | Canonical entities become more explicitly modeled, not less. |
| Ontology Categories | aligns | World-level named entities attach to explicit kinds in `ONTOLOGY.md` rather than incidental prose bullets. |
| Mandatory World Files | aligns | Uses `ONTOLOGY.md` as the durable world-entity authority surface; no new mandatory file is introduced. |
| Rule 1: No Floating Facts | aligns | Explicit authority declarations in `ONTOLOGY.md` and strict malformed-source validation ensure canonical named entities have a modeled home instead of floating between prose and the canonical surface. |
| Rule 6: No Silent Retcons | aligns | Validation results surface malformed authority sources to the user instead of silently mutating the canonical surface between rebuilds; the SPEC-10-reserved `frontmatter_parse` validator is landed at its reserved name rather than under a new alias. |
| Tooling Recommendation | aligns | Retrieval consumers read structured declarations and exact aliases, not prose accidents. |
| Change Control Policy | aligns | The spec changes retrieval/indexing contracts only; it does not authorize silent canon mutation. |

No tension with FOUNDATIONS was found. The proposal narrows ambiguity without weakening the mystery firewall or canon-layer boundaries.

## Verification

### Structural

1. `tools/world-index/src/parse/entities.ts` reads an explicit `ONTOLOGY.md` named-entity registry format (fenced YAML block under `## Named Entity Registry`) rather than relying on note-bullet line scraping for the canonical surface.
2. Authority-bearing whole-file records with malformed frontmatter emit `validation_results` rows with `validator_name='frontmatter_parse'` and `code='malformed_authority_source'` rather than being silently skipped.
3. Exact alias declarations from structured whole-file records populate `entity_aliases` without creating duplicate canonical rows; `aliases: []` and `slug`-derived aliases dedupe by normalized text.

### Functional

4. A fixture `character_record` with malformed frontmatter produces zero canonical entity rows and one `frontmatter_parse` / `malformed_authority_source` validation result naming the malformed authority source.
5. A fixture `ONTOLOGY.md` named-entity registry containing `Brinewick` produces a canonical `named_entity` row for `Brinewick` with the declared kind.
6. A fixture whole-file record with `aliases: ['Althea Greystone']` produces one canonical entity and one exact alias, not two canonical entities.
7. Heuristic-only names without explicit authority declarations remain unresolved evidence only (preserved from SPEC-10).
8. Legacy `ONTOLOGY.md` bullet entries that previously matched the old `loadOntologyRegistry()` grammar no longer produce canonical entities; they may still surface in `entity_mentions` as unresolved evidence via Stage C scanning.
9. A registry entry whose `canonical_name` exactly matches a whole-file record's `name` produces two distinct canonical entities with different `provenance_scope` (collision-fallback via sha256 suffix), not a silent merge.

### Live-corpus proof

10. Rebuilt `animalia` clearly distinguishes malformed authority-source omissions from intended evidence-only names.
11. If `animalia` keeps the malformed Melissa frontmatter, the proof surface reports that omission as a `frontmatter_parse` / `malformed_authority_source` validation failure instead of silently treating `Melissa Threadscar` as mere unresolved evidence.
12. If `animalia` later gains explicit `ONTOLOGY.md` registry declarations for names such as `Brinewick`, those names become canonical only by that declaration path, not by unrelated prose scanning.

## Out of Scope

- Reintroducing heuristic canonical promotion from prose
- Promoting arbitrary descriptive fields like `current_location`, `place`, `audience`, or other descriptive string fields into canonical entities
- Automatic capture of every named place, polity, institution, or route mentioned anywhere in the corpus
- Promoting arbitrary ontology table rows into canonical entities
- Promoting named phrases in narrative body prose into canonical entities
- Inferring implicit alternates from titles or descriptors (honorific stripping, descriptor stripping, fuzzy alias generation)
- A new mandatory world file outside `ONTOLOGY.md`
- Upgrading registry-vs-whole-file `canonical_name` collisions to a validation result (deferred until live worlds show this as a recurring foot-gun)
- Transitional dual-authority parsing for `ONTOLOGY.md` bullets (legacy bullet promotion is dropped in the same ticket; bullets remain only as Stage C mention evidence)

### Follow-ups

- Correcting live `animalia` authority-source content (e.g., `worlds/animalia/characters/melissa-threadscar.md` frontmatter) is tracked separately; SPEC-11 lands the detection surface, not the world-content fix.
- Updating `archive/specs/SPEC-10-entity-surface-redesign.md`'s Outcome section to reflect that its `frontmatter_parse` reservation actually shipped via SPEC-11 (rather than via SPEC-10 itself) is a separate documentation follow-up the user may pursue if desired.

## Risks & Open Questions

### Risks

1. **Registry migration churn.** Moving world-level named entities onto an explicit `ONTOLOGY.md` registry may expose many currently implicit names. Mitigation: keep the contract additive and let worlds declare only what they want canonical. Bullets that previously matched the legacy grammar stop producing canonical entities on first rebuild; their text remains visible via Stage C mention evidence, so retrieval recall does not collapse.
2. **Validation strictness on local worlds.** Surfacing malformed authority-source frontmatter will reveal existing local-corpus defects such as Melissa's file. Mitigation: treat the malformed record as a validation result, not as a silent parse recovery.
3. **Alias overgrowth.** Adding `aliases: []` could become a dumping ground for fuzzy alternates. Mitigation: keep alias rules exact-only and reject heuristic transforms.
4. **Same-name registry / whole-file collisions in live worlds.** With v1's both-survive rule, callers that don't filter by `provenance_scope` may double-count. Mitigation: SPEC-02 consumers (`find_named_entities`, `search_nodes.entity_name`) already expose `provenance_scope` per SPEC-10 §Deliverable 6; flag any sibling skill that ignores it.

### Open Questions

1. Should the explicit `ONTOLOGY.md` registry support a future `source_note` or `scope_note` field, or should v1 stay at `canonical_name`, `entity_kind`, and `aliases` only?
2. Should malformed authority-source validation remain a warning, or should `verify` hard-fail when authority-bearing whole-file records are malformed?
3. Should proposal-local `character_proposal_card.title` ever support an explicit split between display title and canonical name alias, or should that remain the responsibility of `aliases: []` only?

## Outcome

Completion date: 2026-04-23

- SPEC-11 landed through `archive/tickets/SPEC11CANENT-001.md`, `archive/tickets/SPEC11CANENT-002.md`, `archive/tickets/SPEC11CANENT-003.md`, and `archive/tickets/SPEC11CANENT-004.md`.
- `tools/world-index/src/parse/entities.ts` now reads canonical world entities only from a fenced-YAML `## Named Entity Registry` block in `ONTOLOGY.md`, emits `frontmatter_parse` / `malformed_authority_source` warnings for malformed authority-bearing whole-file records, accepts exact whole-file `aliases: []` declarations, and keeps same-name registry/whole-file entities distinct.
- `tools/world-index` proof surfaces now cover the delivered authority contract across unit, integration, spec10 verification, and fixture-command lanes, including the registry-first `Brinewick` fixture authority path in `tools/world-index/tests/fixtures/fixture-world/ONTOLOGY.md`.
- Deviations from original plan: the spec landed as four bounded tickets rather than one pass; the command-proof portion narrowed to fixture authority alignment because `tools/world-index/tests/commands.test.ts` already matched the live canonical entity id contract once the fixture source was made explicit.
- Verification results:
  - `cd tools/world-index && npm run build`
  - `cd tools/world-index && node --test dist/tests/entities.test.js`
  - `cd tools/world-index && node dist/tests/integration/build-animalia.test.js`
  - `cd tools/world-index && npm run test:spec10-verification`
  - `cd tools/world-index && node --test dist/tests/commands.test.js`
  - `cd tools/world-index && npm test`
