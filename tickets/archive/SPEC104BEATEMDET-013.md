# SPEC104BEATEMDET-013: Flip docs/ID-ALLOCATION.md `mtemplate` annotation from "deferred" to "landed"

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — documentation-only edit to `docs/ID-ALLOCATION.md`
**Deps**: 002

## Problem

SPEC-101's edit to `docs/ID-ALLOCATION.md` pre-documented the `mtemplate-<integer>` class at line 70 with the annotation *"schema deferred to SPEC-104"* (anticipating the schema would land in this batch). Now that ticket 002 lands the beat-template schema + declarative validator, the annotation is stale — the schema is no longer deferred. This ticket flips the annotation to *"schema landed in SPEC-104"* so the canonical doc reflects current reality.

## Assumption Reassessment (2026-05-31)

1. Codebase: `docs/ID-ALLOCATION.md:70` currently reads `- \`mtemplate-<integer>\` — beat templates (\`beat-templates/\`; schema deferred to SPEC-104)`. The line was authored by SPEC-101's `/reassess-spec` session edit (per `archive/specs/SPEC-101-manual-story-metadata-and-records.md` §4 modify-docs); the annotation explicitly anticipated SPEC-104's schema landing.
2. Spec: SPEC-104 §4 modify-docs declares: *"`docs/ID-ALLOCATION.md` — flip the `mtemplate-<integer>` annotation at line 70 from *\"schema deferred to SPEC-104\"* to *\"schema landed in SPEC-104\"*."* The flip is a single-line edit; nothing else in the file needs to change.
3. Cross-skill boundary: `docs/ID-ALLOCATION.md` is the canonical doc consulted by `/reassess-spec` §3.10 (project-convention drift) for manual-story-studio ID classes — per the §3.10 carve-out landed during the /skill-audit session, manual-story prefixes are validated against `docs/ID-ALLOCATION.md` rather than CLAUDE.md. Future reassessments grepping for `mtemplate-<integer>` will see the current annotation; flipping it ensures the doc reflects current reality.

## Architecture Check

1. Minimal-surface edit: one annotation flip, no structural change to the doc. The line already exists at line 70 with the right ID prefix and storage-path information; only the deferred-vs-landed annotation needs to change.
2. No backwards-compatibility aliasing or shims introduced. Pure documentation edit.

## Verification Layers

1. The annotation now reads `"landed in SPEC-104"` → codebase grep-proof (`grep -n "mtemplate-<integer>" docs/ID-ALLOCATION.md`).
2. No other content in `docs/ID-ALLOCATION.md` is changed → diff review (single-line edit).

## What to Change

### 1. Modify `docs/ID-ALLOCATION.md:70`

Change the line:
```
- `mtemplate-<integer>` — beat templates (`beat-templates/`; schema deferred to SPEC-104)
```

To:
```
- `mtemplate-<integer>` — beat templates (`beat-templates/`; schema landed in SPEC-104)
```

## Files to Touch

- `docs/ID-ALLOCATION.md` (modify)

## Out of Scope

- The schema itself — ticket 002.
- The registry registration in MANUAL_RECORD_CLASSES — ticket 001.
- Any other documentation updates (no other docs reference the `mtemplate` deferred annotation).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "schema landed in SPEC-104" docs/ID-ALLOCATION.md` returns the line at 70 (or nearby, since line numbers may shift).
2. `grep -n "schema deferred to SPEC-104" docs/ID-ALLOCATION.md` returns zero matches (the old annotation is fully replaced).
3. The doc otherwise parses cleanly as Markdown (no broken table rows, no orphaned `>`, no malformed links).

### Invariants

1. Single-line edit — no other content in `docs/ID-ALLOCATION.md` is modified.
2. The `mtemplate-<integer>` line itself retains its prefix + storage-path information; only the annotation changes.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "mtemplate-<integer>" docs/ID-ALLOCATION.md` — verify the annotation is now "landed".
2. `git diff docs/ID-ALLOCATION.md` — review the single-line edit.
3. No full-pipeline command needed — the file is pure documentation; nothing in the runtime reads `docs/ID-ALLOCATION.md`.
