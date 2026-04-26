# SPEC17AUDTRARET-002: Endorse documented context-packet + targeted-retrieval pattern in FOUNDATIONS and docs

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — documentation-only changes to `docs/FOUNDATIONS.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, `specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md`, and `specs/IMPLEMENTATION-ORDER.md`. No code change.
**Deps**: `archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md` (SPEC-16 §C3 + §C5; verified archived at reassessment time — `mcp__worldloom__get_record_field` registered at `tools/world-mcp/src/tool-names.ts:5`)

## Problem

At intake, `mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget)` returned nodes with `body_preview` truncated at ~282 chars; full bodies were retrieved via follow-up `mcp__worldloom__get_record(record_id)` or `mcp__worldloom__get_record_field(record_id, field_path)` calls. Live evidence: the 2026-04-26 PR-0015 packet at 16000-token budget covered 132 nodes but every node body was truncated; reasoning required ~7 follow-up `get_record` calls for the load-bearing CFs/SECs.

Before this ticket, `docs/FOUNDATIONS.md` §Tooling Recommendation (lines 426-438 at intake) read as if full content was delivered in one call: *"They should always receive: current World Kernel, current Invariants, relevant canon fact records, affected domain files, unresolved contradictions list, mystery reserve entries..."* The plain reading was "agents receive content, not pointers to content." The actual operational pattern is INDEX (packet) + targeted retrieval (`get_record` / `get_record_field`).

SPEC-16 §C3 (`get_record_field`) and §C5 (per-task-type packet defaults + retry-hint) made the index + follow-up pattern ergonomic enough to codify in FOUNDATIONS prose explicitly. Track C2 closes the prose-vs-behavior gap with a single-sentence amendment to §Tooling Recommendation plus a cross-reference to a new §Index + Follow-Up Retrieval Pattern subsection in `docs/CONTEXT-PACKET-CONTRACT.md`, plus parallel cross-references in the world-mcp README and MACHINE-FACING-LAYER.md.

## Assumption Reassessment (2026-04-26)

1. Verified `mcp__worldloom__get_record_field` registered: `tools/world-mcp/src/tool-names.ts:5` defines `get_record_field: "mcp__worldloom__get_record_field"`; the FOUNDATIONS amendment cross-references this tool, so the tool MUST exist when the prose lands. Verified `tools/world-mcp/README.md` documents `get_record_field` as "returns a single field from a parsed record without loading the full body." Verified `docs/MACHINE-FACING-LAYER.md` already listed `get_record_field` in its §Retrieval Tool Scope table with usage note "A single field of a parsed atomic record. Use when the field is small and the record body is large, such as `touched_by_cf` on a large SEC record." Verified `docs/CONTEXT-PACKET-CONTRACT.md` existed with 6 layer-semantic H3 sections (`task_header` + 5 content layers `local_authority` / `exact_record_links` / `scoped_local_context` / `governing_world_context` / `impact_surfaces`) and no §Index + Follow-Up Retrieval Pattern subsection before this ticket; this ticket adds that subsection.
2. Verified SPEC-16 archived: `archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md` exists. SPEC-16 archival is the prerequisite for Track C2 per SPEC-17 §Approach Track C2 Rationale — the FOUNDATIONS amendment ASSUMES the index + follow-up pattern is ergonomic, and that ergonomic claim depends on SPEC-16's C3 + C5 landing first. If SPEC-16's archival is reversed before this ticket is implemented, defer the FOUNDATIONS edit.
3. Cross-skill / cross-artifact boundary under audit: the four-document docs surface (FOUNDATIONS, CONTEXT-PACKET-CONTRACT, world-mcp README, MACHINE-FACING-LAYER) describes the same retrieval pattern at four abstraction levels — FOUNDATIONS is the principle-level contract; CONTEXT-PACKET-CONTRACT is the operational-pattern doc; world-mcp README is the tool inventory; MACHINE-FACING-LAYER is the architectural overview. The amendments must land coherently — FOUNDATIONS cites the pattern with cross-reference to CONTEXT-PACKET-CONTRACT; CONTEXT-PACKET-CONTRACT names the pattern explicitly; world-mcp README cross-references CONTEXT-PACKET-CONTRACT; MACHINE-FACING-LAYER notes recommended composition. No skill files are touched.
4. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation IS the surface being amended. The principle text (lines 428-438 at reassessment time) currently reads as if full content is delivered; the amendment preserves "non-negotiable" framing and explicitly endorses the documented context-packet + targeted-retrieval pattern as the documented mechanism. The amendment is additive — no clause is removed; the new clauses are interleaved into the existing prose so the principle's intent (LLM agents must receive the canonical world-state set) is preserved.
5. HARD-GATE / canon-write-ordering / Canon Safety Check surfaces: NOT affected. Track C2 is documentation-only. The `get_context_packet`, `get_record`, and `get_record_field` tools are existing read-only retrieval surfaces; their behavior is unchanged. No canon-mutating skill HARD-GATE block is touched. No Mystery Reserve firewall logic is touched.
6. Output schema extension status: NEITHER schema is extended. The context packet's existing 5-content-layer shape (per CONTEXT-PACKET-CONTRACT.md §Packet Shape) is unchanged. The `get_record` and `get_record_field` tool input/output shapes (per `tools/world-mcp/README.md`) are unchanged. The amendment names the existing pattern; it does NOT restructure any output schema.
7. Same-seam spec/status truthing: the explicit SPEC-17 reference used the correct Track C2 prose but its implementation-order line named the ticket as `SPEC17AUDRET-002` instead of the live `tickets/SPEC17AUDTRARET-002.md`; corrected that typo in `specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md`. `specs/IMPLEMENTATION-ORDER.md` still described C2 as pending after the docs landed, so it was updated to record C2 as completed in-place pending any later archival pass.

## Architecture Check

1. **Option C** (codify the index + follow-up pattern in FOUNDATIONS prose) is cleaner than the alternatives enumerated in SPEC-17 §Approach Track C2 Rationale. **Option A** (full bodies in packet) hits context-window limits — live observation at 16K budget already required subagent extraction; bumping default packet size to 50–80KB per typical canon-addition run pushes single-response packets above comfortable model-context budgets, and streaming or budget-driven truncation discipline at the MCP boundary is non-trivial engineering not warranted by current pain. **Option B** (`richness: 'index' | 'full'` parameter) shifts the choice to skill authors but doesn't relieve FOUNDATIONS pressure — the prose still reads as if full content is delivered; the parameter just lets callers ask. **Option C** codifies what works: the documented context-packet + targeted-retrieval pattern is what the pipeline actually does, what canon-addition's retrieval-tool tree already endorses (post-SPEC-15), and what `docs/CONTEXT-PACKET-CONTRACT.md` already describes operationally. The FOUNDATIONS prose update closes the prose-vs-behavior gap with a single-sentence amendment plus a cross-reference.
2. No backwards-compatibility aliasing/shims introduced. Pure-additive prose. Existing skills using the index + follow-up pattern (e.g., canon-addition post-SPEC-15) need no edits. Skills that have not yet adopted the pattern continue to work; FOUNDATIONS now explicitly endorses what they already do.

## Verification Layers

1. FOUNDATIONS amendment landed → codebase grep-proof: `grep -nE "should always receive .*documented context-packet \+ targeted-retrieval pattern|mcp__worldloom__get_record_field" docs/FOUNDATIONS.md` returns the amended receive clause and the targeted retrieval reference inside the "completeness guarantees" sentence.
2. CONTEXT-PACKET-CONTRACT new subsection landed → codebase grep-proof: `grep -n "Index + Follow-Up Retrieval Pattern" docs/CONTEXT-PACKET-CONTRACT.md` returns ≥1 match for the H2 header AND ≥1 match for the body prose containing "five content layers".
3. world-mcp README cross-reference landed → codebase grep-proof: `grep -n "Index + Follow-Up Retrieval Pattern" tools/world-mcp/README.md` returns ≥1 match in the `get_context_packet` documentation block.
4. MACHINE-FACING-LAYER recommended composition note landed → codebase grep-proof: `grep -n "Recommended composition" docs/MACHINE-FACING-LAYER.md` returns ≥1 match under §Retrieval Tool Scope.
5. SPEC-16 prerequisite re-verification at implementation time → codebase grep-proof + path check: `test -f archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md` AND `grep -n "get_record_field" tools/world-mcp/src/tool-names.ts` both succeed BEFORE the FOUNDATIONS edit is applied. If either fails, defer the FOUNDATIONS edit and flag.

## What to Change

### 1. Amend FOUNDATIONS.md §Tooling Recommendation

In `docs/FOUNDATIONS.md` §Tooling Recommendation (currently lines 426-438), apply the prose amendment per SPEC-17 Track C2 Deliverables. The full amended block reads:

```
LLM agents should never operate on prose alone.

