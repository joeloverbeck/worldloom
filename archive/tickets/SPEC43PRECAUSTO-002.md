# SPEC43PRECAUSTO-002: Synthetic Fixture Bundle for Mid-Story Introduction Tests

**Status**: COMPLETED
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
4. Live schema drift correction: current `tools/validators/src/schemas/story-event.schema.json` does not yet allow `CLK` / `STSEC` / `STQ` IDs in `state_delta.create[]`; that widening belongs to downstream validator/schema tickets. Several failure cases also intentionally contain future-shape or missing-pairing defects. Therefore this ticket creates YAML-parseable clustered fixture manifests rather than claiming every fixture is valid under the current schema before the consuming validators exist.
5. Loader-boundary correction: no existing test helper loads full story-bundle fixture directories from `tools/validators/tests/fixtures/`. Creating per-behavior YAML manifests keeps the fixture contract explicit for tickets 003-012 without inventing a loader API in this prerequisite ticket.

## Architecture Check

1. Cleaner than alternative #1 (hand-rolled fixtures per test): 11 tests each constructing their own bundle would force fixture-shape drift to be discovered piecemeal at every test failure. Shared fixtures fail-loud: a schema change breaks all consuming tests at once.
2. Cleaner than alternative #2 (extend `tools/validators/tests/fixtures/` existing bundles): existing fixtures were authored for SPEC-13 / SPEC-34 / SPEC-38 / SPEC-42 behaviors; reusing them couples SPEC-43 tests to unrelated test infrastructure. A SPEC-43-specific sub-directory keeps the fixture set scoped and discoverable.
3. No backwards-compatibility aliasing/shims introduced: this is a purely additive new fixture directory.

## Verification Layers

1. Fixture bundle structural integrity → schema validation substitute: each fixture manifest must parse as YAML, with deliberately invalid records labeled by `expected_verdict`.
2. Coverage completeness → codebase grep-proof: `find tools/validators/tests/fixtures/midstory-introduction -name '*.yaml' | wc -l` returns 5 clustered fixture manifests, one for each behavior directory.
3. Consumability → manual review + YAML parse: downstream validator tests can import the clustered manifests by behavior without requiring a new shared loader in this ticket.

## What to Change

### 1. Create fixture bundle root + sub-structure

Create directory `tools/validators/tests/fixtures/midstory-introduction/` with sub-directories per behavior cluster. Each sub-directory contains one parseable YAML manifest with records and expected verdict metadata:
- `creation-pass/` — one sub-bundle per class showing a lawful mid-story creation (CLK / STSEC / STQ / THR / STENT / SREL).
- `creation-fail/` — fail cases (vague-pressure CLK, author-only-future-twist STSEC, future-shape STQ, STENT-without-STSTAT, believed-only SREL, thematic THR, observer-firewall fail).
- `lifecycle-still-valid/` — existing-clock tick + existing-entity status update (negative case: should NOT trigger introduction validators).
- `narrative-shape-fail/` — one fixture per class with a prohibited field (`expected_payoff_mode`, `act_position`, `midpoint`, `climax`, `dramatic_curve_position`) to exercise the cross-class `narrative_shape_field_rejection` validator.
- `compatibility/` — old-style PG snapshot (missing CLK / STSEC / STQ / DA keys) + new child PG snapshot (full map materialized) + pre-SPEC-42 bundle structure (missing `_source/{clocks,secrets,story-questions,artifacts}/`).

### 2. Per-bundle minimum shape

Each clustered manifest needs (at minimum):
- fixture metadata (`fixture_id`, `story_slug`, `world_slug`, `expected_verdict` or `cases[]`).
- parent and child PG snapshots where the behavior depends on state snapshots.
- creating or lifecycle event records, including `intro:<CLASS>(...)` tags where applicable.
- per-class new or existing record objects with `node_type`, `node_id`, `file_path`, and `parsed`.
- expected downstream consumer notes naming the validator ticket or error code.

