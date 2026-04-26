<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-17: Audit-Trail and Retrieval-Contract Clarifications

**Status**: COMPLETED
**Phase**: 2.7 (post-pilot retrieval refinements; independent of SPEC-09 canon-safety expansion)
**Depends on**: SPEC-13 (Atomic-Source Migration, archived), SPEC-14 (PA Contract & Vocabulary Reconciliation, archived), SPEC-15 (Pilot Feedback Fixes, archived), SPEC-16 §C3 + §C5 (post-pilot retrieval refinements — must land first to make the §C2 contract softening ergonomic)
**Blocks**: none

## Problem Statement

The 2026-04-26 first-live canon-addition run (animalia world, PR-0015 corner-share register, accepted as CF-0048 / CH-0021 / PA-0018) surfaced two **contract-level frictions** that go beyond mechanical MCP tooling additions (which SPEC-16 covers). Each requires an explicit decision about how the worldloom contract is interpreted — between engine, validator, FOUNDATIONS prose, and skill expectations — and each has potential FOUNDATIONS-amendment consequences that should not be made silently inside an implementation ticket.

The two findings:

1. **Engine convention drift on CF modification audit trail.** Pre-SPEC-13 CF authoring convention (visible in `worlds/animalia/_source/canon/CF-0006.yaml`, `CF-0017.yaml`, `CF-0024.yaml` and others, when those records were originally authored against the monolithic ledger) appended BOTH a `notes` paragraph (`Modified YYYY-MM-DD by CH-NNNN (CF-NNNN): <summary>`) AND a structured `modification_history[]` entry for each retroactive modification. The post-SPEC-13 patch engine's `append_modification_history_entry` op (`tools/patch-engine/src/ops/append-modification-history-entry.ts:64`) appends the structured entry only — it does NOT touch `notes`. The `modification_history_retrofit` validator (`tools/validators/src/structural/modification-history-retrofit.ts:11`) checks one direction only: notes → history (every "Modified ... by CH-..." line in `notes` must have a matching history entry). The reverse direction is unchecked. Live evidence: the just-shipped CF-0024 modification (for PR-0015 / CH-0021 / CF-0048) gained a structured history entry but no corresponding notes paragraph, drifting from the pre-SPEC-13 convention. Two questions follow: (a) is the notes-paragraph convention load-bearing for any current skill, or pure human-ergonomics? (b) what is the canonical post-SPEC-13 audit surface — `notes`, `modification_history[]`, or both?

2. **Context-packet richness vs FOUNDATIONS §Tooling Recommendation.** `mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget)` returns nodes with `body_preview` truncated at ~282 chars; `summary` is null. The packet is an INDEX of relevant nodes, not their content. Live result: the 2026-04-26 PR-0015 packet at 16000-token budget covered 132 nodes but every node body was truncated; reasoning required ~7 follow-up `get_record(record_id)` calls for the load-bearing CFs/SECs. FOUNDATIONS §Tooling Recommendation reads:
   > LLM agents should never operate on prose alone. They should always receive: current World Kernel, current Invariants, relevant canon fact records, affected domain files, unresolved contradictions list ...
   The plain reading is "agents receive content, not pointers to content." Current packet behavior delivers pointers (truncated previews) plus a follow-up-call pattern. There is a gap between FOUNDATIONS prose and shipped behavior; the question is whether to close it by changing behavior (ship full bodies in the packet) or by refining FOUNDATIONS prose (endorse the index + follow-up pattern explicitly).

These are not bug fixes. They are contract decisions. Each item enumerates A/B/C options in `brainstorming/post-pilot-retrieval-refinements.md`; this spec adopts a recommended option per item, surfaces the FOUNDATIONS prose change required (if any), and routes the implementation through the appropriate skill / engine / docs surfaces.

## Approach

Two tracks, each with a documented A/B/C decision adopted by this spec. Either track can be re-adjudicated by the user before implementation; no FOUNDATIONS prose or SKILL.md text changes until the user signs off on this spec specifically.

### Track C1: Deprecate the notes-paragraph convention; `modification_history[]` is the canonical audit surface

**Recommended option**: **Option C from the brainstorming doc** — declare `modification_history[]` the canonical post-SPEC-13 audit surface; drop the requirement that the engine (or skill authors) maintain a parallel `notes` paragraph for each modification.

