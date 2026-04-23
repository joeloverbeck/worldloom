# SPEC11CANENT-003: Add explicit exact alias declarations for authority-bearing whole-file records

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index` whole-file authority adapters gain explicit exact alias declarations while preserving SPEC-10's no-heuristic-alias rule.
**Deps**: `specs/SPEC-11-canonical-entity-authority-surfaces.md`, `archive/specs/SPEC-10-entity-surface-redesign.md`, `docs/FOUNDATIONS.md`

## Problem

The current alias model is too thin for deliberate exact alternates. Character and proposal records only emit `slug` aliases, and diegetic artifacts emit none. That leaves no structured way to declare exact human-readable alternates such as `Althea Greystone` for the canonical `Canon Althea Greystone` without falling back to heuristic stripping, which SPEC-10 correctly forbids.

## Assumption Reassessment (2026-04-23)

1. `tools/world-index/src/parse/entities.ts` still derives `aliasTexts` only from `slug` on `character_record` and `character_proposal_card`; `diegetic_artifact_record` emits no structured aliases, and explicit whole-file `aliases: []` declarations are not yet consumed.
2. `specs/SPEC-11-canonical-entity-authority-surfaces.md` Deliverable 3 requires whole-file `aliases: []` support for `character_record`, `character_proposal_card`, and `diegetic_artifact_record`, merged with existing structured alias sources and kept exact-only.
3. Shared boundary under audit: exact alias declarations on whole-file authority-bearing records, plus downstream `entity_aliases` and `mentions_entity` behavior in `tools/world-index/src/parse/entities.ts`.
4. `docs/FOUNDATIONS.md` `Core Principle` and `Tooling Recommendation` support explicit structured declarations; they do not support heuristic title stripping or inferred alternates.
5. Reassessment found broader SPEC-11 work already in flight in the same seam: registry parsing, malformed authority-source validation, and related integration proof updates are already present in the worktree (`tools/world-index/src/parse/entities.ts`, `tools/world-index/tests/integration/build-animalia.test.ts`, `tools/world-index/tests/integration/spec10-verification.sh`). This ticket is narrowed to the remaining whole-file alias declaration delta and its proof.
6. This ticket must stay exact-only. If a world wants an alternate, it must declare it.

## Architecture Check

1. Explicit `aliases: []` is cleaner than inferred honorific/title stripping because it keeps ambiguity in author control and preserves SPEC-10's precision line.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Declared exact alternates on whole-file authority records become `entity_aliases` rows. -> unit test coverage.
2. Declared aliases resolve exact mentions to the canonical entity without creating a second canonical row. -> entity-extractor tests.
3. Undeclared alternates remain unresolved evidence only. -> negative test coverage.
4. FOUNDATIONS alignment remains explicit and structured. -> manual review.

## What to Change

### 1. Add explicit alias declarations

Support `aliases: []` on `character_record`, `character_proposal_card`, and `diegetic_artifact_record` frontmatter as an exact alias source.

### 2. Update alias extraction

Merge explicit `aliases: []` entries with existing structured-field-derived aliases (currently only `slug` on character/proposal records) and deduplicate by normalized alias text before Stage B emits `entity_aliases` rows. The merged result carries `alias_kind='exact_structured'`.

Dedup cases to handle:

- `aliases: [althea-greystone]` on a record whose `slug` is `althea-greystone` → one alias row, not two
- `aliases: [Althea Greystone]` (different casing from `slug`) → one alias row (normalization collapses the duplicate)
- `aliases: [Canon Althea Greystone]` (matches `canonical_name`) → skipped per existing Stage B logic (line 248 `normalizedAlias === normalizedCanonical` check)

### 3. Add proof coverage

Add tests showing:

- declared alias resolves exactly
- undeclared alternate stays unresolved
- no duplicate canonical entity is created
- explicit alias entries that normalize to `slug` dedupe to one alias row
- explicit alias entries that normalize to `canonical_name` are skipped

## Files to Touch

- `tools/world-index/src/parse/entities.ts` (modify)
- `tools/world-index/tests/entities.test.ts` (modify)

## Out of Scope

- Heuristic alias inference
- Honorific dropping, title stripping, or fuzzy matching
- Expanding world-level ontology authority declarations

## Acceptance Criteria

### Tests That Must Pass

1. A fixture whole-file record with `aliases: ['Althea Greystone']` produces one canonical entity and one exact alias.
2. Exact mentions of that alias resolve to the canonical entity and emit `mentions_entity` edges.
3. The same alternate without `aliases: []` remains unresolved evidence only.
4. A fixture whose `aliases: []` contains an entry identical after normalization to the record's `slug` produces exactly one `exact_structured` alias row, not two.
5. A fixture whose `aliases: []` contains an entry identical after normalization to `canonical_name` produces zero additional alias rows.
6. `cd tools/world-index && npm run build`
7. `cd tools/world-index && node --test dist/tests/entities.test.js`

### Invariants

1. Exact alias declarations stay author-controlled.
2. No heuristic alias expansion is introduced.
3. Canonical entity count does not inflate when aliases are added.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/entities.test.ts` — declared exact alias coverage, dedupe behavior, and negative undeclared-alternate coverage.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/entities.test.js`
3. `cd tools/world-index && npm test` — broader package lane checked during closeout; currently noisy in `tests/commands.test.ts` because the fixture still expects `entity:brinewick` after the in-flight SPEC-11 registry shift.

## Outcome

- Completed: 2026-04-23
- `tools/world-index/src/parse/entities.ts` now accepts exact `aliases: []` declarations on `character_record`, `character_proposal_card`, and `diegetic_artifact_record` frontmatter.
- Whole-file declared aliases are merged with existing structured alias sources such as `slug`, deduplicated by normalized lookup text, and still flow through Stage B as `alias_kind='exact_structured'`.
- New unit coverage proves exact alias resolution, dedupe against `slug`, suppression of canonical-name duplicates, and diegetic-artifact alias support.

## Verification Result

- Passed `cd tools/world-index && npm run build`
- Passed `cd tools/world-index && node --test dist/tests/entities.test.js`
- Failed `cd tools/world-index && npm test` in `tests/commands.test.ts` at the fixture expectation for `entity:brinewick`; this is broader SPEC-11 registry fallout already present in the worktree, not a failure of the whole-file alias path implemented here.

## Deviations

- Reassessment narrowed this ticket to the remaining whole-file alias-declaration delta because broader SPEC-11 registry and malformed-authority work was already in progress in the same files.
- Full-package `npm test` is not currently a truthful acceptance gate for this ticket until the fixture-world command test is updated to the registry-first canonical-entity contract.
