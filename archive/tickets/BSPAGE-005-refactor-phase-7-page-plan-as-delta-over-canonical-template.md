# BSPAGE-005: Refactor `phase-7-page-plan.md` as a delta over the canonical shared template

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — documentation refactor inside `.claude/skills/branching-story-page-cycle/references/`.
**Deps**: None.

## Problem

`references/phase-7-page-plan.md:31-159` re-enumerates the §1-§19 plan body that already lives in the canonical shared template at `.claude/skills/_shared-templates/page-plan.md`. The two enumerations describe the same plan body with mostly identical "INLINE: …" inline-everything instructions. The only material difference is the selected-arc case (page-cycle non-root, `selected_arc_id != null`): §15 is REQUIRED, §15-alt is OMITTED, §16 is REQUIRED, and the frontmatter shape carries non-null `selected_arc_id` / `chosen_variant_id` / `required_effects[]`.

Maintaining two parallel enumerations is a drift hazard — any edit to the canonical plan template must remember to land in page-cycle's parallel copy, and silent drift between the two would make a page-cycle plan structurally non-conformant to the renderer's expectation. The shared template is the right authority; page-cycle's Phase 7 reference should describe the selected-arc-case delta, not re-derive the whole plan body.

This finding exactly mirrors the bootstrap finding fixed by **BSBOOT-027** (archived) — same pattern, different file. The 2026-05-11 bootstrap-audit triage at `docs/triage/2026-05-11-bootstrap-skill-audit-triage.md:33` explicitly named this as a follow-up: *"A BSPAGE-NN ticket is the natural follow-up if the user wants the page-cycle surface cleaned to the same standard."*

## Assumption Reassessment (2026-05-11)

