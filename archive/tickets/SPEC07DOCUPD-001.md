# SPEC07DOCUPD-001: Truth `world-validate` quick-reference docs after CLI landing

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None - documentation-only quick-reference truthing.
**Deps**: archive/tickets/SPEC04VALFRA-005.md

## Problem

At intake, `docs/WORKFLOWS.md` still described `world-validate <world-slug>` as the planned validator CLI after `archive/tickets/SPEC04VALFRA-005.md` landed the command. That was stale user-facing invocation guidance for agents and humans reading the repo workflow summary.

Keep this ticket bounded to the workflow quick reference for the landed CLI. Broader validator inventory drift, including `attribution_comment` / `anchor_integrity` references in spec and foundation docs, is already classified as SPEC-07 Part B cleanup by `tickets/SPEC04VALFRA-007.md`.

## Assumption Reassessment (2026-04-25)

1. `archive/tickets/SPEC04VALFRA-005.md` completed the CLI and verified `tools/validators/dist/src/cli/world-validate.js --help` and `--version`. The package-local `tools/validators/README.md` now documents the current CLI behavior.
2. At intake, `docs/WORKFLOWS.md` still said `world-validate <world-slug>` was the planned validator CLI. That wording was stale now that the CLI is implemented.
3. Shared boundary: repo-level workflow quick-reference docs must agree with package-local CLI docs in `tools/validators/README.md` and SPEC-04's CLI surface in `specs/SPEC-04-validator-framework.md`.
4. FOUNDATIONS principle under audit: `docs/FOUNDATIONS.md` Tooling Recommendation requires agents to use structured tooling before proposing or mutating canon. Stale "planned" wording weakens discoverability of the now-available validation surface but does not change validation semantics.
5. Adjacent-contradiction classification: broader validator inventory cleanup for `attribution_comment` and `anchor_integrity` references is future cleanup outside this ticket, already named in `tickets/SPEC04VALFRA-007.md` as SPEC-07 Part B scope.

## Architecture Check

1. Updating the workflow quick reference in place keeps the durable entrypoint truthful without creating a second documentation path or changing the package-local README contract.
2. No backwards-compatibility aliasing/shims introduced. This is documentation-only and does not add alternate CLI names or deprecated forms.

## Verification Layers

1. `docs/WORKFLOWS.md` no longer calls `world-validate` planned -> codebase grep-proof.
2. `docs/WORKFLOWS.md` mentions the implemented `world-validate` command and its bounded selector surface -> manual review plus grep-proof.
3. Rule 3 is not implied to be mechanized by the quick reference -> manual review against SPEC-04 and `tools/validators/README.md`.
4. Broader `attribution_comment` / `anchor_integrity` drift remains out of scope -> manual review against `tickets/SPEC04VALFRA-007.md`.

## What to Change

### 1. Update `docs/WORKFLOWS.md`

Implemented. Replaced pre-landing wording that described `world-validate <world-slug>` as planned. The quick reference now states that the CLI runs the SPEC-04 validator CLI against the world's index.

### 2. Keep rule-filter language precise

Implemented. The quick reference lists mechanized rule numbers `1,2,4,5,6,7` and does not imply Rule 3 has a CLI validator.

## Files to Touch

- `docs/WORKFLOWS.md` (modify)
- `archive/tickets/SPEC07DOCUPD-001.md` (modify — closeout and archival path truthing only)

## Out of Scope

- Editing validator code, CLI behavior, package dependencies, or tests.
- Updating `docs/FOUNDATIONS.md` / spec-wide validator inventory language for `attribution_comment` or `anchor_integrity`; that broader drift is SPEC-07 Part B scope per `tickets/SPEC04VALFRA-007.md`.
- Running the Bootstrap audit against a real world; that remains SPEC-04 ticket 007 scope.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "world-validate" docs/WORKFLOWS.md` shows present-tense implemented CLI guidance.
2. `! grep -n "planned validator CLI" docs/WORKFLOWS.md` exits 0.
3. Manual review confirms the quick reference does not imply Rule 3 is mechanized.

### Invariants

1. `docs/WORKFLOWS.md` remains a concise workflow entrypoint, not a duplicate of `tools/validators/README.md`.
2. The docs-only patch does not change CLI behavior, validators, package metadata, or world content.

## Test Plan

### New/Modified Tests

1. None - documentation-only ticket; verification is command-based and existing CLI behavior is already covered by `archive/tickets/SPEC04VALFRA-005.md`.

### Commands

1. `grep -n "world-validate" docs/WORKFLOWS.md`
2. `bash -lc '! grep -n "planned validator CLI" docs/WORKFLOWS.md'`
3. Manual review of `docs/WORKFLOWS.md`, `tools/validators/README.md`, and `tickets/SPEC04VALFRA-007.md` for the bounded scope.

## Outcome

Completed the docs-only quick-reference truthing. `docs/WORKFLOWS.md` now describes `world-validate <world-slug>` as the implemented SPEC-04 validator CLI, notes that it runs against the world's index, preserves `--structural`, and lists the mechanized rule selector set `1,2,4,5,6,7`.

No validator code, CLI behavior, package metadata, world content, or broader SPEC-07 drift was changed.

## Verification Result

Passed:

1. `grep -n "world-validate" docs/WORKFLOWS.md` — line 33 shows present-tense implemented CLI guidance.
2. `bash -lc '! grep -n "planned validator CLI" docs/WORKFLOWS.md'` — exited 0.
3. `grep -n "Rule 3\|--rules=3\|rules=1,2,3" docs/WORKFLOWS.md` — exited 1 with no matches, confirming the quick reference does not imply Rule 3 is mechanized.
4. Manual review against `specs/SPEC-04-validator-framework.md` and `tools/validators/README.md` confirmed the quick reference matches the landed CLI surface and keeps Rule 3 outside the mechanized selector set.

## Deviations

- None.
