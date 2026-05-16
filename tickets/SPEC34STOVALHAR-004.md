# SPEC34STOVALHAR-004: canon_baseline_drift structural validator with CH-window traversal

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new structural validator at `tools/validators/src/structural/canon-baseline-drift.ts`; new test fixture at `tools/validators/tests/structural/canon-baseline-drift.test.ts`; one-line registry append at `tools/validators/src/public/registry.ts`. No impact on existing validators.
**Deps**: None

## Problem

FOUNDATIONS §Story Bundles §4b (Canon Baseline Drift) requires *"story-pipeline skills must compare the parent page's recorded baseline against the current world-canon revision and classify drift as exactly one of: `compatible`, `grandfathered`, `requires_health_audit`, `requires_repair_turn`, or `promotion_or_retcon_conflict`."* Eight-Shared-Hard-Gate 2 (parent snapshot compatibility) reinforces this. Audit `reports/story-related-improvements-seventh-iteration.md` §11.3 line 834 names `canon_baseline_full_ch_window` as requiring full CH-window traversal AND per-CH `affected_fact_ids[]` cross-reference against bundle's active mirrored SFs. The existing `canon-drift-classification-evidence.ts` validator walks the CH window via `changeWindow(baseline, latest)` and checks that the rationale cites at least one CH from the window, but does NOT cross-reference each CH's `affected_fact_ids[]` against bundle SFs — a classification citing only the latest CH passes the existing validator even when an intervening CH affected a CF the bundle's SFs depend on.

## Assumption Reassessment (2026-05-16)

1. `tools/validators/src/structural/canon-drift-classification-evidence.ts` exists at the path the spec cites and uses `severity_mode: "warn"` (verified during `/reassess-spec` this session at `canon-drift-classification-evidence.ts:15`); D4 uses `severity_mode: "fail"` per spec §D4 line 206 because the §4b drift-classification contract is mandatory, not advisory. Existing validator already implements `changeWindow(baseline, latest)` at `canon-drift-classification-evidence.ts:103-115`; D4 does NOT re-implement window-walk — it builds on top of it with per-CF intersection logic.
2. SPEC-34 §D4 (lines 202-251) is the authoritative spec section; `/reassess-spec` rewrote the D4 logic during this session to (a) use the correct `affected_fact_ids` field name (was `affected_cf_ids` — verified at `tools/world-index/src/parse/yaml.ts:348`, `tools/world-index/src/parse/atomic.ts:514`, `tools/world-index/src/parse/semantic.ts:82`; the legacy `affected_cf_ids` alias is explicitly rejected by `record_schema_compliance` per `tools/validators/tests/structural/record-schema-compliance.test.js:85`), (b) cite `PG.validation_trace.parent_snapshot_compatibility` (primary) or page-producing `SE.world_logic_rationale` (secondary) as the classification-read locations per contract §4.2 lines 167-179 and existing-validator pattern at `canon-drift-classification-evidence.ts:79-89`, and (c) close-set validate the recorded classification value.
3. Shared boundary under audit: (i) `tools/validators/src/public/registry.ts` `structuralValidators` array (line 29); (ii) `tools/validators/src/structural/canon-drift-classification-evidence.ts` — complementary validator on the same PG/CH-window surface; D4 reads classification from the same `PG.validation_trace.parent_snapshot_compatibility` + `SE.world_logic_rationale` paths the existing validator reads (per `canon-drift-classification-evidence.ts:79-89`); (iii) world-canon CH-record retrieval surface — D4 reads `worlds/<slug>/_source/change-log/CH-<integer>.yaml` records via existing index `queryStructuralRecords(ctx)` from `tools/validators/src/structural/utils.ts` (preferred, deterministic in `world-validate` context) rather than a fresh MCP call; CH schema confirmed: `affected_fact_ids: [CF-<integer>]`.
4. FOUNDATIONS principle motivating this ticket — §Story Bundles §4b (Canon Baseline Drift) + §7 gate 2 (parent snapshot compatibility): the validator enforces per-CF window-intersection coverage AND closed-enum classification-value enforcement at the validator layer, formalizing the contract's MUST-language at lines 165-179.
5. Adjacent contradiction noted at reassess-spec time: existing `canon-drift-classification-evidence.ts` uses `severity_mode: "warn"` while D4 uses `severity_mode: "fail"`; both fire on overlapping triggers (`create_pg_record` patches). Classified as **required consequence of this ticket** — the severity divergence is intentional per spec §D4 line 206 (existing validator's check is rationale-form-presence which is advisory; D4's check is per-CF intersection coverage which is mandatory). Both validators should produce findings on the same patch plan when applicable; they answer different questions and produce different verdicts.
6. Mismatch + correction: spec §Verification item 4 cites `npm run test -- --grep 'canon-baseline-drift'` (Mocha syntax); the actual runner is node:test (`node --test dist/tests/**/*.test.js` per `tools/validators/package.json`). Corrected to direct invocation `node --test dist/tests/structural/canon-baseline-drift.test.js`. Mechanical drift; spec intent preserved.

