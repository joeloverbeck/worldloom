# VALENH-032: Reassess and mechanize non-THR `derived_from` grounding policy for turn-cycle-created records

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — likely `tools/validators` structural validators/tests; possibly validator README/docs if new validators are registered.
**Deps**: `archive/tickets/VALENH-031-thread-introduction-grounding-allowlist-stale-vs-spec42-47.md`

## Problem

`VALENH-031` aligned `thread_introduction_grounding_integrity` with the turn-cycle contract for `THR.derived_from`, but post-ticket review confirmed the same contract names additional turn-cycle outputs that do not receive equivalent semantic grounding validation.

The turn-cycle skill says that when a tick causes a new or superseding `THR` / `SREL` / `CNSQ` / `SF` / story-`DA`, its `derived_from` should cite the active record that caused it, including SPEC-42/SPEC-47 causal classes such as `CLK`, `STSEC`, `STQ`, `STSTAT`, `STPLAN`, and `STEMO` (`.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 4-5). Live validators are uneven:

- `tools/validators/src/structural/thread-introduction-grounding-integrity.ts` now checks `THR.derived_from` for non-empty, parent-active or same-event-created, and semantically allowed classes.
- `tools/validators/src/structural/relationship-introduction-grounding-integrity.ts` checks `SREL.derived_from` only for non-empty; it does not verify referenced records are present, active, same-event-created, or semantically allowed.
- `CNSQ`, `SF`, and story-local `DA` have no class-specific introduction-grounding validator that enforces the turn-cycle direct-cause policy for newly created records.

Without a follow-up, authors can still satisfy the contract for threads while laundering or weakening causal provenance for relationship shifts, consequences, story facts, and story-local artifacts.

## Assumption Reassessment (2026-05-22)

1. `VALENH-031` is completed and archived at `archive/tickets/VALENH-031-thread-introduction-grounding-allowlist-stale-vs-spec42-47.md`; its implementation deliberately scoped the allow-list fix to `THR`.
2. Live `relationship_introduction_grounding_integrity` currently validates active participants, non-empty `derived_from[]`, and duplicate relationship axes, but not the existence/activity/class semantics of `derived_from[]`.
3. Shared boundary under audit: the turn-cycle `derived_from` direct-cause contract for non-THR records named alongside `THR` in Phase 4-5: `SREL`, `CNSQ`, `SF`, and story-local `DA`.
4. FOUNDATIONS-aligned principle: present-causal story state should not float as authorial plot insertion. A validator may enforce grounding only where the record's schema and lifecycle make that enforcement semantically precise; this ticket must preserve Mystery Reserve and canon-promotion boundaries.
5. The correct implementation may be asymmetric after reassessment. `SREL` already has a class-specific validator and is likely the narrowest first landing. `CNSQ`, `SF`, and story-local `DA` may need separate validators, integration into an existing validator, or an explicit documented exclusion if their lifecycle has a stronger existing grounding mechanism.
6. Mismatch + correction: do not blindly copy the `THR` allow-list to every class. Reassess each target class against its live schema, writer operations, turn-cycle creation path, and existing validators before deciding the exact enforcement surface.

## Architecture Check

1. This follow-up keeps `VALENH-031` narrow and complete while preserving the broader turn-cycle causal-provenance contract as a separate validator design problem.
2. No backwards-compatibility aliasing/shims should be introduced. Any validator changes should be explicit semantic checks with focused acceptance and rejection tests.

## Verification Layers

1. Current validator inventory for `SREL`/`CNSQ`/`SF`/story-`DA` grounding -> codebase grep-proof and manual review.
2. Chosen enforcement surface rejects missing, inactive, or semantically invalid direct-cause grounding where enforcement is appropriate -> focused validator tests.
3. Legitimate SPEC-42/SPEC-47 causal classes remain accepted where the turn-cycle contract admits them -> focused validator tests.
4. HARD-GATE/pre-apply behavior remains fail-closed for changed validators -> `tools/validators` package proof and, when validator applicability changes, validate-patch-plan integration proof.

## What to Change

### 1. Reassess each non-THR record class

For `SREL`, `CNSQ`, `SF`, and story-local `DA`, inspect live schemas, patch-engine/create ops, turn-cycle write path, existing validators, and indexed read surfaces. Decide whether the class needs:

- an expanded existing class-specific validator,
- a new class-specific validator,
- integration into an existing provenance validator,
- or a documented exclusion with a stronger existing grounding mechanism.

### 2. Land the bounded validator/test changes

Implement only the classes whose enforcement surface is precise and directly supported by current record shape. Keep each class's accepted grounding set tied to the turn-cycle direct-cause contract, not to the broad syntactic schema union.

## Files to Touch

- `tools/validators/src/structural/relationship-introduction-grounding-integrity.ts` (likely modify)
- `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts` (likely modify)
- `tools/validators/src/structural/*` (modify/add only if reassessment proves `CNSQ`, `SF`, or story-`DA` needs a separate validator)
- `tools/validators/tests/structural/*` (modify/add matching focused tests)
- `tools/validators/README.md` (modify only if validator inventory changes)

## Out of Scope

- Reopening `VALENH-031` or changing the landed `THR` allow-list.
- Changing story record schemas unless reassessment proves an existing schema cannot express the needed direct-cause grounding.
- Editing world/story content to normalize existing bundles.
- Weakening hard gates, pre-apply failure semantics, or Mystery Reserve firewall checks.

## Acceptance Criteria

### Tests That Must Pass

1. Reassessment records an explicit class-by-class decision for `SREL`, `CNSQ`, `SF`, and story-local `DA`.
2. Every class selected for enforcement has positive tests for legitimate direct-cause grounding and negative tests for missing, inactive, or semantically invalid grounding.
3. If a validator is added or its `applies_to` changes for pre-apply-relevant paths, validate-patch-plan coverage proves the changed validator is invoked in the intended pre-apply path.
4. `npm test` in `tools/validators` passes.

### Invariants

1. The direct-cause grounding policy remains semantic, not a blind copy of broad schema regex unions.
2. New validation cannot force canon promotion, resolve Mystery Reserve entries, or require world-canon writes from story-local records.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts` — likely add active/same-event accepted grounding and inactive/disallowed grounding rejection for `SREL`.
2. Additional structural validator tests only for `CNSQ`, `SF`, or story-local `DA` if reassessment lands an enforcement surface for those classes.

### Commands

1. Targeted compiled proof from `tools/validators`, e.g. `npm run build` then `node --test dist/tests/structural/<changed-test>.test.js`.
2. Full package proof from `tools/validators`: `npm test`.
