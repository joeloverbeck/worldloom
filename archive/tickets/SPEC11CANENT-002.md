# SPEC11CANENT-002: Replace ad hoc `ONTOLOGY.md` bullet scraping with an explicit named-entity registry

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index` gains a machine-readable `ONTOLOGY.md` named-entity authority contract for world-level canonical entities.
**Deps**: `specs/SPEC-11-canonical-entity-authority-surfaces.md`, `archive/specs/SPEC-10-entity-surface-redesign.md`, `docs/FOUNDATIONS.md`

## Problem

World-level canonical entities currently depend on `loadOntologyRegistry()` scraping bullet lines that happen to match a narrow grammar. That is not a durable machine contract for the modeled world. In live `animalia`, clearly modeled names such as `Brinewick`, `Canal Heartland`, `Ash-Seal`, and `Harrowgate` do not become canonical unless they are restated in the current note-bullet shape.

## Assumption Reassessment (2026-04-23)

1. `tools/world-index/src/parse/entities.ts` originally read `ONTOLOGY.md` line-by-line and only accepted `- Name (kind)` or `- Name attaches to **kind**` bullet shapes; the landed change replaces that with a fenced-YAML registry under `## Named Entity Registry`.
2. `worlds/animalia/ONTOLOGY.md` expresses many named world entities in the main ontology table and descriptive notes, but those shapes are not machine-readable by the current registry parser.
3. Shared boundary under audit: the world-level named-entity authority contract inside `ONTOLOGY.md`, plus the parser that converts that contract into canonical `entities` / `named_entity` rows.
4. `docs/FOUNDATIONS.md` `Mandatory World Files` and `Ontology Categories` make `ONTOLOGY.md` the truthful home for explicit world-entity declarations. Adding a new mandatory file would be broader than necessary.
5. This ticket should preserve SPEC-10's precision-first posture: explicit declarations expand canonical authority; incidental prose still does not.
6. **Registry-first commitment (Q2(c) from spec reassessment)**: no parallel-run transition. Legacy bullet parsing is removed in the same ticket that lands the registry. Bullets remain available as Stage C mention evidence via the existing `MENTION_EVIDENCE_SOURCE_NODE_TYPES` scan over `ontology_category` bodies; no canonical promotion path remains for bullets.
7. **Registry format lock**: fenced YAML block under a stable `## Named Entity Registry` level-2 heading. No alternative embedding (HTML-commented inline, sibling file, or other) is considered in this ticket.
8. **Mismatch + correction**: SPEC-11's broader family also covered malformed authority-source warnings and exact structured aliases, but the live repo already ships those paths in `tools/world-index/src/parse/entities.ts` (`parseAuthorityFrontmatter()`, `validator_name='frontmatter_parse'`, `code='malformed_authority_source'`, `stageBGenerateAliases()`). This ticket is therefore narrowed to the remaining delta: explicit `ONTOLOGY.md` registry parsing plus truthful proof updates for that contract.
9. **Verification-time fallout absorbed in-ticket**: the draft assumed same-name registry/whole-file collisions already disambiguated via `canonicalEntitySlug()`. Live code only disambiguated when different names collapsed to the same base slug; exact same-name collisions reused the same slug. Because collision allocation lives in the same canonical-entity seam, this ticket absorbed the required fix so registry and whole-file authorities with the same `canonical_name` now persist as distinct entities.

## Architecture Check

1. An explicit structured registry inside `ONTOLOGY.md` is cleaner than continuing to infer canonical entities from note bullets because it separates ontology declaration from ontology explanation.
2. No backwards-compatibility aliasing/shims introduced. Any bounded migration support should be transitional, not the new authority contract.

## Verification Layers

1. `ONTOLOGY.md` has a stable machine-readable named-entity contract. -> schema/fixture validation in unit tests.
2. Explicit world-entity declarations become canonical `named_entity` rows with the declared kind. -> entity-extractor tests and direct DB probe.
3. Incidental ontology prose remains non-authoritative unless explicitly declared. -> negative tests against descriptive notes/table text.
4. FOUNDATIONS alignment remains within the existing mandatory-file model. -> manual review against `docs/FOUNDATIONS.md`.

## What to Change

### 1. Define the explicit registry shape

Add a stable `ONTOLOGY.md` named-entity registry format:

