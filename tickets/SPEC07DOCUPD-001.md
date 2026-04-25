# SPEC07DOCUPD-001: Truth `world-validate` quick-reference docs after CLI landing

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None - documentation-only quick-reference truthing.
**Deps**: archive/tickets/SPEC04VALFRA-005.md

## Problem

`docs/WORKFLOWS.md` still describes `world-validate <world-slug>` as the planned validator CLI after `archive/tickets/SPEC04VALFRA-005.md` landed the command. This is stale user-facing invocation guidance for agents and humans reading the repo workflow summary.

Keep this ticket bounded to the workflow quick reference for the landed CLI. Broader validator inventory drift, including `attribution_comment` / `anchor_integrity` references in spec and foundation docs, is already classified as SPEC-07 Part B cleanup by `tickets/SPEC04VALFRA-007.md`.

## Assumption Reassessment (2026-04-25)

1. `archive/tickets/SPEC04VALFRA-005.md` completed the CLI and verified `tools/validators/dist/src/cli/world-validate.js --help` and `--version`. The package-local `tools/validators/README.md` now documents the current CLI behavior.
2. `docs/WORKFLOWS.md` still says `world-validate <world-slug>` is the planned validator CLI. That wording is stale now that the CLI is implemented.
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

Replace pre-landing wording that describes `world-validate <world-slug>` as planned. State that the CLI exists under `tools/validators`, uses the world index, and runs the mechanized validator set.

### 2. Keep rule-filter language precise

If the quick reference names rule filters, list only mechanized rule numbers `1,2,4,5,6,7` or say "mechanized rules." Do not imply Rule 3 has a CLI validator.

## Files to Touch

- `docs/WORKFLOWS.md` (modify)

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
2. `! grep -n "planned validator CLI" docs/WORKFLOWS.md`
3. Manual review of `docs/WORKFLOWS.md`, `tools/validators/README.md`, and `tickets/SPEC04VALFRA-007.md` for the bounded scope.