## Architecture Check

1. Standalone validator (not extension of existing `canon-drift-classification-evidence.ts`) is cleaner because the two validators check distinct invariants per spec §D4 line 232: existing asks *"does the rationale cite at least one CH from the drift window?"* (advisory rationale-form check); D4 asks *"is the classification value present-when-required AND in the closed enum, AND for every intervening CH whose `affected_fact_ids[]` intersects the bundle's active mirrored SFs, does the cited classification reference that CH?"* (mandatory per-CF coverage check). D4 does NOT re-implement the rationale-form check the existing validator owns; the boundary is documented per spec §D4 line 230.
2. No backwards-compatibility aliasing/shims introduced. Net-new validator; existing `canon-drift-classification-evidence.ts` unchanged. The `affected_fact_ids` field name is the current schema name (not a new alias).

## Verification Layers

1. **CH-window walk + per-CF intersection** → codebase grep-proof (`grep -n 'affected_fact_ids\|changeWindow\|canon_revision' tools/validators/src/structural/canon-baseline-drift.ts`) + node:test fixture Cases 1-3 prove same-head-PASS, no-intersecting-CH-PASS, intersecting-CH-without-citation-FAIL.
2. **Drift-without-classification detection** → fixture Case 4 (drift exists, no classification recorded → FAIL with `_unclassified`).
3. **Closed-enum classification-value validation** → fixture Case 5 (out-of-set value like `latest_only_drift` → FAIL with `_classification_invalid`).
4. **Classification-read location** → codebase grep-proof of read paths (`PG.validation_trace.parent_snapshot_compatibility` + `SE.world_logic_rationale`) matching `canon-drift-classification-evidence.ts:79-89` pattern.
5. **Registry integration** → codebase grep-proof (`grep -n 'canonBaselineDrift' tools/validators/src/public/registry.ts` returns import + array-entry).
6. **FOUNDATIONS alignment** → FOUNDATIONS.md §Story Bundles §4b + §7 gate 2 cited in implementation comments; §Boundary clause referencing `canon-drift-classification-evidence.ts` documents the complementary-overlap design decision per spec §D4 line 230.

## What to Change

### 1. New validator implementation

Create `tools/validators/src/structural/canon-baseline-drift.ts` following the sibling pattern (especially `canon-drift-classification-evidence.ts` for parallel CH-window-walk shape):

- `severity_mode: "fail"`.
- `applies_to(ctx)`: `ctx.run_mode === "full-world" || ctx.patch_plan?.patches.some(p => p.op === "create_pg_record") === true || touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/pages\/PG-\d+\.yaml$/)` (mirrors `canon-drift-classification-evidence.ts:16-19`).
- Logic per SPEC-34 §D4 lines 212-233:
  - **Step 1**: Determine current world-canon CH head from indexed `change_log_entry` records via `queryStructuralRecords(ctx)` (same source the existing validator uses at `canon-drift-classification-evidence.ts:22-30`).
  - **Step 2**: For each `PG-<integer>` record:
    - If `PG.state_snapshot.canon_revision` is null → PASS.
    - If `PG.state_snapshot.canon_revision == current_head` → PASS.
    - Otherwise walk the CH window from `canon_revision + 1` through `current_head`:
      - For each intervening `CH-<integer>` entry, read `CH.affected_fact_ids[]`.
      - For each affected CF, scan the bundle for active mirrored `SF` records whose `derived_from[]` contains that CF id.
      - If any active mirrored SF references an affected CF AND the page's recorded drift classification does not cite this CH → emit `canon_baseline_drift_window_incomplete`.
  - **Step 3**: Read classification from `PG.validation_trace.parent_snapshot_compatibility` (primary) OR page-producing `SE.world_logic_rationale` (secondary; located via `SE` whose `id` matches `PG.input.resolved_event_id`), matching `canon-drift-classification-evidence.ts:79-89` pattern.
  - **Step 4**: If drift exists AND no classification recorded → emit `canon_baseline_drift_unclassified`. If classification recorded but value ∉ `{compatible, grandfathered, requires_health_audit, requires_repair_turn, promotion_or_retcon_conflict}` → emit `canon_baseline_drift_classification_invalid`.

