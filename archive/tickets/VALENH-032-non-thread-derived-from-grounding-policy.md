# VALENH-032: Reassess and mechanize non-THR `derived_from` grounding policy for turn-cycle-created records

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` structural validators/tests and validator inventory docs.
**Deps**: `archive/tickets/VALENH-031-thread-introduction-grounding-allowlist-stale-vs-spec42-47.md`

## Problem

At intake, `VALENH-031` had aligned `thread_introduction_grounding_integrity` with the turn-cycle contract for `THR.derived_from`, but post-ticket review confirmed the same contract named additional turn-cycle outputs that did not receive equivalent semantic grounding validation.

The turn-cycle skill says that when a tick causes a new or superseding `THR` / `SREL` / `CNSQ` / `SF` / story-`DA`, its `derived_from` should cite the active record that caused it, including SPEC-42/SPEC-47 causal classes such as `CLK`, `STSEC`, `STQ`, `STSTAT`, `STPLAN`, and `STEMO` (`.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 4-5). Before this ticket, live validators were uneven:

- `tools/validators/src/structural/thread-introduction-grounding-integrity.ts` now checks `THR.derived_from` for non-empty, parent-active or same-event-created, and semantically allowed classes.
- `tools/validators/src/structural/relationship-introduction-grounding-integrity.ts` checks `SREL.derived_from` only for non-empty; it does not verify referenced records are present, active, same-event-created, or semantically allowed.
- `CNSQ`, `SF`, and story-local `DA` have no class-specific introduction-grounding validator that enforces the turn-cycle direct-cause policy for newly created records.

Without this follow-up, authors could satisfy the contract for threads while laundering or weakening causal provenance for relationship shifts, consequences, story facts, and story-local artifacts.

## Assumption Reassessment (2026-05-22)

1. `VALENH-031` is completed and archived at `archive/tickets/VALENH-031-thread-introduction-grounding-allowlist-stale-vs-spec42-47.md`; its implementation deliberately scoped the allow-list fix to `THR` and left `SREL`/`CNSQ`/`SF`/story-local `DA` to this follow-up.
2. Before implementation, live `relationship_introduction_grounding_integrity` validated active participants, non-empty `derived_from[]`, duplicate relationship axes, full-world mode, `create_srel_record`/`create_stent_record` pre-apply plans, and touched relationship/entity files. It did not verify that `SREL.derived_from[]` entries resolve to parent-active or same-event-created records, or that their prefixes are the turn-cycle semantic direct-cause set.
3. `CNSQ`, `SF`, and story-local `DA` have schemas with optional `derived_from[]` arrays and patch-engine creation ops (`create_cnsq_record`, `create_sf_record`, `append_story_diegetic_artifact_record`), but they are not members of `SE.record_introductions[]` in `midstory-introduction-utils.ts`. Their precise turn-cycle surface is therefore `SE.state_delta.create[]` plus the created record's `derived_from[]`, not the structured-introduction validator.
4. Shared boundary under audit: the turn-cycle Phase 4-5 direct-cause contract for non-`THR` created outputs named alongside `THR`: `SREL`, `CNSQ`, `SF`, and story-local `DA`. The semantic allowed set remains the documented present-causal set (`SE`, legacy story-state causes, and SPEC-42/SPEC-47 `CLK`/`STSEC`/`STQ`/`STSTAT`/`STPLAN`/`STEMO`), not the broader schema regex union that also admits non-causal record classes.
5. FOUNDATIONS-aligned principle: present-causal story state should not float as authorial plot insertion. The landed validators enforce grounding only for records created by a turn-cycle event and skip root bootstrap creation, preserving Mystery Reserve and canon-promotion boundaries.
6. Class-by-class implementation decision: extend the existing `SREL` validator in place; add one focused structural validator for `CNSQ`, `SF`, and story-local `DA` turn-cycle-created records because their shared precise surface is `SE.state_delta.create[]`. No schema changes were needed because all four record schemas already express `derived_from[]`.
7. Baseline proof: pre-edit `npm test` in `tools/validators` passed with 861 tests, so broad-suite failures after implementation were treated as current-ticket fallout unless proven otherwise.
8. Same-seam proof fallout: adding a registered validator required updating `tools/validators/tests/integration/validate-patch-plan.test.ts` for the clean-plan skipped-execution matrix and `tools/world-mcp/tests/server/capability-parity.test.ts` for the downstream validator-name inventory. The new validator's pre-apply selector is intentionally keyed to `create_se_record` / `create_pg_record` plans and touched files, not standalone `create_sf_record` / `create_cnsq_record` / `append_story_diegetic_artifact_record` plans, because standalone output ops are not necessarily turn-cycle-created outputs.