1. `references/phase-7-page-plan.md:31-159` inline the LLM prompt assembly block and `Frontmatter shape (selected-arc case):` + `Body shape (selected-arc case):` enumerations of §1-§19. Confirmed by direct read of `references/phase-7-page-plan.md`.
2. `.claude/skills/_shared-templates/page-plan.md:21-220` document §1-§19 with conditional comments on §15 / §15-alt / §16 that already cover both the bootstrap-root case (`selected_arc_id == null`) and the page-cycle non-root case (`selected_arc_id != null`). Confirmed by direct read. The canonical template's §15 comment says `CONDITIONAL: present when frontmatter selected_arc_id != null` and §15-alt's comment says `CONDITIONAL: present when frontmatter selected_arc_id == null (bootstrap PG-0001 root case); replaces §15 and §16`.
3. Shared boundary: the canonical template `.claude/skills/_shared-templates/page-plan.md` is the single source of truth for the plan body across:
   - `branching-story-bootstrap` Phase 7 (LLM prompt assembly, post-BSBOOT-027)
   - `branching-story-page-cycle` Phase 7 (LLM prompt assembly — this ticket's target)
   - `branching-story-page-prose-finalize` Phase 1 (plan/prose pairing; reads `state_hash_at_plan_time`)
   - Phase 7.5 declared-affordance validator (frontmatter readout)
   - External prose renderer (reads §1-§19 verbatim)
   Refactoring `phase-7-page-plan.md` to a delta-over-template description does not break any of these consumers; they continue to read the canonical template as the source of truth.
4. The selected-arc-case delta is small enough — about 3-4 sections diverge from the bootstrap-root case (§15 present, §15-alt omitted, §16 present, frontmatter non-null shape) — that listing them is materially shorter than re-inlining §1-§19. Net reduction: ~50-70 lines (mirroring BSBOOT-027's bootstrap-side ~50-line reduction).
5. Cross-skill consumer check: external citations of `phase-7-page-plan.md` are from `phase-7-page-plan.md`'s own `## Cross-references` block back-pointing to itself (no other skill cites this file path directly). Confirmed by `grep -rn "branching-story-page-cycle/references/phase-7-page-plan" .claude/skills/ docs/ specs/` returning intra-skill matches only. Refactoring this file does not break sibling-skill citations.
6. The "Plan-completeness post-LLM check" block (`references/phase-7-page-plan.md:165-177`) names the deterministic checks Phase 7 runs after the LLM produces the plan; this content is page-cycle-specific operational discipline and stays.
7. The "Emit PG-NNNN record into working buffer" block (`references/phase-7-page-plan.md:181-191`) names the new plan-vs-prose split PG schema fields (`prose_plan_path`, `prose_path`, `prose_status`, `deferred_validation_trace`, `state_snapshot.arc_trace_id`, `state_snapshot.arc_trace_emitted`); this is page-cycle-specific and stays.
8. The "Selected-arc mode for non-root pages" block (`references/phase-7-page-plan.md:9-19`) describes the page-cycle non-root specialization; the conceptual framing stays, but explicit body-shape enumeration moves to a delta-only description.
9. Mismatch + correction: lines 31-159 (the LLM prompt assembly block + Frontmatter / Body shape enumerations) are the duplicative block; the surrounding page-cycle-specific blocks stay.

## Architecture Check

1. The canonical template `.claude/skills/_shared-templates/page-plan.md` was created (post-BSBOOT-027) to be the single source of truth for plan body structure across bootstrap, page-cycle, finalize, the affordance validator, and the external renderer. Page-cycle's Phase 7 reference re-describing the same body undermines that single-source intent. The refactor aligns the page-cycle surface to the same standard as the bootstrap surface.
2. The delta shape (which sections / frontmatter fields change in the selected-arc case) is documented well enough by the canonical template's existing conditional comments that page-cycle's reference can cite them rather than re-enumerating.
3. No backwards-compatibility aliasing introduced. The deleted text is replaced with a pointer + delta, not a stub.

## Verification Layers

1. Post-edit, `references/phase-7-page-plan.md` cites the canonical template path verbatim in the LLM prompt assembly block → `grep -c "_shared-templates/page-plan.md" .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` returns ≥1 (codebase grep-proof).
2. Post-edit, the delta described in the LLM prompt assembly block enumerates ONLY the selected-arc-case-specific section differences (§15 REQUIRED, §15-alt OMITTED, §16 REQUIRED) and the selected-arc-case frontmatter shape (`selected_arc_id != null`, `chosen_variant_id != null`, `required_effects: [...]`, etc.) — not the full §1-§19 body description → manual review.
3. Post-edit, the "Plan-completeness post-LLM check" block (currently at lines 165-177), the "Emit PG-NNNN record into working buffer" block (currently at lines 181-191), and the "Selected-arc mode for non-root pages" framing block (currently at lines 9-19) remain unchanged in semantics → manual diff.
4. The canonical shared template `.claude/skills/_shared-templates/page-plan.md` continues to document §1-§19 with conditional `selected_arc_id == null` / `!= null` comments — no edit needed there → manual review (no change to the shared template; verify the conditional comments cover the page-cycle selected-arc case the same way they cover the bootstrap-root case).
5. Cross-skill check: no sibling skill citation of `phase-7-page-plan.md` breaks after the refactor → `grep -rn "branching-story-page-cycle/references/phase-7-page-plan" .claude/skills/ docs/ specs/` should still return the same set of citations (only intra-skill from this file's own Cross-references block).

## What to Change

### 1. Replace lines 31-159 of `references/phase-7-page-plan.md` with a delta block

Current shape (paraphrased): the file's "Plan authoring — populate the canonical template" subsection contains an "LLM prompt assembly for plan authoring" code block followed by `Frontmatter shape (selected-arc case):` and `Body shape (selected-arc case):` enumerations re-describing every section.

Replacement shape:

- Keep the prompt-assembly inputs block (`[content_policy block ...]`, `[story kernel ...]`, `[PROSE CRAFT CONTRACT ...]`, `[cast bound ...]`, `[state context ...]`, `[selected arc record ...]`, `[chosen variant ...]`, `[recent prose continuity ...]`, `[governor_nudge ...]`, `[scene direction ...]`, `INSTRUCTION:` framing) intact — these are the operator's job description.
- Replace the inline `Frontmatter shape (selected-arc case):` enumeration with one paragraph: `The frontmatter required keys and their shapes are documented at .claude/skills/_shared-templates/page-plan.md (frontmatter block). At the page-cycle selected-arc case, populate the frontmatter exactly as the canonical template specifies, with these selected-arc-case-specific values:` followed by a short bullet list: `selected_arc_id: SLT-NNNN`, `chosen_variant_id: <variant id>`, `required_effects: [...]` (variant.required_effects verbatim), `parent_page_id: <parent PG-NNNN>`, `branch_id: <BR-NNNN — new on fork, existing logical_id on continuation>`, `branch_path: <parent.branch_path + [PG-NNNN]>`, `state_hash_at_plan_time: <PG-NNNN.state_hash from working buffer>`, `canon_revision_at_plan_time: <PG-NNNN.state_snapshot.canon_revision>`, `prose_status: pending`, `deferred_validation_trace: all three keys set to "DEFERRED — awaiting prose render"`.
- Replace the inline `Body shape (selected-arc case):` enumeration with one paragraph: `The body sections §1 through §19 are documented at .claude/skills/_shared-templates/page-plan.md (markdown body). At the page-cycle selected-arc case, populate every section per the canonical template, with the following selected-arc-case deviations:` followed by a short bullet list:
  - `§14 Recent prose continuity: inline the last 1-2 rendered pages along parent.branch_path verbatim; the §14 hard pre-flight block guarantees parent.prose_status == "rendered" so the section is always non-empty.`
  - `§15 Selected scene-commitment arc: REQUIRED. Inline the full Phase-4-selected SLT-NNNN record verbatim (arc_contract, dramatic_unit, beat_plan, execution_envelope, stop_policy.normal_exits, effect_model.variants[]).`
  - `§15-alt Entry pressure framing: OMITTED in the selected-arc case.`
  - `§16 Chosen variant for this turn: REQUIRED. Inline the chosen variant's id + variant.required_effects[] verbatim.`
  - `§17 Governor nudge: inline the Phase 6 homeostat signal verbatim.`
- Keep the closing sentence about "Every record id referenced in any plan section MUST be inlined verbatim in that section. Bare CF-NNNN / CHAR-NNNN / SLT-NNNN / OBL-NNNN / etc. references are plan-completeness failures (Phase 9 gate `plan_completeness_check`)" — that statement is the page-cycle-specific inlining rule and stays.

### 2. Cross-reference block update

At the file's `## Cross-references` section (currently at lines 195-205), promote the canonical-template citation to the top and update the prose to say: `Canonical plan template — single source of truth for §1-§19 body and frontmatter shape; this reference describes the page-cycle selected-arc-case delta only.`

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` (~50-70 line reduction in lines 31-159; ~3 line update in Cross-references block).

## Acceptance Criteria

- `wc -l .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` is materially smaller than its pre-edit 205 lines (target: ~135-150 lines post-edit, net ~50-70 lines removed).
- `grep -c "_shared-templates/page-plan.md" .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` returns ≥2 (LLM prompt assembly block + Cross-references block).
- The "Selected-arc mode for non-root pages", "Plan-completeness post-LLM check", "Emit PG-NNNN record into working buffer", and "Cross-references" sections remain semantically unchanged → manual diff.
- The shared template `_shared-templates/page-plan.md` is unmodified by this ticket → `git diff .claude/skills/_shared-templates/page-plan.md` returns empty.

## Test Plan

- Read the post-edit `phase-7-page-plan.md` end-to-end and confirm it reads as a delta-over-canonical-template rather than a parallel enumeration.
- Confirm that an LLM-author following the post-edit reference can correctly produce a selected-arc-case plan by reading the canonical template plus the delta — no surprise gaps.
- Verify the post-edit ticket structurally mirrors BSBOOT-027's bootstrap-side refactor (compare diff shapes by manual review).