### 2. Diagnostics

- `canon_baseline_drift_window_incomplete` — fail. Cites the PG, the missed CH-<integer>, the affected CF, and the active mirrored SF.
- `canon_baseline_drift_unclassified` — fail. Cites the PG with drift but no recorded classification.
- `canon_baseline_drift_classification_invalid` — fail. Cites the PG, the offending classification value, and the closed-set values.

### 3. Test fixtures

Create `tools/validators/tests/structural/canon-baseline-drift.test.ts` with 5 cases per SPEC-34 §D4 lines 243-247:

- Case 1: PG with `canon_revision == current_head` → PASS.
- Case 2: PG `canon_revision: CH-3`, current head `CH-7`, intervening CHs do not affect any CF the bundle references → PASS.
- Case 3: PG `canon_revision: CH-3`, current head `CH-7`, intervening `CH-5` affects a CF referenced by an active mirrored SF, classification cites only `CH-7` → FAIL with `canon_baseline_drift_window_incomplete`.
- Case 4: PG `canon_revision: CH-3`, current head `CH-7`, no classification recorded → FAIL with `canon_baseline_drift_unclassified`.
- Case 5: PG with classification value `latest_only_drift` (not in closed set) → FAIL with `canon_baseline_drift_classification_invalid`.

### 4. Registry append

Add to `tools/validators/src/public/registry.ts`:

- Import: `import { canonBaselineDrift } from "../structural/canon-baseline-drift.js";`
- Array entry in `structuralValidators` at a coherent position (e.g., adjacent to existing `canonDriftClassificationEvidence` since both target the PG/CH-window surface).

## Files to Touch

- `tools/validators/src/structural/canon-baseline-drift.ts` (new)
- `tools/validators/tests/structural/canon-baseline-drift.test.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — 1 import line + 1 array entry)

## Out of Scope

- Refactor or merger of `canon-drift-classification-evidence.ts` — explicitly out of scope per spec §Out of Scope line 288. The existing validator's rationale-form check stays as-is.
- CH-window memoization performance optimization — explicitly deferred per spec §Risks line 303 "CH-window traversal performance for D4"; correctness-first MVP first, revisit if `world-validate` runtime regresses.
- D1/D2/D3 implementations (separate tickets in this batch).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && node --test dist/tests/structural/canon-baseline-drift.test.js` — all 5 fixture cases pass.
2. `cd tools/validators && grep -nE 'canonBaselineDrift' src/public/registry.ts` — returns ≥2 matches (1 import + 1 array entry).
3. `cd tools/validators && npm run test` — full validators suite green; confirm `canon-drift-classification-evidence.test.ts` still passes (no regression from the complementary check sharing the PG/CH-window surface).

### Invariants

1. Every `PG` with `state_snapshot.canon_revision != current_world_canon_head` MUST have a recorded drift classification (in `validation_trace.parent_snapshot_compatibility` or its issuing SE's `world_logic_rationale`) whose value is in the closed enum `{compatible, grandfathered, requires_health_audit, requires_repair_turn, promotion_or_retcon_conflict}`.
2. For every intervening CH (from `canon_revision + 1` through `current_head`) whose `affected_fact_ids[]` intersects the bundle's active mirrored SF `derived_from[]`, the page's recorded drift classification MUST cite that CH explicitly. Missing-citation cases are hard failures.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/canon-baseline-drift.test.ts` (new) — exercises the 5 fixture cases above; covers same-head-PASS, no-intersection-PASS, intersection-without-citation-FAIL, unclassified-FAIL, and invalid-enum-value-FAIL paths.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/structural/canon-baseline-drift.test.js` (targeted)
2. `cd tools/validators && npm run test` (full suite — confirms no regressions; specifically that `canon-drift-classification-evidence.test.ts` still passes since both validators fire on the same `create_pg_record` patch trigger).
3. The targeted command is the correct verification boundary for the validator's own correctness; the full-suite command catches integration regressions including the complementary-validator overlap on the PG/CH-window surface.
