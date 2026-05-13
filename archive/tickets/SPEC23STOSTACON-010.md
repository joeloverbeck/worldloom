# SPEC23STOSTACON-010: Refresh machine-facing storylet filter examples after SLT schema rebuild

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `docs/MACHINE-FACING-LAYER.md`
**Deps**: archive/tickets/SPEC23STOSTACON-002.md

## Problem

At intake, `docs/MACHINE-FACING-LAYER.md` documented a `list_records` storylet filter example using old SLT fields: `shape`, `content_intensity`, and `"visibility.scope"`. `archive/tickets/SPEC23STOSTACON-002.md` rebuilt `tools/validators/src/schemas/story-storylet.schema.json` to the contract §4.4 minimalist shape, where those fields are gone and the visibility path is `scope.visibility`. Leaving the public machine-facing docs with old filter keys would have taught callers to query fields that current contract-shaped SLT records no longer carry.

## Assumption Reassessment (2026-05-13)

1. Current docs state verified: `docs/MACHINE-FACING-LAYER.md` §Retrieval Tool Scope, `list_records` row, gives the example `{ shape: ["routine_disruption", "reflection_dilemma"], content_intensity: ["mature", "tame"], "visibility.scope": "global_author_pool" }`.
2. Current schema state verified via `archive/tickets/SPEC23STOSTACON-002.md`: the SLT schema now rejects `shape`, `content_intensity`, and `visibility` as top-level legacy fields; it uses `move_family`, `scope.visibility`, `exit_options[].action_family`, `mystery_policy`, and other contract §4.4 fields.
3. Shared boundary under audit: this is the public retrieval docs surface for `list_records` filters, not the validator schema itself. The filter example should demonstrate field paths that exist on current parsed storylet records.
4. FOUNDATIONS principle motivating this ticket: §Story Bundles §5b makes the shared story-state contract authoritative for story-record schemas. Machine-facing docs should not advertise old fields as current retrieval examples after the schema rebuild.
5. Adjacent contradiction classification: this was explicitly excluded from `archive/tickets/SPEC23STOSTACON-002.md` because that ticket owned the validators-schema seam. This ticket owns only the docs/public retrieval example.
6. Verification command correction: the drafted stale-key grep included bare `shape`, but `docs/MACHINE-FACING-LAYER.md` legitimately uses that word in unrelated response-shape prose. The landed negative proof scopes to the distinctive old example literals (`routine_disruption`, `reflection_dilemma`, `content_intensity`, and `visibility.scope`) instead of pretending the document has no generic `shape` wording.

## Architecture Check

1. Updating the example in place is cleaner than adding a compatibility note: the old fields are not valid current SLT contract fields, and the docs should model the canonical query shape.
2. No backwards-compatibility aliasing/shims introduced. This ticket does not change retrieval behavior; it only updates docs to current field names.

## Verification Layers

1. Stale storylet filter keys are gone from the `list_records` example -> codebase grep-proof over `docs/MACHINE-FACING-LAYER.md`.
2. Replacement example uses current SLT contract fields such as `move_family`, `scope.visibility`, and `exit_options.action_family` -> manual review against `.claude/skills/_shared-templates/story-state-contract.md` §4.4.
3. No implementation behavior changes -> documentation-only verification boundary.

## Landed Changes

### 1. Updated the `list_records` filter example

In `docs/MACHINE-FACING-LAYER.md`, replaced the old storylet example:

- `shape`
- `content_intensity`
- `"visibility.scope"`

with current contract-shaped examples:

- `move_family`
- `"scope.visibility"`
- `"exit_options.action_family"`

The surrounding description of dotted paths and filter arrays remains intact.

## Files to Touch

- `docs/MACHINE-FACING-LAYER.md` (modify)

## Out of Scope

- Changing `list_records` filtering behavior.
- Updating validators, schemas, skills, or story-bundle content.
- Retiring `arc_trace_record` or other broader story-pipeline retrieval vocabulary; this ticket only addresses the stale SLT filter example exposed by `SPEC23STOSTACON-002`.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE 'routine_disruption|reflection_dilemma|content_intensity|visibility\\.scope' docs/MACHINE-FACING-LAYER.md` returns no hits for the stale example literals.
2. `grep -nE 'move_family|scope\\.visibility|exit_options\\.action_family' docs/MACHINE-FACING-LAYER.md` shows the updated example.
3. Manual review confirms the replacement paths exist in `.claude/skills/_shared-templates/story-state-contract.md` §4.4 and `tools/validators/src/schemas/story-storylet.schema.json`.

### Invariants

1. Machine-facing docs present current contract-shaped storylet filter paths.
2. The ticket does not modify retrieval code, schema code, or world content.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep/manual review against the contract and schema.`

### Commands

1. `grep -nE 'routine_disruption|reflection_dilemma|content_intensity|visibility\\.scope' docs/MACHINE-FACING-LAYER.md`
2. `grep -nE 'move_family|scope\\.visibility|exit_options\\.action_family' docs/MACHINE-FACING-LAYER.md`

## Outcome

Completed on 2026-05-13. `docs/MACHINE-FACING-LAYER.md` now shows the `list_records` storylet filter example with current SLT contract fields: `move_family`, `scope.visibility`, and `exit_options.action_family`. No retrieval behavior, validator schema, runtime code, or world content changed.

## Verification Result

1. `grep -nE 'routine_disruption|reflection_dilemma|content_intensity|visibility\\.scope' docs/MACHINE-FACING-LAYER.md` — PASS; returned no hits.
2. `grep -nE 'move_family|scope\\.visibility|exit_options\\.action_family' docs/MACHINE-FACING-LAYER.md` — PASS; returned the updated `list_records` row.
3. Manual review against `.claude/skills/_shared-templates/story-state-contract.md` §4.4 and `tools/validators/src/schemas/story-storylet.schema.json` — PASS; `move_family`, nested `scope.visibility`, and `exit_options[].action_family` are current SLT fields.

## Deviations

1. The drafted negative grep included bare `shape`, but the live document uses `shape` legitimately in unrelated response-shape prose. The completed proof uses the stale example's distinctive literals instead.
