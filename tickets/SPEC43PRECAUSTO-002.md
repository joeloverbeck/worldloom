# SPEC43PRECAUSTO-002: Synthetic Fixture Bundle for Mid-Story Introduction Tests

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new fixture directory at `tools/validators/tests/fixtures/midstory-introduction/` with synthetic story-bundle records exercising all 6 mid-story creation classes (CLK / STSEC / STQ / THR / STENT / SREL), old-style PG-snapshot grandfathering, observer-firewall enforcement, and future-shape rejection. No impact on existing fixture bundles.
**Deps**: None

## Problem

SPEC-43's 9 new validators + 2 validator extensions (snapshot-replay normalization + observer-firewall extension) require a synthetic fixture bundle exercising every behavior the validators gate. Hand-rolling fixtures inside each validator's test file would duplicate setup across 11 tests and silently couple validator implementation to fixture shape. A shared fixture bundle under `tools/validators/tests/fixtures/midstory-introduction/` lets the 11 downstream validator tests import canonical fixtures, run consistent assertions, and detect schema drift via shared schema-load failures.

## Assumption Reassessment (2026-05-18)

1. `tools/validators/tests/fixtures/` exists (verified via `ls tools/validators/tests/`) and is the canonical fixture directory the validator tests load from. SPEC-43 §Deliverables originally cited `tools/validators/test/fixtures/` (singular `test`); the corrected path is `tools/validators/tests/fixtures/` (mechanical-drift correction noted in Step 2 summary).
2. SPEC-43 §Verification names 18 distinct behaviors that need coverage. The fixture bundle must exercise each (mid-story creation pass cases for all 6 classes, vague-pressure fail, existing-clock tick still valid, author-only-future-twist fail, future-shape rejection across all classes, STENT-without-STSTAT fail, existing-entity status update does NOT fire pairing requirement, believed-only relationship fail, thematic THR fail, observer-firewall fail when actor lacks access, absence of optional classes still valid, old-style PG normalization, child PG materializes full map, compatibility scan writes audit only).
3. Cross-skill boundary under audit: fixtures are consumed by 11 downstream validator tests (tickets 003-012's test files). The fixture bundle is the load-bearing contract — any change to fixture shape requires updating every consuming test. Group fixtures by behavior (per-class creation, future-shape, compatibility) so consuming tests can load only the relevant subset.

## Architecture Check

1. Cleaner than alternative #1 (hand-rolled fixtures per test): 11 tests each constructing their own bundle would force fixture-shape drift to be discovered piecemeal at every test failure. Shared fixtures fail-loud: a schema change breaks all consuming tests at once.
2. Cleaner than alternative #2 (extend `tools/validators/tests/fixtures/` existing bundles): existing fixtures were authored for SPEC-13 / SPEC-34 / SPEC-38 / SPEC-42 behaviors; reusing them couples SPEC-43 tests to unrelated test infrastructure. A SPEC-43-specific sub-directory keeps the fixture set scoped and discoverable.
3. No backwards-compatibility aliasing/shims introduced: this is a purely additive new fixture directory.

## Verification Layers

1. Fixture bundle structural integrity → schema validation: each fixture YAML must parse + validate against its record-class JSON schema at fixture load.
2. Coverage completeness → codebase grep-proof: `find tools/validators/tests/fixtures/midstory-introduction -name '*.yaml' | wc -l` returns the expected count (one fixture per SPEC-43 §Verification bullet that requires a YAML record + a few shared parent/page snapshots).
3. Consumability → schema validation (informal — the 11 downstream validator tests will import these fixtures via the existing `_helpers/` loader at `tools/validators/tests/_helpers/`).

## What to Change

### 1. Create fixture bundle root + sub-structure

Create directory `tools/validators/tests/fixtures/midstory-introduction/` with sub-directories per behavior cluster:
- `creation-pass/` — one sub-bundle per class showing a lawful mid-story creation (CLK / STSEC / STQ / THR / STENT / SREL).
- `creation-fail/` — fail cases (vague-pressure CLK, author-only-future-twist STSEC, future-shape STQ, STENT-without-STSTAT, believed-only SREL, thematic THR, observer-firewall fail).
- `lifecycle-still-valid/` — existing-clock tick + existing-entity status update (negative case: should NOT trigger introduction validators).
- `narrative-shape-fail/` — one fixture per class with a prohibited field (`expected_payoff_mode`, `act_position`, `midpoint`, `climax`, `dramatic_curve_position`) to exercise the cross-class `narrative_shape_field_rejection` validator.
- `compatibility/` — old-style PG snapshot (missing CLK / STSEC / STQ / DA keys) + new child PG snapshot (full map materialized) + pre-SPEC-42 bundle structure (missing `_source/{clocks,secrets,story-questions,artifacts}/`).

### 2. Per-bundle minimum shape

Each sub-bundle needs (at minimum):
- `STORY_KERNEL.md` (1-page minimal kernel).
- `_source/pages/PG-1.yaml` (parent page snapshot).
- `_source/pages/PG-2.yaml` (child page snapshot — the page that introduces the new record).
- `_source/events/SE-1.yaml` + `SE-2.yaml` (SE-2 is the creating event for mid-story introduction).
- `_source/branches/BR-1.yaml` (root branch).
- Per-class new record file (e.g., `_source/clocks/CLK-1.yaml` for the CLK creation-pass case).
- `_source/storylets/SLT-1.yaml` (the storylet whose effect.create[] names the new record).

Fixture story slug: `midstory-introduction-test`. World slug: `synthetic-world` (parallel to existing test fixtures' synthetic-world convention).

### 3. README at fixture root

`tools/validators/tests/fixtures/midstory-introduction/README.md` enumerates each sub-bundle's purpose + which downstream validator test consumes it.

## Files to Touch

- `tools/validators/tests/fixtures/midstory-introduction/README.md` (new)
- `tools/validators/tests/fixtures/midstory-introduction/creation-pass/**/*` (new — ~6 sub-bundles, one per class)
- `tools/validators/tests/fixtures/midstory-introduction/creation-fail/**/*` (new — ~7 sub-bundles)
- `tools/validators/tests/fixtures/midstory-introduction/lifecycle-still-valid/**/*` (new — ~2 sub-bundles)
- `tools/validators/tests/fixtures/midstory-introduction/narrative-shape-fail/**/*` (new — ~5 sub-bundles, one per class with prohibited field)
- `tools/validators/tests/fixtures/midstory-introduction/compatibility/**/*` (new — ~3 sub-bundles: pre-SPEC-42 bundle structure + old-style PG + new-PG-from-old-parent)

## Out of Scope

- No changes to `tools/validators/tests/_helpers/` fixture-loading utilities (deferred until downstream validator tests reveal a loader-extension need; default expectation is the existing loader supports the new fixture subdir without changes).
- No changes to existing fixture bundles under `tools/validators/tests/fixtures/`.
- No production code changes (this is purely test infrastructure).
- No real-world bundle data (synthetic only; the `red-bunny` exercise lands in ticket 017's capstone test, which uses the actual `worlds/erotica-world/stories/red-bunny/` bundle as a separate fixture path).

## Acceptance Criteria

### Tests That Must Pass

1. `find tools/validators/tests/fixtures/midstory-introduction -name '*.yaml' | xargs -I {} npx js-yaml {} > /dev/null` — every fixture YAML parses cleanly.
2. `ls tools/validators/tests/fixtures/midstory-introduction/{creation-pass,creation-fail,lifecycle-still-valid,narrative-shape-fail,compatibility}` — all 5 sub-directories exist.
3. `test -f tools/validators/tests/fixtures/midstory-introduction/README.md` — README exists.
4. `npm test --prefix tools/validators` — existing validator tests continue to pass (the fixture bundle is purely additive and not yet consumed by any test in this ticket).

### Invariants

1. Each creation-pass fixture is structurally valid: parent PG snapshot exists, SE-2 has `state_delta.create[]` naming the new record, the new record's `created_at_page: PG-2` matches the child PG, and (for STENT) the same-event STSTAT pairing is present.
2. Each creation-fail fixture is structurally invalid in EXACTLY ONE way — the one the corresponding validator catches. A creation-fail fixture that fails for multiple unrelated reasons would couple multiple validator tests, defeating the per-test isolation goal.
3. Compatibility fixtures preserve the pre-SPEC-42 / pre-SPEC-38 bundle shape (no `_source/clocks/`, no `_source/secrets/`, no `_source/story-questions/`, no `_source/artifacts/`, no `CLK` / `STSEC` / `STQ` / `DA` keys in `PG.state_snapshot.active_records`) so the snapshot-key normalization + compatibility-drift validators can exercise the grandfathering path.

## Test Plan

### New/Modified Tests

1. `None — fixture bundle only; per-test fixture loading lands in tickets 003-012.`

### Commands

1. `find tools/validators/tests/fixtures/midstory-introduction -name '*.yaml' -exec npx js-yaml {} \; > /dev/null` (YAML parse sanity).
2. `npm test --prefix tools/validators` (existing test suite continues to pass).
3. `ls tools/validators/tests/fixtures/midstory-introduction/` (5 sub-directories visible).
