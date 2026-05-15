# SPEC28STOCONHAR-004: Reconcile story-skill count and prose-receipt citation cascade

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes - `branching-story-turn-cycle` and `branching-story-health-audit` skill prose; SPEC-28 D4 status note.
**Deps**: `archive/tickets/SPEC28STOCONHAR-001.md`; `specs/SPEC-28-story-contract-hardening.md` D4.

## Problem

At intake, SPEC-28 D4 remained active after D1 landed. `branching-story-turn-cycle/SKILL.md` still said Phase 9 validated "the 6 turn-cycle-additional checks" in its HARD-GATE and process-flow text while the same skill enumerated 7 turn-cycle-additional checks. `branching-story-health-audit/SKILL.md` still said "Seven sub-phases run in sequence" while the process flow included 2a-2h, and it still cited the prose receipt as `§4.5` even though the shared contract defines the prose receipt at `§4.6`.

## Assumption Reassessment (2026-05-15)

1. At intake, verified against `.claude/skills/branching-story-turn-cycle/SKILL.md`: the HARD-GATE text and process flow still said 6 turn-cycle-additional checks, while the validation section said "Plus 7 turn-cycle-additional checks." The live mismatch was count prose only; no record schema or validator behavior changes were in scope.
2. At intake, verified against `.claude/skills/branching-story-health-audit/SKILL.md`: the audit overview still said "Seven sub-phases run in sequence" while the live process flow included 2a through 2h, and the record-schema list cited prose receipt `§4.5`.
3. Cross-skill contract boundary: this ticket owns story-pipeline skill count/citation prose across `branching-story-turn-cycle` and `branching-story-health-audit`; it does not own D1's already-landed `branching-story-prose-attach` hash-integrity implementation.
4. FOUNDATIONS principle motivating the cleanup: `docs/FOUNDATIONS.md` §Story Bundles requires story-pipeline skills to preserve hard coherence gates and the Plan-Authority Boundary. Count/citation drift in HARD-GATE-facing prose weakens operator auditability even when behavior is otherwise unchanged.
5. HARD-GATE enforcement surface: both affected skills carry HARD-GATE-facing validation prose. The intended change is additive truthing only: update stale counts/citations without removing any validation step, weakening the Mystery Reserve firewall, or changing canon/world writes.
6. Dependency state: `archive/tickets/SPEC28STOCONHAR-001.md` landed D1 and updated prose-attach's deterministic-check count to 8. D4's remaining intake-owned surface was the turn-cycle and health-audit cascade named in `specs/SPEC-28-story-contract-hardening.md`.
7. Explicit spec reference state: at intake, `specs/SPEC-28-story-contract-hardening.md` D4 still described the count/citation cascade as current-state work. This ticket owns adding a dated D4 implementation note; broad row-by-row rewriting of the proposal spec remains out of scope.

## Architecture Check

1. Updating the stale count/citation prose in place is cleaner than adding explanatory exceptions because the live skills should have one authoritative count for each validation surface.
2. No backwards-compatibility shims or aliases are introduced; this is a prose contract truthing ticket.

## Verification Layers

1. Turn-cycle count consistency -> codebase grep-proof over `.claude/skills/branching-story-turn-cycle/SKILL.md`.
2. Health-audit sub-phase count consistency -> codebase grep-proof over `.claude/skills/branching-story-health-audit/SKILL.md`.
3. Prose-receipt citation correctness -> codebase grep-proof that health-audit cites `§4.6` and has no operational `§4.5` prose-receipt citation.

## Landed Changes

### 1. Correct turn-cycle count prose

In `.claude/skills/branching-story-turn-cycle/SKILL.md`, updated the HARD-GATE and process-flow references from 6 turn-cycle-additional checks to 7 so they match the existing validation list. The HARD-GATE summary now names Canon Baseline Drift as the seventh additional check.

### 2. Correct health-audit count and citation prose

In `.claude/skills/branching-story-health-audit/SKILL.md`, updated the "Seven sub-phases" line to "Eight sub-phases" and corrected the prose-receipt citation from `§4.5` to `§4.6`.

