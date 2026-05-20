# VALENH-026: Validate that story `SF.derived_from` CF references resolve to existing world canon (dangling-parent referential integrity)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/cross-file-reference.ts` (modify; extract and resolve `story_fact_record.derived_from` CF references against world canon); `tools/validators/tests/structural/cross-file-reference.test.ts` (modify; positive + negative cases)
**Deps**: None

## Problem

During a `branching-story-bootstrap` run this session, the bundle's dry-run `mcp__worldloom__validate_patch_plan` (via the `validate-patch-plan` CLI) returned `status: pass` while `SF-1.derived_from` held `['CF-1']` — a world Canon Fact id that does not exist (`worlds/erotica-world/_source/canon/` contains `CF-0001`, not `CF-1`). The intended parent was the padded `CF-0001` (the saturation CF). The dangling reference was caught only by a manual `ls worlds/erotica-world/_source/canon/` grep before commit; no validator flagged it.

A mirrored story fact (`SF`) that cites a non-existent parent CF is a floating-provenance record: its `derived_from` claims a canon lineage that cannot be resolved. The validator framework already enforces this exact referential-integrity property for world-canon CF records — `tools/validators/src/structural/cross-file-reference.ts` `referencesFor()` extracts `source_basis.derived_from` (CF→CF), `affected_fact_ids` (CH→CF), `touched_by_cf`, and `originating_cf`, and the runner flags any whose value is not in `existingIds`. But `referencesFor()` never extracts story-bundle `SF.derived_from`, and `tools/validators/src/structural/story-fact-authority.ts` checks only the narrower `canon_linked` → must-have-a-CF-parent rule (it does not verify the cited CF exists, and it skips `branch_local` / mirrored SF entirely). So a `branch_local` mirrored SF can cite any CF-shaped string — existent or not — and pass.

## Assumption Reassessment (2026-05-20)

