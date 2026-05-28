# SPEC93DECSTATUR-003: Retire page-plan & prose-receipt validators, support modules, schema, registry cleanup

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/validators` (retire 6 validators + 3 support modules + `prose-receipt.schema.json`; `registry.ts` + `_engine-vocabulary-tokens.ts` cleanup; sibling integration-test cleanup)
**Deps**: archive/tickets/SPEC93DECSTATUR-002.md

## Problem

With page plans and the page prose-receipt path removed (SPEC-93 §2.5), the validators whose input is the page-plan markdown or the page prose-receipt are dead. This ticket retires them with no zombie gates: the page-plan structural validators, the prose-receipt validators, their support modules, and `prose-receipt.schema.json`, plus the registry and engine-vocabulary-token references. The rendered-prose mystery firewall reroutes to SPEC-92's already-landed `scene_range_forbidden_mystery_resolution` (confirmed present at `tools/validators/src/structural/scene-prose-receipt-content.ts`), so Rule 7 is preserved, not weakened.

## Assumption Reassessment (2026-05-28)

1. Retirement targets confirmed present (this session): `page-plan-verbatim-section-integrity.ts`, `page-plan-stchar-packet-integrity.ts`, `page-plan-body-engine-vocabulary-cleanliness.ts`, `prose-receipt-hash-integrity.ts`, `prose-receipt-stchar-integrity.ts` (the six retired validators) + support modules `page-plan-section-parser.ts`, `page-plan-verbatim-canonical-sources.ts`, `prose-receipt-schema-compliance.ts` + `schemas/prose-receipt.schema.json`; registered in `public/registry.ts`; `_engine-vocabulary-tokens.ts` references `plan_hash` field-name literals.
2. SPEC-93 §2.5 + §6 validators bullet enumerate these retirements; §5 Rule 7 amendment reroutes the rendered-prose firewall to scene attach.
3. Cross-artifact boundary: `registry.ts` is shared with archive/tickets/SPEC93DECSTATUR-002.md (sequenced by Deps); SPEC-92's scene validators (`scene-prose-receipt-content.ts` carrying `scene_range_forbidden_mystery_resolution`, `scene-prose-receipt-schema-compliance.ts`) are the surviving replacements — verified present.
4. FOUNDATIONS Rule 7 (Preserve Mystery Deliberately): retiring `prose_receipt`/page-plan validators does NOT weaken the firewall — the authoritative plan-time firewall is gate 3 on the `PG` record (untouched) and the rendered-prose firewall is `scene_range_forbidden_mystery_resolution` (SPEC-92, present).
5. (HARD-GATE / Canon Safety) The retired files are structural validators under `tools/validators/src/structural/` that gated story-bundle record/receipt writes; their retirement removes dead gates whose surface SPEC-92 already re-provides at scene scope. The MR firewall (gate 3 + scene `scene_range_forbidden_mystery_resolution`) remains intact.
6. (was template item 7 — removal blast radius) Grep pipeline-wide for each retired validator code + `prose-receipt.schema.json`: `public/registry.ts` (de-register), `_engine-vocabulary-tokens.ts` (token cleanup), `tests/structural/*` (delete retired suites), and sibling integration tests `tests/integration/{spec57-stchar-pipeline-integration,spec76-red-kiln-ambush,spec92-scene-layer-capstone}.test.ts` that assert the retired validators (Rule 6 retcon attribution: these tests assert behavior SPEC-93 deliberately removes; no production consumer survives the teardown).

## Architecture Check

1. Wholesale retirement (vs. flag-guarding) is correct because SPEC-92 already provides the scene-scope replacements; keeping the page-plan validators would be a zombie gate set the §8 sweep forbids.
2. No backwards-compatibility shim: validator files, support modules, and `prose-receipt.schema.json` are deleted; registry + token references removed.

## Verification Layers

1. No zombie gates -> codebase grep-proof (the §8 removal sweep shows no live `page_plan_`/`prose_receipt_` validator references outside annotated legacy-read sites).
2. Registry integrity -> schema/registry test (`registry.test.ts` name-list no longer asserts retired validators; build green).
3. Rule 7 firewall preserved -> FOUNDATIONS alignment check + grep-proof (`scene_range_forbidden_mystery_resolution` present; gate 3 untouched).
4. Sibling integration tests no longer assert retired behavior -> test green (spec57/76/92 updated).

## What to Change

### 1. Delete retired validators + support modules + schema

Remove `page-plan-verbatim-section-integrity.ts`, `page-plan-stchar-packet-integrity.ts`, `page-plan-body-engine-vocabulary-cleanliness.ts`, `prose-receipt-hash-integrity.ts`, `prose-receipt-stchar-integrity.ts`, `page-plan-section-parser.ts`, `prose-receipt-schema-compliance.ts`, `schemas/prose-receipt.schema.json`, and (once SPEC-92 has retargeted its own copy) `page-plan-verbatim-canonical-sources.ts`. Delete their colocated `tests/structural/*` suites.

### 2. Registry + vocabulary cleanup

De-register the retired validators in `public/registry.ts`; remove dead page-plan/prose-receipt token references in `_engine-vocabulary-tokens.ts`. Update `tests/structural/registry.test.ts` name-list assertions.

### 3. Sibling integration-test cleanup (route iii)

Update `tests/integration/spec57-stchar-pipeline-integration.test.ts`, `spec76-red-kiln-ambush.test.ts`, and `spec92-scene-layer-capstone.test.ts` to drop assertions on the retired validators, with a Rule 6 attribution comment naming SPEC-93 as the retconning spec.

## Files to Touch

- `tools/validators/src/structural/page-plan-verbatim-section-integrity.ts` (delete)
- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (delete)
- `tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts` (delete)
- `tools/validators/src/structural/prose-receipt-hash-integrity.ts` (delete)
- `tools/validators/src/structural/prose-receipt-stchar-integrity.ts` (delete)
- `tools/validators/src/structural/page-plan-section-parser.ts` (delete)
- `tools/validators/src/structural/prose-receipt-schema-compliance.ts` (delete)
- `tools/validators/src/structural/page-plan-verbatim-canonical-sources.ts` (delete — after SPEC-92 retarget)
- `tools/validators/src/schemas/prose-receipt.schema.json` (delete)
- `tools/validators/src/public/registry.ts` (modify — shared with archive/tickets/SPEC93DECSTATUR-002.md)
- `tools/validators/src/structural/_engine-vocabulary-tokens.ts` (modify)
- `tools/validators/tests/structural/{page-plan-verbatim-section-integrity,page-plan-stchar-packet-integrity,page-plan-body-engine-vocabulary-cleanliness,prose-receipt-hash-integrity,prose-receipt-stchar-integrity,prose-receipt-schema-compliance}.test.ts` (delete)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/spec57-stchar-pipeline-integration.test.ts` (modify)
- `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts` (modify)
- `tools/validators/tests/integration/spec92-scene-layer-capstone.test.ts` (modify)

## Out of Scope

- The gate-9 split (archive/tickets/SPEC93DECSTATUR-002.md — its `page-plan-turn-driver-consistency.ts` / `page-plan-active-pressure.ts` survive in modified record-only form).
- `prose-receipt.schema.json`'s scene replacement (`scene-prose-receipt.schema.json`, already landed by SPEC-92).
- Hook 6/7 retirement (SPEC93DECSTATUR-006).
- The `page_plan_drafts` argument plumbing (SPEC93DECSTATUR-004).

## Acceptance Criteria

### Tests That Must Pass

1. `registry.test.ts` passes with the retired validators absent from the name-list.
2. The §8 removal-completeness sweep returns no live `page_plan_`/`prose_receipt_` validator references (only annotated legacy-read sites).
3. `(cd tools/validators && npm run build && npm test)` green.

### Invariants

1. No zombie gates: every retired validator is removed from the registry and its suite deleted.
2. Rule 7 firewall is preserved: gate 3 (PG record) + `scene_range_forbidden_mystery_resolution` (SPEC-92) remain the authoritative + rendered-prose firewalls; no retirement here resolves a forbidden-status `M`.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/registry.test.ts` — drop retired-validator name-list entries.
2. `tools/validators/tests/integration/{spec57-stchar-pipeline-integration,spec76-red-kiln-ambush,spec92-scene-layer-capstone}.test.ts` — drop retired-validator assertions (Rule 6 attribution).
3. Deleted: the six retired validators' colocated suites.

### Commands

1. `(cd tools/validators && npm run build && npm test)`
2. `grep -rn "page-plan-verbatim-section-integrity\|prose-receipt-hash-integrity\|prose-receipt-schema-compliance" tools/validators/src` — expect zero matches.
