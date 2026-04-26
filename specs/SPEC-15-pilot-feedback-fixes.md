# SPEC-15: Pilot Feedback — Validator Coverage and Documentation

**Phase**: Independent post-pilot; lands during or after Phase 2.5
**Depends on**: SPEC-04 (validator framework, archived), SPEC-03 (patch engine, archived), SPEC-06 (skill rewrite — `canon-addition` migrated)
**Blocks**: none; pre-existing skills continue to function with documented workarounds

## Problem Statement

The 2026-04-26 first-live canon-addition run against the post-Phase-2 atomic-source pipeline (animalia world, PR-0015 corner-share register, accepted at `soft_canon` as CF-0048 / CH-0021 / PA-0018) was end-to-end successful but surfaced a cohort of pipeline-side findings that were NOT visible in any prior dry-run, fixture test, or static-validation pass. They are visible only when an LLM agent reasons through a complete canon-addition flow against a real world index and a real submit path.

This spec covers the immediately-actionable subset of those findings — the validator coverage bug and the documentation gaps. The remaining design-level findings (engine-convention synchronization, MCP retrieval-surface refinements) are scoped separately in `brainstorming/post-pilot-retrieval-refinements.md` to keep this spec cleanly archive-able once its tickets land.

The findings in scope here split two ways:

1. **Validator coverage gap.** `rule5_no_consequence_evasion` does not recognize `append_extension` as a SEC mutation. The validator's `hasMatchingPatchForFileClass` (`tools/validators/src/rules/rule5-no-consequence-evasion.ts:115-133`) matches only `create_sec_record` and `update_record_field`. The patch engine emits `append_extension` as a distinct op-kind for SEC extensions (`tools/patch-engine/src/ops/append-extension.ts`); the validator treats it as a no-op for Rule 5 enforcement. A skill author following the SKILL.md guidance and using `append_extension` for content extensions hits a confusing 4× `rule5.required_update_not_patched` failure with no clear remediation. Workaround discovered: replace each `append_extension` with `update_record_field { field_path: ["extensions"], operation: "append_list" }`. Both produce identical on-disk results, but having two equivalent ops where one is invisible to a load-bearing rule is a structural defect.

2. **Documentation gaps.**
   - **`pre_figured_by` semantics.** The CF schema's `pre_figured_by` field (regex `^CF-[0-9]{4}$`) is intended for CF-to-CF foreshadowing, not DA-to-CF pre-figurement. DA pre-figurement belongs in `source_basis.derived_from` (CF-0038, CF-0045 precedent). The schema is correct as-designed; the documentation gap is that nothing in FOUNDATIONS.md, the canon-addition SKILL.md, or `tools/world-mcp/README.md` explains the field's intended use, leading skill authors to attempt putting DA refs there and hitting `record_schema_compliance.pattern` failures.
   - **`find_named_entities` scope.** Documented behavior (`mcp__worldloom__find_named_entities(names)`) returns canonical / scoped / surface matches against the entity registry, but the source files do not specify whether prose body content is searched. For Rule 6 audit-trail / pre-figuring scans the answer materially affects what the skill should subsequently grep manually.
   - **canon-addition retrieval-tool decision tree.** The skill SKILL.md and references reference 6+ MCP retrieval tools (`get_record`, `get_context_packet`, `get_neighbors`, `find_named_entities`, `find_impacted_fragments`, `find_sections_touched_by`) but provide no per-phase mapping of which tool to use when. A skill author runs through Phase 0 → Phase 12a without natural triggers to invoke `find_impacted_fragments`, missing draft-impact-analysis opportunities.

These are the kinds of finding that only emerge from running the live pipeline. They were not visible during SPEC-04 / SPEC-03 / SPEC-12 implementation because nothing exercised the full submit path with a non-trivial envelope until 2026-04-26.

## Out-of-spec parking lot

The 2026-04-26 pilot also surfaced a third category of findings — engine-convention synchronization decisions and MCP retrieval-surface refinements — that require design calls before they can be ticketed. Keeping them in this spec would block its archival, so they are scoped to `brainstorming/post-pilot-retrieval-refinements.md` for separate prioritization. That doc covers:

- C1: `modification_history[]` ↔ `notes` synchronization decision (auto-sync in engine vs validator-both-directions vs deprecate the notes-paragraph convention).
- C2: `get_context_packet` returns body_previews vs full bodies (FOUNDATIONS §Tooling Recommendation pressure).
- C3: `get_record_field` slice tool for large records exceeding context budget.
- C4: `get_record_schema` discovery tool for skill authors needing schema contracts.
- C5: `get_context_packet` auto-budget UX (eliminate guess-and-check).
- C6: `find_named_entities` prose-body scan parameter.

