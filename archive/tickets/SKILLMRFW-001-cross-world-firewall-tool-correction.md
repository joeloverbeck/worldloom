# SKILLMRFW-001: Replace invalid search_nodes status filter with get_firewall_content in propose-new-worlds-from-preferences Phase 11a

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — skill prose only (`.claude/skills/propose-new-worlds-from-preferences/SKILL.md` Phase 11a + World-State Prerequisites)
**Deps**: none

## Problem

At intake, `propose-new-worlds-from-preferences/SKILL.md` Phase 11a directed operators to enumerate forbidden Mystery Reserve records via:

```
mcp__worldloom__search_nodes(node_type='mystery_record', filters={world_slug, status: 'forbidden'})
```

This call is **invalid**: `search_nodes` does not support a `status` filter, and its node-type surface is the world-index `NodeType` set where Mystery Reserve records are `mystery_reserve_entry`, not `mystery_record`. An operator following the skill literally would not get the intended forbidden-M projection and could either fall back to ad-hoc Bash for-loops over `_source/mystery-reserve/M-*.yaml` (the exact Hook 2 redirect risk the atomic-source layer was designed to avoid) or skip the firewall check.

Meanwhile, four sibling canon-reading skills (`character-generation`, `propose-new-canon-facts`, `canon-facts-from-diegetic-artifacts`, `diegetic-artifact-generation`) already document the correct tool: `mcp__worldloom__get_firewall_content(world_slug)` — a single MCP call that returns every M record's `title` + `status` + `unknowns` + `common_interpretations` + `disallowed_cheap_answers`, exactly the firewall-content surface Phase 11a needs. `propose-new-worlds-from-preferences` and (separately) `propose-new-characters` do not yet reference this tool.

At intake, this was the most consequential gap encountered in the session: the skill's documented MCP example did not route to the intended firewall projection, the FOUNDATIONS Rule 7 cross-world firewall check then risked falling back to grep-over-`_source/`, and the operator who noticed the gap had to derive the correct tool from sibling skills. **Following the pre-fix skill literally produced incorrect output** (the firewall was either skipped or executed via prose-driven Bash logic).

## Assumption Reassessment (2026-04-28)

1. `search_nodes`'s filter contract is confirmed at `tools/world-mcp/src/tools/_shared.ts` and `tools/world-mcp/src/server.ts`: supported filters include `node_type`, `world_slug`, `entity_name`, and `file_path`; the implementation also supports `reference_name` / `include_scoped_references`; there is no `status` filter. `tools/world-index/src/schema/types.ts` confirms the live node type is `mystery_reserve_entry`; `mystery_record` is only a `list_records` alias in `tools/world-mcp/src/tools/list-records.ts`. The pre-fix Phase 11a example is therefore non-functional for forbidden-M firewall projection.
2. `get_firewall_content` exists at `tools/world-mcp/src/tools/get-firewall-content.ts`, is registered in `tools/world-mcp/src/tool-names.ts`, and is documented in `tools/world-mcp/src/server.ts` / `docs/CONTEXT-PACKET-CONTRACT.md` as the bulk retrieval surface for Mystery Reserve firewall fields. Its return shape (`title`, `status`, `unknowns`, `common_interpretations`, `disallowed_cheap_answers`) is purpose-built for the Phase 11a audit. Four sibling skills already document it: `character-generation/references/phase-7-canon-safety-check.md`, `propose-new-canon-facts/references/phase-7-canon-safety-check.md`, `canon-facts-from-diegetic-artifacts/references/phase-6-canon-safety-check.md`, and `diegetic-artifact-generation/references/phase-7-canon-safety-check.md`.
3. Cross-skill boundary under audit: the contract between (a) `propose-new-worlds-from-preferences` (consumer of MR firewall data) and (b) `tools/world-mcp/src/tools/get-firewall-content.ts` (provider). The shared schema is the firewall-content fields returned per M record. The skill's Phase 11a reads `unknowns` per forbidden M; `get_firewall_content` returns `unknowns` directly — schema match confirmed.
4. FOUNDATIONS principle motivating this ticket: §Rule 7 (Preserve Mystery Deliberately) — "Unknowns must be chosen, bounded, and tracked. They must not be side effects of weak design memory." The cross-world MR firewall is the load-bearing safety check for Rule 7 at proposal-card generation time; if the documented MCP example fails, operators either skip the check (silent Rule 7 violation) or improvise (Hook 2 redirect risk + per-operator inconsistency in scan logic).
5. This ticket touches the Canon Safety Check surface directly. Confirmation: the change does NOT weaken the Mystery Reserve firewall — it strengthens it by replacing a non-functional MCP call with a working one. The post-fix Phase 11a still records every checked M-id in `canon_safety_check.cross_world_mr_firewall.checked[]` regardless of overlap (the proof-of-check audit trail remains intact); the only change is which MCP call retrieves the M records.
6. Not applicable — no output schema (proposal card frontmatter, batch manifest) is extended. The change is purely on the retrieval-tool surface used INSIDE Phase 11a.
7. The change replaces one MCP call family with the canonical firewall projection; no tool symbol is renamed or removed. Blast radius scan: `rg -n "search_nodes.*status:" .claude/skills` returns one owned hit (the broken Phase 11a line in `propose-new-worlds-from-preferences`). `propose-new-characters` Phase 10b uses `search_nodes(node_type='mystery_record')` without a status filter; reassessment confirmed that this is also stale for `search_nodes`, so this ticket upgrades the two named `propose-new-characters` surfaces to `get_firewall_content`.
8. Adjacent contradiction surfaced during reassessment: `propose-new-worlds-from-preferences` World-State Prerequisites also references `mcp__worldloom__search_nodes(node_type='mystery_record', filters={world_slug: <slug>})`; updating it for consistency with the Phase 11a fix is a required consequence of this ticket and lives in §Files to Touch.
9. Separate adjacent cleanup: sibling skills outside this ticket's named write set still contain live-guidance examples of `search_nodes(node_type='mystery_record')` despite already documenting `get_firewall_content`. That broader sibling cleanup is tracked in `tickets/SKILLMRFW-002-sibling-mystery-node-type-alias-cleanup.md`; this ticket does not absorb it.

