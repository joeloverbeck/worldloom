# SCAUD-004: Align prose-attach validator and PG hash guidance

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-prose-attach/SKILL.md` and shared story-state contract docs
**Deps**: archive/tickets/VALENH-023.md

## Problem

`VALENH-023` added the validator-side `prose_receipt_schema_compliance` rule for story prose receipt YAML. The prose-attach skill and shared story-state contract still carry adjacent guidance that predates that validator surface: prose-attach says the shared contract receipt schema is "already in place" without distinguishing the new structural validator, and its PG hash guidance depends on shared §4.2a wording that currently names the canonical hash CLI only for PG-authoring skills.

This creates review drift for future prose-attach work. Operators can miss that prose receipts now have a structural validation surface, and prose-attach implementers do not have a local, explicit instruction to recompute or verify `computed_state_hash` through the canonical PG hash path.

## Assumption Reassessment (2026-05-17)

1. `.claude/skills/branching-story-prose-attach/SKILL.md` references the receipt schema as already present and instructs prose attachment to compute `computed_state_hash`, but it does not name the new `prose_receipt_schema_compliance` validator surface.
2. `.claude/skills/_shared-templates/story-state-contract.md` §4.2a names the canonical `compute-pg-hashes` CLI for `branching-story-bootstrap` and `branching-story-turn-cycle`, while prose-attach consumes the same PG state-hash contract when it writes prose receipts.
3. The shared boundary under audit is the story-state/prose-receipt contract across the prose-attach skill, the shared story-state template, and the validator inventory created by `VALENH-023`.
4. FOUNDATIONS still owns canon safety and append-only canon discipline; this ticket is workflow-documentation cleanup only and must not mutate world canon.
5. The adjacent drift is not required to validate the `VALENH-023` implementation, so it belongs in this follow-up instead of widening the archived validator ticket.

## Architecture Check

1. Updating prose-attach and the shared contract keeps the receipt schema validator and PG hash computation guidance discoverable at the workflow boundary where receipts are produced.
2. No backwards-compatibility aliases, alternate hash algorithms, or duplicate validator names should be introduced.

## Verification Layers

1. Validator guidance is discoverable -> grep proof for `prose_receipt_schema_compliance` in prose-attach or shared story-state guidance.
2. PG hash guidance is canonical -> grep/manual review proof that prose-attach points at the same `compute-pg-hashes` / canonical JSON helper path as other PG-writing story workflows.
3. FOUNDATIONS alignment is preserved -> manual review that the edits do not introduce canon mutation shortcuts or weaken hard-gate language.

## What to Change

### 1. Prose-attach guardrails

Update `.claude/skills/branching-story-prose-attach/SKILL.md` so the prose receipt schema note reflects both the shared contract and the validator-side `prose_receipt_schema_compliance` rule. If the skill should run a receipt validation smoke after writing receipts, name the exact command shape already supported by `tools/validators`.

### 2. PG hash contract guidance

Clarify either the prose-attach skill or `.claude/skills/_shared-templates/story-state-contract.md` so prose attachment reuses the canonical PG hash computation path instead of implying an independent hash implementation.

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify, if the shared contract is the cleaner home)

## Out of Scope

- No changes to validator package code or schema behavior.
- No changes to world content.
- No new receipt fields or PG state fields.
- No weakening of hard gates or canon-write ordering.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "prose_receipt_schema_compliance|compute-pg-hashes|computed_state_hash" .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md`
2. `git diff --check -- .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md`
3. Manual review confirms the edits are workflow documentation only and do not change canon mutation permissions.

### Invariants

1. Prose receipts continue to use the shared §4.6 shape and the `prose_receipt_schema_compliance` validator name.
2. `computed_state_hash` guidance points to the canonical PG hash computation path, not a prose-attach-specific hashing variant.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `rg -n "prose_receipt_schema_compliance|compute-pg-hashes|computed_state_hash" .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md`
2. `git diff --check -- .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md`
3. No package test command is required because this ticket is limited to workflow documentation.
