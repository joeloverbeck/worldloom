# SPEC99CONPACSCE-003: scene_coverage consumption in branching-story-health-audit

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-health-audit/SKILL.md` (new unscened-run / prose-debt health sub-check). No production code outside the skill prose; no canon-write path.
**Deps**: SPEC99CONPACSCE-001

## Problem

`branching-story-health-audit` currently has no unscened-run / prose-debt health check — it cannot tell the author when committed causal ticks have drifted ahead of rendered scenes. SPEC-99 §2 item 5 wires the `scene_coverage` packet layer (SPEC99CONPACSCE-001) into a health sub-check so the layer is load-bearing on landing rather than a dead field (a packet field is invisible to a skill until the skill's prose points an operator at it).

## Assumption Reassessment (2026-05-30)

1. `branching-story-health-audit` SKILL.md has no existing `unscened` check (grep returns zero matches). Phase 2c (Debt health, `SKILL.md:204`) and Phase 2f (Continuation / terminal proof, `SKILL.md:252`) are the natural homes. The skill already loads `story_bundle_context` as an index surface (`SKILL.md:137`: "an index and summary surface, not full audit authority") and targeted-`get_record`s bodies — `scene_coverage` slots into that existing pattern.
2. Per SPEC-99 §2 item 5 + AC#7. The sub-check reads `story_bundle_context.scene_coverage` (added by SPEC99CONPACSCE-001) and flags (a) long unscened PG runs, (b) `planned`-no-prose scenes, (c) `WARN`-receipt scenes, and (d) un-resuperseded superseded scenes.
3. Cross-artifact boundary under audit: the `scene_coverage` packet field (world-mcp, SPEC99CONPACSCE-001) consumed by this skill. The sub-check must read the field shape 001 emits (per-PG scene_ids/unscened + per-SCN publication indicator) and retrieve SCN bodies via `get_record` only when a finding needs body detail (per the skill's index-surface discipline).
4. FOUNDATIONS: §Story Bundles §4a (rendered prose is downstream of committed state — the check measures prose *debt*, it never gates state) + Rule 5 (No Consequence Evasion — unscened debt is a real second-order effect the audit must surface) + Rule 7 (the check reads coverage membership only; it must not narrow or resolve any Mystery Reserve entry). The skill stays a read-only story-scope audit (mutates only `audits/`).

## Architecture Check

1. Adds the check as a sub-check of an existing structural phase (2c or 2f), reusing the skill's established index-surface-then-targeted-retrieval pattern — no new phase machinery, no new retrieval primitive.
2. No shim: consumes the additive `scene_coverage` field directly; the turn-cycle advisory note stays out of this ticket (turn-cycle is scene-independent by design and advisory-only).

## Verification Layers

1. The sub-check reads `story_bundle_context.scene_coverage` and emits unscened-run / prose-debt findings -> skill dry-run against a scene-first bundle + grep-proof the new sub-check references the field.
2. The check is read-only (mutates only `audits/`) and resolves no MR entry (Rule 7) -> FOUNDATIONS alignment check + manual review of the firewall boundary.

## What to Change

### 1. New unscened-run / prose-debt sub-check

In Phase 2c (Debt health) or Phase 2f (Continuation / terminal proof), add a sub-check that walks `story_bundle_context.scene_coverage` per branch and emits findings for: long unscened PG runs (prose-rendering debt), scenes stuck `planned` with no prose, `WARN`-receipt scenes, and superseded scenes left un-resuperseded. Retrieve SCN bodies via `get_record` only when a finding needs body detail.

### 2. Phase / inputs documentation

Document `story_bundle_context.scene_coverage` in the skill's context-packet-inputs section as the index surface for the new sub-check.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- The `scene_coverage` packet layer itself (SPEC99CONPACSCE-001).
- The docs closeout sweep (SPEC99CONPACSCE-002).
- The turn-cycle advisory drift note (optional per SPEC-99 §4; not this ticket).
- Any change to the Mystery Reserve firewall (Phase 2e) or any canon-write path.

## Acceptance Criteria

### Tests That Must Pass

1. A skill dry-run against a scene-first bundle with an unscened run + a `planned`-no-prose scene + a `WARN`-receipt scene emits the corresponding health findings.
2. `grep -n "scene_coverage\|unscened" .claude/skills/branching-story-health-audit/SKILL.md` confirms the sub-check references the packet field.

### Invariants

1. The sub-check is read-only — the skill mutates only `audits/`.
2. The check reads coverage membership metadata only; it resolves/narrows no Mystery Reserve entry (Rule 7).

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; verification is a skill dry-run + grep-proof of the new sub-check (no test-suite surface for SKILL.md prose).`

### Commands

1. `grep -n "scene_coverage" .claude/skills/branching-story-health-audit/SKILL.md`
2. Skill dry-run: `/branching-story-health-audit` (structural mode) against a scene-first bundle; inspect the `SAU` findings table for unscened-run / prose-debt findings.
