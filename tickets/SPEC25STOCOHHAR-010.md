# SPEC25STOCOHHAR-010: FOUNDATIONS.md amendments

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — modifies `docs/FOUNDATIONS.md` only (cross-cutting docs ticket; no production code).
**Deps**: archive/tickets/SPEC25STOCOHHAR-001.md, archive/tickets/SPEC25STOCOHHAR-004.md, archive/tickets/SPEC25STOCOHHAR-005.md, SPEC25STOCOHHAR-006, SPEC25STOCOHHAR-008

## Problem

SPEC-25's schema additions and a pre-existing doc-drift must be propagated into `docs/FOUNDATIONS.md`: §6 does not list `STSTAT`; §5's Rule-1 examples do not reflect the new load-bearing story-bundle fields; and §9 still references the archived SPEC-19/20 `arc.beat_plan` / `cadence_policy` scene-commitment-arc vocabulary that no longer exists anywhere in the landed pipeline. This is a cross-cutting docs ticket that lands once the implementation tickets it references have shipped.

## Assumption Reassessment (2026-05-14)

1. FOUNDATIONS §6 (line 598) lists per-bundle records as "STENT, SF, BEL, SE, OBL, CNSQ, THR, SREL, STINT, STLOC, STOBJ, BR, PG, CHC, SLT, and SLB" — no `STSTAT`. §5 (the Validation Rules section, Rule 1 area around line 380-388) enumerates Rule-1 story-bundle-schema-field examples. §9 (Prose Length Discipline At Story Scope, lines 620-628) references `arc.beat_plan.min_beats`, `max_beats`, `STORY_KERNEL.cadence_policy.max_arcs_without_menu_soft`, and `max_arcs_without_player_commitment_soft`.
2. SPEC-25 D7 prescribes: §6 add `STSTAT` to the per-bundle records list; §5 / §5b extend the examples to reflect the new load-bearing fields (`STSTAT` life/agency/location, `SF.authority`, `OBL` / `CNSQ` `urgency`, `CHC.grounded_in`, the DSL v2 predicates) — §5b needs no text change beyond confirming the shared story state contract remains the authoritative schema source; §9 reconcile the structural-pacing references against the landed contract.
3. Cross-artifact boundary under audit: `docs/FOUNDATIONS.md` references surfaces created or extended by SPEC25STOCOHHAR-001 (`STSTAT`), SPEC25STOCOHHAR-004 (`SF.authority`), SPEC25STOCOHHAR-005 (`OBL` / `CNSQ` `urgency`), SPEC25STOCOHHAR-006 (DSL v2 predicates), and SPEC25STOCOHHAR-008 (`CHC.grounded_in`). This docs ticket lands the §5 / §6 edits atomically once those surfaces exist. SPEC25STOCOHHAR-002 / -003 / -007 add no schema surface FOUNDATIONS cites; SPEC25STOCOHHAR-009 changes no schema — none are `Deps`.
4. FOUNDATIONS principle under audit: this ticket amends `docs/FOUNDATIONS.md` itself per SPEC-25 D7. The §5 / §5b / §6 amendments reflect the landed schema state; §5b's schema-minimalism gate is satisfied by SPEC-25's per-deliverable load-bearing justification, so no §5b text change is required beyond confirming the shared story state contract is the authoritative schema source. The §9 reconciliation removes a pre-existing doc-drift (it does not change the §9 anti-word-count discipline).
5. Mismatch + correction: SPEC-25 D7 §9 instructs the implementer to "verify the current `STORY_KERNEL.md` template's actual `cadence_policy` field set before rewording." Codebase verification (2026-05-14): `cadence_policy` does not appear anywhere in the landed story-pipeline skills or in `.claude/skills/_shared-templates/story-state-contract.md`, and there is no `STORY_KERNEL.md` template file carrying it — the `arc.beat_plan` / `cadence_policy` vocabulary is fully archived (SPEC-19/20 era). The §9 reconciliation is therefore a *removal* of the stale references, not a rewording to a renamed field; the landed contract §4.4 `SLT` schema has a flat `beats: 1-5` list and no `arc` field. SPEC-25 D7 §9 explicitly "prescribes the reconciliation, not specific replacement text," so this correction is within the deliverable's stated scope.

