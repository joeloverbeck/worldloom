# SPEC34STOVALHAR-003: lie_promoted_silently structural validator

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — new structural validator at `tools/validators/src/structural/lie-promoted-silently.ts`; new test fixture at `tools/validators/tests/structural/lie-promoted-silently.test.ts`; one-line registry append at `tools/validators/src/public/registry.ts`. No impact on existing validators.
**Deps**: None

## Problem

FOUNDATIONS §Story Bundles §6a (Belief vs. Fact) requires `SF` records (branch truth) and `BEL` records (belief / claim / witness / lie) to remain separate so that *"lies, secrets, betrayals, witness asymmetry, and contested public claims remain coherent."* The lawful path for converting a counterfactual or false BEL into branch state is `SF.authority: branch_local_counterfactual` (explicit marker). The audit-failing pattern is BEL with `truth_relation ∈ {false, partly_true, contested, branch_counterfactual}` silently promoted to `SF.authority ∈ {branch_local, canon_candidate, canon_linked}` without the counterfactual marker — this collapses the belief/fact boundary. Audit `reports/story-related-improvements-seventh-iteration.md` §11.3 line 855 names `belief_fact_separation_lies_rumors` as the test mapping to `lie_promoted_silently`.

## Assumption Reassessment (2026-05-16)

