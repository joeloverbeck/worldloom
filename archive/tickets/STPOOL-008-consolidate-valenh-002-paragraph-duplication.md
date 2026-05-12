# STPOOL-008: Consolidate verbatim-duplicated VALENH-002 backstop paragraph in SKILL.md

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — SKILL.md edit only.
**Deps**: None

## Problem

At intake, the "VALENH-002 engine-side backstop for Phase 4 gate 9" rationale paragraph (>=80 words covering `record_schema_compliance` field set, the defensive-pre-submit-check posture, the approval-token-verification-remains-submit-only clause, and the `id_allocation_race` defense-in-depth backstop) appeared verbatim in two sites in `.claude/skills/storylet-pool-authoring/SKILL.md`:

- `:256` (Procedure section step 6 — "Phase 5b: Engine Pre-Validation")
- `:268` (Phase 5b inline section, step 3 — the authoritative inline reference)

The two paragraphs were not paraphrased; they were byte-identical except for inconsequential whitespace. If the VALENH-002 backstop semantics evolved (e.g., approval-token verification migrated to validate too, or `id_allocation_race` moved elsewhere in the validator pipeline), both sites would have needed lockstep updates with no structural enforcement that they stayed aligned.

This was uncovered by storylet-pool-authoring streamlining audit 2026-05-12 finding F-07.

## Assumption Reassessment (2026-05-12)

1. Verified at intake that `SKILL.md:256` (Procedure step 6) and `SKILL.md:268` (Phase 5b inline §3) contained the same paragraph verbatim. The Procedure section is a summary entry-point; the Phase 5b inline section is the authoritative reference.
2. The duplication is not load-bearing for clarity — the Procedure section's brief summary line (e.g., "execute the inline §Phase 5b block below for direct invocation only") would suffice without restating the full backstop rationale.
3. No external citation of either paragraph site — both are internal SKILL.md prose; no sibling skill grep returns hits on the exact phrasing.
4. Read `docs/HARD-GATE-DISCIPLINE.md` during implementation because the compressed prose is adjacent to Phase 5b pre-validation and the Phase 6 HARD-GATE summary. The landed edit preserves the validation and approval-token semantics by leaving the inline Phase 5b block unchanged.

## Architecture Check

1. Single-source the paragraph to the Phase 5b inline section. Replace the Procedure step 6 occurrence with a one-line summary + an in-SKILL.md reference (`see §Phase 5b inline block for the VALENH-002 backstop coverage`).
2. No backwards-compatibility shim — within-skill prose edit only.

## Verification Layers

1. **Within-skill deduplication** — the paragraph appears in exactly one site → `grep -c "VALENH-002 engine-side backstop for Phase 4 gate 9" .claude/skills/storylet-pool-authoring/SKILL.md` returns 1.
2. **Procedure section still readable as a navigation index** — step 6's replacement text orients the reader to the Phase 5b block without restating its content verbatim.

## Landed Changes

### 1. Replaced the duplicated paragraph in Procedure step 6

In `SKILL.md:256`, Procedure step 6 now reads:

```
6. **Phase 5b: Engine Pre-Validation** — execute the inline §Phase 5b block below for direct invocation only. The block covers validate-patch-plan envelope assembly, validator coverage (including the VALENH-002 `record_schema_compliance` backstop for Phase 4 gate 9), and the fold-into-Phase-6 protocol. Skip when `parent_skill_invocation: true`; the parent skill's own pre-write validation surface governs.
```

The Phase 5b inline section at `SKILL.md:262-271` remains the authoritative reference; the Procedure step now functions as a navigation pointer rather than a re-statement.

## Files Touched

- `.claude/skills/storylet-pool-authoring/SKILL.md` (modified)
- `archive/tickets/STPOOL-008-consolidate-valenh-002-paragraph-duplication.md` (modified closeout)

## Out of Scope

- Restructuring the inline Phase 5b / Phase 6 / Phase 7 sections themselves — STPOOL-009 (audit F-08) addresses the broader Phase 6 inline-section drift hazard.
- Auditing other skills' Procedure-section / inline-section duplication patterns — that would be a cross-skill consistency pass, not this skill's audit follow-up.

## Outcome

Completion date: 2026-05-12.

Completed. The Procedure section no longer duplicates the full VALENH-002 backstop rationale. The full validator coverage and approval-token/id-allocation semantics remain single-sourced in the inline Phase 5b block.

## Verification Result

Commands run:

1. `grep -c 'VALENH-002 engine-side backstop for Phase 4 gate 9' .claude/skills/storylet-pool-authoring/SKILL.md` -> `1`.
2. `grep -n 'VALENH-002\|record_schema_compliance is the VALENH' .claude/skills/storylet-pool-authoring/SKILL.md` -> Procedure step 6 has the compressed navigation summary; only Phase 5b inline step 3 retains the full `record_schema_compliance is the VALENH...` paragraph.

Manual review:

1. Re-read `SKILL.md:251-268`; step 6 still names Phase 5b, validator coverage, the fold-into-Phase-6 protocol, and the `parent_skill_invocation: true` skip clause.

## Deviations

None.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -c "VALENH-002 engine-side backstop for Phase 4 gate 9" .claude/skills/storylet-pool-authoring/SKILL.md` returns 1 (only the Phase 5b inline section retains the paragraph).
2. The Procedure step 6 still names Phase 5b's purpose and the parent-skill-invocation skip clause; readers can navigate from the Procedure index to the inline block without losing context.

### Invariants

1. Within-skill prose is single-sourced; the Phase 5b inline section is the authoritative description of the engine pre-validation contract.

## Test Plan

### New/Modified Tests

1. None — SKILL.md prose edit; no validator change.

### Commands

1. `grep -n "VALENH-002\|record_schema_compliance is the VALENH" .claude/skills/storylet-pool-authoring/SKILL.md` — confirms the paragraph appears once (in §Phase 5b inline) and the Procedure step has been compressed.
