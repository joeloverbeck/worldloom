# SPEC28STOCONHAR-004: Reconcile story-skill count and prose-receipt citation cascade

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes - previously landed in `branching-story-turn-cycle` and `branching-story-health-audit` skill prose; `specs/SPEC-28-story-contract-hardening.md` D4 status note.
**Deps**: `archive/tickets/SPEC28STOCONHAR-001.md`; `specs/SPEC-28-story-contract-hardening.md` D4.

## Problem

At intake, SPEC-28 D4 remained active after D1 landed. `branching-story-turn-cycle/SKILL.md` still said Phase 9 validated "the 6 turn-cycle-additional checks" in its HARD-GATE and process-flow text while the same skill enumerated 7 turn-cycle-additional checks. `branching-story-health-audit/SKILL.md` still said "Seven sub-phases run in sequence" while the process flow included 2a-2h, and it still cited the prose receipt as `§4.5` even though the shared contract defines the prose receipt at `§4.6`.

## Assumption Reassessment (2026-05-15)

1. Current live state verified against `.claude/skills/branching-story-turn-cycle/SKILL.md`: the HARD-GATE and process-flow text now say 7 turn-cycle-additional checks, and Phase 9 lists seven checks including "Canon Baseline Drift." The original 6-count mismatch is already fixed in the live skill.
2. Current live state verified against `.claude/skills/branching-story-health-audit/SKILL.md`: the HARD-GATE/process-flow text now says 8 structural sub-phases, Phase 2 lists 2a through 2h, the overview says "Eight sub-phases run in sequence," and the record-schema list cites prose receipt `§4.6`.
3. Cross-skill contract boundary: this ticket owns story-pipeline skill count/citation prose across `branching-story-turn-cycle` and `branching-story-health-audit`; it does not own D1's already-landed `branching-story-prose-attach` hash-integrity implementation.
4. FOUNDATIONS / HARD-GATE surface: both affected skills carry HARD-GATE-facing validation prose. `docs/HARD-GATE-DISCIPLINE.md` was read during post-ticket review; the landed change is truthing only and does not remove any validation step, weaken the Mystery Reserve firewall, change approval-token behavior, or change canon/story writes.
5. Dependency state: `archive/tickets/SPEC28STOCONHAR-001.md` landed D1 and updated prose-attach's deterministic-check count to 8. D4's remaining surface is the turn-cycle and health-audit cascade named in `specs/SPEC-28-story-contract-hardening.md`.
6. Explicit spec reference state: `specs/SPEC-28-story-contract-hardening.md` D4 already carries a dated implementation note for SPEC28STOCONHAR-004 and records the remaining D4 prose as historical intake context.
7. Post-review archive collision state: `archive/tickets/SPEC28STOCONHAR-004.md` already existed before review while a redundant active `tickets/SPEC28STOCONHAR-004.md` also remained. Post-ticket review resolved the duplicate by amending this canonical archived handoff and removing the active source path.

## Architecture Check

1. Reconciling the stale count/citation prose in place is cleaner than adding explanatory exceptions because the live skills should have one authoritative count for each validation surface.
2. No backwards-compatibility shims or alias paths were introduced; this is a prose contract truthing ticket.

## Verification Layers

1. Turn-cycle count consistency -> codebase grep-proof over `.claude/skills/branching-story-turn-cycle/SKILL.md`.
2. Health-audit sub-phase count consistency -> codebase grep-proof over `.claude/skills/branching-story-health-audit/SKILL.md`.
3. Prose-receipt citation correctness -> codebase grep-proof that health-audit cites `§4.6` and has no operational `§4.5` prose-receipt citation.
4. Cross-file count sweep post-D1 -> codebase grep-proof/manual classification: operational story-pipeline surfaces outside `branching-story-prose-attach` do not preserve a stale current "7 deterministic checks" claim.

## Landed Changes

### 1. Corrected turn-cycle count prose

In `.claude/skills/branching-story-turn-cycle/SKILL.md`, the HARD-GATE and process-flow references now use 7 turn-cycle-additional checks, matching the validation list. The HARD-GATE summary names Canon Baseline Drift as the seventh additional check.

### 2. Corrected health-audit count and citation prose

In `.claude/skills/branching-story-health-audit/SKILL.md`, the structural overview now states eight sub-phases, the process flow lists 2a-2h, and the record-schema list cites the prose receipt at `§4.6`.

### 3. Marked SPEC-28 D4 as landed

