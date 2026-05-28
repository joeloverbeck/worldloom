# STSELECT-002: Move predicate DSL projection contract out of cyclic package dependency

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes - `tools/validators`, `tools/world-index`, package dependency/export wiring, and focused package tests.
**Deps**: `archive/tickets/STSELECT-001.md`

## Problem

At intake, `archive/tickets/STSELECT-001.md` had fixed `storylet_predicate_class` projection by making `tools/world-index` import the closed predicate DSL mapping from `@worldloom/validators/predicate-dsl-grammar`. That made the producer/consumer contract truthful, but it introduced a package-level cycle: `tools/world-index/package.json` depended on `@worldloom/validators`, while `tools/validators/package.json` already depended on `@worldloom/world-index`.

The subpath import was narrow enough to build, but the package graph had a circular ownership boundary. Future install/build changes could accidentally pull the validator root export into the indexer again or make the cycle observable in package managers, CI, or editor tooling.

## Assumption Reassessment (2026-05-27)

1. Before this ticket, `tools/world-index/package.json` declared `"@worldloom/validators": "file:../validators"` so `tools/world-index/src/parse/atomic.ts` could import `PREDICATE_REFERENCED_CLASSES` and `predicateRecordClassForRecordId` from `@worldloom/validators/predicate-dsl-grammar`.
2. `tools/validators/package.json` already declares `"@worldloom/world-index": "file:../world-index"` for validator surfaces that consume world-index helpers. This meant the STSELECT-001 implementation left a package dependency cycle, even though `npm run build` and `npm test` passed in the touched packages.
3. Cross-artifact boundary under audit: the shared predicate DSL projection contract used by validators and the world-index parser. The contract must remain single-sourced without requiring the lower-level indexer package to depend on the higher-level validators package root.
4. FOUNDATIONS alignment: this is machine-facing tooling hygiene for the story-bundle selection pipeline. It does not alter canon, world content, or HARD-GATE behavior; the goal is preserving a clean, robust producer contract for `storylet_predicate_class` edges.
5. Same-family ownership check: `STVALIDATOR-001` owns alias-binding validator semantics, and `STSKILL-001` owns skill prose around page-plan packets. Neither owns package graph cleanup for the predicate projection contract.
6. Reassessment owner correction: `@worldloom/world-index` is the cycle-free owner for the projection table because it emits `storylet_predicate_class` edges and is already the lower-level dependency consumed by `tools/validators` and `tools/world-mcp`. This ticket moves only the projection table and record-id-prefix helper there; the validator package remains the owner of predicate argument grammar, schemas, and validator rules.
7. Pre-edit baseline: `npm test` passed in `tools/validators` (1094 passing), `tools/world-index` (126 non-CLI tests plus serial CLI tests passing), and `tools/world-mcp` (496 passing).

## Architecture Check

1. Cleaner than leaving the cycle in place because the predicate projection table is a shared low-level contract, not inherently a validator-root capability. A cycle-free shared surface keeps `tools/world-index` build/install behavior independent from validator public-index imports.
2. No backwards-compatibility aliasing/shims should be introduced. Keep the externally observed `storylet_predicate_class` edge values and selector inputs unchanged.

## Verification Layers

1. Package graph is acyclic across `tools/world-index` and `tools/validators` -> codebase grep-proof and package manifest review.
2. Predicate projection contract remains single-sourced -> codebase grep-proof that `PREDICATE_REFERENCED_CLASSES` has one implementation under `tools/world-index/src/public/predicate-dsl-projection.ts` and consumers import that surface.
3. `storylet_predicate_class` behavior is unchanged -> STSELECT-001 parser and selector regression tests continue to pass.
4. Cross-package build remains stable -> package builds and tests in `tools/validators`, `tools/world-index`, and `tools/world-mcp`.

## Landed Changes

### 1. Moved the shared predicate projection contract to a cycle-free owner

Added `tools/world-index/src/public/predicate-dsl-projection.ts` and exported it as `@worldloom/world-index/public/predicate-dsl-projection`. The new public subpath owns `PREDICATE_REFERENCED_CLASSES`, `PREDICATE_RECORD_PREFIX_TO_CLASS`, `PredicateReferencedClass`, and `predicateRecordClassForRecordId`.

### 2. Removed the reverse dependency from `tools/world-index`

Removed `@worldloom/validators` from `tools/world-index/package.json` and `tools/world-index/package-lock.json`. `tools/world-index/src/parse/atomic.ts` now imports the projection helper from its local public surface instead of the validators package.

### 3. Preserved STSELECT-001 behavior

Kept `tools/world-index/src/parse/atomic.ts` deriving existential predicate classes from predicate names and exact-id predicate classes from record-id prefixes. `holder_role`, `kind`, and `record_class` were not reintroduced as `storylet_predicate_class` values.

### 4. Updated package public-surface tests and docs

Removed the validators package predicate-projection subpath/export, updated validator parity tests to import the world-index public surface, extended the world-index public import side-effect test, and documented the new subpath in `tools/world-index/README.md`.

## Files to Touch

