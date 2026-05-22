# SPEC60STCHARMACLAY-004: Docs reconciliation for STCHAR machine-layer

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — documentation only (`docs/MACHINE-FACING-LAYER.md`, `docs/CONTEXT-PACKET-CONTRACT.md`) plus archival of a stale report and an OBSOLETE banner on a stale triage doc. No production code, tests, or schema files.
**Deps**: archive/tickets/SPEC60STCHARMACLAY-002.md

## Problem

At intake, three documentation surfaces were out of date relative to landed STCHAR (SPEC-56/57) work:
- `docs/MACHINE-FACING-LAYER.md` does not list `story_character_authority_record` among retrievable record types, and does not distinguish bootstrap/profile-source `CHAR` reads from runtime STCHAR consumption.
- `docs/CONTEXT-PACKET-CONTRACT.md` does not document the `story_character_profile` task type or the STCHAR component of `story_bundle_context` (`active_story_characters`).
- `reports/story-character-dossier-retrieval-concerns.md` and `docs/triage/2026-05-20-story-character-dossier-retrieval-triage.md` give pre-STCHAR guidance (`STENT.bound_char_id`, turn-cycle re-seeding world `CHAR` dossiers) that operators must not follow.

## Assumption Reassessment (2026-05-21)

1. `grep` confirms `story_character_authority_record` is the live node_type / `list_records` token (`tools/world-index/src/schema/types.ts:48`, `tools/world-mcp/src/tools/list-records.ts`, `get-record.ts`), but it is absent from `docs/MACHINE-FACING-LAYER.md` (zero matches). `active_story_characters` exists in code (`tools/world-mcp/src/context-packet/shared.ts:202`, `server.ts:415`, `story-bundle-context.ts:843`) and is status-based (`story-bundle-context.ts:470` filters `status === "active"`), but is absent from `docs/CONTEXT-PACKET-CONTRACT.md` (zero matches).
2. `STENT.bound_char_id` is a removed pre-STCHAR field: the validator `tools/validators/src/structural/story-kernel-cast-bind-list-integrity.ts:84-90` flags `bound_char_id` as legacy ("story runtime authority must use STCHAR ids"). `reports/story-character-dossier-retrieval-concerns.md` is pervasively pre-STCHAR; `docs/triage/2026-05-20-story-character-dossier-retrieval-triage.md` (lines 25, 44) describes turn-cycle deriving `STENT.bound_char_id` and an Option-D durable detector keyed on it. The `bound_char_id` mention in `docs/triage/2026-05-16-story-related-improvements-seventh-iteration-triage.md` is a historical record of a past contract state — leave it as-is.
3. **Cross-artifact boundary under audit**: this ticket reconciles docs against the post-SPEC-56/57 + archived `archive/tickets/SPEC60STCHARMACLAY-002.md` code state; it touches no `_source/` canon and no skill files. The `story_character_profile` task-type documentation (in `CONTEXT-PACKET-CONTRACT.md`) describes the surface `archive/tickets/SPEC60STCHARMACLAY-002.md` introduced, so this ticket must land after that archived prerequisite to avoid documenting a not-yet-existing task type. The `explicit non-change` set — `archive/reports/stchar-implementation-first-iteration.md` and `archive/reports/stchar-audit-first-iteration.md` (which legitimately carry `bound_char_id` as historical migration narrative) — must NOT be edited.
4. **Rule 6 (No Silent Retcons)**: archiving the stale report and bannering the stale triage doc (rather than deleting) preserves the attribution chain — what was removed and why stays visible per FOUNDATIONS §Default Reality. The OBSOLETE banner cites the superseding work ("superseded by STCHAR (SPEC-56/57)") so a future reader can reconstruct the supersession.

## Architecture Check

1. Documenting the live record-type token + task type and archiving/bannering the contradictory pre-STCHAR guidance is the minimal reconciliation that satisfies §2.5 acceptance; it adds no new doc structure beyond the existing retrievable-record-type listing and task-type tables.
2. No backwards-compatibility shim: stale guidance is archived/bannered with a supersession pointer, not retained as an active alternative path.

## Verification Layers

1. `MACHINE-FACING-LAYER.md` lists `story_character_authority_record` → `grep -n "story_character_authority_record" docs/MACHINE-FACING-LAYER.md` returns ≥1 match.
2. `CONTEXT-PACKET-CONTRACT.md` documents `story_character_profile` + `active_story_characters` → `grep` returns matches for both.
3. No active (non-archive, non-historical-report) doc states STENT uses `bound_char_id` → `grep -rn "bound_char_id" docs/` returns only the historical 2026-05-16 triage and the now-bannered 2026-05-20 triage (banner adjacent); the report is relocated under `archive/`.
4. The `explicit non-change` reports are untouched → `git status` shows no modification to `archive/reports/stchar-implementation-first-iteration.md` / `archive/reports/stchar-audit-first-iteration.md`.

## Landed Changes

### 1. `docs/MACHINE-FACING-LAYER.md`

Added `story_character_authority_record` to the retrievable record-type listings. Clarified that story-pipeline `seed_nodes` use world-scope `CHAR` ids **only for bootstrap / profile-source reads**, while normal turn-cycle / page-plan / prose runtime consumes active STCHAR through story context and targeted STCHAR retrieval.

### 2. `docs/CONTEXT-PACKET-CONTRACT.md`

Documented the `story_character_profile` task type and the STCHAR component of `story_bundle_context` (`active_story_characters`, noting it is status-based per current code).

### 3. Archive the stale report

