# SPEC92SCERANPRO-009: branching-story-scene-prose-attach skill

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new skill `.claude/skills/branching-story-scene-prose-attach/`; no impact on existing skills (additive).
**Deps**: SPEC92SCERANPRO-004, SPEC92SCERANPRO-007

## Problem

Rendered scene prose must be validated against every included PG and attached via a receipt, without mutating story state. This skill is the scene-level analogue of `branching-story-prose-attach`.

## Assumption Reassessment (2026-05-28)

1. No `.claude/skills/branching-story-scene-prose-attach/` exists yet (new skill). It composes SCN retrieval (-004) and the scene-prose-receipt content validators (-007) — both Deps. It models on the existing `branching-story-prose-attach` skill.
2. SPEC-92 §6 + §Acceptance #5 define the skill: validate `scene-prose/SCN-<n>.md` against all included PGs, write `scene-prose-receipts/SCN-<n>.yaml`, mutate no PG / story state, emit no SE by default.
3. Cross-artifact boundary under audit: the skill consumes the -007 receipt validators + -004 retrieval; it produces `scene-prose-receipts/SCN-<n>.yaml` (direct write) + an INDEX update. It reads the SCN record + included PGs via MCP retrieval.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary — scene prose is a non-authoritative rendering; attach creates no state) + §Rule 7 (the receipt's `scene_range_forbidden_mystery_resolution` preserves the MR firewall) motivate the skill.
5. Skill HARD-GATE / Canon Safety surface: the skill's HARD-GATE forbids writing the receipt OR submitting any patch until validation passes + user approval; it emits no SE by default. Confirm the skill never mutates the PG record or any `_source/` state record (plan-authority boundary), mirroring `branching-story-prose-attach`.

## Architecture Check

1. Modeling on `branching-story-prose-attach` (validate → receipt, no state mutation) keeps the scene attach consistent with the page attach; the range-walk over included PGs is the one new concern, delegated to the -007 validators.
2. No shims: net-new skill; does not modify `branching-story-prose-attach` (coexistence).

## Verification Layers

1. Scene prose validated against every included PG -> the -007 range-walk validators.
2. Receipt written; no PG / `_source` state mutated -> skill dry-run + grep-proof (no patch submitted, no SE by default).
3. HARD-GATE forbids receipt-write / patch-submit pre-approval -> skill-structure review.

## What to Change

### 1. New skill SKILL.md (+ references)

Author `branching-story-scene-prose-attach/SKILL.md`: pre-flight, HARD-GATE (no receipt-write / patch-submit pre-approval), load SCN + included PGs via retrieval, run the -007 validators, write `scene-prose-receipts/SCN-<n>.yaml` + INDEX update, never mutate state, emit no SE by default.

## Files to Touch

- `.claude/skills/branching-story-scene-prose-attach/SKILL.md` (new)
- `.claude/skills/branching-story-scene-prose-attach/references/*.md` (new, as needed)

## Out of Scope

- The scene-plan skill (-008).
- The receipt validators themselves (-007) and the schema (-002).
- FOUNDATIONS §7 roster update + WORKFLOWS entry (-010).

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run: scene prose validated against all included PGs; receipt written; no PG / `_source` mutation.
2. Scene prose resolving a forbidden M is rejected (Rule 7 firewall via -007).
3. HARD-GATE present forbidding receipt-write / patch-submit pre-approval (grep-proof).

### Invariants

1. The skill never mutates the PG record or any `_source/` state record.
2. No SE is emitted by default.

## Test Plan

### New/Modified Tests

1. `None — skill deliverable; verification is skill dry-run + grep-proof of HARD-GATE + no-state-mutation, per Assumption Reassessment.`

### Commands

1. Skill dry-run (manual): invoke `branching-story-scene-prose-attach` against a fixture SCN + rendered prose; inspect the receipt; confirm no state mutation.
2. `grep -n "HARD-GATE\|never mutate\|no SE" .claude/skills/branching-story-scene-prose-attach/SKILL.md`
