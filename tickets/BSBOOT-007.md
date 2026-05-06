# BSBOOT-007: Broaden Phase 9 gate 2 audit scope (state, not just `applied_event_ops`)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — `branching-story-bootstrap/references/phase-9-validation-gates.md` and `phase-4-firewall-and-invariant-audit.md` only.
**Deps**: none

## Problem

Phase 9 gate 2 currently checks invariant compatibility against `applied_event_ops` only:

> `references/phase-9-validation-gates.md:10` — gate 2: "All `applied_event_ops` respect every world INV's `break_conditions`"

But at PG-0001 the genesis event has no real ops (`references/phase-7-root-page-render.md:135` — `ops: []`; the page record's `state_snapshot` is the bedrock). Gate 2 therefore trivially passes at bootstrap, regardless of whether an imported SF, an OBL, a THR, a storylet precondition, or a CHC `likely_effects` implies an invariant violation.

Phase 4 (`references/phase-4-firewall-and-invariant-audit.md:19-26`) does audit the broader state — premise + cast + initial threads + initial obligations — but the *final* gate's wording does not backstop the same surface, so a Phase 5 thread or Phase 6 storylet introduced after the Phase 4 sketch could carry an unaudited invariant tension into PG-0001 without firing gate 2.

## Assumption Reassessment (2026-05-06)

1. `references/phase-9-validation-gates.md:10` — gate 2 wording verified.
2. `references/phase-7-root-page-render.md:135` — SE-0001 emits `ops: []` at genesis. Verified.
3. `references/phase-4-firewall-and-invariant-audit.md:19-26` — Phase 4 audits premise + cast + initial-threads + initial-obligations against every INV. Verified.
4. Cross-skill / cross-artifact boundary: invariant audit is governed by FOUNDATIONS Rule 4. The bootstrap's gate 2 is the bootstrap-time enforcement surface; `branching-story-page-cycle` runs a per-page invariant audit at every tick. Strengthening gate 2 brings bootstrap-time enforcement in line with the per-tick rigor.
5. FOUNDATIONS principle restated: Rule 4 (Causal Closure / Distribution) requires distribution claims and capability claims to be invariant-compatible. Gate 2 is the bootstrap's Rule 4 enforcement gate; the change strengthens it without weakening any other gate.
6. HARD-GATE-semantics check: the change *strengthens* Phase 9, which the HARD-GATE explicitly requires to record PASS for every gate. No HARD-GATE relaxation.
7. Mystery Reserve firewall: gate 1 (Rule 7) is unchanged. The change is to gate 2 (Rule 4) only.

## Architecture Check

1. **Why cleaner**: the Phase 4 audit and Phase 9 gate 2 are now anchored to the same audit surface (premise + cast + initial SF + initial THR + initial OBL + initial SLT preconditions + state_snapshot + emitted CHC `likely_effects`). The two-phase structure (audit-then-gate) becomes a true backstop instead of a wide-then-narrow funnel.
2. No backwards-compatibility shim. The gate's wording strengthens; the rationale-recording form (`PASS — <one-line rationale>`) remains unchanged.

## Verification Layers

1. Gate 2 wording covers the audit surface Phase 4 audits → manual review (compare phase-4 reference against new gate-2 wording).
2. Phase 4 sketch ↔ Phase 5 emitted records consistency — Phase 4 produces an `audited_thread_obligation_sketch`; Phase 5 emitted records are compared against it; divergence triggers re-audit before Phase 6 → manual review.
3. FOUNDATIONS Rule 4 alignment → FOUNDATIONS alignment check.
4. Phase 9 gate 1 (Rule 7) untouched → codebase grep-proof.

## What to Change

### 1. `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md`

- Replace gate 2's "Check" cell:

  **Before:**

  ```
  | 2 | Invariant compatibility (Rule 4) | All `applied_event_ops` respect every world INV's `break_conditions` | Phase 4 |
  ```

  **After:**

  ```
  | 2 | Invariant compatibility (Rule 4) | Every initial SF, THR, OBL, SLT precondition, PG-0001 `state_snapshot` field, and CHC `likely_effects` is compatible with every loaded INV's `break_conditions`; the Phase 5 emitted records (THR + OBL) match the Phase 4 audited sketch (`audited_thread_obligation_sketch`) | Phase 4 |
  ```

- Update the "Whole-class loads from Pre-flight power gates 1, 2, and 9" paragraph at the bottom of the file: gate 2's audit input is the broader state, not just event ops.

### 2. `.claude/skills/branching-story-bootstrap/references/phase-4-firewall-and-invariant-audit.md`

- After the existing "Invariant audit (Rule 4 enforcement)" block (line 19-26), add:

  > **Output to STORY_KERNEL.md (Rule 4 anchor)**: populate `audited_thread_obligation_sketch` on the kernel frontmatter — a structured snapshot of the threads + obligations the audit reasoned against (each entry: `id` (provisional), `type`, `salience`, `urgency`, `payoff_modes_sketch`, `INV_branches_audited[]`). Phase 9 gate 2 compares the Phase 5 emitted records against this sketch; if a Phase 5 thread or obligation diverges materially (different INV branches engaged, different distribution claims), re-run the relevant audit branches before proceeding to Phase 6.

### 3. `.claude/skills/branching-story-bootstrap/templates/story-kernel.md`

- Add a new optional frontmatter field `audited_thread_obligation_sketch` after `invariants_acknowledged` (line 36-39), with a one-line comment cross-referencing Phase 4. Mark it optional but recommended for any bootstrap that wants programmatic Phase-5-vs-Phase-4 divergence detection.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-4-firewall-and-invariant-audit.md` (modify)
- `.claude/skills/branching-story-bootstrap/templates/story-kernel.md` (modify)

## Out of Scope

- Adding a programmatic invariant-audit validator (a future ticket may add this; for now the gate-2-records-PASS-with-rationale discipline is the enforcement surface).
- Editing `branching-story-page-cycle`'s per-tick invariant audit (already broader than bootstrap's gate 2; no change needed).
- Migrating committed bundles whose STORY_KERNEL.md lacks `audited_thread_obligation_sketch`. The field is forward-only and optional; old bundles remain valid.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "applied_event_ops" .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` returns no match in gate 2's row (gate 2 no longer references this narrower surface as its sole check).
2. `grep -nE "audited_thread_obligation_sketch" .claude/skills/branching-story-bootstrap/references/phase-4-firewall-and-invariant-audit.md .claude/skills/branching-story-bootstrap/templates/story-kernel.md .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` returns matches in all three files.
3. Gate 1 wording (Rule 7 mystery firewall) is unchanged.

### Invariants

1. Phase 4 audit surface and Phase 9 gate 2 audit surface name the same set of records.
2. Rule 4 enforcement is anchored at gate 2; rule 7 enforcement is anchored at gate 1; the two remain disjoint enforcement surfaces.
3. The HARD-GATE's per-gate PASS+rationale discipline is preserved (gate 2 still records PASS with a one-line rationale).

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -nE "Invariant compatibility|break_conditions" .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` — confirms gate 2 references the broader audit surface.
2. `grep -n "audited_thread_obligation_sketch" .claude/skills/branching-story-bootstrap/` — confirms the new field is documented in Phase 4, the kernel template, and gate 2.
