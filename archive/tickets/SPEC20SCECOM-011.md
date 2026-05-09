# SPEC20SCECOM-011: Spec Integration — §Verification Contract Audit (No Claude Runs)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — docs/ticket contract audit only. No production code, fixtures, generated story bundles, dry-run scripts, skill harnesses, or Claude skill executions are introduced.
**Deps**: `archive/tickets/SPEC20SCECOM-009.md` (transitive head — composes all earlier phase tickets via SKILL.md Process Flow + Phase descriptions); `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (SPEC-22's validator implementations are required for deterministic verification of choice-worthiness, replay-safety, evidence-alignment, narrative-point classification gates)

## Problem

At intake, SPEC-20 §Verification read like it wanted an empirical end-to-end page-cycle exercise: generate or fixture-copy a v2 story bundle, run the Claude-facing skills across modes, and count token cost / HARD-GATE fire counts. That was not a useful non-production verification surface. It would have spent LLM tokens exercising workflow prose instead of testing production code, and the current repo does not expose a deterministic runner that can execute `.claude/skills/*` without invoking Claude.

The useful remaining work was narrower: truth the SPEC-20 / SPEC-22 verification contract so future tickets use deterministic validators, package tests, grep-proof, and manual contract review only. This ticket removed the expectation of Claude skill dry runs or full runs from its own acceptance surface and updated the same-seam SPEC-20 reference to say empirical token-cost / live-mode behavior is production-pilot evidence, not a ticket verification gate.

## Assumption Reassessment (2026-05-08)

1. Verified `archive/specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md` §Verification names seven verification bullets: snapshot-replay equality, token-cost reduction, choice-surface gate correctness, choice-worthiness enforcement, strong-axis collective difference, ARC_TRACE evidence alignment, and HARD-GATE preservation.
2. Verified `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` §Verification already owns the deterministic machine-facing surfaces: patch-engine round-trip, validator coverage, canonical-vocabulary enum coverage, indexer ingestion, sibling-skill interop contracts, migration, and Hook 3 coverage.
3. Cross-artifact boundary: this ticket audits the verification prose shared by `archive/specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md`, `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md`, and the active ticket text. It does not exercise `.claude/skills/*` and does not create a new capstone fixture.
4. FOUNDATIONS alignment: Rule 1, Rule 5, Rule 6, Rule 7, append-only story-bundle writes, and HARD-GATE discipline remain the target invariants, but the proof must be deterministic or review-based. LLM token-cost telemetry and user-pause counts are production-pilot observations, not non-production ticket gates.
5. Mismatch corrected: the prior ticket shape asked for skill dry runs and full v2 page-cycle execution over fixtures. The live repo has prose skills, not a deterministic skill runner, so the corrected scope is a verification contract audit plus same-seam prose cleanup. No Claude dry run, full run, or generated story-bundle exercise is acceptable as this ticket's verification.
6. Current blocker evidence: at reassessment, SPEC-20 still described manual tests and empirical 50-page runs in §Verification. This ticket corrected SPEC-20 §Verification to separate deterministic validators/package tests, manual contract review, and production-pilot telemetry. SPEC-22's validator fixture references remain legitimate package-test fixture work, not Claude skill dry/full runs.

## Architecture Check

1. Contract audit is cleaner than a fixture-run ticket because it preserves the useful spec matrix without spending LLM tokens on non-production skill execution. Mechanized behavior remains owned by SPEC-22 validators and package tests.
2. The verification map should distinguish three surfaces: deterministic package/tool proof, manual contract review, and production-pilot telemetry. Only the first two belong in ticket acceptance.
3. No backwards-compatibility aliasing/shims: this is a forward-only prose correction to the v2 verification contract.

## Verification Layers

1. Snapshot-replay equality at arc cadence -> deterministic validator / package test mapping to SPEC-22's `effect_model_replay_safety` or current equivalent; no skill execution.
2. Token-cost reduction -> manual contract review only; spec prose must label it production-pilot telemetry, not CI or ticket acceptance.
3. Choice-surface gate correctness across modes -> manual contract review of mode semantics plus grep-proof that no active ticket acceptance requires a Claude dry/full run.
4. Choice-worthiness enforcement -> deterministic validator / schema-test mapping to SPEC-22's `choice_worthiness_completeness` or current equivalent.
5. Strong-axis collective difference -> deterministic validator / schema-test mapping to the current pair-distance / strong-axis validator surface; if no validator exists yet, record the SPEC-22 blocker instead of simulating a skill run.
6. ARC_TRACE evidence alignment -> deterministic validator / schema-test mapping to SPEC-22's `arc_trace_evidence_alignment` or current equivalent.
7. HARD-GATE preservation -> FOUNDATIONS alignment check + manual review of Phase 4.5 and Phase 10 prose; no page-cycle skill execution.

## Landed Changes

### 1. Rewrote this ticket's acceptance surface

Kept the ticket as a docs-only / contract-truthing ticket. Removed capstone fixture creation, skill dry-run scripts, 50-page generated runs, and full page-cycle execution from the active plan.

### 2. Corrected same-seam SPEC-20 wording

Updated SPEC-20 §Verification so it separates:

- deterministic validator/package proof;
- manual spec / FOUNDATIONS contract review;
- production-pilot telemetry that is explicitly not a ticket gate.

### 3. Leave production runtime evidence to production work

The ticket now records that future production runtime evidence belongs in product-facing telemetry or runtime tests, not in a surrogate Claude-runner or non-production prose workflow exercise.

## Files to Touch

- `archive/tickets/SPEC20SCECOM-011.md` (modify — corrected scope and acceptance; moved from `tickets/SPEC20SCECOM-011.md` during post-ticket review)
- `archive/specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md` (modify — §Verification now forbids non-production Claude skill dry/full runs and labels token-cost as production-pilot telemetry; moved from `specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md` during spec archival)

## Out of Scope

- Claude skill dry runs, full runs, representative skill invocations, or generated prose/story-bundle runs.
- New fixtures, test harnesses, dry-run scripts, validators, hooks, package code, or production runtime code.
- Token-cost measurement as a ticket gate. Token telemetry belongs to production-pilot work once a real runtime exists.
- Migration or deletion of live world/story content.

## Acceptance Criteria

### Tests That Must Pass

1. SPEC-20 / SPEC-22 verification prose no longer makes Claude skill dry runs, full runs, 50-page generated runs, or token-spending story generation part of this ticket's acceptance surface.
2. Every SPEC-20 §Verification bullet is mapped to one of: deterministic validator/package proof, manual contract review, FOUNDATIONS alignment check, or production-pilot telemetry explicitly outside ticket acceptance.
3. The active ticket contains no planned fixture path, dry-run script, `pnpm --filter ... spec-20-capstone` command, or `world-validate worlds/<fixture-temp-root>/...` command.

### Invariants

1. No non-production workflow spends LLM tokens to verify prose skill behavior.
2. Production canon remains untouched; this is a docs-only contract correction.
3. Token-cost is production-pilot telemetry, NOT a CI gate or active ticket gate.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is grep/manual-review based.

### Commands

1. `rg -n "skill dry-run|dry-run scripts|full run|50-page|spec-20-capstone|fixture-temp-root|world-validate worlds/<fixture-temp-root>|pnpm --filter @worldloom/validators test spec-20-capstone" archive/tickets/SPEC20SCECOM-011.md archive/specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` — discovery sweep; any hit must be classified as removed, explicitly historical, production-pilot-only, or outside this ticket's acceptance surface.
2. Manual review of the SPEC-20 §Verification bullet mapping confirms every bullet is preserved without requiring Claude skill execution.
3. `git diff --check -- archive/tickets/SPEC20SCECOM-011.md archive/specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md`

## Outcome

Completed: 2026-05-08. The original capstone / end-to-end exercise was rejected as a non-production token sink. The useful remaining seam landed as a docs-only verification-contract correction: SPEC-20 still preserves its verification bullets, but it now routes mechanized invariants to deterministic SPEC-22 validators/package tests, routes HARD-GATE and mode semantics to manual contract review, and labels token-cost/user-pause evidence as production-pilot telemetry rather than a ticket gate. This ticket's own acceptance surface now explicitly forbids Claude skill dry runs, full runs, generated story-bundle runs, surrogate skill harnesses, and 50-page generated proof loops.

Post-ticket-review archival note: archived on 2026-05-08 at `archive/tickets/SPEC20SCECOM-011.md`; rerunnable proof commands above now use the archived ticket and SPEC-20 spec paths.

## Verification Result

1. PASS — discovery sweep for stale capstone/dry-run anchors over this ticket, SPEC-20, and SPEC-22. Remaining hits are historical/prohibited wording inside this completed ticket or SPEC-20's explicit "do not run" prose; no active acceptance path requires a Claude skill run.
2. PASS — manual review of SPEC-20 §Verification confirmed all seven bullets remain present and mapped to deterministic validator/package proof, manual contract review, FOUNDATIONS/HARD-GATE review, or production-pilot telemetry.
3. PASS — `git diff --check -- archive/tickets/SPEC20SCECOM-011.md archive/specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md`.

## Deviations

1. The original ticket expected a capstone fixture and an end-to-end exercise. That was intentionally removed because the live repo has prose skills, not a deterministic skill runner, and non-production Claude runs would waste tokens rather than prove production behavior.
2. `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` was reviewed but not edited. Its remaining fixture language refers to validator unit-test fixtures, which is legitimate deterministic package-test work and not the rejected Claude skill dry/full-run surface.
