# SKILLMRFW-001: Replace invalid search_nodes status filter with get_firewall_content in propose-new-worlds-from-preferences Phase 11a

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — skill prose only (`.claude/skills/propose-new-worlds-from-preferences/SKILL.md` Phase 11a + World-State Prerequisites)
**Deps**: none

## Problem

`propose-new-worlds-from-preferences/SKILL.md` Phase 11a (line 253) directs operators to enumerate forbidden Mystery Reserve records via:

```
mcp__worldloom__search_nodes(node_type='mystery_record', filters={world_slug, status: 'forbidden'})
```

This call is **invalid**: `search_nodes`'s `filters` schema does not support a `status` key (per `tools/world-mcp/src/tools/search-nodes.ts` — supported filters are `world_slug`, `node_type`, `entity_name`, `reference_name`, `include_scoped_references`, `file_path`). An operator following the skill literally would receive a schema-validation error and either fall back to ad-hoc Bash for-loops over `_source/mystery-reserve/M-*.yaml` (the workaround actually exercised in this session — and the exact Hook 2 redirect risk the atomic-source layer was designed to avoid) or skip the firewall check.

Meanwhile, four sibling canon-reading skills (`character-generation`, `propose-new-canon-facts`, `canon-facts-from-diegetic-artifacts`, `diegetic-artifact-generation`) already document the correct tool: `mcp__worldloom__get_firewall_content(world_slug)` — a single MCP call that returns every M record's `title` + `status` + `unknowns` + `common_interpretations` + `disallowed_cheap_answers`, exactly the firewall-content surface Phase 11a needs. `propose-new-worlds-from-preferences` and (separately) `propose-new-characters` do not yet reference this tool.

This is the most consequential gap I encountered in the session: the skill's documented MCP example fails schema-validation, the FOUNDATIONS Rule 7 cross-world firewall check then falls back to grep-over-`_source/`, and the operator who notices the gap has to derive the correct tool from sibling skills. **Following the skill literally produces incorrect output** (the firewall is either skipped or executed via prose-driven Bash logic).

## Assumption Reassessment (2026-04-28)

1. `search_nodes`'s filter schema is confirmed at `tools/world-mcp/src/tools/search-nodes.ts` (grep of `args.filters?.` properties returns: `node_type`, `world_slug`, `entity_name`, `reference_name`, `include_scoped_references`, `file_path` — no `status`). The `status: 'forbidden'` filter clause in the skill text is a runtime error, not a working-but-suboptimal call.
2. `get_firewall_content` exists at `tools/world-mcp/src/tools/get-firewall-content.ts` and is registered in `tools/world-mcp/src/tool-names.ts`. Its tool-description string ("Bulk retrieval of Mystery Reserve firewall fields … Use for Phase 7b firewall audits to avoid budget-pressured packet calls or N per-record get_record calls") confirms it is purpose-built for the use case Phase 11a needs. Four sibling skills already document it: `character-generation/references/phase-7-canon-safety-check.md` line 24, `propose-new-canon-facts/references/phase-7-canon-safety-check.md` line 26, `canon-facts-from-diegetic-artifacts/references/phase-6-canon-safety-check.md` line 19, `diegetic-artifact-generation/references/phase-7-canon-safety-check.md` line 21 — all with the same "Bulk firewall retrieval: prefer `mcp__worldloom__get_firewall_content(world_slug)`" template.
3. Cross-skill boundary under audit: the contract between (a) `propose-new-worlds-from-preferences` (consumer of MR firewall data) and (b) `tools/world-mcp/src/tools/get-firewall-content.ts` (provider). The shared schema is the firewall-content fields returned per M record. The skill's Phase 11a reads `unknowns` per forbidden M; `get_firewall_content` returns `unknowns` directly — schema match confirmed.
4. FOUNDATIONS principle motivating this ticket: §Rule 7 (Preserve Mystery Deliberately) — "Unknowns must be chosen, bounded, and tracked. They must not be side effects of weak design memory." The cross-world MR firewall is the load-bearing safety check for Rule 7 at proposal-card generation time; if the documented MCP example fails, operators either skip the check (silent Rule 7 violation) or improvise (Hook 2 redirect risk + per-operator inconsistency in scan logic).
5. This ticket touches the Canon Safety Check surface directly. Confirmation: the change does NOT weaken the Mystery Reserve firewall — it strengthens it by replacing a non-functional MCP call with a working one. The post-fix Phase 11a still records every checked M-id in `canon_safety_check.cross_world_mr_firewall.checked[]` regardless of overlap (the proof-of-check audit trail remains intact); the only change is which MCP call retrieves the M records.
6. Not applicable — no output schema (proposal card frontmatter, batch manifest) is extended. The change is purely on the retrieval-tool surface used INSIDE Phase 11a.
7. The change replaces one MCP call with another; no symbol is renamed or removed. Blast radius scan: `grep -rn "search_nodes.*status:" .claude/skills/` returns ONE hit (the broken Phase 11a line in propose-new-worlds-from-preferences). No other skill uses the invalid filter syntax. `propose-new-characters` Phase 10b uses `search_nodes(node_type='mystery_record')` WITHOUT a status filter — that call works but is suboptimal vs `get_firewall_content`; this ticket also recommends the upgrade for consistency with the four already-documenting siblings (see §Out of Scope for the boundary decision).
8. Adjacent contradiction surfaced during reassessment: `propose-new-worlds-from-preferences` World-State Prerequisites (line 132) ALSO references `mcp__worldloom__search_nodes(node_type='mystery_record', filters={world_slug: <slug>})` — that call IS valid (no status filter) but is suboptimal vs `get_firewall_content`. Updating it for consistency with the Phase 11a fix is a required consequence of this ticket and lives in §Files to Touch.