- `tools/world-index/package.json` (modify)
- `tools/world-index/package-lock.json` (modify)
- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/world-index/src/public/predicate-dsl-projection.ts` (new)
- `tools/world-index/tests/public-types.test.ts` (modify)
- `tools/world-index/README.md` (modify)
- `tools/validators/package.json` (modify)
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify)
- `tools/validators/src/public/index.ts` (modify)
- `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (modify)

## Out of Scope

- Changing predicate DSL semantics or adding/removing predicates.
- Changing `select_storylet_candidates` request/response shape.
- Changing `storylet_predicate_class` edge values.
- Re-indexing live worlds.

## Acceptance Criteria

### Tests That Must Pass

1. A grep/package-manifest check proves `tools/world-index/package.json` no longer depends on `@worldloom/validators` while `tools/validators/package.json` may continue depending on `@worldloom/world-index`.
2. `tools/world-index` parser tests still prove existential-only SLTs emit node-type `storylet_predicate_class` edges and exact-id predicates derive class values from record-id prefixes.
3. `tools/world-mcp` selector regression still proves an existential-only SLT survives `after_predicate_class` when `grounding_record_classes` intersects those node-type classes.
4. `npm test` in `tools/validators`, `tools/world-index`, and `tools/world-mcp` passes.

### Invariants

1. `storylet_predicate_class` persists only story-bundle node-type values, never role/subtype filters such as `holder_role` or `kind`.
2. The predicate projection contract has one source of truth and no package dependency cycle between `tools/world-index` and `tools/validators`.

## Test Plan

### New/Modified Tests

1. Existing `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` - updated imports to the world-index public projection surface and kept representative mapping coverage.
2. Existing `tools/world-index/tests/public-types.test.ts` - extended public subpath import coverage for `@worldloom/world-index/public/predicate-dsl-projection`.
3. Existing `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts` - unchanged parser coverage for existential and exact-id class projection.
4. Existing `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` - unchanged selector regression coverage.

### Commands

1. `if rg -n '"@worldloom/validators"' tools/world-index/package.json tools/world-index/package-lock.json; then exit 1; fi`
2. `npm run build` in `tools/validators`, `tools/world-index`, and `tools/world-mcp`
3. `node --test dist/tests/parse/atomic-edges-for-choice-and-storylet.test.js dist/tests/public-types.test.js` in `tools/world-index`
4. `node --test dist/tests/predicate-dsl-grammar-parity.test.js` in `tools/validators`
5. `node --test dist/tests/tools/select-storylet-candidates.test.js` in `tools/world-mcp`
6. `npm test` in `tools/validators`, `tools/world-index`, and `tools/world-mcp`

## Outcome

Completed on 2026-05-27. The predicate projection table and exact-record-id class helper now live in `@worldloom/world-index/public/predicate-dsl-projection`, the package that emits `storylet_predicate_class` edges. `tools/world-index` no longer depends on `@worldloom/validators`; validators continue to depend on world-index and validate parity between predicate grammar names and the projection table.

The public behavior from STSELECT-001 is unchanged: storylet predicate class edges still use story-bundle node-type values, exact-id predicates still derive classes from record-id prefixes, and the selector regression still keeps existential-only SLTs through predicate-class filtering.

## Verification Result

Pre-edit baselines passed:

1. `npm test` in `tools/validators` - 1094 passing, 0 failing.
2. `npm test` in `tools/world-index` - 126 non-CLI tests plus serial CLI tests passing, 0 failing.
3. `npm test` in `tools/world-mcp` - 496 passing, 0 failing.

Post-edit focused checks passed:

1. `npm run build` in `tools/world-index`
2. `npm run build` in `tools/validators`
3. `npm run build` in `tools/world-mcp`
4. `node --test dist/tests/parse/atomic-edges-for-choice-and-storylet.test.js dist/tests/public-types.test.js` in `tools/world-index` - 5 passing, 0 failing.
5. `node --test dist/tests/predicate-dsl-grammar-parity.test.js` in `tools/validators` - 8 passing, 0 failing.
6. `node --test dist/tests/tools/select-storylet-candidates.test.js` in `tools/world-mcp` - 5 passing, 0 failing.
7. `if rg -n '"@worldloom/validators"' tools/world-index/package.json tools/world-index/package-lock.json; then exit 1; fi` from repo root - passed with no matches.
8. The stale-surface sweep below from repo root found no stale validators subpath/export hits; remaining `PREDICATE_REFERENCED_CLASSES` hits were the new world-index implementation and intended imports/tests:

```bash
rg -n '@worldloom/validators/predicate-dsl-grammar|"\./predicate-dsl-grammar"|PREDICATE_REFERENCED_CLASSES' tools/world-index tools/validators tools/world-mcp docs/MACHINE-FACING-LAYER.md
```

Post-edit package checks passed:

1. `npm test` in `tools/world-index` - 126 non-CLI tests plus serial CLI tests passing, 0 failing.
2. `npm test` in `tools/validators` - 1094 passing, 0 failing.
3. `npm test` in `tools/world-mcp` - 496 passing, 0 failing.

## Deviations

1. `tools/world-mcp` source and tests were not modified. The package was built and tested as a consumer of the world-index/validators dependency graph.
2. `npm install` in `tools/world-mcp` reported one moderate audit vulnerability before verification. Dependency remediation is outside this ticket.