## Architecture Check

1. This follow-up keeps `VALENH-031` narrow and complete while mechanizing the same turn-cycle causal-provenance contract at the precise live surfaces for non-`THR` created outputs.
2. No backwards-compatibility aliasing/shims should be introduced. Any validator changes should be explicit semantic checks with focused acceptance and rejection tests.

## Verification Layers

1. Current validator inventory for `SREL`/`CNSQ`/`SF`/story-`DA` grounding -> codebase grep-proof and manual review.
2. `SREL` rejects missing, inactive, or semantically invalid direct-cause grounding and accepts parent-active / same-event-created legitimate causes -> focused relationship validator tests.
3. `CNSQ`, `SF`, and story-local `DA` created by `SE.state_delta.create[]` reject missing, inactive, or semantically invalid grounding and accept legitimate direct causes -> focused new structural validator tests.
4. HARD-GATE/pre-apply behavior remains fail-closed for changed validators -> scoped `applies_to` tests and `tools/validators` package proof.

## Landed Changes

### 1. Reassess each non-THR record class

For `SREL`, `CNSQ`, `SF`, and story-local `DA`, the live schemas, patch-engine/create ops, turn-cycle write path, existing validators, and indexed read surfaces were inspected. The landed decisions are:

- `SREL`: expanded existing class-specific validator.
- `CNSQ` / `SF` / story-local `DA`: new shared structural validator over turn-cycle-created outputs discovered through `SE.state_delta.create[]`.

### 2. Land the bounded validator/test changes

`SREL` is enforced in the existing validator. `CNSQ`/`SF`/story-local `DA` are enforced in `turn_cycle_output_grounding_integrity`, keyed to `SE.state_delta.create[]`. Each class's accepted grounding set is tied to the turn-cycle direct-cause contract, not to the broad syntactic schema union.

## Files to Touch

- `tools/validators/src/structural/relationship-introduction-grounding-integrity.ts` (modify)
- `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts` (modify)
- `tools/validators/src/structural/turn-cycle-output-grounding-integrity.ts` (add)
- `tools/validators/tests/structural/turn-cycle-output-grounding-integrity.test.ts` (add)
- `tools/validators/src/public/registry.ts` (modify — register the new validator)
- `tools/validators/tests/structural/registry.test.ts` (modify — inventory list)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — structural validator count)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — clean pre-apply skipped-execution matrix)
- `tools/validators/README.md` (modify — validator inventory)
- `tools/world-mcp/tests/server/capability-parity.test.ts` (modify — downstream validator-name inventory)

## Out of Scope

- Reopening `VALENH-031` or changing the landed `THR` allow-list.
- Changing story record schemas unless reassessment proves an existing schema cannot express the needed direct-cause grounding.
- Editing world/story content to normalize existing bundles.
- Weakening hard gates, pre-apply failure semantics, or Mystery Reserve firewall checks.

## Acceptance Criteria

### Tests That Must Pass

1. Reassessment records an explicit class-by-class decision for `SREL`, `CNSQ`, `SF`, and story-local `DA`.
2. Every class selected for enforcement has positive tests for legitimate direct-cause grounding and negative tests for missing, inactive, or semantically invalid grounding.
3. The new validator is skipped for non-turn-cycle standalone story output ops, runs for event/page plans and full-world validation, and remains listed in the clean pre-apply skipped-execution matrix when no story event/page op is present.
4. `npm test` in `tools/validators` passes.

