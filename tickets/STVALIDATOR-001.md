# STVALIDATOR-001: Exempt unmatched soft preconditions from `chc_slt_selected_commitment_trace.alias_binding_missing` unless referenced downstream

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts`, `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts`, and `.claude/skills/_shared-templates/story-state-contract.md` §5 (predicate DSL semantics clarification).
**Deps**: None.

## Problem

`chc_slt_selected_commitment_trace.alias_binding_missing` fails the patch when a selected SLT's soft precondition has no matching active record and the author therefore omits the alias from `SE.commitment.alias_bindings`. Soft preconditions are by design optional — the SLT selects whether or not they match — so demanding a binding for an unmatched soft alias either turns soft into hard (an SLT with any unmatched soft becomes unselectable) or forces the author to bind the alias to a semantically wrong record just to pass the validator.

Observed at `red-bunny` SE-7: `SLT-42`'s soft precondition `any_relationship_axis(alias=attention_edge, axis=attention, ...)` had no matching active SREL (no attention-axis SREL exists in the bundle on PG-6; active SREL are SREL-2 hostility, SREL-3 obligation, SREL-7 desire). The author bound `attention_edge: SREL-7` purely to pass the validator — but SREL-7's axis is `desire`, not `attention`, so the audit trail now lies about which record the soft predicate matched. The validator paradoxically pushed the author into a worse audit trail than omitting the binding would have.

Critically, `SLT-42` does NOT reference `attention_edge` anywhere in its `effects` (empty arrays) or `exit_options[].likely_effects` (no `bound:<alias>` usage). The alias is purely a selection-time filter; an unmatched soft → unbound alias would cause no downstream dangling reference. The validator's hard-fail is unnecessary in this shape.

## Assumption Reassessment (2026-05-27)

1. `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts:306-308` (`predicatesFor`) combines hard and soft preconditions into a single list before extracting existential bindings at lines 100 and 319-325 (`existentialBindings`). The downstream loop at lines 114-145 iterates over every existential binding and fails on missing alias_bindings entries without distinguishing hard from soft.
2. The shared contract `.claude/skills/_shared-templates/story-state-contract.md` §5 documents existential predicates as alias-binding at selection time when matched, with `SE.commitment.alias_bindings` recording the exact matched ids. The contract does NOT mandate bindings for unmatched soft predicates — that's a validator-side interpretation that's stricter than the contract's intent.
3. Cross-skill boundary: this ticket audits the `SE.commitment.alias_bindings` field semantics shared between (a) `branching-story-turn-cycle` Phase 2-3 (which selects SLTs and records alias_bindings), (b) `chc_slt_selected_commitment_trace` (which validates them), (c) the SLT schema itself (`tools/validators/src/schemas/story-storylet.schema.json` — confirm whether it distinguishes soft-precondition alias usage), (d) the SE schema (`tools/validators/src/schemas/story-event.schema.json` alias_bindings field).
4. Adjacent contradiction: `validateEffects` and `validateAliasHygiene` (called at lines 147-149) already use the `BOUND_EFFECT` regex at line 16 (`^bound:([A-Za-z][A-Za-z0-9_-]*)$`) to scan SLT effects for `bound:<alias>` references. The machinery to detect "is this alias referenced downstream" already exists in this same file; the fix can reuse it without adding new infrastructure.
5. The existing `orphan_alias_binding` warning at line 260 fires when an alias IS in `commitment.alias_bindings` but the SLT has no matching predicate or bound effect using it — that's the inverse of this ticket. The two checks together should form a complete pair: bind iff matched-or-referenced.

## Architecture Check

1. Cleaner than alternatives. Option A (skip ALL soft preconditions from binding-completeness regardless of downstream references) is simpler but introduces a real footgun: if a future SLT uses `bound:<soft_alias>` in its effects and the soft precondition doesn't match at runtime, the effect references an undefined alias and the engine has no way to recover. Option B (this ticket: exempt soft preconditions only when the alias is unreferenced downstream) preserves the safety net for the case where soft aliases are downstream-load-bearing. Option C (require SLTs to never reference soft aliases in effects) is a stricter contract change that breaks the existing schema's flexibility.
2. No backwards-compatibility aliasing/shims introduced. The fix relaxes a validator that fires too aggressively today; SLTs/events that previously passed continue to pass. The new exemption is additive (more inputs pass).

## Verification Layers

1. Soft precondition with no matching active record and no downstream `bound:<alias>` reference → no `alias_binding_missing` fail -> schema validation + regression test.
2. Soft precondition with no matching active record but with a downstream `bound:<alias>` reference in `effects.create/supersede/close` or `exit_options[].likely_effects` → `alias_binding_missing` STILL fails (preserves dangling-reference safety net) -> regression test.
3. Hard precondition with no binding → `alias_binding_missing` STILL fails (no change in behavior for hard preconditions) -> regression test.
4. `orphan_alias_binding` (the inverse check) is unaffected by this change -> existing test coverage in `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts`.
5. SE-7 from `red-bunny` revalidates without the `attention_edge: SREL-7` semantically-wrong binding (i.e., when `attention_edge` is removed from `commitment.alias_bindings`, validation still passes) -> skill dry-run against the live `red-bunny` bundle after re-saving SE-7 with the cleaned binding.

## What to Change

### 1. Distinguish hard vs. soft preconditions when collecting existential bindings (`chc-slt-selected-commitment-trace.ts`)

Refactor `predicatesFor` (line 306) and `existentialBindings` (line 319) to track whether each predicate came from `preconditions.hard` or `preconditions.soft`. The `PredicateBinding` type (declared elsewhere in the file) gains a `source: "hard" | "soft"` field.

### 2. Build a `bound:<alias>` reference set for the selected SLT

Before the alias-binding loop at line 114, scan `storylet.parsed.effects.create`, `storylet.parsed.effects.supersede`, `storylet.parsed.effects.close`, and `storylet.parsed.exit_options[].likely_effects` for entries matching `BOUND_EFFECT`. Collect the matched alias names into a `Set<string>` of "downstream-referenced aliases."

### 3. Exempt unmatched soft aliases that are not downstream-referenced (line 114-124)

At the existing `if (bound === undefined)` branch:

```typescript
if (bound === undefined) {
  // Hard preconditions always require a binding entry.
  // Soft preconditions require a binding only when the alias is referenced
  // downstream as `bound:<alias>` in effects or exit_options.likely_effects;
  // an unmatched soft precondition that nothing references is advisory-only
  // and binding it would force a semantically-incorrect entry.
  if (predicate.source === "soft" && !downstreamBoundAliases.has(predicate.alias)) {
    continue;
  }
  verdicts.push(eventVerdict(event, "fail", "alias_binding_missing", ...));
  continue;
}
```

### 4. Contract clarification (`.claude/skills/_shared-templates/story-state-contract.md` §5)

Add an explicit sentence after the existing alias-binding semantics paragraph (around the "An existential predicate binds its alias to the matched active record during block selection" sentence): "Soft preconditions that do not match any active record do not require a `commitment.alias_bindings` entry, unless the alias is referenced by `bound:<alias>` in the SLT's `effects` or `exit_options[].likely_effects` — in that case, the binding is required to prevent a dangling downstream reference."

### 5. Test fixtures

Add three test fixtures to `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts`:

- **A**: SLT with a soft existential predicate whose filter matches no active record; alias is NOT in `commitment.alias_bindings`; alias is NOT used in `effects` or `exit_options[].likely_effects` → validator PASSES (no `alias_binding_missing`).
- **B**: SLT with the same soft existential predicate; alias is NOT in `commitment.alias_bindings`; alias IS used in `effects.create` as `bound:<alias>` → validator FAILS with `alias_binding_missing`.
- **C**: SLT with a HARD existential predicate that has no binding → validator FAILS with `alias_binding_missing` (regression — hard behavior unchanged).

## Files to Touch

- `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` (modify — refactor predicatesFor / existentialBindings / collectExistentialBindings to track hard vs. soft; add downstream-bound-alias scanner; exempt unmatched soft aliases conditionally)
- `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` (modify — add fixtures A, B, C)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §5 soft-precondition semantics clarification)

## Out of Scope

- Changes to the `orphan_alias_binding` warning logic (the inverse check stays as-is).
- Changes to `alias_binding_wrong_class` or `alias_binding_not_active` (these fire only on bindings that DO exist; they're orthogonal to the soft-precondition exemption).
- Adding new alias-binding completeness modes (no `pending`, `null`, or `unmet` sentinel — the fix is purely "skip the check for advisory-only soft aliases").
- Schema-level distinction between "load-bearing" and "advisory" soft preconditions in `story-storylet.schema.json` — out of scope; the validator infers load-bearing status from `bound:<alias>` usage at validation time.

## Acceptance Criteria

### Tests That Must Pass

1. Fixture A (unmatched soft, no downstream reference, no binding) → validator returns `pass` with no `alias_binding_missing` verdict.
2. Fixture B (unmatched soft, downstream reference, no binding) → validator returns `fail` with `alias_binding_missing` cited on the soft alias.
3. Fixture C (unmatched hard, no binding) → validator returns `fail` with `alias_binding_missing` (existing behavior preserved).
4. Existing fixtures in `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` continue to pass (no regression).
5. `pnpm -F @worldloom/validators test` passes.

### Invariants

1. Hard preconditions ALWAYS require a `commitment.alias_bindings` entry; this never relaxes.
2. Soft preconditions referenced downstream as `bound:<alias>` ALWAYS require a binding; the safety net against dangling references is preserved.
3. Soft preconditions NOT referenced downstream do not require a binding; an unmatched advisory-only soft alias is exempt.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` — fixtures A, B, C above.
2. Optionally add a SLT-42-shaped fixture (`any_relationship_axis(attention_edge, axis=attention)` soft; effects empty; exit_options without bound: refs) to validate the specific shape that motivated this ticket.

### Commands

1. `pnpm -F @worldloom/validators build` — confirm types compile after PredicateBinding extension.
2. `pnpm -F @worldloom/validators test -- --filter chc-slt-selected-commitment-trace` — targeted.
3. `pnpm -F @worldloom/validators test` — full validator suite (regression sweep).
4. After landing, manually edit `red-bunny` SE-7's `commitment.alias_bindings` to remove `attention_edge: SREL-7` (the semantically-wrong workaround); re-run `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --world-root . <envelope-wrapping-cleaned-SE-7>` — confirm validation still passes.
