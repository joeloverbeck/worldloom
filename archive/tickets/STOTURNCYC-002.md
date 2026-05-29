# STOTURNCYC-002: alias_bindings guidance contradicts chc_slt_selected_commitment_trace (hard existential aliases must be bound)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — documentation only: `branching-story-turn-cycle` phase-6 reference and `_shared-templates/story-state-contract.md` §5. No validator change.
**Deps**: None

## Problem

At intake, the turn-cycle selected author-pool block SLT-3 ("Offer protection to someone in danger"), whose hard precondition is `any_thread_active` (alias `stranded`) and whose `effects` reference no `bound:<alias>` targets. Following the documented guidance, I emitted `SE.commitment.alias_bindings: {}`. The dry-run failed:

```
chc_slt_selected_commitment_trace.alias_binding_missing:
SE-2 selects SLT-3, but any_thread_active alias stranded has no commitment.alias_bindings entry.
```

The validator (`tools/validators/src/structural/chc-slt-selected-commitment-trace.ts`) requires **every hard existential-predicate alias** to appear in `commitment.alias_bindings`, regardless of whether `effects` reference it; soft aliases are required only when referenced by a downstream `bound:<alias>`. The validator behavior is correct and desirable (it makes the causal selection trace deterministic: which thread satisfied `any_thread_active`). Before this ticket, the documentation told authors to use `{}` when effects carried no bound references, which directly produced this failure for the common case of an author-pool block with a hard `any_*` precondition.

## Assumption Reassessment (2026-05-29)

1. `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` — loop over `existentialPredicates`; if `bound === undefined`, it `continue`s only when `predicate.source === "soft" && !downstreamBoundAliases.has(predicate.alias)`; otherwise it emits `alias_binding_missing`. Therefore **all hard existential aliases are mandatory** in `alias_bindings`, plus soft aliases referenced by `effects`/`exit_options[].likely_effects`. `EXISTENTIAL_CLASS_BY_PREDICATE` enumerates the eleven `any_*` predicates this applies to.
2. `.claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md` previously said to use `alias_bindings: {}` when the selected `SLT` declares no `bound:<alias>` references in its `effects`. That was the misleading instruction corrected by this ticket.
3. `.claude/skills/_shared-templates/story-state-contract.md` §5 (the `alias_bindings` paragraph) — only addresses **soft** preconditions ("Soft preconditions that do not match … do not require a `commitment.alias_bindings` entry unless the alias is referenced by `bound:<alias>` …"). It is silent on hard existential preconditions, leaving the false implication that an unreferenced hard alias also needs no binding.
4. Shared boundary under audit: the `commitment.alias_bindings` contract between (a) the shared story-state contract §5, (b) the turn-cycle phase-6 reference, and (c) the `chc_slt_selected_commitment_trace` validator. The validator is the authoritative end-state; docs must converge onto it.
5. FOUNDATIONS Rule 1 (no floating facts) alignment: binding the gating predicate record to its concrete match is exactly the "name the causal ground" discipline; the validator's requirement is the correct reading and must not be weakened.
6. Adjacent audit: `.claude/skills/branching-story-turn-cycle/SKILL.md` mentions `alias_bindings` in the Phase 6 summary but does not contain the stale `{}` default framing. The owned correction is limited to the phase-6 reference and shared contract §5; gate order, approval timing, submit/validate flow, and fail-closed validator semantics are unchanged.

## Architecture Check

1. Aligning the docs to the validator (rather than relaxing the validator) preserves deterministic, auditable commitment traces — the cleaner end-state. Relaxing the validator would re-admit the non-deterministic "which thread satisfied this block?" ambiguity.
2. No shim: documentation correction only; no schema or code alias path introduced.

## Verification Layers