1. **Codebase reassessment.** At HEAD, `tools/validators/src/structural/cross-file-reference.ts` `referencesFor()` (l.60–100) extracts only world-canon reference fields (`source_basis.derived_from`, `required_world_updates`, `affected_fact_ids`, `touched_by_cf`, `originating_cf`, `modification_history`/`extensions`); it does not handle `story_fact_record.derived_from`. `existingIds` (l.26) is built from the in-scope `records`. `tools/validators/src/structural/story-fact-authority.ts` (l.1–45) only emits a verdict when `authority === 'canon_linked'` and `derived_from` lacks a `CF-\d+` pattern match — it neither verifies CF existence nor inspects `branch_local` SF. Confirmed: no validator resolves `branch_local`/mirrored `SF.derived_from` CF references against world canon.
2. **Doc reassessment.** `docs/FOUNDATIONS.md` §Story Bundles §6a (Belief vs. Fact) and `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.3 define `SF.derived_from` as `[CF-<integer> | <story-local record id>]`, non-empty for mirrored or derived facts, with the truth-relation-propagation rule binding mirrored SF to their parent CF. The contract assumes the cited CF parent is real; nothing currently enforces it.
3. **Shared boundary.** The boundary under audit is story-bundle `SF` records (producers: `branching-story-bootstrap`, `branching-story-turn-cycle`) vs. world-canon CF existence (consumer: the pre-apply referential-integrity validator). This is a cross-namespace resolution: a story-bundle validation run must resolve `SF.derived_from` CF ids against the world-canon index, not only against the story-bundle's own `existingIds`. `cross-file-reference.ts` already has cross-scope machinery (`indexedEdgeReferenceVerdicts`, `ctx.story_slug` handling at l.115–128) that the extension builds on.
4. **FOUNDATIONS principle.** Rule 1 (No Floating Facts) — a fact whose declared provenance cannot be resolved is a floating fact; Rule 4 (No Globalization by Accident) — a mirrored SF must trace to a real parent CF, since the whole point of `derived_from` is to anchor branch-local truth to existing world canon at the correct scope; Rule 6 (No Silent Retcons) — a dangling parent reference silently breaks the canon-to-story audit trail. The validator must reject `SF.derived_from` CF references that do not resolve to an existing world CF.
5. **Enforcement-surface confirmation.** The change lands in `tools/validators/src/structural/cross-file-reference.ts`, a pre-apply structural validator. It strengthens referential integrity and is orthogonal to the Mystery Reserve firewall (gate 3 / `rule7_mystery_reserve_preservation`) and to HARD-GATE / canon-write ordering — it adds an existence check on already-authored `derived_from` values and changes no write ordering, no gate sequencing, and does not touch any MR-bearing record. It cannot weaken the MR firewall because it neither reads nor resolves any `M-<integer>` reference.
6. **Adjacent contradictions surfaced during reassessment.** The cross-namespace resolution scope is a **required consequence** of this ticket, not a separate bug: a story-bundle validation `ctx` may not currently load world CF ids into the resolution set, so the implementation must ensure world CF existence is queryable from the story-bundle validation path (via `ctx`'s world-index access) before flagging a miss — otherwise every mirrored SF would false-positive. The asymmetry with the already-validated CF `source_basis.derived_from` path is the precedent shape, not a contradiction to resolve here. The parallel question of validating non-SF cross-namespace `derived_from` (e.g., other story-bundle classes that may cite CF ids) is logged as potential future scope, not folded in.

## Architecture Check

1. Extending the existing `cross-file-reference` validator — the repo's canonical referential-integrity surface, which already resolves CF `source_basis.derived_from` existence and already carries cross-scope (`story_slug`) edge-resolution machinery — is cleaner than a bespoke story-fact-provenance validator, because it keeps all "does this declared reference resolve?" logic in one place and reuses the established `existingIds` / `indexedEdgeReferenceVerdicts` pattern. (`story-fact-authority.ts` remains the home for the authority-enum rule; this ticket does not move that logic.)
2. No backwards-compatibility aliasing or shims: the change adds a reference-extraction branch plus a resolution path; it introduces no dual-validation mode and no opt-out flag.

## Verification Layers

1. A story `SF` whose `derived_from` cites a non-existent CF (e.g., `CF-1` when only `CF-0001` exists) produces a `fail` verdict → `cross-file-reference.test.ts` negative case.
2. A story `SF` whose `derived_from` cites an existing world CF passes → `cross-file-reference.test.ts` positive case.
3. The pre-existing `canon_linked` → CF-parent rule in `story-fact-authority.ts` is unchanged and still passes its suite → existing `story-fact-authority.test.ts` (regression).
4. Cross-namespace resolution: a story-bundle validation run resolves `SF.derived_from` against world canon (not only story-scope ids) → integration test exercising a story-bundle plan whose SF cites a real world CF.

## What to Change

### 1. Extract `story_fact_record.derived_from` CF references

In `tools/validators/src/structural/cross-file-reference.ts` `referencesFor()`, add a branch for `node_type === 'story_fact_record'` that pushes each `CF-<integer>`-patterned `derived_from` entry as a `{ kind: 'record', field: 'derived_from' }` reference. Non-CF `derived_from` entries (story-local record ids) continue to resolve against story-scope `existingIds` as today.

### 2. Resolve CF references cross-namespace

Ensure the resolution set used to check `SF.derived_from` CF references includes world-canon CF ids when validating a story bundle (via the validator `ctx`'s world-index access), so a real `CF-0001` resolves and a fabricated `CF-1` fails. Emit `cross_file_reference.unresolved_story_fact_parent` (or reuse the existing unresolved-reference verdict code) on a miss.

### 3. Test coverage

Add positive (existing CF) and negative (dangling CF) cases to `cross-file-reference.test.ts`, plus a cross-namespace fixture confirming world CF ids are in scope during story-bundle validation.

## Files to Touch

- `tools/validators/src/structural/cross-file-reference.ts` (modify)
- `tools/validators/tests/structural/cross-file-reference.test.ts` (modify)

## Out of Scope

- SF **scope-widening** detection (whether a mirrored SF widens the parent CF's geographic/temporal/social scope) — that Rule 4 check is owned by `branching-story-bootstrap` Phase 9 bootstrap-additional check 2 and is a separate concern from referential existence.
- `derived_from` validation for non-SF story-bundle classes that may cite CF ids — logged as potential future scope.
- Any change to `story-fact-authority.ts`'s `canon_linked` authority-enum rule.
- Changing the `SF` schema or the `derived_from` field shape.

## Acceptance Criteria

### Tests That Must Pass

1. `node --test dist/tests/structural/cross-file-reference.test.js` — new negative case (dangling CF) fails validation; new positive case (existing CF) passes.
2. `node --test dist/tests/structural/story-fact-authority.test.js` — unchanged `canon_linked` rule still passes (regression).
3. `cd tools/validators && npm test` — full compiled suite passes.

### Invariants

1. Every story `SF.derived_from` entry matching `^CF-[0-9]+$` resolves to an existing world Canon Fact record, or validation fails.
2. The check is orthogonal to the Mystery Reserve firewall and HARD-GATE ordering — no MR-bearing record is read and no gate sequencing changes.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/cross-file-reference.test.ts` — add a dangling-CF negative case and an existing-CF positive case for `story_fact_record.derived_from`, plus a cross-namespace world-CF-in-scope fixture.

### Commands

1. `cd tools/validators && npm test` (the validators `test` script chains `npm run build` then `node --test dist/tests/**/*.test.js`)
2. `cd tools/validators && npm run build && node --test dist/tests/structural/cross-file-reference.test.js` (targeted run of the modified validator's suite)
