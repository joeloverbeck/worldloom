# SLTCAP-003: Backfill `created_at_page: null` on red-bunny SLB-3 storylets (SLT-20…SLT-25)

**Status**: DONE
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — introduces an engine-routed repair path for the storylet `created_at_page` field (no existing op can mutate a stored storylet); touches `tools/patch-engine/` and the affected `_source/storylets/*.yaml` records in `worlds/erotica-world/stories/red-bunny/`.
**Deps**: SLTCAP-001 (the end-state records must satisfy the now-required `created_at_page`). Sequence SLTCAP-003 to land with or immediately after SLTCAP-001 so the required-field flip does not leave on-disk records non-conforming.

## Problem

`worlds/erotica-world/stories/red-bunny/_source/storylets/SLT-20.yaml` through `SLT-25.yaml` (batch `SLB-3`) were committed without a `created_at_page` field; all of `SLT-1`…`SLT-19` carry the explicit `created_at_page: null`. This makes the SLB-3 blocks unselectable any turn they are reached transitively through a page's reference chain — `recursive_reference_closure` treats the absent field as off-branch (see SLTCAP-001). The motivating case: a `branching-story-turn-cycle` turn for `red-bunny` could not select `SLT-21` ("Settle the terms of safety"), the highest-salience exact-fit negotiation block, purely because of the missing field; it had to fall back to `SLT-10`.

These six records must be brought into conformance by setting `created_at_page: null` (their semantically-correct value — they are `author_batch` global-pool blocks created outside any branch page). `_source/storylets/*.yaml` is an engine-only surface (raw `Edit`/`Write` is hook-blocked and forbidden by `CLAUDE.md` §"Never bypass the patch engine for `_source/` writes"), and no existing patch op can mutate a stored storylet — so this backfill requires a new engine-routed repair path.

## Assumption Reassessment (2026-05-29)

1. Affected records confirmed by `grep -L 'created_at_page' worlds/erotica-world/stories/red-bunny/_source/storylets/*.yaml`-equivalent scan: exactly `SLT-20`, `SLT-21`, `SLT-22`, `SLT-23`, `SLT-24`, `SLT-25` lack the field; `SLT-1`…`SLT-19` carry `created_at_page: null`. The batch manifest is `worlds/erotica-world/stories/red-bunny/storylet-batches/SLB-3.md`.
2. No mutation path exists today: `tools/patch-engine/src/ops/` contains `create-story-record.ts` (create-only; `story-record-specs.ts` has no `created_at_page` default injection) and `update-record-field.ts` (world-canon CF/CH/etc. only — it rejects unsupported records at `update-record-field.ts:109`). There is no `supersede_slt_record` and no storylet field-update op. Confirmed by directory listing and grep.
3. Cross-artifact boundary under audit: the `_source/storylets/*.yaml` engine-only storage surface and the patch-engine op registry (`tools/patch-engine/src/ops/`, staged via `tools/patch-engine/src/commit/`). The repair must route through the engine, not raw file writes.
4. FOUNDATIONS principle restated: §Canonical Storage Layer / CLAUDE.md core rule — `_source/` mutations route exclusively through the patch engine; raw edits are blocked. A one-off shell/`sed` backfill or an ad-hoc node script that writes the YAML directly would bypass this contract. Therefore the FOUNDATIONS-aligned mechanism is a minimal **engine repair op**, mirroring the existing precedent of targeted repair ops (`repair-skipped-change-log-entry.ts`, and the `repair_story_character_authority_body_integrity` op in the envelope registry).
5. Implementation-decision item (resolve before coding): introduce a minimal idempotent op — proposed name `repair_storylet_created_at_page` — that sets `created_at_page: null` **only when the field is absent** and refuses to overwrite an existing value (so it cannot rewrite a legitimate `runtime_jit` `PG-<n>`). Reject the alternative raw-migration-script approach unless a reviewer explicitly accepts the patch-engine bypass; document the decision in the ticket before implementation if it changes.
6. Adjacent contradiction classification: the SLB-3 omission is the data consequence of the SLTCAP-002 authoring bug; this backfill is the required data-repair consequence, not a separate bug. Whether other bundles beyond `red-bunny` carry the same omission is out of scope here but should be checked by the implementer with the same scan and folded in if found (repository currently contains only `red-bunny` with the gap).

## Architecture Check