## Architecture Check

1. A single cross-cutting docs ticket landing after the implementation tickets — rather than per-ticket FOUNDATIONS edits — keeps §5's example list and §6's record list internally coherent: they reference all of SPEC-25's new surfaces in one breath, so they need all those surfaces to exist before the docs can land truthfully.
2. No shims: §9's stale `arc.beat_plan` / `cadence_policy` references are removed, not aliased to renamed fields — the landed contract has no equivalent fields, so there is nothing to alias to.

## Verification Layers

1. §6 lists `STSTAT` -> grep-proof: `grep -n "STSTAT" docs/FOUNDATIONS.md`.
2. §5 examples reflect the new load-bearing fields -> manual review against SPEC-25 D7 and the landed schemas.
3. §9 contains no `arc.beat_plan` or `cadence_policy` reference -> grep-proof: `grep -nE "arc\.beat_plan|cadence_policy|max_arcs_without" docs/FOUNDATIONS.md` returns no matches.
4. §9's reworded structural-pacing prose matches the landed contract -> FOUNDATIONS alignment check against `.claude/skills/_shared-templates/story-state-contract.md` §4.4 (`SLT` `beats: 1-5`, no `arc` field).

## What to Change

### 1. §6 Story-Bundle ID Classes

Add `STSTAT` to the per-bundle records list.

### 2. §5 / §5b Validation Rules + Schema-Minimalism

Extend §5's Rule-1 story-bundle-schema-field examples to reflect the new load-bearing fields: `STSTAT` life / agency / location, `SF.authority`, `OBL` / `CNSQ` `urgency`, `CHC.grounded_in`, and the DSL v2 existential predicates. Confirm §5b still names the shared story state contract as the authoritative schema source; make no other §5b text change.

### 3. §9 Prose Length Discipline At Story Scope

Remove the stale `arc.beat_plan.min_beats` / `max_beats` and `STORY_KERNEL.cadence_policy.max_arcs_without_menu_soft` / `max_arcs_without_player_commitment_soft` references. Reword the structural-pacing prose to reference the landed contract §4.4 `SLT` `beats: 1-5` list. Keep the §9 anti-word-count discipline (no word-count targets / floors / ceilings on rendered prose) fully intact — only the stale structural-pacing vocabulary is reconciled.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify — §5 / §5b, §6, §9)

## Out of Scope

- Any production code, schema file, validator, or skill — this is a docs-only ticket.
- The story-state contract (`.claude/skills/_shared-templates/story-state-contract.md`) — its §3 / §4 / §5 edits land in SPEC25STOCOHHAR-001 / -002 / -004 / -005 / -006 / -008; D7 propagates the *already-landed* state into FOUNDATIONS.
- The §9 anti-word-count discipline itself — only the stale `arc.beat_plan` / `cadence_policy` structural-pacing references are reconciled.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "STSTAT" docs/FOUNDATIONS.md` — §6 lists `STSTAT`.
2. `grep -nE "arc\.beat_plan|cadence_policy|max_arcs_without" docs/FOUNDATIONS.md` — returns no matches.
3. Manual review: §5 examples cite `SF.authority`, `OBL` / `CNSQ` `urgency`, `CHC.grounded_in`, the DSL v2 predicates, and `STSTAT` life / agency / location.

### Invariants

1. FOUNDATIONS §6's per-bundle record list includes every story-bundle class the landed contract §3 inventory defines (now including `STSTAT`).
2. FOUNDATIONS §9 references only structural-pacing vocabulary that exists in the landed contract.

## Test Plan

### New/Modified Tests

None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -nE "STSTAT|arc\.beat_plan|cadence_policy|max_arcs_without" docs/FOUNDATIONS.md`
2. Manual review of §5 / §5b / §6 / §9 against SPEC-25 D7 and `.claude/skills/_shared-templates/story-state-contract.md` §4.4.
