# SPEC46STOPIPMAC-005: Phase B cross-cutting docs (CONTEXT-PACKET-CONTRACT.md + describe-capabilities.ts)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `docs/CONTEXT-PACKET-CONTRACT.md` (story_bundle_context section update for the 7 new summaries + scope heuristic), `tools/world-mcp/src/tools/describe-capabilities.ts` (enumerate the 7 new summary fields)
**Deps**: SPEC46STOPIPMAC-002, SPEC46STOPIPMAC-003, SPEC46STOPIPMAC-004

## Problem

After Phase B implementation tickets 002 / 003 / 004 land, the seven new MCP context-packet summary fields (`active_intentions`, `active_statuses`, `active_beliefs_by_holder`, `active_relationships_by_participant`, `active_locations_in_scope`, `active_objects_in_scope`, `active_story_diegetic_artifacts`) plus the scope-heuristic documentation need to be reflected in two cross-cutting docs surfaces: `docs/CONTEXT-PACKET-CONTRACT.md` (the canonical contract doc consumed by skill authors and integration auditors) and `tools/world-mcp/src/tools/describe-capabilities.ts` (the runtime capability-description surface returned by `mcp__worldloom__describe_capabilities`). Landing these docs atomically once all upstream implementation tickets ship matches the §Cross-Cutting Docs Ticket Shape from spec-to-tickets — no production code change; grep-proof acceptance against the post-implementation tree.

## Assumption Reassessment (2026-05-18)

