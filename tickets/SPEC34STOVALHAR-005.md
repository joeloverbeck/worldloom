# SPEC34STOVALHAR-005: Integration sanity across all four new validators

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — adds an integration fixture story-bundle under `tools/validators/tests/integration/` (or equivalent under the existing tests/ layout) exercising all four new validators end-to-end via the `world-validate` CLI. No new production code; no impact on existing validators.
**Deps**: archive/tickets/SPEC34STOVALHAR-001.md, archive/tickets/SPEC34STOVALHAR-002.md, SPEC34STOVALHAR-003, SPEC34STOVALHAR-004

## Problem

SPEC-34 §Verification item 5 requires `cd tools/validators && npm run test` (full suite) to pass — confirming no sibling validator regresses due to the four new validators registering. §Verification item 6 requires *"a fixture story-bundle exercising at least one PASS and one FAIL case across all four validators is validated end-to-end via `world-validate` CLI; the FAIL diagnostics match the expected diagnostic codes."* This integration ticket carries those two acceptance bullets — it does not re-implement any validator logic; it verifies the four pre-implementation tickets land coherently when exercised together through the CLI.

## Assumption Reassessment (2026-05-16)

1. `tools/validators/dist/src/cli/world-validate.js` exists as the CLI entry point (verified during `/reassess-spec` this session via SPEC-34 line 43 reference); the `build` script at `tools/validators/package.json` produces `dist/src/cli/world-validate.js` and `chmod +x`'s it. The CLI is the existing surface the four new validators register into; no CLI changes are in scope.
2. SPEC-34 §Verification (lines 271-280) is the authoritative spec section for this ticket's acceptance contract. The four upstream tickets (001-004) produce the four validators; this ticket exercises them through a fixture story-bundle and the existing CLI without touching production code.
3. Shared boundary under audit: (i) `tools/validators/src/public/registry.ts` `structuralValidators` array — after all four upstream tickets land, the array grows from 16 to 20 entries (verified at audit time); the integration test exercises the full registered set via CLI invocation, not direct validator imports. (ii) the fixture story-bundle's location and shape — preferred path `tools/validators/tests/fixtures/spec34-integration/` to match existing fixture layout under `tools/validators/tests/structural/`; the fixture is a minimal world directory exercising at least one PASS and one FAIL case per validator.
4. FOUNDATIONS principle motivating this ticket — §Tooling Recommendation (per FOUNDATIONS.md): *"LLM agents should never operate on prose alone."* Validators are the executable enforcement layer of this commitment for story-bundle state. The integration ticket confirms the four new validators are exercisable as a coherent set through the same CLI surface skills and CI workflows depend on.
5. Mismatch + correction: spec §Verification items 5 and 6 use the shape `cd tools/validators && npm run test` which works as-is (no `--grep` flag; runs the full node:test suite). The integration fixture is invoked via the CLI separately: `cd tools/validators && node dist/src/cli/world-validate.js <fixture-world-path>`. No mechanical drift correction needed here; the CLI invocation is direct.

## Architecture Check

1. Single trailing integration ticket (rather than per-validator integration testing within each upstream ticket) is cleaner because per-validator integration testing would duplicate CLI-invocation boilerplate four times; consolidating into one trailing ticket exercises the registered-set composition that the upstream tickets cannot individually validate. The four upstream tickets each verify their own validator via direct node:test invocations; this ticket verifies the CLI-integration surface where all 20 structural validators run together.
2. No backwards-compatibility aliasing/shims introduced. Test-only ticket; no production code touched.

## Verification Layers

