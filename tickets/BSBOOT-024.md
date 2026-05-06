# BSBOOT-024: Align downstream story workflow Phase 11 transaction wording

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — downstream story skill prose only.
**Deps**: `archive/tickets/BSBOOT-017.md`

## Problem

`BSBOOT-017` corrected `branching-story-bootstrap` Phase 11 from "single transaction" / "atomic transaction" wording to "staged commit" wording because bootstrap writes story-bundle `_source/<class>/*.yaml` records through an atomic engine envelope, then writes markdown surfaces sequentially.

Downstream story skills still carry related wording that can mislead operators about what is all-or-nothing:

- `.claude/skills/storylet-pool-authoring/SKILL.md` still says bootstrap writes returned seed SLTs "during its Phase 11 transaction" and "inside its Phase 11 transaction".
- `.claude/skills/storylet-pool-authoring/references/governance-and-foundations.md` still says bootstrap writes returned SLTs "in its own Phase 11 transaction".
- `.claude/skills/branching-story-page-cycle/SKILL.md` has high-level labels "Atomic write — single transaction" and "Files written (single transaction at Phase 11)", while its detailed Phase 11 section already says "Single patch-engine transaction for story-bundle `_source/*.yaml`, followed by direct markdown writes" and documents markdown partial-failure recovery.
- `.claude/skills/branching-story-page-cycle/references/phase-7-page-render.md` still says disk write happens "inside the atomic transaction".
- `.claude/skills/branching-story-health-audit/SKILL.md` says "Single transaction" for an audit write path that is direct markdown writes plus INDEX-last partial-failure recovery.

`story-fact-promotion-to-canon` was inspected because it is a named downstream consumer. Its Phase 9-11 surface uses direct-write and index-update wording rather than whole-workflow transaction wording, so no change is currently indicated there.

## Assumption Reassessment (2026-05-06)

1. `archive/tickets/BSBOOT-017.md` completed the bootstrap-owned wording correction and explicitly excluded sibling workflow transaction wording from that ticket's scope.
2. `.claude/skills/storylet-pool-authoring/SKILL.md` and `.claude/skills/storylet-pool-authoring/references/governance-and-foundations.md` consume the bootstrap parent-write contract and still use old "Phase 11 transaction" wording for bootstrap seed SLTs.
3. Cross-skill boundary under audit: Phase 11 write-atomicity vocabulary across `branching-story-bootstrap`, `storylet-pool-authoring`, `branching-story-page-cycle`, and `branching-story-health-audit`.
4. FOUNDATIONS / hard-gate principle: the change must not relax approval gates, patch-engine routing for `_source/*.yaml`, append-only ID discipline, Mystery Reserve firewall behavior, or partial-failure recovery.
5. `.claude/skills/branching-story-page-cycle/SKILL.md` and `.claude/skills/branching-story-page-cycle/references/phase-7-page-render.md` contain page-cycle-local "single transaction" / "atomic transaction" labels even though the detailed Phase 11 mechanism is engine submit plus direct markdown writes.
6. `.claude/skills/branching-story-health-audit/SKILL.md` contains a direct-write "Single transaction" label for audit artifacts, but the same section documents INDEX-last partial-failure recovery.
7. `.claude/skills/story-fact-promotion-to-canon/SKILL.md` Phase 9-11 wording was inspected and does not currently need this transaction-vocabulary correction.
8. Adjacent concern classification: page-cycle and health-audit wording are not unfinished BSBOOT-017 work; they are downstream/sibling vocabulary drift exposed by the BSBOOT-017 review and should be handled as this bounded follow-up.

## Architecture Check

1. This keeps the architecture cleaner by using one vocabulary: engine envelopes are atomic for `_source/*.yaml` records; workflows that also write markdown surfaces are staged commits or sequenced direct writes with explicit partial-failure recovery.
2. No backwards-compatibility aliasing or behavior shims are introduced. This is prose-only contract truthing.

## Verification Layers

1. Bootstrap consumer wording in `storylet-pool-authoring` no longer calls bootstrap Phase 11 a generic "transaction" -> codebase grep-proof over storylet-pool-authoring files.
2. Page-cycle high-level labels match its detailed Phase 11 mechanism -> grep-proof plus manual review of page-cycle Phase 11.
3. Health-audit write wording no longer overclaims direct markdown writes as a single transaction -> grep-proof plus manual review of health-audit Phase 10.
4. `story-fact-promotion-to-canon` remains intentionally unchanged unless implementation reassessment finds a concrete transaction-overclaim -> manual review.
5. HARD-GATE and patch-engine semantics are unchanged -> manual review against `docs/HARD-GATE-DISCIPLINE.md`.

