# VALENH-026: Validate that story `SF.derived_from` CF references resolve to existing world canon (dangling-parent referential integrity)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/cross-file-reference.ts` (modified; extracts and resolves CF-shaped `story_fact_record.derived_from` references against world canon); `tools/validators/tests/structural/cross-file-reference.test.ts` (modified; positive/negative/unit-scope coverage); `tools/validators/tests/integration/validate-patch-plan.test.ts` (modified; pre-apply story-bundle plan coverage)
**Deps**: None

## Problem

At intake, during a `branching-story-bootstrap` run this session, the bundle's dry-run `mcp__worldloom__validate_patch_plan` (via the `validate-patch-plan` CLI) returned `status: pass` while `SF-1.derived_from` held `['CF-1']` — a world Canon Fact id that does not exist (`worlds/erotica-world/_source/canon/` contains `CF-0001`, not `CF-1`). The intended parent was the padded `CF-0001` (the saturation CF). The dangling reference was caught only by a manual `ls worlds/erotica-world/_source/canon/` grep before commit; no validator flagged it before this ticket.

A mirrored story fact (`SF`) that cites a non-existent parent CF is a floating-provenance record: its `derived_from` claims a canon lineage that cannot be resolved. Before this ticket, the validator framework already enforced this exact referential-integrity property for world-canon CF records — `tools/validators/src/structural/cross-file-reference.ts` `referencesFor()` extracted `source_basis.derived_from` (CF→CF), `affected_fact_ids` (CH→CF), `touched_by_cf`, and `originating_cf`, and the runner flagged any whose value was not in `existingIds`. But `referencesFor()` did not extract story-bundle `SF.derived_from`, and `tools/validators/src/structural/story-fact-authority.ts` checked only the narrower `canon_linked` → must-have-a-CF-parent rule (it did not verify the cited CF exists, and it skipped `branch_local` / mirrored SF entirely). So a `branch_local` mirrored SF could cite any CF-shaped string — existent or not — and pass.

## Assumption Reassessment (2026-05-20)

1. **Codebase reassessment.** At intake, `tools/validators/src/structural/cross-file-reference.ts` `referencesFor()` extracted only world-canon reference fields (`source_basis.derived_from`, `required_world_updates`, `affected_fact_ids`, `touched_by_cf`, `originating_cf`, `modification_history`/`extensions`); it did not handle `story_fact_record.derived_from`. `existingIds` is built from the structural records returned by the validator read surface. `tools/validators/src/structural/story-fact-authority.ts` only emits a verdict when `authority === 'canon_linked'` and `derived_from` lacks a `CF-\d+` pattern match — it neither verifies CF existence nor inspects `branch_local` SF. Confirmed at intake: no validator resolved `branch_local`/mirrored `SF.derived_from` CF references against world canon.
2. **Doc reassessment.** `docs/FOUNDATIONS.md` §Story Bundles §6a (Belief vs. Fact) and `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.3 define `SF.derived_from` as `[CF-<integer> | <story-local record id>]`, non-empty for mirrored or derived facts, with the truth-relation-propagation rule binding mirrored SF to their parent CF. The contract assumes the cited CF parent is real; nothing currently enforces it.
3. **Shared boundary.** The boundary under audit is story-bundle `SF` records (producers: `branching-story-bootstrap`, `branching-story-turn-cycle`) vs. world-canon CF existence (consumer: the pre-apply referential-integrity validator). This is a cross-namespace resolution: a story-bundle validation run must resolve `SF.derived_from` CF ids against the world-canon index, not only against the story-bundle's own ids. The live read surface already leaves world-canon records visible when no `story_slug` filter is passed to the structural-record query, and the pre-apply overlay adds same-envelope CF/SF records into that query result.
4. **FOUNDATIONS principle.** Rule 1 (No Floating Facts) — a fact whose declared provenance cannot be resolved is a floating fact; Rule 4 (No Globalization by Accident) — a mirrored SF must trace to a real parent CF, since the whole point of `derived_from` is to anchor branch-local truth to existing world canon at the correct scope; Rule 6 (No Silent Retcons) — a dangling parent reference silently breaks the canon-to-story audit trail. The validator must reject `SF.derived_from` CF references that do not resolve to an existing world CF.
5. **Enforcement-surface confirmation.** The change lands in `tools/validators/src/structural/cross-file-reference.ts`, a pre-apply structural validator. It strengthens referential integrity and is orthogonal to the Mystery Reserve firewall (gate 3 / `rule7_mystery_reserve_preservation`) and to HARD-GATE / canon-write ordering — it adds an existence check on already-authored `derived_from` values and changes no write ordering, no gate sequencing, and does not touch any MR-bearing record. It cannot weaken the MR firewall because it neither reads nor resolves any `M-<integer>` reference.
6. **Adjacent contradictions surfaced during reassessment.** The cross-namespace resolution scope was a **required consequence** of this ticket, not a separate bug. Live reassessment showed no new read-surface API was needed: `queryStructuralRecords()` already builds a world-wide structural record set, and `buildPreApplyReadSurface()` overlays same-envelope records before validation. The implementation therefore only needed to extract CF-shaped `SF.derived_from[]` entries into the existing reference set. The parallel question of validating non-SF cross-namespace `derived_from` (e.g., other story-bundle classes that may cite CF ids) remains future scope, not folded in.

## Architecture Check

1. Extending the existing `cross-file-reference` validator — the repo's canonical referential-integrity surface, which already resolves CF `source_basis.derived_from` existence and already carries cross-scope (`story_slug`) edge-resolution machinery — is cleaner than a bespoke story-fact-provenance validator, because it keeps all "does this declared reference resolve?" logic in one place and reuses the established `existingIds` / `indexedEdgeReferenceVerdicts` pattern. (`story-fact-authority.ts` remains the home for the authority-enum rule; this ticket does not move that logic.)
2. No backwards-compatibility aliasing or shims: the change adds a reference-extraction branch plus a resolution path; it introduces no dual-validation mode and no opt-out flag.

## Verification Layers

1. A story `SF` whose `derived_from` cites a non-existent CF (e.g., `CF-1` when only `CF-0001` exists) produces a `fail` verdict → `cross-file-reference.test.ts` negative case.
2. A story `SF` whose `derived_from` cites an existing world CF passes → `cross-file-reference.test.ts` positive case.
3. The pre-existing `canon_linked` → CF-parent rule in `story-fact-authority.ts` is unchanged and still passes its suite → existing `story-fact-authority.test.ts` (regression).
4. Cross-namespace resolution: a story-bundle validation run resolves `SF.derived_from` against world canon (not only story-scope ids) → integration test exercising a story-bundle plan whose SF cites a real world CF.

## Landed Changes

### 1. Extracted `story_fact_record.derived_from` CF references

`tools/validators/src/structural/cross-file-reference.ts` now adds each `CF-<integer>`-patterned `story_fact_record.derived_from[]` entry as a `{ kind: 'record', field: 'derived_from' }` reference. Non-CF story-local ids stay outside this validator and remain owned by story-scope validators.

### 2. Resolved CF references cross-namespace through the existing read surface

The existing `cross_file_reference.orphan_reference` verdict is reused for misses. A real `CF-0001` resolves because world-canon CF records are already in the structural record set; a fabricated `CF-1` fails.

### 3. Test coverage

`cross-file-reference.test.ts` covers dangling-CF failure, existing-CF success, and the guard that story-local non-CF `derived_from` ids are not absorbed by this validator. `validate-patch-plan.test.ts` covers the same positive/negative behavior through a Shape B story-bundle pre-apply plan.

## Files to Touch

- `tools/validators/src/structural/cross-file-reference.ts` (modify)
- `tools/validators/tests/structural/cross-file-reference.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)

