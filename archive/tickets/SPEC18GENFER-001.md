# SPEC18GENFER-001: Phase 4 substantive initial-section materialization

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/create-base-world/SKILL.md` §Phase 4 prose
**Deps**: None

## Problem

At intake, `create-base-world/SKILL.md` Phase 4 emitted one minimal section per prose concern with the closing line "The world starts thin and grows via `canon-addition`; one section per concern is sufficient." The bidirectional `touched_by_cf` pointer held, but section bodies were not required to materialize CF-0001's first-order consequences in prose — the body could be a stub with the pointer carrying all the weight. This produced an asymmetry: worlds born via `create-base-world` were structurally thinner at genesis than worlds born from a `propose-new-worlds-from-preferences` NWP card. Rule 6 (No Silent Retcons) makes substrate retrofit costly, so this ticket raised the genesis bar at first-write rather than deferring it.

## Assumption Reassessment (2026-04-28)

1. Existing Phase 4 prose at `.claude/skills/create-base-world/SKILL.md` was confirmed before implementation — the paragraph ended with the literal string "The world starts thin and grows via `canon-addition`; one section per concern is sufficient." The `touched_by_cf: [CF-0001]` mechanism is for sections whose file class appears in CF-0001's `required_world_updates`.
2. SPEC-18 §Approach Track A1 (line 52) names this amendment; §Deliverables Track A1 (lines 96-99) commits to a two-part amendment (add new substantive-section requirement + amend the existing closing line).
3. Cross-artifact boundary: this ticket modifies `create-base-world/SKILL.md` only. The "stubs ... rejected at Phase 9" cross-reference resolves once SPEC18GENFER-003 lands (Phase 9 amendment). Until then, the new prose names a downstream check that the same spec's Phase 9 ticket will deliver.
4. Rule 2 (No Pure Cosmetics) motivates this — sections with stub bodies fail Rule 2 by construction (per SPEC-18 §FOUNDATIONS Alignment table). The amendment now enforces Rule 2 at genesis rather than deferring to per-CF `canon-addition` runs.
5. Dirty-worktree reassessment: `.claude/skills/reassess-spec/SKILL.md`, `.claude/skills/reassess-spec/references/spec-writing-rules.md`, `specs/SPEC-18-genesis-fertility-and-misrecognition.md`, and `tickets/SPEC18GENFER-002.md` were pre-existing same-family or adjacent edits. `tickets/SPEC18GENFER-003.md` and `tickets/SPEC18GENFER-004.md` appeared mid-run as same-family sibling scope and were left untouched. This ticket only owns `.claude/skills/create-base-world/SKILL.md` and this archived ticket record.

## Architecture Check

1. Genesis-time enforcement of substantive-section materialization prevents the structural-thinness asymmetry between `create-base-world`-born and NWP-card-born worlds. Cleaner than deferring to `canon-addition` runs because the Phase 4 sections seed the world's prose foundation; the foundation's depth shapes every subsequent CF-addition.
2. No backwards-compatibility shim — the rule applies to worlds created after SPEC-18 lands. Pre-SPEC-18 worlds (currently `worlds/animalia/`) are explicitly out of scope per spec §Out of Scope.

## Verification Layers

1. Phase 4 prose contains the new substantive-section requirement → codebase grep-proof
2. Phase 4 prose's existing closing line is rewritten to "thin in coverage, not in concrete commitment" → codebase grep-proof
3. Phase 9 enforcement of the rejection ("stubs ... rejected at Phase 9") → cross-ticket dependency on SPEC18GENFER-003

## What to Change

### 1. Phase 4 — Add substantive-section requirement

In `.claude/skills/create-base-world/SKILL.md` §Phase 4, append a new sentence to the existing prose block (placing it before the closing sentence about world growth):

> Each touched section's body MUST materialize ≥1 first-order consequence of CF-0001 in domain-appropriate prose; stubs that defer materialization to later `canon-addition` runs are rejected at Phase 9.

### 2. Phase 4 — Amend the closing "thin and grows" line

Replace the existing closing sentence:

> The world starts thin and grows via `canon-addition`; one section per concern is sufficient.

With:

> The world starts **thin in coverage, not in concrete commitment** — each touched section's body materializes first-order consequences of CF-0001, while second / third-order consequences accumulate via `canon-addition`. One section per concern is sufficient at the structural level.

## Files to Touch

- `.claude/skills/create-base-world/SKILL.md` (modify)

## Out of Scope

- Phase 8 schema population (delivered by SPEC18GENFER-002)
- Phase 9 rejection-test list (delivered by SPEC18GENFER-003)
- canon-addition Phase 0 misrecognition probe (delivered by SPEC18GENFER-004)
- Backfilling existing worlds against the new substantive-section requirement — explicit non-goal per SPEC-18 §Out of Scope (`worlds/animalia/` was created pre-SPEC-18 and is not retrofitted)

## Acceptance Criteria

### Tests That Must Pass

1. `grep -F "thin in coverage, not in concrete commitment" .claude/skills/create-base-world/SKILL.md` returns 1 match
2. `grep -F "Each touched section's body MUST materialize" .claude/skills/create-base-world/SKILL.md` returns 1 match
3. `grep -c "thin and grows via" .claude/skills/create-base-world/SKILL.md` returns 0 (the original phrase is replaced)
4. Deferred to SPEC18GENFER-003, not an acceptance gate for this ticket: skill dry-run with a deliberately stub-only initial-section attempt — Phase 9 must reject after that sibling lands

### Invariants

1. Phase 4 retains the "one section per concern is sufficient at the structural level" guarantee — the change is about depth-per-section (substantive prose), not number-per-section
2. The bidirectional CF↔SEC pointer rule (existing Phase 4 invariant: `touched_by_cf: [CF-0001]` for sections whose file class appears in CF-0001's `required_world_updates`) is unchanged
3. Pre-SPEC-18 worlds remain unaffected — the rule is forward-only

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -F "thin in coverage, not in concrete commitment" .claude/skills/create-base-world/SKILL.md`
2. `grep -F "Each touched section's body MUST materialize" .claude/skills/create-base-world/SKILL.md`
3. `grep -c "thin and grows via" .claude/skills/create-base-world/SKILL.md`

## Outcome

Completed on 2026-04-28.

Phase 4 in `.claude/skills/create-base-world/SKILL.md` now requires every CF-0001-touched initial section body to materialize at least one first-order consequence in domain-appropriate prose. The old "thin and grows" closing sentence was replaced with the SPEC-18 Track A1 wording: the world starts thin in coverage, not in concrete commitment, and one section per concern remains sufficient structurally.

SPEC18GENFER-003 remains the owner of Phase 9 stub rejection enforcement. SPEC18GENFER-002 remains the owner of Phase 8 propagation breadth and Rule 11 leverage wording.

## Verification Result

Completed on 2026-04-28:

1. `grep -F "thin in coverage, not in concrete commitment" .claude/skills/create-base-world/SKILL.md` — passed; returned the Phase 4 paragraph.
2. `grep -F "Each touched section's body MUST materialize" .claude/skills/create-base-world/SKILL.md` — passed; returned the Phase 4 paragraph.
3. `grep -c "thin and grows via" .claude/skills/create-base-world/SKILL.md` — returned `0` as intended. `grep -c` exits non-zero for zero matches in this environment, but the scalar output is the required proof.

## Deviations

- No skill dry-run was run for stub rejection because this ticket does not add the Phase 9 rejection test; that remains the explicit SPEC18GENFER-003 proof surface.
