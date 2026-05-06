# BSBOOT-007: Broaden Phase 9 gate 2 audit scope (state, not just `applied_event_ops`)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — `branching-story-bootstrap` reference/template prose only.
**Deps**: none

## Problem

At intake, Phase 9 gate 2 checked invariant compatibility against `applied_event_ops` only:

> `references/phase-9-validation-gates.md:10` — gate 2: "All `applied_event_ops` respect every world INV's `break_conditions`"

At PG-0001 the genesis event has no real ops (`references/phase-7-root-page-render.md` — `ops: []`; the page record's `state_snapshot` is the bedrock). Before this ticket, gate 2 therefore trivially passed at bootstrap, regardless of whether an imported SF, an OBL, a THR, a storylet precondition, or a CHC `likely_effects` implied an invariant violation.

Phase 4 (`references/phase-4-firewall-and-invariant-audit.md`) now anchors the broader Rule 4 audit and Phase 9 gate 2 backstops the same surface after later bootstrap artifacts exist, so a Phase 5 thread, Phase 6 storylet, Phase 7 state snapshot, or Phase 8 choice cannot carry an unaudited invariant tension into PG-0001 without firing gate 2.

## Assumption Reassessment (2026-05-06)

1. `references/phase-9-validation-gates.md:10` — gate 2 wording verified at intake and replaced with the broader Rule 4 audit surface.
2. `references/phase-7-root-page-render.md:134` — SE-0001 emits `ops: []` at genesis. Verified.
3. `references/phase-4-firewall-and-invariant-audit.md` — Phase 4 now names imported initial SFs plus sketched initial threads/obligations as the Rule 4 audit anchor, and Phase 9 finalizes SLT preconditions, PG-0001 `state_snapshot`, and CHC `likely_effects` against the same INV `break_conditions`.
4. Cross-skill / cross-artifact boundary: invariant audit is governed by FOUNDATIONS Rule 4. The bootstrap's gate 2 is the bootstrap-time enforcement surface; `branching-story-page-cycle` runs a per-page invariant audit at every tick. Strengthening gate 2 brings bootstrap-time enforcement in line with the per-tick rigor.
5. FOUNDATIONS principle restated: Rule 4 (No Globalization by Accident) requires local capability and distribution claims not to be silently treated as universal. Gate 2 is the bootstrap's Rule 4 enforcement gate; the change strengthens it without weakening any other gate.
6. HARD-GATE-semantics check: the change *strengthens* Phase 9, which the HARD-GATE explicitly requires to record PASS for every gate. No HARD-GATE relaxation.
7. Mystery Reserve firewall: gate 1 (Rule 7) is unchanged. The change is to gate 2 (Rule 4) only.
8. Same-seam consumer found during reassessment: `references/governance-and-foundations.md` maps Rule 4 to Phase 4 and Phase 9 gate 2 and still names the narrower premise/cast/thread/obligation surface. This ticket absorbs that prose truthing so the bootstrap's FOUNDATIONS alignment doc matches the widened gate 2 contract.
9. Post-review blocker resolved in place: Phase 9 gate 2 requires `audited_thread_obligation_sketch`, so Phase 4 and the STORY_KERNEL template now make the field required for new bootstrap runs. Historical bundles without the field remain out of migration scope.

## Architecture Check

1. **Why cleaner**: the Phase 4 audit and Phase 9 gate 2 are now anchored to the same audit surface (premise + cast + initial SF + initial THR + initial OBL + initial SLT preconditions + state_snapshot + emitted CHC `likely_effects`). The two-phase structure (audit-then-gate) becomes a true backstop instead of a wide-then-narrow funnel.
2. No backwards-compatibility shim. The gate's wording strengthens; the rationale-recording form (`PASS — <one-line rationale>`) remains unchanged.

## Verification Layers

1. Gate 2 wording covers the audit surface Phase 4 audits → manual review (compare phase-4 reference against new gate-2 wording).
2. Phase 4 sketch ↔ Phase 5 emitted records consistency — Phase 4 produces an `audited_thread_obligation_sketch`; Phase 5 emitted records are compared against it; divergence triggers re-audit before Phase 6 → manual review.
3. FOUNDATIONS Rule 4 alignment → FOUNDATIONS alignment check.
4. Phase 9 gate 1 (Rule 7) untouched → codebase grep-proof.

## Landed Changes

### 1. `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md`

- Replaced gate 2's "Check" cell:

  **Before:**

  ```
  | 2 | Invariant compatibility (Rule 4) | All `applied_event_ops` respect every world INV's `break_conditions` | Phase 4 |
  ```

  **After:**

  ```
  | 2 | Invariant compatibility (Rule 4) | Every initial SF, THR, OBL, SLT precondition, PG-0001 `state_snapshot` field, and CHC `likely_effects` is compatible with every loaded INV's `break_conditions`; the Phase 5 emitted records (THR + OBL) match the Phase 4 audited sketch (`audited_thread_obligation_sketch`) | Phase 4 |
  ```

- Updated the "Whole-class loads from Pre-flight power gates 1, 2, and 9" paragraph at the bottom of the file: gate 2's audit input is the broader state, not just event ops.

### 2. `.claude/skills/branching-story-bootstrap/references/phase-4-firewall-and-invariant-audit.md`

- Broadened the invariant-audit introduction to include imported initial SFs and the Phase 9 finalization surface, then added:

  > **Output to STORY_KERNEL.md (Rule 4 anchor)**: populate `audited_thread_obligation_sketch` on the kernel frontmatter for every new bootstrap — a structured snapshot of the threads + obligations the audit reasoned against (each entry: `id` (provisional), `type`, `salience`, `urgency`, `payoff_modes_sketch`, `INV_branches_audited[]`). Phase 9 gate 2 compares the Phase 5 emitted records against this sketch; if a Phase 5 thread or obligation diverges materially (different INV branches engaged, different distribution claims), re-run the relevant audit branches before proceeding to Phase 6.

### 3. `.claude/skills/branching-story-bootstrap/templates/story-kernel.md`

- Added a new required-for-new-bootstraps frontmatter field `audited_thread_obligation_sketch` after `invariants_acknowledged`, with structured THR/OBL sketch fields cross-referencing Phase 4. Historical bundles without the field remain valid and are not migrated by this ticket.

### 4. `.claude/skills/branching-story-bootstrap/references/governance-and-foundations.md`

- Updated the Rule 4 row so it names the broadened Phase 4 / Phase 9 audit surface rather than only premise + cast + threads + obligations.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-4-firewall-and-invariant-audit.md` (modify)
- `.claude/skills/branching-story-bootstrap/templates/story-kernel.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/governance-and-foundations.md` (modify)

## Out of Scope

- Adding a programmatic invariant-audit validator (a future ticket may add this; for now the gate-2-records-PASS-with-rationale discipline is the enforcement surface).
- Editing `branching-story-page-cycle`'s per-tick invariant audit (already broader than bootstrap's gate 2; no change needed).
- Migrating committed bundles whose STORY_KERNEL.md lacks `audited_thread_obligation_sketch`. The field is forward-only and required for new bootstrap runs; old bundles remain valid.

## Acceptance Criteria

### Tests That Must Pass

1. `! grep -nE 'applied_event_ops' .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` returns no match (gate 2 no longer references this narrower surface as its sole check).
2. `grep -nE 'audited_thread_obligation_sketch' .claude/skills/branching-story-bootstrap/references/phase-4-firewall-and-invariant-audit.md .claude/skills/branching-story-bootstrap/templates/story-kernel.md .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` returns matches in all three files.
3. Gate 1 wording (Rule 7 mystery firewall) is unchanged.
4. `grep -nE 'Rule 4: No Globalization by Accident|initial SF|likely_effects' .claude/skills/branching-story-bootstrap/references/governance-and-foundations.md` confirms the FOUNDATIONS alignment row names the broadened audit surface.
5. `grep -nE 'required.*audited_thread_obligation_sketch|audited_thread_obligation_sketch.*required' .claude/skills/branching-story-bootstrap/references/phase-4-firewall-and-invariant-audit.md .claude/skills/branching-story-bootstrap/templates/story-kernel.md` confirms the Phase 4/template contract makes the sketch mandatory for new bootstrap runs.

### Invariants

1. Phase 4 audit surface and Phase 9 gate 2 audit surface name the same set of records.
2. Rule 4 enforcement is anchored at gate 2; rule 7 enforcement is anchored at gate 1; the two remain disjoint enforcement surfaces.
3. The HARD-GATE's per-gate PASS+rationale discipline is preserved (gate 2 still records PASS with a one-line rationale).
4. New bootstrap runs always populate the Phase 4 `audited_thread_obligation_sketch` that Phase 9 gate 2 compares against; old bundles without the field remain out of migration scope.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `! grep -nE 'applied_event_ops' .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` — confirms gate 2 no longer references the narrower event-op-only surface.
2. `grep -nE 'Invariant compatibility|break_conditions' .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` — confirms gate 2 references the broader audit surface.
3. `grep -nE 'audited_thread_obligation_sketch' .claude/skills/branching-story-bootstrap/references/phase-4-firewall-and-invariant-audit.md .claude/skills/branching-story-bootstrap/templates/story-kernel.md .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` — confirms the new field is documented in Phase 4, the kernel template, and gate 2.
4. `grep -nE 'Rule 4: No Globalization by Accident|initial SF|likely_effects' .claude/skills/branching-story-bootstrap/references/governance-and-foundations.md` — confirms the alignment row matches gate 2's broadened surface.
5. `grep -nE 'No `forbidden`-status M-NNNN resolved by any storylet, fact, obligation, or page' .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` — confirms gate 1 wording is unchanged.
6. `grep -nE 'required.*audited_thread_obligation_sketch|audited_thread_obligation_sketch.*required' .claude/skills/branching-story-bootstrap/references/phase-4-firewall-and-invariant-audit.md .claude/skills/branching-story-bootstrap/templates/story-kernel.md` — confirms the required sketch contract.
7. `git diff --check` — patch hygiene.

## Outcome

Completed: 2026-05-06.

Phase 9 gate 2 now checks the full bootstrap Rule 4 surface: initial SFs, THRs, OBLs, SLT preconditions, PG-0001 `state_snapshot`, CHC `likely_effects`, and Phase 5-vs-Phase 4 thread/obligation sketch consistency. Phase 4 now documents the required-for-new-bootstraps `audited_thread_obligation_sketch` Rule 4 anchor, the STORY_KERNEL template includes the required structured field, and the bootstrap FOUNDATIONS alignment reference names the same broadened surface.

## Verification Result

Completed:

1. `! grep -nE 'applied_event_ops' .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` — pass; no matches.
2. `grep -nE 'Invariant compatibility|break_conditions' .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` — pass; gate 2 and whole-class-load text name the broader audit surface.
3. `grep -nE 'audited_thread_obligation_sketch' .claude/skills/branching-story-bootstrap/references/phase-4-firewall-and-invariant-audit.md .claude/skills/branching-story-bootstrap/templates/story-kernel.md .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` — pass; matches in all three required files.
4. `grep -nE 'Rule 4: No Globalization by Accident|initial SF|likely_effects' .claude/skills/branching-story-bootstrap/references/governance-and-foundations.md` — pass; the Rule 4 alignment row names the broadened audit surface.
5. `grep -nE 'No `forbidden`-status M-NNNN resolved by any storylet, fact, obligation, or page' .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` — pass; gate 1 wording is unchanged.
6. `grep -nE 'required.*audited_thread_obligation_sketch|audited_thread_obligation_sketch.*required' .claude/skills/branching-story-bootstrap/references/phase-4-firewall-and-invariant-audit.md .claude/skills/branching-story-bootstrap/templates/story-kernel.md` — pass; Phase 4 and the template make the sketch required for new bootstrap runs.
7. `git diff --check` — pass.

## Deviations

Same-seam reassessment added `.claude/skills/branching-story-bootstrap/references/governance-and-foundations.md` to the file set because it is the bootstrap skill's FOUNDATIONS alignment consumer for Rule 4 and gate 2. No runtime/tool changes or programmatic invariant-audit validator were added.

## Post-Ticket Review Blocker (2026-05-06)

Archival blocked during `$post-ticket-review`: the landed Phase 9 gate 2 wording makes `audited_thread_obligation_sketch` part of the mandatory invariant-compatibility check, but the landed STORY_KERNEL template still marks `audited_thread_obligation_sketch` as optional and Phase 4's summary line says it is populated "when the bootstrap wants Phase 5-vs-Phase 4 divergence detection." That leaves the new gate with no guaranteed sketch to compare against on new bootstrap runs.

Resolution: the blocker was fixed in this same ticket by making `audited_thread_obligation_sketch` required for new bootstrap runs in Phase 4 and the STORY_KERNEL template, while preserving old-bundle validity as an out-of-scope migration concern. Focused grep/manual-review proof was rerun, and the ticket was restored to `COMPLETED`.
