# SPEC19SCECOM-004: Truth stop-predicate ownership comments in SLT v2 schema

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — updates `storylet-pool-authoring` schema-template comments only. No runtime, validator, or canonical-vocabulary implementation changes.
**Deps**: `archive/tickets/SPEC19SCECOM-003.md` (documents the stop-predicate DSL grammar text); SPEC-22 Track 2 / Track 3 still owns validator + canonical-vocabulary implementation.

## Problem

Post-ticket review of `archive/tickets/SPEC19SCECOM-003.md` found one stale same-family handoff comment in `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`:

```yaml
predicate: <stop_predicate enum>     # closed enum — see SPEC-21 predicate-DSL extension
```

That ownership pointer is now misleading. SPEC-19 / `archive/tickets/SPEC19SCECOM-003.md` owns the schema-text grammar in `templates/predicate-dsl.md`; SPEC-22 owns `stop_predicate` canonical-vocabulary implementation and `stop_policy_parsability`; SPEC-21 owns the authoring-skill operational rewrite. The SLT v2 schema template should point readers to those actual owners instead of implying SPEC-21 owns the predicate DSL extension itself.

## Assumption Reassessment (2026-05-07)

1. Live template evidence: `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` still says `predicate: <stop_predicate enum>     # closed enum — see SPEC-21 predicate-DSL extension` in the `stop_policy.normal_exits[]` skeleton.
2. Current grammar authority: `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` now contains `## Stop Predicates (third tier — v2 SLT arc.stop_policy)` with 11 normal-exit predicates, 8 interrupt-before predicates, and safety-valve thresholds, landed by `archive/tickets/SPEC19SCECOM-003.md`.
3. Cross-artifact boundary under audit: `storylet-record.yaml` names the `stop_predicate` schema field; `predicate-dsl.md` documents allowed predicate forms; `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` owns `stop_policy_parsability` and canonical-vocabulary implementation; `specs/SPEC-21-scene-commitment-arc-authoring.md` owns authoring behavior, not the grammar-text owner.
4. FOUNDATIONS principle under audit: Story Bundles Rule 1 and Rule 7 rely on deterministic schema/grammar handoffs. A stale ownership pointer does not weaken enforcement by itself, but it can send implementers to the wrong spec when wiring the closed stop-predicate grammar and Mystery Reserve firewall.
5. Mismatch + correction: replace the SPEC-21-only comment with a precise pointer to `templates/predicate-dsl.md` for grammar text and SPEC-22 for enum/validator implementation. Do not change the schema shape or introduce aliases.

## Architecture Check

1. This is the smallest clean fix: update the misleading schema-template comment where the stale handoff appears, without touching runtime, validators, or authoring behavior.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Stale SPEC-21-only pointer removed -> codebase grep-proof over `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`.
2. Correct grammar owner named -> codebase grep-proof that the comment points to `templates/predicate-dsl.md` or `SPEC-19`.
3. Downstream implementation owner remains deferred -> manual review that the comment still names SPEC-22 for enum/validator implementation and does not claim runtime enforcement has landed.

## What to Change

### 1. Update the stop_policy predicate comment

In `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`, replace the stale `SPEC-21 predicate-DSL extension` comment with wording that names:

- `templates/predicate-dsl.md` / SPEC-19 as the grammar-text authority.
- SPEC-22 as the owner of the `stop_predicate` enum and `stop_policy_parsability` validator implementation.

Keep the YAML skeleton shape unchanged.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (modify)

## Out of Scope

- Editing `templates/predicate-dsl.md`; SPEC19SCECOM-003 already landed the grammar text.
- Implementing TypeScript `stop_predicate` enum values.
- Implementing `stop_policy_parsability`.
- Rewriting `storylet-pool-authoring` operational phases for SPEC-21.

## Acceptance Criteria

### Tests That Must Pass

1. `! grep -n "SPEC-21 predicate-DSL extension" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`
2. `grep -n "templates/predicate-dsl.md\\|SPEC-19\\|SPEC-22" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`
3. Manual review confirms only comments changed and the `stop_policy` YAML skeleton remains structurally identical.

### Invariants

1. `stop_policy.normal_exits[].predicate` and `stop_policy.interrupt_before[].predicate` remain closed enum slots.
2. The template points to the correct grammar-text and implementation owners without implying that SPEC-21 already implemented validation.

## Test Plan

### New/Modified Tests

1. `None — documentation/comment-only ticket; verification is grep-based against the modified schema template plus manual review of the unchanged YAML skeleton.`

### Commands

1. `! grep -n "SPEC-21 predicate-DSL extension" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`
2. `grep -n "templates/predicate-dsl.md\\|SPEC-19\\|SPEC-22" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`
3. `git diff --check -- .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml tickets/SPEC19SCECOM-004.md`
