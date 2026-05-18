# SPEC44STOSTAAPP-003: `no_story_state_in_place_mutation` pre-apply validator

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new structural validator `no_story_state_in_place_mutation` registered in `tools/validators/src/public/registry.ts`; pre-apply gate wired into the patch-plan validation pipeline. No impact on existing validators.
**Deps**: archive/tickets/SPEC44STOSTAAPP-002.md

## Problem

After ticket 002 removes the 7 patch-engine lifecycle ops, no legitimate authoring path for in-place mutation of story-bundle `_source/<class>/*.yaml` files remains. But the patch-engine's pre-apply pipeline doesn't structurally enforce the absence of in-place mutation — a future op-handler bug, a malformed patch plan, or a regression in `stageCreateStoryRecord` could re-introduce an existing-file overwrite, and the failure would surface only as a silent canon-record corruption (the prior record's content gets overwritten on disk without supersession lineage).

A pre-apply gate that examines each staged write and rejects any whose target path already exists on disk (or whose target record-id was created earlier in the same plan with a different content hash) closes the gap. The check is cheap (file-exists test per staged write + intra-plan id collision scan) and catches the failure mode before any disk mutation lands.

## Assumption Reassessment (2026-05-18)

1. The pre-apply pipeline runs before `stageCreateStoryRecord` / `stageNewRecordFile` actually writes to disk; validators registered for the pre-apply phase see the staged-writes plan, not committed disk state. `tools/patch-engine/src/commit/temp-file.ts` and the shared staging helpers (`tools/patch-engine/src/ops/shared.ts`) hold the staged-write metadata; the validator consumes the metadata via the patch-engine's standard validator harness. `tools/validators/src/public/registry.ts:61-108` is the validator registry surface; structural validators register here with their `severity_mode`, `applies_to`, and run function.
2. SPEC-44 §Approach Phase 2 step 7 + §Risks & Open Questions item 2 specify the validator's discrimination logic: "target file path exists on disk OR target id was created earlier in the same plan and the staged content hash differs → fail." This handles both the disk-overwrite case (the lifecycle ops' old behavior) and the in-plan double-stage case (two ops in one plan staging different content for the same record id).
3. **Cross-boundary surface under audit**: this validator gates the patch-engine's submission to its commit layer. It is part of the `tools/validators/` surface but consumed by `tools/patch-engine/` via the validator harness pre-apply call site. The boundary is the validator-protocol contract: validators return verdicts; the patch-engine pre-apply gate aborts on `fail` severity.
4. **FOUNDATIONS principle**: §Story Bundles §8 (atomic YAML records append-only at the filesystem level) — this validator is the structural enforcement of the rule. Ticket 002's op removals close the only known authoring surface that violates §8; this validator closes the *unknown* authoring surfaces (future op-handler bugs, malformed plans, regressions in supersede-create routing).
5. **Canon Safety surface touched**: the new validator is a structural pre-apply gate under `tools/validators/src/structural/` per the per-ticket-type granularity rule — modifying or adding structural validators triggers item 5. The validator enforces append-only on story-bundle `_source/<class>/*.yaml`; it does NOT touch the Mystery Reserve firewall (which gates forbidden-status `M` resolution at the canon-addition layer, not at the story-state filesystem layer).

## Architecture Check

1. **Pre-apply enforcement is preferable to post-commit auditing.** A post-commit auditor could detect filesystem mutations after the fact, but by then the prior record's content is already overwritten — the audit catches the violation but cannot recover the lost state. A pre-apply gate prevents the mutation from landing, preserving the prior record intact.
2. **No backwards-compatibility shim.** The validator emits `fail` severity unconditionally; there is no warn-mode or compatibility-bypass flag. Pre-SPEC-44 story bundles cannot trigger this validator at create-time (the bundles are already committed; the validator runs on new patch plans). The validator's discrimination logic (file-exists OR intra-plan id+hash collision) is specific enough that no legitimate plan triggers a false positive.

## Verification Layers

1. **Validator registered with `fail` severity** → codebase grep-proof: `grep -n 'no_story_state_in_place_mutation' tools/validators/src/public/registry.ts` returns a registry entry with `severity_mode: "fail"`.
2. **Pre-apply gate fires on existing-file overwrite** → schema validation / synthetic-fixture test: a patch plan whose staged write targets an existing `_source/<class>/<id>.yaml` returns a `fail` verdict from the validator.
3. **Pre-apply gate fires on intra-plan id+hash collision** → synthetic-fixture test: a patch plan with two ops staging the same record id with different content hashes returns a `fail` verdict.
4. **Validator does not false-positive on legitimate supersession** → synthetic-fixture test: a patch plan staging a NEW `CLK-N+1.yaml` with `supersedes: CLK-N` (the legitimate post-SPEC-44 supersession shape) validates clean.