Fixture story slug: `midstory-introduction-test`. World slug: `synthetic-world` (parallel to existing test fixtures' synthetic-world convention).

### 3. README at fixture root

`tools/validators/tests/fixtures/midstory-introduction/README.md` enumerates each sub-bundle's purpose + which downstream validator test consumes it.

## Files to Touch

- `tools/validators/tests/fixtures/midstory-introduction/README.md` (new)
- `tools/validators/tests/fixtures/midstory-introduction/creation-pass/all-classes.yaml` (new)
- `tools/validators/tests/fixtures/midstory-introduction/creation-fail/failure-cases.yaml` (new)
- `tools/validators/tests/fixtures/midstory-introduction/lifecycle-still-valid/lifecycle-cases.yaml` (new)
- `tools/validators/tests/fixtures/midstory-introduction/narrative-shape-fail/prohibited-fields.yaml` (new)
- `tools/validators/tests/fixtures/midstory-introduction/compatibility/legacy-snapshot.yaml` (new)

## Out of Scope

- No changes to `tools/validators/tests/_helpers/` fixture-loading utilities (deferred until downstream validator tests reveal a loader-extension need; default expectation is the existing loader supports the new fixture subdir without changes).
- No changes to existing fixture bundles under `tools/validators/tests/fixtures/`.
- No production code changes (this is purely test infrastructure).
- No real-world bundle data (synthetic only; the `red-bunny` exercise lands in ticket 017's capstone test, which uses the actual `worlds/erotica-world/stories/red-bunny/` bundle as a separate fixture path).

## Acceptance Criteria

### Tests That Must Pass

1. `node -e 'const fs=require("fs"); const YAML=require("./tools/validators/node_modules/js-yaml"); const files=process.argv.slice(1); for (const f of files) YAML.load(fs.readFileSync(f,"utf8")); console.log(`parsed ${files.length} yaml files`);' tools/validators/tests/fixtures/midstory-introduction/creation-pass/all-classes.yaml tools/validators/tests/fixtures/midstory-introduction/creation-fail/failure-cases.yaml tools/validators/tests/fixtures/midstory-introduction/lifecycle-still-valid/lifecycle-cases.yaml tools/validators/tests/fixtures/midstory-introduction/narrative-shape-fail/prohibited-fields.yaml tools/validators/tests/fixtures/midstory-introduction/compatibility/legacy-snapshot.yaml` — every fixture YAML parses cleanly.
2. `ls tools/validators/tests/fixtures/midstory-introduction/{creation-pass,creation-fail,lifecycle-still-valid,narrative-shape-fail,compatibility}` — all 5 sub-directories exist.
3. `test -f tools/validators/tests/fixtures/midstory-introduction/README.md` — README exists.
4. `npm test --prefix tools/validators` — existing validator tests continue to pass (the fixture bundle is purely additive and not yet consumed by any test in this ticket).

### Invariants

1. Each creation-pass case is structurally valid for the future SPEC-43 validator contract: parent PG snapshot exists, SE-2 has `state_delta.create[]` naming the new record, the new record's `created_at_page: PG-2` matches the child PG, and (for STENT) the same-event STSTAT pairing is present.
2. Each creation-fail case is marked with exactly one `expected_verdict.code` — the one the corresponding validator catches. A creation-fail fixture that intentionally violates current schema before downstream widening is labeled as fixture intent, not as current package acceptance.
3. Compatibility fixtures preserve the pre-SPEC-42 / pre-SPEC-38 bundle shape (no `_source/clocks/`, no `_source/secrets/`, no `_source/story-questions/`, no `_source/artifacts/`, no `CLK` / `STSEC` / `STQ` / `DA` keys in `PG.state_snapshot.active_records`) so the snapshot-key normalization + compatibility-drift validators can exercise the grandfathering path.

## Test Plan

### New/Modified Tests

1. `None — fixture bundle only; per-test fixture loading lands in tickets 003-012.`

### Commands

1. `node -e 'const fs=require("fs"); const YAML=require("./tools/validators/node_modules/js-yaml"); const files=process.argv.slice(1); for (const f of files) YAML.load(fs.readFileSync(f,"utf8")); console.log(`parsed ${files.length} yaml files`);' tools/validators/tests/fixtures/midstory-introduction/creation-pass/all-classes.yaml tools/validators/tests/fixtures/midstory-introduction/creation-fail/failure-cases.yaml tools/validators/tests/fixtures/midstory-introduction/lifecycle-still-valid/lifecycle-cases.yaml tools/validators/tests/fixtures/midstory-introduction/narrative-shape-fail/prohibited-fields.yaml tools/validators/tests/fixtures/midstory-introduction/compatibility/legacy-snapshot.yaml` (YAML parse sanity).
2. `npm test --prefix tools/validators` (existing test suite continues to pass).
3. `find tools/validators/tests/fixtures/midstory-introduction -mindepth 1 -maxdepth 1 -type d | sort` (5 sub-directories visible).

## Outcome

Completed: 2026-05-18.

Landed the SPEC-43 synthetic fixture corpus at `tools/validators/tests/fixtures/midstory-introduction/` as five clustered YAML manifests plus a README:

- `creation-pass/all-classes.yaml` for lawful `CLK` / `STSEC` / `STQ` / `THR` / `STENT` / `SREL` introductions, same-event `intro:<CLASS>(...)` tags, child active-record materialization, and STENT/STSTAT pairing.
- `creation-fail/failure-cases.yaml` for one expected downstream verdict per malformed introduction case.
- `lifecycle-still-valid/lifecycle-cases.yaml` for existing-clock tick and existing-entity status-update non-introduction paths.
- `narrative-shape-fail/prohibited-fields.yaml` for prohibited future-shape field coverage across protected classes.
- `compatibility/legacy-snapshot.yaml` for legacy parent snapshot optional-key absence and current-contract child full-map materialization.

## Verification Result

1. `find tools/validators/tests/fixtures/midstory-introduction -mindepth 1 -maxdepth 1 -type d | sort` returned the five expected directories: `compatibility`, `creation-fail`, `creation-pass`, `lifecycle-still-valid`, and `narrative-shape-fail`.
2. `find tools/validators/tests/fixtures/midstory-introduction -name '*.yaml' | wc -l` returned `5`.
3. `test -f tools/validators/tests/fixtures/midstory-introduction/README.md` passed.
4. `node -e 'const fs=require("fs"); const YAML=require("./tools/validators/node_modules/js-yaml"); const files=process.argv.slice(1); for (const f of files) YAML.load(fs.readFileSync(f,"utf8")); console.log(`parsed ${files.length} yaml files`);' tools/validators/tests/fixtures/midstory-introduction/creation-pass/all-classes.yaml tools/validators/tests/fixtures/midstory-introduction/creation-fail/failure-cases.yaml tools/validators/tests/fixtures/midstory-introduction/lifecycle-still-valid/lifecycle-cases.yaml tools/validators/tests/fixtures/midstory-introduction/narrative-shape-fail/prohibited-fields.yaml tools/validators/tests/fixtures/midstory-introduction/compatibility/legacy-snapshot.yaml` passed and printed `parsed 5 yaml files`.
5. `npm test --prefix tools/validators` passed: 416 tests, 0 failures.

## Deviations

- Replaced the drafted `npx js-yaml` proof with a direct package-local `node -e` parser because `npx js-yaml` hung while resolving through `npm exec` in the sandbox. The substitute uses the same `js-yaml` dependency already installed under `tools/validators/node_modules/`, and the active acceptance/test-plan command above records the landed proof lane.
- Replaced full per-behavior story-bundle directories with clustered YAML manifests. Current helpers do not yet define a full-bundle loader for these fixtures, and current story-event schema widening for `CLK` / `STSEC` / `STQ` create IDs belongs to downstream validator/schema tickets.
