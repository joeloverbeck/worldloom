# SPEC22SCECOM-004: Add `effect_model_legality` + `effect_model_replay_safety` validators

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds 2 new validator files under `tools/validators/src/rules/`. Validators auto-register via `tools/validators/src/public/registry.ts`.
**Deps**: archive/tickets/SPEC22SCECOM-002.md

## Problem

SPEC-22 §Track 2 requires deterministic enforcement of effect-model legality (every `effect_model.variants[]` entry has ≥1 required_effects with closed-enum types; variant.maps_to_outcome ∈ arc.arc_contract.allowed_outcome_band) and effect-model replay safety (every PG record's `state_snapshot.applied_effect_variant` is a valid variant id of the realized arc; the SE record's ops are derivable from the chosen variant's required_effects). Without these validators, malformed effect models slip through to runtime where they corrupt arc-close state mutations and break replay determinism.

## Assumption Reassessment (2026-05-08)

1. `tools/validators/src/rules/` is the conventional rule-validator location. Both new validators follow the existing rule-validator structural shape (deterministic check + ValidatorResult).
2. **Cross-skill boundary under audit**: `effect_model_replay_safety` reads PG records' `state_snapshot.applied_effect_variant` field — this field's documentation lives in `branching-story-page-cycle/references/record-schemas.md` (extended by 013). The validator does NOT consume page-cycle's runtime code; it operates on persisted YAML records. The boundary is the persisted-record schema, not the runtime emit path.
3. **SPEC-19 §A** (archived) defines `effect_model.variants[].required_effects[].type` as a closed enum: `relationship_axis_shift`, `thread_pressure_delta`, `obligation_status_change`, `fact_create`, `fact_invalidate`, `consequence_open`, `consequence_address`, `cast_change`, `location_change`, `mystery_progress`. The `forbidden_effects[]` list uses the same enum. `arc_contract.allowed_outcome_band` is per-arc-instance (not a global enum).
4. **FOUNDATIONS Rule 1 (No Floating Facts)** restated: every effect a variant claims to produce must be typed, scoped, and derivable. `effect_model_legality` enforces typing + outcome-band conformance; `effect_model_replay_safety` enforces derivability from the SE record's ops.
5. (HARD-GATE / canon-write ordering): N/A — validator framework is meta-tooling.
6. **Schema extension**: validators consume v2 schemas added in archive/tickets/SPEC22SCECOM-002.md. The `effect_model.variants[].required_effects[].type` enum is documented in canonical-vocabularies (added in 006 — soft dep). Without 006, the closed-enum check uses an inline list duplicated in this validator's source. Soft dep on 006 means this ticket can ship before 006; the validator can land with the inline enum and update to import from canonical-vocabularies later.
7. (Rename/removal): None — pure addition.

## Architecture Check

1. Two distinct validators rather than one merged validator: `effect_model_legality` operates on SLT records; `effect_model_replay_safety` operates on PG + SE record pairs. Different input shapes → different validator boundaries. Merging would force one validator to enumerate two distinct record-set queries, complicating its implementation.
2. No backwards-compatibility aliasing/shims — both validators are net-new.

## Verification Layers

1. `effect_model_legality` accepts a fixture v2 SLT with valid effect_model; rejects with empty required_effects, unknown effect type, out-of-band variant outcome — unit test.
2. `effect_model_replay_safety` accepts a fixture (PG + SE + SLT) triple where the page's applied_effect_variant references a real variant id and the SE.ops match the variant's required_effects → integration test against fixture bundle.
3. `effect_model_replay_safety` rejects a fixture where applied_effect_variant references a non-existent variant id; rejects where SE.ops don't match the variant's required_effects.
4. Registry registration → grep `effect_model_legality|effect_model_replay_safety` in `tools/validators/src/public/registry.ts`.
5. FOUNDATIONS Rule 1 alignment: variant outcome-band conformance enforces declared scope.

## What to Change

### 1. Add `tools/validators/src/rules/effect_model_legality.ts`

Deterministic check function over storylet records with `shape: scene_commitment_arc`:

- For each SLT: verify `effect_model.variants[]` has ≥1 entry.
- For each variant: verify `required_effects[]` has ≥1 entry; every `required_effects[N].type` is in the closed effect-type enum (10 values per SPEC-19 §A); every `forbidden_effects[N].type` is in the same enum; `variant.maps_to_outcome` is in `arc.arc_contract.allowed_outcome_band`.
- Failure mode: HARD-REJECT with reason naming the offending SLT id + variant id + violation.

### 2. Add `tools/validators/src/rules/effect_model_replay_safety.ts`

Deterministic check function over PG + SE + SLT record triples (resolve via `PG.storylet_realized → SLT`, `PG.state_snapshot.applied_effect_variant → SLT.effect_model.variants[].id`, `PG.applied_event_ops → SE`):

- For each PG: verify `state_snapshot.applied_effect_variant` is a valid `variants[].id` of the realized arc's `effect_model`.
- Verify the SE record's `ops` are derivable from the chosen variant's `required_effects[]` — each required_effect maps to one or more SE.ops (per SPEC-20 §C "Phase 5 — State Mutation at Arc-Close").
- Root-page exception: PG-0001 with `applied_effect_variant: null` is accepted (bootstrap PG-0001 has no realized arc).
- Failure mode: HARD-REJECT with reason naming the offending PG id + diagnostic.

### 3. Register validators in `tools/validators/src/public/registry.ts`

Add the two new validator imports + entries to `ruleValidators` array.

## Files to Touch

- `tools/validators/src/rules/effect_model_legality.ts` (new)
- `tools/validators/src/rules/effect_model_replay_safety.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — register new validators)
- `tools/validators/tests/rules/effect_model_legality.test.ts` (new)
- `tools/validators/tests/rules/effect_model_replay_safety.test.ts` (new)

## Out of Scope

- Trace + envelope-conformance validators (in 005)
- Schema-shape validators (in 003)
- Schema infrastructure (in archive/tickets/SPEC22SCECOM-002.md)
- Effect-type enum implementation in canonical-vocabularies (in 006 — this validator may import from there in a follow-up; ships with inline enum first)
- Same downstream Out of Scope as 001/002

## Acceptance Criteria

### Tests That Must Pass

1. `effect_model_legality` accepts a fixture v2 SLT with valid effect_model.
2. `effect_model_legality` rejects each of: variants[] empty, required_effects[] empty, required_effects[N].type unknown, variant.maps_to_outcome not in allowed_outcome_band.
3. `effect_model_replay_safety` accepts a fixture (PG, SE, SLT) triple with consistent applied_effect_variant + ops derivation.
4. `effect_model_replay_safety` rejects a fixture where applied_effect_variant references a non-existent variant id.
5. `effect_model_replay_safety` accepts PG-0001 with `applied_effect_variant: null` (root-page exception).
6. `world-validate` CLI runs against the v2 fixture bundle and emits PASS for both validators.

### Invariants

1. Every `shape: scene_commitment_arc` SLT has at least one variant with at least one valid required_effect (per effect_model_legality).
2. Every PG.state_snapshot.applied_effect_variant references a valid variant id of the realized arc, OR is null at PG-0001 (per effect_model_replay_safety).
3. SE.ops are deterministically derivable from the chosen variant's required_effects (replay-safety property).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/effect_model_legality.test.ts` (new) — passing + 4 failing fixtures.
2. `tools/validators/tests/rules/effect_model_replay_safety.test.ts` (new) — passing + 2 failing fixtures + PG-0001 root exception.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && npm run test`
3. `cd tools/validators && node dist/src/cli/world-validate.js --world <test-fixture-world> --story <test-fixture-story>`
