# VALENH-024: predicate-DSL schema-discovery declares existential role-filter fields as `^role:`-prefixed while the runtime requires the bare role enum

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/predicate-dsl-grammar.schema.json`, `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`, and `tools/validators/tests/predicate-dsl-grammar-parity.test.ts`.
**Deps**: None.

## Problem

At intake, during the `red-bunny` `branching-story-bootstrap` run, a seed `SLT` precondition `{ pred: any_belief, alias: read, holder_role: "role:viewpoint" }` — authored following the `describe_envelope_schema` contract, which typed `any_belief.holder_role` as `^role:[a-z][a-z0-9_-]*$` — was rejected by `validate-patch-plan`: `SLT-5: preconditions.hard[0].holder_role must be one of viewpoint, player_proxy, ...`. The operator fixed it to bare `viewpoint` by trial.

Before this ticket, the discoverable JSON schema `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` (surfaced verbatim to authors via `describe_envelope_schema`) typed five existential role-filter fields with the `^role:` actor-alias pattern: `any_belief.holder_role`, `any_intention.holder_role`, `any_obligation_open.owed_by_role`, `any_obligation_open.owed_to_role`, and `any_relationship_axis.participant_role`. But the enforced runtime grammar — `requireOptionalRole` in `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` — validates those fields against the bare `role_in_story` enum. The same schema's `any_emotion_active.holder_role` and `any_plan_active.holder_role` already used the correct bare enum, proving the bare form is intended and the five `^role:` fields were a copy from the actor-binding `holder`/`entity`/`from`/`to` pattern (which legitimately accepts `STENT-<integer> | role:alias`). An author following the old discoverable contract emitted `role:`-prefixed filters that the runtime rejected; `branching-story-bootstrap` §Phase 5 explicitly recommends these existential predicates for seed blocks, so the drift sat on a skill-recommended authoring path.

## Assumption Reassessment (2026-05-20)

1. At intake, grep confirmed that `predicate-dsl-grammar.schema.json` carried `pattern: "^role:[a-z][a-z0-9_-]*$"` on the five cited role-filter fields, while `rule_storylet_predicate_dsl_parsability.ts`'s single `requireOptionalRole` helper validated all five against the bare `role_in_story` enum (the same enum already used by `any_emotion_active`/`any_plan_active.holder_role` in the schema). **Change attribution (no-silent-retcons):** existing behavior — the schema-discovery artifact advertised `^role:` for the five role-filter fields; new behavior — those fields carry the bare `role_in_story` enum identical to the two already-correct sibling fields; the warrant is the runtime rejection of the schema-conformant `role:viewpoint` value plus the intra-schema inconsistency.
2. Confirmed at HEAD: the schema IS the discoverable contract; `describe_envelope_schema` delivers it verbatim with no separate prose layer, so correcting the schema corrects what authors read. No prose documentation file needs editing.
3. Shared boundary under audit: the contract between (a) `predicate-dsl-grammar.schema.json` (schema-discovery artifact), (b) the runtime `requireOptionalRole` in `rule_storylet_predicate_dsl_parsability.ts` (enforcement authority), and (c) `describe_envelope_schema` (the MCP surface delivering (a) to authors). The runtime (b) is authoritative; this ticket aligns (a) to it; (c) is a faithful messenger needing no change.
4. Reassessment adjustment before source edits: the parity test should compare against the runtime-owned role list rather than duplicating the enum in test code. This adds a non-behavioral export of the existing role list from `rule_storylet_predicate_dsl_parsability.ts`; `requireOptionalRole` still enforces the same bare values through the same helper.

## Architecture Check

1. Aligning the five fields to the bare enum matches the runtime's single `requireOptionalRole` authority and the two already-correct sibling fields, giving one consistent representation for a "role_in_story filter" — distinct from the `STENT-<integer> | role:alias` actor-binding pattern used by `holder`/`entity`/`from`/`to`. A schema↔runtime parity assertion prevents future divergence. This is cleaner than the alternative of teaching the runtime to also accept `role:`-prefixed filters, which would create two equivalent spellings for one concept and collide with the distinct actor-binding meaning of the `role:` prefix.
2. No backwards-compatibility shims: the `^role:` patterns are replaced with the enum, not dual-accepted.

## Verification Layers

1. Schema↔runtime parity for role-filter fields → schema validation / unit test (`tools/validators/tests/predicate-dsl-grammar-parity.test.ts`): assert each existential role-filter field's allowed values equal the runtime role enum exported from `rule_storylet_predicate_dsl_parsability.ts`.
2. Bare-enum accepted, prefixed rejected → unit test: each existential role-filter field validates with `viewpoint` and rejects `role:viewpoint` through the JSON Schema under Ajv2020; the full validators suite preserves unchanged runtime `requireOptionalRole` behavior.
3. `describe_envelope_schema` now surfaces the bare enum → focused `tools/world-mcp` compiled test plus schema inspection prove the referenced predicate DSL schema is delivered through the discovery surface.

## Landed Changes

1. `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` now uses the bare `role_in_story` enum for `any_belief.holder_role`, `any_intention.holder_role`, `any_obligation_open.owed_by_role`, `any_obligation_open.owed_to_role`, and `any_relationship_axis.participant_role`. The `holder`/`entity`/`from`/`to` actor-binding fields' `STENT-<integer> | role:alias` pattern remains unchanged.
2. `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` exports the existing runtime role list for test parity, while keeping `requireOptionalRole` behavior unchanged.
3. `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` has a schema↔runtime parity assertion so the discoverable schema's role-filter enums cannot diverge from the runtime role list again.

## Files to Touch

- `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` (modify)
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify; non-behavioral role-list export)
- `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (modify)