`specs/SPEC-28-story-contract-hardening.md` carries a dated implementation note under D4. The remaining D4 current-state prose in that proposal spec is historical intake context.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (previously modified for this ticket's landed surface)
- `.claude/skills/branching-story-health-audit/SKILL.md` (previously modified for this ticket's landed surface)
- `specs/SPEC-28-story-contract-hardening.md` (previously modified - D4 implementation note only)
- `archive/tickets/SPEC28STOCONHAR-004.md` (amended during post-ticket review)
- `tickets/SPEC28STOCONHAR-004.md` (removed during post-ticket review as the redundant active copy)

## Out of Scope

- Any validation behavior, record schema, validator, patch-engine op, or world/story content change.
- The prose-attach-internal 7 -> 8 deterministic-check count bump — that is SPEC28STOCONHAR-001 / SPEC-28 D1.
- The SE.commitment block and BEL.basis access routes — SPEC28STOCONHAR-002 and SPEC28STOCONHAR-003.
- Creating a second non-canonical archive filename for the active duplicate; the canonical archived ticket is `archive/tickets/SPEC28STOCONHAR-004.md`.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "6 turn-cycle-additional|six turn-cycle-additional" .claude/skills/branching-story-turn-cycle/SKILL.md` returns no hits; `grep -nE "7 turn-cycle-additional|seven turn-cycle-additional" .claude/skills/branching-story-turn-cycle/SKILL.md` returns at least one hit.
2. `grep -nE "Seven sub-phases|seven sub-phases" .claude/skills/branching-story-health-audit/SKILL.md` returns no hits; `grep -nE "Eight sub-phases|eight sub-phases" .claude/skills/branching-story-health-audit/SKILL.md` returns at least one hit.
3. `grep -nE "prose receipt.*§4\.5|§4\.5.*prose receipt" .claude/skills/branching-story-health-audit/SKILL.md` returns no hits; any prose-receipt section citation in this file reads `§4.6`.

### Invariants

1. The HARD-GATE block's count language in `branching-story-turn-cycle/SKILL.md` matches Phase 9's actual enumeration.
2. The sub-phase count language in `branching-story-health-audit/SKILL.md` matches the actual 2a-2h enumeration.
3. Every operational reference to the prose receipt's contract section cites `§4.6` consistently.

## Test Plan

### New/Modified Tests

1. `None - documentation-only skill prose ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "6 turn-cycle-additional|six turn-cycle-additional" .claude/skills/branching-story-turn-cycle/SKILL.md` (must return no hits).
2. `grep -nE "7 turn-cycle-additional|seven turn-cycle-additional" .claude/skills/branching-story-turn-cycle/SKILL.md` (must return hits).
3. `grep -nE "Seven sub-phases|seven sub-phases|prose receipt.*§4\.5|§4\.5.*prose receipt" .claude/skills/branching-story-health-audit/SKILL.md` (must return no hits).
4. `grep -nE "Eight sub-phases|eight sub-phases|§4\.6" .claude/skills/branching-story-health-audit/SKILL.md` (must return hits).
5. `rg -n "7 deterministic|seven deterministic|6 turn-cycle-additional|Seven sub-phases|prose receipt \\(§4\\.5\\)" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md specs/SPEC-28-story-contract-hardening.md` (manual classification: operational surfaces clean; historical spec prose may remain under implementation notes).
6. `git diff --check`

## Outcome

Completion date: 2026-05-15.

Outcome amended: 2026-05-15.

Completed. `branching-story-turn-cycle` uses the 7-count consistently for Phase 9 turn-cycle-additional checks, and its HARD-GATE summary includes Canon Baseline Drift in the inline check list. `branching-story-health-audit` states eight structural sub-phases and cites the prose receipt at `§4.6`. SPEC-28 D4 carries a dated implementation note recording this ticket as landed. Post-ticket review resolved the duplicate active/archive state by preserving this canonical archived ticket and removing `tickets/SPEC28STOCONHAR-004.md`.

## Verification Result

1. `grep -nE "6 turn-cycle-additional|six turn-cycle-additional" .claude/skills/branching-story-turn-cycle/SKILL.md` — PASS as a no-hit negative proof; command exited 1 because the stale 6-count wording is absent.
2. `grep -nE "7 turn-cycle-additional|seven turn-cycle-additional" .claude/skills/branching-story-turn-cycle/SKILL.md` — PASS; returned the HARD-GATE and process-flow 7-count references.
3. `grep -nE "Seven sub-phases|seven sub-phases|prose receipt.*§4\.5|§4\.5.*prose receipt" .claude/skills/branching-story-health-audit/SKILL.md` — PASS as a no-hit negative proof; command exited 1 because the stale count/citation wording is absent.
4. `grep -nE "Eight sub-phases|eight sub-phases|§4\.6" .claude/skills/branching-story-health-audit/SKILL.md` — PASS; returned the eight-sub-phase and prose-receipt `§4.6` references.
5. `rg -n "7 deterministic|seven deterministic|6 turn-cycle-additional|Seven sub-phases|prose receipt \\(§4\\.5\\)" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md specs/SPEC-28-story-contract-hardening.md` — PASS for the owned operational surfaces; remaining hits are historical D1/D4 proposal intake/problem prose in `specs/SPEC-28-story-contract-hardening.md`, whose D1 and D4 sections carry dated implementation notes.
6. `test ! -e tickets/SPEC28STOCONHAR-004.md && test -e archive/tickets/SPEC28STOCONHAR-004.md` — PASS after post-ticket-review archive collision cleanup.
7. `git diff --check` — PASS.

## Deviations

1. Review found the implementation already landed and `archive/tickets/SPEC28STOCONHAR-004.md` already existed. Instead of creating a second archive filename for the same ticket id, post-ticket review amended the canonical archived ticket and removed the redundant active copy.
2. No executable skill dry-run exists for these prose-only workflow contracts. Verification used focused grep/stale-anchor proof plus manual review of the affected HARD-GATE/process-flow text.
