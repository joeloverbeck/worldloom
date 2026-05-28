# SPEC92SCERANPRO-007: scene-prose-receipt content validators

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/validators` (scene-prose-receipt content validators; registry).
**Deps**: archive/tickets/SPEC92SCERANPRO-002.md

## Problem

Before this ticket, scene prose attached over a PG range had a schema validator but no content validator for the receipt's eight SPEC-92 checks. Scene attach now has a registered structural validator that verifies SCN/page/choice/range consistency, propagates receipt-recorded PASS/WARN/FAIL check outcomes, and scans scene prose for deterministic engine-jargon, forbidden-mystery-id, and canon-authority leaks.

## Assumption Reassessment (2026-05-28)

1. The page prose-receipt validators (`prose-receipt-*` under `tools/validators/src/structural/`) exist at HEAD as the structural sibling; `scene-prose-receipt.schema.json` lands in -002 (the Dep); `tools/validators/src/public/registry.ts` is the registration site (verified).
2. SPEC-92 §6 (scene-prose-attach checks) defines the validators: included_pg_events_rendered, final_scene_choice_surface_visibility, scene_range_entity_status_consistency, scene_range_invented_structural_fact, scene_range_forbidden_mystery_resolution, scene_prose_stchar_fidelity, engine_jargon_leak, canon_claim_without_authority. The receipt shape comes from -002.
3. Cross-artifact boundary under audit: `registry.ts` is shared with -002 and -006 (three appenders; coordinate slot ordering — mechanical). The landed validator is consumed by the validator-framework run-loop + `branching-story-scene-prose-attach` (-009).
4. FOUNDATIONS §Rule 7 (Preserve Mystery Deliberately) motivates `scene_range_forbidden_mystery_resolution`: scene prose must not resolve a forbidden-status Mystery Reserve entry across the range. This validator is the scene-level mystery firewall on rendered prose.
5. Canon Safety / enforcement surface: these validators live under `tools/validators/src/structural/` and gate scene prose at validation time. `scene_range_forbidden_mystery_resolution` PRESERVES (does not weaken) the MR firewall — it extends the page-level firewall to scene ranges. The implementation skips pre-apply because scene receipts/prose are direct-write publication artifacts, while full-world/incremental runs fail closed on receipt/prose content failures.
6. The judgment-heavy checks (`scene_range_entity_status_consistency`, `scene_range_invented_structural_fact`, `scene_prose_stchar_fidelity`, and parts of `included_pg_events_rendered`) are not fully derivable from existing schema fields without the future -009 skill's receipt authoring discipline. The validator therefore treats receipt-recorded FAIL/WARN as authoritative machine verdicts and adds deterministic cross-checks where the repo has structured carriers: SCN `pg_ids`, included-page hashes, end-PG emitted choices, choice labels/intents, engine vocabulary tokens, forbidden Mystery Reserve ids, and canon-authority phrasing.

## Architecture Check

1. Modeling the scene validators on the page prose-receipt validators (range-walk over included PGs instead of single-page) keeps the checks consistent and reuses the firewall logic. The range-walk is the one new structural concern.
2. No shims: new validators register in the existing framework array.

## Verification Layers

1. Scene prose skipping a required PG event FAILS included_pg_events_rendered -> fixture.
2. Scene prose resolving a forbidden M across the range FAILS scene_range_forbidden_mystery_resolution -> fixture (firewall preserved).
3. STCHAR voice drift / engine jargon / unauthorized canon claim each FAIL their check -> fixtures.
4. The playable choice surface mismatching the end PG FAILS final_scene_choice_surface_visibility -> fixture.

## Landed Changes

### 1. Scene-prose-receipt content validator

Added grouped validator `scene_prose_receipt_content`. It runs in full-world and incremental receipt/prose scopes, skips pre-apply, verifies receipt `included_pages` against the SCN range and current PG hashes, checks the final scene choice surface against the end PG and available choice prose, propagates receipt-recorded check failures/warnings, and scans rendered scene prose for engine record IDs/schema terms, forbidden Mystery Reserve ids, and world-canon authority claims.

### 2. Registry, inventory, and tests

Registered the validator, updated the validator README inventory and registry assertions, extended validate-patch-plan skip expectations, and added focused structural coverage for the clean case and every content-check failure surface.

## Files to Touch

- `tools/validators/src/structural/scene-prose-receipt-content.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/scene-prose-receipt-content.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `tools/validators/README.md` (modify)

## Out of Scope

- The scene-plan structural validators (-006).
- The `scene-prose-receipt.schema.json` shape itself (-002).
- The scene-prose-attach skill that emits the receipt (-009).

## Acceptance Criteria

### Tests That Must Pass

1. Each check fires on its violation fixture and passes its clean fixture.
2. `scene_range_forbidden_mystery_resolution` fails when any included PG's forbidden M would be resolved by the prose (range-walk).
3. `cd tools/validators && npm run build && npm test` green.
4. `cd tools/world-mcp && npm run build && node --test dist/tests/server/capability-parity.test.js` green after the registry addition.

### Invariants

1. The range-walk checks every included PG, not only the end PG.
2. `scene_range_forbidden_mystery_resolution` preserves the MR firewall (Rule 7) at scene scope.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/scene-prose-receipt-content.test.ts` — new; clean fixture plus violation fixtures for receipt status propagation, included-page range/hash drift, end-choice visibility, engine-jargon leak, forbidden-mystery-id leak, and canon-authority claim.
2. `tools/validators/tests/structural/registry.test.ts` — updated validator-name inventory.
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` — updated pre-apply skip expectations for direct-write scene receipt/prose validation.

### Commands

1. `cd tools/validators && npm run build && npm test`
2. `cd tools/world-mcp && npm run build && node --test dist/tests/server/capability-parity.test.js`

## Outcome

Completed 2026-05-28.

Implemented `scene_prose_receipt_content` as the SPEC-92 scene receipt content gate. The validator covers the structured range/choice/hash/prose-scan checks directly, uses receipt-recorded PASS/WARN/FAIL statuses for judgment-assisted scene content checks, and keeps scene receipt/prose validation out of pre-apply so patch-plan HARD-GATE validation remains scoped to engine-routed source records.

## Verification Result

1. `cd tools/validators && npm run build` — PASS.
2. `cd tools/validators && node --test dist/tests/structural/scene-prose-receipt-content.test.js dist/tests/structural/registry.test.js dist/tests/integration/validate-patch-plan.test.js` — PASS (29 tests).
3. `cd tools/validators && npm test` — PASS (1131 tests).
4. `cd tools/world-mcp && npm run build` — PASS.
5. `cd tools/world-mcp && node --test dist/tests/server/capability-parity.test.js` — PASS (5 tests).

## Deviations

- The validator is grouped in one file rather than one file per check; this matches the ticket's allowed granularity option.
- Fully semantic judgments such as prose faithfully dramatizing every beat or preserving STCHAR voice remain receipt-authoring responsibilities for -009. This ticket adds deterministic validation around the structured carriers and fails/warns when the receipt records those checks as non-PASS.