They should always receive — directly **or via the documented context-packet + targeted-retrieval pattern** —:
- current World Kernel
- current Invariants
- relevant canon fact records
- affected domain files
- unresolved contradictions list
- mystery reserve entries touching the same domain

This is non-negotiable. The context-packet API (`mcp__worldloom__get_context_packet`) is the machine-facing mechanism for delivering this set with completeness guarantees, **complemented by targeted per-record retrieval (`mcp__worldloom__get_record`, `mcp__worldloom__get_record_field`) for full bodies of the load-bearing nodes the packet identifies; see [docs/CONTEXT-PACKET-CONTRACT.md](/home/joeloverbeck/projects/worldloom/docs/CONTEXT-PACKET-CONTRACT.md) for the documented pattern**, but those guarantees only hold when the underlying authoring surfaces are explicit and truthful as well (for example: canonical entity declarations and scoped-reference blocks on authority-bearing records); raw file reads alone cannot enforce the contract.
```

The two delta sites (the inserted clauses are bolded above) are: (i) after "They should always receive" — insert "— directly **or via the documented context-packet + targeted-retrieval pattern** —:"; (ii) inside the "completeness guarantees" sentence — insert "**complemented by targeted per-record retrieval (`mcp__worldloom__get_record`, `mcp__worldloom__get_record_field`) for full bodies of the load-bearing nodes the packet identifies; see [docs/CONTEXT-PACKET-CONTRACT.md](/home/joeloverbeck/projects/worldloom/docs/CONTEXT-PACKET-CONTRACT.md) for the documented pattern**". Preserve the "non-negotiable" framing and the closing clause about authoring surfaces.

**Pre-flight check before applying this change**: verify (a) `archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md` exists, AND (b) `mcp__worldloom__get_record_field` is registered in `tools/world-mcp/src/tool-names.ts`. Both verified at ticket-draft time (2026-04-26). Re-confirm at implementation time.

### 2. Append §Index + Follow-Up Retrieval Pattern to CONTEXT-PACKET-CONTRACT.md

In `docs/CONTEXT-PACKET-CONTRACT.md`, add a new H2 section `## Index + Follow-Up Retrieval Pattern` placed after the existing `## Assembly Discipline` section and before the existing `## Example Roles` section. Body prose:

