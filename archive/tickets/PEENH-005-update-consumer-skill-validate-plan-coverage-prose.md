# PEENH-005: Update consumer skill `validate_patch_plan` coverage prose after id-allocation race validation

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes - `.claude/skills/branching-story-page-cycle/SKILL.md` and `.claude/skills/storylet-pool-authoring/SKILL.md` prose only; no tool or validator code changes.
**Deps**: `archive/tickets/PEENH-004-extend-validate-patch-plan-to-cover-id-allocation-race.md`

## Problem

PEENH-004 moved `id_allocation_race` into the read-only `validate_patch_plan` path, but at intake some consumer skills still told operators that validate-plan did not cover id-allocation race because it was submit-only. That wording was stale and could cause operators to undervalue the pre-sign validation gate or misdiagnose validate-plan failures.

Post-PEENH-004 review evidence:

```text
.claude/skills/branching-story-page-cycle/SKILL.md:358: Does NOT cover approval-token verification or id-allocation race (both submit-only)
.claude/skills/storylet-pool-authoring/SKILL.md:234: does NOT cover approval-token verification or id-allocation race - both are submit-only
.claude/skills/storylet-pool-authoring/SKILL.md:246: does NOT cover approval-token verification or id-allocation race (both are submit-only)
```

`docs/HARD-GATE-DISCIPLINE.md` and the package READMEs now correctly state that validate-plan includes the patch-engine `id_allocation_race` check and that approval-token verification remains submit-only.

## Assumption Reassessment (2026-05-04)

1. PEENH-004 landed the package boundary: `tools/world-mcp/src/tools/validate-patch-plan.ts` calls `checkIdAllocationRace`, `validators_run[]` includes `id_allocation_race`, and handler/CLI tests cover failure before signing.
2. The authoritative hard-gate doc now says validation includes structural validators plus the patch-engine `id_allocation_race` check for `expected_id_allocations`; only approval-token verification remains submit-only.
3. Cross-skill boundary under audit: operator-facing HARD-GATE / pre-submit prose in patch-engine consumer skills must describe the same validate-plan contract that `docs/HARD-GATE-DISCIPLINE.md` and `tools/world-mcp` expose.
4. FOUNDATIONS alignment: this is workflow-traceability cleanup, not a canon mutation. It preserves hard-gate discipline by making the validation gate more accurate without weakening approval-token or submit-time checks.
5. Adjacent contradiction classification: the stale `.claude/skills/*` wording is separate cleanup exposed by PEENH-004; it does not prove unfinished owned work inside PEENH-004 because PEENH-004 explicitly scoped package/tool behavior and docs, leaving skill prose out of scope.

## Architecture Check

1. Updating the consumer skill prose is cleaner than adding compatibility wording to the tool docs because the tool contract has already changed; the stale text lives at the operator instruction surface.
2. No backwards-compatibility aliasing or shims are introduced. This ticket changes prose only.

## Verification Layers

1. Stale submit-only wording removed from consumer skill validate-plan coverage prose -> codebase grep-proof over `.claude/skills` for `id-allocation race (both submit-only)` and parallel casing.
2. Approval-token verification remains submit-only in skill prose -> manual review against `docs/HARD-GATE-DISCIPLINE.md` section "Validating and submitting the plan".
3. Validate-plan coverage matches PEENH-004 docs -> manual review of `docs/HARD-GATE-DISCIPLINE.md`, `tools/world-mcp/README.md`, and updated skill snippets.

## Landed Changes

### 1. Correct page-cycle validate-plan coverage

Updated `.claude/skills/branching-story-page-cycle/SKILL.md` Phase 11 dry-run validate prose so it says validate-plan covers `id_allocation_race` for `expected_id_allocations`, while approval-token verification remains submit-only and submit keeps a race-window backstop.

### 2. Correct storylet-pool validate-plan coverage

Updated both `.claude/skills/storylet-pool-authoring/SKILL.md` validate-plan coverage passages to remove the stale "id-allocation race is submit-only" claim and keep the approval-token caveat.

