# BSBOOT-025: Sync bootstrap templates with the current Phase 9 / 9.5 gate set

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — documentation/template-only edits inside `.claude/skills/branching-story-bootstrap/`.
**Deps**: None (PROSESPLIT-009 already merged; gate set is settled).

## Problem

`templates/story-kernel.md` and `templates/story-records.yaml` (the PG-0001 example block) were not updated when PROSESPLIT-007 / 008 / 009 expanded the Phase 9 gate set to 19 and the Phase 9.5 discipline-check set to 11. A bootstrap run that uses the template verbatim would record PASS rationales for only the gate/check enumerations the templates list, leaving the new `plan_completeness_check` (Phase 9 gate 19) and `plan_self_containment` (Phase 9.5 check 11) silently absent from `STORY_KERNEL.md.validation_trace` and `STORY_KERNEL.md.discipline_validation_trace`, and leaving the PG-0001 `validation_trace` example with 17 keys when the SKILL.md says it must carry 18. The template also still uses the stale name `state_snapshot_completeness` for gate 12, which `references/phase-9-validation-gates.md` has split into gate 12 `recursive_reference_closure` + gate 13 `state_snapshot_integrity`.

## Assumption Reassessment (2026-05-11)

1. `templates/story-kernel.md` lines 80-97 enumerate `gate_01` … `gate_17` and stop at 17. Confirmed by direct read.
2. `templates/story-kernel.md` lines 99-109 enumerate `discipline_check_01` … `discipline_check_10` and stop at 10. Confirmed by direct read.
3. `references/phase-9-validation-gates.md` table lists 19 numbered gates including gate 12 `Recursive reference closure`, gate 13 `State_snapshot integrity`, and gate 19 `plan_completeness_check (NEW)`. `references/phase-9-5-bootstrap-discipline-validator.md` table lists 11 numbered checks including check 11 `plan_self_containment (NEW)`. `SKILL.md` HARD-GATE block (lines 60-62) names all 19 gates and "Phase 9.5's 11 discipline checks (including the new `plan_self_containment` check)" verbatim. The references and SKILL.md are mutually consistent; the templates are the drift sites.
4. `templates/story-records.yaml` lines 355-372 enumerate 17 keys for the PG-0001 `validation_trace` example. `SKILL.md` line 173 explicitly says PG-0001's `validation_trace` carries `18 PG-record keys total — 12 non-scene-commitment plus 5 scene-commitment validator keys plus the new plan_completeness_check key`. The yaml example is missing `plan_completeness_check`.
5. Cross-skill consumer check: `branching-story-page-cycle/references/record-schemas.md:291` cites `branching-story-bootstrap/templates/story-records.yaml` as the schema authority for the shared classes — but explicitly for SF / OBL / CNSQ / THR / SREL / STINT / SLT-cross-ref / STLOC / STOBJ / DA-story-local / BR, NOT for the PG-0001 validation_trace example (PG is owned by page-cycle). The drift in the PG-0001 example block is therefore a discipline issue for bootstrap consumers; page-cycle does not inherit the stale example. Fixing the PG-0001 example does not change page-cycle's PG-record schema authority.
6. Mismatch + correction: none — this ticket is the correction.

## Architecture Check

1. The fix is a pure template-sync edit. No new fields, no schema changes, no migrations. The contract was set by PROSESPLIT-007/008/009; the templates simply did not follow.
2. No backwards-compatibility aliasing introduced. The stale name `state_snapshot_completeness` is replaced with the current `recursive_reference_closure` + `state_snapshot_integrity` split — no alias kept.

## Verification Layers

