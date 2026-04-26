# SPEC15PILFIX-002: Documentation and skill-content fixes — `pre_figured_by` semantics, `find_named_entities` scope, canon-addition retrieval-tool decision tree

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — documentation and skill-content only.
**Deps**: SPEC-15 (`archive/specs/SPEC-15-pilot-feedback-fixes.md`)

## Problem

The 2026-04-26 first-live canon-addition run surfaced three discoverability gaps where correct behavior is implemented but undocumented (or under-documented), forcing the executing skill author to read TypeScript source, fail validation, or reason from absent precedent:

1. **`pre_figured_by` semantics undocumented.** `tools/world-index/src/schema/types.ts:149` declares `pre_figured_by?: string[]` on `CanonFactRecord` and the JSON schema (`tools/validators/src/schemas/canon-fact-record.schema.json:104-107`) constrains its entries to regex `^CF-[0-9]{4}$`. The field is intended for CF-to-CF foreshadowing pointers (e.g., a new CF that was hinted at by an earlier CF). DA-to-CF pre-figurement is recorded in `source_basis.derived_from` (CF-0038, CF-0045 precedent: `derived_from: [CF-NNNN, DA-0001]`). Neither FOUNDATIONS.md, the canon-addition SKILL.md, the world-mcp README, nor any reference doc explains this distinction. Result: a skill author seeing "DA-0001 pre-figured this CF" naturally tries to put DA-0001 in `pre_figured_by`, hits `record_schema_compliance.pattern` failure with no guidance on which field is correct.

2. **`find_named_entities` search scope opaque.** `tools/world-mcp/README.md` lists `mcp__worldloom__find_named_entities(names)` with no description of what fields are searched. By inspection, it queries the entity registry's canonical_name + aliases + scoped_reference fields against the world index — it does NOT lexically scan prose body content. For Rule 6 audit-trail / pre-figuring scans, this distinction is load-bearing: a name appearing inside a diegetic-artifact's body prose but not in any entity-registry surface returns zero matches. A skill author cannot know this without reading `tools/world-mcp/src/tools/_shared.ts`.

3. **No retrieval-tool decision tree for canon-addition.** The canon-addition SKILL.md and references mention 6+ MCP retrieval tools (`get_record`, `get_context_packet`, `get_neighbors`, `find_named_entities`, `find_impacted_fragments`, `find_sections_touched_by`) but provide no per-phase guidance. Live result: during the 2026-04-26 PR-0015 run, `find_impacted_fragments` was never invoked even though it would have streamlined Phase 12a / 13a draft-impact reasoning. The skill author defaulted to manual reasoning over `get_record` outputs.

## Assumption Reassessment (2026-04-26)

