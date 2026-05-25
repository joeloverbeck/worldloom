# SPEC84REPBRASCO-002: Author capstone integration test for replay + branch-scope correctness

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new integration test at `tools/world-mcp/tests/integration/spec84-replay-and-branch-scope.test.ts` exercising existing `selectStoryletCandidates` MCP tool + `@worldloom/world-index/commands/build` API; no impact on production code.
**Deps**: SPEC84REPBRASCO-001

## Problem

SPEC-84 §2 enumerates five replay-time correctness cases that no current test covers end-to-end against a real materialized world-index DB: (1) replay sees newer global SLT (positive); (2) replay rejects newer global SLT with story-bundle record ref (negative — `STPLAN-99` predicate ref triggers `after_source_record_id` rejection); (3) branch-scoped sibling exclusion (BR-2's SLT-4 invisible from BR-1 fork); (4) branch-prefix prefix-match positive (SLT-5's `[PG-1, PG-3]` prefix matches BR-1 fork at PG-5); (5) branch-prefix wrong-prefix negative (SLT-5 invisible from BR-2 fork at PG-4). The behaviors are structurally automatic post-SPEC-79 (live-pool semantics) and per the existing `matchesScope` + `matchesSourceRecordIds` logic in `tools/world-mcp/src/tools/select-storylet-candidates.ts`, but lack golden-fixture verification. This is the spec-integration capstone (per `spec-to-tickets` SKILL.md §Spec-Integration Ticket Shape) — its scope IS SPEC-84 §6 Acceptance Criteria 1-7 plus §8 Verification Test Plan, exercising SPEC84REPBRASCO-001's fixture end-to-end against the existing `selectStoryletCandidates` retrieval pipeline.

## Assumption Reassessment (2026-05-25)

1. The materialize-and-build pattern at `tools/world-mcp/tests/integration/spec45-provenance-e2e.test.ts:226-236` is the established convention for testing MCP retrieval against a programmatically-built world-index DB: `createTempRepoRoot()` → write fixture records to disk → `build(root, WORLD_SLUG, { quiet: true })` (imported from `@worldloom/world-index/commands/build`) → `withRepoRoot(root, () => selectStoryletCandidates({...}))`. The retrieval logic under test lives at `tools/world-mcp/src/tools/select-storylet-candidates.ts` — specifically `matchesScope` (around lines 326-352) which handles `global_author_pool` / `branch_scoped` / `branch_prefix_scoped` cases, and `matchesSourceRecordIds` (around lines 391-409) which rejects global SLTs whose source-record edges include any story-bundle record class via `isStoryLocalRecordId` against the `RECORD_PREFIX_TO_CLASS` map (STENT/STPLAN/BEL/etc.). SPEC-84 §4.2 specifies that test assertions should target `filter_trace.after_scope` for scope-exclusion cases and `filter_trace.after_source_record_id` for the case-2 story-bundle-record-ref rejection — the existing per-stage counters in the returned trace suffice without a new rejection-sample mechanism.
2. The fixture at `tools/validators/tests/fixtures/spec84-replay-and-branch-scope/fixture.json` (created by SPEC84REPBRASCO-001) carries world canon + 2 branches + 5 PGs + 5 SLTs per SPEC-84 §4.1; consumed via cross-package path resolution from `tools/world-mcp/tests/integration/` analogous to how `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts:36-40` resolves its sibling fixture path. From `tools/world-mcp/tests/integration/`, the cross-package fixture lives at `path.resolve(import.meta.dirname, "../../../validators/tests/fixtures/spec84-replay-and-branch-scope/fixture.json")` (up three levels from `tools/world-mcp/tests/integration/` to `tools/`, then into `validators/tests/fixtures/...`).
3. Cross-artifact boundary under audit: this test composes three packages — (a) `@worldloom/world-index/commands/build` for materializing the temp DB (resolved via the `file:../world-index` workspace dependency in `tools/world-mcp/package.json`; the package exports `./commands/build` from `./dist/src/commands/build.js` per the world-index `package.json` exports map); (b) `tools/world-mcp/src/tools/select-storylet-candidates.ts` for the retrieval invocation; (c) `tools/validators/tests/fixtures/spec84-replay-and-branch-scope/fixture.json` for the input data. The build-order requirement: `(cd tools/world-index && npm run build)` must precede `(cd tools/world-mcp && npm run build)` because the world-mcp compiled test code imports from `@worldloom/world-index/commands/build` and the resolved path (`tools/world-index/dist/src/commands/build.js`) only exists after the world-index build. The `_shared.ts` test helpers under `tools/world-mcp/tests/tools/` provide `createTempRepoRoot()`, `destroyTempRepoRoot()`, and `withRepoRoot()` per SPEC-45 / SPEC-81 conventions.
4. FOUNDATIONS principles motivating this ticket: §Story Bundles §5 Rule 4 (story-scope branch isolation) is the primary principle the assertions exercise — cases 3, 4, 5 directly prove branch-scoped + branch-prefix-scoped isolation gates, and case 2 proves global-pool SLTs are subject to story-bundle-record-ref rejection at retrieval-time eligibility (preventing inadvertent cross-branch coupling through predicate refs). §Story Bundles §5c (no global drama manager) is preserved trivially — the test exercises the local-salience selection model, not a global planning pass. SPEC-84 §9 Risks #1 names a pre-existing FOUNDATIONS-vs-code divergence on the `bundle_genesis_record` exception (current `isStoryLocalRecordId` rejects ALL story-bundle refs uniformly; FOUNDATIONS §5 Rule 4 allows `bundle_genesis_record` refs); this test asserts current code behavior and does not adjudicate the divergence — a future spec routes per pattern (b) "Draft a NEW spec file" for adjudication.