When prioritized, items from that brainstorming doc should be promoted to a separate spec (likely SPEC-16) rather than amended back into SPEC-15. SPEC-15 stays scoped to Tracks A and B so it ships and archives cleanly.

## Approach

Two tracks, both immediately actionable:

**Track A — Definite bug (one ticket)**: Fix `rule5_no_consequence_evasion` to recognize `append_extension` as a SEC mutation when its target's file_class matches the file_class under check. Verified bug via the 2026-04-26 validate_patch_plan output.

**Track B — Documentation + skill-content fixes (one ticket)**: Three discrete documentation additions and one skill-content addition, all additive, no schema changes:
- B1: FOUNDATIONS.md and/or `tools/world-mcp/README.md` clarification of `pre_figured_by` field intent (CF-to-CF foreshadowing only).
- B2: `tools/world-mcp/README.md` and/or `docs/MACHINE-FACING-LAYER.md` clarification of `find_named_entities` search scope (canonical_name / alias / scoped_reference fields, not prose body).
- B3: New section in `.claude/skills/canon-addition/references/proposal-normalization.md` (or a new `references/retrieval-tool-tree.md`) mapping MCP retrieval tools to canon-addition phases. Specifically: when to use `get_context_packet` vs `get_record`; when `find_impacted_fragments` adds value at Phase 13a; when `find_sections_touched_by(cf_id)` is the right call for axis-(c) judgment.

## Deliverables

### Track A: validator coverage

**`tools/validators/src/rules/rule5-no-consequence-evasion.ts`** — extend `hasMatchingPatchForFileClass` to recognize `append_extension` against SEC targets. The op's `payload.target_record_id` is a `SEC-<PREFIX>-NNN` id; resolve `<PREFIX>` to file_class via the existing `sectionIdMatchesFileClass` helper.

**Test fixture**: `tools/validators/tests/rules/rule5-no-consequence-evasion.test.ts` — add cases for `append_extension`-only SEC mutations covering each file_class prefix (ELF / INS / MTS / GEO / ECR / PAS / TML).

**Backwards compatibility**: pure-additive extension to the validator's match set. No CF / CH / SEC schema changes. No engine changes. Existing patch plans that use `update_record_field` for SEC extensions continue to pass.

### Track B: documentation + skill content

**`docs/FOUNDATIONS.md` §Canon Fact Record Schema** — add inline comment to the YAML example (or a short prose paragraph following the schema block) clarifying `pre_figured_by` semantics: optional CF-to-CF foreshadowing pointer; DA-to-CF pre-figurement is recorded in `source_basis.derived_from`. One sentence sufficient.

**`tools/world-mcp/README.md` §Tools** — for `find_named_entities`, document the search scope (canonical_name / alias / scoped_reference fields against the entity registry; prose body content is NOT scanned). For `mcp__worldloom__get_context_packet`, document that `body_preview` is truncated for index purposes; full record retrieval requires `get_record(record_id)`.

**`docs/MACHINE-FACING-LAYER.md`** — if it exists; otherwise `tools/world-mcp/README.md` — add a "scope of each retrieval tool" subsection naming what each tool reads, so skill authors can choose without reading source.

**`.claude/skills/canon-addition/references/proposal-normalization.md`** OR **new `.claude/skills/canon-addition/references/retrieval-tool-tree.md`** — add a phase-by-phase map:
- Pre-flight: `allocate_next_id` (PA / CF / CH / M / OQ as needed); `get_canonical_vocabulary` for `domain` / `verdict` / `mystery_status` / `mystery_resolution_safety`; `get_context_packet(task_type='canon_addition', seed_nodes=[proposal_seed_nodes], token_budget=>=15000)`.
- Phase 0–6: `get_record(record_id)` for each cited CF / M / OQ / SEC the proposal touches; `find_named_entities(names)` for pre-figuring scan if proposal names specific entities; `get_neighbors(node_id, edge_types, depth)` for one-hop ontology neighbors when scope detection is unclear.
- Phase 12a: `find_impacted_fragments(cf_ids)` to identify which sections will need extension if the new CF is accepted; `find_sections_touched_by(cf_id)` to verify axis-(c) judgment by inspecting which sections currently cite the candidate parent CF.
- Phase 13a: validate against `validate_patch_plan(envelope)` before HARD-GATE presentation.

**Backwards compatibility**: pure-additive documentation. No file moves, no schema changes, no skill behavior changes — only new prose.

## FOUNDATIONS Alignment

