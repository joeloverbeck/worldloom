# SPEC79CHCREM-011: Capstone — §9 1-6 end-to-end atomic-landing validation

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — new integration test at `tools/validators/tests/integration/spec79-chc-removal.test.ts`; verification of bootstrap + turn-cycle dry-runs; grep negative test as automated assertion.
**Deps**: archive/tickets/SPEC79CHCREM-002.md, archive/tickets/SPEC79CHCREM-005.md, archive/tickets/SPEC79CHCREM-006.md, archive/tickets/SPEC79CHCREM-007.md, archive/tickets/SPEC79CHCREM-008.md, archive/tickets/SPEC79CHCREM-009.md, archive/tickets/SPEC79CHCREM-010.md

## Problem

SPEC-79 §10 mandates atomic landing of the full surface (schema + validator + bootstrap + turn-cycle + fixtures + contract). Splitting the surfaces risks a window where the schema rejects the field but consumers still emit it (or vice versa). This capstone ticket validates the atomic-landing property: §9 tests 4-6 (bootstrap end-to-end, turn-cycle end-to-end on synthetic bundle, grep negative test) collectively prove the removal is complete across every surface. §9 tests 1-3 land in their respective tickets' acceptance criteria (test 1 in 001's schema validation, test 2 in 002's validator regression, test 3 in 009's Red Kiln fixture verification).

The capstone's primary value is operational: it gives the implementer a single verification surface that exercises every upstream ticket's deliverable through one end-to-end pass, plus an automated grep assertion that catches any residual `associated_commitment_block` reference across `tools/`, `.claude/skills/`, and `docs/`.

## Assumption Reassessment (2026-05-24)

1. Confirmed §9 tests 4-6 are end-to-end assertions requiring all upstream tickets to have landed: test 4 (bootstrap dry-run producing CHCs without the field) requires 001 (schema) + 005 (bootstrap skill); test 5 (turn-cycle dry-run with replay-equivalent state under `snapshot_replay_equality`) requires 001 + 002 (validator) + 003 (rule) + 006 (turn-cycle skill); test 6 (grep negative across `tools/ .claude/skills/ docs/ specs/SPEC-79*.md` returning matches only inside SPEC-79's own documentation) requires every upstream ticket (002, 005, 006, 007, 008, 009, 010 transitively reaching 001, 003, 004).
2. Confirmed SPEC-79 §9 enumerates 6 validation tests and §10 mandates atomic landing. The capstone makes the atomic-landing intent operational: tests 4-6 are the holistic verifications that prove every surface is consistent post-landing.
3. Cross-skill boundary: this capstone integration test exercises the full pipeline composed by tickets 001-010. Its `Deps` enumerate the leaf set (002, 005, 006, 007, archived 008, 009, 010) per §Spec-Integration Ticket Shape parallel-branch DAGs rule — the transitive `Deps` from these 7 leaves collectively cover the full upstream chain (001, 003, 004).
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism): the capstone test verifies that the removal preserves bundle integrity — bootstrap produces schema-conformant CHCs, turn-cycle's selection works against the live pool without consulting the removed field, and `snapshot_replay_equality` confirms replay-equivalent state per spec §9 test 5. The capstone is the operational evidence that §5b's load-bearing test passed post-landing — the field was non-load-bearing, and its removal broke no validation gate, replay primitive, predicate, fork operation, or audit-trail discipline.

## Architecture Check

1. The capstone is a thin integration test exercising upstream tickets' deliverables through one end-to-end pass. It introduces no new production code — its scope is verification. Per §Spec-Integration Ticket Shape, it includes a fixture-world copy strategy keeping the real `worlds/<slug>/` tree untouched (e.g., `fs.cpSync` to a temp root) so the test never mutates canon, plus one assertion per §9 bullet treated as the capstone's test matrix.
2. The grep negative test (§9-6) is the simplest assertion: a single grep command across `tools/`, `.claude/skills/`, `docs/`, and `specs/SPEC-79*.md` returning matches only inside SPEC-79's own documentation. The archived-spec carve-out (`archive/specs/` matches under SPEC-50, SPEC-51, SPEC-30, SPEC-24, SPEC-76) is acceptable historical retention per the spec's M2 Improvement and is intentionally excluded from the negative-test grep.
3. No backwards-compatibility aliasing/shims introduced. The capstone is a test artifact, not a production code path.

## Verification Layers

1. Bootstrap end-to-end produces schema-conformant CHCs → skill dry-run + schema validation: invoke `/branching-story-bootstrap` against a fixture-world copy; verify the produced bundle passes all 8 shared hard gates including the updated trace closure gate (per §9 test 4).
2. Turn-cycle end-to-end produces replay-equivalent state → skill dry-run + schema validation: invoke `/branching-story-turn-cycle` against the bootstrapped page; verify Phase 2 selects an SLT from the live pool without consulting any per-CHC SLT hint; Phase 8 emits CHCs without the field; the resulting state is replay-equivalent under `snapshot_replay_equality` (per §9 test 5).
3. Grep negative test passes → codebase grep-proof: `grep -r associated_commitment_block tools/ .claude/skills/ docs/ specs/SPEC-79*.md` returns matches only inside SPEC-79's own documentation (per §9 test 6).
4. Atomic landing is preserved → manual review across the dependency graph: every upstream ticket (001-010) is landed before this capstone runs; the leaf-set Deps (002, 005, 006, 007, 008, 009, 010) transitively cover the full upstream chain.

