# SKILLMRFW-002: Replace stale mystery_record search_nodes examples in sibling skills

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — skill prose only
**Deps**: `archive/tickets/SKILLMRFW-001-cross-world-firewall-tool-correction.md`

## Problem

At intake, while implementing SKILLMRFW-001, reassessment found that several sibling skills still used `search_nodes(node_type='mystery_record')` in Mystery Reserve firewall expansion prose. The live `search_nodes` filter type is the world-index `NodeType` surface, where the Mystery Reserve node type is `mystery_reserve_entry`; `mystery_record` is a `list_records(record_type=...)` alias, not a `search_nodes` node type.

Most affected sibling files already contained the canonical `get_firewall_content(world_slug)` bulk-firewall guidance, so this was not the same blocker as SKILLMRFW-001's cross-world forbidden-status example. It was still misleading operator guidance and needed cleanup across the sibling references.

## Assumption Reassessment (2026-04-28)

1. Live node types are defined in `tools/world-index/src/schema/types.ts`; `mystery_reserve_entry` is present and `mystery_record` is absent.
2. `tools/world-mcp/src/tools/list-records.ts` maps `record_type: "mystery_record"` to `mystery_reserve_entry`, proving the alias belongs to `list_records`, not `search_nodes`.
3. Cross-skill boundary under audit: Mystery Reserve firewall expansion prose in sibling canon-reading skills should route field-bounded firewall projection through `mcp__worldloom__get_firewall_content(world_slug)` and reserve `get_record('M-NNNN')` for full-record context.
4. FOUNDATIONS Rule 7 remains the motivating principle: preserving Mystery Reserve entries depends on complete, non-ad-hoc firewall retrieval.
5. Adjacent ownership: SKILLMRFW-001 intentionally fixed only `propose-new-worlds-from-preferences` and `propose-new-characters`. This ticket owns the remaining sibling stale examples.
6. Reassessment found one same-seam stale example outside the drafted file list: `.claude/skills/propose-new-characters/references/preflight-and-prerequisites.md` still named `node_type='mystery_record'`. Because the acceptance gate covers all `.claude/skills`, this ticket absorbs that preflight cleanup too.

## Architecture Check

1. Prefer one canonical firewall projection path (`get_firewall_content`) over preserving multiple stale search examples for the same audit.
2. No backwards-compatibility shims or tool aliases are introduced.

## Verification Layers

1. Stale sibling examples are removed or truth-corrected -> codebase grep-proof over `.claude/skills/`.
2. Canonical firewall retrieval remains documented in every affected sibling -> grep-proof for `get_firewall_content`.
3. Rule 7 firewall semantics remain audit-trail preserving -> manual review of each edited phase text.

## What to Change

### 1. Clean up sibling firewall expansion prose

Replace or qualify stale `search_nodes(node_type='mystery_record')` examples in sibling skills that already own Mystery Reserve firewall checks, using `get_firewall_content(world_slug)` for field-bounded firewall projection and `get_record('M-NNNN')` only for full-record context.

## Files to Touch

- `.claude/skills/propose-new-canon-facts/references/phase-7-canon-safety-check.md` (modify)
- `.claude/skills/propose-new-canon-facts/references/preflight-and-prerequisites.md` (modify)
- `.claude/skills/propose-new-characters/references/preflight-and-prerequisites.md` (modify)
- `.claude/skills/canon-facts-from-diegetic-artifacts/SKILL.md` (modify)
- `.claude/skills/canon-facts-from-diegetic-artifacts/references/phase-6-canon-safety-check.md` (modify)
- `.claude/skills/canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md` (modify)
- `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md` (modify)
- `.claude/skills/diegetic-artifact-generation/references/phase-7-canon-safety-check.md` (modify)
- `docs/triage/2026-04-26-spec06-phase2-static-acceptance.md` (modify only if its historical acceptance wording is still intended as live guidance)
- `archive/tickets/SKILLMRFW-002-sibling-mystery-node-type-alias-cleanup.md` (modify — reassessment and closeout truthing after archival)

## Out of Scope

- Changing `search_nodes` or adding a `mystery_record` alias to it.
- Rewriting firewall semantics, checked-id audit trails, or HARD-GATE behavior.
- Reopening or amending archived SKILLMRFW-001.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "search_nodes\\(node_type='mystery_record'|node_type='mystery_record'" .claude/skills` returns zero live-guidance hits, or any remaining hit is explicitly labeled historical/deprecated evidence.
2. `rg -n "get_firewall_content" .claude/skills/{character-generation,propose-new-characters,propose-new-canon-facts,canon-facts-from-diegetic-artifacts,diegetic-artifact-generation}/` returns hits in every affected firewall reference.

### Invariants

1. Mystery Reserve firewall checks continue to record every checked M-id regardless of overlap.
2. `get_record('M-NNNN')` remains available for full-record context beyond the firewall projection.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is grep-proof plus manual review.

### Commands

1. `rg -n "search_nodes\\(node_type='mystery_record'|node_type='mystery_record'" .claude/skills`
2. `rg -n "get_firewall_content" .claude/skills/{character-generation,propose-new-characters,propose-new-canon-facts,canon-facts-from-diegetic-artifacts,diegetic-artifact-generation}/`

## Outcome

Completed 2026-04-28. The sibling canon-reading skills no longer route Mystery Reserve firewall expansion through `search_nodes(node_type='mystery_record')`. The edited Phase 6/7/10 guidance and prerequisite references now use `mcp__worldloom__get_firewall_content(world_slug)` for field-bounded bulk firewall projection and reserve `get_record('M-NNNN')` for full-record context.

The owned scope widened only within the same live-guidance seam: `.claude/skills/propose-new-characters/references/preflight-and-prerequisites.md` had one remaining stale `node_type='mystery_record'` line and was absorbed because the ticket acceptance gate covered all `.claude/skills`.

## Verification Result

1. `rg -n "search_nodes\\(node_type='mystery_record'|node_type='mystery_record'" .claude/skills` — no hits (exit 1 as expected for negative grep).
2. `rg -n "mystery_record" .claude/skills` — no hits (exit 1 as expected).
3. `rg -n "get_firewall_content" .claude/skills/{character-generation,propose-new-characters,propose-new-canon-facts,canon-facts-from-diegetic-artifacts,diegetic-artifact-generation}/` — hits in every affected skill family, including the newly absorbed `propose-new-characters` preflight reference.
4. Manual review of the edited Phase 6/7/10 firewall prose confirmed the checked-id audit-trail language remains intact and `get_record('M-NNNN')` remains documented only as a full-record fallback.

## Deviations

- `docs/triage/2026-04-26-spec06-phase2-static-acceptance.md` still contains two historical acceptance-report mentions of the old `search_nodes(node_type='mystery_record')` wording. They were left unchanged because the file is dated triage evidence, not live operator guidance.
- No runtime/package tests were added or run. This is a skill-prose-only ticket, and the proof surface is grep-proof plus manual review.
