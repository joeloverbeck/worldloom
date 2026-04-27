# CHARGENMCP-004: Align character-generation skill default `token_budget` with engine's required-classes minimum

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — documentation/skill-prose alignment only
**Deps**: archive/tickets/CHARGENMCP-001.md

## Problem

During the Namahan character-generation run (2026-04-27), the first context-packet call used the skill-documented default `token_budget=10000` (per `.claude/skills/character-generation/SKILL.md:92` and `.claude/skills/character-generation/references/world-state-prerequisites.md:13`). The engine returned `packet_incomplete_required_classes` with `requested_budget: 12000` (after the first attempt) and `minimum_required_budget: 12132` for a 12-seed call against `worlds/animalia/`. The documented default and the engine's actual floor diverge: a fresh skill invocation that follows the prerequisites verbatim hits a packet-insufficiency error and has to retry with a manually-raised budget.

This is a small but real friction point. The skill's documented default should be at or above the engine's minimum-required floor for the typical call shape (12 seed nodes against a mature world), so that "follow the prerequisites verbatim" produces a successful packet on first call. The engine's insufficiency error path remains the correct safety net for unusually large seed sets.

## Assumption Reassessment (2026-04-27)

1. `.claude/skills/character-generation/SKILL.md:92` documents `token_budget=10000` as the default for `mcp__worldloom__get_context_packet(task_type='character_generation', …)`. Verified by grep.
2. `.claude/skills/character-generation/references/world-state-prerequisites.md:13` documents the same `token_budget=10000` as the prerequisites' canonical example call. Verified by grep.
3. The Namahan run hit `packet_incomplete_required_classes` with `minimum_required_budget: 12132` for a 12-seed call. The engine's floor depends on the world's required-classes payload size (kernel + invariants + impact-surface M records, etc.). For `worlds/animalia/` at the post-SPEC-13 atomic-source state with 16 invariants and 20 M records, the floor is ~12.1KB.
4. `archive/tickets/CHARGENMCP-001.md` increased the `character_generation` packet's governing payload (all invariants full body + all M records' firewall fields ≈ 44KB additional). This ticket should measure the post-CHARGENMCP-001 floor so the new default reflects the landed packet shape, not the pre-CHARGENMCP-001 floor.
5. Cross-skill / cross-artifact boundary under audit: the prose contract between the character-generation skill and the context-packet API. The skill's example budget is a default users follow verbatim under Auto Mode; misalignment with the engine's floor is a workflow defect.
6. FOUNDATIONS principle under audit: §Tooling Recommendation's completeness guarantee. The packet's required-classes floor exists precisely to enforce completeness; the skill default must respect it.
7. HARD-GATE / canon-write ordering: not touched. This is a skill-prose change.
8. Schema extension: none.
9. Adjacent contradictions exposed by reassessment:
   - Other task-typed skills (`canon-addition`, `continuity-audit`, `propose-new-canon-facts`) may have similar default-budget misalignments. This ticket is scoped to `character-generation`; a parallel sweep over the other skills' documented defaults belongs in a follow-up ticket if a future audit confirms the same divergence.
   - The `packet_incomplete_required_classes` error's `minimum_required_budget` field is informative — skills could compute the right budget on first call by issuing a deliberately-small probe and reading the floor from the error. That is an over-engineered workaround for what should be a documented honest default.

## Architecture Check

1. Aligning the documented default with the engine's measured floor is the simplest fix. The alternative (lower the engine's floor) would weaken the locality-first packet's completeness guarantee — the floor exists for a reason.
2. No backwards-compatibility aliasing/shims introduced. This is a documentation/prose change.

## Verification Layers

1. The skill prose's example default budget is at or above the engine's minimum-required floor for a typical 12-seed call against `worlds/animalia/` after `archive/tickets/CHARGENMCP-001.md` — manual review against measured floor.
2. A skill dry-run with the new default budget against a representative brief succeeds without hitting `packet_incomplete_required_classes` — skill dry-run.
3. FOUNDATIONS alignment — preserves §Tooling Recommendation completeness guarantee while removing the documented-default-vs-engine-floor mismatch — FOUNDATIONS alignment check.

## What to Change

### 1. Measure the post-CHARGENMCP-001 floor

Measure the post-CHARGENMCP-001 `minimum_required_budget` for a `character_generation` packet against `worlds/animalia/` with a representative seed set (~10–12 seeds drawn from a real character proposal such as NCP-0007). Round up to the nearest 1000 with a small headroom buffer.

### 2. Update skill prose to use the measured default

Edit `.claude/skills/character-generation/SKILL.md` at the `token_budget=10000` reference (line 92) and `.claude/skills/character-generation/references/world-state-prerequisites.md` at the `token_budget=10000` example (line 13) to use the measured value (expected: 16000–20000 after CHARGENMCP-001).

### 3. Document the floor-divergence error path

In `.claude/skills/character-generation/references/world-state-prerequisites.md`, add a one-line note: "If the packet returns `packet_incomplete_required_classes`, retry with `token_budget` set to the response's `minimum_required_budget` field. The default above is calibrated for a typical call shape; unusually large seed sets may exceed it."

## Files to Touch

- `.claude/skills/character-generation/SKILL.md` (modify — line 92)
- `.claude/skills/character-generation/references/world-state-prerequisites.md` (modify — line 13 + new note)

## Out of Scope

- Changes to the engine's required-classes floor (`tools/world-mcp/src/context-packet/`).
- Changes to other task-typed skills' default budgets (`canon-addition`, `continuity-audit`, `propose-new-canon-facts`, etc.) — covered by a future audit if needed.
- Changes to the `packet_incomplete_required_classes` error shape (the error's `minimum_required_budget` field is already authoritative; this ticket relies on it).

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run: invoking `Skill character-generation` with `worlds/animalia worlds/animalia/character-proposals/NCP-0007-namahan-of-the-third-gate.md` succeeds at the first context-packet call without retry. (Prerequisite: `archive/tickets/CHARGENMCP-001.md`.)
2. Grep-proof: `grep "token_budget=10000" .claude/skills/character-generation/` returns no matches.
3. Grep-proof: `grep "token_budget=" .claude/skills/character-generation/` returns the new value at both citation sites.

### Invariants

1. Documented default budget ≥ engine minimum-required floor for the typical call shape on `worlds/animalia/`.
2. The skill prose still references `packet_incomplete_required_classes` as the safety net for unusually large seed sets.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -rn "token_budget" .claude/skills/character-generation/`
2. After this ticket lands, run a fresh `Skill character-generation` against `NCP-0007-namahan-of-the-third-gate.md` (or another representative proposal) and confirm the first packet call returns successfully. Inspect the workflow trace; no `packet_incomplete_required_classes` should appear.