## Out of Scope

- The runtime `requireOptionalRole` enforcement behavior (already correct; only the existing role list is exported for parity testing).
- The actor-binding `holder`/`entity`/`from`/`to` fields' `STENT-<integer> | role:alias` pattern (correct as-is).
- Any predicate-name (`PRED_TYPES`) change.

## Acceptance Criteria

- **Tests that passed**: the parity assertion confirms the five corrected role-filter fields plus the two already-correct sibling role-filter fields equal the runtime role enum; each field validates `viewpoint` and rejects `role:viewpoint`.
- **Invariants**: `any_emotion_active`/`any_plan_active.holder_role` unchanged; actor-binding fields unchanged; no runtime enforcement behavior changes (the runtime was already correct).

## Test Plan

- **New/modified tests**: extend `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` with the schema↔runtime role-filter parity assertion (each existential role-filter field's allowed values equal `requireOptionalRole`'s enum).
- **Commands**:
  - `cd tools/validators && npm run build`
  - `cd tools/validators && node --test dist/tests/predicate-dsl-grammar-parity.test.js`
  - `cd tools/validators && npm test`
  - `cd tools/world-mcp && npm run build`
  - `cd tools/world-mcp && node --test dist/tests/tools/describe-envelope-schema.test.js`
  - schema inspection command over `tools/validators/src/schemas/predicate-dsl-grammar.schema.json`

## Outcome

The predicate DSL discovery schema now advertises the same bare `role_in_story` values that `requireOptionalRole` already enforces for the five previously drifted existential role-filter fields. The runtime role list is exported for parity testing only; runtime enforcement behavior is unchanged. The existing `role:` actor-binding fields remain pattern-based and distinct from role-filter fields.

## Verification Result

1. Baseline before edits: `cd tools/validators && npm test` passed, 696 tests.
2. `cd tools/validators && npm run build` passed.
3. `cd tools/validators && node --test dist/tests/predicate-dsl-grammar-parity.test.js` passed, 4 tests.
4. `cd tools/validators && npm test` passed, 696 tests.
5. `cd tools/world-mcp && npm run build` passed.
6. `cd tools/world-mcp && node --test dist/tests/tools/describe-envelope-schema.test.js` passed, 8 tests.
7. Schema inspection confirmed the five corrected fields are enum-only with 12 values each: `any_obligation_open.owed_by_role`, `any_obligation_open.owed_to_role`, `any_relationship_axis.participant_role`, `any_belief.holder_role`, and `any_intention.holder_role`.
8. Grep over `predicate-dsl-grammar.schema.json` confirmed remaining `role:` patterns are only actor-binding fields such as `holder`, `entity`, `from`, and `to`.

## Deviations

- Added `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` to the touched file set to export the existing role enum for parity testing. This is non-behavioral and keeps `requireOptionalRole` on the same bare enum values.
- Ran the focused `tools/world-mcp` discovery test in addition to the drafted validators package proof because `describe_envelope_schema` is the consumer surface that exposes the corrected schema.
