# STOTURNCYC-002: alias_bindings guidance contradicts chc_slt_selected_commitment_trace (hard existential aliases must be bound)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — documentation only: `branching-story-turn-cycle` phase-6 reference and `_shared-templates/story-state-contract.md` §5. No validator change.
**Deps**: None

## Problem

The turn-cycle selected author-pool block SLT-3 ("Offer protection to someone in danger"), whose hard precondition is `any_thread_active` (alias `stranded`) and whose `effects` reference no `bound:<alias>` targets. Following the documented guidance, I emitted `SE.commitment.alias_bindings: {}`. The dry-run failed:

```
chc_slt_selected_commitment_trace.alias_binding_missing:
SE-2 selects SLT-3, but any_thread_active alias stranded has no commitment.alias_bindings entry.
```

The validator (`tools/validators/src/structural/chc-slt-selected-commitment-trace.ts:123-137`) requires **every hard existential-predicate alias** to appear in `commitment.alias_bindings`, regardless of whether `effects` reference it; soft aliases are required only when referenced by a downstream `bound:<alias>`. The validator behavior is correct and desirable (it makes the causal selection trace deterministic — which thread satisfied `any_thread_active`). The **documentation is wrong**: it tells authors to use `{}` when effects carry no bound references, which directly produces this failure for the common case of an author-pool block with a hard `any_*` precondition.

## Assumption Reassessment (2026-05-29)

1. `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts:123-137` — loop over `existentialPredicates`; if `bound === undefined`, it `continue`s only when `predicate.source === "soft" && !downstreamBoundAliases.has(predicate.alias)`; otherwise it emits `alias_binding_missing`. Therefore **all hard existential aliases are mandatory** in `alias_bindings`, plus soft aliases referenced by `effects`/`exit_options[].likely_effects`. `EXISTENTIAL_CLASS_BY_PREDICATE` (lines 19-31) enumerates the eleven `any_*` predicates this applies to.
2. `.claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md:31` — "Use `alias_bindings: {}` (empty object) when the selected `SLT` declares no `bound:<alias>` references in its `effects`." This is the misleading instruction I followed.
3. `.claude/skills/_shared-templates/story-state-contract.md` §5 (the `alias_bindings` paragraph) — only addresses **soft** preconditions ("Soft preconditions that do not match … do not require a `commitment.alias_bindings` entry unless the alias is referenced by `bound:<alias>` …"). It is silent on hard existential preconditions, leaving the false implication that an unreferenced hard alias also needs no binding.
4. Shared boundary under audit: the `commitment.alias_bindings` contract between (a) the shared story-state contract §5, (b) the turn-cycle phase-6 reference, and (c) the `chc_slt_selected_commitment_trace` validator. The validator is the authoritative end-state; docs must converge onto it.
5. FOUNDATIONS Rule 1 (no floating facts) alignment: binding the gating predicate record to its concrete match is exactly the "name the causal ground" discipline; the validator's requirement is the correct reading and must not be weakened.
6. Adjacent: `SKILL.md` HARD-GATE (b) and the phase-6 prose both echo the `{}` framing; audit those mentions in the same pass.

## Architecture Check

1. Aligning the docs to the validator (rather than relaxing the validator) preserves deterministic, auditable commitment traces — the cleaner end-state. Relaxing the validator would re-admit the non-deterministic "which thread satisfied this block?" ambiguity.
2. No shim: documentation correction only; no schema or code alias path introduced.

## Verification Layers

1. Doc states the rule -> manual review + codebase grep-proof: phase-6 reference and contract §5 explicitly require binding every hard existential alias.
2. Rule matches validator -> codebase grep-proof: the documented rule mirrors `chc-slt-selected-commitment-trace.ts:123-137` (hard always; soft iff downstream-bound).
3. End-to-end -> skill dry-run: a turn-cycle selecting an `any_*`-hard SLT with the corrected guidance passes `validate-patch-plan` first try.

## What to Change

### 1. phase-6 reference
Replace the `{}`-when-no-effects sentence with: `commitment.alias_bindings` MUST contain one entry per **hard** existential precondition alias (`any_*`) bound to its matched active record, plus every **soft** alias referenced by `bound:<alias>` in `effects`/`exit_options[].likely_effects`. Use `{}` only when the selected SLT has no hard existential predicates and no effect-referenced soft aliases.

### 2. contract §5
Amend the `alias_bindings` paragraph to state the hard-existential requirement explicitly alongside the existing soft-alias rule, citing the `chc_slt_selected_commitment_trace` validator.

### 3. SKILL.md
Adjust any HARD-GATE (b)/phase-6 prose that implies `{}` is the default.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify, §5)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify, if the `{}` framing appears)

## Out of Scope

- Any change to `chc_slt_selected_commitment_trace` behavior.
- Soft-alias rules (already correct in §5).

## Acceptance Criteria

### Tests That Must Pass

1. A turn-cycle selecting an author-pool SLT with a hard `any_thread_active` precondition, authored per the corrected docs, passes `validate-patch-plan` with no `alias_binding_missing` verdict.
2. Grep-proof: phase-6 reference and contract §5 both contain the hard-existential binding requirement.

### Invariants

1. Documentation never instructs `alias_bindings: {}` when the selected SLT has a hard existential precondition.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and the validator coverage (`chc_slt_selected_commitment_trace`) already exists.`

### Commands

1. `grep -n "alias_bindings" .claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md .claude/skills/_shared-templates/story-state-contract.md`
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <a turn-cycle envelope selecting an any_*-hard SLT>` returns no `alias_binding_missing`.
3. The grep + a representative dry-run are the correct boundary because no code changes; the validator already enforces the rule the docs must now teach.
