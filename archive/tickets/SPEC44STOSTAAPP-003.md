# SPEC44STOSTAAPP-003: `no_story_state_in_place_mutation` pre-apply validator

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new structural validator `no_story_state_in_place_mutation` registered in `tools/validators/src/public/registry.ts`; pre-apply gate wired into the patch-plan validation pipeline; validator inventory/proof surfaces updated.
**Deps**: archive/tickets/SPEC44STOSTAAPP-002.md

## Problem

At intake, after ticket 002 removed the 7 patch-engine lifecycle ops, no legitimate authoring path for in-place mutation of story-bundle `_source/<class>/*.yaml` files remained. But the patch-engine's pre-apply pipeline did not structurally enforce the absence of in-place mutation — a future op-handler bug, a malformed patch plan, or a regression in `stageCreateStoryRecord` could re-introduce an existing-file overwrite, and the failure would surface only as silent canon-record corruption (the prior record's content gets overwritten on disk without supersession lineage).

This ticket landed a pre-apply gate that examines each story-bundle record create/supersede patch and rejects any whose target path already existed before overlay materialization, or whose record id is staged more than once in the same plan with different content. The check is cheap and catches the failure mode before disk mutation lands.

## Assumption Reassessment (2026-05-18)

1. The pre-apply pipeline runs before `stageCreateStoryRecord` / `stageNewRecordFile` actually writes to disk; validators registered for the pre-apply phase see the patch plan plus the validator read-surface. Live reassessment found that `buildPreApplyReadSurface` overlays created records, so the existing-file check needed a separate original-file snapshot. `tools/validators/src/framework/types.ts` now exposes optional `pre_apply_existing_files`, and `tools/validators/src/public/index.ts` populates it from `buildPreApplyExistingFilePaths` before overlay materialization.
2. SPEC-44 §Approach Phase 2 step 7 + §Risks & Open Questions item 2 specify the validator's discrimination logic: "target file path exists on disk OR target id was created earlier in the same plan and the staged content hash differs → fail." This handles both the disk-overwrite case (the lifecycle ops' old behavior) and the in-plan double-stage case (two ops in one plan staging different content for the same record id).
3. **Cross-boundary surface under audit**: this validator gates the patch-engine's submission to its commit layer. It is part of the `tools/validators/` surface but consumed by `tools/patch-engine/` via the validator harness pre-apply call site. The boundary is the validator-protocol contract: validators return verdicts; the patch-engine pre-apply gate aborts on `fail` severity.
4. **FOUNDATIONS principle**: §Story Bundles §8 (atomic YAML records append-only at the filesystem level) — this validator is the structural enforcement of the rule. Ticket 002's op removals close the only known authoring surface that violates §8; this validator closes the *unknown* authoring surfaces (future op-handler bugs, malformed plans, regressions in supersede-create routing).
5. **Canon Safety surface touched**: the new validator is a structural pre-apply gate under `tools/validators/src/structural/` per the per-ticket-type granularity rule — modifying or adding structural validators triggers item 5. The validator enforces append-only on story-bundle `_source/<class>/*.yaml`; it does NOT touch the Mystery Reserve firewall (which gates forbidden-status `M` resolution at the canon-addition layer, not at the story-state filesystem layer).
6. Live package build exposed same-seam fallout from archived ticket 002: `tools/validators/src/_helpers/index-access.ts`, `tools/validators/src/structural/clock-utils.ts`, and `tools/validators/src/structural/story-question-utils.ts` still referenced retired lifecycle ops after `tools/patch-engine/src/envelope/schema.ts` removed them from `PatchOperation`. Those stale validator helper branches were removed as prerequisite cleanup for a truthful validators build.
7. `tools/validators/README.md`, `tools/validators/tests/structural/registry.test.ts`, and `tools/validators/tests/integration/spec04-verification.test.ts` are same-seam inventory surfaces; adding one structural validator changed the structural count from 46 to 47 and total validator count from 58 to 59.

## Architecture Check

