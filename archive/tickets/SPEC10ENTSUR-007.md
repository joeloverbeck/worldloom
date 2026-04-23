# SPEC10ENTSUR-007: Update SPEC-02 consumer contracts for new entity surface

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `specs/SPEC-02-retrieval-mcp-server.md` documentation update of three tool contracts (`find_named_entities`, `find_impacted_fragments`, `search_nodes.entity_name` filter) to match the three-surface split defined in SPEC-10.
**Deps**: `specs/SPEC-10-entity-surface-redesign.md`, `specs/SPEC-02-retrieval-mcp-server.md`, `specs/IMPLEMENTATION-ORDER.md`

## Problem

SPEC-02 specifies the MCP server tool surface that skills will consume for world retrieval. Three of its tool contracts (`find_named_entities`, `find_impacted_fragments`, and the `entity_name?` filter on `search_nodes`) describe behavior that predates SPEC-10's entity-surface redesign and would instruct a future implementer to build the deprecated contract:

- `specs/SPEC-02-retrieval-mcp-server.md:93-97` (`find_named_entities`) currently says "for each name, list of nodes mentioning it (grouped by `node_type`, sorted by mention strength)." SPEC-10 §D6 splits this into `canonical_matches` and `surface_matches` with explicit noncanonical labeling.
- `specs/SPEC-02-retrieval-mcp-server.md:87-91` (`find_impacted_fragments`) says "computed via `required_world_update` + `mentions_entity` edges." SPEC-10 §D6 pins the `mentions_entity` edge semantics (resolved-canonical-only) and requires any phrase-search fallback to be explicit and flagged `noncanonical_fallback`.
- `specs/SPEC-02-retrieval-mcp-server.md:65` (`search_nodes.filters.entity_name?`) gives no semantics for what `entity_name` matches against. SPEC-10 §D6 pins it to canonical-name-or-alias exact match (never unresolved surface text).

Without this update, SPEC-02 and SPEC-10 silently contradict each other — a Rule-6-at-pipeline-level risk (silent retcon across specs).

## Assumption Reassessment (2026-04-23)

1. `specs/SPEC-02-retrieval-mcp-server.md` still carried the pre-SPEC-10 contract at the live seam under `mcp__worldloom__search_nodes`, `mcp__worldloom__find_impacted_fragments`, and `mcp__worldloom__find_named_entities`; the ticket premise remained live at implementation time.
2. `specs/SPEC-10-entity-surface-redesign.md` Deliverable 6 is the authoritative source for the three contract updates: the canonical-vs-surface split for `find_named_entities`, canonical-only `mentions_entity` semantics plus explicit `noncanonical_fallback` wording for `find_impacted_fragments`, and canonical-name-or-alias-only semantics for `search_nodes.entity_name`.
3. Shared boundary under audit: the cross-spec contract between SPEC-10's entity-surface redesign and SPEC-02's MCP tool-surface description. This ticket remains prose-only; no runtime/tool implementation boundary is claimed.
4. `docs/FOUNDATIONS.md` Rule 6 No Silent Retcons is the governing principle for this ticket: leaving SPEC-02 on the deprecated entity contract would silently instruct future implementation work to diverge from the already-landed spec authority in SPEC-10.
5. `specs/IMPLEMENTATION-ORDER.md:41-47` still sequences SPEC-10 (Tier 1.5) before SPEC-02 (Tier 2), so updating SPEC-02's dependency line from `SPEC-01` to `SPEC-01, SPEC-10` is the truthful contract correction rather than a scope expansion.
6. No adjacent contradiction required follow-up. `specs/SPEC-06-skill-rewrite-patterns.md` references the affected tools only at the caller/workflow level, not with stale output-shape semantics, so no SPEC-06 edit was needed.

## Architecture Check

1. Updating SPEC-02 in place (rather than appending a SPEC-02 addendum or a third spec) is cleaner because SPEC-02 is pre-implementation — there is no landed-work retcon to preserve, only a forward-looking contract to align.
2. No backwards-compatibility aliasing: SPEC-02's prose takes the new shape directly, citing SPEC-10 §D6 as the authoritative source. No "legacy contract" retained for future implementer reference.

## Verification Layers

1. `search_nodes.entity_name`, `find_impacted_fragments`, and `find_named_entities` in SPEC-02 state the same normative contract as SPEC-10 Deliverable 6 for filter semantics, fallback labeling, and split precision-vs-recall output. -> codebase grep-proof plus side-by-side manual review of `specs/SPEC-02-retrieval-mcp-server.md` against `specs/SPEC-10-entity-surface-redesign.md`
2. SPEC-02's `Depends on:` line truthfully reflects the new contract authority boundary. -> codebase grep-proof on `specs/SPEC-02-retrieval-mcp-server.md`
3. SPEC-02's `## FOUNDATIONS Alignment` and `## Verification` sections remain non-contradictory after the contract update. -> manual review of the full SPEC-02 document

## What to Change

