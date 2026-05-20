# SPEC50STPSTECHC-005: World-index choice + storylet exploitation edges; remove dead obligation extraction

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/world-index` (parser + edge-type registry), `tools/world-index` integration test (SPEC-46 obligation-edge assertions removed).
**Deps**: None

## Problem

`tools/world-index/src/parse/atomic.ts` has strong STPLAN/STEMO edge extraction but no `edgesForChoice` or `edgesForStorylet` function — `CHC.grounded_in.records[]`, `CHC.associated_commitment_block`, `CHC.grounded_in.affordance_ordinals[]`, `SLT.preconditions.hard/soft` predicate refs, `SLT.effects.create/supersede/close`, and `SLT.exit_options[].likely_effects` are never indexed, so CHC/SLT exploitation cannot be queried without raw `_source/` sweeps. Separately, `atomic.ts:656-667` still extracts the legacy storylet obligation fields (`opens_obligations`/`pays_off_obligations`/`complicates_obligations`/`transfers_obligations`) which are not in the current SLT schema (it uses `effects`/`exit_options`) — dead extraction with no production consumer.

## Assumption Reassessment (2026-05-19)

1. Codebase: no `edgesForChoice`/`edgesForStorylet` function in `tools/world-index/src/parse/atomic.ts` (verified this session); legacy obligation extraction confirmed at `atomic.ts:656-667`. The edge-type registry is `tools/world-index/src/schema/types.ts`; `tools/world-index/src/index/edges.ts` persists free-text edge values and needed no edit. New edge types are TEXT values; no SQL migration is expected (confirmed by the existing free-text insert path).
2. Specs/contract: SPEC-50 §C.1/§C.2; the new edge names follow the existing "read the field, emit one edge per resolved record reference" pattern — no new edge taxonomy semantics.
3. Cross-artifact boundary: the parser (`atomic.ts`), the edge-type registry (`schema/types.ts`), the machine-facing edge docs (`docs/MACHINE-FACING-LAYER.md`), and the SPEC-46 integration test all reference the storylet/choice edge surface; removing legacy obligation extraction requires removing its assertions in the SPEC-46 test and truthing the public edge inventory.
4. FOUNDATIONS §Rule 6 (No Silent Retcons): removing the legacy obligation extraction changes behavior a SPEC-46 integration test asserts (`tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts:198-201,558-561`). The grep found **no production consumer** of `opens_obligation`/etc. edges — the SPEC-46 test exercises dead extraction (fields absent from the current SLT schema). The removal + test-assertion removal is the retcon, attributed here per Rule 6.
5. Rename/remove blast radius: `rg -n "opens_obligations|pays_off_obligations|complicates_obligations|transfers_obligations|opens_obligation|pays_off_obligation|complicates_obligation|transfers_obligation" tools/world-index/src tools/world-index/tests docs/MACHINE-FACING-LAYER.md` returns the parser extraction, registry entries, SPEC-46 integration test extraction/assertions, legacy fixture data, and the machine-facing edge inventory. No production consumer outside the parser/registry. The SPEC-46 test and docs inventory are added to Files to Touch.

## Architecture Check

1. New edge functions follow the existing mechanical extraction pattern (one edge per resolved reference); grouping choice + storylet exploitation edges (the CHC/SLT "exploitation core") in one ticket keeps the reviewable diff coherent. Removing dead obligation extraction in the same ticket is natural — both touch the storylet extraction region of `atomic.ts`.
2. No shim — the dead extraction is removed, not deprecated-in-place.

## Verification Layers

1. `choice_grounded_in` / `choice_associated_storylet` / `choice_affordance_ordinal` edges emit -> parser test on a CHC fixture.
2. `storylet_predicate_ref` / `storylet_effect_ref` / `storylet_exit_likely_effect_ref` edges emit -> parser test on an SLT fixture.
3. Legacy obligation edges no longer emit for current-schema SLT records -> parser test asserting absence.
4. SPEC-46 integration test passes after obligation-assertion removal -> regression run.

## What to Change

### 1. edgesForChoice (C.1)

`choice_grounded_in` (one per `CHC.grounded_in.records[]`), `choice_associated_storylet` (to `CHC.associated_commitment_block` when non-null), `choice_affordance_ordinal` (one per `CHC.grounded_in.affordance_ordinals[]`).

### 2. edgesForStorylet (C.2)

`storylet_predicate_ref` (resolvable record refs in `SLT.preconditions.hard[]`/`soft[]` predicate args), `storylet_effect_ref` (`SLT.effects.create/supersede/close` resolving to concrete record ids, not `bound:<alias>`), `storylet_exit_likely_effect_ref` (`SLT.exit_options[].likely_effects`).

### 3. Remove legacy obligation extraction + SPEC-46 assertions

Delete `atomic.ts:656-667` legacy obligation extraction; remove the obligation-edge extraction/assertions at `spec46-story-bundle-edges-integration.test.ts:198-201,558-561`; add a test asserting the four legacy edge types are no longer produced for current-schema SLT records.

### 4. Edge-type registry and docs

Register the new edge-type names in `tools/world-index/src/schema/types.ts`; `tools/world-index/src/index/edges.ts` persists free-text edge types and needs no registry edit. Update `docs/MACHINE-FACING-LAYER.md` so the count and edge inventory reflect the removal/addition.

## Files to Touch

- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/world-index/src/schema/types.ts` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)
- `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` (modify — remove obligation-edge assertions)
- `tools/world-index/tests/` choice + storylet edge fixtures (new or modify)