1. `pre_figured_by` field intent confirmed by direct read of `tools/world-index/src/schema/types.ts:149` (CF-only via JSON schema regex), `tools/world-index/src/parse/semantic.ts:56` (emits `pre_figured_by` edge into world index), and animalia source state (zero CFs currently use the field; CF-0038 / CF-0045 use `source_basis.derived_from` for DA references).
2. `find_named_entities` scope confirmed by direct read of `tools/world-mcp/src/tools/_shared.ts` (`applyFilters` queries `entities.canonical_name`, `entity_aliases.alias_text`, and `scoped_references.display_name`/`scoped_reference_aliases.alias_text`; no FTS5 body-prose scan invoked).
3. Cross-artifact boundary under audit: skill-side reasoning (canon-addition SKILL.md + references) consumes MCP retrieval tools whose semantics are documented (or not) in the world-mcp package. The shared contract is the prose description of each tool in `tools/world-mcp/README.md` plus any matching skill-side guidance in `.claude/skills/canon-addition/`. Both ends require updates.
4. FOUNDATIONS Rule 6 (No Silent Retcons) and §Tooling Recommendation are the principles under audit. Rule 6 requires "all canon changes must be logged with justification"; the `pre_figured_by` vs `source_basis.derived_from` routing is the audit-trail mechanism, and silent misrouting weakens the rule. §Tooling Recommendation requires LLM agents receive Kernel + Invariants + relevant CF records + affected domain files; the retrieval-tool decision tree maps tools to those receipts.
5. This ticket touches skill HARD-GATE-adjacent documentation (canon-addition SKILL.md references) but not HARD-GATE semantics directly. Confirmed: change does not weaken the Mystery Reserve firewall; it strengthens awareness of `find_named_entities`'s scope, which Phase 6b Mystery Curator inline lens uses for forbidden-answer overlap checks.
6. No schema extension. No CF / CH / SEC / PA field added or modified. Pure additive documentation across three artifacts.
7. No skill, tool, hook, or schema field renamed or removed. Blast radius is limited to the documentation files and the canon-addition references directory.
8. Adjacent contradiction surfaced during reassessment: `tools/world-mcp/README.md` was updated under SPEC-15 ticket creation context to document the `sign-approval-token` CLI; this ticket extends the same README with retrieval-tool scope clauses. No conflict; both extensions are additive in adjacent sections.
9. Final implementation chose a new `.claude/skills/canon-addition/references/retrieval-tool-tree.md` rather than appending to `proposal-normalization.md`; the tree is long enough to keep the main reference readable, and SKILL.md now links to it from §World-State Prerequisites.
10. `docs/MACHINE-FACING-LAYER.md` exists and already carries the machine-facing overview, so this ticket adds a compact retrieval-tool scope table there instead of leaving the README as the only tool-scope surface.
11. Same-seam spec/status references in `specs/SPEC-15-pilot-feedback-fixes.md` and `specs/IMPLEMENTATION-ORDER.md` were initially updated to say this ticket was complete but intentionally still active pending explicit archival; post-ticket review later updated those handoff lines to the archived ticket path, and SPEC-15 archival moved the spec to `archive/specs/SPEC-15-pilot-feedback-fixes.md`.

## Architecture Check

1. **Why this is cleaner than alternatives**:
   - Alternative A (rename `pre_figured_by` to `pre_figured_by_cf` and add `pre_figured_by_artifact` as a parallel field): would require schema migration, validator updates, and index parser updates. Heavy work for what is fundamentally a documentation gap — the field name is fine if its intent is documented. Skipped.
   - Alternative B (chosen): document the existing field's intent and the parallel `source_basis.derived_from` convention for DA references. Pure additive doc change.
   - For `find_named_entities`: alternative A (add a `prose_body_scan: boolean` parameter) is real future work but belongs under `brainstorming/post-pilot-retrieval-refinements.md` §C6, not this ticket. This ticket only documents current behavior.
   - For the retrieval-tool decision tree: alternative A (build the tree into the SKILL.md itself) bloats SKILL.md per project convention favoring thin SKILL.md + references/. Alternative B (chosen): place the tree in references/, link from SKILL.md.
2. **No backwards-compatibility shims introduced.** Pure additive documentation. No schema, tool, or skill behavior changes.

## Verification Layers