## Architecture Check

1. Replacing the broken `search_nodes` call with `get_firewall_content` brings `propose-new-worlds-from-preferences` into alignment with the four sibling canon-reading skills that already document the correct pattern. The alternative (extending `search_nodes` to support a `status` filter) duplicates `get_firewall_content`'s surface and creates two valid paths for the same operation; cascade scope at audit phase already established that the firewall-content tool is the canonical path.
2. No backwards-compatibility shims — the broken call is replaced cleanly. No deprecation needed because the broken call was never functional; no operator could have built dependent code on it.

## Verification Layers

1. The Phase 11a text references `get_firewall_content` (not `search_nodes` with `status` filter) → codebase grep-proof: `grep -n "get_firewall_content\|search_nodes.*status:" .claude/skills/propose-new-worlds-from-preferences/SKILL.md` returns one hit naming `get_firewall_content` and zero hits naming the invalid status filter.
2. The World-State Prerequisites M-record retrieval text references `get_firewall_content` (with `get_record` per M-id as fallback) → grep-proof: same pattern as above for line 132.
3. Operator dry-run: invoke `/propose-new-worlds-from-preferences` against `briefs/preferred-worldbuilding.md` + `briefs/story-world-brainstorming-parameters.md` and confirm Phase 11a executes without falling back to Bash for-loops over `_source/` → manual review of the session transcript: no `Bash for m in worlds/.../mystery-reserve/M-*.yaml` calls.
4. The cross-world MR firewall remains an unconditional check that records every checked M-id regardless of overlap (Rule 7 audit-trail invariant) → FOUNDATIONS alignment check: `canon_safety_check.cross_world_mr_firewall.checked[]` populated for every shipped card in a post-fix dry-run batch.

## What to Change

### 1. Replace Phase 11a's invalid search_nodes call with get_firewall_content

In `.claude/skills/propose-new-worlds-from-preferences/SKILL.md` Phase 11a (line 253 area), replace:

> Per existing world, scan M records (`mcp__worldloom__search_nodes(node_type='mystery_record', filters={world_slug, status: 'forbidden'})`).

with the canonical sibling-skill pattern:

> Per existing world, retrieve all M records via `mcp__worldloom__get_firewall_content(world_slug)` — one MCP call returns every M record's `title` + `status` + `unknowns` + `common_interpretations` + `disallowed_cheap_answers`. Filter the result client-side for `status: 'forbidden'` entries; for each forbidden M, verify the proposal card does NOT transcribe, paraphrase, or "answer" the M's `unknowns` field. Fall back to `mcp__worldloom__get_record('M-NNNN')` per id when full M-record context (`notes`, `extensions`, `modification_history`) is needed beyond the firewall projection.

The "Record every checked M-id in the card's `canon_safety_check.cross_world_mr_firewall.checked[]`, regardless of overlap" sentence + the Empty Worlds Path skip clause remain unchanged.

### 2. Update World-State Prerequisites to reference get_firewall_content