1. `docs/CONTEXT-PACKET-CONTRACT.md` exists and is the canonical contract doc for context-packet shape per FOUNDATIONS §Tooling Recommendation (cited at FOUNDATIONS line 522). `tools/world-mcp/src/tools/describe-capabilities.ts` exists and is the runtime capability-description surface. Both surfaces will reference the seven new summary fields contributed by sibling tickets 002, 003, 004.
2. `specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase B Deliverable D-B5 names `docs/CONTEXT-PACKET-CONTRACT.md` under the `story_bundle_context` section as the docs target for the scope heuristic; D-B7 names `tools/world-mcp/src/tools/describe-capabilities.ts` (or equivalent capability-description surface) for enumeration of the new summary fields.
3. Cross-skill boundary: `docs/CONTEXT-PACKET-CONTRACT.md` is consumed by skill operators authoring new skills, by integration-audit operators, and by readers cross-referencing FOUNDATIONS §Tooling Recommendation. `describe-capabilities.ts` is consumed by every MCP client at session start. Both surfaces must be coherent with the implemented context-packet shape post-Phase-B.
4. FOUNDATIONS §Tooling Recommendation principle motivating this ticket: *"LLM agents should never operate on prose alone. They should always receive ... the documented context-packet + targeted-retrieval pattern"*. The contract doc IS the documented surface for the context-packet pattern; if it does not enumerate the 7 new Phase B summary fields, downstream skill authors cannot discover those summaries and the §Tooling Recommendation promise weakens. The docs update is the operational completion of the principle for the Phase B additions.

## Architecture Check

1. Cross-cutting docs ticket per §Cross-Cutting Docs Ticket Shape — landing the two docs surfaces atomically once Phase B implementation tickets ship avoids the staleness window where partial Phase B is implemented but docs reflect either pre-Phase-B state or partial state. Per-ticket co-location of docs is rejected because the contract doc's `story_bundle_context` section needs all 7 summaries to be coherent in one prose paragraph, and `describe-capabilities.ts`'s field enumeration is a single status surface that grows by all 7 fields at once.
2. No backwards-compatibility aliasing or shims introduced. The docs additions are additive — pre-Phase-B references to existing context-packet fields remain valid; the new field references are net-additions.

## Verification Layers

1. **CONTEXT-PACKET-CONTRACT.md coverage** → codebase grep-proof: `grep -nE "active_intentions|active_statuses|active_beliefs_by_holder|active_relationships_by_participant|active_locations_in_scope|active_objects_in_scope|active_story_diegetic_artifacts" docs/CONTEXT-PACKET-CONTRACT.md` returns hits for all 7 field names.
2. **Scope-heuristic mirror** → codebase grep-proof: `grep -n "Scope heuristic\|in scope iff" docs/CONTEXT-PACKET-CONTRACT.md` returns at least one hit matching the JSDoc heuristic statement from sibling ticket 004.
3. **describe-capabilities.ts enumeration** → codebase grep-proof: `grep -nE "active_intentions|active_statuses|active_beliefs_by_holder|active_relationships_by_participant|active_locations_in_scope|active_objects_in_scope|active_story_diegetic_artifacts" tools/world-mcp/src/tools/describe-capabilities.ts` returns hits for all 7 field names.

## What to Change

### 1. Update `docs/CONTEXT-PACKET-CONTRACT.md` story_bundle_context section

Locate the `story_bundle_context` section in `docs/CONTEXT-PACKET-CONTRACT.md` and:
- Add the seven new summary fields under the existing summary-field enumeration (alongside `storylet_pool_summary`, `open_obligations`, `active_threads`, `active_clocks`, `hidden_secrets`, `open_story_questions`, `longest_active_branch_path`, `recent_pages_along_longest_active_branch`, `mysteries_in_play`, `mystery_evidence_chains`, `cast_bind_list`, `invariants_acknowledged`). For each new field, name its shape (one-sentence summary) and its named consumer (one-sentence summary per the Phase B per-class consumer table).
- Add a sub-section documenting the scope heuristic for `active_locations_in_scope` / `active_objects_in_scope` (and the story-local filter for `active_story_diegetic_artifacts`), copying the heuristic statement from the JSDoc landed in sibling ticket 004. Cite SPEC-46 §Phase B as the authoritative source.
- Add a brief Out-of-Scope note pointing to the deferred Priority 2 packets (present-causal-situation, dramatic-irony, reader-expectation, social-pressure, pressure-texture, branch-possibility-space) so doc readers know the seven new summaries are foundation for those packets but not the packets themselves.

### 2. Update `tools/world-mcp/src/tools/describe-capabilities.ts`

Locate the surface that enumerates the story-bundle context summary fields in the runtime capability description (the exact symbol name and surface shape depends on the file's current organization — the implementation ticket inspects the file at implementation time to find the right enumeration site). Add the seven new field names with brief descriptions matching the contract doc's one-sentence summaries from step 1.

## Files to Touch

- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — extend the `story_bundle_context` section with the 7 new summary fields + scope-heuristic sub-section + Out-of-Scope note)
- `tools/world-mcp/src/tools/describe-capabilities.ts` (modify — enumerate the 7 new summary fields in the story-bundle context surface description)

## Out of Scope

- Production code changes: covered by sibling tickets 002, 003, 004.
- Phase C documentation (MACHINE-FACING-LAYER.md story-edge enumeration): covered by SPEC46STOPIPMAC-014.
- Updates to skill prose under `.claude/skills/` that reference the new fields: spec §Deliverable D-X2 marks this as strictly opt-in / no-change.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "active_intentions|active_statuses|active_beliefs_by_holder|active_relationships_by_participant|active_locations_in_scope|active_objects_in_scope|active_story_diegetic_artifacts" docs/CONTEXT-PACKET-CONTRACT.md` returns matches for all 7 new field names.
2. `grep -n "Scope heuristic\|in scope iff" docs/CONTEXT-PACKET-CONTRACT.md` returns at least one hit matching the scope-heuristic statement.
3. `grep -nE "active_intentions|active_statuses|active_beliefs_by_holder|active_relationships_by_participant|active_locations_in_scope|active_objects_in_scope|active_story_diegetic_artifacts" tools/world-mcp/src/tools/describe-capabilities.ts` returns matches for all 7 new field names.
4. `npm run build --prefix tools/world-mcp` typechecks cleanly after the describe-capabilities.ts update.

### Invariants

1. Every field name added to `describe-capabilities.ts` matches the field name landed on `ContextPacketStoryBundleContext` by sibling tickets 002, 003, 004 — no drift between the type and the capability description.
2. The scope-heuristic statement in `CONTEXT-PACKET-CONTRACT.md` matches the JSDoc statement landed on `buildActiveLocationsInScope` / `buildActiveObjectsInScope` by sibling ticket 004 — single source of truth for the heuristic prose; the docs section is the canonical reference and the JSDoc is the colocated mirror.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "active_intentions|active_statuses|active_beliefs_by_holder|active_relationships_by_participant|active_locations_in_scope|active_objects_in_scope|active_story_diegetic_artifacts" docs/CONTEXT-PACKET-CONTRACT.md tools/world-mcp/src/tools/describe-capabilities.ts` (targeted grep-proof: all 7 field names appear in both surfaces)
2. `grep -n "Scope heuristic\|in scope iff\|SPEC-46" docs/CONTEXT-PACKET-CONTRACT.md` (scope-heuristic statement present)
3. `npm run build --prefix tools/world-mcp` (typecheck the describe-capabilities.ts update)
