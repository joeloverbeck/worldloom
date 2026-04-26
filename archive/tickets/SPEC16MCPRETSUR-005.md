# SPEC16MCPRETSUR-005: Cross-track skill-side documentation

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — updated `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, `.claude/skills/canon-addition/references/retrieval-tool-tree.md`, `archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md`, and `specs/IMPLEMENTATION-ORDER.md` to document the four new MCP retrieval surfaces and close out the spec status. No code change.
**Deps**: archive/tickets/SPEC16MCPRETSUR-001.md, archive/tickets/SPEC16MCPRETSUR-002.md, archive/tickets/SPEC16MCPRETSUR-003.md, archive/tickets/SPEC16MCPRETSUR-004.md

## Problem

The four post-pilot MCP refinements (`get_record_field`, `get_record_schema`, per-task-type packet defaults + `retry_with`, `search_nodes` exhaustive mode) need consistent documentation across three surfaces so consumers can discover and reach for them: the world-mcp package README (operator-facing tool catalog), the project-level machine-facing docs (architectural overview), and the canon-addition retrieval-tool tree (skill-author-facing decision guide). Splitting docs across the four implementation tickets would force premature edits (the README §Tools count update can only be 13→15 after BOTH C3 and C4 land); consolidating in a single ticket lets the docs land atomically once all four surfaces exist.

## Assumption Reassessment (2026-04-26)

1. At intake, `tools/world-mcp/README.md` existed and still documented 13 tools even though `tools/world-mcp/src/tool-names.ts` now exposes 15 entries in `MCP_TOOL_ORDER` after archived `SPEC16MCPRETSUR-001` and `SPEC16MCPRETSUR-002`. Corrected the README status line and tool inventory to the live 15-tool registry.
2. `docs/MACHINE-FACING-LAYER.md` §Retrieval Tool Scope existed as a `| Tool | Reads |` table and still lacked rows for `get_record_field` and `get_record_schema`; its `search_nodes`, `get_context_packet`, and `find_named_entities` rows also lacked the new C5/C6 behavior. Corrected the table in place.
3. `.claude/skills/canon-addition/references/retrieval-tool-tree.md` existed and the referenced phase headings resolved: `## Phase 0-2: Normalize, Scope, Invariants`, `## Escalation Gate / Phase 6b`, and `## Phase 12a: Modification-History Axis-C Judgment`. It still carried the pre-C3 workaround of dispatching a read-only subagent for large raw-record field extraction; replaced that with `get_record_field`.
4. Cross-skill boundary: this ticket modifies a skill-internal reference file (`.claude/skills/canon-addition/references/retrieval-tool-tree.md`) without changing the skill's SKILL.md or HARD-GATE semantics. The reference file is consumed by the canon-addition skill at runtime (loaded via Read), so the edits are immediately effective for the next canon-addition invocation. No sibling-skill cascade required — `retrieval-tool-tree.md` is canon-addition-specific (no other skill references the same file).
5. The live code surface already had the four SPEC-16 refinements: `get_record_field`, `get_record_schema`, `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE` plus `retry_with`, and `search_nodes(exhaustive: true)` with `match_locations`. This ticket is therefore docs-only / cross-artifact contract truthing, not tool implementation.
6. Package ignored state was pre-existing before this docs pass: `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/` were already ignored artifacts. This ticket did not run package build/test commands or create new generated package state.
7. Because this is the final SPEC-16 ticket and the user supplied `specs/SPEC-16*` as the reference authority, same-seam spec/status truthing is owned fallout: `archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md` no longer says the outcome is future-only, and `specs/IMPLEMENTATION-ORDER.md` now records SPEC-16 as implemented and archived.

## Architecture Check

1. Atomic docs landing — after the four code tickets landed, the README Status line (13→15), the MACHINE-FACING-LAYER §Retrieval Tool Scope rows, and the retrieval-tool-tree phase guidance updated together. A reader who learns about `get_record_field` from the README finds the same tool documented at the architectural and skill-decision layers without staleness.
2. Per-tool documentation co-located in the README §Tools section follows the existing list format (line per tool); no structural change to the README beyond the count update.
3. The retrieval-tool-tree updates target the phases where each tool is most useful: Phase 0 for schema discovery (one-time pre-flight), Phase 6b for the Rule-6 audit-trail scan (the strongest motivating use case for exhaustive search), Phase 12a for `touched_by_cf` inspection on large SEC records (the strongest motivating use case for `get_record_field`).
4. No backwards-compatibility shims. Documentation-only ticket.

## Verification Layers