1. `tools/validators/src/structural/` exists with 17 sibling validators after `archive/tickets/SPEC34STOVALHAR-001.md` landed `branch_isolation`; new file `lie-promoted-silently.ts` is additive — no naming collision. The existing `tools/validators/src/structural/story-fact-authority.ts` enforces one related-but-orthogonal invariant: `SF.authority == canon_linked` requires a CF in `derived_from` (verified at `story-fact-authority.ts:18-31` during reassess-spec).
2. SPEC-34 §D3 (lines 160-198) is the authoritative spec section; `/reassess-spec` added the §Boundary with `story-fact-authority.ts` clause (line 170) explicitly distinguishing D3's stricter check from the existing canon_linked-CF-presence check. SF schema confirmed: `derived_from: [CF-<integer> | <story-local record id>]` per contract §4.5.3 line 487; `authority ∈ {branch_local, branch_local_counterfactual, canon_candidate, canon_linked}` per contract §4.5.3 line 486. BEL schema confirmed: `truth_relation ∈ {true, false, partly_true, unknown, contested, branch_counterfactual, future_contingent}` per contract §4.1 line 76.
3. Shared boundary under audit: (i) `tools/validators/src/public/registry.ts` `structuralValidators` array (line 29) — registered via import + array-append matching sibling pattern; (ii) `tools/validators/src/structural/story-fact-authority.ts` — complementary validator on the same `SF` record class; their respective `applies_to` predicates both trigger on `create_sf_record` so both run on the same patch plans, and their diagnostic codes are namespace-distinct (`story_fact_authority.canon_linked_missing_cf_parent` vs `lie_promoted_silently`).
4. FOUNDATIONS principle motivating this ticket — §Story Bundles §6a (Belief vs. Fact): `truth_relation` distinguishes belief from truth; lawful authority for promoting a non-true BEL to branch state is `branch_local_counterfactual` only. Indirectly aligns with Rule 6 (No Silent Retcons) per FOUNDATIONS.md — `lie_promoted_silently` catches one class of silent retcon (silent belief-to-fact authority promotion); other Rule 6 surfaces remain `canon-addition`'s responsibility.
5. Adjacent contradiction noted at reassess-spec time: D3 Case 6 (`canon_linked` + `[CF-3, BEL-13]` where BEL-13 is counterfactual) would PASS the existing `story-fact-authority.ts` (CF-3 satisfies the CF-parent requirement) but FAIL D3 (counterfactual BEL is unlawful for canon_linked). Classified as **required consequence of this ticket** — the two validators are complementary by design per spec §D3 line 170 §Boundary clause; modest overlap on the canon_linked case is intended, not a bug to reconcile.
6. Mismatch + correction: spec §Verification item 3 cites `npm run test -- --grep 'lie-promoted-silently'` (Mocha syntax); the actual runner is node:test (`node --test dist/tests/**/*.test.js` per `tools/validators/package.json`). Corrected to direct invocation `node --test dist/tests/structural/lie-promoted-silently.test.js`. Mechanical drift; spec intent preserved.
7. Implementation hard-gate check: because `lie_promoted_silently.applies_to` runs for `create_sf_record` pre-apply patch plans, `docs/HARD-GATE-DISCIPLINE.md` was read before closeout. The validator preserves fail-closed behavior by emitting `severity: "fail"` under the normal validator framework; it does not add approval-token behavior, patch submission behavior, or any canon-write shortcut.
8. Same-package inventory fallout: registering the validator made existing validator inventory surfaces stale. `tools/validators/README.md`, `tools/validators/tests/structural/registry.test.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, and `tools/validators/tests/integration/validate-patch-plan.test.ts` were included as same-seam proof-surface updates.

## Architecture Check

1. Standalone validator (not extension of existing `story-fact-authority.ts`) is cleaner because the two validators check distinct invariants: `story-fact-authority.ts` asks *"does this canon-linked SF cite a CF?"*; D3 asks *"does any SF promoting from a non-true BEL carry the lawful `branch_local_counterfactual` authority?"*. Combining them in one file would couple orthogonal invariants and complicate fixture authoring; the modest overlap on the canon_linked case is by design (per Assumption Reassessment item 5).
2. No backwards-compatibility aliasing/shims introduced. Net-new validator; existing `story-fact-authority.ts` unchanged.

## Verification Layers

1. **SF.derived_from BEL-id detection** → codebase grep-proof (`grep -n 'derived_from\|truth_relation' tools/validators/src/structural/lie-promoted-silently.ts`) + node:test fixture Cases 1-3 prove no-BEL-PASS, lawful-counterfactual-PASS, true-BEL-PASS paths.
2. **Unlawful BEL→SF promotion detection** → fixture Cases 4-6 prove FAIL on `branch_local + false-BEL`, `canon_candidate + contested-BEL`, `canon_linked + branch_counterfactual-BEL`.
3. **Registry integration** → codebase grep-proof (`grep -n 'liePromotedSilently' tools/validators/src/public/registry.ts` returns import + array-entry).
4. **FOUNDATIONS alignment** → FOUNDATIONS.md §Story Bundles §6a (Belief vs. Fact) cited in implementation comments; §Boundary clause referencing `story-fact-authority.ts` documents the complementary-overlap design decision per spec §D3 line 170.

## What to Change

### 1. New validator implementation

Create `tools/validators/src/structural/lie-promoted-silently.ts` following the sibling pattern (especially `story-fact-authority.ts` for parallel `SF`-iteration shape):

- `severity_mode: "fail"`.
- `applies_to(ctx)`: `ctx.run_mode === "full-world" || ctx.patch_plan?.patches.some(p => p.op === "create_sf_record") === true || touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/facts\/SF-\d+\.yaml$/)`.
- Logic per SPEC-34 §D3 lines 174-181:
  - For each `SF-<integer>` record in the bundle:
    - If `SF.authority ∈ {branch_local, canon_candidate, canon_linked}`:
      - For each `record_id` in `SF.derived_from[]`:
        - If `record_id` matches `^BEL-\d+$`:
          - Look up the referenced BEL.
          - If `BEL.truth_relation ∈ {false, partly_true, contested, branch_counterfactual}`: emit `lie_promoted_silently`. Cite the SF, its `authority`, the BEL, and the BEL's `truth_relation`.
    - If `SF.authority == branch_local_counterfactual`: PASS regardless of BEL `truth_relation` (lawful counterfactual path).
    - If `SF.derived_from[]` contains only CF or SE record IDs (no BEL): PASS (not the BEL→SF promotion path).

### 2. Diagnostics

- `lie_promoted_silently` — fail. Cites the SF, its `authority`, the offending BEL in `derived_from[]`, and the BEL's `truth_relation`.

### 3. Test fixtures

Create `tools/validators/tests/structural/lie-promoted-silently.test.ts` with 6 cases per SPEC-34 §D3 lines 189-194:

- Case 1: SF `authority: branch_local`, `derived_from: [CF-1, SE-3]` (no BEL) → PASS.
- Case 2: SF `authority: branch_local_counterfactual`, `derived_from: [BEL-5]` (BEL-5 `truth_relation: false`) → PASS (lawful).
- Case 3: SF `authority: branch_local`, `derived_from: [BEL-7]` (BEL-7 `truth_relation: true`) → PASS (true belief promoted to fact is lawful).
- Case 4: SF `authority: branch_local`, `derived_from: [BEL-9]` (BEL-9 `truth_relation: false`) → FAIL with `lie_promoted_silently`.
- Case 5: SF `authority: canon_candidate`, `derived_from: [BEL-11]` (BEL-11 `truth_relation: contested`) → FAIL with `lie_promoted_silently`.
- Case 6: SF `authority: canon_linked`, `derived_from: [CF-3, BEL-13]` (BEL-13 `truth_relation: branch_counterfactual`) → FAIL with `lie_promoted_silently` (worst-case silent retcon; passes existing `story-fact-authority.ts` because CF-3 satisfies CF-parent rule but FAILs D3).

### 4. Registry append

Add to `tools/validators/src/public/registry.ts`:

- Import: `import { liePromotedSilently } from "../structural/lie-promoted-silently.js";`
- Array entry in `structuralValidators` at a coherent position (e.g., adjacent to existing `storyFactAuthority` since both target the SF record class).

## Files to Touch

- `tools/validators/src/structural/lie-promoted-silently.ts` (new)
- `tools/validators/tests/structural/lie-promoted-silently.test.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — 1 import line + 1 array entry)
- `tools/validators/tests/structural/registry.test.ts` (modify — expected structural registry list)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — structural/all-validator counts)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — clean-plan skipped-validator expectation)
- `tools/validators/README.md` (modify — structural validator inventory/count)

