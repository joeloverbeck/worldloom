# SPEC79CHCREM-011: Capstone — §9 1-6 end-to-end atomic-landing validation

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — new integration test at `tools/validators/tests/integration/spec79-chc-removal.test.ts`; manual runbook and contract review for bootstrap + turn-cycle dry-run boundaries; grep negative test as automated assertion.
**Deps**: archive/tickets/SPEC79CHCREM-002.md, archive/tickets/SPEC79CHCREM-005.md, archive/tickets/SPEC79CHCREM-006.md, archive/tickets/SPEC79CHCREM-007.md, archive/tickets/SPEC79CHCREM-008.md, archive/tickets/SPEC79CHCREM-009.md, archive/tickets/SPEC79CHCREM-010.md

## Problem

SPEC-79 §10 mandates atomic landing of the full surface (schema + validator + bootstrap + turn-cycle + fixtures + contract). Splitting the surfaces risks a window where the schema rejects the field but consumers still emit it (or vice versa). This capstone ticket validates the atomic-landing property: §9 tests 4-6 (bootstrap end-to-end, turn-cycle end-to-end on synthetic bundle, grep negative test) collectively prove the removal is complete across every surface. §9 tests 1-3 land in their respective tickets' acceptance criteria (test 1 in 001's schema validation, test 2 in 002's validator regression, test 3 in 009's Red Kiln fixture verification).

The capstone's primary value is operational: it gives the implementer a single verification surface for the executable tracked-source portion of the removal, a manual runbook for the LLM-driven bootstrap/turn-cycle dry-run portions, and an automated grep assertion that catches any residual `associated_commitment_block` reference across `tools/`, `.claude/skills/`, and `docs/`.

## Assumption Reassessment (2026-05-24)

1. Confirmed §9 tests 4-6 are end-to-end assertions requiring all upstream tickets to have landed: test 4 (bootstrap dry-run producing CHCs without the field) requires 001 (schema) + 005 (bootstrap skill); test 5 (turn-cycle dry-run with replay-equivalent state under `snapshot_replay_equality`) requires 001 + 002 (validator) + 003 (rule) + 006 (turn-cycle skill); test 6 (tracked-source grep negative across `tools/ .claude/skills/ docs/ specs/SPEC-79*.md` plus SPEC-79 provenance paths) requires every upstream ticket (002, 005, 006, 007, 008, 009, 010 transitively reaching 001, 003, 004).
2. Confirmed SPEC-79 §9 enumerates 6 validation tests and §10 mandates atomic landing. The capstone makes the atomic-landing intent operational: tests 4-6 are the holistic verifications that prove every surface is consistent post-landing.
3. Cross-skill boundary: this capstone integration test exercises the full pipeline composed by tickets 001-010. Its `Deps` enumerate the leaf set (002, 005, 006, 007, archived 008, 009, 010) per §Spec-Integration Ticket Shape parallel-branch DAGs rule — the transitive `Deps` from these 7 leaves collectively cover the full upstream chain (001, 003, 004).
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism): the capstone test verifies that the removal preserves current tracked operational surfaces — bootstrap and turn-cycle guidance no longer instructs CHCs to carry a specific SLT, the validator/schema surfaces have no operational field reference, and remaining tracked-source hits are SPEC-79 documentation/provenance. The field was non-load-bearing, and its removal left no current consumer surface depending on it.
5. Reassessment corrected the drafted command shape: `tools/validators/package.json` runs `npm test` as `npm run build && node --test dist/tests/**/*.test.js`, and the wrapper has no `--test-name-pattern` passthrough. The truthful focused proof is `npm run build` followed by `node --test dist/tests/integration/spec79-chc-removal.test.js` from `tools/validators`.
6. Reassessment corrected the negative grep boundary: ignored `dist/` and `node_modules/` artifacts under `tools/` are not current contract surfaces, so the automated assertion uses `git grep` over tracked files. Historical/provenance matches are allowed only in `archive/specs/SPEC-79-chc-associated-commitment-block-removal.md`, `reports/slt-chc-overhaul-second-iteration.md`, and the two SLT/CHC triage docs under `docs/triage/`; any match in `tools/`, `.claude/skills/`, or other current docs is a failure. The first-iteration source report remains historical provenance but is intentionally outside the capstone grep path because SPEC-79's source brainstorm is the second-iteration report.

