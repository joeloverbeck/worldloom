# STSELECT-002: Move predicate DSL projection contract out of cyclic package dependency

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes - `tools/validators`, `tools/world-index`, package dependency/export wiring, and focused package tests.
**Deps**: `archive/tickets/STSELECT-001.md`

## Problem

`archive/tickets/STSELECT-001.md` fixed `storylet_predicate_class` projection by making `tools/world-index` import the closed predicate DSL mapping from `@worldloom/validators/predicate-dsl-grammar`. That made the producer/consumer contract truthful, but it introduced a package-level cycle: `tools/world-index/package.json` now depends on `@worldloom/validators`, while `tools/validators/package.json` already depends on `@worldloom/world-index`.

The subpath import is narrow enough to build today, but the package graph now has a circular ownership boundary. Future install/build changes could accidentally pull the validator root export into the indexer again or make the cycle observable in package managers, CI, or editor tooling.

## Assumption Reassessment (2026-05-27)

1. `tools/world-index/package.json` currently declares `"@worldloom/validators": "file:../validators"` so `tools/world-index/src/parse/atomic.ts` can import `PREDICATE_REFERENCED_CLASSES` and `predicateRecordClassForRecordId` from `@worldloom/validators/predicate-dsl-grammar`.
2. `tools/validators/package.json` already declares `"@worldloom/world-index": "file:../world-index"` for validator surfaces that consume world-index helpers. This means the STSELECT-001 implementation left a package dependency cycle, even though `npm run build` and `npm test` pass in the touched packages.
3. Cross-artifact boundary under audit: the shared predicate DSL projection contract used by validators and the world-index parser. The contract must remain single-sourced without requiring the lower-level indexer package to depend on the higher-level validators package root.
4. FOUNDATIONS alignment: this is machine-facing tooling hygiene for the story-bundle selection pipeline. It does not alter canon, world content, or HARD-GATE behavior; the goal is preserving a clean, robust producer contract for `storylet_predicate_class` edges.
5. Same-family ownership check: `STVALIDATOR-001` owns alias-binding validator semantics, and `STSKILL-001` owns skill prose around page-plan packets. Neither owns package graph cleanup for the predicate projection contract.

## Architecture Check

1. Cleaner than leaving the cycle in place because the predicate projection table is a shared low-level contract, not inherently a validator-root capability. A cycle-free shared surface keeps `tools/world-index` build/install behavior independent from validator public-index imports.
2. No backwards-compatibility aliasing/shims should be introduced. Keep the externally observed `storylet_predicate_class` edge values and selector inputs unchanged.

## Verification Layers

1. Package graph is acyclic across `tools/world-index` and `tools/validators` -> codebase grep-proof and package manifest review.
2. Predicate projection contract remains single-sourced -> codebase grep-proof that `PREDICATE_REFERENCED_CLASSES` has one implementation and both consumers import that surface.
3. `storylet_predicate_class` behavior is unchanged -> existing STSELECT-001 parser and selector regression tests continue to pass.
4. Cross-package build remains stable -> package builds and tests in `tools/validators`, `tools/world-index`, and `tools/world-mcp`.

## What to Change

### 1. Move the shared predicate projection contract to a cycle-free owner

Choose a package or source location that `tools/world-index` and `tools/validators` can both consume without creating a package dependency cycle. Preserve the exported names or update imports atomically if the owner changes.

### 2. Remove the reverse dependency from `tools/world-index`

Remove `@worldloom/validators` from `tools/world-index/package.json` and `tools/world-index/package-lock.json` unless the chosen owner still legitimately requires it without recreating the cycle.

### 3. Preserve STSELECT-001 behavior

Keep `tools/world-index/src/parse/atomic.ts` deriving existential predicate classes from predicate names and exact-id predicate classes from record-id prefixes. Do not reintroduce `holder_role`, `kind`, or `record_class` as `storylet_predicate_class` values.

## Files to Touch

- `tools/world-index/package.json` (modify)
- `tools/world-index/package-lock.json` (modify)
- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/validators/package.json` (modify if the export owner changes)
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify or move shared contract)
- `tools/validators/src/public/index.ts` (modify if exported paths change)
- `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (modify)
- `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts` (modify if import path/test fixtures change)
- `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (run; modify only if the public behavior changes, which is not expected)

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

1. Existing `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` - update imports if the shared owner changes; keep representative mapping coverage.
2. Existing `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts` - keep existential and exact-id class projection coverage.
3. Existing `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` - keep selector regression coverage.

### Commands

1. `rg -n '"@worldloom/validators"' tools/world-index/package.json tools/world-index/package-lock.json`
2. `npm run build` in `tools/validators`, `tools/world-index`, and `tools/world-mcp`
3. `node --test dist/tests/parse/atomic-edges-for-choice-and-storylet.test.js` in `tools/world-index`
4. `node --test dist/tests/tools/select-storylet-candidates.test.js` in `tools/world-mcp`
5. `npm test` in `tools/validators`, `tools/world-index`, and `tools/world-mcp`
