# STVALIDATOR-001: Exempt unmatched soft preconditions from `chc_slt_selected_commitment_trace.alias_binding_missing` unless referenced downstream

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts`, `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts`, and `.claude/skills/_shared-templates/story-state-contract.md` §5 (predicate DSL semantics clarification).
**Deps**: None.

## Problem

At intake, `chc_slt_selected_commitment_trace.alias_binding_missing` failed the patch when a selected SLT's soft precondition had no matching active record and the author therefore omitted the alias from `SE.commitment.alias_bindings`. Soft preconditions are by design optional — the SLT selects whether or not they match — so demanding a binding for an unmatched soft alias either turns soft into hard (an SLT with any unmatched soft becomes unselectable) or forces the author to bind the alias to a semantically wrong record just to pass the validator.

Observed before this ticket at `red-bunny` SE-7: `SLT-42`'s soft precondition `any_relationship_axis(alias=attention_edge, axis=attention, ...)` had no matching active SREL (no attention-axis SREL exists in the bundle on PG-6; active SREL are SREL-2 hostility, SREL-3 obligation, SREL-7 desire). The author bound `attention_edge: SREL-7` purely to pass the validator — but SREL-7's axis is `desire`, not `attention`, so the audit trail now lies about which record the soft predicate matched. The validator paradoxically pushed the author into a worse audit trail than omitting the binding would have.

Critically, `SLT-42` does NOT reference `attention_edge` anywhere in its `effects` (empty arrays) or `exit_options[].likely_effects` (no `bound:<alias>` usage). The alias is purely a selection-time filter; an unmatched soft -> unbound alias causes no downstream dangling reference. The validator hard-fail was unnecessary in this shape and is now exempted.

## Assumption Reassessment (2026-05-27)

1. `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` (`predicatesFor`) combines hard and soft preconditions into a single list before extracting existential bindings through `existentialBindings`. The downstream loop iterates over every existential binding and fails on missing alias_bindings entries without distinguishing hard from soft.
2. The shared contract `.claude/skills/_shared-templates/story-state-contract.md` §5 documents existential predicates as alias-binding at selection time when matched, with `SE.commitment.alias_bindings` recording the exact matched ids. The contract does NOT mandate bindings for unmatched soft predicates — that's a validator-side interpretation that's stricter than the contract's intent.
3. Cross-skill boundary: this ticket audits the `SE.commitment.alias_bindings` field semantics shared between (a) `branching-story-turn-cycle` Phase 2-3 (which selects SLTs and records alias_bindings), (b) `chc_slt_selected_commitment_trace` (which validates them), (c) the SLT schema (`tools/validators/src/schemas/story-storylet.schema.json`, which has `preconditions.hard` and optional `preconditions.soft` but no load-bearing/advisory soft flag), and (d) the SE schema (`tools/validators/src/schemas/story-event.schema.json`, whose `commitment.alias_bindings` field is a map and does not encode match absence).
4. HARD-GATE / validation signal check: `chc_slt_selected_commitment_trace.applies_to` includes pre-apply mode for `create_pg_record`, `create_chc_record`, `create_slt_record`, and `create_se_record`, so `docs/HARD-GATE-DISCIPLINE.md` was read before implementation. This change narrows one false-positive pre-apply failure while preserving fail-closed behavior for hard aliases and downstream `bound:<alias>` references.
5. Adjacent contradiction: `validateEffects` and `validateAliasHygiene` already use the `BOUND_EFFECT` regex (`^bound:([A-Za-z][A-Za-z0-9_-]*)$`) to scan SLT effects for `bound:<alias>` references, but `exit_options[].likely_effects` also participates in the shared contract. The landed scanner covers both effects and exit-option likely effects for downstream alias references.
6. The existing `orphan_alias_binding` warning fires when an alias IS in `commitment.alias_bindings` but the SLT has no matching predicate or bound effect using it — that's the inverse of this ticket. The two checks together should form a complete pair: bind iff matched-or-referenced.
7. Proof-command correction: `tools/validators/package.json` is npm-based (`npm run build`, `npm test`); the drafted `pnpm -F @worldloom/validators ...` commands are not the live package contract. Pre-edit baseline `npm test` from `tools/validators/` passed on 2026-05-27 with 1094 passing tests.
8. Live red-bunny cleanup is excluded from this implementation ticket. Removing `attention_edge: SREL-7` from `worlds/erotica-world/stories/red-bunny/_source/events/SE-7.yaml` is an engine-routed story-bundle `_source` content repair that requires the patch-engine/HARD-GATE flow; this package ticket proves the validator behavior with synthetic fixtures and leaves content normalization to a separate approved repair.

## Architecture Check

1. Cleaner than alternatives. Option A (skip ALL soft preconditions from binding-completeness regardless of downstream references) is simpler but introduces a real footgun: if a future SLT uses `bound:<soft_alias>` in its effects and the soft precondition doesn't match at runtime, the effect references an undefined alias and the engine has no way to recover. Option B (this ticket: exempt soft preconditions only when the alias is unreferenced downstream) preserves the safety net for the case where soft aliases are downstream-load-bearing. Option C (require SLTs to never reference soft aliases in effects) is a stricter contract change that breaks the existing schema's flexibility.
2. No backwards-compatibility aliasing/shims introduced. The fix relaxes a validator that fires too aggressively today; SLTs/events that previously passed continue to pass. The new exemption is additive (more inputs pass).

## Verification Layers

1. Soft precondition with no matching active record and no downstream `bound:<alias>` reference → no `alias_binding_missing` fail -> schema validation + regression test.
2. Soft precondition with no matching active record but with a downstream `bound:<alias>` reference in `effects.create/supersede/close` or `exit_options[].likely_effects` → `alias_binding_missing` STILL fails (preserves dangling-reference safety net) -> regression test.
3. Hard precondition with no binding → `alias_binding_missing` STILL fails (no change in behavior for hard preconditions) -> regression test.
4. `orphan_alias_binding` (the inverse check) still treats `bound:<alias>` in effects and `exit_options[].likely_effects` as legitimate alias usage -> existing and adjusted test coverage in `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts`.
5. A SLT-42-shaped synthetic fixture revalidates without a semantically-wrong `attention_edge` binding -> focused structural regression test. Live red-bunny content cleanup is out of scope for this implementation run because story-bundle `_source` writes are engine-routed.

## Landed Changes

### 1. Distinguish hard vs. soft preconditions when collecting existential bindings (`chc-slt-selected-commitment-trace.ts`)

`predicatesFor` and `existentialBindings` now track whether each predicate came from `preconditions.hard` or `preconditions.soft`. The `PredicateBinding` type now carries `source: "hard" | "soft"`.

### 2. Build a `bound:<alias>` reference set for the selected SLT

The validator now scans `storylet.parsed.effects.create`, `storylet.parsed.effects.supersede`, `storylet.parsed.effects.close`, and `storylet.parsed.exit_options[].likely_effects` for entries matching `BOUND_EFFECT`. Matched alias names are collected into a `Set<string>` of downstream-referenced aliases.

### 3. Exempt unmatched soft aliases that are not downstream-referenced

At the existing `if (bound === undefined)` branch, unmatched soft aliases with no downstream reference are skipped. Hard aliases and downstream-referenced soft aliases still emit `alias_binding_missing`.

### 4. Contract clarification (`.claude/skills/_shared-templates/story-state-contract.md` §5)

The alias-binding semantics paragraph now states that unmatched soft preconditions do not require a `commitment.alias_bindings` entry unless the alias is referenced by `bound:<alias>` in the SLT's `effects` or `exit_options[].likely_effects`.

### 5. Test fixtures

Added focused fixtures to `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts`:

- **A**: SLT with a soft existential predicate whose filter matches no active record; alias is NOT in `commitment.alias_bindings`; alias is NOT used in `effects` or `exit_options[].likely_effects` → validator PASSES (no `alias_binding_missing`).
- **B**: SLT with the same soft existential predicate; alias is NOT in `commitment.alias_bindings`; alias IS used in `effects.create` or `exit_options[].likely_effects` as `bound:<alias>` → validator FAILS with `alias_binding_missing`.
- **C**: SLT with a HARD existential predicate that has no binding → validator FAILS with `alias_binding_missing` (regression — hard behavior unchanged).
- **D**: `exit_options[].likely_effects` `bound:<alias>` references count as alias usage for the inverse `orphan_alias_binding` check.

## Files to Touch

- `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` (modify — refactor predicatesFor / existentialBindings / collectExistentialBindings to track hard vs. soft; add downstream-bound-alias scanner; exempt unmatched soft aliases conditionally)
- `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` (modify — add fixtures A, B, C, D)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §5 soft-precondition semantics clarification)

## Out of Scope

- Changes to the `orphan_alias_binding` warning semantics beyond recognizing `exit_options[].likely_effects` as a legitimate `bound:<alias>` usage site.
- Changes to `alias_binding_wrong_class` or `alias_binding_not_active` (these fire only on bindings that DO exist; they're orthogonal to the soft-precondition exemption).
- Adding new alias-binding completeness modes (no `pending`, `null`, or `unmet` sentinel — the fix is purely "skip the check for advisory-only soft aliases").
- Schema-level distinction between "load-bearing" and "advisory" soft preconditions in `story-storylet.schema.json` — out of scope; the validator infers load-bearing status from `bound:<alias>` usage at validation time.

## Acceptance Criteria

### Tests That Must Pass

1. Fixture A (unmatched soft, no downstream reference, no binding) → validator returns `pass` with no `alias_binding_missing` verdict.
2. Fixture B (unmatched soft, downstream reference, no binding) → validator returns `fail` with `alias_binding_missing` cited on the soft alias.
3. Fixture C (unmatched hard, no binding) → validator returns `fail` with `alias_binding_missing` (existing behavior preserved).
4. Existing fixtures in `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` continue to pass (no regression).
5. `npm test` from `tools/validators/` passes.

### Invariants

1. Hard preconditions ALWAYS require a `commitment.alias_bindings` entry; this never relaxes.
2. Soft preconditions referenced downstream as `bound:<alias>` ALWAYS require a binding; the safety net against dangling references is preserved.
3. Soft preconditions NOT referenced downstream do not require a binding; an unmatched advisory-only soft alias is exempt.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` — fixtures A, B, C, and D above.
2. SLT-42-shaped fixture (`any_relationship_axis(attention_edge, axis=attention)` soft; effects empty; exit_options without bound refs) validates the motivating shape.

