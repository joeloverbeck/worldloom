# SPEC26STOCOHHAR-009: Reconcile docs/FOUNDATIONS.md to SPEC-26 changes

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `docs/FOUNDATIONS.md` (the project-wide design contract) and `archive/specs/SPEC-26-story-coherence-hardening-ii.md` (same-seam implementation note). No code or skill change.
**Deps**: archive/tickets/SPEC26STOCOHHAR-002.md, archive/tickets/SPEC26STOCOHHAR-003.md, archive/tickets/SPEC26STOCOHHAR-005.md

## Problem

At intake, `docs/FOUNDATIONS.md` §Story Bundles was stale against the landed story-state contract. SPEC-26 D8 reconciled three things: §5's Rule-1 example list did not yet name `SE.resolution`; the §5 branch-isolation discussion still carried the crude "`created_at_page` is non-null" formulation rather than the `bundle_genesis_record` / `branch_local_record` vocabulary; and §5c needed a note that the causal-dependency threat scan is the engine-scope expression of Rule 5. This ticket landed last so it reconciles the final contract state.

## Assumption Reassessment (2026-05-14)

1. At intake, verified against `docs/FOUNDATIONS.md` §Story Bundles §5 / §5c: the load-bearing story-state field examples did not name `SE.resolution`, the branch-isolation paragraph carried the crude "`created_at_page` is non-null" formulation, and §5c did not yet state the causal-dependency threat scan as the Rule 5 engine-scope expression.
2. Verified against `archive/specs/SPEC-26-story-coherence-hardening-ii.md` D8: D8 had three parts — (a) extend §5's Rule-1 examples to include `SE.resolution`; (b) reference the `bundle_genesis_record` / `branch_local_record` vocabulary in the §5 branch-isolation discussion; (c) decide whether to note in §5c that the D4 causal-dependency threat scan is the schema-/engine-scope expression of Rule 5 at story scope. The Deps (`archive/tickets/SPEC26STOCOHHAR-002.md` / `archive/tickets/SPEC26STOCOHHAR-003.md` / `archive/tickets/SPEC26STOCOHHAR-005.md`) are the tickets that landed the vocabulary, the `SE.resolution` field, and the threat scan respectively; D8 reconciled FOUNDATIONS to *their landed state*.
3. Cross-skill / cross-artifact boundary under audit: `docs/FOUNDATIONS.md` §Story Bundles §5 / §5c is the project-wide design contract; the shared surface is the §5 example list and branch-isolation phrasing, which must agree with `.claude/skills/_shared-templates/story-state-contract.md` (the story-record schema authority per §5b). This ticket changed `FOUNDATIONS.md` and added a same-seam SPEC-26 D8 implementation note; the contract and skills were landed by `archive/tickets/SPEC26STOCOHHAR-002.md` / `archive/tickets/SPEC26STOCOHHAR-003.md` / `archive/tickets/SPEC26STOCOHHAR-005.md`.
4. FOUNDATIONS principle under audit: Rule 1 (No Floating Facts) — §5 enumerates Rule-1-required story-bundle schema fields as examples; `SE.resolution` is a Rule-1 grounding field (it grounds a non-accept outcome's result and player-visible consequence), so its absence from the §5 example list is a documentation gap this ticket closes. Rule 4 (No Globalization by Accident) — the §5 branch-isolation discussion governs Rule 4 at story scope; aligning its vocabulary with the contract's `branch_local_record` definition keeps the FOUNDATIONS text and the contract using one vocabulary.
5. HARD-GATE / Canon Safety surface (per `tickets/README.md` check 9): `docs/FOUNDATIONS.md` is the design contract that *defines* the Mystery Reserve firewall (Rule 7, line 426) and the Canon Layers. Confirmed: this ticket's edits are confined to §Story Bundles §5 (Rule-1 examples + branch-isolation vocabulary) and the §5c causal-threat-scan note — it does NOT touch Rule 7, the Mystery Reserve definition, the HARD-GATE discipline, or any Canon Safety Check definition. The firewall is unchanged; the edits are additive documentation reconciliation.
6. Same-seam explicit spec reference: the user supplied `specs/SPEC-26*` as authority. The live spec already has dated D2/D3/D4 implementation notes and D8 still states the intended FOUNDATIONS reconciliation. This ticket therefore also owns adding a dated D8 implementation note to `archive/specs/SPEC-26-story-coherence-hardening-ii.md`; broad row-by-row rewriting of historical deliverable/proof text remains out of scope.

## Architecture Check

1. Reconciling `FOUNDATIONS.md` last — after 002 / 003 / 005 land — is cleaner than reconciling speculatively: the §5 examples and §5c note then describe *landed* state, not proposed state, so the design contract never documents a field or check that does not yet exist. Aligning the §5 branch-isolation vocabulary with the contract removes a two-vocabulary drift between FOUNDATIONS and `story-state-contract.md`.
2. No backwards-compatibility aliasing or shims — the crude "`created_at_page` is non-null" phrasing is replaced by the `branch_local_record` vocabulary, not kept alongside it.

## Verification Layers

1. §5 names `SE.resolution` in the Rule-1 examples -> codebase grep-proof: `SE.resolution` appears in `docs/FOUNDATIONS.md` §Story Bundles §5's load-bearing-field example list.
2. The branch-isolation discussion uses the shared vocabulary -> codebase grep-proof: the §5 branch-isolation text references `bundle_genesis_record` / `branch_local_record`; the crude "`created_at_page` is non-null" formulation is gone from §5.
3. The edit scope is confined away from the firewall -> manual review: a diff review confirms the edits touch only §Story Bundles §5 and the optional §5c note — Rule 7, the Mystery Reserve definition, and the HARD-GATE/Canon Safety sections are byte-unchanged.
4. (Single-layer not applicable — this is a cross-artifact ticket reconciling FOUNDATIONS to the contract; the three layers map the example-completeness invariant, the vocabulary-consistency invariant, and the firewall-untouched invariant to distinct proof surfaces.)

## Landed Changes

### 1. §Story Bundles §5 — added SE.resolution to the Rule-1 examples

In `docs/FOUNDATIONS.md` §Story Bundles §5, the load-bearing-story-state-field example list now includes `SE.resolution` — the result + player-visible-feedback grounding for non-accept routes.

### 2. §Story Bundles §5 — referenced the genesis/branch-local vocabulary

In the §5 branch-isolation discussion, the crude `created_at_page` non-null formulation was replaced with the `bundle_genesis_record` / `branch_local_record` vocabulary defined in `story-state-contract.md` by `archive/tickets/SPEC26STOCOHHAR-002.md`.

### 3. §5c — added causal-threat-scan note

In §5c, the SPEC26STOCOHHAR-005 causal-dependency threat scan is now stated as the engine-scope expression of Rule 5 at story scope — it asks only "does current state still support what it claims", never "where should the story go".

### 4. SPEC-26 status note

`archive/specs/SPEC-26-story-coherence-hardening-ii.md` now has a dated D8 implementation note. The rest of the SPEC-26 deliverable/proof text remains historical planning context.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify — §Story Bundles §5 and §5c only)
- `archive/specs/SPEC-26-story-coherence-hardening-ii.md` (modify — dated D8 implementation note only)

