# SPEC50STPSTECHC-013: Targeted-retrieval discipline across 5 story-pipeline skills

**Status**: COMPLETED
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

## Landed Changes

### 1. Targeted-retrieval discipline (E.2)

Each of the five skills now requires full-body targeted retrieval when an MCP `story_bundle_context` summary identifies a material STPLAN/STEMO/STSEC/STQ/CLK record before authoring or auditing CHC grounding, SLT predicates/effects, page-plan §9b/§9c/§10b, prose receipts, or health-audit findings that depend on basis/blocker/appraisal/orientation detail. Bootstrap records the same discipline for any existing/sibling story-bundle summary it receives while preserving that a new target bundle has `story_bundle_context: null`. No packet surface changed.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `specs/SPEC-50-stplan-stemo-chc-slt-exploitation-parity.md` (modify — implementation note for E.2)

## Out of Scope

- Any MCP packet enrichment / new packet field (explicitly rejected; reaffirms SPEC-49 §Out-of-Scope).
- Any schema or validator change.

## Acceptance Criteria

### Tests That Must Pass

1. Each of the five SKILL.md files states the summary-hit → `get_record` / `get_records` / full-body `list_records` discipline.
2. No packet-builder surface changed (diff-proof; no `tools/world-mcp/` files changed).

### Invariants

1. The discipline reaffirms the Index+Follow-Up contract — summaries index existence + citation handles; detail is fetched via targeted retrieval. No packet enrichment.

## Test Plan

### New/Modified Tests

1. `None — skill-prose change across five skills; verification is grep-proof of the discipline statement in each SKILL.md and confirmation no packet-builder changed, per Assumption Reassessment.`

### Commands

1. `grep -ln "Targeted retrieval discipline" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md`
2. `grep -ln "mcp__worldloom__get_record\\|mcp__worldloom__get_records\\|include_full_body=true" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md`
3. Confirm no `tools/world-mcp/` packet-builder file changed in the diff.

## Outcome

Completed: 2026-05-20.

What changed:
- Added targeted-retrieval discipline to all five story-pipeline skills named by SPEC-50 E.2.
- The discipline reaffirms the Index + Follow-Up contract: `story_bundle_context` summaries identify material STPLAN/STEMO/STSEC/STQ/CLK records, while `get_record`, `get_records`, or full-body `list_records` supplies detail before authoring or auditing load-bearing grounding, predicate/effect, page-plan, prose-receipt, or health findings.
- Added the SPEC-50 E.2 implementation note.

Deviations from original plan:
- The landed command names include `mcp__worldloom__get_records` as the batched full-body retrieval path in addition to the drafted `get_record` / `list_records` wording, matching `docs/CONTEXT-PACKET-CONTRACT.md` and `docs/MACHINE-FACING-LAYER.md`.
- Bootstrap preserves that the target new bundle has `story_bundle_context: null`; its discipline applies only when existing/sibling story-bundle summary context is surfaced.

## Verification Result

Passed on 2026-05-20:

1. `grep -ln "Targeted retrieval discipline" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — returned all five target skill files.
2. `grep -ln "mcp__worldloom__get_record\\|mcp__worldloom__get_records\\|include_full_body=true" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — returned all five target skill files.
3. `git diff --name-only -- tools/world-mcp` — returned no paths; no packet-builder or MCP source surface changed.
4. `git diff --check -- .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md specs/SPEC-50-stplan-stemo-chc-slt-exploitation-parity.md archive/tickets/SPEC50STPSTECHC-013.md` — passed.