**Rationale**:
- **Load-bearing-ness check verified**: `continuity-audit/SKILL.md:314` and `continuity-audit/templates/retcon-proposal-card.md:131-141` reference `modification_history` (the structured field) for retcon planning and audit-trail tracking, NOT the notes paragraph. No current skill reads the notes paragraph for any audit purpose. Reassessment surfaced that the dual-convention is currently prescribed only in **`.claude/skills/create-base-world/templates/canon-fact-record.yaml:97-118`** (template comments instructing future canon-addition runs to "append a standardized line: `Modified YYYY-MM-DD by CH-NNNN (CF-NNNN): ...`" and stating that "the notes-field line and the modification_history entry are required together"). The canon-addition SKILL.md, its references/, the skill-creator CF template, and the continuity-audit CF template do NOT contain the prescription. The convention is human-ergonomics scaffolding inherited from pre-SPEC-13 authoring, not load-bearing for any current skill's reading flow.
- **FOUNDATIONS Rule 6 (No Silent Retcons)**: requires "all canon changes must be logged with justification." `modification_history[]` carries the structured log (`change_id`, `originating_cf`, `date`, `summary`). Rule 6 is satisfied by the structured field alone; the notes paragraph adds redundancy without enforcement value (only one direction of the redundancy is currently checked).
- **Atomic-source coherence**: post-SPEC-13, atomic records are the canonical storage form. Asking the engine to maintain a derived prose-mirror inside the YAML file's `notes` field treats `notes` as a structured-output sink rather than as a free-form authoring surface — a category drift relative to the rest of the atomic-record discipline.
- **Lowest blast radius**: no engine code change, no validator change, no migration. Just a SKILL.md prose update and a one-line README clarification.
- **Options A/B both worse**: Option A (auto-sync in engine) introduces formatting opinion the engine doesn't have today (where in `notes` does the line go? section-aware? appended?); requires test coverage and affects every future CF mutation. Option B (validator-both-directions) is the worst intermediate state — every engine-emitted CF mutation between landing and the engine being updated would FAIL validation.

**Out of scope for this track** (handled by the SPEC-15 §Out of Scope decision):
- **Backfilling the missing notes paragraph on CF-0024 for the CH-0021 modification.** No backfill; `modification_history[]` carries the audit; no CH-N entry is invented to "log the missed paragraph." Pre-SPEC-13 CFs retain their dual-convention notes paragraphs as historical artifact (no removal).

### Track C2: Soften FOUNDATIONS §Tooling Recommendation prose to endorse the index + follow-up-call pattern (conditional on SPEC-16 §C3 + §C5)

**Recommended option**: **Option C from the brainstorming doc** — soften FOUNDATIONS §Tooling Recommendation prose to explicitly endorse the documented context-packet + targeted-retrieval pattern.

**Rationale**:
- **SPEC-16 §C3 (`get_record_field`) and §C5 (per-task-type defaults + retry-hint) make the index + follow-up pattern ergonomic**. Once SPEC-16 lands, the per-call cost of the follow-up retrieval pattern drops materially: `get_context_packet` first-call success on default budget; field-slice retrieval on large records; minimum-budget retry hint on insufficient-budget cases. The friction the brainstorming doc identified for Option A was structural (packets exceed context window in single response — observed at 16K budget against animalia); SPEC-16 doesn't change that, but it makes Option C ergonomic enough that the structural ceiling on Option A becomes the deciding factor.
- **Option A (full bodies in packet) hits context-window limits**: live observation at 16K budget already required subagent extraction; bumping default packet size to 50–80KB per typical canon-addition run pushes single-response packets above comfortable model-context budgets. Streaming responses or budget-driven truncation discipline at the MCP boundary are non-trivial engineering and not warranted by current pain.
- **Option B (`richness: 'index' | 'full'` parameter) shifts the choice to skill authors but doesn't relieve FOUNDATIONS pressure** — the prose still reads as if full content is delivered; the parameter just lets callers ask. Neither codifies the actual operational pattern.
- **Option C codifies what works**: the documented context-packet + targeted-retrieval pattern is what the pipeline actually does, what the canon-addition skill's retrieval-tool tree already endorses (post-SPEC-15), and what `docs/CONTEXT-PACKET-CONTRACT.md` already describes. The FOUNDATIONS prose update closes the prose-vs-behavior gap with a single-sentence amendment plus a cross-reference.

