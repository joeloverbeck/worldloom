<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-17: Audit-Trail and Retrieval-Contract Clarifications

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
- **Load-bearing-ness check verified**: `continuity-audit/SKILL.md:314` and `continuity-audit/templates/retcon-proposal-card.md:131-141` reference `modification_history` (the structured field) for retcon planning and audit-trail tracking, NOT the notes paragraph. No current skill reads the notes paragraph for any audit purpose. The convention is pure human-ergonomics on visual scanning of a CF YAML file.
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

### Track C1: SKILL.md update + README clarification

**`.claude/skills/canon-addition/SKILL.md`** — locate any prose that prescribes the `Modified YYYY-MM-DD by CH-NNNN (CF-NNNN): <summary>` notes-paragraph convention (search terms: `Modified .* by CH-`, `notes paragraph`, `modification.*notes`). Replace with prose explicitly stating the post-SPEC-13 convention: `modification_history[]` is the canonical structured audit surface; the engine's `append_modification_history_entry` op writes only to that field; skills do NOT also append a parallel notes paragraph. Cite this spec for the decision context.

**`.claude/skills/canon-addition/references/`** — if any reference file (e.g., `proposal-normalization.md`) duplicates the notes-paragraph convention, update it the same way. The retrieval-tool tree (added by SPEC15PILFIX-002) is unaffected.

**`.claude/skills/continuity-audit/SKILL.md`** — verify lines 309 and 314 already reference `modification_history` (the structured field) for retcon planning. No edit required if verification passes; this is a defense-in-depth check that the deprecated convention isn't load-bearing here.

**`.claude/skills/continuity-audit/templates/retcon-proposal-card.md`** — verify lines 131-141 reference `modification_history` only. No edit required if verification passes.

**`tools/patch-engine/README.md`** (or wherever the `append_modification_history_entry` op is documented) — add a sentence to the op's description: "This op writes only to `modification_history[]`. Post-SPEC-13, `modification_history[]` is the canonical audit surface for CF retroactive modifications; the engine does NOT mirror entries into the `notes` field. Pre-SPEC-13 CFs may carry dual notes-paragraph + history-entry records as historical artifact; new modifications use the structured field only."

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

**`docs/CONTEXT-PACKET-CONTRACT.md`** — append a §Index + Follow-Up Retrieval Pattern subsection naming the pattern explicitly:
> The context packet's five layers deliver an INDEX of locality-relevant nodes plus body-preview snippets sufficient for ranking and citation, not the full bodies of every node. Skills that need the full body of a load-bearing node retrieve it via `mcp__worldloom__get_record(record_id)`; skills that need a single field of a large record retrieve it via `mcp__worldloom__get_record_field(record_id, field_path)`. This pattern keeps single-response packet sizes within model-context budgets while preserving FOUNDATIONS §Tooling Recommendation completeness guarantees: the packet identifies WHAT must be retrieved; targeted retrieval delivers the content.

**`tools/world-mcp/README.md` §Tools** — under `get_context_packet`, add a one-sentence cross-reference: "See `docs/CONTEXT-PACKET-CONTRACT.md` §Index + Follow-Up Retrieval Pattern for the documented retrieval pattern that complements packet assembly."

**`docs/MACHINE-FACING-LAYER.md`** — under the existing "scope of each retrieval tool" subsection (added by SPEC-15 Track B3), add a "Recommended composition" note pointing to the same pattern: packet first (locality survey), then `get_record` / `get_record_field` for full bodies of load-bearing nodes the packet cites.

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

