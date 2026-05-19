# SPEC50STPSTECHC-013: Targeted-retrieval discipline across 5 story-pipeline skills

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — skill prose in `branching-story-turn-cycle`, `branching-story-bootstrap`, `commitment-block-authoring`, `branching-story-prose-attach`, `branching-story-health-audit`. No new MCP packet surface.
**Deps**: None

## Problem

MCP `story_bundle_context` summaries expose STPLAN/STEMO/STSEC/STQ/CLK as summaries, not full records (basis/blocker/appraisal/orientation detail omitted by design). When a summary identifies a material record, skills can author CHC grounding, SLT predicates/effects, page-plan §9b/§9c/§10b, prose receipts, or health-audit findings against the summary rather than the full record — under-supporting the authoring. The fix is a skill-prose discipline (fetch the full record), not a packet enrichment.

## Assumption Reassessment (2026-05-19)

1. Codebase: the five Category 2c story-pipeline skills are `.claude/skills/branching-story-turn-cycle`, `branching-story-bootstrap`, `commitment-block-authoring`, `branching-story-prose-attach`, `branching-story-health-audit` (per FOUNDATIONS §Story Bundles §7). `get_record`/`list_records` are the targeted-retrieval tools. Verified the skill set this session.
2. Specs/contract: SPEC-50 §E.2 reaffirms SPEC-49 §Out-of-Scope R2/R3/R5 and the CONTEXT-PACKET-CONTRACT Index+Follow-Up pattern; no new packet surface.
3. Cross-artifact boundary: the discipline references the MCP retrieval contract (summary indexes existence + citation handle; detail fetched via `get_record`); the five skills share this consumer-side convention, so the prose must be consistent across them.
4. FOUNDATIONS §Tooling Recommendation: agents should never operate on prose/summary alone where full-record detail is load-bearing; this discipline enforces the documented context-packet + targeted-retrieval pattern. It does NOT invert the Index+Follow-Up contract (no packet enrichment).

## Architecture Check

1. A skill-prose discipline reaffirming the existing Index+Follow-Up contract is the minimal fix; enriching the packet (the rejected alternative) would invert the contract and add per-page token cost across every retrieval. The discipline is consistent across the five skills so authoring behavior does not diverge.
2. No shim — no new packet, no schema change; prose only.

## Verification Layers

1. Each of the five skills states the summary-hit → `get_record` discipline -> grep-proof across the five SKILL.md files.
2. No new MCP packet field is introduced -> grep-proof that no packet-builder surface changed.
3. Single-layer-per-skill ticket: the proof is grep-based prose presence across the five skills; no schema or code layer applies.

## What to Change

### 1. Targeted-retrieval discipline (E.2)

In each of the five skills, add a requirement: when an MCP `story_bundle_context` summary identifies a material STPLAN/STEMO/STSEC/STQ/CLK record, call `get_record`/`list_records` for the full body before authoring CHC grounding, SLT predicates/effects, page-plan §9b/§9c/§10b, prose receipts, or health-audit findings that depend on basis/blocker/appraisal/orientation detail. No new packet surface.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- Any MCP packet enrichment / new packet field (explicitly rejected; reaffirms SPEC-49 §Out-of-Scope).
- Any schema or validator change.

## Acceptance Criteria

### Tests That Must Pass

1. Each of the five SKILL.md files states the summary-hit → `get_record`/`list_records` discipline.
2. No packet-builder surface changed (grep-proof).

### Invariants

1. The discipline reaffirms the Index+Follow-Up contract — summaries index existence + citation handles; detail is fetched via targeted retrieval. No packet enrichment.

## Test Plan

### New/Modified Tests

1. `None — skill-prose change across five skills; verification is grep-proof of the discipline statement in each SKILL.md and confirmation no packet-builder changed, per Assumption Reassessment.`

### Commands

1. `grep -ln "get_record\|targeted retrieval\|full record\|full body" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md`
2. Confirm no `tools/world-mcp/` packet-builder file changed in the diff.
