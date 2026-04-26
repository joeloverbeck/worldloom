# SPEC17AUDTRARET-003: Truth stale SPEC-06 notes-field and canon-addition template references

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — documentation-only truthing for active specs and, if needed, workflow reference prose. No skill, engine, validator, hook, schema, or world-content change.
**Deps**: `archive/tickets/SPEC17AUDTRARET-001.md`

## Problem

At intake, post-review of `archive/tickets/SPEC17AUDTRARET-001.md` confirmed Track C1 was complete, but it also left two adjacent documentation concerns outside that ticket's owned five-surface deprecation slice:

1. `specs/SPEC-06-skill-rewrite-patterns.md:97` still said `Attribution stamping (..., notes-field lines) | SPEC-03 engine auto-stamp`, which was stale after SPEC-17 Track C1 declared `modification_history[]` the canonical post-SPEC-13 audit surface and explicitly rejected ongoing notes-field mirroring.
2. `specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md:172` and `archive/tickets/SPEC17AUDTRARET-001.md:23` both named a follow-up triage need for stale `canon-addition/templates/canon-fact-record.yaml` and `canon-addition/references/accept-path.md` references. Live repo evidence shows those files were deleted or absorbed by SPEC-06 work; this ticket completed the active-spec truthing pass so future implementers do not chase non-existent canon-addition template surfaces.

## Assumption Reassessment (2026-04-26)

1. Verified live canon-addition inventory: `.claude/skills/canon-addition/templates/` contains only `critic-prompt.md` and `critic-report-format.md`; `.claude/skills/canon-addition/references/` contains `consequence-analysis.md`, `counterfactual-and-verdict.md`, `proposal-normalization.md`, and `retrieval-tool-tree.md`. There is no live `canon-fact-record.yaml`, `change-log-entry.yaml`, or `accept-path.md` under canon-addition.
2. Verified archived SPEC-06 implementation evidence: `archive/tickets/SPEC06SKIREWPAT-001.md` lists `.claude/skills/canon-addition/references/accept-path.md`, `.claude/skills/canon-addition/templates/canon-fact-record.yaml`, and `.claude/skills/canon-addition/templates/change-log-entry.yaml` as deleted surfaces in the atomic-source skill rewrite.
3. Shared boundary under audit: active spec prose describing canon-addition's retired template/reference surfaces and pre-SPEC-13 notes-field mirroring. This ticket is documentation truthing only; the live implementation boundary remains the patch engine's `append_modification_history_entry` op, canon-addition's Phase 12a semantic judgment, and the validator's one-way `modification_history_retrofit` check.
4. FOUNDATIONS principle: Rule 6 (No Silent Retcons) requires canon changes to be logged with justification. SPEC-17 Track C1 established that the structured `modification_history[]` field satisfies that audit trail without ongoing notes-field mirroring. This ticket preserves that conclusion in older planning prose.
5. Adjacent contradiction classification: the stale SPEC-06 row and stale canon-addition template/reference mentions are future cleanup from `archive/tickets/SPEC17AUDTRARET-001.md`; they are not unfinished work inside Track C1's completed five-surface deprecation ticket.
6. Final implementation boundary: this ticket remained docs-only / contract-truthing. It updated the active SPEC-06 and SPEC-17 prose plus `specs/IMPLEMENTATION-ORDER.md`; it did not touch skills, engine code, validators, schemas, hooks, or world content.

## Architecture Check

1. A documentation-only truthing pass is cleaner than reintroducing deleted canon-addition template surfaces or adding compatibility aliases. The live canon-addition output contract is engine-owned and validator-checked, not template-owned.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. SPEC-06 no longer implies notes-field mirroring is engine-owned -> codebase grep-proof against `specs/SPEC-06-skill-rewrite-patterns.md`.
2. Active SPEC-17 risk/implementation prose names the archived Track C1 ticket and the deleted-surface explanation truthfully -> manual review + codebase grep-proof.
3. No live skill/tool/schema behavior changed -> git diff scope check; no package test required.
4. Implementation-order/status prose reflects the completed cleanup -> manual review + grep-proof.

## What to Change

### 1. Truth SPEC-06 migration table

Update `specs/SPEC-06-skill-rewrite-patterns.md` so the migration table no longer claims `notes-field lines` move to SPEC-03 engine auto-stamping. Keep the row's intent if still useful for attribution comments, but name `modification_history[]` / validator discipline truthfully or split the row if needed.

