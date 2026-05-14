# SPEC26STOCOHHAR-009: Reconcile docs/FOUNDATIONS.md to SPEC-26 changes

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `docs/FOUNDATIONS.md` (the project-wide design contract). No code or skill change.
**Deps**: archive/tickets/SPEC26STOCOHHAR-002.md, archive/tickets/SPEC26STOCOHHAR-003.md, archive/tickets/SPEC26STOCOHHAR-005.md

## Problem

`docs/FOUNDATIONS.md` §Story Bundles must stay current with the landed story-state contract. SPEC-26 D8 reconciles three things: §5's Rule-1 example list does not yet name `SE.resolution`; the §5 branch-isolation discussion still carries the crude "`created_at_page` is non-null" formulation rather than the `bundle_genesis_record` / `branch_local_record` vocabulary; and §5c may benefit from a note that the causal-dependency threat scan is the engine-scope expression of Rule 5. This ticket lands last so it reconciles the final contract state.

## Assumption Reassessment (2026-05-14)

1. Verified against the current `docs/FOUNDATIONS.md` (read in full at SPEC-26 Step 1): §Story Bundles §5 ("Validation Rules At Story Scope", line 564) enumerates load-bearing story-state fields — "`STSTAT` carries replayable life / agency / location state ... `SF.authority` separates ... `OBL` / `CNSQ` `urgency` ... `CHC.grounded_in` ..." (line 566) — and does NOT name `SE.resolution`. §5 line 568 carries the crude "`created_at_page` is non-null" branch-isolation formulation. §5c ("Present Causal State, Not Narrative Shape", line 588) is the engine-scope statement of the no-act-structure principle.
2. Verified against `specs/SPEC-26-story-coherence-hardening-ii.md` D8: D8 has three parts — (a) extend §5's Rule-1 examples to include `SE.resolution`; (b) reference the `bundle_genesis_record` / `branch_local_record` vocabulary in the §5 branch-isolation discussion; (c) optionally note in §5c that the D4 causal-dependency threat scan is the schema-/engine-scope expression of Rule 5 at story scope ("no new text is required if §5c already reads cleanly; confirm at implementation"). The Deps (`archive/tickets/SPEC26STOCOHHAR-002.md` / `archive/tickets/SPEC26STOCOHHAR-003.md` / `archive/tickets/SPEC26STOCOHHAR-005.md`) are the tickets that land the vocabulary, the `SE.resolution` field, and the threat scan respectively — D8 reconciles FOUNDATIONS to *their landed state*, so they must complete first.
3. Cross-skill / cross-artifact boundary under audit: `docs/FOUNDATIONS.md` §Story Bundles §5 / §5c is the project-wide design contract; the shared surface is the §5 example list and branch-isolation phrasing, which must agree with `.claude/skills/_shared-templates/story-state-contract.md` (the story-record schema authority per §5b). This ticket changes only `FOUNDATIONS.md`; the contract and skills are landed by `archive/tickets/SPEC26STOCOHHAR-002.md` / `archive/tickets/SPEC26STOCOHHAR-003.md` / `archive/tickets/SPEC26STOCOHHAR-005.md`.
4. FOUNDATIONS principle under audit: Rule 1 (No Floating Facts) — §5 enumerates Rule-1-required story-bundle schema fields as examples; `SE.resolution` is a Rule-1 grounding field (it grounds a non-accept outcome's result and player-visible consequence), so its absence from the §5 example list is a documentation gap this ticket closes. Rule 4 (No Globalization by Accident) — the §5 branch-isolation discussion governs Rule 4 at story scope; aligning its vocabulary with the contract's `branch_local_record` definition keeps the FOUNDATIONS text and the contract using one vocabulary.
5. HARD-GATE / Canon Safety surface (per `tickets/README.md` check 9): `docs/FOUNDATIONS.md` is the design contract that *defines* the Mystery Reserve firewall (Rule 7, line 426) and the Canon Layers. Confirmed: this ticket's edits are confined to §Story Bundles §5 (Rule-1 examples + branch-isolation vocabulary) and the optional §5c note — it does NOT touch Rule 7, the Mystery Reserve definition, the HARD-GATE discipline, or any Canon Safety Check definition. The firewall is unchanged; the edits are additive documentation reconciliation.

## Architecture Check

1. Reconciling `FOUNDATIONS.md` last — after 002 / 003 / 005 land — is cleaner than reconciling speculatively: the §5 examples and §5c note then describe *landed* state, not proposed state, so the design contract never documents a field or check that does not yet exist. Aligning the §5 branch-isolation vocabulary with the contract removes a two-vocabulary drift between FOUNDATIONS and `story-state-contract.md`.
2. No backwards-compatibility aliasing or shims — the crude "`created_at_page` is non-null" phrasing is replaced by the `branch_local_record` vocabulary, not kept alongside it.

## Verification Layers

1. §5 names `SE.resolution` in the Rule-1 examples -> codebase grep-proof: `SE.resolution` appears in `docs/FOUNDATIONS.md` §Story Bundles §5's load-bearing-field example list.
2. The branch-isolation discussion uses the shared vocabulary -> codebase grep-proof: the §5 branch-isolation text references `bundle_genesis_record` / `branch_local_record`; the crude "`created_at_page` is non-null" formulation is gone from §5.
3. The edit scope is confined away from the firewall -> manual review: a diff review confirms the edits touch only §Story Bundles §5 and the optional §5c note — Rule 7, the Mystery Reserve definition, and the HARD-GATE/Canon Safety sections are byte-unchanged.
4. (Single-layer not applicable — this is a cross-artifact ticket reconciling FOUNDATIONS to the contract; the three layers map the example-completeness invariant, the vocabulary-consistency invariant, and the firewall-untouched invariant to distinct proof surfaces.)

## What to Change

### 1. §Story Bundles §5 — add SE.resolution to the Rule-1 examples

In `docs/FOUNDATIONS.md` §Story Bundles §5, extend the load-bearing-story-state-field example list (currently naming `STSTAT`, `SF.authority`, `OBL`/`CNSQ` `urgency`, `CHC.grounded_in`, the existential predicates) to include `SE.resolution` — the result + player-visible-feedback grounding for non-accept routes.

### 2. §Story Bundles §5 — reference the genesis/branch-local vocabulary

In the §5 branch-isolation discussion (currently "Global author-pool storylets must not reference branch-local record IDs whose `created_at_page` is non-null"), replace the crude formulation with the `bundle_genesis_record` / `branch_local_record` vocabulary defined in `story-state-contract.md` by `archive/tickets/SPEC26STOCOHHAR-002.md`.

### 3. §5c — optional causal-threat-scan note

In §5c, optionally note that the SPEC26STOCOHHAR-005 causal-dependency threat scan is the schema-/engine-scope expression of Rule 5 at story scope — it asks only "does current state still support what it claims", never "where should the story go". Per SPEC-26 D8, no new text is required if §5c already reads cleanly; confirm at implementation and add the note only if it sharpens the section.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify — §Story Bundles §5 and optionally §5c only)