## Out of Scope

- General `SF` supersession audit (SF derived from another SF or from an SE event) — explicitly out of scope per spec §D3 line 30 and §Out of Scope line 287. The validator targets only the BEL→SF authority-promotion path that FOUNDATIONS §6a calls out.
- Merging or refactoring `story-fact-authority.ts` — explicitly complementary by design; out of scope per spec §D3 line 170.
- D1/D2/D4 implementations (separate tickets in this batch).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && node --test dist/tests/structural/lie-promoted-silently.test.js` — all 6 fixture cases pass.
2. `cd tools/validators && grep -nE 'liePromotedSilently' src/public/registry.ts` — returns ≥2 matches (1 import + 1 array entry).
3. `cd tools/validators && npm run test` — full validators suite green; confirm `story-fact-authority.test.ts` still passes (no regression from the complementary check).

### Invariants

1. Every `SF` with `authority ∈ {branch_local, canon_candidate, canon_linked}` MUST NOT have a BEL with `truth_relation ∈ {false, partly_true, contested, branch_counterfactual}` in `derived_from[]`. The lawful path for promoting a non-true belief into branch state is `SF.authority: branch_local_counterfactual` only.
2. SF records with `authority: branch_local_counterfactual` MUST be allowed to cite any BEL `truth_relation` in `derived_from[]` (this is the explicit counterfactual marker; validator must not regress to flag this path).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/lie-promoted-silently.test.ts` (new) — exercises the 6 fixture cases above plus `applies_to` selector coverage; covers no-BEL-PASS, lawful-counterfactual-PASS, true-BEL-PASS, unlawful-false-BEL-FAIL, unlawful-contested-BEL-FAIL, canon-linked-counterfactual-BEL-FAIL, and pre-apply/incremental selector paths.
2. `tools/validators/tests/structural/registry.test.ts` (modified) — asserts the registered structural validator list includes `lie_promoted_silently`.
3. `tools/validators/tests/integration/spec04-verification.test.ts` and `tools/validators/tests/integration/validate-patch-plan.test.ts` (modified) — keep package-level validator counts and clean pre-apply skipped-validator expectations truthful after registry expansion.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/structural/lie-promoted-silently.test.js` (targeted)
2. `cd tools/validators && npm run test` (full suite — confirms no regressions; specifically that `story-fact-authority.test.ts` still passes after the registry append).
3. The targeted command is the correct verification boundary for the validator's own correctness; the full-suite command catches integration regressions including the complementary-validator overlap on the canon_linked case.

## Outcome

Completed: 2026-05-16

What changed:
- Added `tools/validators/src/structural/lie-promoted-silently.ts`, a fail-mode structural validator that rejects `SF.authority ∈ {branch_local, canon_candidate, canon_linked}` when `SF.derived_from[]` cites a non-true BEL (`false`, `partly_true`, `contested`, or `branch_counterfactual`).
- Added focused tests covering the six D3 PASS/FAIL cases plus selector behavior for full-world, pre-apply `create_sf_record`, non-owned pre-apply ops, and touched SF files.
- Registered `lie_promoted_silently` in `structuralValidators` adjacent to `story_fact_authority`, and truthed same-package validator inventory/count surfaces.

Verification result:
- `cd tools/validators && npm run build` — PASS.
- `cd tools/validators && node --test dist/tests/structural/lie-promoted-silently.test.js` — PASS, 7/7 tests.
- `cd tools/validators && grep -nE 'liePromotedSilently' src/public/registry.ts` — PASS, import and array entry found.
- `cd tools/validators && grep -n 'derived_from\|truth_relation' src/structural/lie-promoted-silently.ts` — PASS, implementation reads both required fields.
- `cd tools/validators && npm run test` — PASS, 294/294 tests.

Deviations from original plan:
- Same-package inventory surfaces were added to the touched-file set because registry expansion made the README, structural registry assertion, SPEC-04 validator counts, and clean pre-apply skipped-validator expectation stale.
- The validator participates in pre-apply for `create_sf_record` patch plans; `docs/HARD-GATE-DISCIPLINE.md` was read and the implementation preserves fail-closed validator behavior without changing approval-token or submit flow.
