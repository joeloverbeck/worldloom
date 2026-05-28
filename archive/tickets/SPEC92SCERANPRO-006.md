# SPEC92SCERANPRO-006: scene-plan structural validators

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/validators` (five new scene-plan structural validators; registry).
**Deps**: archive/tickets/SPEC92SCERANPRO-002.md

## Problem

Scene plans + SCN records need structural validation: range contiguity / single-branch / no-sibling, scene-plan section completeness, §2/§3/§render-time verbatim integrity, renderer-body engine-vocabulary cleanliness, and the §5a/§5c narrative-shape guard. These are the scene-scope analogues of the page-plan structural validators.

## Assumption Reassessment (2026-05-28)

1. The reuse sources exist at HEAD: `tools/validators/src/structural/page-plan-verbatim-canonical-sources.ts` and `page-plan-body-engine-vocabulary-cleanliness.ts` (verified). The new scene validators retarget these mechanisms to scene plans through the new `scene-plan-section-parser.ts`; `tools/validators/src/public/registry.ts` is the registration site.
2. SPEC-92 §6 (Hard checks) defines the five validators: scene_range_contiguity / single_branch / no_sibling (one validator), scene_plan_structural, scene_plan_verbatim_section_integrity, scene_plan_body_engine_vocabulary_cleanliness, scn_no_narrative_shape_language. The SCN / scene-plan shapes come from -001 / -002.
3. Cross-artifact boundary under audit: `registry.ts` is shared with -002 (schema registration) and -007 (receipt validators) — three tickets append to it; coordinate slot ordering (mechanical, no semantic overlap). The validators are consumed by the validator-framework run-loop and `tools/world-mcp` capability parity (registry insertion is the consumer wiring, plus the downstream stable validator-name list).
4. FOUNDATIONS §Story Bundles §5a / §5c motivate `scn_no_narrative_shape_language`: SCN must not drift into a narrative-shape / drama engine. Per the SPEC-92 reassessment (finding M3), this token validator is the deterministic BACKSTOP; the scene-plan skill's HARD-GATE (-008) carries the semantic §5c affirmation.
5. Canon Safety / enforcement surface: these validators live under `tools/validators/src/structural/` and gate scene-plan / SCN structure at validation time. `docs/HARD-GATE-DISCIPLINE.md` was read because validator registration affects validation signals. None weakens the Mystery Reserve firewall — these are structural / render-clean checks; the MR firewall on rendered prose is -007's `scene_range_forbidden_mystery_resolution`. No MR weakening here.
6. Same-seam proof fallout: adding registered validators requires the README inventory, registry test, pre-apply execution-status test, and `tools/world-mcp` capability-parity proof to move with the registry. Adding `SCN` to the shared engine-vocabulary token source is same-seam because scene-plan body cleanliness must catch SCN ids, and the existing page-plan token-source fixture must remain truthful.

## Architecture Check

1. Retargeting the page-plan verbatim + engine-vocab mechanisms (rather than reimplementing) keeps the scene validators consistent with the page-plan validators and minimizes new logic. `scn_no_narrative_shape_language` is the one genuinely new token-blocklist validator, paired with the skill's HARD-GATE affirmation.
2. No shims: new validators register in the existing framework array; no special-case dispatch.

## Verification Layers

1. Non-contiguous / cross-branch / sibling-inclusive ranges FAIL scene_range_* -> validator fixtures (violation + clean).
2. Scene plan missing a required section FAILS scene_plan_structural -> fixture.
3. §2/§3/§render-time byte-drift FAILS scene_plan_verbatim_section_integrity -> fixture.
4. Engine jargon in the renderer body FAILS scene_plan_body_engine_vocabulary_cleanliness -> fixture.
5. Injected narrative-shape token FAILS scn_no_narrative_shape_language -> positive + negative fixture.

## What to Change

### 1. Five new validators

`scene-range-integrity.ts` (contiguity / single-branch / no-sibling + end-PG choice-surface parity), `scene-plan-structural.ts`, `scene-plan-verbatim-section-integrity.ts`, `scene-plan-body-engine-vocabulary-cleanliness.ts`, `scn-no-narrative-shape-language.ts`, and the shared `scene-plan-section-parser.ts` — implemented per SPEC-92 §6. The verbatim + body-cleanliness validators retarget the page-plan canonical-sources + engine-vocabulary mechanisms to scene-plan sections.

### 2. registry.ts (modify)

Register the five validators.

### 3. Inventory and execution-status fallout

Update the validators README inventory, registry tests, pre-apply execution-status test, and `SCN` engine-vocabulary token fixture so the new validators are visible to package and downstream capability checks.

## Files to Touch

- `tools/validators/src/structural/scene-range-integrity.ts` (new)
- `tools/validators/src/structural/scene-plan-structural.ts` (new)
- `tools/validators/src/structural/scene-plan-verbatim-section-integrity.ts` (new)
- `tools/validators/src/structural/scene-plan-body-engine-vocabulary-cleanliness.ts` (new)
- `tools/validators/src/structural/scene-plan-section-parser.ts` (new)
- `tools/validators/src/structural/scn-no-narrative-shape-language.ts` (new)
- `tools/validators/src/structural/_engine-vocabulary-tokens.ts` (modify)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/README.md` (modify)
- `tools/validators/tests/structural/scene-range-integrity.test.ts` (new)
- `tools/validators/tests/structural/scene-plan-structural.test.ts` (new)
- `tools/validators/tests/structural/scene-plan-verbatim-section-integrity.test.ts` (new)
- `tools/validators/tests/structural/scene-plan-body-engine-vocabulary-cleanliness.test.ts` (new)
- `tools/validators/tests/structural/scn-no-narrative-shape-language.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)

## Out of Scope

- The scene-prose-receipt content validators (-007).
- The JSON schemas (-002).
- The scene-plan skill that produces the plans these validate (-008).

## Acceptance Criteria

### Tests That Must Pass

1. Each validator fires on its violation fixture and passes its clean fixture (rationale, not bare PASS).
2. `scn_no_narrative_shape_language` fails on an injected "act / climax / builds-toward" token; passes a descriptive `scene_descriptor`.
3. `cd tools/validators && npm run build && npm test` green.

### Invariants

1. Validators are registered in the framework array (structural-consumer model).
2. No validator weakens the Mystery Reserve firewall.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/scene-range-integrity.test.ts` and one per new validator — new; violation + clean fixtures.
2. `tools/validators/tests/structural/registry.test.ts`, `page-plan-body-engine-vocabulary-cleanliness.test.ts`, and `tools/validators/tests/integration/validate-patch-plan.test.ts` — modified; registry/README, SCN token source, and pre-apply skip status remain truthful.