### 3. Mark SPEC-28 D4 as landed

In `specs/SPEC-28-story-contract-hardening.md`, added a dated implementation note under D4. The remaining D4 current-state prose in that proposal spec is historical intake context.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `specs/SPEC-28-story-contract-hardening.md` (modify - D4 implementation note only)

## Out of Scope

- Any change to validation behavior, record schemas, validators, patch-engine ops, or world/story content.
- Any further prose-attach hash-integrity work; D1 is archived at `archive/tickets/SPEC28STOCONHAR-001.md`.
- Any broader SPEC-28 deliverables besides D4.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "6 turn-cycle-additional|Plus 7 turn-cycle-additional" .claude/skills/branching-story-turn-cycle/SKILL.md` shows no stale 6-count references and retains the 7-check list heading.
2. `grep -nE "Seven sub-phases|Eight sub-phases" .claude/skills/branching-story-health-audit/SKILL.md` shows no stale "Seven sub-phases" operational wording and at least one "Eight sub-phases" reference.
3. `grep -nE "prose receipt \\(§4\\.[56]\\)" .claude/skills/branching-story-health-audit/SKILL.md` returns only the corrected `§4.6` schema citation.

### Invariants

1. No validation step is removed or weakened.
2. Mystery Reserve / HARD-GATE behavior remains unchanged; this ticket only truths counts and citations.

## Test Plan

### New/Modified Tests

1. `None - documentation-only skill prose ticket; verification is command-based and the live mismatch is named in Assumption Reassessment.`

### Commands

1. `grep -nE "6 turn-cycle-additional|Plus 7 turn-cycle-additional" .claude/skills/branching-story-turn-cycle/SKILL.md`
2. `grep -nE "Seven sub-phases|Eight sub-phases" .claude/skills/branching-story-health-audit/SKILL.md`
3. `grep -nE "prose receipt \\(§4\\.[56]\\)" .claude/skills/branching-story-health-audit/SKILL.md`
4. `git diff --check`

## Outcome

Completion date: 2026-05-15.

Completed. `branching-story-turn-cycle` now uses the 7-count consistently for Phase 9 turn-cycle-additional checks, and its HARD-GATE summary includes Canon Baseline Drift in the inline check list. `branching-story-health-audit` now states eight structural sub-phases and cites the prose receipt at `§4.6`. SPEC-28 D4 now has a dated implementation note recording this ticket as landed.

## Verification Result

1. `grep -nE "6 turn-cycle-additional|Plus 7 turn-cycle-additional" .claude/skills/branching-story-turn-cycle/SKILL.md` — PASS; returned only `Plus 7 turn-cycle-additional checks` in the validation list.
2. `grep -nE "Seven sub-phases|Eight sub-phases" .claude/skills/branching-story-health-audit/SKILL.md` — PASS; returned only `Eight sub-phases run in sequence`.
3. `grep -nE "prose receipt \\(§4\\.[56]\\)" .claude/skills/branching-story-health-audit/SKILL.md` — PASS; returned only the `prose receipt (§4.6)` schema citation.
4. `rg -n "7 deterministic|seven deterministic|6 turn-cycle-additional|Seven sub-phases|prose receipt \\(§4\\.5\\)" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md specs/SPEC-28-story-contract-hardening.md` — PASS for the owned operational surfaces; remaining hits are historical D1/D4 proposal intake/problem prose in `specs/SPEC-28-story-contract-hardening.md`, whose D1 and D4 sections carry dated implementation notes.
5. `git diff --check` — PASS.

## Deviations

1. The explicit `specs/SPEC-28-story-contract-hardening.md` reference was added to `Files to Touch` during reassessment because D4's same-seam current-state prose would otherwise become stale. The spec was truthed with a dated implementation note rather than broad historical prose rewriting.
2. No executable skill dry-run exists for these prose-only workflow contracts. Verification used focused grep/stale-anchor proof plus manual review of the affected HARD-GATE/process-flow text.
