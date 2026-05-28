# SPEC92SCERANPRO-007: scene-prose-receipt content validators

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/validators` (scene-prose-receipt content validators; registry).
**Deps**: archive/tickets/SPEC92SCERANPRO-002.md

## Problem

Scene prose attached over a PG range must be validated against every included PG: required events rendered, the final choice surface, entity-status / invented-fact / forbidden-mystery consistency across the range, STCHAR fidelity, engine-jargon leak, and canon-claim-without-authority. These are the scene-level analogues of the page prose-receipt checks, written against `scene-prose-receipt.schema.json` (-002).

## Assumption Reassessment (2026-05-28)

1. The page prose-receipt validators (`prose-receipt-*` under `tools/validators/src/structural/`) exist at HEAD as the structural sibling; `scene-prose-receipt.schema.json` lands in -002 (the Dep); `tools/validators/src/public/registry.ts` is the registration site (verified).
2. SPEC-92 §6 (scene-prose-attach checks) defines the validators: included_pg_events_rendered, final_scene_choice_surface_visibility, scene_range_entity_status_consistency, scene_range_invented_structural_fact, scene_range_forbidden_mystery_resolution, scene_prose_stchar_fidelity, engine_jargon_leak, canon_claim_without_authority. The receipt shape comes from -002.
3. Cross-artifact boundary under audit: `registry.ts` is shared with -002 and -006 (three appenders; coordinate slot ordering — mechanical). The validators are consumed by the validator-framework run-loop + `branching-story-scene-prose-attach` (-009).
4. FOUNDATIONS §Rule 7 (Preserve Mystery Deliberately) motivates `scene_range_forbidden_mystery_resolution`: scene prose must not resolve a forbidden-status Mystery Reserve entry across the range. This validator is the scene-level mystery firewall on rendered prose.
5. Canon Safety / enforcement surface: these validators live under `tools/validators/src/structural/` and gate scene prose at validation time. `scene_range_forbidden_mystery_resolution` PRESERVES (does not weaken) the MR firewall — it extends the page-level firewall to scene ranges. Confirm the range-walk checks every included PG's forbidden-mystery state, not just the end PG.

## Architecture Check

1. Modeling the scene validators on the page prose-receipt validators (range-walk over included PGs instead of single-page) keeps the checks consistent and reuses the firewall logic. The range-walk is the one new structural concern.
2. No shims: new validators register in the existing framework array.

## Verification Layers

1. Scene prose skipping a required PG event FAILS included_pg_events_rendered -> fixture.
2. Scene prose resolving a forbidden M across the range FAILS scene_range_forbidden_mystery_resolution -> fixture (firewall preserved).
3. STCHAR voice drift / engine jargon / unauthorized canon claim each FAIL their check -> fixtures.
4. The playable choice surface mismatching the end PG FAILS final_scene_choice_surface_visibility -> fixture.

## What to Change

### 1. Scene-prose-receipt content validators (new)

Implement the eight checks per SPEC-92 §6, each walking every included PG in the range (not just the end PG). Model on the `prose-receipt-*` validators. File granularity follows the page-plan validator convention (one file per check, or a grouped content file with per-check functions).

### 2. registry.ts (modify)

Register the receipt content validators.

## Files to Touch

- `tools/validators/src/structural/scene-prose-receipt-content.ts` (new) — or one file per check per the page-plan validator granularity
- `tools/validators/src/public/registry.ts` (modify)

## Out of Scope

- The scene-plan structural validators (-006).
- The `scene-prose-receipt.schema.json` shape itself (-002).
- The scene-prose-attach skill that emits the receipt (-009).

## Acceptance Criteria

### Tests That Must Pass

1. Each check fires on its violation fixture and passes its clean fixture.
2. `scene_range_forbidden_mystery_resolution` fails when any included PG's forbidden M would be resolved by the prose (range-walk).
3. `cd tools/validators && npm run build && npm test` green.

### Invariants

1. The range-walk checks every included PG, not only the end PG.
2. `scene_range_forbidden_mystery_resolution` preserves the MR firewall (Rule 7) at scene scope.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/scene-prose-receipt-content.test.ts` — new; one violation + clean fixture per check.

### Commands

1. `cd tools/validators && npm run build && npm test`
