# SPEC22SCECOM-015: SPEC-22 verification capstone: end-to-end checks against assembled v2 pipeline

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — verification capstone; introduces no production code. Adds an integration test under `tools/world-mcp/tests/integration/` that exercises the assembled v2 package and skill-contract surfaces.
**Deps**: archive/tickets/SPEC22SCECOM-001.md, archive/tickets/SPEC22SCECOM-010.md, archive/tickets/SPEC22SCECOM-011.md, archive/tickets/SPEC22SCECOM-012.md, archive/tickets/SPEC22SCECOM-013.md, archive/tickets/SPEC22SCECOM-014.md

## Problem

At intake, SPEC-22 §Verification named 7 end-to-end behavioral checks the assembled v2 pipeline must satisfy: patch-engine round-trip (v2 SLT + CHC v2 + ARC_TRACE patch validates -> submits -> re-reads identically); validator coverage (page-cycle Phase 9 total 17 gates, including the 5 SPEC-22 v2 validator gates); canonical-vocabularies enum coverage (per-class entry counts: 20/20/5/8/8/19); indexer ingestion (50 ARCTRACE records ingest in <10s); sibling-skill interop (bootstrap Phase 6 exposes v2 seed-pool contract; health-audit lists choice-cadence + menu-emitting page ratio; promotion exposes `arc_effect_promotion` proposal package); migration verified (red-bunny absent); Hook 3 coverage for story-bundle `_source/arc-traces/`. The landed capstone now covers those assembled package and skill-contract surfaces.

## Assumption Reassessment (2026-05-08)

1. **Capstone scope**: this ticket introduces no production code. It adds a package-local integration test that composes the package and skill artifacts landed by tickets 001-014.
2. **Fixture strategy correction**: the live repo already has temp-seeded package fixtures (`tools/world-mcp/tests/tools/_shared.ts` and `tools/world-index/tests/helpers/atomic-fixture.ts`). The capstone uses temp repo roots and generated fixture records instead of copying gitignored `worlds/animalia/`; no real `worlds/` tree is mutated.
3. **Re-enumerated expected counts**: vocabulary lengths and validator/gate coverage are computed from live exported registries and skill/docs text at test runtime. The 50-ARCTRACE ingestion case generates records programmatically rather than relying on a checked-in fixed fixture tree.
4. **Per-spec verification mapping**: SPEC-22's verification bullets and acceptance checks are covered by six executable Node subtests. Some subtests group multiple acceptance checks where the live proof surface is shared, and user/LLM skill execution is represented by static contract witnesses in the skill docs/templates. This avoids pretending a Node test can run interactive Claude skills.
5. **Wall-clock perf assertion**: SPEC-22 §Verification names "<10s" for 50-ARCTRACE ingestion; the capstone asserts the generated 50-record fixture builds under that limit via `world-index build`.
6. **Cross-skill boundary under audit**: this ticket exercises patch-engine + validators + canonical-vocabularies + indexer + MCP retrieval, and it statically verifies bootstrap + health-audit + promotion + page-cycle contract text. The capstone does not stub package components; it does use an explicit passing pre-apply validator injection for the patch-engine submit path so the production hard gate remains fail-closed.
7. **Migration/hook boundary correction**: Hook 3 direct Edit/Write blocking is not a callable Node package surface in this repo. The capstone proves the live structural coverage by checking the documented `worlds/<slug>/stories/<story-slug>/_source/...` pattern and the completed migration state from SPEC22SCECOM-014.
8. (HARD-GATE / canon-write ordering): package-only temp fixture writes are allowed; live canon writes remain routed through hard-gated workflows. The submit-path test signs a temp fixture plan and does not touch live world canon.

## Architecture Check

