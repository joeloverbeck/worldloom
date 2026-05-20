# SPEC53CHAPIPSEC-005: Critic-rationale substance + Phase 13 slot rename

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/_shared-references/protagonist-grade-character-engine.md` + `.claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md` (skill prose only); no production code, no schema, no validator change.
**Deps**: None

## Problem

Two skill-prose refinements from the source report's M1 and M2:
- **M1**: the Blandness Executioner and Protagonist-Grade Critic PASS rationales can be shallow ("PASS: has conflict"). The doctrine should require each PASS rationale to name concrete evidence.
- **M2**: the Phase 13 composition slot named "Protagonist-grade load-bearing character" reads as singular and could be misread as "only one card must be protagonist-grade," contradicting the rest of the system (every surviving card is protagonist-grade).

## Assumption Reassessment (2026-05-20)

1. **Codebase**: `.claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md` line 92 — slot #10 reads `Protagonist-grade load-bearing character`; a pipeline-wide grep confirms this exact string appears in this one file only (no blast radius). `.claude/skills/_shared-references/protagonist-grade-character-engine.md` is the canonical critic-pass doctrine shared by `propose-new-characters` and `deepen-character-proposal`.
2. **Spec/docs**: SPEC-53 Phase 5 (M1 + M2). M1 is skill-prose tightening on top of the existing "bare PASS = FAIL" rule — explicitly **no** new deterministic gate (avoids the validation-bureaucracy risk the source report §16 warns about).
3. **Cross-skill boundary under audit**: `protagonist-grade-character-engine.md` is shared doctrine consumed by both `propose-new-characters` and `deepen-character-proposal`; tightening the critic-pass rationale requirement there propagates to both consumers. The M2 rename is local to `propose-new-characters`'s Phase 13 reference.

## Architecture Check

1. Editing the shared doctrine for M1 keeps both critic-pass consumers aligned from one site rather than duplicating the requirement per skill. The M2 rename is a one-file, one-string label change with verified zero blast radius.
2. No backwards-compatibility shim; no deterministic gate added (M1 stays at the skill-prose / LLM-critic layer per SPEC-53 §Key design decisions).

## Verification Layers

1. Critic-pass guidance names the four required rationale elements (world pressure + scene behavior + cannot-swap reason + rejected weaker alternative) → manual review of `protagonist-grade-character-engine.md`.
2. Phase 13 slot is renamed and no surrounding wording implies protagonist-grade is optional for other cards → codebase grep-proof (old string gone; new string present) + manual review.
3. Single-layer (skill-prose) ticket: no schema/validator/test layer applies — verification is grep + manual prose review only.

## What to Change

### 1. M1 — critic-rationale substance (`protagonist-grade-character-engine.md`)

- Require Blandness Executioner and Protagonist-Grade Critic PASS rationales to name: one concrete world pressure, one scene behavior, one cannot-swap reason, and one rejected weaker alternative. Frame as a tightening of the existing one-line-rationale rule, not a new deterministic check.

### 2. M2 — Phase 13 slot rename (`phases-11-13-score-filter-diversify.md`)

- Rename slot #10 "Protagonist-grade load-bearing character" to a name that cannot be misread as single-card scope (e.g., "highest-intensity load-bearing anchor"). Confirm no surrounding phase wording implies protagonist-grade is optional for other cards.

## Files to Touch

- `.claude/skills/_shared-references/protagonist-grade-character-engine.md` (modify)
- `.claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md` (modify)

## Out of Scope

- Any deterministic validator gate enforcing rationale substance (rejected — avoids validation bureaucracy).
- Changes to `deepen-character-proposal`'s own SKILL.md beyond what the shared-doctrine edit propagates.
- Renaming any schema field, validator, or tool (M2 is a prose label only).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "world pressure" .claude/skills/_shared-references/protagonist-grade-character-engine.md` (or equivalent) confirms the four-element rationale requirement is present in the critic-pass doctrine.
2. `grep -c "Protagonist-grade load-bearing character" .claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md` returns 0; the renamed slot string returns ≥1.

### Invariants

1. No deterministic gate is added — M1 remains skill-prose / LLM-critic discipline.
2. The M2 rename has zero blast radius beyond the single reference file (verified by pipeline-wide grep).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based (grep-proofs) and the existing LLM-critic discipline is named in Assumption Reassessment.`

### Commands

1. `grep -rn "Protagonist-grade load-bearing character" .claude/skills/` (expect 0 after rename)
2. `grep -n "rejected weaker alternative" .claude/skills/_shared-references/protagonist-grade-character-engine.md` (expect ≥1 — the M1 four-element requirement)
