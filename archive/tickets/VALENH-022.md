# VALENH-022: Document SLT predicate JSON object shape in story authoring contracts

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — operator-facing shared story contract and story authoring skill prose only. No validators, schemas, hooks, patch-engine ops, or world content.
**Deps**: `archive/tickets/VALENH-021.md` (machine-readable schema-discovery surface now requires `preconditions.hard | soft` predicate objects to carry `pred` from `PRED_TYPES`; this ticket documents that authoring shape for operators)

## Problem

At intake, `archive/tickets/VALENH-021.md` had tightened the machine-readable SLT JSON Schema so `preconditions.hard[]` and `preconditions.soft[]` rejected wrong-shape predicate objects at the `record_schema_compliance` layer, but the remaining operator-facing contract still taught predicates in function-call surface notation only.

Historical live review evidence:

- `.claude/skills/_shared-templates/story-state-contract.md` §4.4 shows `preconditions.hard: [<predicate>]` and §5 lists predicates as surface forms such as `record_active(<record_id>)`, but it does not show the JSON/YAML object shape a skill must emit.
- `.claude/skills/commitment-block-authoring/SKILL.md` shows the SLT scaffold as `hard: [<predicate per shared contract §5>]` and describes the closed DSL forms, but it does not show the emitted object form.
- `.claude/skills/branching-story-bootstrap/SKILL.md` tells bootstrap authors to use predicate DSL v2 for seed blocks, but it likewise uses surface-form examples only.

After VALENH-021, the machine contract rejects `{"predicate": "record_active", "args": {"target": "STENT-1"}}`; the valid emitted form is `{"pred": "record_active", "record": "STENT-1"}`. This ticket documents that object form in the shared story contract and in the two directly consuming SLT-authoring skills.

## Assumption Reassessment (2026-05-17)

1. `tools/validators/src/schemas/story-storylet.schema.json` now defines `#/$defs/predicateObject` and routes both `preconditions.hard.items` and `preconditions.soft.items` through it; that schema requires `pred` and leaves predicate-specific args as additional properties.
2. `.claude/skills/_shared-templates/story-state-contract.md` is the canonical story record and predicate DSL contract referenced by story authoring skills. Lines around §4.4 and §5 still use `<predicate>` and function-call predicate rows, without a JSON/YAML object example.
3. Shared boundary under audit: operator-facing story authoring prose must teach the same predicate object shape that `record_schema_compliance` and `rule_storylet_predicate_dsl_parsability.ts` enforce. The schema is now correct; the remaining gap is documentation/skill guidance, not validator code.
4. This is not a HARD-GATE weakening or canon mutation. The intended change is explanatory: it should reduce invalid authoring attempts while preserving every existing validation gate and write discipline.
5. Same-seam stale surfaces are limited to active story authoring contract prose and directly consuming skills that produce SLT records. Historical archived tickets and triage reports may retain older incident evidence.
6. Invocation path reassessment: the user supplied `tickets/VALEN-022.md`, which does not exist in this repo; the exact same-repo live path at implementation time was `tickets/VALENH-022.md`.

## Architecture Check

1. The clean fix is to keep §5's compact surface-form grammar as the human-readable predicate catalog, then add an adjacent emitted-object example and mapping rule that every predicate row is authored as an object with `pred` plus flat predicate-specific fields. This avoids duplicating all validator argument rules in skill prose while removing the shape ambiguity.
2. No backwards-compatibility aliasing/shims are introduced. The docs teach only the canonical `{pred: ...}` object form, not `predicate` / `args` aliases.

## Verification Layers

1. **Shared contract teaches emitted object shape** -> manual review and grep proof over `.claude/skills/_shared-templates/story-state-contract.md`.
2. **SLT-producing skills no longer imply surface-call strings are the emitted YAML shape** -> manual review and grep proof over `.claude/skills/commitment-block-authoring/SKILL.md` and `.claude/skills/branching-story-bootstrap/SKILL.md`.
3. **Validator/source authority remains unchanged** -> codebase grep-proof that no `tools/validators/`, `tools/patch-engine/`, `tools/hooks/`, or world content files changed under this docs-only ticket.

## Landed Changes

### 1. Add predicate object authoring guidance to the shared contract

`.claude/skills/_shared-templates/story-state-contract.md` now labels `preconditions.hard | soft` entries as predicate objects in §4.4 and adds this emitted-form block to §5 before the compact predicate table:

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

