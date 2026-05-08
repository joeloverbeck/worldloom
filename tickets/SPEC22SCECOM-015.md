# SPEC22SCECOM-015: SPEC-22 verification capstone: end-to-end checks against assembled v2 pipeline

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — verification capstone; introduces no new production code. Adds integration tests under `tools/world-mcp/tests/integration/` (or `tools/validators/tests/integration/`) that exercise the assembled v2 pipeline.
**Deps**: archive/tickets/SPEC22SCECOM-001.md, 010, 011, 012, 013, 014

## Problem

SPEC-22 §Verification names 7 end-to-end behavioral checks the assembled v2 pipeline must satisfy: patch-engine round-trip (v2 SLT + CHC v2 + ARC_TRACE patch validates → submits → re-reads identically); validator coverage (every Phase 9 gate of branching-story-page-cycle, post-archived-SPEC-20, total 17 gates, is backed by an executable validator); canonical-vocabularies enum coverage (per-class entry counts: 20/20/5/8/8/19); indexer ingestion (50 ARCTRACE records ingest in <10s); sibling-skill interop (bootstrap Phase 6 produces v2 seed pool; health-audit lists choice-cadence + menu-emission ratio; promotion produces valid `arc_effect_promotion` proposal package); migration verified (red-bunny absent; animalia v2-native); Hook 3 coverage (direct Edit/Write blocked on `_source/arc-traces/`). Without a capstone ticket exercising the assembled pipeline, individual ticket implementations could land correctly while subtle integration drift goes undetected until production use.

## Assumption Reassessment (2026-05-08)

1. **Capstone scope**: this ticket introduces no new production code. It exercises the pipeline composed by tickets 001-014 through end-to-end integration tests against a fixture-world copy.
2. **Fixture-world copy strategy**: the test copies `worlds/animalia/` (or another v2-native fixture) to a temp root via `fs.cpSync`, runs the v2 pipeline against the copy, and asserts on the post-state. The real `worlds/animalia/` tree is never mutated by the test.
3. **Re-enumerated expected counts**: counts are computed from the fixture at test start (not hardcoded). The number of expected ARCTRACE records, validator coverage, etc. is derived programmatically.
4. **Per-spec-§Verification-bullet test matrix**: the spec's 7 verification bullets become the capstone's 7 test sub-cases.
5. **Wall-clock perf assertion**: SPEC-22 §Verification names "<10s" for 50-ARCTRACE ingestion; the capstone asserts this as a CI gate.
6. **Cross-skill boundary under audit**: this ticket exercises the assembled cross-skill pipeline — patch-engine + validators + canonical-vocabularies + indexer + MCP retrieval + bootstrap + health-audit + promotion + page-cycle docs. Each upstream ticket's deliverables must be in place; the capstone does not stub any pipeline component.
7. **FOUNDATIONS §Verification** alignment: the capstone's test matrix is the spec's verification bullets. Each must PASS for the capstone to be considered complete.
8. (HARD-GATE / canon-write ordering): N/A — capstone tests use fixture-world copies and do not mutate canon.

## Architecture Check

