# SPEC31STOCONHAR-009: Make mystery accretion policy conditional

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-health-audit/SKILL.md`
**Deps**: `specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

`branching-story-health-audit/SKILL.md:206` references `M-record's accretion_policy.max_clues / equivalent limit`, but FOUNDATIONS Mystery Reserve schema defines only known/unknown/forbidden-answer/future-resolution fields. The `accretion_policy` field does not exist anywhere in the codebase. The "/ equivalent limit" wording was a hedge, but the broken reference compounds when an implementer reads Phase 2e and looks for the field.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: health-audit `:206` references `accretion_policy.max_clues`; FOUNDATIONS Mystery Reserve schema (lines 77-95) does not define this field; M-record schemas under `tools/validators/src/schemas/` do not define it either.
2. **Spec assumptions verified**: `specs/SPEC-31-story-contract-hardening-iii.md` §D9 specifies the conditional form; §Approach documents that adding the field would violate §5b (no fields without mechanical consumers).
3. **Cross-skill / cross-artifact boundary under audit**: health-audit Phase 2e ↔ Mystery Reserve schema. The wording change keeps the audit deterministic where the schema supports it; falls back to judgment-assisted where no validator-backed field exists.
4. **FOUNDATIONS principle under audit (restated)**: Rule 7 (Preserve Mystery Deliberately) — the firewall must remain deterministic where structural evidence exists; collective-answer judgment is acknowledged as judgment-assisted when no policy field backs it.

## Architecture Check

1. **Cleaner than alternative**: adding an `accretion_policy` field to the M schema for an audit that may never need it (no production stories have exercised mystery accretion) would violate §5b. Conditional handling preserves the option for later under first-real-bundle pressure.
2. **No backwards-compatibility shims**: no production mystery audits; conditional wording is strict from day one.

## Verification Layers

1. **No skill prose references `accretion_policy.max_clues` as a load-bearing field post-edit** → codebase grep-proof.
2. **Health-audit Phase 2e enforces schema-backed status progression deterministically** → skill dry-run (M record without accretion_policy → enforce evidence_records non-empty, no forbidden resolution, no escalation without pause).
3. **Health-audit Phase 2e enforces accretion_policy deterministically when M record exposes it** → skill dry-run (hypothetical M record with validator-backed accretion field → enforce policy).

## What to Change

### 1. Health-audit `branching-story-health-audit/SKILL.md` Phase 2e `:206`

Replace the wording to make policy enforcement conditional:
```
- `mystery_accretion_overflow` — cumulative narrowing / mystery accretion
  exceeds what the M record allows. Enforcement is conditional:

  - If the M record exposes a validator-backed accretion-policy field
    (`accretion_policy.max_clues` or equivalent — see Mystery Reserve schema
    at FOUNDATIONS §Mandatory World Files), enforce that policy
    deterministically.
  - Otherwise, enforce only the schema-backed progression:
    (a) `evidence_records` non-empty for non-`preserved` statuses,
    (b) no forbidden-status resolution,
    (c) no escalation to `apparent_resolution` or `held_for_promotion`
        without a corresponding promotion pause.

  Whether the accumulated evidence chain collectively answers the mystery
  is a judgment-assisted finding unless a validator-backed M policy makes
  it deterministic.
```

### 2. Cross-file grep sweep

Confirm no other doc / skill / template / tools file references `accretion_policy.max_clues`. If found, strip or align with the conditional form. Particularly check health-audit `:412,:438` (referenced in spec §Files touched) for related wording.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — `:206`, possibly `:412,:438`)
- Conditional: any file surfaced by the cross-file grep.

## Out of Scope

- Adding an `accretion_policy` field to the Mystery Reserve schema — explicitly avoided per §5b.

## Acceptance Criteria

### Tests That Must Pass

1. Cross-file grep for `accretion_policy.max_clues` returns only Phase 2e's conditional wording and SPEC-31's documentation.
2. Health-audit dry-run on a bundle with an M record lacking accretion_policy: Phase 2e emits status-progression findings without referencing the absent field.
3. Health-audit dry-run on a bundle whose M record DOES carry an accretion_policy (hypothetical, since no such schema exists yet): Phase 2e enforces the policy deterministically.

### Invariants

1. Health-audit Phase 2e never references a non-existent schema field as a hard requirement.
2. The conditional form preserves Rule 7 firewall determinism where structural evidence exists.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rn "accretion_policy" .claude/skills/ docs/ tools/` → matches reflect conditional wording, not load-bearing reference.
2. Health-audit dry-run on a fixture with an M record (no accretion_policy field) → emits expected status-progression findings.