## Out of Scope

- SF **scope-widening** detection (whether a mirrored SF widens the parent CF's geographic/temporal/social scope) — that Rule 4 check is owned by `branching-story-bootstrap` Phase 9 bootstrap-additional check 2 and is a separate concern from referential existence.
- `derived_from` validation for non-SF story-bundle classes that may cite CF ids — logged as potential future scope.
- Any change to `story-fact-authority.ts`'s `canon_linked` authority-enum rule.
- Changing the `SF` schema or the `derived_from` field shape.

## Acceptance Criteria

### Tests That Must Pass

1. `node --test dist/tests/structural/cross-file-reference.test.js` — new negative case (dangling CF) fails validation; new positive case (existing CF) passes.
2. `node --test dist/tests/integration/validate-patch-plan.test.js` — Shape B pre-apply story-bundle plan rejects `SF.derived_from: ["CF-1"]` and accepts `["CF-0001"]`.
3. `node --test dist/tests/structural/story-fact-authority.test.js` — unchanged `canon_linked` rule still passes (regression).
4. `cd tools/validators && npm test` — full compiled suite passes.

### Invariants

1. Every story `SF.derived_from` entry matching `^CF-[0-9]+$` resolves to an existing world Canon Fact record, or validation fails.
2. The check is orthogonal to the Mystery Reserve firewall and HARD-GATE ordering — no MR-bearing record is read and no gate sequencing changes.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/cross-file-reference.test.ts` — added a dangling-CF negative case and an existing-CF positive case for `story_fact_record.derived_from`, plus a non-CF guard fixture.
2. `tools/validators/tests/integration/validate-patch-plan.test.ts` — added pre-apply story-bundle plan coverage for dangling and existing CF parents.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/cross-file-reference.test.js dist/tests/integration/validate-patch-plan.test.js dist/tests/structural/story-fact-authority.test.js`
3. `cd tools/validators && npm test` (the validators `test` script chains `npm run build` then `node --test dist/tests/**/*.test.js`)

## Outcome

Implemented. `cross_file_reference` now rejects CF-shaped `SF.derived_from[]` parents that do not resolve to an existing world Canon Fact record. The change reuses the existing `cross_file_reference.orphan_reference` code and does not alter `story_fact_authority`, `SF` schema shape, write ordering, approval-token behavior, or Mystery Reserve handling.

Package README/user-facing surfaces were inspected. No README update was needed because the existing validator inventory and gate-semantics prose still describe `cross_file_reference` and pre-apply fail behavior at the correct level.

## Verification Result

1. Baseline before edits: `cd tools/validators && npm test` — pass, 706 tests.
2. Post-edit producer build: `cd tools/validators && npm run build` — pass.
3. Focused proof: `cd tools/validators && node --test dist/tests/structural/cross-file-reference.test.js dist/tests/integration/validate-patch-plan.test.js dist/tests/structural/story-fact-authority.test.js` — pass, 31 tests.
4. Full package proof: `cd tools/validators && npm test` — pass, 711 tests.

## Deviations

- The implementation reused `cross_file_reference.orphan_reference` rather than adding a new `cross_file_reference.unresolved_story_fact_parent` code. This preserves the existing referential-integrity verdict surface.
- Reassessment found no new cross-namespace read-surface implementation was necessary; the existing structural read surface and pre-apply overlay already make world CF records visible to the validator.
