# SPEC43PRECAUSTO-017: Capstone Integration Test — SPEC-43 §Verification

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new integration test file at `tools/validators/tests/integration/spec43-midstory-introduction.test.ts` exercising every SPEC-43 §Verification bullet end-to-end across all introduction validators + compatibility-drift reporting + snapshot normalization + observer firewall + future-shape rejection. Also updates `tools/validators/src/structural/midstory-record-introduction-grounding.ts` so legacy/root and pre-current-contract pages are grandfathered rather than treated as mid-story introduction failures. Uses ticket 002's synthetic fixtures PLUS a fixture-world copy of `worlds/erotica-world/stories/red-bunny/` for the backwards-compatibility verification.
**Deps**: archive/tickets/SPEC43PRECAUSTO-014.md, archive/tickets/SPEC43PRECAUSTO-015.md, archive/tickets/SPEC43PRECAUSTO-016.md

## Problem

SPEC-43 §Verification enumerates 18 distinct behaviors that must all hold once SPEC-43 ships:

1. Mid-story `CLK` creation passes (deadline declared + grounding + tag + active_records).
2. Vague-pressure `CLK` fails (`clock_intro_missing_grounding_link`).
3. Existing-clock tick remains valid.
4. Mid-story `STSEC` creation passes.
5. Author-only-future-twist `STSEC` fails.
6. Mid-story `STQ` creation passes.
7. Future-shape `STQ` fails (`narrative_shape_forbidden_field`).
8. Future-shape `CLK` / `STSEC` / `THR` / `SREL` / `STENT` fail (per-class).
9. New `STENT` + same-event `STSTAT` passes.
10. New `STENT` without `STSTAT` fails (`entity_intro_missing_status`).
11. Existing-entity status update does NOT trigger pairing requirement.
12. New `SREL` creation passes.
13. Believed-only relationship as `SREL` fails or warns.
14. New `THR` creation passes.
15. Thematic `THR` fails.
16. Choice grounded in freshly-introduced record fails observer-firewall when actor lacks explicit access route.
17. Absence of optional `CLK` / `STSEC` / `STQ` remains valid (health-audit emits no finding for absence; re-affirms Phase 2i rule).
18. Old-style `PG.active_records` compatibility drift reported (info); replay normalizes missing keys to `[]`; new child PG emits full map.
19. `red-bunny` bundle passes `world-validate --story red-bunny` cleanly + emits `compatible_optional_absence` + `grandfathered_snapshot_shape` classifications in compatibility-mode audit.
20. Compatibility repair does NOT create fiction (pure scan writes SAU/SCMP only; no SE/PG mutation; no automatic CLK/STSEC/STQ creation).

Per-validator unit tests (tickets 003-012) cover individual behaviors. A capstone integration test verifies these behaviors compose correctly — every validator runs in the expected order, every cross-validator interaction holds, and the full pipeline produces the documented outputs on the real-world red-bunny case study. Without this capstone, individual validator passes do not prove the end-to-end pipeline works.

## Assumption Reassessment (2026-05-18)