**Dependency on SPEC-16**: this track's FOUNDATIONS amendment ASSUMES the index + follow-up pattern is ergonomic. That ergonomic claim depends on SPEC-16's C3 + C5 landing first. If SPEC-16 is not yet shipped when SPEC-17 is reviewed, the FOUNDATIONS amendment should not land — the prose change would document a pattern that's still painful to use. The implementation ticket for Track C2 should verify SPEC-16's C3 + C5 are archived before applying the FOUNDATIONS edit.

## Deliverables

### Track C1: Template + SKILL.md + engine/validator deprecation

**Surface inventory.** Reassessment surfaced that the dual-convention is prescribed only in the create-base-world CF template (the originally-listed canon-addition surfaces carry no such prescription today). Track C1 lands deprecation prose across **five surfaces** so a future skill author consulting any of them does not reinvent the dual-convention by analogy to pre-SPEC-13 CFs:

1. `.claude/skills/create-base-world/templates/canon-fact-record.yaml` — the actual prescription surface (replace).
2. `.claude/skills/canon-addition/SKILL.md` — net-new ADD prose (defense-in-depth at the canonical canon-mutating skill).
3. `tools/patch-engine/README.md` — new H2 §Audit Trail Discipline section.
4. `tools/patch-engine/src/ops/append-modification-history-entry.ts` — header comment.
5. `tools/validators/src/structural/modification-history-retrofit.ts` — header comment.

The skill-creator CF template, the continuity-audit CF template, and the canon-addition references/ files are verified clean today; Track C1's Verification step revisits them as defense-in-depth.

**`.claude/skills/create-base-world/templates/canon-fact-record.yaml`** — Track C1 replaced lines 97-118 (the `notes:` block instructing "append a standardized line: `Modified YYYY-MM-DD by CH-NNNN (CF-NNNN): ...`" plus the comment block over `modification_history: []` stating the notes-field line and the history entry are required together) with prose stating the post-SPEC-13 convention: free-form `notes:` continues to carry adjudication reasoning and scope-narrowing decisions; `modification_history[]` is the canonical structured audit surface for any future canon-addition run that modifies this CF; the engine's `append_modification_history_entry` op writes only to that field; future modifications do NOT also append a parallel notes paragraph. The removed forward-references to `canon-addition/templates/canon-fact-record.yaml` and `canon-addition/references/accept-path.md` were historical references to deleted/absorbed SPEC-06 surfaces, not live implementation instructions; the schema-uniformity claim those references supported is preserved by the deprecation prose itself.

**`.claude/skills/canon-addition/SKILL.md`** — add net-new prose explicitly stating `modification_history[]` is the canonical post-SPEC-13 audit surface, the engine's `append_modification_history_entry` op writes only to that field, and skills do NOT append a parallel notes paragraph. Land near the existing Phase 12a prose (which already references `modification_history` for the axis-(c) judgment) or under §Validation Rules This Skill Upholds → Rule 6 mechanism — implementer's choice; the prose must contain the literal phrase "`modification_history[]` is the canonical" so the post-apply grep can prove it landed. Cite this spec for the decision context. (No existing prescription needs replacing — verified clean by Step 3 grep.)

**`.claude/skills/canon-addition/references/`** — defense-in-depth verify-only: confirm no reference file (consequence-analysis.md, counterfactual-and-verdict.md, proposal-normalization.md, retrieval-tool-tree.md) introduces the notes-paragraph convention. If a future reference duplicates it, edit accordingly; today's surfaces are clean. The retrieval-tool tree (added by SPEC15PILFIX-002) is unaffected.

**`.claude/skills/continuity-audit/SKILL.md`** — verify lines 309 and 314 already reference `modification_history` (the structured field) for retcon planning. No edit required if verification passes; defense-in-depth check that the deprecated convention isn't load-bearing here.

**`.claude/skills/continuity-audit/templates/retcon-proposal-card.md`** — verify lines 131-141 reference `modification_history` only. No edit required if verification passes.

