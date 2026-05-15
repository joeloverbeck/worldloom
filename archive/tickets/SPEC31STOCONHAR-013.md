# SPEC31STOCONHAR-013: Clean stale ID/status wording

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/story-promotion-closeout/SKILL.md`, `specs/SPEC-31-story-contract-hardening-iii.md`
**Deps**: `specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

At intake, three documentation drift sites surfaced:
- `.claude/skills/_shared-templates/story-state-contract.md:60`: "next `-NNNN` id" — padded format conflicts with FOUNDATIONS-002 unpadded ID convention.
- `.claude/skills/branching-story-turn-cycle/SKILL.md:402`: example `CHC-0003`, `CHC-0004` — padded.
- `.claude/skills/story-promotion-closeout/SKILL.md:353`: "Read linked CF records' `status` (5 layer values)" — CF has 4 statuses (`hard_canon`, `derived_canon`, `soft_canon`, `contested_canon`); Mystery Reserve entries are separate `M-<integer>` records.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: all three sites confirmed at quoted lines. FOUNDATIONS `:552` documents the unpadded natural-integer convention (FOUNDATIONS-002).
2. **Spec assumptions verified**: `specs/SPEC-31-story-contract-hardening-iii.md` §D13 specifies the three fixes.
3. **Cross-skill / cross-artifact boundary under audit**: documentation surface across 3 files; no semantic shift, only wording.
4. **Renames/removes blast radius** (template item 7): grep for padded ID forms (`-NNNN`, `<CLASS>-0\d+`) across active story skills/shared templates → confirm no current operational examples remain post-edit.
5. **Proof narrowing**: intake grep found an unrelated, legitimate `.claude/skills/propose-new-worlds-from-preferences/templates/proposal-card.md` note that FOUNDATIONS defines five Canon Layers. This ticket owns the incorrect CF `status` wording in `story-promotion-closeout`, so the "five layer" proof is scoped to that closeout status claim rather than all `.claude/skills/`.

## Architecture Check

1. **Cleaner than alternative**: aligning skill prose with FOUNDATIONS-002's unpadded ID convention prevents schema-accepted references from resolving to non-existent padded IDs.
2. **No backwards-compatibility shims**: pure prose lint.

## Verification Layers

1. **No skill prose under `.claude/skills/branching-story-*/` references padded IDs** → codebase grep-proof.
2. **The closeout CF status row no longer references CF "5 layer values"** → codebase grep-proof.

## Landed Changes

### 1. Contract `.claude/skills/_shared-templates/story-state-contract.md:60`

Replaced "next `-NNNN` id" with "next `<CLASS>-<integer>` id" per FOUNDATIONS-002 unpadded natural-integer convention.

### 2. Turn-cycle `.claude/skills/branching-story-turn-cycle/SKILL.md:402`

Replaced `CHC-0003` and `CHC-0004` with `CHC-3` and `CHC-4`.

### 3. Closeout `.claude/skills/story-promotion-closeout/SKILL.md:353`

Replaced "Read linked CF records' `status` (5 layer values)" with:
```
Read linked CF records' `status` values (`hard_canon`, `derived_canon`,
`soft_canon`, `contested_canon`). Mystery Reserve entries are separate
`M-<integer>` records, not CF status values.
```

### 4. Cross-file grep sweep

Confirmed no other padded ID forms (`<CLASS>-\d{4,}`) exist in active story skills or shared templates.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — `:60`)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — `:402`)
- `.claude/skills/story-promotion-closeout/SKILL.md` (modify — `:353`)
- `specs/SPEC-31-story-contract-hardening-iii.md` (modify — D13 implementation note)

## Out of Scope

- Padded IDs in archive/ or historical commits — only active surfaces matter.
- Other CF / M / SEC status enumerations — only the "5 layer values" misstatement is corrected.

## Acceptance Criteria

### Tests That Must Pass

1. Cross-file grep for `-NNNN` in skills and shared templates returns no matches.
2. Cross-file grep for `CHC-0\d+` in skills returns no matches.
3. Focused grep for "5 layer values" in `story-promotion-closeout` returns no matches.

### Invariants

1. All skill prose uses unpadded ID examples per FOUNDATIONS-002.
2. CF status enumeration is named correctly in `story-promotion-closeout`.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rn "\-NNNN" .claude/skills/_shared-templates/ .claude/skills/branching-story-*/` → 0 matches.
2. `grep -rn "CHC-0\|SF-0\|SE-0\|PG-0\|BEL-0\|OBL-0\|CNSQ-0\|THR-0\|SREL-0\|STENT-0\|STSTAT-0\|STLOC-0\|STOBJ-0\|STINT-0\|BR-0\|SLT-0" .claude/skills/_shared-templates/ .claude/skills/branching-story-*/` → 0 matches.
3. `grep -n "5 layer values" .claude/skills/story-promotion-closeout/SKILL.md` → 0 matches.

## Outcome

Completed: 2026-05-15

The stale padded story-record ID examples were replaced with unpadded examples in the shared story-state contract and turn-cycle skill. The promotion-closeout Canon Layers row now names the four CF `status` values and explicitly separates Mystery Reserve `M-<integer>` records from CF status values. The originating spec now has a D13 implementation note.

## Verification Result

1. `grep -rn "\-NNNN" .claude/skills/_shared-templates/ .claude/skills/branching-story-*/` → exit 1, no matches.
2. `grep -rn "CHC-0\|SF-0\|SE-0\|PG-0\|BEL-0\|OBL-0\|CNSQ-0\|THR-0\|SREL-0\|STENT-0\|STSTAT-0\|STLOC-0\|STOBJ-0\|STINT-0\|BR-0\|SLT-0" .claude/skills/_shared-templates/ .claude/skills/branching-story-*/` → exit 1, no matches.
3. `grep -n "5 layer values" .claude/skills/story-promotion-closeout/SKILL.md` → exit 1, no matches.

## Deviations

- The drafted broad "five layer" proof was narrowed after intake found a legitimate unrelated `.claude/skills/propose-new-worlds-from-preferences/templates/proposal-card.md` note that FOUNDATIONS enumerates five Canon Layers. This ticket only owned the incorrect CF `status` wording in `story-promotion-closeout`.