1. README §Tools coverage → codebase grep-proof: `grep -E "get_record_field|get_record_schema|exhaustive|DEFAULT_TOKEN_BUDGET|retry_with" tools/world-mcp/README.md` returns matches for each new surface.
2. README Status line → codebase grep-proof: `grep -n "registers 15 tools" tools/world-mcp/README.md` returns one match; `grep -n "registers 13 tools" tools/world-mcp/README.md` returns zero matches.
3. MACHINE-FACING-LAYER §Retrieval Tool Scope coverage → codebase grep-proof: `grep -E "get_record_field|get_record_schema|exhaustive" docs/MACHINE-FACING-LAYER.md` returns matches.
4. Retrieval-tool-tree phase coverage → codebase grep-proof: `grep -E "get_record_schema|get_record_field|exhaustive: true" .claude/skills/canon-addition/references/retrieval-tool-tree.md` returns matches in the Phase 0, Phase 12a, and Phase 6b sections respectively.
5. SPEC-16 status truthing → codebase grep-proof: `grep -E "Completed and archived|SPEC-16 MCP Retrieval-Surface Refinements \\|.*archived|SPEC16MCPRETSUR-005" archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md specs/IMPLEMENTATION-ORDER.md` returns matches.

## What to Change

### 1. `tools/world-mcp/README.md`

- Status line at line 7: change "registers 13 tools" → "registers 15 tools".
- §Tools list: add the two new tools and update the two changed existing tools in order matching `MCP_TOOL_ORDER`:
  - `mcp__worldloom__get_record_field(record_id, field_path, world_slug?)` — returns a single field of a parsed record without the full body. Example invocations: `get_record_field("SEC-ELF-001", ["touched_by_cf"])` for the CF list; `get_record_field("CF-0042", ["extensions", 0, "body"])` for the first extension's body. Numeric path segments are array indices when the parent is an array; string segments are object keys.
  - `mcp__worldloom__get_record_schema(node_type)` — returns the JSON Schema for a record class (`canon_fact_record`, `change_log_entry`, `invariant`, `mystery_reserve_entry`, `open_question_entry`, `named_entity`, `section`, `character_record`, `diegetic_artifact_record`, `adjudication_record`). Response includes `schema`, `source_path`, and `referenced_schemas` (a map of transitively-referenced schemas keyed by `$id` URL — currently `extension-entry` for several record schemas that expose `extensions[]`).
  - Update the existing `mcp__worldloom__get_context_packet` bullet to note the per-`task_type` default table (`canon_addition: 16000`; all others 8000) and the `retry_with: { token_budget }` field on `packet_incomplete_required_classes` errors (single round-trip retry).
  - Update the existing `mcp__worldloom__search_nodes` bullet to note the `exhaustive?: boolean` parameter (default `false` preserves capped+ranked behavior; `true` skips cap, sorts by `node_id`, populates `match_locations: ('body' | 'heading_path' | 'summary')[]` per row).

### 2. `docs/MACHINE-FACING-LAYER.md` §Retrieval Tool Scope

- Extend the existing `| Tool | Reads |` table with the new tools and update changed existing-tool rows:
  - `get_record_field` row — "A single field of a parsed atomic record. Use when the field is small and the record body is large (e.g., `touched_by_cf` on a large SEC). Reuses `get_record`'s resolution path."
  - `get_record_schema` row — "JSON Schema for a record class plus transitively-referenced schemas. Use to discover field constraints (regex patterns, enum values, optional/required) before authoring a record draft."
  - Update the existing `search_nodes` row to mention the `exhaustive: true` mode for Rule-6 audit-trail scans (presence/absence confirmation across prose bodies; deterministic node-id ordering; `match_locations[]` per row).
  - Update the existing `get_context_packet` row to mention the per-task-type default table and the `retry_with` retry hint.

### 3. `.claude/skills/canon-addition/references/retrieval-tool-tree.md`

- §Phase 0-2 (around line 11): add a bullet recommending `mcp__worldloom__get_record_schema(<node_type>)` as a one-time discovery call when the agent is unfamiliar with a record class — surfaces field regex patterns (e.g., `pre_figured_by` constraint that bit the 2026-04-26 PR-0015 run).
- §Escalation Gate / Phase 6b (around line 23): swap the recommendation from "trust proposal self-claim" / "open file directly" to "call `mcp__worldloom__search_nodes(query, exhaustive: true)` to confirm presence/absence in prose bodies." Cross-reference Rule 6 (No Silent Retcons).
- §Phase 12a (around line 27): add a bullet noting `mcp__worldloom__get_record_field(SEC-id, ["touched_by_cf"])` as the lightweight alternative to `mcp__worldloom__get_record(SEC-id)` when only the CF list is needed (avoids loading 50KB+ section bodies into context).

### 4. SPEC-16 status references

- `archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md`: replace the future `## Outcome` placeholder with the actual ticket-family closeout and archive status.
- `specs/IMPLEMENTATION-ORDER.md`: mark SPEC-16 implemented and unarchived, and keep SPEC-17 dependency wording truthful.

## Files to Touch

