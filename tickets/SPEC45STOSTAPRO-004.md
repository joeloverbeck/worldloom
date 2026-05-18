# SPEC45STOSTAPRO-004: story-fact-promotion-to-canon Phase 1 wiring

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — updates `.claude/skills/story-fact-promotion-to-canon/SKILL.md` Phase 1 instruction (line 180) to call the new MCP tool from SPEC45STOSTAPRO-003 instead of the filesystem-walk pattern, plus a §World-State Prerequisites update (line 148) listing the new tool. Skill prose change only; no code change.
**Deps**: SPEC45STOSTAPRO-003

## Problem

`.claude/skills/story-fact-promotion-to-canon/SKILL.md:180-181` (Phase 1: Load source and branch provenance) currently instructs the LLM literally: *"The `SE-<integer>` events that authored or modified each source record (traverse `_source/events/SE-*.yaml` for events whose `state_delta.create / supersede` references any source record)."* This is the file-walk pattern that SPEC-45 exists to replace — it is the spec's confirmed Tier 1 hard consumer. With SPEC45STOSTAPRO-003 landing the `mcp__worldloom__get_story_state_provenance` MCP tool, Phase 1's instruction can switch to an O(1) MCP call returning structured `{ creating_se_id, modifying_se_ids, evidence_records }` instead of an O(N) filesystem-walk + substring-matching delegated to the LLM. The §World-State Prerequisites list also needs the new tool added alongside `get_context_packet` and `get_records`.

## Assumption Reassessment (2026-05-18)

1. `.claude/skills/story-fact-promotion-to-canon/SKILL.md:148, 180, 181` exist and carry the content quoted in SPEC-45 §Approach Phase 2 D11. Verified via Read of skill SKILL.md lines 145-185 at session time. Line 148 is the §World-State Prerequisites bullet for world-canon context packet retrieval; line 180 is the SE-event load instruction (the file-walk pattern); line 181 is the BEL lookup instruction (composes naturally with the new helper's `creating_se_id` output and is preserved unchanged).
2. SPEC-45 §Approach Phase 2 D11 specifies the rewrite — replace the file-walk instruction with the MCP-call instruction; add the new tool to §World-State Prerequisites; preserve line 181 unchanged. The proposed rewrite text appears in SPEC-45 §Approach Phase 2 step 7.
3. Cross-skill / cross-tool boundary under audit: this skill (`story-fact-promotion-to-canon`) becomes the first consumer of `mcp__worldloom__get_story_state_provenance` (introduced by SPEC45STOSTAPRO-003). The skill instruction's tool-name string must match the registered tool name exactly (`mcp__worldloom__get_story_state_provenance`).

## Architecture Check

1. **Skill instruction now matches deterministic retrieval pattern**: the rewrite replaces probabilistic LLM file-walking with a deterministic MCP graph query, eliminating the failure modes the Problem Statement names (missing references in long files, mis-parsing YAML, context-window-trimming mid-scan).
2. **No backwards-compatibility shims introduced**: the skill prose changes directly to the new instruction; no fallback to the file-walk pattern is preserved. The skill cannot operate without the new MCP tool — SPEC45STOSTAPRO-003 must land first (declared in `Deps`).

## Verification Layers

1. **Skill prose updated correctly** → codebase grep-proof: `grep -n "get_story_state_provenance" .claude/skills/story-fact-promotion-to-canon/SKILL.md` returns matches at line 148 (§World-State Prerequisites) and line 180 (Phase 1). `grep -n "traverse.*SE-\*.yaml" .claude/skills/story-fact-promotion-to-canon/SKILL.md` returns ZERO matches (the file-walk instruction is fully removed).
2. **Line 181 preserved unchanged** → codebase grep-proof: `grep -n "consequences.opens\|basis.source_event" .claude/skills/story-fact-promotion-to-canon/SKILL.md` returns the same matches as pre-edit (BEL lookup instruction unchanged in shape and substance).
3. **Skill instruction composes with new MCP tool output** → manual review: dry-run of Phase 1 against red-bunny (post-Codex remediation + post-SPEC-45 indexer rebuild) confirms the new instruction reads coherently and produces the expected `creating_se_id` and `modifying_se_ids` that the BEL lookup at line 181 then consumes.

## What to Change

### 1. Update §World-State Prerequisites (line 148)

Locate the bullet at SKILL.md line 148 that names `mcp__worldloom__get_context_packet` and `mcp__worldloom__get_records` as the world-canon retrieval surface. Add the new tool to the same bullet (or as a parallel bullet, operator judgment for prose flow):

> "Load `source_record_ids` and related authoring `SE` / witness `BEL` records through targeted `mcp__worldloom__get_records(record_ids=<ids>, story_slug=<story_slug>)` or `mcp__worldloom__get_story_state_provenance(record_id=<id>, story_slug=<story_slug>)` (returns `creating_se_id` + `modifying_se_ids` + `evidence_records` for each source record — used in Phase 1) or direct story-bundle reads allowed by the current workflow; do not pass story-local ids in world-scope `seed_nodes`."

Adjust prose for natural integration with the surrounding §World-State Prerequisites bullet structure.

### 2. Rewrite Phase 1 line 180

Locate the bullet at SKILL.md Phase 1 (line 180): *"The `SE-<integer>` events that authored or modified each source record (traverse `_source/events/SE-*.yaml` for events whose `state_delta.create / supersede` references any source record)."*

Replace with:

> "The `SE-<integer>` events that authored or modified each source record — call `mcp__worldloom__get_story_state_provenance(record_id=<source_record_id>, story_slug=<story_slug>)` for each id in `source_record_ids`; the returned `creating_se_id` (the authoring SE) and `modifying_se_ids[]` (any SEs that superseded the record) enumerate the relevant SE records to load via `mcp__worldloom__get_records(record_ids=<creating_se_id and modifying_se_ids>, story_slug=<story_slug>)`. `evidence_records[]` from the same call surfaces records cited as creation evidence — also load these if not already in scope."

Adjust prose for natural flow with surrounding Phase 1 bullets.

### 3. Preserve line 181 unchanged

The BEL lookup bullet at line 181 stays as-is: *"The `BEL-<integer>` records showing who knows / believes / witnesses the claim — load every BEL whose `consequences.opens[]` or `basis.source_event` references any authoring `SE`."*

The lookup composes naturally with the new helper's output — the skill takes the authoring SE id(s) from the helper, then queries BELs referencing them via the same existing `get_records` / direct-read path. No instruction change needed.

## Files to Touch

- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify) — update lines 148, 180; preserve line 181.