## Architecture Check

1. The SPEC-45 materialize-and-build pattern (per `spec45-provenance-e2e.test.ts:226-236`) is the established convention for testing MCP retrieval against a programmatically-built world-index DB. Using this pattern keeps the test integrated with the actual `build()` API rather than bypassing it via direct DB seeding (which would test less surface — the SPEC-81 test's `seedWorld()` helper at `tools/world-mcp/tests/tools/_shared.ts` bypasses `build()` and tests only the post-index retrieval, missing any parse / hash / edge-extraction regression the build() path would surface). The capstone shape (one trailing ticket whose acceptance criteria enumerate SPEC-84 §6 ac 1-7 as test sub-cases; introduces no production code; exercises the pipeline composed by SPEC84REPBRASCO-001's fixture) follows the established worldloom pattern (SPEC-45 / SPEC-46 / SPEC-76 capstones).
2. No backwards-compatibility shims introduced — net-new test file; no prior version to alias.

## Verification Layers

1. Live-pool semantics (older PG-3 sees newer global SLT-2) → test case 1: SLT-2 present in `shortlisted_candidate_ids` from BR-1 fork at PG-5 (codebase grep-proof on the test assertion).
2. Global-pool story-bundle-record-ref rejection (SLT-3's STPLAN-99 predicate ref triggers `after_source_record_id` stage rejection) → test case 2: assertion on `filter_trace.after_source_record_id` count delta + SLT-3 absent from `shortlisted_candidate_ids` (FOUNDATIONS alignment check against §Story Bundles §5 Rule 4; pre-existing divergence on `bundle_genesis_record` exception noted in AR item 4).
3. Branch_scoped sibling isolation (SLT-4 with `branch_id: BR-2` excluded from BR-1 fork) → test case 3: assertion on `filter_trace.after_scope` count delta + SLT-4 absent.
4. Branch_prefix_scoped prefix-match positive (SLT-5 with `branch_path_prefix: [PG-1, PG-3]` visible from BR-1 fork at PG-5 whose `branch_path` is `[PG-1, PG-3, PG-5]`) → test case 4: SLT-5 present in `shortlisted_candidate_ids`.
5. Branch_prefix_scoped wrong-prefix negative (SLT-5 invisible from BR-2 fork at PG-4 whose `branch_path` is `[PG-1, PG-2, PG-4]`, no `[PG-1, PG-3]` prefix) → test case 5: assertion on `filter_trace.after_scope` count delta + SLT-5 absent.

## What to Change

### 1. Create test file

Create `tools/world-mcp/tests/integration/spec84-replay-and-branch-scope.test.ts` following the established test framework conventions (Node's built-in `test` runner via `node:test` + `node:assert/strict`).

### 2. Imports

```typescript
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { build } from "@worldloom/world-index/commands/build";

import { selectStoryletCandidates } from "../../src/tools/select-storylet-candidates.js";
import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "../tools/_shared.js";
```

### 3. Fixture interface + load helper

A `Spec84Fixture` interface modeled on `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts`'s `RedKilnFixture` shape:

```typescript
interface FixtureFile {
  path: string;
  content: string;
}

interface FixtureRecord {
  node_type: string;
  node_id: string;
  file_path: string;
  parsed: Record<string, unknown>;
}

interface Spec84Fixture {
  world_slug: string;
  story_slug: string;
  records: FixtureRecord[];
  files?: FixtureFile[];
}

const FIXTURE_PATH = path.resolve(
  import.meta.dirname,
  "../../../validators/tests/fixtures/spec84-replay-and-branch-scope/fixture.json"
);

function loadFixture(): Spec84Fixture {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as Spec84Fixture;
}
```

### 4. Materialize-and-build helper

A per-test setup function paralleling `withSpec45World` from `spec45-provenance-e2e.test.ts:226-236`:

```typescript
function materializeFixture(root: string, fixture: Spec84Fixture): void {
  for (const record of fixture.records) {
    const absolutePath = path.join(root, "worlds", fixture.world_slug, record.file_path);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    // Write the parsed record as YAML per the file_path's expected shape; reuse
    // the same serialization helper red-kiln-ambush.test.ts uses, or inline a
    // minimal YAML emitter for the structurally-flat shapes in this fixture.
  }
  for (const file of fixture.files ?? []) {
    const absolutePath = path.join(root, "worlds", fixture.world_slug, file.path);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, file.content, "utf8");
  }
}

async function withSpec84World<T>(
  run: (root: string, fixture: Spec84Fixture) => Promise<T>
): Promise<T> {
  const root = createTempRepoRoot();
  try {
    const fixture = loadFixture();
    materializeFixture(root, fixture);
    assert.equal(build(root, fixture.world_slug, { quiet: true }), 0);
    return await run(root, fixture);
  } finally {
    destroyTempRepoRoot(root);
  }
}
```

### 5. Five test cases for SPEC-84 §2 / §6 ac 2-6

Each case calls `selectStoryletCandidates` under `withRepoRoot` and asserts on `shortlisted_candidate_ids` plus the relevant `filter_trace` counter delta:

- **Case 1 (positive replay; spec §6 ac 2)**: BR-1 fork at PG-5, player driver → assert SLT-2 present in `shortlisted_candidate_ids`.
- **Case 2 (negative replay via story-bundle-record-ref; spec §6 ac 3)**: BR-1 fork at PG-5, player driver → assert SLT-3 absent + `filter_trace.after_source_record_id` count drop attributable to SLT-3 (the count strictly decreases between `after_predicate_class` and `after_source_record_id`, and SLT-3 is the only SLT carrying a story-bundle-record predicate ref in this fixture).
- **Case 3 (branch_scoped sibling exclusion; spec §6 ac 4)**: BR-1 fork at PG-5, player driver → assert SLT-4 absent + `filter_trace.after_scope` count drop attributable to SLT-4.
- **Case 4 (branch_prefix prefix-match positive; spec §6 ac 5)**: BR-1 fork at PG-5, player driver → assert SLT-5 present in `shortlisted_candidate_ids`.
- **Case 5 (branch_prefix wrong-prefix negative; spec §6 ac 6)**: BR-2 fork at PG-4, player driver → assert SLT-5 absent + `filter_trace.after_scope` count drop attributable to SLT-5.

### 6. Optional sanity assertion for spec §6 ac 1

The "fixture parses through `world-index build` cleanly" criterion is verified implicitly by the `build(root, fixture.world_slug, { quiet: true })` call returning 0 inside `withSpec84World` — a schema-rejection would surface as a non-zero exit code and trip the `assert.equal(..., 0)` at setup time before any case runs.

## Files to Touch

- `tools/world-mcp/tests/integration/spec84-replay-and-branch-scope.test.ts` (new)

## Out of Scope

- Fixture authoring (lives in SPEC84REPBRASCO-001).
- Production code changes to `select-storylet-candidates.ts` — this ticket VERIFIES existing behavior; any failure indicates a bug in `matchesScope` or `matchesSourceRecordIds`, not a deficiency in the test (per SPEC-84 §4.3).
- New validator additions or rejection-sample mechanisms (per SPEC-84 §3 Non-goals — existing per-stage counters in `filter_trace` suffice for assertion).
- Named branch-leakage diagnostic codes (`branch_scoped_storylet_leak`, `branch_prefix_storylet_leak`, `branch_prefix_storylet_wrong_prefix` per source brainstorm SPEC-85 AC 4; deferred per SPEC-84 §3 — `filter_trace.after_scope` counter-drop suffices for diagnosing branch leakage in the assertions).
- Adjudication of the FOUNDATIONS §5 Rule 4 vs `isStoryLocalRecordId` divergence noted in SPEC-84 §9 Risks #1 — this test asserts current code behavior; the divergence routes to a future spec (pattern (b) "Draft a NEW spec file" per cross-spec follow-up).
- A dedicated regression test asserting no `CHC.associated_commitment_block` field is used (per SPEC-84 §3 — implicit per SPEC-79's field removal).

## Acceptance Criteria

### Tests That Must Pass

1. `(cd tools/world-index && npm run build) && (cd tools/world-mcp && npm run build && node --test "dist/tests/integration/spec84-replay-and-branch-scope.test.js")` — all five test cases pass per SPEC-84 §6 ac 2-6 (primary correctness gate per SPEC-84 §8 step 1; world-index build must precede because the test imports `@worldloom/world-index/commands/build`).
2. `(cd tools/world-mcp && npm test)` — full world-mcp test suite passes; regression check against SPEC-81 `spec81-storylet-candidate-retrieval.test.ts` (per SPEC-84 §8 step 2: the new fixture must not perturb SPEC-81's existing branch-scope projection coverage at the synthetic-row layer).
3. `(cd tools/world-mcp && npm run build)` — clean TypeScript build (covers typecheck portion of SPEC-84 §8 step 3; no `lint` script exists in the worldloom tooling layer per SPEC-83 ticket precedent — `npm run build` is the closest substitute for the spec's `pnpm turbo lint typecheck` Verification command; the lint portion drops as no-such-tooling).

### Invariants

1. SPEC-84 §6 ac 1 (fixture parses through `world-index build` cleanly) — verified at test setup time by the `build()` call inside `withSpec84World`; any schema rejection surfaces as a test setup failure (`assert.equal(build(...), 0)` trips) with stage-named error output.
2. The test never mutates real `worlds/<slug>/` canon — `withSpec84World` uses `createTempRepoRoot()` per the SPEC-45 materialize-and-build pattern, so the fixture lives only in `os.tmpdir()` for the duration of the test and is cleaned up in the `finally` block via `destroyTempRepoRoot`.
3. Test case assertions reference SPEC-84 §4.1-authored constants by their fixture-defined names (SLT-1 through SLT-5, BR-1, BR-2, PG-1 through PG-5, STPLAN-99) rather than positional indices into the fixture's records array — the assertion text reads against the spec's case enumeration, not against fixture-implementation accidents.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/integration/spec84-replay-and-branch-scope.test.ts` (new) — capstone integration test for SPEC-84 §6 ac 2-6, structured as five test cases per the five §2 scenarios; uses SPEC-45 materialize-and-build pattern; reads cross-package fixture from `tools/validators/tests/fixtures/spec84-replay-and-branch-scope/` (created by SPEC84REPBRASCO-001).

### Commands

1. `(cd tools/world-index && npm run build) && (cd tools/world-mcp && npm run build && node --test "dist/tests/integration/spec84-replay-and-branch-scope.test.js")` — targeted run of the new capstone test file (primary correctness gate per SPEC-84 §8 step 1; the world-index build precedes because the test imports `@worldloom/world-index/commands/build` whose compiled path requires the world-index dist tree).
2. `(cd tools/world-mcp && npm test)` — full world-mcp suite (runs build + every `dist/tests/**/*.test.js`); verifies the new capstone passes alongside SPEC-81's existing `spec81-storylet-candidate-retrieval.test.ts` (per SPEC-84 §8 step 2 regression check).
3. `(cd tools/world-mcp && npm run build)` — clean TypeScript build (covers typecheck via tsc). The worldloom tooling layer has no separate `lint` script (no eslint config exists across the repo); `npm run build` is the closest substitute for the spec's `pnpm turbo lint typecheck` Verification command per SPEC-83 ticket precedent — build verification covers the typecheck portion; the lint portion drops as no-such-tooling.
