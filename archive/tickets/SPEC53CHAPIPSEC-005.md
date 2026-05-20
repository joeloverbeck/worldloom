# SPEC53CHAPIPSEC-005: Critic-rationale substance + Phase 13 slot rename

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/_shared-references/protagonist-grade-character-engine.md` + `.claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md` (skill prose only), plus a SPEC-53 implementation note; no production code, no schema, no validator change.
**Deps**: None

## Problem

At intake, two skill-prose refinements from the source report's M1 and M2 remained:
- **M1**: the Blandness Executioner and Protagonist-Grade Critic PASS rationales can be shallow ("PASS: has conflict"). The doctrine should require each PASS rationale to name concrete evidence.
- **M2**: the Phase 13 composition slot named "Protagonist-grade load-bearing character" reads as singular and could be misread as "only one card must be protagonist-grade," contradicting the rest of the system (every surviving card is protagonist-grade).

## Assumption Reassessment (2026-05-20)

1. **Codebase**: Before this ticket, `.claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md` slot #10 read `Protagonist-grade load-bearing character`; a pipeline-wide grep confirmed that exact string appeared in one live skill file only. `.claude/skills/_shared-references/protagonist-grade-character-engine.md` is the canonical critic-pass doctrine shared by `propose-new-characters` and `deepen-character-proposal`.
2. **Spec/docs**: SPEC-53 Phase 5 (M1 + M2). M1 is skill-prose tightening on top of the existing "bare PASS = FAIL" rule — explicitly **no** new deterministic gate (avoids the validation-bureaucracy risk the source report §16 warns about).
3. **Cross-skill boundary under audit**: `protagonist-grade-character-engine.md` is shared doctrine consumed by both `propose-new-characters` and `deepen-character-proposal`; tightening the critic-pass rationale requirement there propagates to both consumers. The M2 rename is local to `propose-new-characters`'s Phase 13 reference.
4. **Same-seam spec truthing**: SPEC-53 Phase 5 remained active prose before this ticket, so this closeout adds a dated implementation note there rather than rewriting the historical work plan.

## Architecture Check

1. Editing the shared doctrine for M1 keeps both critic-pass consumers aligned from one site rather than duplicating the requirement per skill. The M2 rename is a one-file, one-string label change with verified zero blast radius.
2. No backwards-compatibility shim; no deterministic gate added (M1 stays at the skill-prose / LLM-critic layer per SPEC-53 §Key design decisions).

## Verification Layers

1. Critic-pass guidance names the four required rationale elements (world pressure + scene behavior + cannot-swap reason + rejected weaker alternative) → manual review of `protagonist-grade-character-engine.md`.
2. Phase 13 slot is renamed and no surrounding wording implies protagonist-grade is optional for other cards → codebase grep-proof (old string gone; new string present) + manual review.
3. Single-layer (skill-prose) ticket: no schema/validator/test layer applies — verification is grep + manual prose review only.

## Landed Changes

### 1. M1 — critic-rationale substance (`protagonist-grade-character-engine.md`)

- Blandness Executioner and Protagonist-Grade Critic PASS rationales now must name all four evidence elements: one concrete world pressure, one scene behavior, one cannot-swap reason, and one rejected weaker alternative. This remains a skill-prose / LLM-critic discipline, not a deterministic gate.

### 2. M2 — Phase 13 slot rename (`phases-11-13-score-filter-diversify.md`)

- Phase 13 slot #10 is now `Highest-intensity load-bearing anchor`. The nearby critic-pass wording points to the shared four-element evidence rule and does not imply protagonist-grade is optional for other cards.

## Files to Touch

- `.claude/skills/_shared-references/protagonist-grade-character-engine.md` (modify)
- `.claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md` (modify)
- `specs/SPEC-53-character-pipeline-second-iteration-fixes.md` (modify — Phase 5 implementation note)

## Out of Scope

- Any deterministic validator gate enforcing rationale substance (rejected — avoids validation bureaucracy).
- Changes to `deepen-character-proposal`'s own SKILL.md beyond what the shared-doctrine edit propagates.
- Renaming any schema field, validator, or tool (M2 is a prose label only).

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "world pressure|scene behavior|cannot-swap reason|rejected weaker alternative" .claude/skills/_shared-references/protagonist-grade-character-engine.md .claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md` confirms the four-element rationale requirement is present in the shared critic-pass doctrine and referenced by the proposal phase.
2. `rg -n "Protagonist-grade load-bearing character" .claude/skills` returns no matches; `rg -n "Highest-intensity load-bearing anchor" .claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md` returns the renamed slot.

### Invariants

1. No deterministic gate is added — M1 remains skill-prose / LLM-critic discipline.
2. The M2 rename has zero blast radius beyond the single reference file (verified by pipeline-wide grep).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based (grep-proofs) and the existing LLM-critic discipline is named in Assumption Reassessment.`

### Commands

1. `rg -n "world pressure|scene behavior|cannot-swap reason|rejected weaker alternative" .claude/skills/_shared-references/protagonist-grade-character-engine.md .claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md`
2. `rg -n "Protagonist-grade load-bearing character" .claude/skills`
3. `rg -n "Highest-intensity load-bearing anchor" .claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md`

## Outcome

Completed: 2026-05-20

The shared protagonist-grade character engine now requires Blandness Executioner and Protagonist-Grade Critic PASS rationales to name one concrete world pressure, one scene behavior, one cannot-swap reason, and one rejected weaker alternative. `propose-new-characters` Phase 11 now points those two critic PASS rationales back to that shared four-element evidence rule, and Phase 13 slot #10 is renamed to `Highest-intensity load-bearing anchor`. SPEC-53 Phase 5 has a dated implementation note for the landed seam.

## Verification Result

1. `rg -n "world pressure|scene behavior|cannot-swap reason|rejected weaker alternative" .claude/skills/_shared-references/protagonist-grade-character-engine.md .claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md` — PASS; the shared critic doctrine contains both four-element PASS requirements, and the proposal phase reference points to that rule.
2. `rg -n "Protagonist-grade load-bearing character" .claude/skills` — PASS; no live skill surface still uses the old slot label.
3. `rg -n "Highest-intensity load-bearing anchor" .claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md` — PASS; the renamed Phase 13 slot is present.

## Deviations

- Added `specs/SPEC-53-character-pipeline-second-iteration-fixes.md` to the touched files to keep the active originating spec truthful with a dated Phase 5 implementation note.
- No deterministic validator, schema, production code, or skill dry-run was added or run; this ticket is intentionally skill-prose discipline proved by grep and manual review.