**`tools/patch-engine/README.md`** — add a new H2 §Audit Trail Discipline section after §Atomicity stating: "Post-SPEC-13, `modification_history[]` is the canonical audit surface for CF retroactive modifications. The `append_modification_history_entry` op writes only to that field; the engine does NOT mirror entries into the `notes` field. Pre-SPEC-13 CFs may carry dual notes-paragraph + history-entry records as historical artifact; new modifications use the structured field only. The `modification_history_retrofit` validator polices the historical convention in one direction only (notes → history); the reverse direction is intentionally unchecked because the engine no longer emits to `notes`." (The README has no per-op description structure — a new section is the publicly-visible landing surface.)

**`tools/patch-engine/src/ops/append-modification-history-entry.ts`** — add a header comment (top-of-file, above the imports) stating the post-SPEC-13 convention parallel to the validator file's comment: "`modification_history[]` is the canonical post-SPEC-13 audit surface. This op intentionally writes only to that field. The engine does NOT mirror entries into `notes`. See SPEC-17 Track C1." This defends against re-introduction of the dual-convention during future op refactors.

**`tools/validators/src/structural/modification-history-retrofit.ts`** — no code change. The validator continues to check notes → history one-way; this is correct under the deprecated convention (pre-SPEC-13 CFs that have notes paragraphs must still have matching history entries — the structured field is the source of truth, the prose paragraph is the backward-compatibility check). Add a header comment to the file briefly explaining the deprecation context so a future reader doesn't re-add the reverse-direction check.

**Backwards compatibility**: pure-additive prose change. No engine code, validator code, or schema change. Pre-SPEC-13 CFs with dual notes-paragraph + history-entry records remain valid under the existing one-way check. Future modifications to those CFs add only history entries; their `notes` paragraphs are not touched and not extended.

### Track C2: FOUNDATIONS §Tooling Recommendation prose softening

**`docs/FOUNDATIONS.md` §Tooling Recommendation** — amend the bulleted "they should always receive" list to read (delta in `**bold**`):
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

The amendment preserves the non-negotiable framing ("LLM agents should never operate on prose alone"; "this is non-negotiable") while explicitly endorsing the index + follow-up-retrieval pattern as a documented mechanism. The cross-reference to `docs/CONTEXT-PACKET-CONTRACT.md` directs readers to the operational details. The reference to `mcp__worldloom__get_record_field` requires SPEC-16 §C3 to have shipped (the tool must exist when this prose lands).

**`docs/CONTEXT-PACKET-CONTRACT.md`** — append a §Index + Follow-Up Retrieval Pattern subsection (placed after §Assembly Discipline and before §Example Roles) naming the pattern explicitly:
> The context packet's five content layers (`local_authority` through `impact_surfaces`; `task_header` is metadata) deliver an INDEX of locality-relevant nodes plus body-preview snippets sufficient for ranking and citation, not the full bodies of every node. Skills that need the full body of a load-bearing node retrieve it via `mcp__worldloom__get_record(record_id)`; skills that need a single field of a large record retrieve it via `mcp__worldloom__get_record_field(record_id, field_path)`. This pattern keeps single-response packet sizes within model-context budgets while preserving FOUNDATIONS §Tooling Recommendation completeness guarantees: the packet identifies WHAT must be retrieved; targeted retrieval delivers the content.

**`tools/world-mcp/README.md` §Tools** — under `get_context_packet`, add a one-sentence cross-reference: "See `docs/CONTEXT-PACKET-CONTRACT.md` §Index + Follow-Up Retrieval Pattern for the documented retrieval pattern that complements packet assembly."

**`docs/MACHINE-FACING-LAYER.md`** — under the existing `## Retrieval Tool Scope` subsection (line 58; added by SPEC-15 Track B3), add a "Recommended composition" note pointing to the same pattern: packet first (locality survey), then `get_record` / `get_record_field` for full bodies of load-bearing nodes the packet cites. Cross-reference `docs/CONTEXT-PACKET-CONTRACT.md` §Index + Follow-Up Retrieval Pattern.