1. `tools/validators/tests/integration/` directory exists (verified via `ls tools/validators/tests/`); existing integration tests live here (per the SPEC-08 + SPEC-42 capstone patterns). The new capstone follows the §Spec-Integration Ticket Shape: re-enumerated expected counts computed from fixtures at test start, one assertion per spec §Verification bullet, fixture-world copy strategy keeping real `worlds/erotica-world/stories/red-bunny/` untouched (`fs.cpSync` to a temp root per the standard pattern).
2. SPEC-43 §Verification has 20 bullets (the user-facing summary I generated; the spec file enumerates the 18 most-distinct cases). Each becomes a sub-test in the capstone. The fixture-world copy strategy uses `fs.cpSync(actualBundlePath, tempPath)` then runs `world-validate --story red-bunny` against the temp path so the real bundle is never mutated.
3. Cross-skill boundary under audit: this capstone exercises the FULL pipeline composed by tickets 003-016 — every introduction validator, compatibility-drift, snapshot normalization, observer firewall, narrative-shape rejection, plus turn-cycle skill amendments (013/014) + new reference file (015) + health-audit amendments (016). The capstone is the gate that proves the parts compose correctly.
4. FOUNDATIONS §Story Bundles §5c (Present Causal State, Not Narrative Shape) restated: the capstone's narrative-shape rejection sub-tests (bullets 7-8) are the canonical end-to-end §5c enforcement check. A capstone pass means no narrative-shape field leaks through any record class at engine pre-apply time; a capstone fail surfaces the leak path immediately.
5. HARD-GATE / Canon Safety surface: the capstone exercises Phase 9 gating end-to-end. The change does not add new gates (those land in ticket 013); it verifies the gates compose with each other + with existing validators (observer-firewall, secret-mystery-firewall-compliance, record-schema-compliance) without conflict.
6. Live reassessment exposed one same-seam compatibility gap before closeout: `midstory_record_introduction_grounding` correctly ignored `story_start`/`PG-1` root-bootstrap creates after this run, but still treated legacy red-bunny non-root pages whose `PG.state_snapshot.active_records` omitted current optional `CLK` / `STSEC` / `STQ` keys as current-contract mid-story creates. That contradicted SPEC-43's backwards-compatibility goal and the `compatibility_drift` classification, so this ticket also landed a narrow validator grandfathering guard for pages with legacy optional-key absence.
7. The executable capstone uses the live validator codes. The STQ future-shape rejection is `record_schema_compliance.stq_prohibited_expected_payoff_mode`; the per-class non-STQ future-shape rejection remains `narrative_shape_forbidden_field`. The believed-only SREL fixture currently fails with `srel_intro_missing_derived_from` rather than warning, which is allowed by SPEC-43's fail/warn table. The thematic THR fixture emits `thread_intro_missing_derived_from` for the empty `derived_from[]` case.

## Architecture Check

1. Cleaner than alternative #1 (rely on per-validator unit tests only): per-validator tests prove each gate works in isolation; they do not prove the gates compose correctly OR that the red-bunny backwards-compatibility case actually passes. The capstone is the integration-level verification.
2. Cleaner than alternative #2 (test each §Verification bullet in its own integration file): SPEC-43's verification bullets cluster around shared pipeline state (introduction validators + compatibility drift + snapshot normalization + observer firewall + narrative-shape rejection). A single capstone test file with sub-tests per bullet keeps fixture loading + pipeline setup centralized.
3. No backwards-compatibility aliasing/shims introduced: purely additive new integration test.

## Verification Layers

1. Per-bullet test coverage → codebase grep-proof: `grep -cE "^\s*(test|it)\(" tools/validators/tests/integration/spec43-midstory-introduction.test.ts` returns ≥18 (one sub-test per spec §Verification bullet).
2. red-bunny pass → integration test execution: the red-bunny sub-test passes (returns clean exit + expected `compatible_optional_absence` + `grandfathered_snapshot_shape` classifications).
3. Per-validator composition → integration test execution: a fixture exercising multiple validators (e.g., a fresh CLK with future-shape field AND missing grounding) surfaces failures from MULTIPLE validators simultaneously, demonstrating gate composition.
4. FOUNDATIONS §5c alignment → FOUNDATIONS alignment check: the narrative-shape rejection sub-tests confirm no future-shape leakage at engine pre-apply time across all 6 record classes.

## What to Change

### 1. Create `tools/validators/tests/integration/spec43-midstory-introduction.test.ts`

Test structure (per §Spec-Integration Ticket Shape):