1. The capstone ticket follows the established `§Spec-Integration Ticket Shape` pattern: trailing capstone whose Acceptance Criteria enumerate the spec's §Verification bullets as test sub-cases.
2. Fixture-world copy strategy keeps the real worlds tree untouched; re-enumerated counts stay valid as canon grows.
3. Transitive-head dependency convention: `Deps: archive/tickets/SPEC22SCECOM-001.md, archive/tickets/SPEC22SCECOM-010.md, archive/tickets/SPEC22SCECOM-011.md, archive/tickets/SPEC22SCECOM-012.md, archive/tickets/SPEC22SCECOM-013.md, archive/tickets/SPEC22SCECOM-014.md` — most upstream tickets are transitively covered (e.g., 010's chain covers 002-009; 011 covers 005, archive/tickets/SPEC22SCECOM-006.md, and 008; 012 covers archive/tickets/SPEC22SCECOM-001.md, 005, archive/tickets/SPEC22SCECOM-006.md, and 008). The capstone's deps list is the minimal set whose transitive closure covers all 14 prior tickets.

## Verification Layers

1. **Patch-engine round-trip** -> integration test: build a temp patch plan with `create_arc_trace_record`; verify `validate_patch_plan` passes; submit through patch-engine with a signed temp approval token and explicit passing pre-apply validator; verify file on disk; re-read through `get_record`; compare normalized YAML.
2. **Validator coverage** -> integration test: enumerate executable validator files/registry entries; assert the SPEC-22 v2 validator names exist; assert bootstrap/page-cycle Phase 9 prose names the 17-gate contract and the 5 v2 Phase 9 gate names.
3. **Canonical-vocabularies enum coverage** -> integration test: call `getCanonicalVocabulary` for `commitment_class`, `arc_archetype`, `narrative_point`, `strong_axis`, `strong_outcome`, and `stop_predicate`; assert lengths 20/20/5/8/8/19.
4. **Indexer ingestion** -> integration test: generate a temp story bundle with 50 ARC_TRACE records; run `world-index build`; assert wall-clock <10s and indexed row count is 50.
5. **Sibling-skill interop** -> static contract integration test:
   - `branching-story-bootstrap` Phase 6/9 docs contain `target_pool_size = max(8, ceil(world_complexity_factor × 10))`, v2 scene-commitment arc wording, and 17 validation gates.
   - `branching-story-health-audit` skill/template contains mean arcs between menus and menu-emitting page ratio, and excludes word-count metrics.
   - `story-fact-promotion-to-canon` skill/template contains `arc_effect_promotion` and `effect_model.variants[]` / `required_effects[]` provenance.
6. **Migration** -> file-system test: `worlds/erotica-world/stories/red-bunny/` is absent and `worlds/erotica-world/stories/INDEX.md` has no red-bunny reference when the local ignored world exists.
7. **Hook 3 coverage** -> static contract test: the repo's Hook 3 documentation covers `worlds/<slug>/stories/<story-slug>/_source/...`, which includes `_source/arc-traces/`.

## Landed Changes

### 1. Add `tools/world-mcp/tests/integration/spec22-capstone.test.ts`

Implemented the 7 verification-surface layers above as six executable Node subtests using temp repo roots and generated fixtures. The test re-enumerates expected counts and registry entries at runtime.

### 2. Wire a focused package script

Added a `test:spec22-capstone` script to `tools/world-mcp/package.json` for targeted invocation:

```json
"test:spec22-capstone": "npm run build && node --test dist/tests/integration/spec22-capstone.test.js"
```

Parallel to `tools/world-index/package.json`'s existing `test:spec10-verification` script convention.

## Files to Touch

- `tools/world-mcp/tests/integration/spec22-capstone.test.ts` (new)
- `tools/world-mcp/package.json` (modify)

## Out of Scope

- Any production code introduction (capstone is verification-only)
- Token-cost / pause-count telemetry — owned by Tier 4 pilot per SPEC-22 §Out of Scope (deferred to production-pilot telemetry, not a CI gate)
- Empirical token-cost measurement — implementation-time, not a separate spec
- Same downstream Out of Scope as 001/002

## Acceptance Criteria

### Tests That Must Pass

1. **Round-trip**: temp patch plan with `create_arc_trace_record` validates -> submits -> file on disk -> re-reads identically via `get_record`.
2. **Validator coverage**: SPEC-22 v2 validators exist as executable rule files and registry entries, and bootstrap/page-cycle Phase 9 prose names the 17-gate contract plus the 5 v2 Phase 9 gate names.
3. **Enum coverage**: `get_canonical_vocabulary` returns the documented entry counts (20/20/5/8/8/19).
4. **Indexer perf**: 50-ARCTRACE bundle ingests in <10s wall-clock.
5. **Bootstrap interop**: Phase 6/9 docs expose v2 seed-pool and 17-gate contracts; v1-only wording is absent from the checked surfaces.
6. **Health-audit interop**: SAU report contract lists mean arcs between menus + menu-emitting page ratio and does not define word-count metrics.
7. **Promotion interop**: SP-NNNN package contract with `source_kind: arc_effect_promotion` carries `effect_model.variants[]` / `required_effects[]` provenance.
8. **Migration**: `worlds/erotica-world/stories/red-bunny/` absent and `worlds/erotica-world/stories/INDEX.md` no longer references it when the local ignored world exists.
9. **Hook 3**: hard-gate docs cover `worlds/<slug>/stories/<story-slug>/_source/...`, including `_source/arc-traces/`.

### Invariants

1. Capstone introduces no new production code; only integration tests.
2. Fixture repo roots are generated under temp directories; real worlds tree never mutated by tests.
3. Counts re-enumerated from live exports or generated fixture state at test start.
4. Each spec §Verification bullet is represented by a concrete assertion path; related acceptance checks may be grouped into one executable Node subtest when they share the same proof surface.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/integration/spec22-capstone.test.ts` (new) — 6 executable Node subtests covering the spec's verification layers and 9 listed acceptance checks.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node dist/tests/integration/spec22-capstone.test.js` — focused capstone run exposing the 6 subtests.
3. `cd tools/world-mcp && npm run test:spec22-capstone` — package-script wrapper proof.
4. `cd tools/world-mcp && npm run test`

## Outcome

Added `tools/world-mcp/tests/integration/spec22-capstone.test.ts` as the SPEC-22 capstone. The test covers patch-engine validation/submission/re-read through temp fixtures, v2 validator registry and Phase 9 prose witnesses, canonical vocabulary counts, 50-ARC_TRACE index ingestion, sibling skill contract text, migration state, and Hook 3 story-bundle `_source/` coverage.

Added `tools/world-mcp`'s `test:spec22-capstone` script so the capstone can run independently of the full package suite.

## Verification Result

1. `cd tools/world-mcp && npm run build` -> PASS.
2. `cd tools/world-mcp && node dist/tests/integration/spec22-capstone.test.js` -> PASS (6 subtests).
3. `cd tools/world-mcp && npm run test:spec22-capstone` -> PASS (package script builds first; this Node runner reports the compiled file wrapper as 1 passing test).
4. `cd tools/world-mcp && npm run test` -> PASS (348 tests reported passing).

## Deviations

1. The capstone does not copy or mutate `worlds/animalia/`; it uses generated temp fixtures so gitignored user-local worlds remain untouched.
2. The capstone does not attempt a raw Codex Edit/Write operation from Node. Hook 3 coverage is proved by the live hard-gate documentation pattern for `worlds/<slug>/stories/<story-slug>/_source/...`.
3. Interactive Claude skill execution is not simulated. Sibling-skill interop is covered as static contract proof over the live skill docs/templates.