The shared contract states that table rows such as `record_active(<record_id>)` are notation only; actual SLT records emit flat predicate objects with `pred: <predicate_name>` plus predicate-specific fields. It also names `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` as the predicate-name authority and `tools/validators/src/schemas/story-storylet.schema.json` as the schema-discovery surface.

### 2. Truth directly consuming SLT-authoring skill prose

`.claude/skills/commitment-block-authoring/SKILL.md` and `.claude/skills/branching-story-bootstrap/SKILL.md` now state that function-call predicate forms are notation only and that emitted `SLT.preconditions.hard | soft` entries are flat predicate objects per shared contract §5. Commitment-block-authoring's SLT scaffold now names `<predicate object per shared contract §5>`.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `archive/tickets/VALENH-022.md` (modify — reassessment, closeout truthing, and post-review archive-path handoff)

## Out of Scope

- Any validator, JSON Schema, patch-engine, hook, or world-content change.
- Adding aliases for `predicate` / `args` wrong-shape authoring.
- Rewriting every historical archived ticket, report, or triage note that preserves old failure evidence.
- Deep per-predicate argument documentation beyond enough examples to make the object form unambiguous.

## Acceptance Criteria

### Tests That Must Pass

1. Manual review confirms `.claude/skills/_shared-templates/story-state-contract.md` §5 includes a canonical emitted-object example with `pred` and flat predicate-specific fields.
2. A grep over active story authoring skill surfaces confirms no current instructional prose tells operators to emit `predicate` / `args` objects or function-call strings as the YAML shape for `preconditions.hard | soft`.
3. `git diff --check` passes for the docs/skill prose and ticket edits.

### Invariants

1. `PRED_TYPES` and per-predicate runtime argument validation remain owned by `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` and `rule_storylet_predicate_dsl_parsability.ts`.
2. `tools/validators/src/schemas/story-storylet.schema.json` remains the machine-readable schema-discovery authority for the outer object shape.
3. Story authoring skills continue to route story `_source/*.yaml` writes through the engine; this ticket does not change write discipline or HARD-GATE behavior.

## Test Plan

### New/Modified Tests

1. None — documentation/skill-prose-only ticket; verification is manual review plus grep and diff hygiene.

### Commands

1. `rg -n 'predicate:|args:|record_active\\(|any_belief\\(|preconditions:' .claude/skills/_shared-templates/story-state-contract.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md` — classify remaining hits as canonical emitted-object examples, notation-only predicate catalog rows, or stale emission guidance.
2. `git diff --name-only -- tools/validators tools/patch-engine tools/hooks worlds` — expect no output for this docs-only ticket.
3. `git diff --check -- .claude/skills/_shared-templates/story-state-contract.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md archive/tickets/VALENH-022.md`

## Outcome

Completed. The shared story-state contract now teaches the emitted SLT predicate object shape directly in §5, including a canonical YAML example using `pred` and flat predicate-specific fields. The contract also clarifies that function-call predicate rows are compact human notation, not the YAML shape to emit.

The two directly consuming SLT-authoring skills now point operators back to that emitted-object contract and no longer leave their function-call examples ambiguous as output shape.

## Verification Result

1. Manual review: `.claude/skills/_shared-templates/story-state-contract.md` §4.4 and §5 now identify predicate objects and show the canonical emitted form with `pred: record_active` / `pred: any_belief`.
2. Manual review: `.claude/skills/commitment-block-authoring/SKILL.md` and `.claude/skills/branching-story-bootstrap/SKILL.md` now state that function-call forms are notation only and emitted preconditions are flat predicate objects per shared contract §5.
3. `rg -n 'predicate:|args:|record_active\\(|any_belief\\(|preconditions:' .claude/skills/_shared-templates/story-state-contract.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md` — remaining hits are the canonical emitted-object block, notation-only predicate catalog/examples, and precondition scaffolds that now say predicate object where they are output-shaped.
4. `git diff --name-only -- tools/validators tools/patch-engine tools/hooks worlds` — no output; no validator, patch-engine, hook, or world-content files changed.
5. `git diff --check -- .claude/skills/_shared-templates/story-state-contract.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md archive/tickets/VALENH-022.md` — passed after archival.

## Deviations

- The requested path was `tickets/VALEN-022.md`; the resolved live ticket path in this repo was `tickets/VALENH-022.md`, now archived at `archive/tickets/VALENH-022.md`.
- No executable skill dry-run was performed. This is a docs/skill-prose contract ticket, so accepted proof is manual review, stale-anchor grep classification, no-source-change proof, and diff hygiene.
