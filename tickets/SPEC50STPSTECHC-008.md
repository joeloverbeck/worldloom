# SPEC50STPSTECHC-008: Fix STEMO contradictory-affect table to valid enum + meta-test

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `branching-story-health-audit` skill; validators test (enum-membership meta-test). Corrective.
**Deps**: None

## Problem

The closed `contradictory_affect_pairs` lookup table for the `stemo-contradictory-stack` health check (`.claude/skills/branching-story-health-audit/SKILL.md:312-317`) uses `affection`, `hatred`, `trust`, `betrayal-anger`, `despair`, `love` — only `grief`/`joy` is a member of the current `STEMO.affect_kind` enum (`tools/validators/src/schemas/story-emotion.schema.json:27-49`: `fear, anxiety, anger, disgust, grief, shame, guilt, humiliation, hope, relief, joy, awe, tenderness, desire, envy, contempt, confusion, dread, null`). The other four pairs are unreachable, so the check is dead for them.

## Assumption Reassessment (2026-05-19)

1. Codebase: the table is at `branching-story-health-audit/SKILL.md:312-317`; the current `affect_kind` enum is at `story-emotion.schema.json:27-49`. Confirmed `affection`/`hatred`/`trust`/`betrayal-anger`/`despair`/`love` are NOT in the enum; `grief`/`joy` are. Verified this session.
2. Specs/contract: SPEC-50 §D.1; SPEC-49 established the "intentionally small table; expand only with sample-story evidence" discipline.
3. Cross-artifact boundary: the health-audit skill's lookup table and the `story-emotion.schema.json` `affect_kind` enum must agree; a meta-test enforces the agreement so the table cannot drift from the enum again.

## Architecture Check

1. Rewriting the four invalid pairs to enum-valid opponent-process equivalents restores the check's teeth; the meta-test is the cheapest guard against future enum/table drift (the same drift class that left the table dead).
2. No shim — invalid affect labels are replaced, not aliased.

## Verification Layers

1. Every `a`/`b` value in the table is a member of the `affect_kind` enum -> meta-test (enum-membership assertion).
2. A same-holder enum-valid contradictory pair (e.g., `tenderness`+`contempt`, same target) WARNs -> health-audit dry-run.

## What to Change

### 1. Rewrite the contradictory-affect table (D.1)

Retain `{ grief, joy, same_target_required: false }`. Replace the four invalid pairs with enum-valid opponent-process equivalents, e.g. `{ tenderness, contempt, same_target_required: true }`, `{ hope, dread, same_target_required: true }`, `{ relief, anxiety, same_target_required: true }`, `{ desire, disgust, same_target_required: true }`. Keep the table intentionally small.

### 2. Enum-membership meta-test

Add a test asserting every value in the table is a member of `story-emotion.schema.json`'s `affect_kind` enum.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `tools/validators/tests/` enum-membership meta-test (new or modify)

## Out of Scope

- Active-state-underuse warnings (SPEC50STPSTECHC-011).
- Expanding the table beyond the corrective rewrite (sample-story evidence required).

## Acceptance Criteria

### Tests That Must Pass

1. Meta-test: every `contradictory_affect_pairs` value ∈ `affect_kind` enum.
2. A same-holder `tenderness`+`contempt` (same target) pair triggers a WARN; a non-contradictory pair does not.
3. `npm test --prefix tools/validators` green.

### Invariants

1. The contradictory-affect table contains only `affect_kind` enum members.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/` — enum-membership meta-test for the contradictory-affect table.

### Commands

1. `npm run build --prefix tools/validators`
2. `npm test --prefix tools/validators`