1. An engine-routed repair op is cleaner and more robust than a raw migration script: it preserves the single-writer/two-phase-commit guarantees of the patch engine, is replayable/auditable, and cannot silently corrupt a `runtime_jit` block (it is idempotent and absent-only). It mirrors the established `repair_*` op pattern rather than inventing a parallel mutation channel.
2. No backwards-compatibility aliasing/shims introduced: the records are brought into conformance with the SLTCAP-001 required schema; nothing tolerates the absent-field encoding afterward. The op is a one-time corrective, not a permanent fallback.

## Verification Layers

1. Invariant: every `red-bunny` storylet carries `created_at_page` after repair → codebase grep-proof (`grep -L created_at_page worlds/erotica-world/stories/red-bunny/_source/storylets/*.yaml` returns nothing).
2. Invariant: repaired records satisfy the SLTCAP-001 required schema → schema validation via `record_schema_compliance` on a plan that touches/reads them.
3. Invariant: `SLT-21` is selectable again → skill dry-run (`branching-story-turn-cycle` turn from `PG-4` selecting `SLT-21` passes `recursive_reference_closure` in `validate-patch-plan`).
4. Invariant: the repair op cannot overwrite a non-null `created_at_page` → patch-engine unit test (absent → set null; present → refuse/no-op).

## What to Change

### 1. Add a minimal engine repair op for storylet `created_at_page`

Add `repair_storylet_created_at_page` (or the reviewer-approved equivalent) to `tools/patch-engine/src/ops/`, registered in the op registry and envelope schema (`describe_envelope_schema` op list). Behavior: target a single `SLT-<n>` in a story bundle; if `created_at_page` is absent, write `created_at_page: null`; if present, no-op or hard-refuse (idempotent, never overwrites). Route staging through the existing `tools/patch-engine/src/commit/` two-phase path.

### 2. Apply the repair to SLT-20…SLT-25

Build and submit one patch plan with six repair ops (one per `SLT-20`…`SLT-25`) for `world_slug: erotica-world`, `story_slug: red-bunny`, through the normal validate → sign → submit flow.

### 3. Update the SLB-3 manifest only if it records field-level content

`storylet-batches/SLB-3.md` is a direct-write manifest; update it only if it materially mis-states the records (likely no change needed since `created_at_page` is not a manifest-surfaced field).

## Files to Touch

- `tools/patch-engine/src/ops/repair-storylet-created-at-page.ts` (new) and its registry wiring (modify `tools/patch-engine/src/ops/` index / envelope op list)
- `worlds/erotica-world/stories/red-bunny/_source/storylets/SLT-20.yaml`…`SLT-25.yaml` (modify, via the engine repair op — not raw edits)

## Out of Scope

- The schema-required change (SLTCAP-001) and the authoring-guidance fix (SLTCAP-002).
- Any change to `recursive-reference-closure.ts`.
- Backfilling bundles other than `red-bunny` unless the implementer's scan finds the same gap elsewhere.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -L 'created_at_page' worlds/erotica-world/stories/red-bunny/_source/storylets/SLT-2[0-5].yaml` returns no files (all six now carry the field).
2. The repair-op unit test: absent-field input gets `created_at_page: null`; present-field (`PG-<n>` or `null`) input is left unchanged / refused.
3. A `branching-story-turn-cycle` dry-run from `PG-4` selecting `SLT-21` passes `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan>` with zero `recursive_reference_closure` verdicts.

### Invariants

1. After repair, all 25 `red-bunny` storylets carry `created_at_page` (string `PG-<n>` or `null`).
2. The repair op is idempotent and absent-only; re-running it is a no-op and it never overwrites a non-null value.
3. All `_source/storylets` mutations went through the patch engine (no raw edits in the diff history for these files).

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/ops/repair-storylet-created-at-page.test.ts` (new) — absent→null, present→no-op/refuse, and bad-target rejection.
2. Reuse the SLTCAP-001 schema-compliance fixtures to assert the repaired records validate.

### Commands

1. `npm --prefix tools/patch-engine run build && npm --prefix tools/patch-engine test` (op behavior + staging).
2. Submit the six-op repair plan, then `grep -L 'created_at_page' worlds/erotica-world/stories/red-bunny/_source/storylets/*.yaml` (expect empty) and re-run the `PG-4 → SLT-21` turn dry-run to confirm `recursive_reference_closure` passes.
