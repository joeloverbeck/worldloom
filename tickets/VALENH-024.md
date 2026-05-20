# VALENH-024: predicate-DSL schema-discovery declares existential role-filter fields as `^role:`-prefixed while the runtime requires the bare role enum

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` and `tools/validators/tests/predicate-dsl-grammar-parity.test.ts`.
**Deps**: None.

## Problem

During the `red-bunny` `branching-story-bootstrap` run this session, a seed `SLT` precondition `{ pred: any_belief, alias: read, holder_role: "role:viewpoint" }` — authored following the `describe_envelope_schema` contract, which types `any_belief.holder_role` as `^role:[a-z][a-z0-9_-]*$` — was rejected by `validate-patch-plan`: `SLT-5: preconditions.hard[0].holder_role must be one of viewpoint, player_proxy, …`. The operator fixed it to bare `viewpoint` by trial.

The discoverable JSON schema `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` (surfaced verbatim to authors via `describe_envelope_schema`) types five existential role-filter fields with the `^role:` actor-alias pattern: `any_belief.holder_role` (line 344), `any_intention.holder_role` (line 358), `any_obligation_open.owed_by_role` (line 257) / `owed_to_role` (line 258), and `any_relationship_axis.participant_role` (line 333). But the enforced runtime grammar — `requireOptionalRole` in `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (call sites at lines 295/305/318-319/358/363/371; allowed enum at line 33; "must be one of" failure at line 612) — validates all five against the bare `role_in_story` enum. The same schema's `any_emotion_active.holder_role` (line 231) and `any_plan_active.holder_role` (line 208) already use the correct bare enum, proving the bare form is intended and the five `^role:` fields are a copy from the actor-binding `holder`/`entity`/`from`/`to` pattern (which legitimately accepts `STENT-<integer> | role:alias`). An author following the discoverable contract emits `role:`-prefixed filters that the runtime rejects; `branching-story-bootstrap` §Phase 5 explicitly recommends these existential predicates for seed blocks, so the drift sits on a skill-recommended authoring path.

## Assumption Reassessment (2026-05-20)

1. Confirmed at HEAD via grep: `predicate-dsl-grammar.schema.json` carries `pattern: "^role:[a-z][a-z0-9_-]*$"` on the five cited role-filter fields, while `rule_storylet_predicate_dsl_parsability.ts`'s single `requireOptionalRole` helper validates all five against the bare `role_in_story` enum (the same enum already used by `any_emotion_active`/`any_plan_active.holder_role` in the schema). **Change attribution (no-silent-retcons):** existing behavior — the schema-discovery artifact advertises `^role:` for the five role-filter fields; new behavior — those fields carry the bare `role_in_story` enum identical to the two already-correct sibling fields; the warrant is this session's runtime rejection of the schema-conformant `role:viewpoint` value plus the intra-schema inconsistency.
2. Confirmed at HEAD: the schema IS the discoverable contract; `describe_envelope_schema` delivers it verbatim with no separate prose layer, so correcting the schema corrects what authors read. No prose documentation file needs editing.
3. Shared boundary under audit: the contract between (a) `predicate-dsl-grammar.schema.json` (schema-discovery artifact), (b) the runtime `requireOptionalRole` in `rule_storylet_predicate_dsl_parsability.ts` (enforcement authority), and (c) `describe_envelope_schema` (the MCP surface delivering (a) to authors). The runtime (b) is authoritative; this ticket aligns (a) to it; (c) is a faithful messenger needing no change.

## Architecture Check

1. Aligning the five fields to the bare enum matches the runtime's single `requireOptionalRole` authority and the two already-correct sibling fields, giving one consistent representation for a "role_in_story filter" — distinct from the `STENT-<integer> | role:alias` actor-binding pattern used by `holder`/`entity`/`from`/`to`. A schema↔runtime parity assertion prevents future divergence. This is cleaner than the alternative of teaching the runtime to also accept `role:`-prefixed filters, which would create two equivalent spellings for one concept and collide with the distinct actor-binding meaning of the `role:` prefix.
2. No backwards-compatibility shims: the `^role:` patterns are replaced with the enum, not dual-accepted.

## Verification Layers

1. Schema↔runtime parity for role-filter fields → schema validation / unit test (`tools/validators/tests/predicate-dsl-grammar-parity.test.ts`): assert each existential role-filter field's allowed values equal the runtime `requireOptionalRole` enum.
2. Bare-enum accepted, prefixed rejected → unit test: `holder_role: viewpoint` validates against the schema and the runtime; `holder_role: "role:viewpoint"` is rejected by both.
3. `describe_envelope_schema` now surfaces the bare enum → codebase grep: `predicate-dsl-grammar.schema.json` shows `enum` (not `^role:`) for the five fields.

## What to Change

1. `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` — replace `pattern: "^role:[a-z][a-z0-9_-]*$"` on `any_belief.holder_role`, `any_intention.holder_role`, `any_obligation_open.owed_by_role`, `any_obligation_open.owed_to_role`, and `any_relationship_axis.participant_role` with `enum: ["viewpoint", "player_proxy", "primary_actor", "opposing_actor", "allied_actor", "authority", "dependent", "witness", "information_source", "pressure_source", "social_bridge", "background"]` (identical to `any_emotion_active`/`any_plan_active.holder_role`). Leave the `holder`/`entity`/`from`/`to` actor-binding fields' `STENT-<integer> | role:alias` pattern unchanged.
2. `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` — add a schema↔runtime parity assertion so the discoverable schema's role-filter enums cannot diverge from `requireOptionalRole` again.

## Files to Touch

- `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` (modify)
- `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (modify)

## Out of Scope

- The runtime `requireOptionalRole` enforcement (already correct; not to be changed).
- The actor-binding `holder`/`entity`/`from`/`to` fields' `STENT-<integer> | role:alias` pattern (correct as-is).
- Any predicate-name (`PRED_TYPES`) change.

## Acceptance Criteria

- **Tests that must pass**: the parity assertion confirms the five role-filter fields' allowed values equal the runtime role enum; `holder_role: viewpoint` validates; `holder_role: "role:viewpoint"` is rejected.
- **Invariants**: `any_emotion_active`/`any_plan_active.holder_role` unchanged; actor-binding fields unchanged; no runtime enforcement behavior changes (the runtime was already correct).

## Test Plan

- **New/modified tests**: extend `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` with the schema↔runtime role-filter parity assertion (each existential role-filter field's allowed values equal `requireOptionalRole`'s enum).
- **Commands**:
  - `cd tools/validators && npm test`
  - Targeted: `cd tools/validators && npm run build && node --test dist/tests/predicate-dsl-grammar-parity.test.js`