**Backwards compatibility**: pure-additive prose. No code change. Existing skills that already use the index + follow-up pattern (e.g., `canon-addition` post-SPEC-15) need no edits. Skills that have not yet adopted the pattern continue to work; FOUNDATIONS now explicitly endorses what they already do.

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| Rule 6 (No Silent Retcons) | aligns | Track C1 confirms that the structured `modification_history[]` field is the canonical audit log. Rule 6's "all canon changes must be logged with justification" is satisfied by the structured field; the deprecated notes-paragraph convention was redundant. |
| §Tooling Recommendation ("agents should always receive...") | aligns (after Track C2 amendment) | Track C2 closes the prose-vs-behavior gap by codifying the index + follow-up pattern as the documented mechanism for delivering the required content set. |
| §Canonical Storage Layer (atomic YAML; engine-only writes) | aligns | Track C1's adoption of `modification_history[]` as the canonical audit surface keeps the engine's mutation surface narrow (one field, one op) — coherent with atomic-record discipline. Engine emits no parallel prose mirror. |
| §Machine-Facing Layer (read API replaces ad hoc raw-file loading) | aligns | Track C2's cross-reference to `get_record_field` (delivered by SPEC-16 §C3) extends the machine layer's read-API surface explicitly into FOUNDATIONS prose. |

**FOUNDATIONS amendments required**:
- Track C1: **none**. Rule 6 already endorses structured audit logging; the deprecated notes-paragraph convention was a SKILL.md-level prescription, not a FOUNDATIONS-level requirement.
- Track C2: **one amendment** — §Tooling Recommendation prose softening as detailed under Deliverables.

## Verification

### Track C1

**Positive verification (proves new prose landed)**:
- `grep -n "modification_history\[\] is the canonical" .claude/skills/canon-addition/SKILL.md` returns ≥1 match (the new ADD prose).
- `grep -n "canonical post-SPEC-13 audit surface\|canonical audit surface" .claude/skills/create-base-world/templates/canon-fact-record.yaml` returns ≥1 match (the replaced template comment).
- `grep -n "Audit Trail Discipline" tools/patch-engine/README.md` returns ≥1 match (the new H2 section).
- `grep -n "canonical post-SPEC-13 audit surface" tools/patch-engine/src/ops/append-modification-history-entry.ts` returns ≥1 match (the new header comment).
- `grep -n "canonical post-SPEC-13 audit surface\|deprecation context" tools/validators/src/structural/modification-history-retrofit.ts` returns ≥1 match (the new header comment).

**Removal verification (proves deprecated prescription is gone)**:
- `grep -nE "Modified.*by CH-" .claude/skills/create-base-world/templates/canon-fact-record.yaml` returns 0 matches (the dual-convention prescription removed).
- `grep -nE "notes-field.*line and the\|required together" .claude/skills/create-base-world/templates/canon-fact-record.yaml` returns 0 matches (the "required together" framing removed).

**Defense-in-depth verification (other CF templates remain clean)**:
- `grep -nE "Modified.*by CH-|notes-field" .claude/skills/skill-creator/templates/canon-fact-record.yaml .claude/skills/continuity-audit/templates/canon-fact-record.yaml .claude/skills/canon-addition/references/*.md .claude/skills/canon-addition/SKILL.md` returns 0 matches for the dual-convention pattern (skill-creator + continuity-audit CF templates verified clean at reassessment time; canon-addition surfaces remain free of the prescription except for the new ADD prose, which uses different phrasing).
- `.claude/skills/continuity-audit/SKILL.md` lines 309 and 314 still reference `modification_history` (the structured field) for retcon planning — no edit required, defense-in-depth check.
- `.claude/skills/continuity-audit/templates/retcon-proposal-card.md` lines 131-141 still reference `modification_history` only — no edit required, defense-in-depth check.

**End-to-end behavioral verification**:
- A subsequent canon-addition run produces a CF modification via `append_modification_history_entry` with no parallel notes-paragraph append; `world-validate` returns clean; `continuity-audit`, when next exercised, reads the structured field for retcon planning.

### Track C2

- **SPEC-16 prerequisite check**: confirm `archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md` exists (SPEC-16 archived) AND `mcp__worldloom__get_record_field` is registered in `tools/world-mcp/src/tool-names.ts`. If either check fails, defer the Track C2 ticket.
- `grep -nE "should always receive .*documented context-packet \+ targeted-retrieval pattern|mcp__worldloom__get_record_field" docs/FOUNDATIONS.md` returns the amended receive clause and the `mcp__worldloom__get_record_field` reference.
- `docs/CONTEXT-PACKET-CONTRACT.md` contains the new §Index + Follow-Up Retrieval Pattern subsection.
- `tools/world-mcp/README.md` includes the cross-reference under `get_context_packet`.
- `docs/MACHINE-FACING-LAYER.md` includes the "Recommended composition" note.
- A canon-addition run cites `docs/CONTEXT-PACKET-CONTRACT.md` §Index + Follow-Up Retrieval Pattern as the operational pattern when the agent is asked to justify its retrieval choices (informal evidence; not a gating criterion).