## Out of Scope

- Any change to FOUNDATIONS §Rule 7, the Mystery Reserve definition, the Canon Layers, the HARD-GATE discipline, or the Canon Fact Record Schema — this ticket is confined to §Story Bundles §5 / §5c.
- The contract definitions, the `SE.resolution` schema, and the causal-threat scan themselves — landed by `archive/tickets/SPEC26STOCOHHAR-002.md` / `archive/tickets/SPEC26STOCOHHAR-003.md` / `archive/tickets/SPEC26STOCOHHAR-005.md` respectively.
- Re-wording §5's Rule 4 / Rule 5 / Rule 7 story-scope statements beyond the branch-isolation vocabulary alignment.
- Broad rewriting of `archive/specs/SPEC-26-story-coherence-hardening-ii.md` historical deliverable, verification, and risk prose; a dated implementation note is sufficient because this is a large proposal spec with already-labelled historical current-state sections.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'SE.resolution' docs/FOUNDATIONS.md` returns the §Story Bundles §5 Rule-1 example reference.
2. `grep -n 'bundle_genesis_record\|branch_local_record' docs/FOUNDATIONS.md` returns the §5 branch-isolation reference; `grep -n 'created_at_page.*non-null\|created_at_page.*is non-null' docs/FOUNDATIONS.md` returns no matches.
3. `git diff docs/FOUNDATIONS.md archive/specs/SPEC-26-story-coherence-hardening-ii.md` shows FOUNDATIONS changes confined to the §Story Bundles §5 / §5c line range and the spec change confined to a dated D8 implementation note — no FOUNDATIONS hunk touches Rule 7, the Mystery Reserve section, or the HARD-GATE/Canon Safety sections.

### Invariants

1. `docs/FOUNDATIONS.md` §Story Bundles §5 and `.claude/skills/_shared-templates/story-state-contract.md` use one branch-locality vocabulary — no two-formulation drift.
2. The edit is additive documentation reconciliation only — the Mystery Reserve firewall (Rule 7), HARD-GATE discipline, and Canon Layers are byte-unchanged.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` `FOUNDATIONS.md` is a prose design contract with no validator binding; verification is grep-proof + diff-scope manual review.