```typescript
// Pseudocode shape — implementer fills in concrete test runner syntax (node:test format per package convention)
import { describe, before, after, test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("SPEC-43 midstory introduction capstone", () => {
  let tempRoot: string;

  before(() => {
    // Fixture-world copy strategy: copy red-bunny + synthetic fixtures into temp root so real bundles are untouched
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "spec43-capstone-"));
    fs.cpSync("worlds/erotica-world/stories/red-bunny", path.join(tempRoot, "worlds/erotica-world/stories/red-bunny"), { recursive: true });
    fs.cpSync("tools/validators/tests/fixtures/midstory-introduction", path.join(tempRoot, "fixtures/midstory-introduction"), { recursive: true });
  });

  after(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  // Per-bullet sub-tests (18+):

  test("§Verification bullet 1: mid-story CLK creation passes", () => { /* ... */ });
  test("§Verification bullet 2: vague-pressure CLK fails with clock_intro_missing_grounding_link", () => { /* ... */ });
  test("§Verification bullet 3: existing-clock tick remains valid", () => { /* ... */ });
  test("§Verification bullet 4: mid-story STSEC creation passes", () => { /* ... */ });
  test("§Verification bullet 5: author-only-future-twist STSEC fails", () => { /* ... */ });
  test("§Verification bullet 6: mid-story STQ creation passes", () => { /* ... */ });
  test("§Verification bullet 7: future-shape STQ fails (narrative_shape_forbidden_field)", () => { /* ... */ });
  test("§Verification bullet 8: future-shape CLK/STSEC/THR/SREL/STENT fail per-class", () => { /* ... */ });
  test("§Verification bullet 9: new STENT + same-event STSTAT passes", () => { /* ... */ });
  test("§Verification bullet 10: new STENT without STSTAT fails", () => { /* ... */ });
  test("§Verification bullet 11: existing-entity status update does NOT trigger pairing", () => { /* ... */ });
  test("§Verification bullet 12: new SREL creation passes", () => { /* ... */ });
  test("§Verification bullet 13: believed-only relationship SREL fails or warns", () => { /* ... */ });
  test("§Verification bullet 14: new THR creation passes", () => { /* ... */ });
  test("§Verification bullet 15: thematic THR fails", () => { /* ... */ });
  test("§Verification bullet 16: choice grounded in fresh record fails observer firewall without access route", () => { /* ... */ });
  test("§Verification bullet 17: absence of optional CLK/STSEC/STQ remains valid (Phase 2i rule)", () => { /* ... */ });
  test("§Verification bullet 18: old-style PG compatibility drift reported (info); replay normalizes; new child PG emits full map", () => { /* ... */ });
  test("§Verification bullet 19: red-bunny bundle passes world-validate cleanly + emits expected compatibility classifications", () => {
    // The empirical backwards-compatibility verification — copies red-bunny to temp, runs CLI
    const redBunnyPath = path.join(tempRoot, "worlds/erotica-world/stories/red-bunny");
    // ... shell out to world-validate or invoke programmatically
  });
  test("§Verification bullet 20: compatibility scan writes audit only — no SE/PG mutation, no auto CLK/STSEC/STQ creation", () => { /* ... */ });
});
```

Re-enumerated expected counts computed from fixtures at test start (not hardcoded — per §Spec-Integration Ticket Shape best practice). Per-test fixtures load via the existing `tools/validators/tests/_helpers/` loader (parallel to other integration tests).

### 2. Wall-clock perf assertion

SPEC-43 does not name an explicit performance gate, so no perf assertion is added in this ticket. (If future authoring surfaces a per-bundle validation-time regression, a perf gate can be added in a follow-up.)

## Files to Touch

- `tools/validators/tests/integration/spec43-midstory-introduction.test.ts` (new)
- `tools/validators/src/structural/midstory-record-introduction-grounding.ts` (modify — grandfather root/bootstrap and legacy compatibility-era pages)

## Out of Scope

- Per-validator unit tests — already covered by tickets 003-012.
- Skill prose verification — already covered by tickets 013-016's grep-proofs.
- Wave 3 work (dedicated repair skill, contract marker, CLK linked_records widening, hard-fail severity for compatibility-drift, private batch tooling) — explicitly out of scope per SPEC-43 §Out of Scope.
- Modifying the real `worlds/erotica-world/stories/red-bunny/` bundle — the capstone uses a fixture-world copy.

## Acceptance Criteria

### Tests That Must Pass