## Out of Scope

- **Auto-sync in engine (C1 Option A)** and **validator-both-directions (C1 Option B)**. Adopted Option C; alternatives are documented here for audit-trail purposes but not implemented.
- **Full bodies in context packet (C2 Option A)** and **`richness` parameter (C2 Option B)**. Adopted Option C; alternatives are documented here but not implemented. If post-SPEC-09 corpus growth makes the index + follow-up pattern painful, a future spec can revisit.
- **Backfilling CF-0024's missing notes paragraph for the CH-0021 modification**. SPEC-15 §Out of Scope already established no backfill; reaffirmed here.
- **Removing pre-SPEC-13 notes paragraphs from historical CFs** (CF-0006, CF-0017, etc., that still carry the dual convention). They remain as historical artifact; no migration. The validator's one-way check (notes → history) continues to enforce consistency for these records.
- **MCP tool additions / extensions**. Scoped to SPEC-16.
- **SPEC-09 epistemic_profile / exception_governance schema blocks**. Scoped to SPEC-09.
- **Hook 3 / Hook 5 changes**. None; this spec is documentation-only.

## Risks & Open Questions

- **Risk: Track C2 ships before SPEC-16 §C3 + §C5**. The FOUNDATIONS amendment cross-references `mcp__worldloom__get_record_field` (delivered by SPEC-16 §C3) and assumes auto-budget UX (SPEC-16 §C5) reduces friction enough to justify the prose softening. Mitigation: the implementation ticket for Track C2 includes an explicit pre-flight check (verify SPEC-16 archived; verify `get_record_field` registered) before applying the FOUNDATIONS edit. If SPEC-16 lands as planned, this risk does not materialize.
- **Risk: Track C1 deprecation surprises a future skill author**. A future skill author authoring a new canon-mutating skill might re-invent the notes-paragraph convention by analogy to pre-SPEC-13 CFs. Mitigation: deprecation prose lands across **five surfaces** a skill author would naturally consult — the create-base-world CF template (where the prescription currently lives), canon-addition SKILL.md, the patch-engine README's new §Audit Trail Discipline section, the `append_modification_history_entry` op-file header comment, and the `modification_history_retrofit` validator file's header comment. Cross-coverage is defense-in-depth; the prescription is removed from the one surface that currently carries it and explicitly named-and-deprecated on four others.
- **Closed cleanup: stale forward-references in `create-base-world/templates/canon-fact-record.yaml`**. The template previously forward-referenced deleted canon-addition surfaces: `canon-addition/templates/canon-fact-record.yaml` and `canon-addition/references/accept-path.md`. Live canon-addition templates now contain only `critic-prompt.md` and `critic-report-format.md`, and its references directory has no `accept-path.md`; those retired surfaces trace to the SPEC-06 atomic-source skill rewrite, which deleted or absorbed the old template/reference files. Track C1 removed the create-base-world forward-references in `archive/tickets/SPEC17AUDTRARET-001.md`; `archive/tickets/SPEC17AUDTRARET-003.md` completed the remaining active-spec truthing so no future implementer treats those deleted canon-addition files as live implementation surfaces.
- **Risk: Track C2 prose softening reads as relaxation of FOUNDATIONS rigor**. The amendment preserves "non-negotiable" framing and adds a documented mechanism, not an exception. Mitigation: the cross-reference to `docs/CONTEXT-PACKET-CONTRACT.md` keeps the operational details external; FOUNDATIONS prose stays principle-level.
- **Open question: should `modification_history_retrofit` validator be removed eventually?** If pre-SPEC-13 CFs are eventually retroactively normalized (notes paragraphs deleted, leaving only `modification_history[]`), the one-way validator becomes unnecessary. Decision: keep the validator indefinitely as cheap defense-in-depth; removing it is YAGNI until a future cleanup spec needs the surface.
- **Open question: ticket prefix.** Tickets under this spec take prefix `SPEC17AUDRET-NNN` (AUDit-trail and RETrieval-contract). Confirmed naming-convention-consistent with SPEC13ATOSRCMIG / SPEC14PAVOC / SPEC15PILFIX / SPEC16MCPRET.

