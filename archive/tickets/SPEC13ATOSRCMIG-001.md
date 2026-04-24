# SPEC13ATOSRCMIG-001: Rewrite docs/MACHINE-FACING-LAYER.md §Phase Boundaries for atomic-source contract

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `docs/MACHINE-FACING-LAYER.md` §Phase Boundaries
**Deps**: None

## Problem

`docs/MACHINE-FACING-LAYER.md:41` read "Phase 3 optional surface: `_source/` becomes the canonical storage layer for atomic canon records, with `CANON_LEDGER.md` potentially becoming a compiled artifact." This pre-SPEC-13 phrasing contradicted the now-landed `docs/FOUNDATIONS.md` §Canonical Storage Layer (which makes `_source/` the mandatory canonical form for machine-layer-enabled worlds) and SPEC-13 §A (which retires `CANON_LEDGER.md` entirely; it is not a compiled artifact). Stream A's FOUNDATIONS, CLAUDE.md, and IMPLEMENTATION-ORDER revisions are complete; this doc was the one remaining Stream A deliverable per SPEC-13 §D item 5.

## Assumption Reassessment (2026-04-24)

1. Verified before implementation that `docs/MACHINE-FACING-LAYER.md:41` contained the "Phase 3 optional surface" phrasing via direct grep.
2. Verified `docs/FOUNDATIONS.md` §Canonical Storage Layer (lines 448–458) and §Mandatory World Files (lines 93–117) reflect the atomic-source contract; `SPEC-13-atomic-source-migration.md` §D item 5 names this doc as the remaining Stream A edit target.
3. Cross-artifact boundary: `docs/MACHINE-FACING-LAYER.md` is the operational guide paired with `docs/FOUNDATIONS.md`; the two must remain consistent on canonical-storage phrasing.
4. FOUNDATIONS principle under audit: `§Tooling Recommendation` (non-negotiable) — operational docs must reflect the atomic-source retrieval contract that the canonical-storage layer enables.
5. Worktree classification: `.claude/skills/reassess-spec/references/findings-and-questions.md`, `.claude/skills/reassess-spec/references/spec-writing-rules.md`, and `specs/SPEC-13-atomic-source-migration.md` were already modified before this ticket run; `tickets/SPEC13ATOSRCMIG-001.md` and `tickets/SPEC13ATOSRCMIG-002.md` were untracked. The same-family spec/ticket state was used as reassessment context, but this ticket owns only `docs/MACHINE-FACING-LAYER.md` plus its own closeout text.
6. Wording correction: the landed doc lists all 11 retired root-level files explicitly instead of relying on the draft "five large prose files" shorthand, so `PEOPLES_AND_SPECIES.md` is not omitted.

## Architecture Check

1. Docs-only edit. Replacing pre-SPEC-13 "Phase 3 optional" language with "Phase 1.5 canonical" removes a dangling reference; the operational guide aligns with the design contract.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Stale reference absent → codebase grep-proof: `grep "Phase 3 optional surface" docs/MACHINE-FACING-LAYER.md` returns 0 matches.
2. New phrasing consistent with FOUNDATIONS → FOUNDATIONS alignment check against `docs/FOUNDATIONS.md` §Canonical Storage Layer.
3. Single-layer ticket (documentation consistency) — schema / skill-dry-run layers are not applicable; two layers above are sufficient.

## What to Change

### 1. docs/MACHINE-FACING-LAYER.md §Phase Boundaries

Replace the "Phase 3 optional surface: `_source/` becomes the canonical storage layer…" bullet (line 41) with a "Phase 1.5 canonical storage layer" bullet stating:

- `_source/` atomic YAML is the sole source-of-truth for atomized concerns on machine-layer-enabled worlds.
- The retired root-level files (`CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `TIMELINE.md`, `EVERYDAY_LIFE.md`, `INSTITUTIONS.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `GEOGRAPHY.md`, `ECONOMY_AND_RESOURCES.md`, and `PEOPLES_AND_SPECIES.md`) do not exist on such worlds.
- Merged markdown views are produced on-demand via `world-index render <world-slug> [--file <class>]` CLI (Phase 2 delivery, paired with `mcp__worldloom__get_compiled_view`); read-only; not persisted.
- Cross-reference SPEC-13 and FOUNDATIONS.md §Canonical Storage Layer for the full contract.