## What to Change

### 1. `storylet-pool-authoring` bootstrap parent-write references

Replace bootstrap-specific "Phase 11 transaction" wording with staged-commit wording that points to the bootstrap-owned contract from `BSBOOT-017`.

Do not change direct storylet-pool-authoring batch behavior unless reassessment finds a same-section overclaim. Direct batches should still route SLT YAML records through the patch engine, then write the SLB manifest and INDEX.md directly with INDEX last.

### 2. `branching-story-page-cycle` Phase 11 labels

Replace high-level "single transaction" / broad "atomic transaction" labels with wording that distinguishes:

- the atomic engine transaction for story-bundle `_source/*.yaml` records
- the sequenced markdown writes for `pages-prose/PG-NNNN.md` and `INDEX.md`
- the existing temp-file and partial-failure recovery discipline

Preserve the actual Phase 11 write steps, validation, token handling, temp-file preservation, and INDEX-last rule.

### 3. `branching-story-health-audit` Phase 10 wording

Replace broad "Single transaction" language with sequenced direct-write / staged-write wording that matches the section's existing RSP first, audit report second, INDEX last, and partial-failure recovery behavior.

Do not introduce patch-engine routing for `audits/`; the section already correctly states that `audits/` is outside `_source/`.

### 4. `story-fact-promotion-to-canon` review boundary

Leave unchanged unless implementation reassessment finds a concrete overclaim. The current inspected Phase 9-11 wording describes proposal package direct write and INDEX updates without the same whole-workflow transaction claim.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify)
- `.claude/skills/storylet-pool-authoring/references/governance-and-foundations.md` (modify)
- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-7-page-render.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (review-only unless reassessment finds a concrete stale claim)

## Out of Scope

- Changing any write mechanism, validator, hook, patch-engine op, approval-token behavior, or temp-file cleanup behavior.
- Changing world content.
- Adding marker files or incomplete-run artifacts.
- Reworking page-cycle, health-audit, or storylet-pool-authoring schemas.
- Editing `story-fact-promotion-to-canon` unless implementation reassessment finds a concrete transaction-overclaim not seen during ticket creation.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "bootstrap.*Phase 11 transaction|Phase 11 transaction.*bootstrap|inside its Phase 11 transaction|in its own Phase 11 transaction" .claude/skills/storylet-pool-authoring` returns no matches.
2. `rg -n "Atomic write — single transaction|Files written \\(single transaction at Phase 11\\)|inside the atomic transaction" .claude/skills/branching-story-page-cycle` returns no matches.
3. `rg -n "Single transaction\\. Write order matters" .claude/skills/branching-story-health-audit/SKILL.md` returns no matches.
4. `rg -n "staged commit|sequenced markdown|sequenced direct" .claude/skills/storylet-pool-authoring .claude/skills/branching-story-page-cycle .claude/skills/branching-story-health-audit` shows replacement wording on each touched consumer surface.
5. Manual review confirms all existing HARD-GATE, approval, patch-engine, direct-write, temp-file, and INDEX-last partial-failure instructions remain intact.

### Invariants

1. Engine-routed `_source/*.yaml` records remain described as atomic only within the engine envelope.
2. Workflows that also write markdown surfaces must not claim the entire workflow is a single all-or-nothing transaction.
3. Partial-failure recovery text remains present where the workflow can leave sequential markdown writes after an engine submit or direct-write sequence.
4. `story-fact-promotion-to-canon` remains unchanged unless a concrete stale transaction claim is found during implementation reassessment.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is grep/manual-review based.

### Commands

1. `rg -n "bootstrap.*Phase 11 transaction|Phase 11 transaction.*bootstrap|inside its Phase 11 transaction|in its own Phase 11 transaction" .claude/skills/storylet-pool-authoring`
2. `rg -n "Atomic write — single transaction|Files written \\(single transaction at Phase 11\\)|inside the atomic transaction" .claude/skills/branching-story-page-cycle`
3. `rg -n "Single transaction\\. Write order matters" .claude/skills/branching-story-health-audit/SKILL.md`
4. `rg -n "staged commit|sequenced markdown|sequenced direct" .claude/skills/storylet-pool-authoring .claude/skills/branching-story-page-cycle .claude/skills/branching-story-health-audit`
5. `git diff --check`
