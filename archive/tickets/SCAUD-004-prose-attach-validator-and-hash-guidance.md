# SCAUD-004: Align prose-attach validator and PG hash guidance

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-prose-attach/SKILL.md` and shared story-state contract docs
**Deps**: archive/tickets/VALENH-023.md

## Problem

`VALENH-023` added the validator-side `prose_receipt_schema_compliance` rule for story prose receipt YAML. At intake, the prose-attach skill and shared story-state contract still carried adjacent guidance that predated that validator surface: prose-attach said the shared contract receipt schema was "already in place" without distinguishing the new structural validator, while the PG hash guidance was already partially repaired in shared §4.2a to include prose-attach as a PG-verifying consumer.

This created review drift for future prose-attach work. Operators could miss that prose receipts now have a structural validation surface. The remaining active delta is to make prose-attach and the shared receipt schema point at the validator surface while preserving the already-landed canonical PG hash path for `computed_state_hash`.

## Assumption Reassessment (2026-05-17)

1. At intake, `.claude/skills/branching-story-prose-attach/SKILL.md` referenced the receipt schema as already present and instructed prose attachment to compute `computed_state_hash` through the canonical CLI, but it did not name the new `prose_receipt_schema_compliance` validator surface.
2. `.claude/skills/_shared-templates/story-state-contract.md` §4.2a already names the canonical `compute-pg-hashes` CLI for both PG-authoring skills and PG-verifying `branching-story-prose-attach` `computed_state_hash` recomputation. That hash-guidance portion is pre-existing landed surface in the live repo, so this run preserves it rather than re-implementing it.
3. The shared boundary under audit is the story-state/prose-receipt contract across the prose-attach skill, the shared story-state template, and the validator inventory created by `VALENH-023`.
4. FOUNDATIONS still owns canon safety and append-only canon discipline; this ticket is workflow-documentation cleanup only and must not mutate world canon.
5. The adjacent drift is not required to validate the `VALENH-023` implementation, so it belongs in this follow-up instead of widening the archived validator ticket.
6. `prose_receipt_schema_compliance` is a structural validator over direct-write `pages-prose-receipts/PG-*.yaml` artifacts. This ticket updates workflow documentation only; it does not change validator code, pre-apply behavior, HARD-GATE approval timing, or canon mutation permissions.

## Architecture Check

1. Updating prose-attach and the shared contract keeps the receipt schema validator and PG hash computation guidance discoverable at the workflow boundary where receipts are produced.
2. No backwards-compatibility aliases, alternate hash algorithms, or duplicate validator names were introduced.

## Verification Layers

1. Validator guidance is discoverable -> grep proof for `prose_receipt_schema_compliance` in prose-attach or shared story-state guidance.
2. PG hash guidance is canonical -> grep/manual review proof that prose-attach points at the same `compute-pg-hashes` / canonical JSON helper path as other PG-writing story workflows.
3. FOUNDATIONS alignment is preserved -> manual review that the edits do not introduce canon mutation shortcuts or weaken hard-gate language.

## Landed Changes

### 1. Prose-attach guardrails

Updated `.claude/skills/branching-story-prose-attach/SKILL.md` so the receipt prerequisite, Record Schemas section, and guardrails name both the shared §4.6 contract and the validator-side `prose_receipt_schema_compliance` rule. The skill now names the receipt-specific compiled CLI smoke shape supported by `tools/validators` after a receipt exists.

### 2. PG hash contract guidance

Preserved the already-live `.claude/skills/_shared-templates/story-state-contract.md` §4.2a canonical hash guidance, which already identifies prose-attach as a PG-verifying consumer of `compute-pg-hashes`. Added §4.6 prose-receipt text that links the canonical receipt schema to `prose_receipt_schema_compliance` and records the receipt-specific compiled validator CLI smoke.

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `archive/tickets/SCAUD-004-prose-attach-validator-and-hash-guidance.md` (modify — reassessment, closeout, and archival path truthing)

## Out of Scope

- No changes to validator package code or schema behavior.
- No changes to world content.
- No new receipt fields or PG state fields.
- No weakening of hard gates or canon-write ordering.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "prose_receipt_schema_compliance|compute-pg-hashes|computed_state_hash" .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md`
2. `git diff --check -- .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md archive/tickets/SCAUD-004-prose-attach-validator-and-hash-guidance.md`
3. Manual review confirms the edits are workflow documentation only and do not change canon mutation permissions.

### Invariants

1. Prose receipts continue to use the shared §4.6 shape and the `prose_receipt_schema_compliance` validator name.
2. `computed_state_hash` guidance points to the canonical PG hash computation path, not a prose-attach-specific hashing variant.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing validator/package coverage is named in Assumption Reassessment.`

### Commands

1. `rg -n "prose_receipt_schema_compliance|compute-pg-hashes|computed_state_hash" .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md`
2. `git diff --check -- .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md archive/tickets/SCAUD-004-prose-attach-validator-and-hash-guidance.md`
3. No package test command is required because this ticket is limited to workflow documentation.

## Outcome

Completed. Prose-attach now explicitly points receipt authors/readers at the shared §4.6 contract and its `prose_receipt_schema_compliance` structural validator mirror. The shared story-state contract's §4.6 prose-receipt section now also names the validator surface and the receipt-specific compiled `world-validate --structural --file ... --json` smoke.

The PG hash guidance did not need a new implementation change: shared §4.2a and prose-attach Phase 1 already require the canonical `compute-pg-hashes` path for `computed_state_hash` recomputation. This ticket preserved that live contract and recorded it as pre-existing landed surface.

## Verification Result

Passed on 2026-05-17:

1. `rg -n "prose_receipt_schema_compliance|compute-pg-hashes|computed_state_hash" .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md` returned the expected validator, hash CLI, and `computed_state_hash` references in the skill and shared contract.
2. `git diff --check -- .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md archive/tickets/SCAUD-004-prose-attach-validator-and-hash-guidance.md` passed.
3. Manual review confirmed the edits are workflow documentation only: no validator code, world content, HARD-GATE approval timing, patch-plan behavior, or canon mutation permissions changed.

## Deviations

- The drafted hash-guidance gap was already repaired in the live shared contract before this run: §4.2a names PG-verifying `branching-story-prose-attach` and the canonical `compute-pg-hashes` CLI. This run therefore narrowed the active implementation to validator discoverability prose and closeout truthing.
- No package test command was run because no package source, schema, registry, or validator behavior changed; the owned proof is grep/manual review plus diff hygiene over the edited workflow documentation.
