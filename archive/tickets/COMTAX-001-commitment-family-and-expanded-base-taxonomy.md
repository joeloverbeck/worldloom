# COMTAX-001: Add commitment-family and expanded base commitment taxonomy

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/world-index/src/public/canonical-vocabularies.ts`, `tools/world-mcp/src/tools/get-canonical-vocabulary.ts`, package tests, and machine-facing docs with a new `commitment_family` vocabulary and an expanded `commitment_class` base taxonomy.
**Deps**: `reports/commitment-class-taxonomy.md` (research recommendation), `reports/commitment-class-taxonomy-research-brief.md` (problem framing), `archive/tickets/SPEC22SCECOM-006.md` (current canonical-vocabulary surface)

## Problem

At intake, the `COMMITMENT_CLASSES` vocabulary had 20 values. That set was coherent for the original scene-commitment arc pilot, but it was too narrow for broad fiction. It collapsed important scene-strategy commitments such as investigation, trade, deception, pursuit, command, ritual, craft, survival, sacrifice, and legal/moral action into nearby but lossy classes.

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

1. Intake codebase state: `tools/world-index/src/public/canonical-vocabularies.ts` defined `COMMITMENT_CLASSES` as a 20-value `as const` array and exported `CommitmentClass`; it had no `COMMITMENT_FAMILIES` export and no `commitment_class -> family` mapping. This ticket added those producer exports.
2. Intake tool surface: `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` exposed `commitment_class` via `COMMITMENT_CLASSES`, and tests asserted a length of 20 in `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` and `tools/world-mcp/tests/integration/spec22-capstone.test.ts`. This ticket updated the handler and focused tests to include `commitment_family` and the expanded `commitment_class` count.
3. Shared boundary under audit: `@worldloom/world-index/public/canonical-vocabularies` is consumed by validators, MCP tooling, and skill-facing vocabulary lookup. This ticket changes the canonical vocabulary contract but not record shapes.
4. FOUNDATIONS Rule 1 alignment: the new taxonomy prevents floating or ad hoc commitment labels by giving broad-fiction commitments a documented semantic anchor before record/schema consumers adopt them.
5. Schema extension scope: no story-bundle record schema changes in this ticket. `red-bunny` records must remain valid because this ticket only changes vocabulary exports and retrieval metadata.
6. Research input: `reports/commitment-class-taxonomy.md` recommends 16 families and 80 base classes. The report’s field naming is adjusted here: keep `commitment_class` as the closed base routing key, and introduce `commitment_detail` later as the optional open story-specific label. The landed base taxonomy has 81 classes because this ticket intentionally adds `heal_or_tend` under `care_help_protection`.
7. Mismatch + correction: the report proposes `base_commitment_class` plus open `commitment_class`; that would rename the current join key and create unnecessary migration ambiguity. This ticket keeps `commitment_class` as the closed join key and defers `commitment_detail` to COMTAX-002.
8. Package dependency check: `tools/world-mcp/node_modules/@worldloom/world-index` is a symlink to `../../../world-index`, so producer build plus consumer build exercises the fresh public vocabulary surface without reinstall.

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

## Landed Changes

### 1. Expand canonical vocabularies

In `tools/world-index/src/public/canonical-vocabularies.ts`:

- Added `COMMITMENT_FAMILIES`.
- Expanded `COMMITMENT_CLASSES` from 20 to the approved base taxonomy from `reports/commitment-class-taxonomy.md`, plus `heal_or_tend`.
- Added `COMMITMENT_CLASS_TO_FAMILY` as a total mapping from every class to one family.
- Added `CommitmentFamily`, `CommitmentClassToFamily`, and `commitmentFamilyForClass(value)` exports.

`heal_or_tend` landed under `care_help_protection`; the research report mentions it as a possible story-local subclass, but healing/tending is common enough across genres to be a base class.

### 2. Expose the new vocabulary

In `tools/world-mcp/src/tools/get-canonical-vocabulary.ts`:

- Added `commitment_family` to `VOCABULARY_CLASSES`.
- Returned `COMMITMENT_FAMILIES` for `class: "commitment_family"`.
- Kept `class: "commitment_class"` returning base class values and added `coupling` plus `per_value_family` metadata for the class-to-family mapping.

### 3. Update tests and docs

Updated:

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
4. `cd tools/world-mcp && node --test --test-name-pattern "canonical vocabulary|scene-commitment taxonomy|unsupported vocabulary" dist/tests/tools/get-canonical-vocabulary.test.js dist/tests/integration/spec22-capstone.test.js`
5. `cd tools/world-mcp && node --test --test-name-pattern "get_canonical_vocabulary|describe_capabilities" dist/tests/server/dispatch.test.js`

### Invariants

1. All existing 20 `COMMITMENT_CLASSES` remain present and unchanged.
2. Every base commitment class maps to exactly one commitment family.
3. `commitment_class` remains the closed base routing key; no `base_commitment_class` synonym is introduced.
4. This ticket does not invalidate existing `red-bunny` records.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/public-types.test.ts` — cover `COMMITMENT_FAMILIES`, expanded `COMMITMENT_CLASSES`, mapping totality, and helper export.
2. `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` — cover `commitment_family` retrieval, updated `commitment_class` count, and class-to-family mapping metadata.
3. `tools/world-mcp/tests/integration/spec22-capstone.test.ts` — update expected live vocabulary counts.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && npm test`
3. `cd tools/world-mcp && npm run build`
4. `cd tools/world-mcp && node --test --test-name-pattern "canonical vocabulary|scene-commitment taxonomy|unsupported vocabulary" dist/tests/tools/get-canonical-vocabulary.test.js dist/tests/integration/spec22-capstone.test.js`
5. `cd tools/world-mcp && node --test --test-name-pattern "get_canonical_vocabulary|describe_capabilities" dist/tests/server/dispatch.test.js`
6. `cd tools/world-mcp && npm test` (broad diagnostic lane; see Deviations)

## Outcome

Completed on 2026-05-12.

The machine-facing commitment taxonomy now has a closed 16-value `commitment_family` routing layer, an expanded 81-value closed `commitment_class` base taxonomy, and a total `COMMITMENT_CLASS_TO_FAMILY` mapping. `get_canonical_vocabulary` exposes `commitment_family`, returns the expanded `commitment_class` list, and includes class-to-family mapping metadata for downstream callers. Package and machine-facing docs now describe `commitment_class` as the closed base routing key and `commitment_detail` as the future open story-specific layer.

## Verification Result

Passed:

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/public-types.test.js`
3. `cd tools/world-index && npm test`
4. `cd tools/world-mcp && npm run build`
5. `cd tools/world-mcp && node --test --test-name-pattern "canonical vocabulary|scene-commitment taxonomy|unsupported vocabulary" dist/tests/tools/get-canonical-vocabulary.test.js dist/tests/integration/spec22-capstone.test.js`
6. `cd tools/world-mcp && node --test --test-name-pattern "get_canonical_vocabulary|describe_capabilities" dist/tests/server/dispatch.test.js`

Broad lane:

1. `cd tools/world-mcp && npm test` rebuilt successfully, then failed one unrelated capstone migration assertion also visible in the direct unfiltered capstone run: `SPEC-22 migration and Hook 3 coverage are visible in live repo contracts` expects `worlds/erotica-world/stories/red-bunny` to be absent, but this checkout has that local/gitignored story path present. The taxonomy-owned handler, focused capstone vocabulary-count subtest, and MCP capability metadata proof passed.

## Deviations

1. The research report recommends 80 base classes, but the active ticket explicitly adds `heal_or_tend`; the landed `commitment_class` count is therefore 81.
2. The unfiltered combined command `cd tools/world-mcp && node --test dist/tests/tools/get-canonical-vocabulary.test.js dist/tests/integration/spec22-capstone.test.js` fails on the unrelated local `red-bunny` migration assertion. The accepted proof was narrowed to the vocabulary-owned subtests plus MCP capability metadata.