1. **Pre-apply enforcement is preferable to post-commit auditing.** A post-commit auditor could detect filesystem mutations after the fact, but by then the prior record's content is already overwritten — the audit catches the violation but cannot recover the lost state. A pre-apply gate prevents the mutation from landing, preserving the prior record intact.
2. **No backwards-compatibility shim.** The validator emits `fail` severity unconditionally; there is no warn-mode or compatibility-bypass flag. Pre-SPEC-44 story bundles cannot trigger this validator at create-time (the bundles are already committed; the validator runs on new patch plans). The validator's discrimination logic (file-exists OR intra-plan id+hash collision) is specific enough that no legitimate plan triggers a false positive.

## Verification Layers

1. **Validator registered with `fail` severity** → codebase grep-proof: `grep -n 'no_story_state_in_place_mutation' tools/validators/src/public/registry.ts` returns a registry entry with `severity_mode: "fail"`.
2. **Pre-apply gate fires on existing-file overwrite** → schema validation / synthetic-fixture test: a patch plan whose staged write targets an existing `_source/<class>/<id>.yaml` returns a `fail` verdict from the validator.
3. **Pre-apply gate fires on intra-plan id+hash collision** → synthetic-fixture test: a patch plan with two ops staging the same record id with different content hashes returns a `fail` verdict.
4. **Validator does not false-positive on legitimate supersession** → synthetic-fixture test: a patch plan staging a NEW `CLK-N+1.yaml` with `supersedes: CLK-N` (the legitimate post-SPEC-44 supersession shape) validates clean.

## Landed Changes

### 1. Authored the validator module

`tools/validators/src/structural/no-story-state-in-place-mutation.ts` exports `noStoryStateInPlaceMutation`. It applies only in `pre-apply` mode for story-bundle create/supersede patch ops, emits `fail` verdicts with `code: "story_state_in_place_mutation"`, rejects original-file overwrites via `pre_apply_existing_files`, rejects same-plan record-id collisions with different content hashes, and ignores world-canon `_source/` writes.

### 2. Registered and exposed the validator

`tools/validators/src/public/registry.ts` imports and registers the validator. `tools/validators/README.md`, `tools/validators/tests/structural/registry.test.ts`, and `tools/validators/tests/integration/spec04-verification.test.ts` now reflect 47 structural validators / 59 total mechanized validators.

### 3. Added focused and pre-apply-entrypoint proof

`tools/validators/tests/structural/no-story-state-in-place-mutation.test.ts` covers scope, existing-file rejection, intra-plan id collision rejection, legitimate supersession acceptance, and world-canon exclusion. `tools/validators/tests/integration/validate-patch-plan.test.ts` adds a public `validatePatchPlan` rejection case to prove the original-file snapshot is wired through the pre-apply entrypoint.

### 4. Removed stale lifecycle-op helper branches

The validators package still carried pre-apply overlay and applicability references to retired lifecycle ops after ticket 002. This ticket removed those stale references from `tools/validators/src/_helpers/index-access.ts`, `tools/validators/src/structural/clock-utils.ts`, and `tools/validators/src/structural/story-question-utils.ts` so the package compiles against the current patch-engine operation union.

## Files to Touch