## Implementation order

Within SPEC-17 (full decomposition — two sub-tracks):

1. **SPEC17AUDTRARET-001** — Track C1 (create-base-world CF-template replacement + canon-addition SKILL.md ADD prose + canon-addition references defense-in-depth verify + patch-engine README new §Audit Trail Discipline section + `append_modification_history_entry` op-file header comment + `modification_history_retrofit` validator file header comment + continuity-audit SKILL.md / retcon-proposal-card defense-in-depth verify + skill-creator and continuity-audit CF-template defense-in-depth verify). Completed and archived at `archive/tickets/SPEC17AUDTRARET-001.md`.
2. **SPEC17AUDTRARET-002** — Track C2 (FOUNDATIONS §Tooling Recommendation prose softening + CONTEXT-PACKET-CONTRACT.md subsection + README cross-references + MACHINE-FACING-LAYER.md note). **Pre-flight check**: SPEC-16 §C3 + §C5 archival and `get_record_field` registration were verified before applying the FOUNDATIONS edit. Completed and archived at `archive/tickets/SPEC17AUDTRARET-002.md`.
3. **SPEC17AUDTRARET-003** — Active-spec cleanup for the stale SPEC-06 notes-field row and the deleted canon-addition template/reference explanation. Completed and archived at `archive/tickets/SPEC17AUDTRARET-003.md`.

SPEC-17 in total: ~0.5 session of effort, gated by SPEC-16's archival for Track C2.

## Outcome

Completed: 2026-04-26.

Implemented across the three SPEC-17 tickets:

- `.claude/skills/create-base-world/templates/canon-fact-record.yaml` no longer prescribes the dual notes-paragraph + history-entry convention; `.claude/skills/canon-addition/SKILL.md` carries an explicit ADD-prose statement that `modification_history[]` is canonical; engine README + op-file header comment + validator file header comment carry the deprecation rationale inline.
- `docs/FOUNDATIONS.md` §Tooling Recommendation explicitly endorses the documented context-packet + targeted-retrieval pattern, with cross-reference to `docs/CONTEXT-PACKET-CONTRACT.md`.
- `docs/CONTEXT-PACKET-CONTRACT.md` carries a §Index + Follow-Up Retrieval Pattern subsection.
- A subsequent canon-addition run produces clean modification audit-trails without parallel notes paragraphs; the agent cites the documented retrieval pattern rather than apologizing for it.
- All MCP retrieval-pipeline frictions surfaced by the 2026-04-26 PR-0015 pilot are resolved (SPEC-16 + SPEC-17 jointly).
- `archive/tickets/SPEC17AUDTRARET-003.md` completed the active-spec cleanup for the stale SPEC-06 notes-field row and the deleted canon-addition template/reference explanation.

Deviations from the original plan:

- Track C1 stayed prose/comment-only and did not introduce engine, validator, schema, HARD-GATE, or world-content changes.
- Track C2 waited for SPEC-16 §C3 + §C5 archival and `get_record_field` registration before landing the FOUNDATIONS wording change.
- A third cleanup ticket, `archive/tickets/SPEC17AUDTRARET-003.md`, was added after post-review found stale active-spec references outside the two original implementation tickets.

Verification results:

- SPEC17AUDTRARET-001 positive/removal/defense-in-depth grep proofs passed, and `npm test` from `tools/validators` passed.
- SPEC17AUDTRARET-002 verified SPEC-16 archival, `get_record_field` registration, and the FOUNDATIONS / CONTEXT-PACKET-CONTRACT / world-mcp / MACHINE-FACING-LAYER wording.
- SPEC17AUDTRARET-003 verified `grep -n "notes-field lines" specs/SPEC-06-skill-rewrite-patterns.md` returned zero matches, SPEC-17 deleted-surface references were historical/explanatory only, and `git diff --check` passed.
- `specs/IMPLEMENTATION-ORDER.md` is amended to record C1, C2, and the SPEC17AUDTRARET-003 cleanup archived.