### Invariants

1. The direct-cause grounding policy remains semantic, not a blind copy of broad schema regex unions.
2. New validation cannot force canon promotion, resolve Mystery Reserve entries, or require world-canon writes from story-local records.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts` — added active/same-event accepted grounding and inactive/disallowed grounding rejection for `SREL`.
2. `tools/validators/tests/structural/turn-cycle-output-grounding-integrity.test.ts` — added accepted grounding, missing grounding, inactive grounding, disallowed class, bootstrap skip, non-target class skip, and pre-apply/touched-file applicability coverage for `CNSQ`, `SF`, and story-local `DA`.
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` — added the new validator to the clean-plan skipped-execution matrix.
4. `tools/world-mcp/tests/server/capability-parity.test.ts` — added the new validator to the downstream expected validator-name list.

### Commands

1. Targeted compiled proof from `tools/validators`: `npm run build` then `node --test dist/tests/structural/relationship-introduction-grounding-integrity.test.js dist/tests/structural/turn-cycle-output-grounding-integrity.test.js dist/tests/structural/registry.test.js dist/tests/integration/validate-patch-plan.test.js`.
2. Full package proof from `tools/validators`: `npm test`.
3. Downstream validator registry proof from `tools/world-mcp`: `npm run build` then `node --test dist/tests/server/capability-parity.test.js`.

## Outcome

Completed. `relationship_introduction_grounding_integrity` now validates `SREL.derived_from[]` against the same semantic direct-cause grounding discipline as `THR`: entries must be from allowed present-causal classes and must resolve to parent-active or same-event-created records.

Added `turn_cycle_output_grounding_integrity` for `CNSQ`, `SF`, and story-local `DA` records created by a turn-cycle event via `SE.state_delta.create[]`. It rejects missing, inactive, or semantically disallowed `derived_from[]` grounding, accepts parent-active and same-event-created causal grounding, skips root bootstrap creation, and avoids standalone story-output patch plans that are not necessarily turn-cycle event output.

The validator is registered in `tools/validators`, listed in the validators README, counted in the validator registry tests, and mirrored in the downstream `world-mcp` capability-parity expected validator list.

## Verification Result

1. Pre-edit baseline from `tools/validators`: `npm test` passed with 861 tests.
2. Targeted compiled proof from `tools/validators`: `npm run build` passed, then `node --test dist/tests/structural/relationship-introduction-grounding-integrity.test.js dist/tests/structural/turn-cycle-output-grounding-integrity.test.js dist/tests/structural/registry.test.js dist/tests/integration/validate-patch-plan.test.js` passed with 38 tests.
3. Full package proof from `tools/validators`: `npm test` passed with 870 tests.
4. Downstream proof from `tools/world-mcp`: `npm run build` passed, then `node --test dist/tests/server/capability-parity.test.js` passed with 5 tests.
5. Manual contract review covered `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 4-5, the four target story record schemas, the patch-engine story ops, `tools/validators/README.md`, and the validator registry/capability parity surfaces.
6. Post-ticket review rerun on 2026-05-22: `npm test` from `tools/validators` passed with 877 tests, and `npm run build` plus `node --test dist/tests/server/capability-parity.test.js` from `tools/world-mcp` passed with 5 tests.

## Deviations

- The implemented `turn_cycle_output_grounding_integrity.applies_to` selector was narrowed during proof from target output ops to event/page ops plus touched files. Standalone `create_sf_record`, `create_cnsq_record`, and `append_story_diegetic_artifact_record` patch plans are not necessarily turn-cycle outputs; enforcing this validator there made a clean canon-addition pre-apply plan incorrectly skip/fail its expected execution matrix.
- The new validator did not require schema changes. The existing schemas already allow `derived_from[]`; this ticket added semantic validation over the turn-cycle creation surface.