1. `pre_figured_by` semantics documented -> codebase grep-proof (`grep -A3 "pre_figured_by" docs/FOUNDATIONS.md tools/world-mcp/README.md` returns the new clarification on at least one of the two surfaces) + manual review (the prose actually distinguishes CF-to-CF foreshadowing from DA-to-CF pre-figurement)
2. `find_named_entities` search scope documented -> codebase grep-proof (`grep -B1 -A4 "find_named_entities" tools/world-mcp/README.md` returns the new scope clause naming canonical_name / alias / scoped_reference fields and stating prose body is NOT scanned)
3. canon-addition retrieval-tool decision tree exists -> codebase grep-proof (file `.claude/skills/canon-addition/references/retrieval-tool-tree.md` exists and SKILL.md links to it) + skill dry-run (a skill author reading SKILL.md + references can identify the right MCP retrieval tool for each phase without reading TypeScript)
4. FOUNDATIONS Rule 6 audit-trail principle alignment -> FOUNDATIONS alignment check (`docs/FOUNDATIONS.md` §Validation Rules §Rule 6 — `pre_figured_by` clarification supports clean audit-trail routing for CF-to-CF foreshadowing; doesn't introduce a new mechanism, only documents the existing one)

## What to Change

### 1. Document `pre_figured_by` semantics

`docs/FOUNDATIONS.md` §Canon Fact Record Schema — append a short prose paragraph after the YAML example block:

> The optional `pre_figured_by[]` field accepts CF id references only and records CF-to-CF foreshadowing — i.e., a previously-accepted CF that hinted at the new CF before the new CF was committed. DA-to-CF pre-figurement (a diegetic artifact whose narrator-content foreshadowed a later canon commitment, per Rule 6 audit-trail discipline) is recorded in `source_basis.derived_from` instead, alongside any contributing CF parents. Precedent: CF-0038 and CF-0045 both record DA-0001 pre-figurement via `derived_from`, leaving `pre_figured_by` empty.

`tools/world-mcp/README.md` — if a §Schema or §Field Reference section exists, mirror the clarification; otherwise out-of-scope (FOUNDATIONS is the canonical home).

### 2. Document `find_named_entities` search scope

`tools/world-mcp/README.md` §Tools — under the `mcp__worldloom__find_named_entities(names)` line, append a one-paragraph clarification:

> Searches the entity registry's `canonical_name` field, `entity_aliases.alias_text` table, and `scoped_references.display_name` / `scoped_reference_aliases.alias_text` tables against the world index. Does NOT perform lexical scan over prose body content (section bodies, diegetic-artifact bodies, character-dossier bodies). For Rule 6 pre-figuring scans where the target string may live only in prose, pair this call with a separate `mcp__worldloom__search_nodes(query)` call (which DOES exercise the FTS5 lexical layer) to cover both surfaces. Returns `canonical_matches[]`, `scoped_matches[]`, and `surface_matches[]` (currently always empty per current ranking-policy implementation).

`docs/MACHINE-FACING-LAYER.md` — if this file exists, add a parallel "scope of each retrieval tool" subsection naming what each MCP retrieval tool reads. If the file does not exist, the world-mcp README addition above is sufficient; do not create a new doc file under this ticket.

### 3. Add canon-addition retrieval-tool decision tree

Create `.claude/skills/canon-addition/references/retrieval-tool-tree.md` and link it from SKILL.md §World-State Prerequisites. The reference maps retrieval calls by phase:

- Pre-flight: `allocate_next_id`, `get_canonical_vocabulary`, and `get_context_packet`.
- Phase 0-2: `get_record` for cited records, `find_named_entities` for registry/scoped-reference pre-figuring scans, and `search_nodes` for prose-body discovery.
- Phase 3-6: `get_neighbors`, `get_record` for cited SEC records, and read-only subagent extraction for oversized records.
- Phase 6b: role-scoped `get_context_packet` calls for critic roles when escalation fires.
- Phase 12a: `find_sections_touched_by` for axis-(c) judgment and `find_impacted_fragments` for incomplete downstream-update discovery.
- Phase 13a-15a: patch assembly, `validate_patch_plan`, approval-token signing, and `submit_patch_plan`.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify — append clarification paragraph after CF schema YAML example)
- `tools/world-mcp/README.md` (modify — extend `find_named_entities` description; optionally clarify `get_context_packet` body_preview semantics)
- `docs/MACHINE-FACING-LAYER.md` (modify — add per-tool scope subsection)
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (new)
- `.claude/skills/canon-addition/SKILL.md` (modify — link to the new reference from §World-State Prerequisites)
- `archive/specs/SPEC-15-pilot-feedback-fixes.md` (modify — completion/status truthing)
- `specs/IMPLEMENTATION-ORDER.md` (modify — completion/status truthing)

## Out of Scope

