# SPEC58STCHARCONENF-002: Validate mid-story STCHAR introduction

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` (`midstory_record_introduction_grounding` + its class-set utility) and `branching-story-turn-cycle` guidance/reference docs; no impact on existing validators.
**Deps**: None

## Problem

At intake, STCHAR could not be introduced mid-story without failing structural grounding validation. The mid-story introduction utility and grounding validator omitted `STCHAR`, so a lawful `SE.record_introductions[]` entry introducing a STCHAR was ignored by the class set even though the shared contract and SE JSON schema already listed STCHAR as allowed. The turn-cycle reference docs likewise omitted STCHAR from their introduction guidance (SPEC-58 C2).

## Assumption Reassessment (2026-05-21)

1. Historical intake evidence: `tools/validators/src/structural/midstory-introduction-utils.ts` omitted `STCHAR` from `MidstoryIntroductionClass`, and `tools/validators/src/structural/midstory-record-introduction-grounding.ts` omitted `STCHAR` from `INTRO_CLASSES`. This ticket added STCHAR to both, plus the STCHAR trigger vocabulary already present in `tools/validators/src/schemas/story-event.schema.json`.
2. `.claude/skills/_shared-templates/story-state-contract.md:212-233` — *"Mid-story creation of `CLK`, `STSEC`, `STQ`, `THR`, `STENT`, `STCHAR`, `SREL`, `STPLAN`, or `STEMO` records is recorded on `SE.record_introductions[]`."* The contract had already decided STCHAR is introducible; **add support, do not forbid** (the report's "or forbid" alternative is contract-contradicting and rejected).
3. Cross-artifact boundary: the introduction class set is shared between the validator (`MidstoryIntroductionClass` / `INTRO_CLASSES`) and the `branching-story-turn-cycle` skill guidance (`SKILL.md`, `references/mid-story-record-introduction.md`, `references/phase-2-3-commitment-and-state-delta.md`, and `references/phase-9-validation-gates.md`), all of which now name STCHAR consistently.
4. FOUNDATIONS §Story Bundles §6.1 + Rule 1 (No Floating Facts): a mid-story-introduced STCHAR is grounded story state and must be validatable for evidence + resolution; direct world `CHAR-*` operational authority must still fail.
5. Canon Safety surface: both modified files are structural validators under `tools/validators/src/structural/` gating story-record writes at pre-apply. The change is additive (accept STCHAR introductions with grounding), includes the hybrid `append_story_character_authority_record` / `story-characters/STCHAR-*.md` surfaces, and weakens no Mystery Reserve firewall.
6. Proof command correction: `npm --prefix tools/validators test -- midstory` does not narrow to midstory tests in this package; it builds, then runs `node --test dist/tests/**/*.test.js midstory`, which executed a malformed broad lane and failed. The accepted proof is package-local `npm run build`, direct compiled test files, and the no-argument package `npm test` lane.

## Architecture Check

1. Adds STCHAR to the single canonical class-set definition (`MidstoryIntroductionClass`) and its consuming set (`INTRO_CLASSES`); the grounding logic is class-agnostic, so no per-class branching is added.
2. No backwards-compatibility aliasing/shims — STCHAR is added directly to the canonical union.

## Verification Layers

1. A STCHAR carried on `SE.record_introductions[]` with grounding evidence passes `midstory_record_introduction_grounding` → codebase test.
2. A STCHAR introduction with missing evidence fails grounding → codebase test (negative case).
3. Direct world `CHAR-*` operational authority in the same surface still fails → existing `no_char_authority_in_story_runtime` validator (unchanged) + FOUNDATIONS alignment check.
4. Turn-cycle skill guidance names STCHAR among introducible classes → grep-proof against the four turn-cycle guidance surfaces.

## What to Change

### 1. Added STCHAR to the validator class set

Added `"STCHAR"` to the `MidstoryIntroductionClass` union (`midstory-introduction-utils.ts`) and to `INTRO_CLASSES` (`midstory-record-introduction-grounding.ts`). Added the STCHAR trigger vocabulary and kept it in parity with the SE schema.

### 2. Updated turn-cycle introduction guidance

Named STCHAR among the classes that may be carried on `SE.record_introductions[]` in `SKILL.md`, `references/mid-story-record-introduction.md`, `references/phase-2-3-commitment-and-state-delta.md`, and `references/phase-9-validation-gates.md`.

## Files to Touch

- `tools/validators/src/structural/midstory-introduction-utils.ts` (modify)
- `tools/validators/src/structural/midstory-record-introduction-grounding.ts` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify)
- `tools/validators/tests/structural/midstory-record-introduction-grounding.test.ts` (modify)

## Out of Scope

- C1/C3/C4 changes (separate tickets).
- The SE JSON schema (already permits STCHAR in `record_introductions`).
- Any change to how non-STCHAR introduction classes are grounded.

## Acceptance Criteria

### Tests That Must Pass

1. A grounded STCHAR introduction on `SE.record_introductions[]` passes; a STCHAR introduction with missing evidence fails.
2. A `CHAR-*` operational-authority reference in the introduction surface still fails.
3. `npm test` in `tools/validators` passes, including the focused midstory and vocabulary-parity tests.

### Invariants

1. The mid-story introduction class set matches the shared contract's `SE.record_introductions[]` class list exactly.
2. STCHAR introductions are held to the same evidence/resolution grounding as every other introducible class.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/midstory-record-introduction-grounding.test.ts` — add positive (grounded STCHAR intro) and negative (missing evidence) cases.
2. `tools/validators/tests/structural/midstory-vocabulary-parity.test.ts` — existing parity assertion proves the widened class-set trigger table matches `story-event.schema.json`.