1. `templates/story-kernel.md` frontmatter `validation_trace` enumerates exactly 19 numbered keys matching `references/phase-9-validation-gates.md` gate names → codebase grep-proof (`grep -c "gate_" templates/story-kernel.md` returns 19; key names match the reference table).
2. `templates/story-kernel.md` frontmatter `discipline_validation_trace` enumerates exactly 11 numbered keys matching `references/phase-9-5-bootstrap-discipline-validator.md` check names → codebase grep-proof.
3. `templates/story-records.yaml` PG-0001 `validation_trace` example carries exactly 18 keys including `plan_completeness_check` → codebase grep-proof against the SKILL.md "18 PG-record keys total" claim.
4. The human-readable body sections of `templates/story-kernel.md` ("Validation Trace" and "Discipline Validation Trace") enumerate the same count as the frontmatter block → manual review (both surfaces are restatements of each other per the template's own comment).

## What to Change

### 1. `templates/story-kernel.md` frontmatter — extend `validation_trace` to 19 keys

Update the `validation_trace` block (currently lines 80-97) to enumerate all 19 gates from `references/phase-9-validation-gates.md`, in the reference's gate order. Specifically:

- Rename `gate_12_state_snapshot_completeness` to `gate_12_recursive_reference_closure`.
- Insert `gate_13_state_snapshot_integrity` (new row from the gate-12 split).
- Renumber the existing `gate_13_arc_envelope_conformance` … `gate_17_choice_worthiness_completeness` block to `gate_14` … `gate_18`.
- Append `gate_19_plan_completeness_check: "PASS — <one-line rationale>"`.

### 2. `templates/story-kernel.md` frontmatter — extend `discipline_validation_trace` to 11 keys

Append `discipline_check_11_plan_self_containment: "PASS — <one-line rationale>"` to the block (currently lines 99-109).

### 3. `templates/story-kernel.md` body — sync the "Validation Trace" and "Discipline Validation Trace" human-readable lists

The numbered list under `## Validation Trace` (currently lines 211-223) currently stops at item 17 and uses the stale names. Extend to 19 items with the renumbered names matching the frontmatter. The numbered list under `## Discipline Validation Trace` (currently lines 225-232) stops at item 10; extend to 11.

### 4. `templates/story-records.yaml` PG-0001 `validation_trace` example — add `plan_completeness_check`

The example block (currently lines 355-372) enumerates 17 keys. Insert `plan_completeness_check: PASS —<rationale>` in the same shape, in the same position the reference uses (after `choice_worthiness_completeness`, the last existing key). The lead-in comment on line 355 currently reads `# PG-0001 records the page-cycle 12 PG-record keys ... plus the 5 scene-commitment validator gates below`; update to `# PG-0001 records the page-cycle 12 PG-record keys ... plus the 5 scene-commitment validator gates plus the plan_completeness_check key — 18 PG-record keys total per SKILL.md line 173`.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/templates/story-kernel.md` (modify)
- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` (modify)

## Out of Scope

- Any change to `references/phase-9-validation-gates.md` or `references/phase-9-5-bootstrap-discipline-validator.md` — the references are the source of truth this ticket syncs the templates against.
- Any change to `SKILL.md` HARD-GATE wording — already correct.
- The `(NEW)` annotations on gate 19 and check 11 in the references — covered by BSBOOT-029 (janitorial).
- Page-cycle's own PG-record schema in `branching-story-page-cycle/references/record-schemas.md` — page-cycle owns PG schema; bootstrap only owns the PG-0001 example block in its own template.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -c "^  gate_" .claude/skills/branching-story-bootstrap/templates/story-kernel.md` returns 19.
2. `grep -c "^  discipline_check_" .claude/skills/branching-story-bootstrap/templates/story-kernel.md` returns 11.
3. `grep -c "plan_completeness_check" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` returns at least 1.
4. `grep -c "state_snapshot_completeness" .claude/skills/branching-story-bootstrap/templates/story-kernel.md` returns 0 (stale name fully removed).
5. The 19 frontmatter `validation_trace` key names exactly match the gate names in `references/phase-9-validation-gates.md` table column "Gate" (manual diff).
6. The 11 frontmatter `discipline_validation_trace` key names exactly match the check names in `references/phase-9-5-bootstrap-discipline-validator.md` table column "Check" (manual diff).

### Invariants

1. The `validation_trace` block and the body's `## Validation Trace` numbered list always enumerate the same gate set — they are dual surfaces over the same Phase 9 result set.
2. The PG-0001 `validation_trace` example in `templates/story-records.yaml` reflects exactly the 18 PG-record keys SKILL.md line 173 names — drift here silently misleads downstream bootstrap implementations of PG-0001 emission.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "(gate_|discipline_check_)[0-9]" .claude/skills/branching-story-bootstrap/templates/story-kernel.md` — visual review of the full numbered enumeration matches the reference tables.
2. `grep -n "validation_trace" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` — locate the example block and visually verify the 18 keys.
3. `diff <(grep -oE "gate_[0-9]+_[a-z_]+" .claude/skills/branching-story-bootstrap/templates/story-kernel.md | sort -u) <(grep -oE "\` [0-9]+\` \\|.*\` [^\` ]+\`" .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md | sort -u)` — defensive cross-check that gate names align (note: this diff is approximate because the reference uses prose names while the template uses snake_case; full alignment requires manual reading).
