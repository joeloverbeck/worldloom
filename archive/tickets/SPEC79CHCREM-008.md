# SPEC79CHCREM-008: Docs — delete `choice_associated_storylet` table row from MACHINE-FACING-LAYER.md

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `docs/MACHINE-FACING-LAYER.md` (world-index story-edge table row deletion).
**Deps**: archive/tickets/SPEC79CHCREM-004.md

## Problem

Before this ticket, the `docs/MACHINE-FACING-LAYER.md` world-index story-edge table included a row documenting the `choice_associated_storylet` edge type: *"| `CHC` | `choice_associated_storylet` | `SLT` | The source commitment block named by `associated_commitment_block`. |"*. SPEC79CHCREM-004 had already removed the edge type from the world-index `STORY_EDGE_TYPES` enum and parser; this ticket removed the stale docs row so the table no longer advertises an edge type that does not exist.

## Assumption Reassessment (2026-05-24)

1. Before this ticket, confirmed `docs/MACHINE-FACING-LAYER.md:137` carried the table row for the `choice_associated_storylet` edge with the description naming `associated_commitment_block`. Verified via grep at reassessment time.
2. Confirmed SPEC-79 §5.6 prescribes the table-row deletion. The ticket is documented as a documentation edit included under §5 (Skill Changes) for atomic-landing convenience per the SPEC-79 reassessment's M1 Improvement (the spec's §5.6 inline note: *"Not a skill — included here under §5 for atomic-landing convenience; this is a documentation edit"*).
3. Cross-skill boundary: this docs edit must land after archive/tickets/SPEC79CHCREM-004.md (which removes the edge type from the world-index) so the docs surface accurately reflects the post-removal edge enumeration. The archived dependency path enforces ordering.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) applies indirectly — the docs surface mirrors the schema's actual edge enumeration. Once the edge is removed from the enum (handled in 004), the docs must remove the corresponding documentation row.
5. Removal blast radius (was template item 7): this ticket deletes one table row in one current-state machine-facing docs file. Historical/provenance references in `docs/triage/` remain intentionally out of scope; no other current machine-facing docs surface needs a row-level update.

## Architecture Check

1. Deleting the entire table row is cleaner than leaving the row with a strikethrough or a `(removed in SPEC-79)` annotation — the docs are a current-state reference, not a changelog; the `git log` provides the change attribution. Per the SPEC-79 reassessment's M2 Improvement (the negative grep test in §9-6 includes `docs/`), the docs must be fully cleaned post-landing.
2. No backwards-compatibility aliasing/shims introduced. The docs surface simply reflects the post-removal edge enumeration; no migration path for old database rows is documented (the world-index is a derived artifact rebuilt from `_source/` on each `world-index build` invocation per `docs/FOUNDATIONS.md` §Mandatory World Files derived-artifacts clause).

## Verification Layers

1. The MACHINE-FACING-LAYER.md table no longer contains the `choice_associated_storylet` row → codebase grep-proof: `grep -n "choice_associated_storylet" docs/MACHINE-FACING-LAYER.md` returns zero matches.
2. The other rows in the world-index story-edge table remain unchanged → manual review of the table's surrounding rows (page_emitted_choice, choice_grounded_in, choice_affordance_ordinal, storylet_predicate_ref, storylet_effect_ref, storylet_exit_likely_effect_ref, event_selected_storylet).
3. The MACHINE-FACING-LAYER.md table's overall structure (header, separator, surrounding prose) is unchanged → manual review of the surrounding content.

## Landed Changes

### 1. `docs/MACHINE-FACING-LAYER.md`

- Deleted the entire table row: `| \`CHC\` | \`choice_associated_storylet\` | \`SLT\` | The source commitment block named by \`associated_commitment_block\`. |`. The row's surrounding rows (the table header, the table separator, and the other CHC and SLT edge rows) remain unchanged.

## Files to Touch

- `docs/MACHINE-FACING-LAYER.md` (modify)

## Out of Scope

- The world-index schema/parser changes (handled in 004).
- Historical/provenance mentions in `docs/triage/` — intentionally retained as triage evidence, not current machine-facing contract rows.
- Other CHC-related rows in the same table (page_emitted_choice, choice_grounded_in, choice_affordance_ordinal remain).
- Adding a changelog entry to `docs/MACHINE-FACING-LAYER.md` — git log provides change attribution.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "choice_associated_storylet" docs/MACHINE-FACING-LAYER.md` returns zero matches.
2. `grep -n "associated_commitment_block" docs/MACHINE-FACING-LAYER.md` returns zero matches (the row is the only reference in this docs file).
3. The world-index story-edge table renders correctly without the deleted row — markdown table integrity preserved.

### Invariants

1. The MACHINE-FACING-LAYER.md docs surface mirrors the world-index's actual edge enumeration post-landing.
2. No current machine-facing docs surface in the repo documents the `choice_associated_storylet` edge type after this ticket lands; historical/provenance mentions remain allowed in `docs/triage/`.

## Test Plan

### New/Modified Tests

`None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "choice_associated_storylet\|associated_commitment_block" docs/MACHINE-FACING-LAYER.md`
2. Visual inspection of the world-index story-edge table to confirm markdown integrity (header, separator, remaining rows).

## Outcome

Completed on 2026-05-24. The obsolete `choice_associated_storylet` row was removed from `docs/MACHINE-FACING-LAYER.md`; the story-edge table now lists only the surviving CHC edge rows (`choice_grounded_in` and `choice_affordance_ordinal`) plus the SLT rows.

## Verification Result

1. `! grep -n 'choice_associated_storylet' docs/MACHINE-FACING-LAYER.md` — PASS; no matches remain in the docs file.
2. `! grep -n 'associated_commitment_block' docs/MACHINE-FACING-LAYER.md` — PASS; no matches remain in the docs file.
3. Manual review of `docs/MACHINE-FACING-LAYER.md` table around the edit — PASS; the table header, separator, and surrounding rows remain intact.
4. `rg -n 'choice_associated_storylet|associated_commitment_block' docs/triage` — PASS as historical classification, not a zero-hit proof; remaining docs hits are triage/provenance context outside this ticket's current machine-facing docs boundary.

## Deviations

- None.
