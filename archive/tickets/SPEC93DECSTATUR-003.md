# SPEC93DECSTATUR-003: Retire page-plan & prose-receipt validators, support modules, schema, registry cleanup

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/validators` (retire 5 remaining page-plan/prose-receipt validators + support modules + `prose-receipt.schema.json`; `registry.ts` + `_engine-vocabulary-tokens.ts` cleanup; sibling integration-test cleanup) and focused `tools/world-mcp` consumer proof-surface updates
**Deps**: archive/tickets/SPEC93DECSTATUR-002.md

## Problem

With page plans and the page prose-receipt path removed (SPEC-93 §2.5), the validators whose input is the page-plan markdown or the page prose-receipt are dead. This ticket retires them with no zombie gates: the page-plan structural validators, the prose-receipt validators, their support modules, and `prose-receipt.schema.json`, plus the registry and engine-vocabulary-token references. The rendered-prose mystery firewall reroutes to SPEC-92's already-landed `scene_range_forbidden_mystery_resolution` (confirmed present at `tools/validators/src/structural/scene-prose-receipt-content.ts`), so Rule 7 is preserved, not weakened.

## Assumption Reassessment (2026-05-28)

1. Retirement targets confirmed present (this session): `page-plan-verbatim-section-integrity.ts`, `page-plan-stchar-packet-integrity.ts`, `page-plan-body-engine-vocabulary-cleanliness.ts`, `prose-receipt-hash-integrity.ts`, `prose-receipt-stchar-integrity.ts` (the five live validator modules named by this ticket after SPEC93DECSTATUR-002 already absorbed `active_pressure_handling_discipline`) + support modules `page-plan-section-parser.ts`, `prose-receipt-schema-compliance.ts` + `schemas/prose-receipt.schema.json`; registered in `public/registry.ts`; package inventory docs list the retired validators in `tools/validators/README.md`; `validate-patch-plan.test.ts` still asserts skipped execution rows for the retiring validators; `_engine-vocabulary-tokens.ts` references page/prose hash field-name literals.
2. SPEC-93 §2.5 + §6 validators bullet enumerate these retirements; §5 Rule 7 amendment reroutes the rendered-prose firewall to scene attach.
3. Cross-artifact boundary: `registry.ts` is shared with archive/tickets/SPEC93DECSTATUR-002.md (sequenced by Deps); SPEC-92's scene validators (`scene-prose-receipt-content.ts` carrying `scene_range_forbidden_mystery_resolution`, `scene-prose-receipt-schema-compliance.ts`) are the surviving replacements — verified present.
4. FOUNDATIONS Rule 7 (Preserve Mystery Deliberately): retiring `prose_receipt`/page-plan validators does NOT weaken the firewall — the authoritative plan-time firewall is gate 3 on the `PG` record (untouched) and the rendered-prose firewall is `scene_range_forbidden_mystery_resolution` (SPEC-92, present).
5. (HARD-GATE / Canon Safety) The retired files are structural validators under `tools/validators/src/structural/` that gated story-bundle record/receipt writes; their retirement removes dead gates whose surface SPEC-92 already re-provides at scene scope. The MR firewall (gate 3 + scene `scene_range_forbidden_mystery_resolution`) remains intact.
6. (was template item 7 — removal blast radius) Grep pipeline-wide for each retired validator code + `prose-receipt.schema.json`: `public/registry.ts` (de-register), `_engine-vocabulary-tokens.ts` (token cleanup), package inventory docs (`tools/validators/README.md`), `tests/structural/*` (delete retired suites), and integration tests `tests/integration/{spec57-stchar-pipeline-integration,spec76-red-kiln-ambush,spec92-scene-layer-capstone,validate-patch-plan}.test.ts` that assert the retired validators (Rule 6 retcon attribution: these tests assert behavior SPEC-93 deliberately removes; no production consumer survives the teardown).
7. Live reassessment correction: `page-plan-verbatim-canonical-sources.ts` is still imported by SPEC-92's `scene-plan-verbatim-section-integrity.ts` and re-exported from `src/public/index.ts` under page-plan names. The truthful same-seam action is to move this helper to a scene-neutral/scene-plan name, retarget the scene validator and public export, then delete the old page-plan-named helper with the retired page-plan validator.
8. Same-seam consumer fallout found during proof: `tools/world-mcp` imports the validators package's old page-plan canonical-source helper names and has submit-path tests asserting `page_plan_body_engine_vocabulary_cleanliness`. Those are direct consumers of the retired validator/export surface, so this ticket updates them while leaving `page_plan_drafts` argument removal to SPEC93DECSTATUR-004.

## Architecture Check

1. Wholesale retirement (vs. flag-guarding) is correct because SPEC-92 already provides the scene-scope replacements; keeping the page-plan validators would be a zombie gate set the §8 sweep forbids.
2. No backwards-compatibility shim: validator files, support modules, and `prose-receipt.schema.json` are deleted; registry + token references removed.

## Verification Layers

1. No zombie gates -> codebase grep-proof (the §8 removal sweep shows no live `page_plan_`/`prose_receipt_` validator references outside annotated legacy-read sites).
2. Registry integrity -> schema/registry test (`registry.test.ts` name-list no longer asserts retired validators; build green).
3. Rule 7 firewall preserved -> FOUNDATIONS alignment check + grep-proof (`scene_range_forbidden_mystery_resolution` present; gate 3 untouched).
4. Sibling integration tests no longer assert retired behavior -> test green (spec57/76/92 updated).

## Landed Changes

### 1. Delete retired validators + support modules + schema

Remove `page-plan-verbatim-section-integrity.ts`, `page-plan-stchar-packet-integrity.ts`, `page-plan-body-engine-vocabulary-cleanliness.ts`, `prose-receipt-hash-integrity.ts`, `prose-receipt-stchar-integrity.ts`, `page-plan-section-parser.ts`, `prose-receipt-schema-compliance.ts`, `schemas/prose-receipt.schema.json`, and their colocated `tests/structural/*` suites. Retarget SPEC-92's scene-plan verbatim validator to a scene-named canonical-source helper before deleting the old page-plan-named helper.

### 2. Registry + vocabulary cleanup

De-register the retired validators in `public/registry.ts`; remove dead page-plan/prose-receipt token references in `_engine-vocabulary-tokens.ts`; update package inventory docs. Update `tests/structural/registry.test.ts` name-list assertions and `validate-patch-plan.test.ts` execution-row expectations.

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
- `tools/validators/src/structural/scene-plan-verbatim-canonical-sources.ts` (new/rename — SPEC-92 scene-plan helper replacement)
- `tools/validators/src/structural/scene-plan-verbatim-section-integrity.ts` (modify — retarget helper import)
- `tools/validators/src/schemas/prose-receipt.schema.json` (delete)
- `tools/validators/src/public/registry.ts` (modify — shared with archive/tickets/SPEC93DECSTATUR-002.md)
- `tools/validators/src/public/index.ts` (modify — retarget verbatim helper export)
- `tools/validators/src/structural/_engine-vocabulary-tokens.ts` (modify)
- `tools/validators/README.md` (modify — remove retired validator inventory rows)
- `tools/validators/tests/structural/{page-plan-verbatim-section-integrity,page-plan-stchar-packet-integrity,page-plan-body-engine-vocabulary-cleanliness,prose-receipt-hash-integrity,prose-receipt-stchar-integrity,prose-receipt-schema-compliance}.test.ts` (delete)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/spec57-stchar-pipeline-integration.test.ts` (modify)
- `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts` (modify)
- `tools/validators/tests/integration/spec92-scene-layer-capstone.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `tools/world-mcp/src/package-interop.ts` (modify — retarget validators canonical-source export)
- `tools/world-mcp/src/cli/inline-canonical-prose-sections.ts` (modify — scene-plan naming over the surviving helper)
- `tools/world-mcp/tests/cli/inline-canonical-prose-sections.test.ts` (modify)
- `tools/world-mcp/tests/tools/submit-patch-plan.test.ts` (modify — drop retired validator assertions)

## Out of Scope

- The gate-9 split (archive/tickets/SPEC93DECSTATUR-002.md — its `page-plan-turn-driver-consistency.ts` / `page-plan-active-pressure.ts` survive in modified record-only form).
- `prose-receipt.schema.json`'s scene replacement (`scene-prose-receipt.schema.json`, already landed by SPEC-92).
- Hook 6/7 retirement (SPEC93DECSTATUR-006).
- The `page_plan_drafts` argument plumbing (SPEC93DECSTATUR-004).

## Acceptance Criteria

### Tests That Must Pass

1. `registry.test.ts` passes with the retired validators absent from the name-list and the README inventory matches the live registry.
2. The §8 removal-completeness sweep returns no live `page_plan_`/`prose_receipt_` validator references (only annotated legacy-read sites).
3. `(cd tools/validators && npm run build)` green; focused retired-validator and consumer proofs pass. Broad `(cd tools/validators && npm test)` was rerun and remains red on pre-existing compatibility/CLI fixture expectations outside this ticket's retired-validator seam (see `## Deviations`).

### Invariants

1. No zombie gates: every retired validator is removed from the registry and its suite deleted.
2. Rule 7 firewall is preserved: gate 3 (PG record) + `scene_range_forbidden_mystery_resolution` (SPEC-92) remain the authoritative + rendered-prose firewalls; no retirement here resolves a forbidden-status `M`.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/registry.test.ts` — drop retired-validator name-list entries.
2. `tools/validators/tests/integration/{spec57-stchar-pipeline-integration,spec76-red-kiln-ambush,spec92-scene-layer-capstone}.test.ts` — drop retired-validator assertions (Rule 6 attribution).
3. Deleted: the five retired validators' colocated suites.

### Commands

1. `(cd tools/validators && npm run build)`
2. `(cd tools/validators && node --test dist/tests/structural/registry.test.js dist/tests/structural/forbidden-stchar-tamper-hash-meta.test.js dist/tests/integration/spec57-stchar-pipeline-integration.test.js dist/tests/integration/spec76-red-kiln-ambush.test.js dist/tests/integration/spec92-scene-layer-capstone.test.js dist/tests/integration/validate-patch-plan.test.js dist/tests/structural/scene-plan-verbatim-section-integrity.test.js dist/tests/structural/scene-plan-body-engine-vocabulary-cleanliness.test.js)`
3. `(cd tools/world-mcp && npm run build)`
4. `(cd tools/world-mcp && node --test dist/tests/server/capability-parity.test.js dist/tests/cli/inline-canonical-prose-sections.test.js dist/tests/tools/submit-patch-plan.test.js)`
5. `grep -rn "page-plan-verbatim-section-integrity\|prose-receipt-hash-integrity\|prose-receipt-schema-compliance" tools/validators/src` — expect zero retired-validator matches; `scene-prose-receipt-schema-compliance` substring hits are the surviving SPEC-92 scene validator.

## Outcome

Completed: 2026-05-28

Retired the SPEC-93 page-plan/prose-receipt validator surface in `tools/validators`: removed the page-plan body/verbatim/STCHAR validators, prose-receipt schema/hash/STCHAR validators, their page-plan parser/schema support, the page prose-receipt schema, and their structural test suites. The public registry, README inventory, registry test, integration/capstone expectations, and pre-apply execution-row checks now reflect the surviving record and scene validators.

Retargeted the surviving SPEC-92 scene-plan verbatim validator from the page-plan-named canonical-source helper to `scene-plan-verbatim-canonical-sources.ts`, and updated the validators public export plus `tools/world-mcp` consumers to the scene-plan helper names. `tools/world-mcp/tests/tools/submit-patch-plan.test.ts` no longer asserts the retired page-plan body validator; SPEC93DECSTATUR-004 still owns removing the `page_plan_drafts` argument itself.

Rule 7 is preserved: this ticket did not touch gate 3 or the scene rendered-prose firewall (`scene_range_forbidden_mystery_resolution` through `scene_prose_receipt_content`).

## Verification Result

PASS — `(cd tools/validators && npm run clean && npm run build)` completed successfully after deleting retired source/test files and rebuilding fresh compiled output.

PASS — `(cd tools/validators && node --test dist/tests/structural/registry.test.js dist/tests/structural/forbidden-stchar-tamper-hash-meta.test.js dist/tests/integration/spec57-stchar-pipeline-integration.test.js dist/tests/integration/spec76-red-kiln-ambush.test.js dist/tests/integration/spec92-scene-layer-capstone.test.js dist/tests/integration/validate-patch-plan.test.js dist/tests/structural/scene-plan-verbatim-section-integrity.test.js dist/tests/structural/scene-plan-body-engine-vocabulary-cleanliness.test.js)` passed 37/37 focused compiled tests.

PASS — `(cd tools/world-mcp && npm run build)` completed successfully after retargeting the validators package canonical-source export.

PASS — `(cd tools/world-mcp && node --test dist/tests/server/capability-parity.test.js dist/tests/cli/inline-canonical-prose-sections.test.js dist/tests/tools/submit-patch-plan.test.js)` passed 17/17 focused consumer tests.

PASS — stale-anchor sweep over `tools/validators/src`, `tools/validators/tests`, `tools/validators/README.md`, `tools/world-mcp/src`, and `tools/world-mcp/tests` found no retired page-plan/prose-receipt validator references. Remaining `scene_prose_receipt_schema_compliance` hits are the surviving SPEC-92 scene validator and are intentional.

## Deviations

- Broad `(cd tools/validators && npm test)` was rerun after the focused proof and remains red outside this ticket's owned seam. The reported failures are compatibility/CLI fixture expectations, with the isolated representative failure in `dist/tests/integration/spec43-midstory-introduction.test.js`: the synthetic legacy bundle expects a clean structural validation, but current validators emit compatibility/active-record warnings plus `page_plan_turn_driver_consistency` failures for missing `SE-1`/`SE-2` records. Focused retired-validator proofs and consumer proofs are green.
- `page-plan-verbatim-canonical-sources.ts` was not simply deleted in place; it was renamed to `scene-plan-verbatim-canonical-sources.ts` because SPEC-92's scene-plan validator still uses the canonical prose-renderer contract bytes.
