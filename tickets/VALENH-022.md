# VALENH-022: Document SLT predicate JSON object shape in story authoring contracts

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — operator-facing shared story contract and story authoring skill prose only. No validators, schemas, hooks, patch-engine ops, or world content.
**Deps**: `archive/tickets/VALENH-021.md` (machine-readable schema-discovery surface now requires `preconditions.hard | soft` predicate objects to carry `pred` from `PRED_TYPES`; this ticket documents that authoring shape for operators)

## Problem

`archive/tickets/VALENH-021.md` tightened the machine-readable SLT JSON Schema so `preconditions.hard[]` and `preconditions.soft[]` reject wrong-shape predicate objects at the `record_schema_compliance` layer. The remaining operator-facing contract still teaches predicates in function-call surface notation only.

Live review evidence:

- `.claude/skills/_shared-templates/story-state-contract.md` §4.4 shows `preconditions.hard: [<predicate>]` and §5 lists predicates as surface forms such as `record_active(<record_id>)`, but it does not show the JSON/YAML object shape a skill must emit.
- `.claude/skills/commitment-block-authoring/SKILL.md` shows the SLT scaffold as `hard: [<predicate per shared contract §5>]` and describes the closed DSL forms, but it does not show the emitted object form.
- `.claude/skills/branching-story-bootstrap/SKILL.md` tells bootstrap authors to use predicate DSL v2 for seed blocks, but it likewise uses surface-form examples only.

After VALENH-021, the machine contract rejects `{"predicate": "record_active", "args": {"target": "STENT-1"}}`; the valid emitted form is `{"pred": "record_active", "record": "STENT-1"}`. Operators should not have to infer that from validator source or from a schema error.

## Assumption Reassessment (2026-05-17)

1. `tools/validators/src/schemas/story-storylet.schema.json` now defines `#/$defs/predicateObject` and routes both `preconditions.hard.items` and `preconditions.soft.items` through it; that schema requires `pred` and leaves predicate-specific args as additional properties.
2. `.claude/skills/_shared-templates/story-state-contract.md` is the canonical story record and predicate DSL contract referenced by story authoring skills. Lines around §4.4 and §5 still use `<predicate>` and function-call predicate rows, without a JSON/YAML object example.
3. Shared boundary under audit: operator-facing story authoring prose must teach the same predicate object shape that `record_schema_compliance` and `rule_storylet_predicate_dsl_parsability.ts` enforce. The schema is now correct; the remaining gap is documentation/skill guidance, not validator code.
4. This is not a HARD-GATE weakening or canon mutation. The intended change is explanatory: it should reduce invalid authoring attempts while preserving every existing validation gate and write discipline.
5. Same-seam stale surfaces are limited to active story authoring contract prose and directly consuming skills that produce SLT records. Historical archived tickets and triage reports may retain older incident evidence.

## Architecture Check

1. The clean fix is to keep §5's compact surface-form grammar as the human-readable predicate catalog, then add an adjacent emitted-object example and mapping rule that every predicate row is authored as an object with `pred` plus flat predicate-specific fields. This avoids duplicating all validator argument rules in skill prose while removing the shape ambiguity.
2. No backwards-compatibility aliasing/shims are introduced. The docs should teach only the canonical `{pred: ...}` object form, not `predicate` / `args` aliases.

## Verification Layers

1. **Shared contract teaches emitted object shape** -> manual review and grep proof over `.claude/skills/_shared-templates/story-state-contract.md`.
2. **SLT-producing skills no longer imply surface-call strings are the emitted YAML shape** -> manual review and grep proof over `.claude/skills/commitment-block-authoring/SKILL.md` and `.claude/skills/branching-story-bootstrap/SKILL.md`.
3. **Validator/source authority remains unchanged** -> codebase grep-proof that no `tools/validators/`, `tools/patch-engine/`, `tools/hooks/`, or world content files changed under this docs-only ticket.

## What to Change

### 1. Add predicate object authoring guidance to the shared contract

In `.claude/skills/_shared-templates/story-state-contract.md` §5, preserve the existing predicate table but add a short emitted-form block before or after the table:

```yaml
preconditions:
  hard:
    - pred: record_active
      record: STENT-1
    - pred: any_belief
      alias: public_belief
      holder_role: witness
      mode: believes
  soft: []
```

State that table rows such as `record_active(<record_id>)` are notation only; actual SLT records emit flat predicate objects with `pred: <predicate_name>` plus predicate-specific fields. Note that predicate names are closed by `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` and schema-discovered by `tools/validators/src/schemas/story-storylet.schema.json`.

### 2. Truth directly consuming SLT-authoring skill prose

Update `.claude/skills/commitment-block-authoring/SKILL.md` and `.claude/skills/branching-story-bootstrap/SKILL.md` only where they could reasonably be read as instructing authors to emit function-call strings. Keep the guidance compact and point back to the shared contract §5 emitted-form block rather than duplicating a full predicate table.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify if live prose still implies function-call emission)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify if live prose still implies function-call emission)

## Out of Scope

- Any validator, JSON Schema, patch-engine, hook, or world-content change.
- Adding aliases for `predicate` / `args` wrong-shape authoring.
- Rewriting every historical archived ticket, report, or triage note that preserves old failure evidence.
- Deep per-predicate argument documentation beyond enough examples to make the object form unambiguous.

## Acceptance Criteria

### Tests That Must Pass

1. Manual review confirms `.claude/skills/_shared-templates/story-state-contract.md` §5 includes a canonical emitted-object example with `pred` and flat predicate-specific fields.
2. A grep over active story authoring skill surfaces confirms no current instructional prose tells operators to emit `predicate` / `args` objects or function-call strings as the YAML shape for `preconditions.hard | soft`.
3. `git diff --check` passes for the docs/skill prose edits.

### Invariants

1. `PRED_TYPES` and per-predicate runtime argument validation remain owned by `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` and `rule_storylet_predicate_dsl_parsability.ts`.
2. `tools/validators/src/schemas/story-storylet.schema.json` remains the machine-readable schema-discovery authority for the outer object shape.
3. Story authoring skills continue to route story `_source/*.yaml` writes through the engine; this ticket does not change write discipline or HARD-GATE behavior.

## Test Plan

### New/Modified Tests

1. None — documentation/skill-prose-only ticket; verification is manual review plus grep and diff hygiene.

### Commands

1. `rg -n 'predicate:|args:|record_active\\(|any_belief\\(|preconditions:' .claude/skills/_shared-templates/story-state-contract.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md` — classify remaining hits as canonical emitted-object examples, notation-only predicate catalog rows, or stale emission guidance.
2. `git diff --check -- .claude/skills/_shared-templates/story-state-contract.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md`