### Commands

1. `npm run build` from `tools/validators`.
2. `node --test dist/tests/structural/midstory-record-introduction-grounding.test.js` from `tools/validators`.
3. `node --test dist/tests/structural/midstory-vocabulary-parity.test.js` from `tools/validators`.
4. `node --test dist/tests/structural/stchar-structural-validators.test.js` from `tools/validators`.
5. `npm test` from `tools/validators`.

## Outcome

Completed: 2026-05-21.

- `MidstoryIntroductionClass`, `MIDSTORY_TRIGGERS_BY_CLASS`, and `midstory_record_introduction_grounding` now include `STCHAR`.
- `midstory_record_introduction_grounding` now applies to `append_story_character_authority_record` and touched hybrid `stories/<story>/story-characters/STCHAR-<n>.md` files.
- Focused structural tests now cover grounded STCHAR introductions, missing-evidence rejection, STCHAR applies-to routing, and hybrid STCHAR fixture paths.
- Turn-cycle guidance now lists STCHAR as an introducible class in Phase 3, Phase 9, the STPLAN/STEMO/STCHAR lifecycle note, and the mid-story introduction reference, and describes the STCHAR introduction threshold, grounding, anti-patterns, and validator surface.

## Verification Result

- `npm --prefix tools/validators test -- midstory` — historical pre-edit baseline: failed because the package wrapper did not narrow to midstory tests and ran a malformed broad lane as `node --test dist/tests/**/*.test.js midstory`; 127 passed, 6 failed. This command is not used as the accepted targeted proof.
- `npm run build` from `tools/validators` — passed after implementation.
- `node --test dist/tests/structural/midstory-record-introduction-grounding.test.js` from `tools/validators` — passed: 9/9 tests.
- `node --test dist/tests/structural/midstory-vocabulary-parity.test.js` from `tools/validators` — passed: 1/1 test, proving the widened utility trigger table matches the SE schema.
- `node --test dist/tests/structural/stchar-structural-validators.test.js` from `tools/validators` — passed: 11/11 tests, preserving the direct-world-CHAR authority rejection surface.
- `npm test` from `tools/validators` — passed: 779/779 tests.
- `rg -n 'STCHAR.*record_introductions|newly-created .*STCHAR|class: STCHAR' .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` — confirmed the four turn-cycle guidance surfaces name STCHAR introduction handling.

## Deviations

- The SE JSON schema already permitted STCHAR in `record_introductions[]`; this ticket did not edit `story-event.schema.json`.
- The drafted `npm --prefix tools/validators test -- midstory` targeted command was replaced because it did not filter the package test suite. The no-argument package `npm test` lane passes and is recorded as the broad suite proof.