- `grep -rn "Modified.*by CH-.*\\(CF-" .claude/skills/canon-addition/` returns no instructional prose prescribing the notes-paragraph convention (the search may still match historical examples in fixture files; verify hits are not normative prose).
- `.claude/skills/canon-addition/SKILL.md` and any updated `.claude/skills/canon-addition/references/*.md` contain prose explicitly naming `modification_history[]` as the canonical post-SPEC-13 audit surface and explicitly noting the engine does NOT mirror to `notes`.
- `tools/patch-engine/README.md` (or equivalent op-documentation surface) carries the engine-side clarification.
- `tools/validators/src/structural/modification-history-retrofit.ts` carries a header comment noting the deprecation context (so a future reader doesn't re-add the reverse-direction check).
- A subsequent canon-addition run produces a CF modification via `append_modification_history_entry` with no parallel notes-paragraph append; `world-validate` returns clean; `continuity-audit`, when next exercised, reads the structured field for retcon planning.

### Track C2

- **SPEC-16 prerequisite check**: confirm `archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md` exists (SPEC-16 archived) AND `mcp__worldloom__get_record_field` is registered in `tools/world-mcp/src/tool-names.ts`. If either check fails, defer the Track C2 ticket.
- `grep -A3 "should always receive" docs/FOUNDATIONS.md` returns the amended prose including the "or via the documented context-packet + targeted-retrieval pattern" clause.
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
- **Risk: Track C1 deprecation surprises a future skill author**. A future skill author authoring a new canon-mutating skill might re-invent the notes-paragraph convention by analogy to pre-SPEC-13 CFs. Mitigation: the engine-side README clarification + the SKILL.md prose update + the validator file's header comment cover all three surfaces a skill author would naturally consult; cross-coverage is sufficient defense-in-depth.
- **Risk: Track C2 prose softening reads as relaxation of FOUNDATIONS rigor**. The amendment preserves "non-negotiable" framing and adds a documented mechanism, not an exception. Mitigation: the cross-reference to `docs/CONTEXT-PACKET-CONTRACT.md` keeps the operational details external; FOUNDATIONS prose stays principle-level.
- **Open question: should `modification_history_retrofit` validator be removed eventually?** If pre-SPEC-13 CFs are eventually retroactively normalized (notes paragraphs deleted, leaving only `modification_history[]`), the one-way validator becomes unnecessary. Decision: keep the validator indefinitely as cheap defense-in-depth; removing it is YAGNI until a future cleanup spec needs the surface.
- **Open question: ticket prefix.** Tickets under this spec take prefix `SPEC17AUDRET-NNN` (AUDit-trail and RETrieval-contract). Confirmed naming-convention-consistent with SPEC13ATOSRCMIG / SPEC14PAVOC / SPEC15PILFIX / SPEC16MCPRET.

## Implementation order

Within SPEC-17 (full decomposition — two sub-tracks):

1. **SPEC17AUDRET-001** — Track C1 (SKILL.md update + canon-addition references update + patch-engine README clarification + validator file header comment + continuity-audit verification). May land independently of SPEC-16. Estimated: 0.25 session.
2. **SPEC17AUDRET-002** — Track C2 (FOUNDATIONS §Tooling Recommendation prose softening + CONTEXT-PACKET-CONTRACT.md subsection + README cross-references + MACHINE-FACING-LAYER.md note). **Pre-flight check**: verify SPEC-16 §C3 + §C5 archived before applying FOUNDATIONS edit. Estimated: 0.25 session.

SPEC-17 in total: ~0.5 session of effort, gated by SPEC-16's archival for Track C2.

## Outcome

To be recorded after the two tickets complete. Expected post-completion state:

- `.claude/skills/canon-addition/SKILL.md` (and any reference files) drop the notes-paragraph convention; engine and validator surfaces carry the deprecation rationale inline.
- `docs/FOUNDATIONS.md` §Tooling Recommendation explicitly endorses the documented context-packet + targeted-retrieval pattern, with cross-reference to `docs/CONTEXT-PACKET-CONTRACT.md`.
- `docs/CONTEXT-PACKET-CONTRACT.md` carries a §Index + Follow-Up Retrieval Pattern subsection.
- A subsequent canon-addition run produces clean modification audit-trails without parallel notes paragraphs; the agent cites the documented retrieval pattern rather than apologizing for it.
- All MCP retrieval-pipeline frictions surfaced by the 2026-04-26 PR-0015 pilot are resolved (SPEC-16 + SPEC-17 jointly).

`specs/IMPLEMENTATION-ORDER.md` is amended to reference the archived spec and tickets at completion.