> The context packet's five content layers (`local_authority` through `impact_surfaces`; `task_header` is metadata) deliver an INDEX of locality-relevant nodes plus body-preview snippets sufficient for ranking and citation, not the full bodies of every node. Skills that need the full body of a load-bearing node retrieve it via `mcp__worldloom__get_record(record_id)`; skills that need a single field of a large record retrieve it via `mcp__worldloom__get_record_field(record_id, field_path)`. This pattern keeps single-response packet sizes within model-context budgets while preserving FOUNDATIONS §Tooling Recommendation completeness guarantees: the packet identifies WHAT must be retrieved; targeted retrieval delivers the content.

### 3. Add cross-reference in tools/world-mcp/README.md

Under the `get_context_packet` documentation block in `tools/world-mcp/README.md` §Tools (currently around line 17), add a one-sentence cross-reference: "See `docs/CONTEXT-PACKET-CONTRACT.md` §Index + Follow-Up Retrieval Pattern for the documented retrieval pattern that complements packet assembly."

### 4. Add Recommended composition note in MACHINE-FACING-LAYER.md

In `docs/MACHINE-FACING-LAYER.md` under the existing `## Retrieval Tool Scope` subsection (line 58 at reassessment time; added by SPEC-15 Track B3), add a "Recommended composition" note after the §Retrieval Tool Scope table. Body prose:

> **Recommended composition**: packet first (locality survey via `get_context_packet`), then `get_record` / `get_record_field` for full bodies of load-bearing nodes the packet cites. See `docs/CONTEXT-PACKET-CONTRACT.md` §Index + Follow-Up Retrieval Pattern.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)
- `tools/world-mcp/README.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)
- `specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md` (modify — same-seam ticket-id/status truthing)
- `specs/IMPLEMENTATION-ORDER.md` (modify — same-seam status truthing)

## Out of Scope

- Full bodies in context packet (Track C2 Option A — rejected per SPEC-17 §Approach Track C2 Rationale; context-window pressure observed at 16K budget against animalia).
- `richness: 'index' | 'full'` parameter on `get_context_packet` (Track C2 Option B — rejected; doesn't relieve FOUNDATIONS prose pressure).
- Engine code change to `get_context_packet`, `get_record`, `get_record_field`, or any other MCP retrieval tool. The packet API is unchanged; the amendment codifies existing behavior.
- Skill-side changes to `canon-addition`, `character-generation`, `diegetic-artifact-generation`, `continuity-audit`, etc. The retrieval-tool tree (post-SPEC-15) already endorses the index + follow-up pattern; no skill prose updates are required.
- Any change to the context packet's 5-content-layer shape, the `task_header` metadata, or the assembly discipline (locality-first ordering, structured insufficiency code).
- Track C1 deliverables (notes-paragraph deprecation across 5 surfaces); covered by `archive/tickets/SPEC17AUDTRARET-001.md`.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "should always receive .*documented context-packet \+ targeted-retrieval pattern|mcp__worldloom__get_record_field" docs/FOUNDATIONS.md` returns the amended receive clause and the `mcp__worldloom__get_record_field` reference.
2. `grep -n "Index + Follow-Up Retrieval Pattern" docs/CONTEXT-PACKET-CONTRACT.md` returns ≥1 match (the new H2 header).
3. `grep -n "five content layers" docs/CONTEXT-PACKET-CONTRACT.md` returns ≥1 match (body prose disambiguating from the 6-key packet shape).
4. `grep -n "Index + Follow-Up Retrieval Pattern" tools/world-mcp/README.md` returns ≥1 match (cross-reference in `get_context_packet` documentation).
5. `grep -n "Recommended composition" docs/MACHINE-FACING-LAYER.md` returns ≥1 match (note under §Retrieval Tool Scope).
6. `grep -n "Index + Follow-Up Retrieval Pattern" docs/MACHINE-FACING-LAYER.md` returns ≥1 match (cross-reference in the Recommended composition note).
7. SPEC-16 prerequisite check at ticket-open: `test -f archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md && grep -n "get_record_field" tools/world-mcp/src/tool-names.ts` both succeed.