## What to Change

### 1. `tools/validators/tests/integration/spec79-chc-removal.test.ts` (new file)

- New integration test exercising §9 tests 4-6 as automated assertions plus dry-run-documented assertions:
  - **§9 test 4 (Bootstrap end-to-end)**: documented as a manual skill dry-run in the test file's setup comment (skills are not invokable from test code; the implementer runs `/branching-story-bootstrap` once against a fixture world and verifies the produced CHCs lack the field; a synthetic verification of the produced bundle's CHC entries reads them via `world-index render` or equivalent and asserts zero `associated_commitment_block` keys appear).
  - **§9 test 5 (Turn-cycle end-to-end)**: same manual-dry-run pattern; the test file documents the implementer's verification steps (invoke `/branching-story-turn-cycle` against the bootstrapped page; verify Phase 2 selects an SLT from the live pool without consulting any per-CHC SLT hint; Phase 8 emits CHCs without the field; the resulting state is replay-equivalent under `snapshot_replay_equality`).
  - **§9 test 6 (Grep negative test)**: automated assertion in the test file — spawn a `grep` subprocess across `tools/`, `.claude/skills/`, `docs/`, and `specs/SPEC-79-chc-associated-commitment-block-removal.md`; assert that all matches are inside SPEC-79's own documentation (the spec file itself, plus the source-brainstorm report and triage document that the spec references) and no consumer surface retains the reference. Archived-spec matches under `archive/specs/` are excluded by construction (the grep targets exclude `archive/specs/`).

### 2. Implementer-runbook content (documented in the test file's header comment)

- The test file's header comment includes a runbook section for the manual dry-run portions of §9 tests 4-5:
  - Copy a fixture world to a temp directory (`fs.cpSync` to `/tmp/spec79-fixture-world` or equivalent) so the dry-run never mutates canon.
  - Invoke `/branching-story-bootstrap` against the fixture world; record the produced CHCs and verify they lack `associated_commitment_block`.
  - Invoke `/branching-story-turn-cycle` against a bootstrapped page; record the selected SLT and verify Phase 2 selection used `grounded_in.records` plus `target_or_action_families` (not the removed field).
  - Run `snapshot_replay_equality` against the resulting state; verify replay equivalence.
- The runbook is documented in the test file rather than in a separate doc file because the test file is the natural single source of truth for the capstone's verification procedure.

## Files to Touch

- `tools/validators/tests/integration/spec79-chc-removal.test.ts` (new)

## Out of Scope

- New production code beyond the test file.
- §9 tests 1-3 (handled in 001, 002, 009 respectively).
- Re-running the full upstream test suites — those are each ticket's own acceptance criteria.
- Mutating canon during dry-runs (forbidden by the fixture-world copy strategy).
- Performance assertions (the spec names no perf gate; capstone keeps to functional verification).
- Adding the test to CI gates if the test depends on manual skill invocations — the implementer runs the dry-run portions manually before declaring the spec landed; the grep negative test is the only CI-runnable assertion.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test -- --test-name-pattern='spec79-chc-removal'` passes; the automated grep negative assertion returns zero matches outside SPEC-79's own documentation.
2. Manual dry-run: `/branching-story-bootstrap` against a fixture-world copy produces CHCs without `associated_commitment_block`; the produced bundle passes all 8 shared hard gates.
3. Manual dry-run: `/branching-story-turn-cycle` against the bootstrapped page selects an SLT from the live pool without consulting any per-CHC SLT hint; Phase 8 emits CHCs without the field; the resulting state is replay-equivalent under `snapshot_replay_equality`.
4. `grep -r associated_commitment_block tools/ .claude/skills/ docs/ specs/SPEC-79-chc-associated-commitment-block-removal.md` returns matches only inside SPEC-79's own documentation (the spec, source-brainstorm report, triage document) — no consumer surface retains the reference.

### Invariants

1. Atomic landing is preserved post-capstone: no surface in `tools/`, `.claude/skills/`, or `docs/` references the removed field; the schema rejects any CHC carrying it; bootstrap produces schema-conformant CHCs; turn-cycle's selection works against the live pool.
2. Bundle integrity is preserved: bootstrap-produced bundles pass all 8 shared hard gates; turn-cycle dry-runs produce replay-equivalent state under `snapshot_replay_equality`.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec79-chc-removal.test.ts` — new integration test with the automated grep negative assertion plus header-comment runbook for manual dry-run portions of §9 tests 4-5.

### Commands

1. `cd tools/validators && npm test -- --test-name-pattern='spec79-chc-removal'`
2. `grep -r associated_commitment_block tools/ .claude/skills/ docs/ specs/SPEC-79-chc-associated-commitment-block-removal.md`
3. Manual dry-run sequence per the test file's header-comment runbook.
