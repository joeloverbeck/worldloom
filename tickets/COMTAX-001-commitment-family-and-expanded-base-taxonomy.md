# COMTAX-001: Add commitment-family and expanded base commitment taxonomy

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/world-index/src/public/canonical-vocabularies.ts`, `tools/world-mcp/src/tools/get-canonical-vocabulary.ts`, package tests, and machine-facing docs with a new `commitment_family` vocabulary and an expanded `commitment_class` base taxonomy.
**Deps**: `reports/commitment-class-taxonomy.md` (research recommendation), `reports/commitment-class-taxonomy-research-brief.md` (problem framing), `archive/tickets/SPEC22SCECOM-006.md` (current canonical-vocabulary surface)

## Problem

The current `COMMITMENT_CLASSES` vocabulary has 20 values. That set is coherent for the original scene-commitment arc pilot, but it is too narrow for broad fiction. It collapses important scene-strategy commitments such as investigation, trade, deception, pursuit, command, ritual, craft, survival, sacrifice, and legal/moral action into nearby but lossy classes.

The research report at `reports/commitment-class-taxonomy.md` rejects both extremes:

1. A fully comprehensive closed enum is impossible without becoming absurdly large.
2. A fully open `commitment_class` is unsafe because CHC-to-SLT matching, write-in classification, continuation capacity, and coverage reporting need stable routing values.

The correct substrate is hybrid:

```yaml
commitment_family: secrecy_deception
commitment_class: perform_false_identity
commitment_detail: impersonate_the_archbishop_to_enter_the_court
```

This ticket owns only the taxonomy substrate: define closed `commitment_family` values, expand closed `commitment_class` values to the proposed practical base taxonomy, and expose mapping metadata. It does not change story record schemas or skills; those are follow-up tickets.

## Assumption Reassessment (2026-05-12)

1. Current codebase state: `tools/world-index/src/public/canonical-vocabularies.ts` defines `COMMITMENT_CLASSES` as a 20-value `as const` array and exports `CommitmentClass`; it has no `COMMITMENT_FAMILIES` export and no `commitment_class -> family` mapping.
2. Current tool surface: `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` exposes `commitment_class` via `COMMITMENT_CLASSES`, and tests currently assert a length of 20 in `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` and `tools/world-mcp/tests/integration/spec22-capstone.test.ts`.
3. Shared boundary under audit: `@worldloom/world-index/public/canonical-vocabularies` is consumed by validators, MCP tooling, and skill-facing vocabulary lookup. This ticket changes the canonical vocabulary contract but not record shapes.
4. FOUNDATIONS Rule 1 alignment: the new taxonomy prevents floating or ad hoc commitment labels by giving broad-fiction commitments a documented semantic anchor before record/schema consumers adopt them.
5. Schema extension scope: no story-bundle record schema changes in this ticket. `red-bunny` records must remain valid because this ticket only changes vocabulary exports and retrieval metadata.
6. Current research input: `reports/commitment-class-taxonomy.md` recommends 16 families and 80 base classes. The report’s field naming is adjusted here: keep `commitment_class` as the closed base routing key, and introduce `commitment_detail` later as the optional open story-specific label.
7. Mismatch + correction: the report proposes `base_commitment_class` plus open `commitment_class`; that would rename the current join key and create unnecessary migration ambiguity. This ticket keeps `commitment_class` as the closed join key and defers `commitment_detail` to COMTAX-002.

## Architecture Check

1. A closed `commitment_family` plus expanded closed `commitment_class` is cleaner than making `commitment_class` orientative because it preserves deterministic routing while increasing expressive coverage.
2. Keeping `commitment_class` as the base-class field avoids aliasing the existing join key. Do not add `base_commitment_class` as a parallel synonym.
3. `commitment_detail` is intentionally out of scope here so the vocabulary package can be landed and verified independently before record schemas and skills consume it.

## Verification Layers

1. `COMMITMENT_FAMILIES` exists with the 16 report families -> package unit test.
2. `COMMITMENT_CLASSES` expands to the approved base taxonomy and preserves all 20 existing values verbatim -> package unit test and public self-import test.
3. Every `COMMITMENT_CLASSES` value maps to exactly one `COMMITMENT_FAMILIES` value -> package unit test.
4. `get_canonical_vocabulary({class: "commitment_family"})` returns the 16 families and `get_canonical_vocabulary({class: "commitment_class"})` returns the expanded base classes -> MCP unit test.
5. Machine-facing docs state that `commitment_class` is an expanded closed base taxonomy, while later `commitment_detail` is the open story-specific layer -> grep/manual review.

## What to Change

### 1. Expand canonical vocabularies

In `tools/world-index/src/public/canonical-vocabularies.ts`:

- Add `COMMITMENT_FAMILIES`.
- Expand `COMMITMENT_CLASSES` from 20 to the approved base taxonomy from `reports/commitment-class-taxonomy.md`.
- Add `COMMITMENT_CLASS_TO_FAMILY` as a total mapping from every class to one family.
- Add helper/type exports such as `CommitmentFamily`, `CommitmentClassToFamily`, and `commitmentFamilyForClass(value)`.

Add `heal_or_tend` under `care_help_protection`; the research report mentions it as a possible story-local subclass, but healing/tending is common enough across genres to be a base class.

### 2. Expose the new vocabulary

In `tools/world-mcp/src/tools/get-canonical-vocabulary.ts`:

- Add `commitment_family` to `VOCABULARY_CLASSES`.
- Return `COMMITMENT_FAMILIES` for `class: "commitment_family"`.
- Keep `class: "commitment_class"` returning base class values.

### 3. Update tests and docs

Update:

- `tools/world-index/tests/public-types.test.ts`
- `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts`
- `tools/world-mcp/tests/integration/spec22-capstone.test.ts`
- `docs/MACHINE-FACING-LAYER.md`
- `tools/world-index/README.md`
- `tools/world-mcp/README.md`

## Files to Touch

- `tools/world-index/src/public/canonical-vocabularies.ts` (modify)
- `tools/world-index/tests/public-types.test.ts` (modify)
- `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` (modify)
- `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` (modify)
- `tools/world-mcp/tests/integration/spec22-capstone.test.ts` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)
- `tools/world-index/README.md` (modify)
- `tools/world-mcp/README.md` (modify)

## Out of Scope

- Adding `commitment_family` or `commitment_detail` to CHC/SLT/RSP records.
- Updating storylet-pool, page-cycle, bootstrap, or health-audit skill prose.
- Modifying `worlds/erotica-world/stories/red-bunny/*`.
- Enforcing enum membership in record schemas.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/public-types.test.js`
3. `cd tools/world-mcp && npm run build`
4. `cd tools/world-mcp && node --test dist/tests/tools/get-canonical-vocabulary.test.js dist/tests/integration/spec22-capstone.test.js`

### Invariants

1. All existing 20 `COMMITMENT_CLASSES` remain present and unchanged.
2. Every base commitment class maps to exactly one commitment family.
3. `commitment_class` remains the closed base routing key; no `base_commitment_class` synonym is introduced.
4. This ticket does not invalidate existing `red-bunny` records.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/public-types.test.ts` — cover `COMMITMENT_FAMILIES`, expanded `COMMITMENT_CLASSES`, mapping totality, and helper export.
2. `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` — cover `commitment_family` retrieval and updated `commitment_class` count.
3. `tools/world-mcp/tests/integration/spec22-capstone.test.ts` — update expected live vocabulary counts.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && npm test`
3. `cd tools/world-mcp && npm run build`
4. `cd tools/world-mcp && npm test`
