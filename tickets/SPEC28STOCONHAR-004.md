# SPEC28STOCONHAR-004: Reconcile story-skill count and prose-receipt citation cascade

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes - `branching-story-turn-cycle` and `branching-story-health-audit` skill prose only.
**Deps**: `archive/tickets/SPEC28STOCONHAR-001.md`; `specs/SPEC-28-story-contract-hardening.md` D4.

## Problem

SPEC-28 D4 remains active after D1 landed. `branching-story-turn-cycle/SKILL.md` still says Phase 9 validates "the 6 turn-cycle-additional checks" in its HARD-GATE and process-flow text while the same skill enumerates 7 turn-cycle-additional checks. `branching-story-health-audit/SKILL.md` still says "Seven sub-phases run in sequence" while the process flow includes 2a-2h, and it still cites the prose receipt as `§4.5` even though the shared contract defines the prose receipt at `§4.6`.

## Assumption Reassessment (2026-05-15)

1. Verified against `.claude/skills/branching-story-turn-cycle/SKILL.md`: the HARD-GATE text and process flow still say 6 turn-cycle-additional checks, while the validation section says "Plus 7 turn-cycle-additional checks." The live mismatch is count prose only; no record schema or validator behavior changes are in scope.
2. Verified against `.claude/skills/branching-story-health-audit/SKILL.md`: the audit overview still says "Seven sub-phases run in sequence" while the live process flow includes 2a through 2h, and the record-schema list cites prose receipt `§4.5`.
3. Cross-skill contract boundary: this ticket owns story-pipeline skill count/citation prose across `branching-story-turn-cycle` and `branching-story-health-audit`; it does not own D1's already-landed `branching-story-prose-attach` hash-integrity implementation.
4. FOUNDATIONS principle motivating the cleanup: `docs/FOUNDATIONS.md` §Story Bundles requires story-pipeline skills to preserve hard coherence gates and the Plan-Authority Boundary. Count/citation drift in HARD-GATE-facing prose weakens operator auditability even when behavior is otherwise unchanged.
5. HARD-GATE enforcement surface: both affected skills carry HARD-GATE-facing validation prose. The intended change is additive truthing only: update stale counts/citations without removing any validation step, weakening the Mystery Reserve firewall, or changing canon/world writes.
6. Dependency state: `archive/tickets/SPEC28STOCONHAR-001.md` landed D1 and updated prose-attach's deterministic-check count to 8. D4's remaining owned surface is the turn-cycle and health-audit cascade named in `specs/SPEC-28-story-contract-hardening.md`.

## Architecture Check

1. Updating the stale count/citation prose in place is cleaner than adding explanatory exceptions because the live skills should have one authoritative count for each validation surface.
2. No backwards-compatibility shims or aliases are introduced; this is a prose contract truthing ticket.

## Verification Layers

1. Turn-cycle count consistency -> codebase grep-proof over `.claude/skills/branching-story-turn-cycle/SKILL.md`.
2. Health-audit sub-phase count consistency -> codebase grep-proof over `.claude/skills/branching-story-health-audit/SKILL.md`.
3. Prose-receipt citation correctness -> codebase grep-proof that health-audit cites `§4.6` and has no operational `§4.5` prose-receipt citation.

## What to Change

### 1. Correct turn-cycle count prose

In `.claude/skills/branching-story-turn-cycle/SKILL.md`, update the HARD-GATE and process-flow references from 6 turn-cycle-additional checks to 7 so they match the existing validation list.

### 2. Correct health-audit count and citation prose

In `.claude/skills/branching-story-health-audit/SKILL.md`, update the "Seven sub-phases" line to "Eight sub-phases" and correct the prose-receipt citation from `§4.5` to `§4.6`.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- Any change to validation behavior, record schemas, validators, patch-engine ops, or world/story content.
- Any further prose-attach hash-integrity work; D1 is archived at `archive/tickets/SPEC28STOCONHAR-001.md`.
- Any broader SPEC-28 deliverables besides D4.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "6 turn-cycle-additional|Plus 7 turn-cycle-additional" .claude/skills/branching-story-turn-cycle/SKILL.md` shows no stale 6-count references and retains the 7-check list heading.
2. `grep -nE "Seven sub-phases|Eight sub-phases" .claude/skills/branching-story-health-audit/SKILL.md` shows no stale "Seven sub-phases" operational wording and at least one "Eight sub-phases" reference.
3. `grep -n "prose receipt (§4.5)" .claude/skills/branching-story-health-audit/SKILL.md` returns no hits, and `grep -n "prose receipt (§4.6)" .claude/skills/branching-story-health-audit/SKILL.md` returns the corrected schema citation.

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