Archived `reports/story-character-dossier-retrieval-concerns.md` to `archive/reports/story-character-dossier-retrieval-concerns-2026-05-21.md` with `git mv`.

### 4. Banner the stale triage doc

Prepended an "OBSOLETE — superseded by STCHAR (SPEC-56/57)" banner to `docs/triage/2026-05-20-story-character-dossier-retrieval-triage.md` so its Option-D `STENT.bound_char_id` detector guidance is not followed.

## Files to Touch

- `docs/MACHINE-FACING-LAYER.md` (modify)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)
- `reports/story-character-dossier-retrieval-concerns.md` (modify — relocate to `archive/reports/story-character-dossier-retrieval-concerns-2026-05-21.md`)
- `archive/reports/story-character-dossier-retrieval-concerns-2026-05-21.md` (new — archival target)
- `docs/triage/2026-05-20-story-character-dossier-retrieval-triage.md` (modify — OBSOLETE banner)

## Out of Scope

- `archive/reports/stchar-implementation-first-iteration.md` and `archive/reports/stchar-audit-first-iteration.md` (historical migration narrative — must NOT be edited).
- `docs/triage/2026-05-16-story-related-improvements-seventh-iteration-triage.md` (historical record of a past contract state — leave as-is).
- No production code, tests, or schema files; no `_source/` canon.
- The §2.4 optional `active_story_characters` rename / page-scoping (spec-deferred; tracked in `archive/tickets/SPEC60STCHARMACLAY-002.md` Out of Scope).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "story_character_authority_record" docs/MACHINE-FACING-LAYER.md` returns ≥1 match.
2. `grep -nE "story_character_profile|active_story_characters" docs/CONTEXT-PACKET-CONTRACT.md` returns matches for both.
3. `grep -rn "bound_char_id" docs/` shows the 2026-05-20 triage carries an OBSOLETE banner and no other active doc presents `STENT.bound_char_id` as live guidance; `test -f archive/reports/story-character-dossier-retrieval-concerns-2026-05-21.md` and `test ! -f reports/story-character-dossier-retrieval-concerns.md`.

### Invariants

1. No active (non-archive, non-historical-report) doc states STENT uses `bound_char_id`.
2. Retrieval docs list `story_character_authority_record`; story-pipeline docs distinguish bootstrap/profile source reads from runtime STCHAR reads.
3. The two historical STCHAR migration reports remain byte-unchanged.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based (grep-proofs against the post-implementation tree) and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "story_character_authority_record" docs/MACHINE-FACING-LAYER.md && grep -nE "story_character_profile|active_story_characters" docs/CONTEXT-PACKET-CONTRACT.md`
2. `test -f archive/reports/story-character-dossier-retrieval-concerns-2026-05-21.md && test ! -f reports/story-character-dossier-retrieval-concerns.md && head -3 docs/triage/2026-05-20-story-character-dossier-retrieval-triage.md`
3. `git status --short archive/reports/stchar-implementation-first-iteration.md archive/reports/stchar-audit-first-iteration.md` — must show no modification (explicit non-change guard).

## Outcome

Completed: 2026-05-21

This ticket reconciled the active machine-facing docs with the landed STCHAR machine layer:

- `docs/MACHINE-FACING-LAYER.md` now lists `story_character_authority_record` as a story-bundle retrieval type and distinguishes profile-source `CHAR` reads from runtime STCHAR authority.
- `docs/CONTEXT-PACKET-CONTRACT.md` now documents `story_character_profile`, its 12000 default budget, source-`CHAR` full-body eligibility, and the status-based `story_bundle_context.active_story_characters` surface.
- `reports/story-character-dossier-retrieval-concerns.md` was archived to `archive/reports/story-character-dossier-retrieval-concerns-2026-05-21.md`.
- `docs/triage/2026-05-20-story-character-dossier-retrieval-triage.md` now carries an OBSOLETE banner warning operators not to use its `STENT.bound_char_id` guidance as current authority.

## Verification Result

Passed:

1. `grep -n "story_character_authority_record" docs/MACHINE-FACING-LAYER.md` returned matches in the `list_records` and `get_context_packet` rows.
2. `grep -nE "story_character_profile|active_story_characters" docs/CONTEXT-PACKET-CONTRACT.md` returned matches in the task header, story-bundle context, assembly discipline, full-body tables, and the new profile section.
3. `test -f archive/reports/story-character-dossier-retrieval-concerns-2026-05-21.md` and `test ! -f reports/story-character-dossier-retrieval-concerns.md` both passed.
4. `head -6 docs/triage/2026-05-20-story-character-dossier-retrieval-triage.md` showed the OBSOLETE banner immediately after the title.
5. `git status --short archive/reports/stchar-implementation-first-iteration.md archive/reports/stchar-audit-first-iteration.md` returned no output, proving the explicit non-change reports stayed untouched.
6. `rg -n "bound_char_id" docs reports archive/reports/story-character-dossier-retrieval-concerns-2026-05-21.md archive/specs/SPEC-60-stchar-machine-layer-and-docs-completeness.md archive/tickets/SPEC60STCHARMACLAY-004.md` showed only historical/provenance or explicitly bannered hits: this ticket/spec, the archived report, the bannered 2026-05-20 triage, the explicitly excluded 2026-05-16 triage, and historical STCHAR reports.

## Deviations

- The negative `bound_char_id` proof is a classified discovery sweep, not a zero-hit command. Historical reports, the active SPEC-60/ticket evidence, and the bannered triage file intentionally preserve the old term as provenance.
- No production code, tests, schemas, or `_source/` world-canon files changed.