In `.claude/skills/propose-new-worlds-from-preferences/SKILL.md` World-State Prerequisites (line 132 area), replace the `search_nodes(node_type='mystery_record', filters={world_slug: <slug>})` reference with `get_firewall_content(world_slug)` for the bulk-firewall use case (with `search_nodes` retained ONLY for the invariant scan use case mentioned in the same sentence). This brings the prerequisites text into consistency with the Phase 11a fix.

### 3. Recommend get_firewall_content in propose-new-characters Phase 10b for consistency

In `.claude/skills/propose-new-characters/SKILL.md` Phase 10b (line 94) and `.claude/skills/propose-new-characters/references/phase-10-canon-safety-check.md` line 23, add the same "Bulk firewall retrieval: prefer `mcp__worldloom__get_firewall_content(world_slug)`" preamble that the four sibling skills already use. The current `search_nodes(node_type='mystery_record')` call is technically valid (no status filter), but the upgrade brings propose-new-characters into alignment with the four-skill consistent pattern.

## Files to Touch

- `.claude/skills/propose-new-worlds-from-preferences/SKILL.md` (modify — Phase 11a line 253 area + World-State Prerequisites line 132 area)
- `.claude/skills/propose-new-characters/SKILL.md` (modify — Phase 10b line 94 area)
- `.claude/skills/propose-new-characters/references/phase-10-canon-safety-check.md` (modify — line 23 area)

## Out of Scope

- Extending `search_nodes` to support a `status` filter. `get_firewall_content` already covers the bulk-firewall use case; adding a duplicative path on `search_nodes` increases the API surface without adding capability.
- Fixing `search_nodes` filter syntax in any other skill. Only `propose-new-worlds-from-preferences` Phase 11a uses the invalid `status:` clause; the other skills using `search_nodes(node_type='mystery_record')` (no status filter) work correctly today and are upgraded only for the consistency-with-siblings reason in §What to Change §3 — that upgrade IS in scope but would not warrant a separate ticket if §1 + §2 weren't already needed.
- Any change to the firewall-recording invariant (every checked M-id in `cross_world_mr_firewall.checked[]` regardless of overlap). The audit-trail proof-of-check discipline is preserved verbatim.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "search_nodes.*status:" .claude/skills/propose-new-worlds-from-preferences/SKILL.md` returns zero hits after §Files to Touch §1 lands.
2. `grep -n "get_firewall_content" .claude/skills/propose-new-worlds-from-preferences/SKILL.md` returns at least two hits (Phase 11a + World-State Prerequisites).
3. `grep -n "get_firewall_content" .claude/skills/propose-new-characters/SKILL.md .claude/skills/propose-new-characters/references/phase-10-canon-safety-check.md` returns at least one hit per file after §Files to Touch §3 lands.
4. Operator dry-run of `/propose-new-worlds-from-preferences` against the existing test briefs produces a Phase 11a trace that names `get_firewall_content` calls — NOT Bash for-loops or per-M `get_record` retrieval (except as documented fallback for full M-record context).

### Invariants

1. Cross-world Mystery Reserve firewall remains unconditional: every checked M-id is recorded in `canon_safety_check.cross_world_mr_firewall.checked[]` regardless of overlap (Rule 7 audit-trail proof-of-check).
2. Empty Worlds Path skip behavior is unchanged: when `worlds/` is empty, the firewall is skipped with `cross_world_mr_firewall.skipped: true` + reason `no_existing_worlds`.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage (the four sibling skills' Phase X canon-safety-check files already exercise the `get_firewall_content` pattern under their own dry-runs) is named in Assumption Reassessment §2.

### Commands

1. `grep -nE "search_nodes.*status:|get_firewall_content" .claude/skills/propose-new-worlds-from-preferences/SKILL.md` — confirms the replacement landed.
2. `grep -nE "get_firewall_content" .claude/skills/{propose-new-worlds-from-preferences,propose-new-characters,character-generation,propose-new-canon-facts,canon-facts-from-diegetic-artifacts,diegetic-artifact-generation}/` — confirms cross-skill consistency: all six canon-reading skills now reference the canonical bulk-firewall tool.
3. `/propose-new-worlds-from-preferences briefs/preferred-worldbuilding.md briefs/story-world-brainstorming-parameters.md` — operator dry-run; inspect Phase 11a trace for `get_firewall_content` calls. (Narrow command boundary: the skill's HARD-GATE means this dry-run can stop at the deliverable summary without writing files.)