### Commands

1. `npm run build` from `tools/validators/` — confirm types compile after PredicateBinding extension.
2. `node --test dist/tests/structural/chc-slt-selected-commitment-trace.test.js` from `tools/validators/` — targeted compiled structural test after build.
3. `npm test` from `tools/validators/` — full validator suite (regression sweep; rebuilds first).
4. Live `red-bunny` SE-7 cleanup is not part of this ticket; it requires a separate patch-engine/HARD-GATE content repair if the user wants the local story bundle normalized after the validator fix.

## Outcome

Implemented. `chc_slt_selected_commitment_trace` now tracks predicate source and exempts missing bindings only for soft existential aliases that are not referenced downstream. The downstream scanner covers `effects.create`, `effects.supersede`, `effects.close`, and `exit_options[].likely_effects`, and `orphan_alias_binding` now recognizes exit-option `bound:<alias>` references as legitimate alias usage.

The shared story-state contract now states the same rule for authors: unmatched soft preconditions do not require `SE.commitment.alias_bindings` entries unless an effect or exit-preview `bound:<alias>` reference depends on the binding.

## Verification Result

1. `npm test` from `tools/validators/` before source edits passed with 1094 passing tests.
2. `npm run build` from `tools/validators/` passed after source/test/template edits.
3. `node --test dist/tests/structural/chc-slt-selected-commitment-trace.test.js` from `tools/validators/` passed with 15 passing focused tests.
4. `npm test` from `tools/validators/` passed after implementation with 1098 passing tests.

## Deviations

1. Drafted `pnpm -F @worldloom/validators ...` proof commands were replaced with the live npm package commands from `tools/validators/package.json`.
2. Live `red-bunny` SE-7 content normalization was not performed. That would mutate story-bundle `_source` content and must go through a separate patch-engine/HARD-GATE repair; this ticket proves the validator behavior with synthetic fixtures instead.