1. `node --test dist/tests/integration/spec43-midstory-introduction.test.js` from `tools/validators` after `npm run build` (targeted capstone test file passes — all 18+ sub-tests).
2. `npm test --prefix tools/validators` (full validator package test pass including the new capstone).
3. `grep -cE "^\s*(test|it)\(" tools/validators/tests/integration/spec43-midstory-introduction.test.ts` returns ≥18 (one sub-test per spec §Verification bullet).
4. `grep -n "red-bunny\|compatible_optional_absence\|grandfathered_snapshot_shape" tools/validators/tests/integration/spec43-midstory-introduction.test.ts` returns the red-bunny sub-test setup + classification assertions.
5. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json` exits 0 with `fail_count: 0` and compatibility-drift info classifications only.

### Invariants

1. The capstone NEVER mutates the real `worlds/erotica-world/stories/red-bunny/` bundle — all operations run against the temp-root copy (`fs.cpSync` + `fs.rmSync` cleanup).
2. Per-bullet sub-tests are independent — a failure in one sub-test does not cascade-fail others (each sub-test loads its own fixture state).
3. Expected counts (number of records, number of findings) are RE-ENUMERATED from the fixture at test start, not hardcoded — keeps the test valid as fixtures evolve.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec43-midstory-introduction.test.ts` — 18+ sub-tests per §What to Change item 1; one per SPEC-43 §Verification bullet.

### Commands

1. `npm run build` from `tools/validators`.
2. `node --test dist/tests/integration/spec43-midstory-introduction.test.js` from `tools/validators` (targeted capstone test pass).
3. `npm test --prefix tools/validators -- spec43-midstory-introduction` (wrapper pass; live package script runs the full validators suite, not a narrow selector).
4. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json` (sanity-runs the CLI against the actual bundle; expected clean exit + info-only compatibility drift).

## Outcome

Completed: 2026-05-18

Landed `tools/validators/tests/integration/spec43-midstory-introduction.test.ts` with 21 `node:test` subtests: one per SPEC-43 §Verification bullet plus a shared pass-fixture composition test for the Wave 2 introduction validators. The test composes the already-landed validator implementations and fixture corpus rather than duplicating validator logic.

Updated `midstory_record_introduction_grounding` to skip `story_start` / `PG-1` root bootstrap events and legacy compatibility-era child pages whose active-record map omits the current optional `CLK` / `STSEC` / `STQ` keys. This preserves SPEC-43's compatibility promise for pre-SPEC-43 bundles while still enforcing intro tags on current-contract pages that materialize the full active-record map.

## Verification Result

1. `npm run build` from `tools/validators` passed.
2. `node --test dist/tests/integration/spec43-midstory-introduction.test.js` from `tools/validators` passed: 21 tests, 21 pass.
3. `npm test --prefix tools/validators -- spec43-midstory-introduction` passed. The package script rebuilt and ran the full validators suite: 504 tests, 504 pass.
4. `grep -cE "^\s*(test|it)\(" tools/validators/tests/integration/spec43-midstory-introduction.test.ts` returned `21`.
5. `grep -n "red-bunny\|compatible_optional_absence\|grandfathered_snapshot_shape" tools/validators/tests/integration/spec43-midstory-introduction.test.ts` returned the temp-copy red-bunny subtest and classification assertions.
6. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json` exited 0 with `fail_count: 0`, `warn_count: 0`, `info_count: 10`, and classifications `compatible_optional_absence` plus `grandfathered_snapshot_shape`.

## Deviations

1. The drafted `npm test --prefix tools/validators -- spec43-midstory-introduction` command is not a narrow selector in the live package script. It appends the token after `node --test dist/tests/**/*.test.js` and still runs the full validators suite. The accepted targeted proof is therefore `npm run build` followed by `node --test dist/tests/integration/spec43-midstory-introduction.test.js`; the wrapper remains useful as broad proof and passed.
2. The capstone uses live failure codes rather than stale draft shorthand: STQ future-shape rejection is proven through `record_schema_compliance.stq_prohibited_expected_payoff_mode`; non-STQ future-shape classes use `narrative_shape_forbidden_field`; empty THR `derived_from[]` emits `thread_intro_missing_derived_from`; believed-only SREL currently fails with `srel_intro_missing_derived_from`.
3. The live red-bunny smoke initially exposed same-seam over-enforcement in `midstory_record_introduction_grounding` against legacy compatibility-era pages. The validator was narrowed to skip root/bootstrap events and legacy optional-key-absence pages before final proof, matching SPEC-43's backwards-compatibility boundary.