## Out of Scope

- `edgesForPage` + event-completion edges (SPEC50STPSTECHC-006).
- The edge-parity test (SPEC50STPSTECHC-007).
- Any change to the SLT schema's `effects`/`exit_options` shape.

## Acceptance Criteria

### Tests That Must Pass

1. CHC fixture produces `choice_grounded_in` / `choice_associated_storylet` / `choice_affordance_ordinal` edges.
2. SLT fixture produces `storylet_predicate_ref` / `storylet_effect_ref` / `storylet_exit_likely_effect_ref` edges; legacy obligation edges absent.
3. `npm test --prefix tools/world-index` green (incl. corrected SPEC-46 integration test).

### Invariants

1. No legacy obligation edge type is produced for any current-schema SLT record.
2. Every new edge is one-per-resolved-reference; `bound:<alias>` effect refs are not emitted as concrete record edges.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/` — choice + storylet edge extraction fixtures (positive edges + legacy-absence assertion).
2. `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` — obligation-edge assertions removed.

### Commands

1. `npm run build --prefix tools/world-index`
2. `npm test --prefix tools/world-index`

## Outcome

Completed: 2026-05-20

- Added `edgesForChoice` and `edgesForStorylet` extraction in `tools/world-index/src/parse/atomic.ts`.
- Registered `choice_grounded_in`, `choice_associated_storylet`, `choice_affordance_ordinal`, `storylet_predicate_ref`, `storylet_effect_ref`, and `storylet_exit_likely_effect_ref` in `tools/world-index/src/schema/types.ts`.
- Removed legacy `SLT` obligation-edge extraction from the parser and from the SPEC-46 capstone's expected edge surface.
- Added focused parser coverage for CHC/SLT exploitation edges, `bound:<alias>` skipping, and absence of the retired obligation edge types.
- Updated registry-count tests and `docs/MACHINE-FACING-LAYER.md` to the new 58 story-edge contract.

Verification:

- `npm run build` in `tools/world-index` — PASS.
- `node --test dist/tests/parse/atomic-edges-for-choice-and-storylet.test.js` in `tools/world-index` — PASS.
- `npm test` in `tools/world-index` — PASS, 121 tests.

Deviations:

- `tools/world-index/src/index/edges.ts` was not edited because live reassessment confirmed it stores `edge_type` as free text and has no registry list to update.
- The broad package suite initially failed on stale expected edge-count assertions in `spec47-stplan-stemo-edges-integration.test.ts` and `types.test.ts`; those were corrected as same-seam proof fallout and the suite then passed.
