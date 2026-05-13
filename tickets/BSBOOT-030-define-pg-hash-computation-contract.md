# BSBOOT-030: Define deterministic PG hash computation before story-page submit

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — story-skill contract and bootstrap/turn-cycle workflow documentation.
**Deps**: `archive/tickets/VALENH-016-enforce-pg-plan-hash-and-state-hash-sha256.md`

## Problem

`VALENH-016` tightened `story-page.schema.json` so every PG record must carry `plan.plan_hash` and `state_hash` as 64-character lowercase hex sha256 strings. The writer-side skills already say `plan.plan_hash: <computed>` and `state_hash: <computed>`, but the live `red-bunny` bootstrap witness shows that this wording was not operational enough: `worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` was committed with `PLACEHOLDER_TO_BE_COMPUTED` and `PLACEHOLDER_TO_BE_COMPUTED_BY_ENGINE`.

This ticket owns the writer-side contract for deterministic hash computation before `create_pg_record` is submitted. It does not repair existing world content.

## Assumption Reassessment (2026-05-13)

1. `.claude/skills/_shared-templates/story-state-contract.md` §4.2 declares `state_hash: sha256*` and `plan.plan_hash: sha256*`; §9 says to compute the new `state_hash`; §10 requires submitting story `_source/` records before writing direct markdown artifacts such as `pages-prose-plans/PG-<integer>.md`.
2. `.claude/skills/branching-story-bootstrap/SKILL.md` Phase 6 says `plan.plan_hash: <computed>` but does not define the byte source, canonicalization, timing, or failure behavior. It also does not explicitly say the hash values must be final before the `create_pg_record` patch plan is validated/submitted.
3. `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 6 says `state_hash_parent: parent.state_hash`, `state_hash: <computed>`, and `plan.plan_hash: <computed>` but likewise omits the deterministic hash procedure.
4. Cross-skill boundary: the shared boundary is PG writer output consumed by `record_schema_compliance`, `branching-story-prose-attach` drift checks, and `branching-story-turn-cycle` parent snapshot compatibility. The canonical place for the algorithm is the shared story-state contract, with bootstrap and turn-cycle pointing to it.
5. FOUNDATIONS alignment: `docs/FOUNDATIONS.md` §Story Bundles §4a makes the page snapshot authoritative at page-plan commit. A placeholder or non-deterministic hash weakens that fork primitive and makes later parent compatibility checks meaningless.
6. Adjacent cleanup: `worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` remains a local content repair after this contract is defined. That repair is separately tracked by `tickets/BSBOOT-031-repair-red-bunny-pg-hash-placeholders.md`.

## Architecture Check

1. Defining one shared hash procedure is cleaner than repeating ad hoc instructions in bootstrap and turn-cycle. The PG schema stays the validator authority for field shape; the shared story-state contract becomes the writer authority for how bytes are computed.
2. No backwards-compatibility aliasing or placeholder carve-out is introduced. Placeholder values remain invalid.

## Verification Layers

1. Shared contract algorithm present -> grep/manual review of `.claude/skills/_shared-templates/story-state-contract.md` for `plan_hash` and `state_hash` computation rules.
2. Bootstrap writer uses the shared algorithm -> grep/manual review of `.claude/skills/branching-story-bootstrap/SKILL.md` proving Phase 6/Phase 10/Phase 11 require final hashes before patch-plan validation/submission.
3. Turn-cycle writer uses the shared algorithm -> grep/manual review of `.claude/skills/branching-story-turn-cycle/SKILL.md` proving the same requirement for non-root pages.
4. HARD-GATE discipline preserved -> manual review against `docs/HARD-GATE-DISCIPLINE.md` to confirm the change does not move or weaken approval, validation, or submit ordering.

## What to Change

### 1. Define the canonical hash procedure in the shared story-state contract

In `.claude/skills/_shared-templates/story-state-contract.md`, add a compact subsection near §4.2 or §9 that defines:

- `plan.plan_hash`: sha256 over the exact UTF-8 bytes of the page plan that will be written to `pages-prose-plans/PG-<integer>.md`.
- `state_hash`: sha256 over a deterministic canonical serialization of the committed PG state payload, excluding mutable receipt/rendered-prose fields if the contract decides those are not part of the fork primitive. The exclusion/inclusion set must be explicit.
- Root-page and child-page timing: hashes are computed in working memory after the plan and state snapshot are finalized, before `validate_patch_plan` / `submit_patch_plan`.
- Failure behavior: a missing, placeholder, uppercase, non-hex, or stale hash is a hard stop before validation/submission.

### 2. Point bootstrap at the shared procedure

Update `.claude/skills/branching-story-bootstrap/SKILL.md` so Phase 6/Phase 10/Phase 11 clearly state that `PG-1.plan.plan_hash` and `PG-1.state_hash` are final sha256 values computed by the shared procedure before the `create_pg_record` patch plan is validated or submitted.

### 3. Point turn-cycle at the shared procedure

Update `.claude/skills/branching-story-turn-cycle/SKILL.md` so each new PG uses the same shared hash procedure, and `state_hash_parent` is copied from the already-committed parent PG hash.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)

## Out of Scope

- Repairing existing `red-bunny` placeholder records; tracked by `tickets/BSBOOT-031-repair-red-bunny-pg-hash-placeholders.md`.
- Changing `tools/validators/src/schemas/story-page.schema.json`; completed by `archive/tickets/VALENH-016-enforce-pg-plan-hash-and-state-hash-sha256.md`.
- Moving hash computation into the patch engine. This ticket keeps the current skill-authored writer model unless reassessment proves the shared contract cannot be made reliable without engine support.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "plan_hash.*sha256|state_hash.*sha256|placeholder" .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md` shows the shared algorithm and hard-stop guidance.
2. Manual review confirms bootstrap and turn-cycle compute final PG hash fields before `validate_patch_plan` / `submit_patch_plan`.
3. Manual review confirms no instruction permits placeholder hash values to reach `create_pg_record`.

### Invariants

1. Every state-changing story writer has one canonical PG hash computation contract.
2. The write order remains compatible with HARD-GATE approval and patch-engine submission discipline.

## Test Plan

### New/Modified Tests

1. `None — workflow-contract ticket; verification is grep/manual-review based.`

### Commands

1. `rg -n "plan_hash.*sha256|state_hash.*sha256|placeholder" .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md`
2. `rg -n "validate_patch_plan|submit_patch_plan|create_pg_record|approval" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md`