## What to Change

### 1. Author the validator module

Create `tools/validators/src/structural/no-story-state-in-place-mutation.ts`. The module exports a `noStoryStateInPlaceMutation` validator following the pattern of existing structural validators (e.g., `audit-only-se-shape.ts`). The validator:
- Targets the pre-apply phase via `applies_to: ["pre_apply"]` (or the equivalent registry-recognized key).
- Iterates staged writes in the patch plan; for each, checks (a) target file path exists on disk → fail, OR (b) target id was created earlier in the same plan with a different content hash → fail.
- Returns verdicts with `severity: "fail"`, `code: "story_state_in_place_mutation"`, and a message naming the offending staged write target (e.g., `"Patch op X stages write to existing CLK-2.yaml; story-state records are append-only — supersede via supersede_clk_record (creates a new CLK-N+1.yaml with supersedes: CLK-2)"`).
- Scope: applies only to story-bundle `_source/<class>/*.yaml` paths (under `worlds/<slug>/stories/<slug>/_source/`). World-canon `_source/` writes follow a different lifecycle (notes / modification_history / extensions are in-place-mutable per FOUNDATIONS §Canonical Storage Layer) and are out of scope.

### 2. Register the validator

Edit `tools/validators/src/public/registry.ts` to add an import for the new validator module and a registry entry. Add the entry alongside the existing structural validators (the file is grouped by validator family; place it near `audit-only-se-shape` or other patch-plan validators).

### 3. Author the test module

Create `tools/validators/tests/structural/no-story-state-in-place-mutation.test.ts` covering:
- **Negative test 1 (existing-file overwrite)**: a synthetic patch plan with one op staging a write to `_source/clocks/CLK-2.yaml` on a fixture world where `CLK-2.yaml` exists → expect `fail` verdict with the offending target id named.
- **Negative test 2 (intra-plan id+hash collision)**: a synthetic patch plan with two ops staging writes to `CLK-3.yaml` (intra-plan id collision; new record being created twice in one plan) where content hashes differ → expect `fail` verdict.
- **Positive test 1 (legitimate supersession)**: a synthetic patch plan staging a NEW `CLK-3.yaml` with `supersedes: CLK-2` (the post-SPEC-44 supersession shape) → expect clean verdict.
- **Positive test 2 (world-canon record)**: a synthetic patch plan staging a write to a world-canon `_source/canon/CF-1.yaml` (which is allowed to be in-place-mutated for `notes` / `modification_history`) → expect clean verdict (validator scope is story-bundle only).

## Files to Touch

- `tools/validators/src/structural/no-story-state-in-place-mutation.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — add import + registry entry)
- `tools/validators/tests/structural/no-story-state-in-place-mutation.test.ts` (new)

## Out of Scope

- World-canon `_source/` write semantics — world-canon CF records permit in-place mutation in `notes` / `modification_history` / `extensions` fields per FOUNDATIONS §Canonical Storage Layer; this validator is story-bundle-scoped.
- The `state_delta_class_integrity` validator that backstops Phase 1's schema fix (ticket SPEC44STOSTAAPP-004).
- Any post-commit Hook 5 audit equivalent — that machine-layer phase is out of scope for SPEC-44.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators -- no-story-state-in-place-mutation` passes all 4 test cases (2 negative, 2 positive).
2. `npm test --prefix tools/validators` exits 0 (full validator suite regression).
3. `npm run build --prefix tools/validators` exits 0 (TypeScript compilation of the new module + registry update).

### Invariants

1. Any patch plan whose staged write targets an existing story-bundle `_source/<class>/<id>.yaml` returns a `fail` verdict from `no_story_state_in_place_mutation`.
2. Any patch plan with two ops staging different content hashes to the same intra-plan record id returns a `fail` verdict.
3. Legitimate supersession plans (new `<class>-<N+1>.yaml` with `supersedes: <class>-<N>`) validate clean.
4. World-canon `_source/<subdir>/<id>.yaml` writes are not scoped by this validator (per §Story Bundles §8 vs §Canonical Storage Layer distinction).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/no-story-state-in-place-mutation.test.ts` (new) — 4 test cases per §What to Change step 3.
2. No modifications to existing tests.

### Commands

1. `npm test --prefix tools/validators -- no-story-state-in-place-mutation` — targeted validator test.
2. `npm test --prefix tools/validators` — full validator suite regression.
3. `npm run build --prefix tools/validators` — compilation check.
