# BSBOOT-030: Define deterministic PG hash computation before story-page submit

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — story-skill contract, bootstrap/turn-cycle workflow documentation, and dependent ticket truthing.
**Deps**: `archive/tickets/VALENH-016-enforce-pg-plan-hash-and-state-hash-sha256.md`

## Problem

At intake, `VALENH-016` had tightened `story-page.schema.json` so every PG record must carry `plan.plan_hash` and `state_hash` as 64-character lowercase hex sha256 strings. The writer-side skills only said `plan.plan_hash: <computed>` and `state_hash: <computed>`, but the live `red-bunny` bootstrap witness showed that this wording was not operational enough: `worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` was committed with `PLACEHOLDER_TO_BE_COMPUTED` and `PLACEHOLDER_TO_BE_COMPUTED_BY_ENGINE`.

This ticket owns the writer-side contract for deterministic hash computation before `create_pg_record` is submitted. It does not repair existing world content.

## Assumption Reassessment (2026-05-13)

1. `.claude/skills/_shared-templates/story-state-contract.md` §4.2 declares `state_hash: sha256*` and `plan.plan_hash: sha256*`; §9 says to compute the new `state_hash`; §10 requires submitting story `_source/` records before writing direct markdown artifacts such as `pages-prose-plans/PG-<integer>.md`.
2. At intake, `.claude/skills/branching-story-bootstrap/SKILL.md` Phase 6 said `plan.plan_hash: <computed>` but did not define the byte source, canonicalization, timing, or failure behavior. It also did not explicitly say the hash values must be final before the `create_pg_record` patch plan is validated/submitted.
3. At intake, `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 6 said `state_hash_parent: parent.state_hash`, `state_hash: <computed>`, and `plan.plan_hash: <computed>` but likewise omitted the deterministic hash procedure.
4. Cross-skill boundary: the shared boundary is PG writer output consumed by `record_schema_compliance`, `branching-story-prose-attach` drift checks, and `branching-story-turn-cycle` parent snapshot compatibility. The canonical place for the algorithm is the shared story-state contract, with bootstrap and turn-cycle pointing to it.
5. FOUNDATIONS alignment: `docs/FOUNDATIONS.md` §Story Bundles §4a makes the page snapshot authoritative at page-plan commit. A placeholder or non-deterministic hash weakens that fork primitive and makes later parent compatibility checks meaningless.
6. Adjacent cleanup: `worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` remains a local content repair after this contract is defined. That repair is separately tracked by `tickets/BSBOOT-031-repair-red-bunny-pg-hash-placeholders.md`.
7. HARD-GATE reassessment: `docs/HARD-GATE-DISCIPLINE.md` requires story-bundle `_source` records to validate and submit through the patch engine after explicit approval. The landed contract preserves that order by computing final hashes before `validate_patch_plan` / `submit_patch_plan`; it does not weaken approval-token or write-order discipline.
8. Live write-order correction: shared contract §10 and `docs/FOUNDATIONS.md` §Story Bundles §4 make page plans direct-write artifacts after patch submission. The landed algorithm therefore hashes the exact in-memory plan bytes before submit and requires the post-submit direct write to use those same bytes.

## Architecture Check

1. Defining one shared hash procedure is cleaner than repeating ad hoc instructions in bootstrap and turn-cycle. The PG schema stays the validator authority for field shape; the shared story-state contract becomes the writer authority for how bytes are computed.
2. No backwards-compatibility aliasing or placeholder carve-out is introduced. Placeholder values remain invalid.

## Verification Layers

1. Shared contract algorithm present -> grep/manual review of `.claude/skills/_shared-templates/story-state-contract.md` for `plan_hash` and `state_hash` computation rules.
2. Bootstrap writer uses the shared algorithm -> grep/manual review of `.claude/skills/branching-story-bootstrap/SKILL.md` proving Phase 6/Phase 9/Phase 10 require final hashes before patch-plan validation/submission.
3. Turn-cycle writer uses the shared algorithm -> grep/manual review of `.claude/skills/branching-story-turn-cycle/SKILL.md` proving the same requirement for non-root pages.
4. HARD-GATE discipline preserved -> manual review against `docs/HARD-GATE-DISCIPLINE.md` to confirm the change does not move or weaken approval, validation, or submit ordering.

## Landed Changes

### 1. Defined the canonical hash procedure in the shared story-state contract

`.claude/skills/_shared-templates/story-state-contract.md` now defines `PG` hash computation in §4.2a:

- `plan.plan_hash` is sha256 over the exact UTF-8 bytes of the page plan that will later be written to `pages-prose-plans/PG-<integer>.md`.
- `state_hash` is sha256 over deterministic canonical JSON for the PG fork-state payload after `plan.plan_hash` is final.
- The canonical state payload excludes only `state_hash` itself and the mutable `rendered_prose` block; it includes `plan.path`, `plan.plan_hash`, `state_snapshot`, emitted choices, and `validation_trace`.
- Root and child page writers compute final hashes in working memory before `validate_patch_plan` / `submit_patch_plan`.
- Missing, placeholder, uppercase, non-hex, or stale hash values are hard-stop authoring errors.

### 2. Pointed bootstrap at the shared procedure

`.claude/skills/branching-story-bootstrap/SKILL.md` now keeps the root plan bytes stable in working memory, computes `PG-1.plan.plan_hash` and `PG-1.state_hash` after Phase 9 validation trace finalization, blocks placeholder/malformed hashes before Phase 10, and writes the exact hashed plan bytes after patch success.

### 3. Pointed turn-cycle at the shared procedure

`.claude/skills/branching-story-turn-cycle/SKILL.md` now copies `state_hash_parent` exactly from the committed parent PG, computes the child page's `plan.plan_hash` and `state_hash` with the shared procedure after Phase 9 validation trace finalization, blocks placeholder/malformed hashes before Phase 10, and writes the exact hashed plan bytes after patch success.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `tickets/BSBOOT-031-repair-red-bunny-pg-hash-placeholders.md` (modify dependency wording)

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

## Outcome

Completed: 2026-05-13.

The shared story-state contract now defines deterministic `PG` hash computation. Bootstrap and turn-cycle now explicitly compute final hash values before patch-plan validation/submission, reject placeholder or malformed hashes as hard-stop authoring errors, and preserve the live patch-before-markdown write order by hashing stable in-memory plan bytes and writing those same bytes after patch success.

## Verification Result

1. `rg -n "plan_hash.*sha256|state_hash.*sha256|placeholder" .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md` — passed; found the shared sha256 algorithm, writer-side final-hash requirements, and placeholder hard-stop guidance. One pre-existing `FOUNDATIONS-002` note still uses `<CLASS>-<integer>` as an ID placeholder example; manually classified as unrelated legitimate prose.
2. `rg -n "validate_patch_plan|submit_patch_plan|create_pg_record|approval" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md` — passed; both writer skills still validate before approval/submit and now state malformed PG hashes must not reach validation.
3. Manual review against `docs/HARD-GATE-DISCIPLINE.md` and `docs/FOUNDATIONS.md` §Story Bundles §4 / §4a — passed; the landed wording computes hashes before validation/submission and keeps `_source` writes routed through the patch engine under explicit approval.

## Deviations

- No runtime tests were added or run; this is a workflow-contract ticket with no executable skill runner in the repo. Verification is grep/manual-review based.
- `docs/WORKFLOWS.md` was inspected as a same-seam quick reference and left unchanged because it does not describe PG hash computation or placeholder handling.
