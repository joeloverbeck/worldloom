# SPEC79CHCREM-008: Docs — delete `choice_associated_storylet` table row from MACHINE-FACING-LAYER.md

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `docs/MACHINE-FACING-LAYER.md` (world-index story-edge table row deletion).
**Deps**: archive/tickets/SPEC79CHCREM-004.md

## Problem

The `docs/MACHINE-FACING-LAYER.md` world-index story-edge table at line 137 includes a row documenting the `choice_associated_storylet` edge type: *"| `CHC` | `choice_associated_storylet` | `SLT` | The source commitment block named by `associated_commitment_block`. |"*. Once SPEC79CHCREM-004 removes the edge type from the world-index `STORY_EDGE_TYPES` enum and the parser, this table row documents an edge type that no longer exists; leaving the row would mislead downstream readers about the world-index's actual edge surface.

## Assumption Reassessment (2026-05-24)

1. Confirmed `docs/MACHINE-FACING-LAYER.md:137` carries the table row for the `choice_associated_storylet` edge with the description naming `associated_commitment_block`. Verified via grep at reassessment time.
2. Confirmed SPEC-79 §5.6 prescribes the table-row deletion. The ticket is documented as a documentation edit included under §5 (Skill Changes) for atomic-landing convenience per the SPEC-79 reassessment's M1 Improvement (the spec's §5.6 inline note: *"Not a skill — included here under §5 for atomic-landing convenience; this is a documentation edit"*).
3. Cross-skill boundary: this docs edit must land after archive/tickets/SPEC79CHCREM-004.md (which removes the edge type from the world-index) so the docs surface accurately reflects the post-removal edge enumeration. The archived dependency path enforces ordering.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) applies indirectly — the docs surface mirrors the schema's actual edge enumeration. Once the edge is removed from the enum (handled in 004), the docs must remove the corresponding documentation row.
5. Removal blast radius (was template item 7): this ticket deletes one table row in one docs file. No other docs surface references the `choice_associated_storylet` edge type (verified via reassessment-time grep of `docs/` for the edge name).

## Architecture Check

1. Deleting the entire table row is cleaner than leaving the row with a strikethrough or a `(removed in SPEC-79)` annotation — the docs are a current-state reference, not a changelog; the `git log` provides the change attribution. Per the SPEC-79 reassessment's M2 Improvement (the negative grep test in §9-6 includes `docs/`), the docs must be fully cleaned post-landing.
2. No backwards-compatibility aliasing/shims introduced. The docs surface simply reflects the post-removal edge enumeration; no migration path for old database rows is documented (the world-index is a derived artifact rebuilt from `_source/` on each `world-index build` invocation per `docs/FOUNDATIONS.md` §Mandatory World Files derived-artifacts clause).

## Verification Layers

1. The MACHINE-FACING-LAYER.md table no longer contains the `choice_associated_storylet` row → codebase grep-proof: `grep -n "choice_associated_storylet" docs/MACHINE-FACING-LAYER.md` returns zero matches.
2. The other rows in the world-index story-edge table remain unchanged → manual review of the table's surrounding rows (page_emitted_choice, choice_grounded_in, choice_affordance_ordinal, storylet_predicate_ref, storylet_effect_ref, storylet_exit_likely_effect_ref, event_selected_storylet).
3. The MACHINE-FACING-LAYER.md table's overall structure (header, separator, surrounding prose) is unchanged → manual review of the surrounding content.

## What to Change

### 1. `docs/MACHINE-FACING-LAYER.md`

- At line 137, delete the entire table row: `| \`CHC\` | \`choice_associated_storylet\` | \`SLT\` | The source commitment block named by \`associated_commitment_block\`. |`. The row's surrounding rows (the table header, the table separator, and the other CHC and SLT edge rows) remain unchanged.

## Files to Touch

- `docs/MACHINE-FACING-LAYER.md` (modify)

## Out of Scope

- The world-index schema/parser changes (handled in 004).
- Other docs surfaces that reference the world-index edge enumeration — none exist (verified via reassessment-time grep).
- Other CHC-related rows in the same table (page_emitted_choice, choice_grounded_in, choice_affordance_ordinal remain).
- Adding a changelog entry to `docs/MACHINE-FACING-LAYER.md` — git log provides change attribution.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "choice_associated_storylet" docs/MACHINE-FACING-LAYER.md` returns zero matches.
2. `grep -n "associated_commitment_block" docs/MACHINE-FACING-LAYER.md` returns zero matches (the row is the only reference in this docs file).
3. The world-index story-edge table renders correctly without the deleted row — markdown table integrity preserved.

### Invariants

1. The MACHINE-FACING-LAYER.md docs surface mirrors the world-index's actual edge enumeration post-landing.
2. No docs surface in the repo documents the `choice_associated_storylet` edge type after this ticket lands.

## Test Plan

### New/Modified Tests

`None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "choice_associated_storylet\|associated_commitment_block" docs/MACHINE-FACING-LAYER.md`
2. Visual inspection of the world-index story-edge table to confirm markdown integrity (header, separator, remaining rows).