1. **Full validators suite green after registry expansion** → command (`cd tools/validators && npm run test`) — confirms no sibling validator regresses due to the four new entries in `structuralValidators`.
2. **Fixture story-bundle PASS cases across all four validators** → CLI invocation against a fixture world with valid records → exit code 0; no FAIL diagnostics in stdout.
3. **Fixture story-bundle FAIL cases across all four validators** → CLI invocation against a fixture world deliberately exercising one FAIL per validator → exit code non-zero; stdout contains all four expected diagnostic codes (`branch_isolation_violation`, `observer_firewall_violation_actor_lacks_access` or any of D2's variants, `lie_promoted_silently`, `canon_baseline_drift_window_incomplete` or `_unclassified` or `_classification_invalid`).
4. **FOUNDATIONS alignment** → §Tooling Recommendation: the integration ticket exercises the validator framework as the executable Rule-4 / §6a / §6b / §4b enforcement surface; passes the *"validators run via `world-validate`"* commitment per spec §Approach line 43.

## What to Change

### 1. Integration fixture story-bundle

Create `tools/validators/tests/fixtures/spec34-integration/` (path subject to fitting the existing fixture layout — adjust if the project's fixtures live elsewhere; verify against `tools/validators/tests/` directory at implementation time):

- A minimal world directory (`worlds/spec34-integration/` shape under the fixture root) containing:
  - `_source/canon/CF-1.yaml`, `_source/change-log/CH-1.yaml` … CH-N as needed for D4's CH-window cases.
  - `stories/test-bundle/_source/` with the story-bundle subdirs (`branches/`, `pages/`, `storylets/`, `facts/`, `beliefs/`, `events/`, `choices/`, plus the other story-bundle classes that the validators reference).
- The fixture records collectively trip at least one FAIL per validator: a sibling-branch reference for D1, a private-BEL leak or no-access-route for D2, an unlawful BEL→SF promotion for D3, and a missing CH-window classification for D4. PASS cases for each validator are also represented (e.g., a separate PG that classifies drift correctly to satisfy D4's PASS path).

### 2. Integration test or test driver

Create `tools/validators/tests/integration/spec34-integration.test.ts` (or equivalent) that:

- Invokes `node dist/src/cli/world-validate.js` against the fixture world root.
- Asserts on the JSON or text output: at least one diagnostic with each of the four expected codes when run against the FAIL fixture; zero diagnostics when run against the PASS-only subset.
- Re-enumerates expected counts from the fixture rather than hardcoding (per `spec-to-tickets/SKILL.md` §Spec-Integration Ticket Shape "re-enumerate expected counts (not hardcoded)").

### 3. Fixture world copy strategy

Per `spec-to-tickets/SKILL.md` §Spec-Integration Ticket Shape "fixture-world copy strategy": if the fixture would be mutated by validator runs (it should not be — validators are read-only — but as a discipline matter), the test should `fs.cpSync` the fixture to a temp root and run the CLI against the copy. The fixture under `tests/fixtures/` is the canonical source; the temp copy is the run target.

## Files to Touch

- `tools/validators/tests/fixtures/spec34-integration/` (new directory tree — fixture world)
- `tools/validators/tests/integration/spec34-integration.test.ts` (new — test driver invoking the CLI) — adjust path to match existing project layout if `tests/integration/` does not yet exist; coordinate with sibling test layout at implementation time.

## Out of Scope

- Modifying any of the four validator implementations (D1 covered by `archive/tickets/SPEC34STOVALHAR-001.md`; D2 covered by `archive/tickets/SPEC34STOVALHAR-002.md`; D3-D4 covered by SPEC34STOVALHAR-003 through SPEC34STOVALHAR-004).
- Modifying the `world-validate` CLI itself — the integration ticket exercises the CLI as-is.
- Wall-clock performance assertions — spec §Verification names no performance gate for SPEC-34's validators; performance is a deferred concern per spec §Risks line 303 (CH-window traversal).
- Additional fixture cases beyond the "at least one PASS and one FAIL per validator" spec floor — broader fixture coverage belongs in each upstream ticket's own per-validator node:test fixture.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run test` — full suite green (all existing 16 validators + 4 new validators' tests + this integration test).
2. `cd tools/validators && node dist/src/cli/world-validate.js tests/fixtures/spec34-integration/world-pass/` — exit code 0; no FAIL diagnostics in stdout.
3. `cd tools/validators && node dist/src/cli/world-validate.js tests/fixtures/spec34-integration/world-fail/` — exit code non-zero; stdout contains diagnostic codes from each of the four new validators (one per validator minimum, per spec §Verification item 6).

### Invariants

1. All 20 structural validators (16 existing + 4 new) register cleanly in `structuralValidators` and run on the fixture world without throwing — no integration-time crash from the registry expansion.
2. Each new validator's diagnostic code appears in the CLI's stdout when the fixture world deliberately exercises its FAIL path; absent codes from the FAIL run indicate the validator did not register or did not fire on the relevant patch trigger.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/fixtures/spec34-integration/` (new directory tree) — fixture world exercising one PASS + one FAIL per new validator.
2. `tools/validators/tests/integration/spec34-integration.test.ts` (new) — test driver invoking `world-validate` CLI against the fixture and asserting diagnostic-code presence/absence.

### Commands

1. `cd tools/validators && npm run build` (prerequisite — produces `dist/src/cli/world-validate.js`)
2. `cd tools/validators && node --test dist/tests/integration/spec34-integration.test.js` (targeted — runs the integration driver)
3. `cd tools/validators && npm run test` (full suite — confirms no regressions and that the integration test runs alongside the per-validator node:test fixtures from upstream tickets)