## Architecture Check

1. The capstone is a thin integration test plus documented manual runbook for upstream tickets' deliverables. It introduces no new production code — its scope is verification. Per §Spec-Integration Ticket Shape, it includes a fixture-world copy strategy keeping the real `worlds/<slug>/` tree untouched (e.g., `fs.cpSync` to a temp root) so dry-runs never mutate canon, plus an automated assertion for the tracked-source grep portion of the capstone matrix.
2. The grep negative test (§9-6) is the simplest assertion: a single tracked-source grep across `tools/`, `.claude/skills/`, `docs/`, `specs/SPEC-79*.md`, and SPEC-79 provenance paths returning matches only inside SPEC-79 documentation and provenance. The archived-spec carve-out (`archive/specs/` matches under SPEC-50, SPEC-51, SPEC-30, SPEC-24, SPEC-76) is acceptable historical retention per the spec's M2 Improvement and is intentionally excluded from the negative-test grep.
3. No backwards-compatibility aliasing/shims introduced. The capstone is a test artifact, not a production code path.

## Verification Layers

1. Bootstrap end-to-end dry-run boundary → manual runbook + contract review: the new test file documents the temp-world runbook, and live bootstrap guidance emits CHCs without the retired CHC-to-SLT field. The dry-run itself was not executed in Codex because the skill is LLM-driven/content-generating and has no executable package harness.
2. Turn-cycle end-to-end dry-run boundary → manual runbook + contract review: the new test file documents the temp-world runbook, and live turn-cycle guidance routes on selected PG input, `grounded_in.records`, and `target_or_action_families` without consulting a per-CHC SLT hint. The dry-run itself was not executed in Codex for the same runner/HARD-GATE reason.
3. Grep negative test passes → codebase grep-proof: `git grep -n associated_commitment_block -- tools .claude/skills docs archive/specs/SPEC-79-chc-associated-commitment-block-removal.md reports/slt-chc-overhaul-second-iteration.md` returns matches only inside SPEC-79 documentation and provenance (per §9 test 6).
4. Atomic landing is preserved → manual review across the dependency graph: every upstream ticket (001-010) is landed before this capstone runs; the leaf-set Deps (002, 005, 006, 007, 008, 009, 010) transitively cover the full upstream chain.

## What to Change

### 1. `tools/validators/tests/integration/spec79-chc-removal.test.ts`

- Landed integration test exercising §9 test 6 as an automated assertion plus runbook coverage for §9 tests 4-5:
  - **§9 test 4 (Bootstrap end-to-end)**: documented as a manual skill dry-run in the test file's setup comment (skills are not invokable from test code; the implementer runs `/branching-story-bootstrap` once against a fixture world and verifies the produced CHCs lack the retired field; a synthetic verification of the produced bundle's CHC entries reads them via `world-index render` or equivalent and asserts zero retired-field keys appear).
  - **§9 test 5 (Turn-cycle end-to-end)**: same manual-dry-run pattern; the test file documents the implementer's verification steps (invoke `/branching-story-turn-cycle` against the bootstrapped page; verify Phase 2 selects an SLT from the live pool without consulting any per-CHC SLT hint; Phase 8 emits CHCs without the field; the resulting state is replay-equivalent under `snapshot_replay_equality`).
  - **§9 test 6 (Grep negative test)**: automated assertion in the test file — spawn a `git grep` subprocess across tracked `tools/`, `.claude/skills/`, `docs/`, `archive/specs/SPEC-79-chc-associated-commitment-block-removal.md`, and `reports/slt-chc-overhaul-second-iteration.md`; assert that all matches are inside SPEC-79's own documentation/provenance (the spec file itself, the source-brainstorm report, and SLT/CHC triage docs) and no consumer surface retains the reference. Other archived-spec matches are excluded by construction.

