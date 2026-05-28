# PPLAN-010: Repair red-bunny page-plan engine-vocabulary failures

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — direct story page-plan prose cleanup for `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md` through `PG-6.md`, plus patch-engine-routed PG plan-hash/state-hash restamp for the six changed pages.
**Deps**: `archive/tickets/PPENGVOC-001-per-section-policy-engine-vocabulary-cleanliness.md`, `archive/tickets/EROTICA-003-repair-red-bunny-soft-alias-workaround.md`

## Problem

Post-review of `archive/tickets/EROTICA-003-repair-red-bunny-soft-alias-workaround.md` reran:

```bash
node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json
```

The EROTICA-003 owned invariant passed (`chc_slt_selected_commitment_trace` status `pass`; zero `alias_binding_missing` verdicts), but the broad structural lane still exits nonzero because older `red-bunny` page-plan bodies fail `page_plan_body_engine_vocabulary_cleanliness`.

Current failure summary from the JSON output:

- total validator summary: `fail_count: 27`, `warn_count: 5`, `info_count: 3`
- `page_plan_body_engine_vocabulary_cleanliness` fail verdicts by page: `PG-1: 4`, `PG-2: 6`, `PG-3: 6`, `PG-4: 6`, `PG-5: 5`
- `PG-6` currently contributes a warning, not a failure, on the same validator surface

This ticket owns repairing the red-bunny page-plan body surfaces that now make the broad structural lane red. It does not reopen EROTICA-003's story-record alias-binding repair.

## Assumption Reassessment (2026-05-27)

1. Codebase: `page_plan_body_engine_vocabulary_cleanliness` is a live structural validator registered by the PPENGVOC/SPEC-91 workstream; the current broad command runs it and reports fail verdicts against `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md` through `PG-5.md`.
2. Docs/contract: `docs/HARD-GATE-DISCIPLINE.md` classifies `pages-prose-plans/` as a direct-write story artifact surface, while direct writes must preserve the stamped `PG.plan.plan_hash` bridge. If cleanup changes plan bytes, the corresponding PG hash state must be verified and repaired through the live approved route rather than left drifted.
3. Shared boundary under audit: this is live-corpus page-plan cleanup exposed by a validator package contract. The validator policy is already owned by PPENGVOC/SPEC-91; this ticket owns only normalizing the existing `red-bunny` page-plan artifacts and related hash/index state.
4. FOUNDATIONS / workflow principle: story-bundle execution state remains downstream story-bundle state, not world canon. This ticket must not alter world-canon `_source/` records or rewrite story facts to make a prose-facing validator pass.
5. Adjacent contradiction: EROTICA-003 is complete and archived. Its broad validation deviation is not unfinished SE-7/PG-7 alias-binding work; the residual red lane belongs to the page-plan body cleanliness surface.

## Architecture Check

1. Cleaner than alternatives: repair the historical page-plan artifacts that violate the now-live renderer-facing body rule, rather than weakening `page_plan_body_engine_vocabulary_cleanliness` or leaving the broad red-bunny structural lane permanently red.
2. No backwards-compatibility aliasing/shims introduced. This is content cleanup plus hash-bridge preservation, not a validator compatibility path.

## Verification Layers

1. Current fail verdicts for PG-1 through PG-5 are removed -> `world-validate` JSON review for `page_plan_body_engine_vocabulary_cleanliness`.
2. PG-6 warning is classified or repaired -> direct JSON verdict review.
3. Page-plan hash bridge remains coherent after edits -> `compute-pg-hashes.js` or the current plan-hash verification route for every changed PG plan/record pair.
4. Story-bundle write discipline is preserved -> direct page-plan edits only where allowed, with engine-routed PG record updates if stamped hashes must change.

## What to Change

### 1. Clean failing page-plan body sections

Edit the renderer-facing sections in `PG-1.md` through `PG-5.md` so they no longer expose record-id-shaped tokens, schema-field literals, predicate DSL, or other engine vocabulary outside validator-allowed sections.

### 2. Classify PG-6 warning

Review the PG-6 warning from `page_plan_body_engine_vocabulary_cleanliness`. Repair it if the same cleanup pass can do so safely; otherwise record why warning-level residue is intentionally left.

### 3. Preserve the plan-hash bridge

After every page-plan edit, recompute the affected plan hash and use the live approved route to keep each corresponding PG record's stamped hash fields coherent. Do not leave a drifted page-plan / PG record pair.

## Files to Touch

- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md` (modify)
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md` (modify)
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-3.md` (modify)
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-4.md` (modify)
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-5.md` (modify)
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-6.md` (modify if the warning is repaired rather than classified)
- `worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` through `PG-6.yaml` (engine-routed modify if plan-hash restamp is required)
- `worlds/erotica-world/_index/` (refresh derived ignored artifact if PG records are restamped)

## Out of Scope

- Changing `page_plan_body_engine_vocabulary_cleanliness` policy, token vocabulary, severity thresholds, or validator registration.
- Rewriting story fiction, choices, story events, or state deltas.
- Reopening EROTICA-003's SE-7/PG-7 alias-binding repair.
- Direct edits to story-bundle `_source/pages/*.yaml`; use the approved route if PG record hash fields must change.

## Acceptance Criteria

### Tests That Must Pass

1. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json` emits no `page_plan_body_engine_vocabulary_cleanliness` fail verdicts for PG-1 through PG-5.
2. PG-6's `page_plan_body_engine_vocabulary_cleanliness` warning is either repaired or explicitly classified in closeout as warning-level residue outside the accepted failure cleanup.
3. Hash verification for every changed page-plan / PG record pair reports matching committed hash state.

### Invariants

1. Page-plan cleanup does not change story facts, state deltas, choices, or canon.
2. No page-plan edit leaves `PG.plan.plan_hash` drift.

## Test Plan

### New/Modified Tests

1. `None — live story-bundle artifact cleanup; verification is command/manual-review based and validator behavior is already covered by PPENGVOC/SPEC-91.`

### Commands

1. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json`
2. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-<N>.md --pg worlds/erotica-world/stories/red-bunny/_source/pages/PG-<N>.yaml` for each changed page.

## Outcome

Completed: 2026-05-27

Implemented. Cleaned the renderer-facing page-plan prose in `PG-1.md` through `PG-6.md` so the live `page_plan_body_engine_vocabulary_cleanliness` structural validator no longer reports failures or warnings for the red-bunny bundle. The PG-6 warning was repaired rather than classified as accepted residue.

The page-plan edits changed plan bytes, so `PG-1.yaml` through `PG-6.yaml` were restamped through the patch-engine route with plan `PPLAN-010-red-bunny-page-plan-hash-restamp`; no direct `_source/pages/*.yaml` edits were made. Post-restamp verification reports `plan_hash_match: true` and `state_hash_match: true` for all six changed pages.

Verification:

1. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json` -> `fail_count: 0`, `warn_count: 0`, `info_count: 3`; `page_plan_body_engine_vocabulary_cleanliness: 0`.
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --world-root /home/joeloverbeck/projects/worldloom /tmp/pplan-010-restamp-plan.json` -> `status: pass`, `116` validators run.
3. `node tools/world-mcp/dist/src/cli/submit-patch-plan.js --world-root /home/joeloverbeck/projects/worldloom /tmp/pplan-010-restamp-plan.json /tmp/pplan-010-restamp-token.txt` -> wrote 6 files, pre-apply validators passed.
4. `verifyPgStateHash` for `PG-1` through `PG-6` -> all `plan_hash_match: true` and `state_hash_match: true`.