1. The capstone ticket follows the established `§Spec-Integration Ticket Shape` pattern: trailing capstone whose Acceptance Criteria enumerate the spec's §Verification bullets as test sub-cases.
2. Fixture-world copy strategy keeps the real worlds tree untouched; re-enumerated counts stay valid as canon grows.
3. Transitive-head dependency convention: `Deps: archive/tickets/SPEC22SCECOM-001.md, 010, 011, 012, 013, 014` — most upstream tickets are transitively covered (e.g., 010's chain covers 002-009; 011 covers 005/006/008; 012 covers archived SPEC22SCECOM-001/005/006/008). The capstone's deps list is the minimal set whose transitive closure covers all 14 prior tickets.

## Verification Layers

1. **Patch-engine round-trip** → integration test: build a patch plan with `create_arc_trace_record` op; submit; verify file on disk; re-read; assert byte-identical content (after YAML normalization).
2. **Validator coverage** → integration test: enumerate page-cycle Phase 9 gates from archived SPEC-20 §E (5 gates) plus the existing 12 page-cycle gates = 17 total; for each gate, assert an executable validator with the same name exists in `tools/validators/src/rules/`. Bare PASS without rationale → treated as FAIL per existing skill discipline.
3. **Canonical-vocabularies enum coverage** → integration test: `mcp__worldloom__get_canonical_vocabulary({class: 'commitment_class'}).length === 20`; analogous assertions for `arc_archetype` (20), `narrative_point` (5), `strong_axis` (8), `strong_outcome` (8), `stop_predicate` (19).
4. **Indexer ingestion** → wall-clock perf test: build a fixture story bundle with 50 pages × 1 ARC_TRACE per page (50 ARCTRACE records); run `world-index build`; assert wall-clock <10s.
5. **Sibling-skill interop**:
   - `branching-story-bootstrap` Phase 6 against fixture premise produces a v2-native seed pool (10 arcs by default; `target_pool_size = max(8, ceil(world_complexity_factor × 10))`); v1 SLT records absent.
   - `branching-story-health-audit` SAU report's choice-cadence section lists mean arcs between menus and menu-emission ratio (no word-count metrics).
   - `story-fact-promotion-to-canon` SP-NNNN package with `source_kind: arc_effect_promotion` produces a valid canon-addition proposal package whose `proposed_canon_fact` is derived from `arc.effect_model.variants[<applied>].required_effects[]`.
6. **Migration** → file-system test: `ls -d worlds/erotica-world/stories/red-bunny/` returns no-such-file; `grep "red-bunny" worlds/erotica-world/stories/INDEX.md` returns 0 matches; `worlds/animalia/` (or another v2-native world) bootstraps cleanly through `branching-story-bootstrap`.
7. **Hook 3 coverage** → direct-write test: attempting a raw `Edit` or `Write` on `worlds/<slug>/stories/<slug>/_source/arc-traces/ARCTRACE-NNNN.yaml` is structurally blocked by Hook 3 (existing `worlds/<slug>/stories/<slug>/_source/...` pattern).

## What to Change

### 1. Add `tools/world-mcp/tests/integration/spec22-capstone.test.ts` (or under `tools/validators/`)

Implement the 7 test sub-cases above. Use `fs.cpSync` to copy the fixture world to a temp root. Re-enumerate expected counts at test start.

### 2. (Optional) Wire the test into a package script

Add a `test:spec22-capstone` script to the relevant package's `package.json` for targeted invocation:

```json
"test:spec22-capstone": "node --test dist/tests/integration/spec22-capstone.test.js"
```

Parallel to `tools/world-index/package.json`'s existing `test:spec10-verification` script convention.

## Files to Touch

- `tools/world-mcp/tests/integration/spec22-capstone.test.ts` (new — or located in `tools/validators/tests/integration/` if validator-coverage testing is the dominant concern)
- `tools/world-mcp/package.json` (modify if adding `test:spec22-capstone` script — optional)
- (Possible) `tools/world-index/tests/fixtures/v2-bundle/` (new — 50-ARCTRACE fixture for indexing benchmark)

## Out of Scope

- Any production code introduction (capstone is verification-only)
- Token-cost / pause-count telemetry — owned by Tier 4 pilot per SPEC-22 §Out of Scope (deferred to production-pilot telemetry, not a CI gate)
- Empirical token-cost measurement — implementation-time, not a separate spec
- Same downstream Out of Scope as 001/002

## Acceptance Criteria

### Tests That Must Pass

1. **Round-trip**: patch plan with `create_arc_trace_record` op validates → submits → file on disk → re-reads identically.
2. **Validator coverage**: 17 page-cycle Phase 9 gates each have an executable validator in `tools/validators/src/rules/`.
3. **Enum coverage**: `get_canonical_vocabulary` returns the documented entry counts (20/20/5/8/8/19).
4. **Indexer perf**: 50-ARCTRACE bundle ingests in <10s wall-clock.
5. **Bootstrap interop**: Phase 6 against fixture premise emits a v2 seed pool with default target_pool_size = 10 arcs; v1 SLT records absent.
6. **Health-audit interop**: SAU report's choice-cadence section lists mean arcs between menus + menu-emission ratio (no word-count metrics).
7. **Promotion interop**: SP-NNNN package with `source_kind: arc_effect_promotion` produces valid canon-addition proposal package; `proposed_canon_fact` derives from `arc.effect_model.variants[<applied>].required_effects[]`.
8. **Migration**: `worlds/erotica-world/stories/red-bunny/` absent; `worlds/erotica-world/stories/INDEX.md` no longer references it; v2-native world bootstraps cleanly.
9. **Hook 3**: direct Edit/Write on `worlds/<slug>/stories/<slug>/_source/arc-traces/ARCTRACE-NNNN.yaml` is structurally blocked.

### Invariants

1. Capstone introduces no new production code; only integration tests.
2. Fixture-world copies via `fs.cpSync` to temp root; real worlds tree never mutated by tests.
3. Counts re-enumerated from fixture at test start (not hardcoded — stays valid as canon grows).
4. Each spec §Verification bullet maps to exactly one test sub-case.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/integration/spec22-capstone.test.ts` (new) — 9 sub-cases covering the spec's §Verification bullets.
2. `tools/world-index/tests/fixtures/v2-bundle/` (new — fixture for 50-ARCTRACE indexing perf assertion).

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && npm run test`
3. `cd tools/world-mcp && node --test dist/tests/integration/spec22-capstone.test.js` — full capstone run.
4. (Optional) `cd tools/world-mcp && npm run test:spec22-capstone` if the package-script alias is added.
