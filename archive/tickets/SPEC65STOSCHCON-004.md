# SPEC65STOSCHCON-004: Folded doc cleanup — §16a packet-authority + historical headers

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — docs only (`.claude/skills/_shared-templates/story-state-contract.md`, `reports/`, `docs/triage/`); no code
**Deps**: None

## Problem

At intake, two documentation gaps surfaced by the second-iteration STCHAR audit:

- The §16a authority-packet contract does not state explicitly that a verified §16a packet is sufficient authority for prose/prose-attach *validation* but NOT the default authority for *new character-dependent state creation* (which requires full/projected STCHAR section retrieval). This codifies existing skill behavior; absent the sentence, a reader could over-trust a §16a packet as state-authoring authority.
- The first-iteration STCHAR report/triage and this second-iteration report can be misread as current operational guidance on the retired `bound_char_id` / direct `CHAR-*` runtime patterns, now that SPEC-58/59/60/63 have landed the merged STCHAR contracts.

## Assumption Reassessment (2026-05-21)

1. `.claude/skills/_shared-templates/story-state-contract.md` carries the §16a authority-packet contract (`required_because` enum / packet shape — 6 anchor matches verified this session). `tools/validators/src/structural/story-kernel-cast-bind-list-integrity.ts` hard-fails legacy `bound_char_id` — this is **current enforcement** and MUST NOT be altered by this docs ticket.
2. The target docs exist (verified this session): `archive/reports/stchar-audit-first-iteration.md`, `archive/reports/stchar-audit-second-iteration.md`, `docs/triage/2026-05-21-stchar-audit-first-iteration-triage.md`. SPEC-58/59/60/63 are archived/completed (the merged STCHAR contracts the headers reference).
3. **Cross-artifact boundary under audit**: the §16a contract sentence lands in the shared story-state contract (consumed by `branching-story-turn-cycle` / `branching-story-prose-attach`); the historical headers land in report/triage markdown. Neither touches validator code or schema.
4. **FOUNDATIONS Rule 6 No Silent Retcons**: the historical headers are *additive* annotations preserving the audit trail (naming what was superseded and by which specs), not deletions — the reports stay readable as history. The §16a sentence documents existing behavior, not a behavior change.

## Architecture Check

1. Docs-only edits with grep-provable acceptance keep the change reviewable and reversible; the §16a sentence and the headers are localized inserts.
2. No backwards-compatibility shim; no code path changes. The `bound_char_id` validator reference is deliberately left untouched (current enforcement, not stale advice).

## Verification Layers

1. §16a packet-authority sentence present → codebase grep-proof (`grep` for the new sentence in `story-state-contract.md` §16a returns a match).
2. Historical headers present → codebase grep-proof (`grep` for the "Historical — superseded by … SPEC-58/59/60/63 …" header in each of the three docs returns a match).
3. `bound_char_id` enforcement untouched → codebase grep-proof (`story-kernel-cast-bind-list-integrity.ts` `bound_char_id` references unchanged vs HEAD).

## Landed Changes

### 1. §16a packet-authority boundary sentence

`.claude/skills/_shared-templates/story-state-contract.md` §16a now states that a verified §16a packet is sufficient authority for prose and prose-attach validation, but not the default authority for new character-dependent state creation, which requires full or projected STCHAR section retrieval.

### 2. Historical headers

`archive/reports/stchar-audit-first-iteration.md`, `docs/triage/2026-05-21-stchar-audit-first-iteration-triage.md`, and `archive/reports/stchar-audit-second-iteration.md` now carry the header "Historical — superseded by the merged SPEC-58/59/60/63 STCHAR contracts; retained for audit trail". `story-kernel-cast-bind-list-integrity.ts` was not altered.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `archive/reports/stchar-audit-first-iteration.md` (modify)
- `archive/reports/stchar-audit-second-iteration.md` (modify)
- `docs/triage/2026-05-21-stchar-audit-first-iteration-triage.md` (modify)

## Out of Scope

- Any change to `story-kernel-cast-bind-list-integrity.ts` or its `bound_char_id` enforcement (current, not stale).
- Any schema or validator edit (those land in SPEC65STOSCHCON-001/002/003).
- Rewriting report bodies — headers are additive annotations only (Rule 6).

## Acceptance Criteria

### Tests That Must Pass

1. `grep` confirms the §16a packet-authority sentence is present in `story-state-contract.md`.
2. `grep` confirms the "Historical — superseded by … SPEC-58/59/60/63 …" header in all three report/triage files.
3. `grep` confirms `story-kernel-cast-bind-list-integrity.ts`'s `bound_char_id` references are unchanged.

### Invariants

1. Historical headers are additive; no report/triage body content is deleted (Rule 6).
2. `bound_char_id` enforcement remains active and unmodified.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage (the `bound_char_id` validator) is named in Assumption Reassessment.`

### Commands

1. `grep -n "not the default authority\|new character-dependent state" .claude/skills/_shared-templates/story-state-contract.md`
2. `grep -rl "Historical — superseded by the merged SPEC-58/59/60/63" reports/ docs/triage/`
3. `git diff --stat tools/validators/src/structural/story-kernel-cast-bind-list-integrity.ts` (expect no output — file untouched)

## Outcome

Completed: 2026-05-21

Landed the folded documentation cleanup from SPEC-65 §2.5:

1. Added the §16a packet-authority clarification to `.claude/skills/_shared-templates/story-state-contract.md`.
2. Added historical headers to both STCHAR audit reports and the first-iteration triage note.
3. Left `tools/validators/src/structural/story-kernel-cast-bind-list-integrity.ts` untouched.

## Verification Result

Passed:

1. `grep -n "not the default authority\|new character-dependent state" .claude/skills/_shared-templates/story-state-contract.md` — returned the new §16a sentence.
2. `grep -rl "Historical — superseded by the merged SPEC-58/59/60/63" reports/ docs/triage/` — returned exactly the three target files.
3. `git diff --stat tools/validators/src/structural/story-kernel-cast-bind-list-integrity.ts` — produced no output, proving the validator file stayed untouched.
4. `git diff --check -- .claude/skills/_shared-templates/story-state-contract.md archive/reports/stchar-audit-first-iteration.md archive/reports/stchar-audit-second-iteration.md docs/triage/2026-05-21-stchar-audit-first-iteration-triage.md archive/tickets/SPEC65STOSCHCON-004.md` — passed after archival path repair.

## Deviations

None. The ticket remained docs-only and additive; no schema, validator, or world-content surface changed.