### 2. Truth SPEC-17 stale-reference risk prose

Update `specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md` to record that Track C1 is archived at `archive/tickets/SPEC17AUDTRARET-001.md`, that the stale create-base-world forward-references were removed there, and that the deleted canon-addition template/reference surfaces trace to the SPEC-06 rewrite rather than an unresolved live implementation gap.

### 3. Truth implementation-order status

Update `specs/IMPLEMENTATION-ORDER.md` so the SPEC-17 row and Phase 2.7 order do not leave this completed cleanup invisible.

## Files to Touch

- `specs/SPEC-06-skill-rewrite-patterns.md` (modify)
- `specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md` (modify)
- `specs/IMPLEMENTATION-ORDER.md` (modify)

## Out of Scope

- Any change to `.claude/skills/canon-addition/`, `.claude/skills/create-base-world/`, `tools/patch-engine/`, or `tools/validators/`.
- Any change to `docs/FOUNDATIONS.md` or the CF Record schema.
- Backfilling, removing, or rewriting historical world `_source/canon/*.yaml` notes paragraphs.
- Track C2 retrieval-contract work, completed and archived at `archive/tickets/SPEC17AUDTRARET-002.md`.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "notes-field lines" specs/SPEC-06-skill-rewrite-patterns.md` returns 0 matches.
2. `grep -n "archive/tickets/SPEC17AUDTRARET-001.md" specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md` returns >=1 match.
3. `grep -nE "canon-addition/templates/canon-fact-record\\.yaml|canon-addition/references/accept-path\\.md" specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md` returns only historical/deleted-surface explanation lines, not actionable implementation instructions.
4. `grep -n "SPEC17AUDTRARET-003" specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md specs/IMPLEMENTATION-ORDER.md` returns the completed cleanup references.

### Invariants

1. `modification_history[]` remains the canonical audit surface for post-SPEC-13 CF retroactive modifications.
2. The patch engine and validator behavior remain unchanged.
3. Deleted canon-addition template/reference surfaces are not reintroduced as compatibility paths.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "notes-field lines" specs/SPEC-06-skill-rewrite-patterns.md`
2. `grep -n "archive/tickets/SPEC17AUDTRARET-001.md" specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md`
3. `grep -nE "canon-addition/templates/canon-fact-record\\.yaml|canon-addition/references/accept-path\\.md" specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md`
4. `grep -n "SPEC17AUDTRARET-003" specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md specs/IMPLEMENTATION-ORDER.md`

## Outcome

Completed: 2026-04-26.

Outcome amended: 2026-04-26 during post-ticket review to record archival.

Completed the active-spec truthing pass:

- Updated SPEC-06 so the migration table no longer says notes-field lines moved to SPEC-03 engine auto-stamping; it now names `modification_history[]` as the canonical structured audit surface for CF retroactive modifications.
- Updated SPEC-17 so the stale canon-addition template/reference risk is recorded as a closed deleted-surface cleanup rather than a live implementation gap.
- Updated `specs/IMPLEMENTATION-ORDER.md` so the SPEC-17 implementation-order/status prose records this active cleanup ticket.

No skill, engine, validator, schema, hook, or world-content behavior changed.

## Verification Result

Completed:

1. `grep -n "notes-field lines" specs/SPEC-06-skill-rewrite-patterns.md` returned zero matches.
2. `grep -n "archive/tickets/SPEC17AUDTRARET-001.md" specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md` returned matches.
3. `grep -nE "canon-addition/templates/canon-fact-record\\.yaml|canon-addition/references/accept-path\\.md" specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md` returned two matches, both in historical/deleted-surface explanation lines rather than actionable implementation instructions.
4. `grep -n "SPEC17AUDTRARET-003" specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md specs/IMPLEMENTATION-ORDER.md` returned the SPEC-17 implementation-order and IMPLEMENTATION-ORDER status references.
5. `git diff --check` passed.

## Deviations

- `specs/IMPLEMENTATION-ORDER.md` was added to `Files to Touch` because the active SPEC-17 implementation-order/status table is a same-seam consumer of the cleanup status.
- Archived during post-ticket review at `archive/tickets/SPEC17AUDTRARET-003.md`; active references were updated from `tickets/SPEC17AUDTRARET-003.md` to the archived path.