1. Doc states the rule -> manual review + codebase grep-proof: phase-6 reference and contract §5 explicitly require binding every hard existential alias.
2. Rule matches validator -> codebase grep-proof: the documented rule mirrors `chc-slt-selected-commitment-trace.ts` (hard always; soft iff downstream-bound).
3. Validator alignment -> targeted validator test: the existing `chc_slt_selected_commitment_trace` structural test asserts that hard existential aliases remain mandatory and soft aliases are only mandatory when downstream-bound.

## Landed Changes

### 1. phase-6 reference
Replaced the `{}`-when-no-effects sentence with the rule that `commitment.alias_bindings` MUST contain one entry per **hard** existential precondition alias (`any_*`) bound to its matched active record, plus every **soft** alias referenced by `bound:<alias>` in `effects`/`exit_options[].likely_effects`. The reference now allows `{}` only when the selected SLT has no hard existential predicates and no effect-referenced soft aliases.

### 2. contract §5
Amended the `alias_bindings` paragraph to state the hard-existential requirement explicitly alongside the existing soft-alias rule, citing the `chc_slt_selected_commitment_trace` validator.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify, §5)

## Out of Scope

- Any change to `chc_slt_selected_commitment_trace` behavior.
- Soft-alias rules (already correct in §5).
- `.claude/skills/branching-story-turn-cycle/SKILL.md`; reassessment found no stale `{}` default framing there.

## Acceptance Criteria

### Tests That Must Pass

1. The existing structural validator test continues to pass for the hard-existential rule (`chc_slt_selected_commitment_trace keeps hard existential aliases mandatory`).
2. Grep-proof: phase-6 reference and contract §5 both contain the hard-existential binding requirement.

### Invariants

1. Documentation never instructs `alias_bindings: {}` when the selected SLT has a hard existential precondition.

## Test Plan

### New/Modified Tests

1. None. This is a documentation-only ticket; verification is command-based and the existing `chc_slt_selected_commitment_trace` validator coverage already exists.

### Commands

1. `grep -n "alias_bindings" .claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md .claude/skills/_shared-templates/story-state-contract.md`
2. `npm run build` from `tools/validators/`
3. `node --test dist/tests/structural/chc-slt-selected-commitment-trace.test.js` from `tools/validators/`
4. The grep + targeted validator test are the correct boundary because no code changes; the validator already enforces the rule the docs must now teach.

## Outcome

Completion date: 2026-05-29.

Completed. The turn-cycle phase-6 reference now states that hard existential `any_*` aliases are mandatory in `SE.commitment.alias_bindings` even when no effect references `bound:<alias>`, and that `{}` is only valid when there are no hard existential predicates and no effect-referenced soft aliases. The shared story-state contract §5 now names the same validator-backed hard/soft split.

## Verification Result

1. `grep -n "hard existential\\|alias_bindings\\|effect-referenced soft" .claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md .claude/skills/_shared-templates/story-state-contract.md` — passed; both edited docs contain the hard-existential requirement and phase-6 contains the corrected `{}` boundary.
2. Stale-anchor grep for the old `{}`-when-no-effects sentence over `.claude/skills/branching-story-turn-cycle` and `.claude/skills/_shared-templates/story-state-contract.md` returned no matches, which is the expected proof.
3. `npm run build` from `tools/validators/` — passed.
4. `node --test dist/tests/structural/chc-slt-selected-commitment-trace.test.js` from `tools/validators/` — passed, 15/15 subtests.

## Deviations

1. Reassessment narrowed the drafted `SKILL.md` edit out of scope: the parent skill mentions `alias_bindings` but does not contain the stale `{}` default instruction.
2. The drafted representative `validate-patch-plan` dry-run was replaced with the existing focused structural validator test because no executable story-turn skill dry-run fixture was part of this docs-only ticket. The validator test directly covers the hard-existential and soft-downstream alias rules.
3. `tools/validators/dist/` was a pre-existing ignored generated artifact and was refreshed by `npm run build`; tracked source/test files under `tools/validators/` were not changed.