### Commands

1. `grep -nE 'SE.resolution|bundle_genesis_record|branch_local_record' docs/FOUNDATIONS.md`
2. `grep -nE 'created_at_page.*non-null' docs/FOUNDATIONS.md` (must return no matches)
3. `git diff docs/FOUNDATIONS.md archive/specs/SPEC-26-story-coherence-hardening-ii.md` — the diff-scope review is the correct verification boundary for the firewall-untouched invariant and the spec-note-only invariant; a grep alone cannot prove the *absence* of changes to Rule 7 / Canon Safety sections, but a scoped diff can.

## Outcome

Completed. `docs/FOUNDATIONS.md` §Story Bundles §5 now names `SE.resolution` in the Rule-1 load-bearing-field examples and uses `branch_local_record` / `bundle_genesis_record` for global-author-pool branch isolation. §5c now names the causal-dependency threat scan as the engine-scope expression of Rule 5. `archive/specs/SPEC-26-story-coherence-hardening-ii.md` now records D8 as landed.

## Verification Result

1. `grep -nE 'SE\.resolution|bundle_genesis_record|branch_local_record|causal-dependency threat scan' docs/FOUNDATIONS.md archive/specs/SPEC-26-story-coherence-hardening-ii.md` returned the updated FOUNDATIONS §5 / §5c lines and the new SPEC-26 D8 implementation note.
2. `grep -nE 'created_at_page.*non-null' docs/FOUNDATIONS.md` returned no matches; the no-match exit code was the expected success signal for removing the crude branch-locality formulation from FOUNDATIONS.
3. `git diff docs/FOUNDATIONS.md archive/specs/SPEC-26-story-coherence-hardening-ii.md` showed FOUNDATIONS changes confined to §Story Bundles §5 / §5c and the spec change confined to the dated D8 implementation note. No hunk touched Rule 7, the Mystery Reserve definition, Canon Layers, HARD-GATE discipline, or Canon Safety sections.

## Deviations

1. The explicit user-supplied SPEC-26 reference made the same-seam implementation note part of closeout. The original ticket file set listed only `docs/FOUNDATIONS.md`; reassessment added `archive/specs/SPEC-26-story-coherence-hardening-ii.md` as a spec-note-only touched file.