## Architecture Check

1. Replacing the broken `search_nodes` call with `get_firewall_content` brings `propose-new-worlds-from-preferences` into alignment with the four sibling canon-reading skills that already document the correct pattern. The alternative (extending `search_nodes` to support a `status` filter) duplicates `get_firewall_content`'s surface and creates two valid paths for the same operation; cascade scope at audit phase already established that the firewall-content tool is the canonical path.
2. No backwards-compatibility shims — the broken call is replaced cleanly. No deprecation needed because the broken call was never functional; no operator could have built dependent code on it.

## Verification Layers

1. The Phase 11a text references `get_firewall_content` (not `search_nodes` with `status` filter) -> codebase grep-proof: `rg -n "search_nodes.*status:|get_firewall_content" .claude/skills/propose-new-worlds-from-preferences/SKILL.md` returns `get_firewall_content` hits and zero invalid status-filter hits.
2. The World-State Prerequisites M-record retrieval text references `get_firewall_content` (with `get_record` per M-id as fallback) → grep-proof: same pattern as above for line 132.
3. Phase 11a does not direct operators to Bash for-loops or per-M `get_record` retrieval except as full-record fallback -> manual review of `.claude/skills/propose-new-worlds-from-preferences/SKILL.md` Phase 11a.
4. The cross-world MR firewall remains an unconditional check that records every checked M-id regardless of overlap (Rule 7 audit-trail invariant) -> FOUNDATIONS alignment check against `docs/FOUNDATIONS.md` Rule 7 plus manual review of the unchanged `canon_safety_check.cross_world_mr_firewall.checked[]` sentence.

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

In `.claude/skills/propose-new-characters/SKILL.md` Phase 10b (line 94) and `.claude/skills/propose-new-characters/references/phase-10-canon-safety-check.md` line 23, add the same "Bulk firewall retrieval: prefer `mcp__worldloom__get_firewall_content(world_slug)`" preamble that the four sibling skills already use. The current `search_nodes(node_type='mystery_record')` call is stale for `search_nodes`; replacing it brings `propose-new-characters` into alignment with the canonical firewall projection path.

## Files to Touch

- `.claude/skills/propose-new-worlds-from-preferences/SKILL.md` (modify — Phase 11a line 253 area + World-State Prerequisites line 132 area)
- `.claude/skills/propose-new-characters/SKILL.md` (modify — Phase 10b line 94 area)
- `.claude/skills/propose-new-characters/references/phase-10-canon-safety-check.md` (modify — line 23 area)
- `tickets/SKILLMRFW-001-cross-world-firewall-tool-correction.md` (modify — reassessment and closeout truthing)
- `tickets/SKILLMRFW-002-sibling-mystery-node-type-alias-cleanup.md` (new — follow-up for adjacent sibling stale examples)

## Out of Scope

- Extending `search_nodes` to support a `status` filter. `get_firewall_content` already covers the bulk-firewall use case; adding a duplicative path on `search_nodes` increases the API surface without adding capability.
- Fixing every remaining sibling `search_nodes(node_type='mystery_record')` example. SKILLMRFW-001 owns `propose-new-worlds-from-preferences` and the named `propose-new-characters` consistency edits; broader sibling cleanup is tracked by `tickets/SKILLMRFW-002-sibling-mystery-node-type-alias-cleanup.md`.
- Any change to the firewall-recording invariant (every checked M-id in `cross_world_mr_firewall.checked[]` regardless of overlap). The audit-trail proof-of-check discipline is preserved verbatim.

