# SPEC67STOWORIND-002: Document intentionally non-indexed story-bundle fields

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `docs/MACHINE-FACING-LAYER.md` only (documentation). No code, no schema, no tests.
**Deps**: None

## Problem

At intake, several documented story-bundle reference fields were deliberately NOT indexed as edges because no current consumer reads them, but `docs/MACHINE-FACING-LAYER.md` did not record that as a conscious decision. Without that note, a future audit (continuity-audit / branching-story-health-audit) could re-flag these omissions as accidental gaps and propose re-adding them, re-litigating a YAGNI decision SPEC-67 already made. SPEC-67 §2.2 required a short "intentionally non-indexed story fields" note in the machine-facing-layer docs so the decision is durable and auditable.

## Assumption Reassessment (2026-05-21)

1. **Codebase** — The named fields are real schema fields (so "not indexed" is an accurate statement, not a typo). Verified in `.claude/skills/_shared-templates/story-record-schemas.md`: `STSTAT.location` (line 665), `STOBJ.owner` (line 591), `STOBJ.current_location` (line 592), `STLOC.bound_ent` (line 575), `CLK.thresholds` (line 688). None of these has an edge function in `tools/world-index/src/parse/atomic.ts` (no `story_location_record`/`story_object_record` node_type case; clock edges cover only `clock_linked_record`/`clock_driver`/`clock_tick_event`).
2. **Specs/docs** — SPEC-67 §2.2 is the source; the target is `docs/MACHINE-FACING-LAYER.md` (which already hosts the §Story-Bundle Edge Types catalog at line ~61).
3. **Cross-artifact boundary under audit** — The note's consumer is future audit tooling: `continuity-audit` and `branching-story-health-audit` (and any future `/reassess-spec` of this surface) must read this note and NOT re-flag the listed fields as accidental edge-parity omissions. The note is the durable record of the decision; its acceptance condition is that re-indexing any listed field later requires naming a consumer at that time.
4. **FOUNDATIONS principle under audit** — **§5b Schema-Minimalism / YAGNI**: an edge is only worth emitting if a consumer reads it. Documenting the non-indexed fields as a deliberate decision is the §5b-aligned alternative to either emitting consumerless edges "for completeness" or leaving the omission silent.

## Architecture Check

1. A documentation note is the correct artifact for a deliberate-non-action decision — it costs no parser/schema surface and prevents future re-litigation, which is cleaner than emitting placeholder edges or a suppression list in code.
2. No backwards-compatibility aliasing/shims; documentation-only.

## Verification Layers

1. Note enumerates all five non-indexed field groups with rationale → codebase grep-proof: `grep` for each field name in `docs/MACHINE-FACING-LAYER.md` returns a match in the note.
2. Single-layer ticket (documentation-only): no schema/dry-run layer applies because the change introduces no code, schema, or runtime behavior — verification is grep against the post-edit doc.

## Landed Changes

### 1. Added an "intentionally non-indexed story fields" note to `docs/MACHINE-FACING-LAYER.md`

Near the §Story-Bundle Edge Types catalog, the new note lists:
- `STSTAT.location`, `STOBJ.owner`, `STOBJ.current_location`, `STLOC.bound_ent` — spatial/ownership fields with no current traversal consumer.
- `CLK.thresholds[].effects.create/supersede/close` references — clock threshold effects are resolved at tick time, not traversed structurally; existing `clock_linked_record`/`clock_driver`/`clock_tick_event` edges cover the consumed surface.

It states the one-line "no current consumer" rationale per group and the rule that re-indexing any of them later requires naming the consumer at that time.

## Files to Touch

- `docs/MACHINE-FACING-LAYER.md` (modify) — adds the "intentionally non-indexed story fields" note (a different section from archived `archive/tickets/SPEC67STOWORIND-001.md`'s edge-catalog subsection — mechanical, non-overlapping edits).

## Out of Scope

- Emitting edges for any of the listed fields — that is precisely what this note records as deferred.
- The 7 consumer-backed edges and the edge-catalog subsection — completed in `archive/tickets/SPEC67STOWORIND-001.md`.
- Any code, schema, or test change.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "STSTAT.location\|STOBJ.owner\|STOBJ.current_location\|STLOC.bound_ent\|thresholds" docs/MACHINE-FACING-LAYER.md` returns matches inside the new note.
2. The note states the "re-indexing requires naming a consumer" rule.

### Invariants

1. The note describes a deliberate non-action; it introduces no edge, schema field, or runtime behavior.
2. Every field named in the note is a real story-bundle schema field (no fabricated field names).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "intentionally non-indexed\|no current consumer" docs/MACHINE-FACING-LAYER.md` — confirms the note landed.
2. `grep -n "STSTAT.location\|STOBJ.owner\|STOBJ.current_location\|STLOC.bound_ent\|CLK.thresholds" docs/MACHINE-FACING-LAYER.md` — confirms all five field groups are enumerated.

## Outcome

Completed: 2026-05-21

The Story-Bundle Edge Types catalog in `docs/MACHINE-FACING-LAYER.md` now has an intentionally non-indexed fields note covering the four spatial/ownership fields and the clock-threshold effects references named by SPEC-67 §2.2. The note records the no-current-consumer rationale and requires a named future consumer before any of those fields are indexed.

No code, schema, parser, or runtime behavior changed.

## Verification Result

1. `grep -n "intentionally non-indexed\|no current consumer" docs/MACHINE-FACING-LAYER.md` — PASS; returned the new re-indexing rule / rationale line in the note.
2. `grep -n "STSTAT.location\|STOBJ.owner\|STOBJ.current_location\|STLOC.bound_ent\|CLK.thresholds" docs/MACHINE-FACING-LAYER.md` — PASS; returned the spatial/ownership field group and the `CLK.thresholds` field group in the note.
3. `rg -n "Re-indexing any intentionally non-indexed field requires naming the consumer" docs/MACHINE-FACING-LAYER.md` — PASS; returned the exact future-consumer rule.

## Deviations

None. The ticket remained documentation-only; `tools/world-index` code, schema, and tests were intentionally untouched.