## Files to Touch

- `docs/MACHINE-FACING-LAYER.md` (modify)

## Out of Scope

- Rewriting other sections of `docs/MACHINE-FACING-LAYER.md` (scope is §Phase Boundaries only).
- Editing `docs/CONTEXT-PACKET-CONTRACT.md` — SPEC-13 §D item 5 intentionally excludes it (contract is storage-form-agnostic).
- Editing `docs/WORKFLOWS.md` — no monolithic refs present per reassess validation.
- Editing `docs/HARD-GATE-DISCIPLINE.md` — SPEC-07 Part B Phase 2 work per IMPLEMENTATION-ORDER.
- Editing `.claude/skills/**/SKILL.md` — retired-filename references deferred to Phase 2 SPEC-06 per reassess I1 disposition.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -c "Phase 3 optional surface" docs/MACHINE-FACING-LAYER.md` returns 0.
2. `grep -c "CANON_LEDGER.md potentially becoming" docs/MACHINE-FACING-LAYER.md` returns 0.
3. `grep -nE "Phase 1\\.5|atomic YAML|world-index render|SPEC-13" docs/MACHINE-FACING-LAYER.md` returns matches confirming the new phrasing is present.

### Invariants

1. `docs/MACHINE-FACING-LAYER.md` §Phase Boundaries must not describe `_source/` as "optional" or as a "Phase 3" surface.
2. The doc must not describe `CANON_LEDGER.md` as a compiled artifact (it is retired, not compiled).
3. The doc must cross-reference SPEC-13 and FOUNDATIONS.md §Canonical Storage Layer for the authoritative contract.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "Phase 3 optional surface|CANON_LEDGER\.md potentially becoming" docs/MACHINE-FACING-LAYER.md` — expect zero matches.
2. `grep -nE "Phase 1\.5|atomic YAML|world-index render|SPEC-13" docs/MACHINE-FACING-LAYER.md` — expect the Phase 1.5 bullet line confirming the new phrasing.
3. Narrower grep is the correct boundary here: the edit is localized to §Phase Boundaries and the invariant is "no legacy phrasing, new phrasing present"; a full pipeline command would add no verification signal beyond the two greps above.

## Outcome

Completion date: 2026-04-24.

Replaced the stale `Phase 3 optional surface` bullet in `docs/MACHINE-FACING-LAYER.md` with a `Phase 1.5 canonical storage layer` bullet. The new text states that `_source/` atomic YAML is the sole source of truth on machine-layer-enabled worlds, lists all 11 retired root-level files explicitly, identifies `world-index render <world-slug> [--file <class>]` and `mcp__worldloom__get_compiled_view` as read-only on-demand render surfaces, and cross-references SPEC-13 plus `docs/FOUNDATIONS.md` §Canonical Storage Layer.

## Verification Result

1. `grep -nE "Phase 3 optional surface|CANON_LEDGER\.md potentially becoming" docs/MACHINE-FACING-LAYER.md` — passed; returned no matches.
2. `grep -nE "Phase 1\.5|atomic YAML|world-index render|SPEC-13" docs/MACHINE-FACING-LAYER.md` — passed; returned the new Phase 1.5 canonical-storage bullet.

## Deviations

The ticket was untracked at intake. No archival was performed because the user requested implementation against the active ticket, not archival.

Post-ticket review note: `docs/FOUNDATIONS.md` §Canonical Storage Layer still uses the broader "five large prose files" shorthand while §Mandatory World Files names all atomized concerns explicitly. The reviewed implementation avoided that ambiguity in `docs/MACHINE-FACING-LAYER.md`; the broader docs/spec retired-filename sweep is already covered by active sibling `tickets/SPEC13ATOSRCMIG-003.md` acceptance criterion 10, so no new follow-up ticket was created.
