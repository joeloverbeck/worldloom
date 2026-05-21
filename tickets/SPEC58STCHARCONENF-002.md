# SPEC58STCHARCONENF-002: Validate mid-story STCHAR introduction

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` (`midstory_record_introduction_grounding` + its class-set utility) and two `branching-story-turn-cycle` reference docs; no impact on existing validators.
**Deps**: None

## Problem

STCHAR cannot be introduced mid-story without failing validation. The mid-story introduction class set omits `STCHAR`, so a lawful `SE.record_introductions[]` entry introducing a STCHAR is rejected — even though the shared contract explicitly lists STCHAR as an allowed introduction class. The turn-cycle reference docs likewise omit STCHAR from their introduction guidance (SPEC-58 C2).

## Assumption Reassessment (2026-05-21)

1. `tools/validators/src/structural/midstory-introduction-utils.ts:4` — `MidstoryIntroductionClass` union omits `STCHAR`; `tools/validators/src/structural/midstory-record-introduction-grounding.ts:6` — `INTRO_CLASSES` set omits `STCHAR`. Confirmed by spot-check grep (zero STCHAR matches in both) this session.
2. `.claude/skills/_shared-templates/story-state-contract.md:212-233` — *"Mid-story creation of `CLK`, `STSEC`, `STQ`, `THR`, `STENT`, `STCHAR`, `SREL`, `STPLAN`, or `STEMO` records is recorded on `SE.record_introductions[]`."* The contract has already decided STCHAR is introducible; **add support, do not forbid** (the report's "or forbid" alternative is contract-contradicting and rejected).
3. Cross-artifact boundary: the introduction class set is shared between the validator (`MidstoryIntroductionClass` / `INTRO_CLASSES`) and the `branching-story-turn-cycle` skill guidance (`references/mid-story-record-introduction.md`, `references/phase-2-3-commitment-and-state-delta.md`), both of which must name STCHAR consistently.
4. FOUNDATIONS §Story Bundles §6.1 + Rule 1 (No Floating Facts): a mid-story-introduced STCHAR is grounded story state and must be validatable for evidence + resolution; direct world `CHAR-*` operational authority must still fail.
5. Canon Safety surface: both modified files are structural validators under `tools/validators/src/structural/` gating story-record writes at pre-apply. The change is additive (accept STCHAR introductions with grounding) and weakens no Mystery Reserve firewall.

## Architecture Check

1. Adds STCHAR to the single canonical class-set definition (`MidstoryIntroductionClass`) and its consuming set (`INTRO_CLASSES`); the grounding logic is class-agnostic, so no per-class branching is added.
2. No backwards-compatibility aliasing/shims — STCHAR is added directly to the canonical union.

## Verification Layers

1. A STCHAR carried on `SE.record_introductions[]` with grounding evidence passes `midstory_record_introduction_grounding` → codebase test.
2. A STCHAR introduction with missing evidence fails grounding → codebase test (negative case).
3. Direct world `CHAR-*` operational authority in the same surface still fails → existing `no_char_authority_in_story_runtime` validator (unchanged) + FOUNDATIONS alignment check.
4. Turn-cycle skill guidance names STCHAR among introducible classes → grep-proof against the two reference docs.

## What to Change

### 1. Add STCHAR to the validator class set

Add `"STCHAR"` to the `MidstoryIntroductionClass` union (`midstory-introduction-utils.ts`) and to `INTRO_CLASSES` (`midstory-record-introduction-grounding.ts`).

### 2. Update turn-cycle introduction guidance

Name STCHAR among the classes that may be carried on `SE.record_introductions[]` in `references/mid-story-record-introduction.md` and `references/phase-2-3-commitment-and-state-delta.md`.

## Files to Touch

- `tools/validators/src/structural/midstory-introduction-utils.ts` (modify)
- `tools/validators/src/structural/midstory-record-introduction-grounding.ts` (modify)
- `.claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` (modify)
- `tools/validators/tests/structural/midstory-record-introduction-grounding.test.ts` (modify)
- `tools/validators/tests/structural/midstory-vocabulary-parity.test.ts` (modify — keep the class-set parity assertion in sync with the new STCHAR member)

## Out of Scope

- C1/C3/C4 changes (separate tickets).
- The SE JSON schema (already permits STCHAR in `record_introductions`).
- Any change to how non-STCHAR introduction classes are grounded.

## Acceptance Criteria

### Tests That Must Pass

1. A grounded STCHAR introduction on `SE.record_introductions[]` passes; a STCHAR introduction with missing evidence fails.
2. A `CHAR-*` operational-authority reference in the introduction surface still fails.
3. `npm --prefix tools/validators test` passes (full validator suite, including the vocabulary-parity test).

### Invariants

1. The mid-story introduction class set matches the shared contract's `SE.record_introductions[]` class list exactly.
2. STCHAR introductions are held to the same evidence/resolution grounding as every other introducible class.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/midstory-record-introduction-grounding.test.ts` — add positive (grounded STCHAR intro) and negative (missing evidence) cases.
2. `tools/validators/tests/structural/midstory-vocabulary-parity.test.ts` — extend the class-set parity assertion to include STCHAR.

### Commands

1. `npm --prefix tools/validators test -- midstory` (targeted, after build).
2. `npm --prefix tools/validators test` (build + full suite).
