# SPEC91PAGPLABOD-001: §7 / §7a body translation in bootstrap + turn-cycle phase references

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md`, `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`, `.claude/skills/_shared-templates/story-state-contract.md` §8 row for §7 and §7a.
**Deps**: None

## Problem

Before this ticket, page-plan §7 ("Selected Event and State Delta") emitted engine YAML in the renderer-facing body: `state_delta.create` / `state_delta.supersede` / `state_delta.close` arrays as headings, verbatim YAML fragments for `record_introductions` / `state_relations` / `non_propagation_facts`, and `world_logic_rationale` prose densely citing record IDs. The same pathology appeared in §7a's Active-pressure disposition table rows. The external prose renderer reads §7 / §7a cold and could import the abstract vocabulary into the rendered prose (verified at PG-2 §7 and PG-3 prose of `worlds/erotica-world/stories/red-bunny/`). The shared story-state contract already stated that "the plan must not expose engine jargon to prose; engine terms confined to §15 frontmatter only", but §7 and §7a body authoring guidance in both phase references had not followed through. This ticket extended the PPLAN-005/006 translation pattern (which translated §15 SLT schema and §10 OBL/CNSQ/THR engine vocabulary into prose direction) to §7 and §7a's body content; engine record-IDs and YAML fragments now move to §15 frontmatter where they already partially live.

## Assumption Reassessment (2026-05-26)

<!-- Items 1-3 always required. Items 4+ from menu, renumbered sequentially. -->

1. **Codebase reference check**: `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md`, `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`, and `.claude/skills/_shared-templates/story-state-contract.md` exist and now carry the §7 / §7a body-translation guidance. Page-plan minimum contract at §8 documents the 19-section structure including §7 "Selected event and state delta" and §7a "Turn driver / initiative trace". Sample page plans at `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-{1..5}.md` were historical evidence for the pathology (for example PG-2 §7 contained literal `state_delta.create/supersede/close` headings + YAML fragments).
2. **Spec reference**: SPEC-91 §6 (`§7 — Selected Event and State Delta (body translation)` + `§7a — Turn driver / initiative trace (table cell translation)`) and §11 SPEC91-001 specify the body-translation contract — engine YAML moves to §15 frontmatter; body content becomes prose direction. §7a closed-vocabulary `Driver kind:` / `Initiator:` / `Player response mode:` / `POV visibility:` / `Observer-firewall note:` lines stay (validator-enforced by `active_pressure_handling_discipline`).
3. **Cross-skill boundary**: shared `.claude/skills/_shared-templates/story-state-contract.md` §8 (Page Plan Minimum Contract) is the canonical authority both bootstrap and turn-cycle reference for §7 / §7a content; edits must land in story-state-contract.md AS WELL AS in the per-skill phase references so the contract and the procedural prose stay aligned. The `active_pressure_handling_discipline` validator at `tools/validators/src/structural/active-pressure-handling-discipline.ts` enforces the §7a table cell shape (`disposition` closed-set + `Reason / expiry` closed connective set) — body-translation rewording must NOT alter the cells the validator checks.
4. **FOUNDATIONS principle restatement**: §Story Bundles §4 (Pipeline shape: plan + (optional) prose-attach) declares that "its body inlines all canonical context the external renderer needs" — single-artifact architecture where the plan IS the renderer's prompt. This ticket preserves that contract: the §7 / §7a body still inlines all canonical context the renderer needs, now in prose-direction form rather than engine-YAML form. Engine record-IDs do not disappear — they relocate to §15 frontmatter (where Rule 1's grounding requirements operate per FOUNDATIONS §Validation Rules Rule 1 carve-out for plan-as-load-bearing-engine-output).

## Architecture Check

1. **Why prose-direction body translation is cleaner**: the current shape forces the external prose renderer (reading cold context, no cross-plan state) to mentally translate engine YAML into character interior and scene movement. The body-translation contract pre-translates that work at plan-authoring time, where the operator has the full causal context and can frame the change in render-usable terms. PPLAN-005/006 proved this pattern at §15 (SLT schema) and §10 (OBL/CNSQ/THR); extending to §7 / §7a applies the same proven approach.
2. **No backwards-compatibility shims**: existing pre-SPEC-91 page plans (PG-1 through PG-5 in red-bunny) remain as-is per SPEC-91 §9 Migration / scope; the new authoring contract is forward-only. No dual-mode parser or §7 / §7a content-shape compatibility layer is introduced. Mid-bundle continuation works because §14 (next ticket SPEC91PAGPLABOD-003) provides parent-page-summary regardless of parent §7 shape.

## Verification Layers

1. **§7 body content shape (post-translation)** → manual review of new authoring guidance + grep-proof that updated phase references describe the "what changed in [actor]'s interior this page" prose form rather than the `state_delta.create/supersede/close` YAML form.
2. **§7a Reason / expiry cell shape preservation** → manual review + grep-proof that the `active_pressure_handling_discipline` cell-shape language remains in the turn-cycle reference and the shared contract still names the validator-enforced cell shape. No sample plan was authored in this ticket; validator execution lands with SPEC91PAGPLABOD-005.
3. **Contract-to-phase-reference alignment** → codebase grep-proof that story-state-contract.md §8 row for §7 and §7a matches the body-translation framing in both phase reference files.
4. **Rule 1 grounding preservation** → manual review confirming engine record-IDs relocated from §7 body to §15 frontmatter still satisfy the FOUNDATIONS §Rule 1 plan-as-load-bearing-engine-output carve-out (every state-delta record id remains greppable from §15).

## Landed Changes

### 1. Updated `.claude/skills/_shared-templates/story-state-contract.md` §8

The §8 rows for §7 and §7a now describe the prose-direction body shape rather than the engine YAML shape. A new §7 sub-section after §8's table describes §7 body authoring discipline: engine YAML (`state_delta.create/supersede/close`, `record_introductions[]`, `state_relations[]`, `non_propagation_facts[]`, `world_logic_rationale` with record-ID density) moves to §15 frontmatter; body becomes prose direction in the "what changed in [actor]'s interior this page" form per SPEC-91 §6 worked example.

The §7a row and sub-section now note that the fixed-line driver rows and closed-set disposition table cell shape remain validator-enforced (per `active_pressure_handling_discipline`); only the Reason / expiry cell prose may be reworded to use prose anchors instead of bare record-ID rationale where possible.

### 2. Updated `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md`

Added §7 / §7a authoring guidance under Phase 8 prose: it describes the body-translation contract per SPEC-91 §6 §7 subsection; includes the canonical "what changed in [actor]'s interior this page" prose template; and explicitly notes that engine YAML moves to §15 frontmatter. The existing Phase 8 prose still enumerates §1-§16a section content briefly, with §7 / §7a now extended by a worked example showing the prose-direction body shape.

### 3. Updated `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`

Added §7 / §7a body-translation guidance per SPEC-91 §6 §7 / §7a subsection. Turn-cycle's Phase 7 prose now describes §7 as prose-facing scene, pressure, outcome, and state-change direction, then gives the body-translation framing and worked example.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (modify)

## Out of Scope

- Rewriting existing PG-1 through PG-5 in `worlds/erotica-world/stories/red-bunny/pages-prose-plans/` — per SPEC-91 §9 Migration / scope, the new contract is forward-only.
- Modifying the closed enums governing `SE.state_delta.create/supersede/close` lifecycle, `record_introductions[].trigger` taxonomies, or the predicate DSL — body rendering changes; underlying record schemas do not.
- §9 / §9b / §9c / §10b body translation — covered by SPEC91PAGPLABOD-002.
- §14 restructure — covered by SPEC91PAGPLABOD-003.
- New plan-body engine-vocabulary validator — covered by SPEC91PAGPLABOD-005.
- Touching the `active_pressure_handling_discipline` validator's cell-shape rules — the validator continues to enforce the closed-set `disposition` and `Reason / expiry` connectives unchanged.

## Acceptance Criteria

### Tests That Must Pass

1. **Contract-to-phase-reference alignment grep**: `grep -A2 "Selected event and state delta\|Turn driver / initiative trace" .claude/skills/_shared-templates/story-state-contract.md` returns the body-translation framing; the same framing surfaces in both bootstrap phase-8-9 and turn-cycle phase-7 reference files.
2. **Phase-reference authoring guidance includes §7 worked example**: `grep -A5 "what changed in.*interior this page\|state delta.*moves to §15" .claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` returns matches in both files.
3. **§7a closed-set validator rules preserved**: `grep -B1 -A3 "active_pressure_handling_discipline" .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` returns the validator-enforced cell-shape language unchanged.

### Invariants

1. **Engine record-IDs remain greppable from §15** (Rule 1 grounding): any record-ID moved out of §7 body must be preserved in §15 frontmatter so plan-as-load-bearing-engine-output discipline is satisfied.
2. **§7a `active_pressure_handling_discipline` validator continues to pass**: the closed-set `disposition` vocabulary (`selected | deferred | rejected`) and the `Reason / expiry` closed connective set (literal `PG-<integer>` reference OR `after | before | if | once | until | when`) remain validator-enforced. Body-translation rewording inside the Reason cell does not alter the closed-set semantics.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -B1 -A3 "Selected event and state delta\|Turn driver / initiative trace" .claude/skills/_shared-templates/story-state-contract.md` — confirms contract §8 rows carry the body-translation framing.
2. `grep -E "what changed in|moves to §15" .claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` — confirms both phase references describe the body-translation contract.
3. The validator-side verification (that `active_pressure_handling_discipline` continues to pass under the new wording) lands at SPEC91PAGPLABOD-005's end-to-end PG-6 authoring test, where a new plan authored under the SPEC-91 contract is validated; this ticket relied on the documentation-grep proofs above for its own acceptance.

## Outcome

Completed 2026-05-26. The shared story-state contract and both page-plan authoring references now instruct authors to render §7 as prose-facing state-change direction while keeping machine-readable state-delta arrays, lifecycle bookkeeping, and record-id-heavy rationale in §15 frontmatter / the underlying `SE` record. The §7a guidance keeps the validator-enforced driver rows and disposition table shape intact while steering Reason / expiry prose away from bare record-id rationale where possible.

## Verification Result

1. `grep -B1 -A3 "Selected event and state delta\|Turn driver / initiative trace" .claude/skills/_shared-templates/story-state-contract.md` — PASS; contract §8 rows and the new §7 / §7a sections show the body-translation framing.
2. `grep -E "what changed in|moves to §15" .claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` — PASS; both phase references describe the body-translation contract.
3. `grep -B1 -A3 "active_pressure_handling_discipline" .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` — PASS; the shared contract and turn-cycle reference preserve the validator-enforced cell-shape language.

## Deviations

- No executable validator sample plan was authored for this documentation-only ticket. The full validator-side PG-6 proof was later closed by `archive/tickets/SPEC91PAGPLABOD-005.md`.