- **Track A**: aligns with FOUNDATIONS Rule 5 (No Consequence Evasion). The rule's enforcement surface should match the engine's actual op vocabulary; failing to do so weakens the rule for skills that use append_extension.
- **Track B**: aligns with FOUNDATIONS §Tooling Recommendation ("LLM agents should never operate on prose alone. They should always receive: current World Kernel, current Invariants, relevant canon fact records, affected domain files, unresolved contradictions list."). Documentation gaps prevent skills from receiving the right material at the right phase. Track B also aligns with Rule 6 (No Silent Retcons) by making the `pre_figured_by` vs `source_basis.derived_from` distinction explicit, so skill authors do not silently misroute audit-trail pointers.
- **No FOUNDATIONS amendments required.** The principles already endorse the desired end state; this spec brings tooling and validators into alignment with the principles.

## Verification

### Track A

- `tools/validators/tests/rules/rule5-no-consequence-evasion.test.ts` — test cases pass: `append_extension` ops against SEC file_class prefixes count toward their matching required-world-update entries (SEC-ELF / SEC-INS / SEC-MTS / SEC-GEO / SEC-ECR / SEC-PAS / SEC-TML).
- Synthetic pre-apply smoke with one `create_cf_record` plus one `append_extension` SEC mutation — `validatePatchPlan` returns clean. Replaying the live 2026-04-26 PR-0015 envelope remains out of scope because it would create a no-op canon mutation.
- Existing rule5 tests continue to pass (`update_record_field` SEC mutations remain matched).

### Track B

- `grep "pre_figured_by" docs/FOUNDATIONS.md tools/world-mcp/README.md` returns the new clarification.
- `grep -A2 "find_named_entities" tools/world-mcp/README.md` returns the new scope clause.
- `.claude/skills/canon-addition/references/` contains the retrieval-tool-tree content (either inline in proposal-normalization.md or as its own file).
- Manual spot-check: a skill author reading the canon-addition SKILL.md plus references can identify which retrieval tool to call at each phase without reading TypeScript source.

## Out of Scope

- **Re-running the 2026-04-26 PR-0015 patch plan with `append_extension` ops post-fix.** The current submitted form (using `update_record_field`) is byte-identical on disk to what `append_extension` would have produced. Re-issuing would add a no-op CH entry. Skipped.
- **Engine-convention sync (mod_history ↔ notes) and MCP retrieval-surface refinements.** Scoped to `brainstorming/post-pilot-retrieval-refinements.md`. Promotion to a separate spec (likely SPEC-16) when prioritized; not part of SPEC-15.
- **Backfilling the `notes` paragraph on CF-0024 for the CH-0021 modification.** That's part of the brainstorming doc's C1 design call; do not pre-empt the decision by retroactively appending.
- **Adding `pre_figured_by` to FOUNDATIONS §Canon Fact Record Schema as a canonical field.** The field is implementation-only today (zero CFs use it in animalia); FOUNDATIONS canonicalization is a separate decision worth its own discussion if/when usage emerges.
- **Migrating `tools/world-mcp/.secret` away from filesystem to a more secure store.** Out of scope; current discipline (gitignored, generated on first invocation) is sufficient for single-user local development.

## Risks & Open Questions

- **Risk: Track B documentation drift.** Prose documentation diverges from code over time. Mitigation: link from doc to source file paths so future code changes that invalidate the docs become discoverable via grep.
- **Risk: Track A scope creep into adjacent rules.** While fixing rule5, the temptation will be to also expand rule4 / rule6 / rule7 to recognize append_extension. Each should be evaluated independently — do not bundle.
- **Open question: SPEC-15 prefix.** Tickets under this spec take prefix `SPEC15PILFIX-NNN` (PILot FIXes). Confirmed naming-convention-consistent with SPEC13ATOSRCMIG / SPEC14PAVOC.

## Implementation order

Within SPEC-15 (full decomposition — both tickets ship the spec):

1. **SPEC15PILFIX-001** — Track A (rule5 + append_extension). Completed and archived at `archive/tickets/SPEC15PILFIX-001.md`.
2. **SPEC15PILFIX-002** — Track B (documentation + skill content). Independent of -001; can land in parallel.

After SPEC15PILFIX-002 lands and its acceptance criteria pass, SPEC-15 archives to `archive/specs/SPEC-15-pilot-feedback-fixes.md`; SPEC15PILFIX-001 is already archived, and SPEC15PILFIX-002 should archive when completed. No deferred follow-on tickets under SPEC-15 — items in `brainstorming/post-pilot-retrieval-refinements.md` are explicitly out-of-scope and would land under their own subsequent spec when prioritized.

`SPEC15PILFIX-001` and `SPEC15PILFIX-002` should land before any further canon-mutating skill rewrite (`character-generation`, `diegetic-artifact-generation`, etc.) so those rewrites benefit from the corrected validator coverage and the documented retrieval-tool tree.
