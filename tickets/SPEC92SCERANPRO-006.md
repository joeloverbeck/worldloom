# SPEC92SCERANPRO-006: scene-plan structural validators

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/validators` (five new scene-plan structural validators; registry).
**Deps**: SPEC92SCERANPRO-002

## Problem

Scene plans + SCN records need structural validation: range contiguity / single-branch / no-sibling, scene-plan section completeness, §2/§3/§render-time verbatim integrity, renderer-body engine-vocabulary cleanliness, and the §5a/§5c narrative-shape guard. These are the scene-scope analogues of the page-plan structural validators.

## Assumption Reassessment (2026-05-28)

1. The reuse sources exist at HEAD: `tools/validators/src/structural/page-plan-verbatim-canonical-sources.ts` and `page-plan-body-engine-vocabulary-cleanliness.ts` (verified). The new scene validators retarget these mechanisms to scene plans; `tools/validators/src/public/registry.ts` is the registration site.
2. SPEC-92 §6 (Hard checks) defines the five validators: scene_range_contiguity / single_branch / no_sibling (one validator), scene_plan_structural, scene_plan_verbatim_section_integrity, scene_plan_body_engine_vocabulary_cleanliness, scn_no_narrative_shape_language. The SCN / scene-plan shapes come from -001 / -002.
3. Cross-artifact boundary under audit: `registry.ts` is shared with -002 (schema registration) and -007 (receipt validators) — three tickets append to it; coordinate slot ordering (mechanical, no semantic overlap). The validators are consumed by the validator-framework run-loop (registry insertion IS the consumer wiring — structural-consumer model, no name-greppable caller).
4. FOUNDATIONS §Story Bundles §5a / §5c motivate `scn_no_narrative_shape_language`: SCN must not drift into a narrative-shape / drama engine. Per the SPEC-92 reassessment (finding M3), this token validator is the deterministic BACKSTOP; the scene-plan skill's HARD-GATE (-008) carries the semantic §5c affirmation.
5. Canon Safety / enforcement surface: these validators live under `tools/validators/src/structural/` and gate scene-plan / SCN structure at validation time. Confirm none weakens the Mystery Reserve firewall — these are structural / render-clean checks; the MR firewall on rendered prose is -007's `scene_range_forbidden_mystery_resolution`. No MR weakening here.

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

`scene-range-integrity.ts` (contiguity / single-branch / no-sibling), `scene-plan-structural.ts`, `scene-plan-verbatim-section-integrity.ts`, `scene-plan-body-engine-vocabulary-cleanliness.ts`, `scn-no-narrative-shape-language.ts` — implemented per SPEC-92 §6. The verbatim + body-cleanliness validators retarget the page-plan canonical-sources + engine-vocabulary mechanisms to scene-plan sections.

### 2. registry.ts (modify)

Register the five validators.

## Files to Touch

- `tools/validators/src/structural/scene-range-integrity.ts` (new)
- `tools/validators/src/structural/scene-plan-structural.ts` (new)
- `tools/validators/src/structural/scene-plan-verbatim-section-integrity.ts` (new)
- `tools/validators/src/structural/scene-plan-body-engine-vocabulary-cleanliness.ts` (new)
- `tools/validators/src/structural/scn-no-narrative-shape-language.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)

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

### Commands

1. `cd tools/validators && npm run build && npm test`