- `tools/world-mcp/README.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (modify)
- `archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md` (modify)
- `specs/IMPLEMENTATION-ORDER.md` (modify)

## Out of Scope

- New skill-side guidance for `character-generation`, `diegetic-artifact-generation`, or `continuity-audit` retrieval-tool trees. Those skills can adopt the new surfaces when their reference docs are next updated; the spec's §Cross-track deliverable explicitly names only canon-addition's tree.
- Updating sibling skill SKILL.md prose (no SKILL.md changes required by the spec).
- Adding new tool entries to `tools/world-mcp/CHANGELOG.md` or any release-notes surface (not part of the spec's deliverables).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -E "get_record_field|get_record_schema|exhaustive|DEFAULT_TOKEN_BUDGET|retry_with" tools/world-mcp/README.md` returns matches.
2. `grep -n "registers 15 tools" tools/world-mcp/README.md` returns one match; `grep -n "registers 13 tools" tools/world-mcp/README.md` returns zero matches.
3. `grep -E "get_record_field|get_record_schema|exhaustive" docs/MACHINE-FACING-LAYER.md` returns matches.
4. `grep -E "get_record_schema|get_record_field|exhaustive: true" .claude/skills/canon-addition/references/retrieval-tool-tree.md` returns matches in the Phase 0, Phase 12a, and Phase 6b sections respectively.
5. `grep -E "Completed and archived|SPEC-16 MCP Retrieval-Surface Refinements \\|.*archived|SPEC16MCPRETSUR-005" archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md specs/IMPLEMENTATION-ORDER.md` returns matches for the closeout/status updates.
6. Informal follow-up only: a subsequent canon-addition pilot should use at least one of the new surfaces successfully. This is not a gating criterion for this documentation ticket.

### Invariants

1. The README §Tools list reflects the actual tool registry — `MCP_TOOL_ORDER` from `src/tool-names.ts` and the README §Tools bullet count agree.
2. The MACHINE-FACING-LAYER §Retrieval Tool Scope table covers every tool the README §Tools list documents — no docs surface drifts from the README.
3. The retrieval-tool-tree phase guidance names the new tools at the phases where they are most operationally useful (Phase 0 for schema discovery, Phase 6b for exhaustive scan, Phase 12a for field-slice retrieval), not at unrelated phases.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. The grep-based acceptance commands above (run sequentially against the post-edit working tree).
2. Spot-read of the updated `retrieval-tool-tree.md` to confirm the phase-by-phase recommendations read coherently end-to-end.

## Outcome

Completed on 2026-04-26.
Outcome amended: 2026-04-26 after SPEC-16 spec archival.

The cross-track SPEC-16 documentation now matches the landed MCP retrieval surface:

1. `tools/world-mcp/README.md` now says the server registers 15 tools, documents `get_record_field`, `get_record_schema`, `get_context_packet` per-task defaults plus `retry_with`, and `search_nodes(exhaustive: true)` plus `match_locations`.
2. `docs/MACHINE-FACING-LAYER.md` now covers `get_record_field`, `get_record_schema`, exhaustive lexical scans, and context-packet retry hints in the retrieval tool scope table.
3. `.claude/skills/canon-addition/references/retrieval-tool-tree.md` now points canon-addition phases at `get_record_schema`, `get_record_field`, and `search_nodes(query, exhaustive: true)` instead of the old raw-field/subagent workaround.
4. `archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md` and `specs/IMPLEMENTATION-ORDER.md` now record SPEC-16 as implemented and archived.

## Verification Result

Passed:

1. `grep -E "get_record_field|get_record_schema|exhaustive|DEFAULT_TOKEN_BUDGET|retry_with" tools/world-mcp/README.md`
2. `grep -n "registers 15 tools" tools/world-mcp/README.md`
3. `grep -n "registers 13 tools" tools/world-mcp/README.md` returned no matches, as expected.
4. `grep -E "get_record_field|get_record_schema|exhaustive" docs/MACHINE-FACING-LAYER.md`
5. `grep -E "get_record_schema|get_record_field|exhaustive: true" .claude/skills/canon-addition/references/retrieval-tool-tree.md`
6. `grep -E "Completed and archived|SPEC-16 MCP Retrieval-Surface Refinements \\|.*archived|SPEC16MCPRETSUR-005" archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md specs/IMPLEMENTATION-ORDER.md`
7. `awk '/MCP_TOOL_ORDER/,/];/' tools/world-mcp/src/tool-names.ts | grep -c 'MCP_TOOL_NAMES\\.'` returned `15`.

Manual review:

1. Spot-read the updated canon-addition retrieval tree end-to-end. The new recommendations land in the intended phases and do not change HARD-GATE or write-path semantics.

Package ignored state:

1. Pre-existing ignored package artifacts remain: `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/`. This docs-only ticket did not create or refresh them.

## Deviations

1. No code, tests, or tool registration files were changed because the four MCP surfaces had already landed through archived `SPEC16MCPRETSUR-001` through `SPEC16MCPRETSUR-004`.
2. The drafted acceptance item about a subsequent canon-addition pilot remains informal follow-up evidence, not a gating proof for this documentation ticket.
