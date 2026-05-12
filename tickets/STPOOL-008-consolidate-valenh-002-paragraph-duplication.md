# STPOOL-008: Consolidate verbatim-duplicated VALENH-002 backstop paragraph in SKILL.md

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — SKILL.md edit only.
**Deps**: None

## Problem

The "VALENH-002 engine-side backstop for Phase 4 gate 9" rationale paragraph (≥80 words covering `record_schema_compliance` field set, the defensive-pre-submit-check posture, the approval-token-verification-remains-submit-only clause, and the `id_allocation_race` defense-in-depth backstop) appears verbatim in two sites in `.claude/skills/storylet-pool-authoring/SKILL.md`:

- `:256` (Procedure section step 6 — "Phase 5b: Engine Pre-Validation")
- `:268` (Phase 5b inline section, step 3 — the authoritative inline reference)

The two paragraphs are not paraphrased — they are byte-identical except for inconsequential whitespace. If the VALENH-002 backstop semantics evolve (e.g., approval-token verification migrates to validate too, or `id_allocation_race` moves elsewhere in the validator pipeline), both sites need lockstep updates with no structural enforcement that they stay aligned.

This was uncovered by storylet-pool-authoring streamlining audit 2026-05-12 finding F-07.

## Assumption Reassessment (2026-05-12)

1. Verified `SKILL.md:256` (Procedure step 6) and `SKILL.md:268` (Phase 5b inline §3) contain the same paragraph verbatim. The Procedure section is a summary entry-point; the Phase 5b inline section is the authoritative reference.
2. The duplication is not load-bearing for clarity — the Procedure section's brief summary line (e.g., "execute the inline §Phase 5b block below for direct invocation only") would suffice without restating the full backstop rationale.
3. No external citation of either paragraph site — both are internal SKILL.md prose; no sibling skill grep returns hits on the exact phrasing.

## Architecture Check

1. Single-source the paragraph to the Phase 5b inline section. Replace the Procedure step 6 occurrence with a one-line summary + an in-SKILL.md reference (`see §Phase 5b inline block for the VALENH-002 backstop coverage`).
2. No backwards-compatibility shim — within-skill prose edit only.

## Verification Layers

1. **Within-skill deduplication** — the paragraph appears in exactly one site → `grep -c "VALENH-002 engine-side backstop for Phase 4 gate 9" .claude/skills/storylet-pool-authoring/SKILL.md` returns 1.
2. **Procedure section still readable as a navigation index** — step 6's replacement text orients the reader to the Phase 5b block without restating its content verbatim.

## What to Change

### 1. Replace the duplicated paragraph in Procedure step 6

In `SKILL.md:256`, the Procedure step 6 currently reads:

```
6. **Phase 5b: Engine Pre-Validation** — execute the inline §Phase 5b block below for direct invocation only. Assemble the draft patch plan with `approval_token: "placeholder"` and call `mcp__worldloom__validate_patch_plan(envelope)`. Coverage: `yaml_parse_integrity`, `id_uniqueness`, `cross_file_reference`, `record_schema_compliance`, Rules 1-7, `storylet_predicate_dsl_parsability`, `rule11_action_space`, `rule12_redundancy`. For storylet records, `record_schema_compliance` is the VALENH-002 engine-side backstop for Phase 4 gate 9: it requires the template's load-bearing structural fields, including `mystery_safety`, `provenance`, `visibility`, the seven structural arc blocks, and `exit_portfolio.native_seeds[]`. Treat as a defensive pre-submit check, not a complete gate: approval-token verification remains submit-only, and submit keeps the `id_allocation_race` defense-in-depth backstop for the validate-to-submit race window. Fold the validators' verdict into the Phase 6 HARD-GATE summary's VALIDATION VERDICTS block. Skip when `parent_skill_invocation: true`; the parent skill's own pre-write validation surface governs.
```

Replace with:

```
6. **Phase 5b: Engine Pre-Validation** — execute the inline §Phase 5b block below for direct invocation only. The block covers validate-patch-plan envelope assembly, validator coverage (including the VALENH-002 `record_schema_compliance` backstop for Phase 4 gate 9), and the fold-into-Phase-6 protocol. Skip when `parent_skill_invocation: true`; the parent skill's own pre-write validation surface governs.
```

The Phase 5b inline section at `SKILL.md:262-271` remains the authoritative reference; the Procedure step now functions as a navigation pointer rather than a re-statement.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify)

## Out of Scope

- Restructuring the inline Phase 5b / Phase 6 / Phase 7 sections themselves — STPOOL-009 (audit F-08) addresses the broader Phase 6 inline-section drift hazard.
- Auditing other skills' Procedure-section / inline-section duplication patterns — that would be a cross-skill consistency pass, not this skill's audit follow-up.

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