- `tools/validators/src/structural/no-story-state-in-place-mutation.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — add import + registry entry)
- `tools/validators/src/framework/types.ts` (modify — add optional pre-apply original-file snapshot field)
- `tools/validators/src/public/index.ts` (modify — pass original-file snapshot into pre-apply validator context)
- `tools/validators/src/_helpers/index-access.ts` (modify — expose original-file paths; remove retired lifecycle-op overlay branches)
- `tools/validators/src/structural/clock-utils.ts` (modify — remove retired lifecycle op names)
- `tools/validators/src/structural/story-question-utils.ts` (modify — remove retired lifecycle op names)
- `tools/validators/README.md` (modify — validator inventory/count)
- `tools/validators/tests/structural/no-story-state-in-place-mutation.test.ts` (new)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — pre-apply entrypoint regression)
- `tools/validators/tests/structural/registry.test.ts` (modify — registry inventory)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — validator counts)

## Out of Scope

- World-canon `_source/` write semantics — world-canon CF records permit in-place mutation in `notes` / `modification_history` / `extensions` fields per FOUNDATIONS §Canonical Storage Layer; this validator is story-bundle-scoped.
- The `state_delta_class_integrity` validator that backstops Phase 1's schema fix (ticket SPEC44STOSTAAPP-004).
- Any post-commit Hook 5 audit equivalent — that machine-layer phase is out of scope for SPEC-44.

## Acceptance Criteria

### Tests That Must Pass

1. `node --test dist/tests/structural/no-story-state-in-place-mutation.test.js dist/tests/integration/validate-patch-plan.test.js` passes after `npm run build`.
2. `npm test --prefix tools/validators` exits 0 (full validator suite regression).
3. `npm run build --prefix tools/validators` exits 0 (TypeScript compilation of the new module + registry update).

### Invariants

1. Any patch plan whose staged write targets an existing story-bundle `_source/<class>/<id>.yaml` returns a `fail` verdict from `no_story_state_in_place_mutation`.
2. Any patch plan with two ops staging different content hashes to the same intra-plan record id returns a `fail` verdict.
3. Legitimate supersession plans (new `<class>-<N+1>.yaml` with `supersedes: <class>-<N>`) validate clean.
4. World-canon `_source/<subdir>/<id>.yaml` writes are not scoped by this validator (per §Story Bundles §8 vs §Canonical Storage Layer distinction).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/no-story-state-in-place-mutation.test.ts` (new) — 5 cases covering scope, two rejection modes, legitimate supersession, and world-canon exclusion.
2. `tools/validators/tests/integration/validate-patch-plan.test.ts` (modified) — proves public `validatePatchPlan` rejects a story-state patch plan targeting an existing indexed file.
3. `tools/validators/tests/structural/registry.test.ts` and `tools/validators/tests/integration/spec04-verification.test.ts` (modified) — registry/count proof surfaces updated.

### Commands

1. From `tools/validators`: `npm run build` — compilation check.
2. From `tools/validators`: `node --test dist/tests/structural/no-story-state-in-place-mutation.test.js dist/tests/integration/validate-patch-plan.test.js` — focused validator + public pre-apply entrypoint proof.
3. From repo root: `npm test --prefix tools/validators` — full validator suite regression.

## Outcome

Completed 2026-05-18. The validators package now has a fail-closed `no_story_state_in_place_mutation` pre-apply validator for story-bundle record writes. The public pre-apply path preserves original indexed file paths separately from overlay records so the validator can distinguish fresh creates from existing-file overwrites. Registry inventory, package README, and SPEC-04 validator counts were updated. Stale validator helper references to retired lifecycle ops from ticket 002 were removed as build-required same-seam cleanup.

## Verification Result

1. `npm run build` from `tools/validators` — passed.
2. `node --test dist/tests/structural/no-story-state-in-place-mutation.test.js dist/tests/integration/validate-patch-plan.test.js` from `tools/validators` — passed 23 tests.
3. `npm test --prefix tools/validators` from repo root — passed 511 tests.

## Deviations

1. The drafted command `npm test --prefix tools/validators -- no-story-state-in-place-mutation` was not the final targeted proof because the package script forwarded the pattern to `node --test` after the compiled glob and still ran the broad suite. The accepted focused proof is the direct compiled `node --test` command above after `npm run build`.
2. The ticket draft assumed validators could infer original-disk existence from staged writes alone. Live reassessment showed the pre-apply read surface overlays created records, so this ticket added `pre_apply_existing_files` to the validator context and populated it before overlay materialization.
3. The first build attempt exposed stale lifecycle-op helper references left from ticket 002 in the validators pre-apply overlay/applicability helpers. Those references were removed in this ticket because they blocked the package compile against the current patch-engine operation union.