- Promoting `pre_figured_by` beyond an implementation-backed optional machine field into a new canonical authoring requirement. This ticket documents the existing field's intent inline but does not require authors to populate it.
- Adding a `prose_body_scan: boolean` parameter to `find_named_entities`. Out of scope; deferred to `brainstorming/post-pilot-retrieval-refinements.md` §C6.
- Documenting every MCP retrieval tool's scope (only `find_named_entities` is in scope; `get_neighbors`, `find_impacted_fragments`, etc. are well-documented enough today). If subsequent canon-addition runs reveal additional opacity, follow-up tickets.
- Re-running the 2026-04-26 PR-0015 envelope to test the new retrieval-tool tree. The tree is documentation; verification is by manual review of the prose, not by a synthetic skill run.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -A3 "pre_figured_by" docs/FOUNDATIONS.md` returns the new clarification paragraph (or comment block) distinguishing CF-to-CF foreshadowing from DA-to-CF pre-figurement.
2. `grep -B1 -A6 "find_named_entities" tools/world-mcp/README.md` returns the new scope clause naming canonical_name / alias / scoped_reference fields and stating prose body is NOT scanned.
3. `ls .claude/skills/canon-addition/references/retrieval-tool-tree.md` returns the file, and `grep -n "retrieval-tool-tree.md" .claude/skills/canon-addition/SKILL.md` returns the SKILL.md link.
4. Manual review: a skill author reading the canon-addition SKILL.md + references can identify the correct MCP retrieval tool to call at each phase without reading TypeScript source.

### Invariants

1. **Documentation parity with code**: `pre_figured_by` field intent matches `tools/validators/src/schemas/canon-fact-record.schema.json:104-107` (CF-only regex). `find_named_entities` scope matches `tools/world-mcp/src/tools/_shared.ts` `applyFilters` query construction (registry tables only, no FTS5 body scan).
2. **Skill discoverability**: every MCP retrieval tool referenced in canon-addition's process flow has a per-phase invocation rationale documented in the retrieval-tool tree. New MCP tools added under any follow-on spec (e.g., promoted from `brainstorming/post-pilot-retrieval-refinements.md`) must extend the tree in the same PR that introduces the tool.
3. **No schema or contract breakage**: zero changes to `tools/validators/src/schemas/`, zero changes to MCP tool signatures, zero changes to skill HARD-GATE semantics.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based (grep) and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -A3 "pre_figured_by" docs/FOUNDATIONS.md`
2. `grep -B1 -A6 "find_named_entities" tools/world-mcp/README.md`
3. `find .claude/skills/canon-addition/references/ -name "retrieval-tool-tree.md"` then `grep -l "Retrieval Tool Decision Tree" .claude/skills/canon-addition/references/*.md`
4. `cat docs/FOUNDATIONS.md | grep -c "pre_figured_by"` — confirms reference exists at least once after the change.

## Outcome

Completed on 2026-04-26.

Outcome amended: 2026-04-26 — post-ticket review archived this completed ticket at `archive/tickets/SPEC15PILFIX-002.md`.

- Added the `pre_figured_by[]` clarification to `docs/FOUNDATIONS.md`, preserving CF-only semantics and routing diegetic/character pre-figurement through `source_basis.derived_from`.
- Expanded `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` with the `find_named_entities` scope boundary and retrieval tool-scope guidance.
- Added `.claude/skills/canon-addition/references/retrieval-tool-tree.md` and linked it from `.claude/skills/canon-addition/SKILL.md`.
- Updated SPEC-15 and implementation-order status prose during implementation, then post-ticket review repaired those handoff lines to the archived ticket path.

## Verification Result

Passed on 2026-04-26:

1. `grep -A3 "pre_figured_by" docs/FOUNDATIONS.md`
2. `grep -B1 -A6 "find_named_entities" tools/world-mcp/README.md`
3. `find .claude/skills/canon-addition/references/ -name "retrieval-tool-tree.md"` plus `grep -l "Retrieval Tool Decision Tree" .claude/skills/canon-addition/references/*.md`
4. `cat docs/FOUNDATIONS.md | grep -c "pre_figured_by"`
5. `ls .claude/skills/canon-addition/references/retrieval-tool-tree.md`
6. `grep -n "retrieval-tool-tree.md" .claude/skills/canon-addition/SKILL.md`
7. `git diff --check`
8. Manual review: SKILL.md §World-State Prerequisites links to the new tree; the tree identifies the correct retrieval tool for each canon-addition phase without changing HARD-GATE semantics.

## Deviations

- Chose the new-file option for the decision tree because the phase map is substantial enough that appending it to `proposal-normalization.md` would make that reference less focused.
- Updated `docs/MACHINE-FACING-LAYER.md` because it exists and already owns the machine-facing overview.
- Initial implementation did not archive the ticket or SPEC-15 because the user requested implementation and reference-spec reliance, not archival. Post-ticket review archived this ticket; SPEC-15 spec archival remains a separate handoff.