- **Location**: fenced YAML block (opening ```` ```yaml ````) immediately following a stable level-2 heading `## Named Entity Registry`. The parser locates the registry by searching for that heading and consuming the first subsequent fenced YAML block.
- **Fields per entry**: `canonical_name` (required), `entity_kind` (required), `aliases` (optional, exact only).
- **Forward compatibility**: additional fields in entries are allowed only if additive; parser must not reject unknown fields.
- **Missing / duplicate registry handling**: if the heading is absent, no canonical entities are produced from `ONTOLOGY.md` (no validation failure — a world may legitimately have no registry yet). If the heading is present but no fenced YAML block follows, or two registries appear, emit a `validation_results` row naming the failure rather than silently selecting one.

Free-form prose elsewhere in `ONTOLOGY.md` is untouched by the parser.

### 2. Rewrite `loadOntologyRegistry()` and remove legacy bullet parsing

Rewrite `loadOntologyRegistry()` to read only the explicit registry defined above. **Remove the legacy bullet-line parsing (`parseRegistryLine`, `attachesMatch`) in the same ticket** — no transitional dual-authority window.

Bullets that previously matched the old grammar stop producing canonical entities on first rebuild after this ticket lands. Their text remains visible to retrieval through the existing Stage C mention scan over `ontology_category` body content (`tools/world-index/src/parse/entities.ts:272+`), so unresolved-evidence recall is preserved even when worlds haven't yet migrated their bullets into the registry.

### 3. Update live-proof surfaces

Add proof that:

- an explicitly declared world entity such as `Brinewick` becomes canonical only by the new registry path
- a legacy `ONTOLOGY.md` bullet (e.g., the existing `Ash-Seal` bullet in `worlds/animalia/ONTOLOGY.md`) no longer produces a canonical entity; it may still surface in `entity_mentions` as unresolved evidence
- a registry entry whose `canonical_name` exactly matches a whole-file record's `name` produces two distinct canonical entities with different `provenance_scope` via `canonicalEntitySlug`'s existing sha256-suffix collision-fallback — not a silent merge

## Files to Touch

- `tickets/SPEC11CANENT-002.md` (modify)
- `tools/world-index/src/parse/entities.ts` (modify)
- `tools/world-index/tests/entities.test.ts` (modify)
- `tools/world-index/tests/integration/build-animalia.test.ts` (modify)
- `tools/world-index/tests/integration/spec10-verification.sh` (modify)

## Out of Scope

- Automatic promotion from ontology tables or narrative prose
- New mandatory world files outside `ONTOLOGY.md`
- Whole-file alias expansion for character/proposal/artifact records

## Acceptance Criteria

### Tests That Must Pass

1. A fixture `ONTOLOGY.md` explicit registry entry for `Brinewick` produces a canonical world entity with the declared kind.
2. A descriptive ontology note mentioning `Brinewick` without explicit registry declaration does not by itself create a canonical entity.
3. A fixture `ONTOLOGY.md` containing a legacy bullet that previously matched `- Name (kind)` or `- Name attaches to **kind**` no longer produces a canonical entity; the bullet text remains scannable as Stage C mention evidence.
4. A fixture with a registry entry `canonical_name: X` and a separate whole-file record `name: X` produces two distinct canonical entity rows (different `entity_id`, different `provenance_scope`), not one merged row.
5. A fixture `ONTOLOGY.md` with the `## Named Entity Registry` heading but no fenced YAML block produces a validation result rather than silent success.
6. `cd tools/world-index && npm run build`
7. `cd tools/world-index && node --test dist/tests/entities.test.js`
8. `cd tools/world-index && node --test dist/tests/integration/build-animalia.test.js`

### Invariants

1. World-level canonical entities come from explicit ontology declarations, not prose accidents.
2. The authority contract stays human-editable inside `ONTOLOGY.md`.
3. Precision-first behavior from SPEC-10 is preserved.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/entities.test.ts` — explicit ontology registry parsing and negative descriptive-prose cases.
2. `tools/world-index/tests/integration/build-animalia.test.ts` — temp-copy/live-corpus declaration-path assertions for the new registry contract.
3. `tools/world-index/tests/integration/spec10-verification.sh` — existing proof script updated so bullet-derived canonicals are now banned and the known malformed authority-source warning remains the only accepted validation row.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/entities.test.js`
3. `cd tools/world-index && node --test dist/tests/integration/build-animalia.test.js`
4. `cd tools/world-index && npm run test:spec10-verification`

## Outcome

- Completed: 2026-04-23
- `loadOntologyRegistry()` now reads only a fenced YAML `named_entities` block under `## Named Entity Registry`, carries registry-shape issues forward as `ontology_registry` validation results, and ignores legacy bullet prose entirely.
- Registry entries can declare exact `aliases`, which now flow through the existing structured-alias path for world-scoped entities.
- Same-name collisions between registry-backed and whole-file-backed canonical entities now disambiguate to distinct `entity_id` values instead of silently merging.
- Unit, integration, and spec10 verification proofs now reflect the registry-first contract: legacy ontology bullets are non-canonical, temp-copy registry declarations become canonical, and the existing malformed authority-source warning remains the only accepted validation row in live `animalia`.

## Verification Result

- Passed `cd tools/world-index && npm run build`
- Passed `cd tools/world-index && node --test dist/tests/entities.test.js`
- Passed `cd tools/world-index && node --test dist/tests/integration/build-animalia.test.js`
- Passed `cd tools/world-index && npm run test:spec10-verification`

## Deviations

- The draft treated same-name registry/whole-file collisions as already handled by the existing slug fallback. Reassessment and proof showed that exact same-name collisions still merged, so the ticket absorbed that canonical-slug allocation fix as required same-seam fallout.