### Commands

1. `cd tools/validators && npm run build && npm test`
2. `cd tools/world-mcp && npm run build && node --test dist/tests/server/capability-parity.test.js`

## Outcome

Completed: 2026-05-28

Implemented the SPEC-92 scene-plan structural validator layer in `tools/validators`: SCN range integrity, scene-plan section completeness, scene-plan verbatim contract integrity, renderer-body engine-vocabulary cleanliness, and the SCN/scene-plan narrative-shape token backstop. Added a scene-plan target/section parser, registered all five validators, updated the README inventory, and added SCN to the shared engine-vocabulary token source so scene-plan bodies catch SCN ids alongside existing story/world ids.

## Verification Result

1. `cd tools/validators && npm run build` passed.
2. `cd tools/validators && node --test dist/tests/integration/validate-patch-plan.test.js dist/tests/structural/scene-range-integrity.test.js dist/tests/structural/scene-plan-structural.test.js dist/tests/structural/scene-plan-verbatim-section-integrity.test.js dist/tests/structural/scene-plan-body-engine-vocabulary-cleanliness.test.js dist/tests/structural/scn-no-narrative-shape-language.test.js dist/tests/structural/registry.test.js` passed 39 focused tests.
3. `cd tools/validators && npm test` passed: 1125 tests, 1125 pass, 0 fail.
4. `cd tools/world-mcp && npm run build` passed.
5. `cd tools/world-mcp && node --test dist/tests/server/capability-parity.test.js` passed 5 tests.

## Deviations

The drafted file list did not name `scene-plan-section-parser.ts`, README inventory updates, SCN engine-vocabulary token coverage, or the pre-apply execution-status assertion. Reassessment and proof showed those were same-seam fallout required to keep the validator package and downstream `world-mcp` capability registry truthful after adding the new structural validators.