## Out of Scope

- Any Phase 2 / 3 / 4 / 5 / 6 / 7 instruction change — this ticket scopes strictly to Phase 1's SE/BEL load discipline.
- Any change to the proposal package shape, source_kind enum, or candidate translation logic — those are Phase 2 / 6 concerns, untouched.
- Any change to BEL retrieval mechanism — the BEL load at line 181 uses existing tools; no MCP helper is being introduced for it.
- Any wider skill update beyond the lines named — SPEC-45 explicitly scopes this to lines 148/180.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "mcp__worldloom__get_story_state_provenance" .claude/skills/story-fact-promotion-to-canon/SKILL.md` returns matches at line 148 (or thereabouts post-edit) AND line 180 (Phase 1 instruction).
2. `grep -n "traverse.*SE-\*.yaml" .claude/skills/story-fact-promotion-to-canon/SKILL.md` returns ZERO matches (file-walk instruction fully removed).
3. `grep -n "consequences.opens\|basis.source_event" .claude/skills/story-fact-promotion-to-canon/SKILL.md` returns matches at line 181 (unchanged BEL lookup preserved).

### Invariants

1. Phase 1's SE-load instruction is deterministic at execution time (MCP graph query, not LLM file-walk).
2. Phase 1's BEL-load instruction is unchanged in shape and substance (composes naturally with the new helper's output).
3. The skill cannot operate against an index that lacks the new edges from SPEC45STOSTAPRO-002 — this is enforced structurally by the `Deps: SPEC45STOSTAPRO-003` chain (which transitively reaches 002).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "mcp__worldloom__get_story_state_provenance" .claude/skills/story-fact-promotion-to-canon/SKILL.md` — confirm new tool referenced at the expected sites.
2. `grep -n "traverse.*SE-\*.yaml" .claude/skills/story-fact-promotion-to-canon/SKILL.md` — confirm file-walk instruction is fully removed.
3. Manual prose-coherence review: read SKILL.md Phase 1 in full post-edit, confirm the instruction reads cleanly end-to-end and the BEL flow at line 181 connects to the new helper's `creating_se_id` output coherently.