## Out of Scope

- Any change to FOUNDATIONS §Rule 7, the Mystery Reserve definition, the Canon Layers, the HARD-GATE discipline, or the Canon Fact Record Schema — this ticket is confined to §Story Bundles §5 / §5c.
- The contract definitions, the `SE.resolution` schema, and the causal-threat scan themselves — landed by `archive/tickets/SPEC26STOCOHHAR-002.md` / `archive/tickets/SPEC26STOCOHHAR-003.md` / `archive/tickets/SPEC26STOCOHHAR-005.md` respectively.
- Re-wording §5's Rule 4 / Rule 5 / Rule 7 story-scope statements beyond the branch-isolation vocabulary alignment.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'SE.resolution' docs/FOUNDATIONS.md` returns the §Story Bundles §5 Rule-1 example reference.
2. `grep -n 'bundle_genesis_record\|branch_local_record' docs/FOUNDATIONS.md` returns the §5 branch-isolation reference; `grep -n 'created_at_page.*non-null\|created_at_page.*is non-null' docs/FOUNDATIONS.md` returns no matches.
3. `git diff docs/FOUNDATIONS.md` shows changes confined to the §Story Bundles §5 / §5c line range — no hunk touches Rule 7, the Mystery Reserve section, or the HARD-GATE/Canon Safety sections.

### Invariants

1. `docs/FOUNDATIONS.md` §Story Bundles §5 and `.claude/skills/_shared-templates/story-state-contract.md` use one branch-locality vocabulary — no two-formulation drift.
2. The edit is additive documentation reconciliation only — the Mystery Reserve firewall (Rule 7), HARD-GATE discipline, and Canon Layers are byte-unchanged.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` `FOUNDATIONS.md` is a prose design contract with no validator binding; verification is grep-proof + diff-scope manual review.

### Commands

1. `grep -nE 'SE.resolution|bundle_genesis_record|branch_local_record' docs/FOUNDATIONS.md`
2. `grep -nE 'created_at_page.*non-null' docs/FOUNDATIONS.md` (must return no matches)
3. `git diff docs/FOUNDATIONS.md` — the diff-scope review is the correct verification boundary for the firewall-untouched invariant; a grep alone cannot prove the *absence* of changes to Rule 7 / Canon Safety sections, but a scoped diff can.
