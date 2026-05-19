# SPEC47STPSTE-008: Extend closed predicate DSL with 6 new predicates

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` PREDICATE_NAMES + PREDICATE_ARG_SCHEMAS with 6 new predicates; extends `tools/validators/src/schemas/story-storylet.schema.json` predicate-discovery surface; extends `tools/validators/src/schemas/predicate-dsl-grammar.schema.json`
**Deps**: `archive/tickets/SPEC47STPSTE-003.md`

## Problem

SPEC-47's STPLAN/STEMO records need predicate-DSL surfaces so SLT authors can write plan/emotion-aware commitment blocks. Without the 6 new predicates (`plan_active`, `plan_blocked`, `any_plan_active`, `emotion_active`, `any_emotion_active`, `emotion_pressure`), STPLAN/STEMO records are MCP-queryable (via ticket 011's Phase C summaries) but NOT author-pool-queryable, blocking plan/emotion-aware storylets from day 1. Per SPEC-47 §Key Design Decisions item 6 ("All 6 predicates land in v1"), all six predicates ship together — they are the precise value proposition the new classes exist to deliver.

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` is the central closed-DSL grammar file containing `PREDICATE_NAMES` (33 individual predicates + 3 combinators `not | all | any` = 36 total entries per the reassess-spec session's exact count) and `PREDICATE_ARG_SCHEMAS` (per-predicate argument-shape definitions). Verified `tools/validators/src/schemas/story-storylet.schema.json` is the schema-discovery surface that exposes the predicate vocabulary to authors; `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` is the meta-schema describing the grammar itself.
2. Verified SPEC-47 §Approach §B D-B4 specifies 6 new predicates by name with argument shapes (per the predicate table in §Approach §B): `plan_active(holder, plan?)`, `plan_blocked(holder)`, `any_plan_active(alias, holder_role?)`, `emotion_active(holder, kind?, min_intensity?)`, `any_emotion_active(alias, holder_role?, kind?, min_intensity?)`, `emotion_pressure(holder, pressure)`. Each is consumed by SLT preconditions per the established closed-DSL pattern; existential `any_*` predicates bind aliases for author-pool prefiltering.
3. Cross-skill boundary under audit: the closed predicate DSL is consumed by (a) `commitment-block-authoring` skill (storylet preconditions); (b) `branching-story-turn-cycle` skill (eligibility scoring at runtime); (c) `branching-story-bootstrap` skill (initial author-pool seeding); (d) validator-framework SLT-grammar parsability checks. Adding 6 predicates extends the surface those consumers iterate over; existing 33 predicates + 3 combinators are unchanged.
4. FOUNDATIONS §Story Bundles §5a (Commitment Blocks Are Causal Moves) — the closed predicate DSL is the language causal-move preconditions and effects are written in; extending it with plan/emotion-aware predicates lets storylets express plan/emotion-driven action triggers without inventing free-form predicate prose (which §5a forbids). The new predicates compose with existing `all` / `any` / `not` combinators (e.g., `all[plan_active(holder=alpha, plan=STPLAN-12), emotion_pressure(holder=alpha, pressure=conceal)]`).
5. Predicate-DSL grammar lives at `tools/validators/src/rules/_shared/` — per the §Step 6.2(c) per-ticket-type granularity rule for item 5: rule validators (`tools/validators/src/rules/`) are a Canon Safety surface (the grammar gates what SLT preconditions can be written and the engine validates against it at pre-apply time). HARD-GATE discipline preserved: the closed grammar grows additively; no canon-safety bypass introduced.
6. Implementation reassessment corrected the drafted file boundary: the schema mirrors alone are not enough because `storylet_predicate_dsl_parsability` owns the named-rule failures for required args, ID patterns, enum filters, existential scope, and alias binding. This ticket therefore also touches `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` and its existing focused test file, while leaving operational skill prose to ticket 016 and shared contract prose to ticket 010.

## Architecture Check

1. The closed predicate DSL is the single surface for SLT preconditions/effects; extending it once and letting consumers reference the closed grammar prevents per-skill free-form-predicate drift. Following the established convention from SPEC-42's CLK/STSEC/STQ predicate additions (e.g., `any_clock_active`, `any_secret_unrevealed`, `any_story_question_open`) keeps the grammar consistent.
2. No backwards-compatibility aliasing/shims introduced — additions only. Existing 33 predicates + 3 combinators unchanged in arg-shape or semantics.

## Verification Layers

1. PREDICATE_NAMES includes 6 new predicate strings → codebase grep-proof `grep -cE "plan_active|plan_blocked|any_plan_active|emotion_active|any_emotion_active|emotion_pressure" tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` returns ≥6
2. PREDICATE_ARG_SCHEMAS contains arg-shape entries for each of the 6 new predicates → schema validation per the existing predicate-arg-schema pattern
3. story-storylet.schema.json schema-discovery surface includes the 6 new predicates → schema validation
4. predicate-dsl-grammar.schema.json (meta-schema) accepts the 6 new predicates as valid grammar entries → meta-schema validation
5. Cross-validator: the SLT-grammar parsability check accepts SLT records using the new predicates; rejects malformed args (missing required arg, wrong arg type, out-of-enum value) per the standard predicate-parsability discipline

## Landed Changes

### 1. Extend `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`

Added 6 new entries to PREDICATE_NAMES (the closed-enum array) and PREDICATE_ARG_SCHEMAS required-argument table:

```typescript
plan_active: { required: ["holder"] },
plan_blocked: { required: ["holder"] },
any_plan_active: { required: ["alias"] },
emotion_active: { required: ["holder"] },
any_emotion_active: { required: ["alias"] },
emotion_pressure: { required: ["holder", "pressure"] },
```

Runtime parser and schema constraints cover optional filter args:
- `plan_active.plan` accepts STPLAN-<integer> strings
- `any_plan_active.holder_role` and `any_emotion_active.holder_role` accept the existing closed story-role enum
- `emotion_active.kind` accepts the 18 closed-enum `affect_kind` values (from STEMO schema)
- `emotion_active.min_intensity` accepts `low | medium | high | extreme`
- `any_emotion_active.kind` and `any_emotion_active.min_intensity` accept the same emotion filters
- `emotion_pressure.pressure` accepts the 18 closed-enum `behavioral_pressure` values

### 2. Extend `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`

Added runtime parser validation for the six new predicates:

- `plan_active(holder, plan?)` validates holder refs and optional STPLAN refs.
- `plan_blocked(holder)` validates holder refs.
- `any_plan_active(alias, holder_role?)` follows existing existential scope and alias-binding rules.
- `emotion_active(holder, kind?, min_intensity?)` validates holder refs and closed affect/intensity enums.
- `any_emotion_active(alias, holder_role?, kind?, min_intensity?)` follows existing existential scope, alias-binding, role, and closed enum rules.
- `emotion_pressure(holder, pressure)` validates holder refs and closed behavioral-pressure enum.

The active-record ID helper also recognizes STPLAN/STEMO so `record_active` can reference the new active record classes consistently with the added predicate surface.

### 3. Extend `tools/validators/src/schemas/story-storylet.schema.json`

Updated the predicate-discovery surface to enumerate the 6 new predicates.

### 4. Extend `tools/validators/src/schemas/predicate-dsl-grammar.schema.json`

Updated the meta-schema to include the 6 new names and their argument/property constraints.

## Files to Touch

- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify)
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify)
- `tools/validators/src/schemas/story-storylet.schema.json` (modify)
- `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` (modify)
- `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify)
- `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (modify)

