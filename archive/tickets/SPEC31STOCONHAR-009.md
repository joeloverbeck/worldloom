# SPEC31STOCONHAR-009: Make mystery accretion policy conditional

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-health-audit/SKILL.md`; `archive/specs/SPEC-31-story-contract-hardening-iii.md`
**Deps**: `archive/specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

At intake, `branching-story-health-audit/SKILL.md:206` referenced `M-record's accretion_policy.max_clues / equivalent limit`, but FOUNDATIONS Mystery Reserve schema defines only known/unknown/forbidden-answer/future-resolution fields. The `accretion_policy` field did not exist anywhere in the codebase. This ticket replaced the load-bearing reference with conditional, schema-aligned Phase 2e guidance.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified at intake**: health-audit `:206` referenced `accretion_policy.max_clues`; FOUNDATIONS Mystery Reserve schema (lines 77-95) did not define this field; M-record schemas under `tools/validators/src/schemas/` did not define it either.
2. **Spec assumptions verified**: `archive/specs/SPEC-31-story-contract-hardening-iii.md` §D9 specifies the conditional form; §Approach documents that adding the field would violate §5b (no fields without mechanical consumers).
3. **Cross-skill / cross-artifact boundary under audit**: health-audit Phase 2e ↔ Mystery Reserve schema. The wording change keeps the audit deterministic where the schema supports it; falls back to judgment-assisted where no validator-backed field exists.
4. **FOUNDATIONS principle under audit (restated)**: Rule 7 (Preserve Mystery Deliberately) — the firewall must remain deterministic where structural evidence exists; collective-answer judgment is acknowledged as judgment-assisted when no policy field backs it.
5. **Verification boundary correction**: the drafted health-audit dry-run proof is not executable in the current repo; `.claude/skills/branching-story-health-audit/SKILL.md` is prose workflow guidance without a runnable skill harness. This ticket uses manual contract review plus focused grep/stale-anchor proof over the edited skill, SPEC-31, and current operational surfaces.

## Architecture Check

1. **Cleaner than alternative**: adding an `accretion_policy` field to the M schema for an audit that may never need it (no production stories have exercised mystery accretion) would violate §5b. Conditional handling preserves the option for later under first-real-bundle pressure.
2. **No backwards-compatibility shims**: no production mystery audits; conditional wording is strict from day one.

## Verification Layers

1. **No current operational skill prose references `accretion_policy.max_clues` as a load-bearing field post-edit** → codebase grep-proof.
2. **Health-audit Phase 2e enforces schema-backed status progression deterministically** → manual contract review of the landed Phase 2e wording.
3. **Health-audit Phase 2e enforces accretion_policy deterministically when M record exposes it** → manual contract review of the conditional validator-backed policy wording.

## Landed Changes

### 1. Health-audit `branching-story-health-audit/SKILL.md` Phase 2e

Replaced the wording to make policy enforcement conditional:
```
- `mystery_accretion_overflow` — cumulative narrowing / mystery accretion
  exceeds what the Mystery Reserve entry allows. Enforcement is conditional:

  - If the M record exposes a validator-backed accretion-policy field
    (`accretion_policy.max_clues` or equivalent), enforce that policy
    deterministically.
  - Otherwise, enforce only the schema-backed progression:
    non-`preserved` statuses must carry non-empty `evidence_records`;
    forbidden-status mysteries must not be resolved; and escalation to
    `apparent_resolution` or `held_for_promotion` requires a corresponding
    promotion/adjudication pause.

  Whether the accumulated evidence chain collectively answers the mystery
  ... is a judgment-assisted finding unless a validator-backed M policy
  makes it deterministic.
```

### 2. Cross-file grep sweep

Confirmed no current operational skill/template/tool/schema surface references `accretion_policy.max_clues` as a load-bearing field. Remaining broader hits are SPEC-31, this ticket, and triage/intake documentation, all historical or conditional.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — Phase 2e `mystery_accretion_overflow`)
- `archive/specs/SPEC-31-story-contract-hardening-iii.md` (modify — D9 implementation note)

## Out of Scope

- Adding an `accretion_policy` field to the Mystery Reserve schema — explicitly avoided per §5b.

## Acceptance Criteria

### Tests That Must Pass

1. Cross-file grep for `accretion_policy.max_clues` returns only Phase 2e's conditional wording plus historical/conditional SPEC-31, ticket, and triage documentation.
2. Manual contract review of Phase 2e confirms M records without `accretion_policy` still enforce schema-backed progression: non-empty `evidence_records` for non-`preserved` statuses, no forbidden-status resolution, and no promotion-state escalation without a corresponding promotion pause.
3. Manual contract review of Phase 2e confirms that if a future M record carries a validator-backed accretion-policy field, health-audit enforces that policy deterministically.

### Invariants

1. Health-audit Phase 2e never references a non-existent schema field as a hard requirement.
2. The conditional form preserves Rule 7 firewall determinism where structural evidence exists.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `rg -n "accretion_policy\\.max_clues|accretion_policy|schema-backed progression|validator-backed accretion-policy|skill dry-run|dry-run" archive/tickets/SPEC31STOCONHAR-009.md .claude/skills/branching-story-health-audit/SKILL.md archive/specs/SPEC-31-story-contract-hardening-iii.md docs tools .claude/skills` → classify remaining hits as current operational conditional wording, historical intake/spec/triage text, or unrelated dry-run terminology.
2. Manual contract review of `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2e.

## Outcome

Completed 2026-05-15. Health-audit Phase 2e now separates three enforcement modes for `mystery_accretion_overflow`: deterministic validator-backed policy when a future M record exposes one, deterministic schema-backed progression for current M records without `accretion_policy`, and judgment-assisted collective-answer review for semantic accretion. SPEC-31 D9 was annotated with an implementation note so the original problem text is clearly historical intake context.

## Verification Result

1. `rg -n "accretion_policy\\.max_clues|accretion_policy|schema-backed progression|validator-backed accretion-policy|skill dry-run|dry-run" archive/tickets/SPEC31STOCONHAR-009.md .claude/skills/branching-story-health-audit/SKILL.md archive/specs/SPEC-31-story-contract-hardening-iii.md docs tools .claude/skills` — confirmed the current operational hit is `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2e's conditional wording; remaining SPEC-31/ticket/triage hits are historical intake, conditional proof prose, or unrelated dry-run terminology in other skills.
2. Manual review of `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2e — confirmed current M records without an accretion policy enforce schema-backed progression, and future validator-backed accretion-policy fields would be enforced deterministically.
3. `git diff --check -- .claude/skills/branching-story-health-audit/SKILL.md archive/specs/SPEC-31-story-contract-hardening-iii.md archive/tickets/SPEC31STOCONHAR-009.md` — passed.

## Deviations

- Replaced the drafted health-audit dry-run acceptance with manual contract review plus grep/stale-anchor proof because the repo has no executable harness for prose workflow skill dry-runs.
