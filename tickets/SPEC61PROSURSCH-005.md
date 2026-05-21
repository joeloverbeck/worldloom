# SPEC61PROSURSCH-005: Fix the RP `direct_user_approval` collision in continuity-audit

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/continuity-audit` (RP template + SKILL.md + example); no code, no schema, no `_source/` record.
**Deps**: None

## Problem

`continuity-audit` writes RP (retcon proposal) cards with `source_basis.direct_user_approval` and sets it `true` at commit. FOUNDATIONS §Canon Fact Record Schema (lines 355–361) reserves that field for accepted CF records and forbids copying a proposal-side value into an accepted CF. An RP card is a candidate retcon, not accepted canon — its use of the reserved field name is the one real instance of the report's "approval laundering" concern. The fix renames the RP field to `user_approved`, matching every sibling proposal surface.

## Assumption Reassessment (2026-05-21)

1. Verified against the codebase (this session) — the rename's full blast radius is **four** sites, wider than SPEC-61 §2.4's two named files: `continuity-audit/templates/retcon-proposal-card.md:104`, `continuity-audit/SKILL.md:138` **and `:165`** (a second prose mention §2.4 did not name), and `continuity-audit/examples/post-canon-addition-audit.md:325`. `canon-addition` does **not** read `direct_user_approval` off RP cards (its `SKILL.md:103` + `references/engine-envelope-shape.md:325,336` are the legitimate CF-accept path), so §2.4's consumer-safety concern holds.
2. Verified against the spec: SPEC-61 §2.4 — rename `source_basis.direct_user_approval` → `source_basis.user_approved` on the RP template; update the Phase-8 commit instruction to set `user_approved: true` with the "kept in the audit's recommendations, NOT accepted as canon" comment the other proposal skills use.
3. Cross-artifact boundary under audit: the RP card schema is consumed by `canon-addition` (as a proposal source) and validated by the SPEC61PROSURSCH-004 approval-semantics validator. After the rename, a freshly-generated RP carries `user_approved`; the validator no longer flags it. Confirm `canon-addition`'s RP-parsing path reads no `direct_user_approval` (per item 1).
4. FOUNDATIONS Rule 6 (No Silent Retcons) / §Canon Fact Record Schema reservation: this rename preserves the proposal→adjudication audit boundary — RP cards remain recommendations and stay out of the accepted-canon approval namespace. Restate that `user_approved` on an RP means "review-kept," not "canon-accepted."
5. Rename blast radius (all four sites, grepped pipeline-wide): `tools/` — 0 matches reading RP `direct_user_approval`; `.claude/skills/continuity-audit/` — 3 sites (template:104, SKILL.md:138, SKILL.md:165) + 1 example (examples/post-canon-addition-audit.md:325); `.claude/skills/canon-addition/` — references are the CF-accept path, not RP consumption (preserve verbatim); `docs/`, `specs/` — none. All four continuity-audit sites are in Files to Touch.

## Architecture Check

1. Renaming to `user_approved` aligns RP with every sibling proposal surface (PR/NCP/NWP/EPE all use `user_approved` with identical "kept in batch after review" semantics), eliminating the one non-CF use of the reserved field rather than inventing a new field name.
2. No backwards-compatibility shims — the field is renamed outright; no alias is retained.

## Verification Layers

1. Zero `direct_user_approval` references remain in continuity-audit RP surfaces -> codebase grep-proof (`grep -rn direct_user_approval .claude/skills/continuity-audit/` returns zero).
2. A freshly-generated RP card carries `source_basis.user_approved` -> skill-dry-run (inspect the RP template).
3. `canon-addition`'s CF-accept `direct_user_approval` references are untouched -> codebase grep-proof (the canon-addition matches are preserved).

## What to Change

### 1. RP template

In `.claude/skills/continuity-audit/templates/retcon-proposal-card.md` (line ~104), rename `source_basis.direct_user_approval` → `source_basis.user_approved`; keep the "pre-acceptance proposal only; kept in the audit's recommendations" comment.

### 2. SKILL.md commit instruction + prose

In `.claude/skills/continuity-audit/SKILL.md`, update line ~138 (Phase-8 commit instruction) and line ~165 (the "Proposes; does not apply" prose) to use `source_basis.user_approved` with the "kept in audit's recommendations, NOT accepted as canon" wording.

### 3. Example file

In `.claude/skills/continuity-audit/examples/post-canon-addition-audit.md` (line ~325), update the `source_basis.direct_user_approval` mention to `source_basis.user_approved`.

## Files to Touch

- `.claude/skills/continuity-audit/templates/retcon-proposal-card.md` (modify)
- `.claude/skills/continuity-audit/SKILL.md` (modify)
- `.claude/skills/continuity-audit/examples/post-canon-addition-audit.md` (modify)

## Out of Scope

- The `approval-semantics` validator (SPEC61PROSURSCH-004) — this ticket fixes the producer; the validator enforces the rule.
- Any change to `canon-addition`'s CF-accept `direct_user_approval` usage (legitimate, preserved).
- Any `_source/` record or world-canon write.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "direct_user_approval" .claude/skills/continuity-audit/` returns zero matches.
2. `grep -rn "user_approved" .claude/skills/continuity-audit/templates/retcon-proposal-card.md` returns the renamed field.
3. `grep -rn "direct_user_approval" .claude/skills/canon-addition/SKILL.md` still returns the legitimate CF-accept usage (no over-reach).

### Invariants

1. RP cards carry `user_approved`, never `direct_user_approval`.
2. `canon-addition`'s CF-accept approval provenance is unchanged.

## Test Plan

### New/Modified Tests

1. `None — documentation/skill-template ticket; verification is command-based (grep-proofs above) and the approval-semantics validator coverage is added in SPEC61PROSURSCH-004.`

### Commands

1. `grep -rn "direct_user_approval" .claude/skills/continuity-audit/`
2. `grep -rn "user_approved" .claude/skills/continuity-audit/`