## Out of Scope

- STPLAN/STEMO record schemas — covered by `archive/tickets/SPEC47STPSTE-001.md` and `archive/tickets/SPEC47STPSTE-003.md`.
- Per-class STPLAN/STEMO validators — covered by tickets 005/006.
- Tag-grammar parser extension (`midstory-introduction-utils.ts`) — covered by ticket 009.
- SLT records using the new predicates — author-side concern; not implemented in this spec.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -cE '"(plan_active|plan_blocked|any_plan_active|emotion_active|any_emotion_active|emotion_pressure)"' tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` returns ≥6.
2. Each new predicate's positive-case fixture (well-formed predicate object) parses; each negative-case fixture (missing required arg, wrong arg type, out-of-enum value) fails with the named-rule failure.
3. SLT records using the new predicates in preconditions pass SLT-grammar parsability validation.
4. The schema-discovery surface at story-storylet.schema.json exposes the 6 new predicates to schema consumers.

### Invariants

1. The 33 existing individual predicates + 3 combinators (not / all / any) are unchanged in arg-shape or semantics; closed grammar grows from 36 total entries to 42 (33 + 6 = 39 individual predicates + 3 combinators unchanged).
2. The closed-enum discipline holds for filter args (`emotion_active.kind` accepts only the 18 affect_kind values; `emotion_pressure.pressure` accepts only the 18 behavioral_pressure values).
3. Existential `any_*` predicates bind their `alias` to the matched record per the existing `any_*` convention; `bound:<alias>` references in SLT.effects resolve correctly.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modified) — per-predicate positive + negative runtime parser cases for all 6 new predicates, including enum failures, bad aliases, invalid plan refs, unresolved plan refs, and existential alias binding.
2. `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (modified) — extends the existing schema/runtime parity guard so the predicate meta-schema mirrors PRED_TYPES and PREDICATE_ARG_SCHEMAS, with representative rejection checks for STPLAN, affect-kind, and behavioral-pressure constraints.

### Commands

1. `npm --prefix tools/validators run build && npm --prefix tools/validators test` (full validator package tests pass)
2. From `tools/validators`: `node --test dist/tests/predicate-dsl-grammar-parity.test.js dist/tests/rules/rule_storylet_predicate_dsl_parsability.test.js` (focused predicate DSL tests run after build)

## Outcome

Completed on 2026-05-19.

Implemented the six SPEC-47 predicate DSL additions across the runtime grammar, runtime parser, storylet schema-discovery enum, predicate meta-schema, focused runtime parser tests, and schema/runtime parity tests. The change is additive: existing predicate names and arg shapes remain unchanged, while the grammar grows from 36 to 42 entries.

## Verification Result

1. `grep -cE '"(plan_active|plan_blocked|any_plan_active|emotion_active|any_emotion_active|emotion_pressure)"' tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` returned `6`.
2. From `tools/validators`: `npm run build` passed.
3. From `tools/validators`: `node --test dist/tests/predicate-dsl-grammar-parity.test.js dist/tests/rules/rule_storylet_predicate_dsl_parsability.test.js` passed 15 tests.
4. From `tools/validators`: `npm test` passed 602 tests.

Ignored generated artifacts: `tools/validators/dist/` was refreshed by build/test; pre-existing ignored `tools/validators/node_modules/` remains in place.

## Deviations

- The drafted new test path `tools/validators/tests/rules/_shared/predicate-dsl-grammar-stplan-stemo.test.ts` was not created. The existing parser and schema parity tests already own this surface, so they were extended instead.
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` was added to the landed file set because the runtime validator is the surface that emits named-rule failures for malformed predicate args.
- Shared story-state contract prose and operational story-pipeline skill prose remain out of scope for this ticket; they are owned by active tickets 010 and 016 respectively.