### Invariants

1. FOUNDATIONS §Tooling Recommendation preserves the "non-negotiable" framing — the amendment adds a documented mechanism, not an exception clause. The bullet list of required content (World Kernel, Invariants, CF records, domain files, contradictions, MR entries) is preserved verbatim.
2. The context packet's 5-content-layer shape is unchanged; the new §Index + Follow-Up Retrieval Pattern subsection names the existing pattern, it does NOT restructure the packet.
3. No engine code (`get_context_packet`, `get_record`, `get_record_field`) is modified; tool input/output shapes are preserved.
4. The Mystery Reserve firewall is unaffected — this ticket's docs surface does not touch MR semantics.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "should always receive .*documented context-packet \+ targeted-retrieval pattern|mcp__worldloom__get_record_field" docs/FOUNDATIONS.md` — FOUNDATIONS amendment verification (must show the amended receive clause and the `get_record_field` reference).
2. `grep -nE "Index \+ Follow-Up Retrieval Pattern|Recommended composition|five content layers" docs/CONTEXT-PACKET-CONTRACT.md docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md` — cross-document landing verification across the three non-FOUNDATIONS surfaces.
3. `test -f archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md && grep -n "get_record_field" tools/world-mcp/src/tool-names.ts && echo "SPEC-16 prerequisite OK"` — SPEC-16 prerequisite re-verification at ticket-open time.

## Outcome

Completion date: 2026-04-26.

Completed. FOUNDATIONS §Tooling Recommendation now explicitly endorses direct receipt or the documented context-packet + targeted-retrieval pattern, while preserving the non-negotiable required-content list. `docs/CONTEXT-PACKET-CONTRACT.md` now names the Index + Follow-Up Retrieval Pattern, `tools/world-mcp/README.md` cross-references it from `get_context_packet`, and `docs/MACHINE-FACING-LAYER.md` records the recommended packet-first / targeted-retrieval composition. SPEC-17 and `specs/IMPLEMENTATION-ORDER.md` were truth-updated for the live ticket id and completed C2 status.

## Verification Result

1. `test -f archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md && grep -n "get_record_field" tools/world-mcp/src/tool-names.ts && echo "SPEC-16 prerequisite OK"` — passed; SPEC-16 archived and `get_record_field` registered.
2. `grep -nE "should always receive .*documented context-packet \+ targeted-retrieval pattern|mcp__worldloom__get_record_field" docs/FOUNDATIONS.md` — passed; FOUNDATIONS includes the amended receive clause and `get_record_field` targeted-retrieval reference.
3. `grep -nE "Index \+ Follow-Up Retrieval Pattern|Recommended composition|five content layers" docs/CONTEXT-PACKET-CONTRACT.md docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md` — passed; the subsection, recommended composition note, and README cross-reference are present.
4. `rg -n "SPEC17AUDRET-002|C2 remains pending|One FOUNDATIONS amendment remains required|To be recorded after the two tickets complete|Expected post-completion state|archived spec and tickets at completion" specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md specs/IMPLEMENTATION-ORDER.md` — passed with no matches after closeout.
5. `git diff --check` — passed.

## Deviations

The drafted `grep -A3 "should always receive" docs/FOUNDATIONS.md` proof was replaced with a stronger `grep -nE` proof because the `get_record_field` reference lands after the bullet list and cannot truthfully appear within three lines of the receive clause. Same-seam spec/status truthing added `specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md` and `specs/IMPLEMENTATION-ORDER.md` to the touched file set; no code, engine behavior, schema, HARD-GATE, or Mystery Reserve firewall surface changed.