## Acceptance Criteria

### Tests That Must Pass

1. `! rg -n "search_nodes.*status:" .claude/skills/propose-new-worlds-from-preferences/SKILL.md` passes after §Files to Touch §1 lands.
2. `rg -n "get_firewall_content" .claude/skills/propose-new-worlds-from-preferences/SKILL.md` returns at least two hits (Phase 11a + World-State Prerequisites).
3. `rg -n "get_firewall_content" .claude/skills/propose-new-characters/SKILL.md .claude/skills/propose-new-characters/references/phase-10-canon-safety-check.md` returns at least one hit per file after §Files to Touch §3 lands.
4. Manual review confirms Phase 11a names `get_firewall_content` calls — NOT Bash for-loops or per-M `get_record` retrieval except as documented fallback for full M-record context.

### Invariants

1. Cross-world Mystery Reserve firewall remains unconditional: every checked M-id is recorded in `canon_safety_check.cross_world_mr_firewall.checked[]` regardless of overlap (Rule 7 audit-trail proof-of-check).
2. Empty Worlds Path skip behavior is unchanged: when `worlds/` is empty, the firewall is skipped with `cross_world_mr_firewall.skipped: true` + reason `no_existing_worlds`.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage (the four sibling skills' Phase X canon-safety-check files already exercise the `get_firewall_content` pattern under their own dry-runs) is named in Assumption Reassessment §2.

### Commands

1. `rg -n "search_nodes.*status:|get_firewall_content" .claude/skills/propose-new-worlds-from-preferences/SKILL.md` — confirms the replacement landed.
2. `rg -n "get_firewall_content" .claude/skills/propose-new-worlds-from-preferences .claude/skills/propose-new-characters .claude/skills/character-generation .claude/skills/propose-new-canon-facts .claude/skills/canon-facts-from-diegetic-artifacts .claude/skills/diegetic-artifact-generation` — confirms cross-skill consistency: all six canon-reading skills now reference the canonical bulk-firewall tool.
3. Manual review of `.claude/skills/propose-new-worlds-from-preferences/SKILL.md` Phase 11a — confirms the skill routes the firewall projection through `get_firewall_content` and preserves the Empty Worlds Path skip clause. (Narrow proof boundary: the ticket is skill-prose-only, and invoking the full content-generation skill is not necessary to prove the corrected documented retrieval path.)

## Outcome

Completed 2026-04-28. `propose-new-worlds-from-preferences` now routes the World-State Prerequisites full-M firewall projection and Phase 11a forbidden-M audit through `mcp__worldloom__get_firewall_content(world_slug)`, with `get_record('M-NNNN')` reserved for full-record context. `propose-new-characters` now names the same bulk firewall projection in its prerequisites, Phase 10 overview, and Phase 10b reference.

The ticket was truth-corrected during reassessment: the live issue is not only an unsupported `status` filter but also stale `mystery_record` wording on the `search_nodes` path. Broader sibling cleanup is tracked in `tickets/SKILLMRFW-002-sibling-mystery-node-type-alias-cleanup.md`.

## Verification Result

1. `rg -n "search_nodes.*status:" .claude/skills/propose-new-worlds-from-preferences/SKILL.md` — no hits (exit 1 as expected for negative grep).
2. `rg -n "get_firewall_content" .claude/skills/propose-new-worlds-from-preferences/SKILL.md` — two hits: World-State Prerequisites and Phase 11a.
3. `rg -n "get_firewall_content" .claude/skills/propose-new-characters/SKILL.md .claude/skills/propose-new-characters/references/phase-10-canon-safety-check.md` — hits in both files.
4. `rg -n "get_firewall_content" .claude/skills/propose-new-worlds-from-preferences .claude/skills/propose-new-characters .claude/skills/character-generation .claude/skills/propose-new-canon-facts .claude/skills/canon-facts-from-diegetic-artifacts .claude/skills/diegetic-artifact-generation` — all six canon-reading skill families now have at least one canonical bulk-firewall reference.
5. Manual review of `.claude/skills/propose-new-worlds-from-preferences/SKILL.md` Phase 11a — preserves the checked-id audit trail and Empty Worlds Path skip clause while removing the invalid `search_nodes` status-filter example.

## Deviations

- The drafted operator dry-run was narrowed to grep-proof plus manual review. This is a skill-prose-only ticket; invoking the full content-generation skill would not add stronger proof for the corrected documented retrieval path.
- Reassessment exposed broader sibling `search_nodes(node_type='mystery_record')` drift outside this ticket's named write set. That work was not absorbed; follow-up `tickets/SKILLMRFW-002-sibling-mystery-node-type-alias-cleanup.md` was created.