### 1. Revise `find_named_entities` subsection in SPEC-02

Replace the current **Output** line at `specs/SPEC-02-retrieval-mcp-server.md:96` with the new two-surface contract:

- **Output**: `{ canonical_matches, surface_matches }` where `canonical_matches` is exact canonical-name or alias matches grouped by entity then by mentioning node_type, and `surface_matches` is unresolved exact surface-text matches grouped by node_type and labeled `noncanonical`. Default sort order: canonical exact name, canonical exact alias, unresolved exact surface text. Cite SPEC-10 §D6 as the authoritative contract source.

### 2. Revise `find_impacted_fragments` subsection in SPEC-02

Extend the **Behavior** / **Output** description (around line 88-91) to say: "Computed exclusively via canonical `mentions_entity` edges (resolved-canonical-or-alias only per SPEC-10 §D5). If an implementation wants a phrase-search fallback, results carrying that fallback must be flagged `noncanonical_fallback` and must not share ranking weight with canonical entity links."

### 3. Revise `search_nodes.entity_name` filter semantics

At `specs/SPEC-02-retrieval-mcp-server.md:65` (the `filters: { world_slug?, node_type?, file_path?, entity_name? }` line), add a brief parenthetical or a followup subsection specifying: "`entity_name` matches against `entities.canonical_name` OR `entity_aliases.alias_text` exact match only (never `entity_mentions.surface_text` with `resolution_kind='unresolved'`). Callers that want to locate nodes by unresolved surface phrase should use `find_named_entities(names).surface_matches` instead. See SPEC-10 §D6."

### 4. Cross-link SPEC-10 from SPEC-02's Depends-on chain

If SPEC-02's front matter does not already list SPEC-10 as a dependency (reassessment showed SPEC-02's current Depends-on is `SPEC-01` only), add `SPEC-10` to the `Depends on:` line. Rationale: SPEC-02's entity-related tool contracts are now pinned by SPEC-10.

## Files to Touch

- `specs/SPEC-02-retrieval-mcp-server.md` (modify)

## Out of Scope

- Editing SPEC-10 (source of truth for this ticket's prose — reassessment already handled)
- Editing SPEC-06 (its `find_named_entities` references remain accurate at the caller level)
- Any code change whatsoever
- Implementing the tool surface changes in `tools/world-mcp/` — SPEC-02's implementation is a Phase 2 concern (see `specs/IMPLEMENTATION-ORDER.md:41-47`)

## Acceptance Criteria

### Tests That Must Pass

1. Documentation-only proof: `grep -n "canonical_matches\|surface_matches\|noncanonical_fallback\|SPEC-10" specs/SPEC-02-retrieval-mcp-server.md` returns the updated output/fallback/source lines.
2. `grep -n "entity_name" specs/SPEC-02-retrieval-mcp-server.md` returns the input line plus the immediately following canonical-or-alias-only semantics line.
3. Manual review confirms SPEC-02's `## FOUNDATIONS Alignment` and `## Verification` sections contain no residual contradiction with the updated entity-surface contract.

### Invariants

1. SPEC-02's tool contracts for entity-related behavior cite SPEC-10 as authoritative.
2. SPEC-10 remains unedited by this ticket; only SPEC-02 changes.
3. No code changes land in this ticket; only spec prose.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -n "canonical_matches\|surface_matches\|noncanonical_fallback\|SPEC-10" /home/joeloverbeck/projects/worldloom/specs/SPEC-02-retrieval-mcp-server.md`
2. `grep -n "entity_name" /home/joeloverbeck/projects/worldloom/specs/SPEC-02-retrieval-mcp-server.md`
3. Narrower command scope is correct: documentation-only ticket has no pipeline-level verification surface.

## Outcome

- **Completion date**: 2026-04-23
- **What changed**: Updated `specs/SPEC-02-retrieval-mcp-server.md` so its entity-sensitive MCP contracts now align with SPEC-10: `search_nodes.entity_name` is canonical-name-or-alias exact match only, `find_impacted_fragments` is canonical-edge-only with explicit `noncanonical_fallback` wording for any future phrase-search fallback, `find_named_entities` now exposes `{ canonical_matches, surface_matches }`, and SPEC-02 now declares `SPEC-10` in its dependency chain.
- **Deviations from original plan**: No scope change beyond factual closeout truthing. The implementation remained documentation-only and did not require SPEC-06 or runtime/tool edits.
- **Verification results**:
  1. Ran `grep -n "canonical_matches\|surface_matches\|noncanonical_fallback\|SPEC-10" /home/joeloverbeck/projects/worldloom/specs/SPEC-02-retrieval-mcp-server.md`
  2. Ran `grep -n "entity_name" /home/joeloverbeck/projects/worldloom/specs/SPEC-02-retrieval-mcp-server.md`
  3. Re-read the updated SPEC-02 entity-tool subsections plus its `## FOUNDATIONS Alignment` and `## Verification` sections against `specs/SPEC-10-entity-surface-redesign.md` Deliverable 6