### 2. Implementer-runbook content

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
- Adding an executable CI gate for LLM-driven skill invocations; the temp-world dry-run sequence is preserved as a manual runbook, and the grep negative test is the CI-runnable assertion.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && node --test dist/tests/integration/spec79-chc-removal.test.js` passes; the automated tracked-source grep negative assertion returns zero matches outside SPEC-79 documentation and provenance.
2. Manual contract review confirms bootstrap guidance emits CHCs without the retired CHC-to-SLT field and keeps the manual dry-run runbook in the capstone test header.
3. Manual contract review confirms turn-cycle guidance routes on selected PG input, `grounded_in.records`, and `target_or_action_families`; Phase 8 emits CHCs without the field; the manual dry-run runbook is preserved in the capstone test header.
4. `git grep -n associated_commitment_block -- tools .claude/skills docs archive/specs/SPEC-79-chc-associated-commitment-block-removal.md reports/slt-chc-overhaul-second-iteration.md` returns matches only inside SPEC-79 documentation and provenance — no consumer surface retains the reference.

### Invariants

1. Atomic landing is preserved post-capstone: no current operational surface in `tools/`, `.claude/skills/`, or `docs/` references the removed field; the schema rejects any CHC carrying it; bootstrap and turn-cycle guidance no longer carry the removed field as a lawful CHC surface.
2. Bundle integrity proof is bounded honestly: package tests and contract review prove the current tracked operational surfaces; LLM-driven bootstrap/turn-cycle dry-runs remain documented as a manual runbook rather than claimed as executed in Codex.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec79-chc-removal.test.ts` — new integration test with the automated grep negative assertion plus header-comment runbook for manual dry-run portions of §9 tests 4-5.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/integration/spec79-chc-removal.test.js`
2. `git grep -n associated_commitment_block -- tools .claude/skills docs archive/specs/SPEC-79-chc-associated-commitment-block-removal.md reports/slt-chc-overhaul-second-iteration.md`
3. Manual contract review of `.claude/skills/branching-story-bootstrap`, `.claude/skills/branching-story-turn-cycle`, `.claude/skills/branching-story-health-audit`, shared templates, `docs/MACHINE-FACING-LAYER.md`, `tools/validators`, and `tools/world-index` for retained operational references.

## Outcome

Completed on 2026-05-24.

- Added `tools/validators/tests/integration/spec79-chc-removal.test.ts`.
- The test file documents the manual temp-world dry-run sequence for SPEC-79 §9 tests 4-5 and automates §9 test 6 with a tracked-source `git grep` assertion.
- The automated assertion fails on any retained operational `associated_commitment_block` hit outside SPEC-79 documentation/provenance.
- Corrected the ticket proof command from the drafted unsupported `npm test -- --test-name-pattern=...` wrapper to the package's real `npm run build` plus focused compiled `node --test` command.

## Verification Result

1. `cd tools/validators && npm run build` — PASS. TypeScript compiled the new test and refreshed `tools/validators/dist/`.
2. `cd tools/validators && node --test dist/tests/integration/spec79-chc-removal.test.js` — PASS. One subtest passed: tracked operational surfaces do not retain the retired CHC-to-SLT field.
3. `git grep -n associated_commitment_block -- tools .claude/skills docs archive/specs/SPEC-79-chc-associated-commitment-block-removal.md reports/slt-chc-overhaul-second-iteration.md` — PASS after classification. Hits remain only in SPEC-79 spec/provenance paths: the archived spec, the second-iteration report, and the two SLT/CHC triage docs under `docs/triage/`; no `tools/` or `.claude/skills/` consumer surface hit remains.
4. Manual contract review — PASS. Bootstrap and turn-cycle guidance now describe CHCs without a specific SLT field and route selection through live pool inputs; health-audit and validator prose use the 3-axis noncollapse signature; `docs/MACHINE-FACING-LAYER.md` no longer documents `choice_associated_storylet`.

## Deviations

- The drafted `npm test -- --test-name-pattern='spec79-chc-removal'` command was not a valid narrow proof for this package wrapper. Replaced with `npm run build` followed by `node --test dist/tests/integration/spec79-chc-removal.test.js`.
- The drafted recursive grep boundary would include ignored generated artifacts under `tools/` and broad historical reports. Replaced with tracked-source `git grep` and explicit historical/provenance classification.
- The SPEC-79 §9 bootstrap and turn-cycle dry-runs were not executed in Codex: they are LLM-driven/content-generating skill runs, have HARD-GATE implications, and have no executable package harness. This ticket preserves the temp-world runbook in the test header and proves current tracked operational surfaces with contract review plus grep.