### 3. Sweep sibling consumer skills

Ran a literal/regex sweep across patch-engine consumer skills named by PEENH-004 (`branching-story-page-cycle`, `branching-story-bootstrap`, `canon-addition`, `create-base-world`, `character-generation`, `diegetic-artifact-generation`, `storylet-pool-authoring`) for parallel stale validate-plan coverage wording. The only stale submit-only validate-plan coverage claims found were the two owned skills' passages listed above.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify)
- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify)
- `tickets/PEENH-005-update-consumer-skill-validate-plan-coverage-prose.md` (modify — closeout)

## Out of Scope

- Tool, validator, patch-engine, or world-mcp code changes.
- Changing approval-token verification semantics.
- Removing submit-time `id_allocation_race` enforcement; submit remains the defense-in-depth backstop for validate-to-submit race windows.
- Canon or world-content changes.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n 'Does NOT cover approval-token verification or id-allocation race|does NOT cover approval-token verification or id-allocation race|id-allocation race \\(both submit-only\\)|both are submit-only\\).*id-allocation' .claude/skills --glob '!**/dist/**' --glob '!**/node_modules/**'` returns no stale validate-plan coverage claims.
2. Manual review confirms updated skill prose still says approval-token verification is submit-only.
3. Manual review confirms updated skill prose names validate-time `id_allocation_race` coverage and submit-time defense-in-depth without implying validate-plan consumes approval tokens.

### Invariants

1. Skills must not tell operators that id-allocation race is submit-only after PEENH-004.
2. Skills must still require approval-token signing/submission after HARD-GATE approval; validate-plan is not an approval substitute.

## Test Plan

### New/Modified Tests

1. `None - skill prose cleanup; verification is grep-based plus manual review against the package/tool docs.`

### Commands

1. `rg -n 'Does NOT cover approval-token verification or id-allocation race|does NOT cover approval-token verification or id-allocation race|id-allocation race \\(both submit-only\\)|both are submit-only\\).*id-allocation' .claude/skills --glob '!**/dist/**' --glob '!**/node_modules/**'`
2. `rg -n 'id_allocation_race|id-allocation race|approval-token verification|approval token' .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/storylet-pool-authoring/SKILL.md docs/HARD-GATE-DISCIPLINE.md`
3. `git diff --check -- .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/storylet-pool-authoring/SKILL.md archive/tickets/PEENH-005-update-consumer-skill-validate-plan-coverage-prose.md`

## Outcome

Completion date: 2026-05-04.

Implemented. The two consumer skills now describe `validate_patch_plan` as covering `id_allocation_race` for `expected_id_allocations`, while preserving the approval-token submit-only caveat and the submit-time race-window backstop.

No tool, validator, patch-engine, or world-content files changed.

## Verification Result

1. `rg -n 'Does NOT cover approval-token verification or id-allocation race|does NOT cover approval-token verification or id-allocation race|id-allocation race \\(both submit-only\\)|both are submit-only\\).*id-allocation' .claude/skills --glob '!**/dist/**' --glob '!**/node_modules/**'` — PASS; no stale validate-plan coverage claims remain in `.claude/skills`.
2. `rg -n 'id_allocation_race|id-allocation race|approval-token verification|approval token' .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/storylet-pool-authoring/SKILL.md docs/HARD-GATE-DISCIPLINE.md` — reviewed; the two updated skills name validate-time `id_allocation_race` coverage, keep approval-token verification submit-only, and match `docs/HARD-GATE-DISCIPLINE.md`.
3. `git diff --check -- .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/storylet-pool-authoring/SKILL.md archive/tickets/PEENH-005-update-consumer-skill-validate-plan-coverage-prose.md` — PASS.

## Deviations

- No additional named consumer skill carried the same stale validate-plan submit-only allocation-race claim, so the landed file set stayed limited to the two drafted skill files plus this ticket closeout.
