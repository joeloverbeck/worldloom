# SPEC95SCECOVIND-003: Rename PG/SE causal-state validators

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Large
**Engine Changes**: Yes — `tools/validators` registry + two structural validator modules (renamed) + their colocated and integration tests + README inventory; plus `.claude/skills/_shared-templates/story-state-contract.md` §7 gate-9 reference. Behavior-preserving rename only.
**Deps**: None

## Problem

Two registered validators carry `page-plan`/`page` names but validate **PG/SE causal state**, not page-plan markdown (which is gone): `page_plan_turn_driver_consistency` (validates `PG.input.resolved_event_id` ↔ `SE.created_at_page` / `turn_driver`) and `page_affordance_integrity` (validates `PG.state_snapshot.visible_affordances` against active records). With page-plan authoring retired (SPEC-93), the names falsely imply a page-plan architecture. Rename them to causal-state vocabulary so the surviving validator set no longer implies the retired architecture. Behavior is unchanged — rename only. (SPEC-95 §2 D3, AC#4.)

## Assumption Reassessment (2026-05-29)

1. The two validators exist and are registered: `tools/validators/src/structural/page-plan-turn-driver-consistency.ts` (symbol `pagePlanTurnDriverConsistency`; `const VALIDATOR = "page_plan_turn_driver_consistency"`) and `tools/validators/src/structural/page-affordance-integrity.ts` (symbol `pageAffordanceIntegrity`; `name: "page_affordance_integrity"`), both imported and arrayed in `tools/validators/src/public/registry.ts` (imports + registered-validators array). `page-plan-active-pressure.ts` is a NOT-registered helper module (not a validator) and is **left as-is** — no rename (SPEC-95 §1). New names per SPEC-95 reassessment Q2: `page_plan_turn_driver_consistency` → `pg_se_turn_driver_consistency` (symbol `pgSeTurnDriverConsistency`); `page_affordance_integrity` → `pg_affordance_integrity` (symbol `pgAffordanceIntegrity`).
2. SPEC-95 §2 D3 + §5 + AC#4: rename across registry + source filenames + symbol names + colocated tests + integration/registry tests + the `tools/validators/README.md` inventory + the `_shared-templates/story-state-contract.md` §7 Hard-Gate-9 enforcing-validator row + any `applies_to` / diagnostic-message strings. Behavior unchanged (tests pass on renamed symbols).
3. Cross-skill / cross-artifact boundary under audit: the **validator registry name-contract** (the snake_case registered names consumed by the framework run-loop and asserted by `registry.test.ts`), the imported-symbol contract (the camelCase exports consumed by colocated + integration tests), and the shared `_shared-templates/story-state-contract.md` §7 gate-9 reference that names `page_plan_turn_driver_consistency` as an enforcing validator. **Blast-radius enumeration confirmed by grep (the spec's widened §5 sweep):** beyond the spec's illustrative §5 list, five sibling-spec integration tests import the camelCase symbol `pagePlanTurnDriverConsistency` directly — `spec85-multi-actor-collision-confrontation`, `spec85-secret-reveal-ledger-clue`, `spec85-offstage-bridge-sabotage`, `spec85-clock-fire-route-closes`, and `spec76-red-kiln-ambush`. They are in-scope by the §5 sweep's "renamed-validator references are in scope" triage rule and are added to Files to Touch below; the rename is behavior-preserving (the validators stay live and registered; tests assert the same firing behavior under the new symbol/name), so updating these sibling-spec tests carries no production-behavior change — symbol import + assertion string updated only (Rule 6: rename, not removal).
4. FOUNDATIONS — validators are named by what they validate (SPEC-95 §6 alignment row). Renaming the two PG/SE-causal validators to causal-state vocabulary (`pg_se_*` / `pg_*`) keeps the surviving validator set free of the retired page-plan architecture's naming. No validation rule is weakened, added, or removed; the firing semantics of both validators are byte-identical pre- and post-rename.
5. Canon Safety surface: both renamed validators are **structural validators under `tools/validators/src/structural/`** that gate story-bundle record writes at engine pre-apply time — `pg_se_turn_driver_consistency` checks `PG.input.resolved_event_id` ↔ `SE.created_at_page`/`turn_driver` linkage; `pg_affordance_integrity` checks `PG.state_snapshot.visible_affordances` against active records (this is the §Step 6.2(c) per-ticket-type item-5 trigger: renaming a structural validator). The rename does NOT alter either validator's accept/reject behavior and therefore does **not** weaken the Mystery Reserve firewall or any pre-apply gate — only the symbol and registered-name strings change. `story-state-contract.md` §7 Hard-Gate-9 cites `page_plan_turn_driver_consistency` as a record-only enforcing validator; that citation is updated to the new name in the same rename.
6. (was template item 7 — rename blast radius) Pipeline-wide grep for the old symbols/names across `tools/`, `.claude/skills/` (excluding `dist/`, `archive/`) yields the 16 sites enumerated in Files to Touch: 3 source/registry, 2 colocated tests, 1 registry test, 8 integration tests, 1 README, 1 shared-template. After the rename, `grep -rn "page_plan_turn_driver_consistency\|page_affordance_integrity\|pagePlanTurnDriverConsistency\|pageAffordanceIntegrity" tools/ .claude/skills/ | grep -v dist | grep -v archive` must return zero matches.

## Architecture Check

1. A behavior-preserving rename across all 16 reference sites in one ticket is the correct unit of review — a rename is verified as a whole (old name fully gone, new name consistently present everywhere), and splitting it across tickets would leave the build red between landings. The new names (`pg_se_turn_driver_consistency` names the PG↔SE linkage it checks; `pg_affordance_integrity` parallels the `pg_` prefix) describe what the validators actually validate.
2. No backwards-compatibility alias: the old names are removed outright, not retained as aliases. The framework run-loop, the registry assertions, and every test consume the new names directly.

## Verification Layers

1. Old names fully removed → codebase grep-proof: `grep -rn "page_plan_turn_driver_consistency\|page_affordance_integrity\|pagePlanTurnDriverConsistency\|pageAffordanceIntegrity" tools/ .claude/skills/ | grep -v dist | grep -v archive` returns zero matches.
2. New names consistently present → grep-proof: `pg_se_turn_driver_consistency` / `pg_affordance_integrity` resolve in `registry.ts`, the renamed source files, `registry.test.ts`, and the README inventory.
3. Behavior unchanged → test dry-run: `cd tools/validators && npm test` passes with the renamed colocated + integration tests asserting the same verdicts on the renamed symbols (no assertion-logic change, only name strings).
4. Shared-template reference updated → grep-proof: `_shared-templates/story-state-contract.md` §7 Hard-Gate-9 row names `pg_se_turn_driver_consistency`, not the old name.

## What to Change

### 1. Rename the two source modules + symbols (`tools/validators/src/structural/`)

Rename `page-plan-turn-driver-consistency.ts` → `pg-se-turn-driver-consistency.ts` (export `pagePlanTurnDriverConsistency` → `pgSeTurnDriverConsistency`; `const VALIDATOR = "page_plan_turn_driver_consistency"` → `"pg_se_turn_driver_consistency"`); rename `page-affordance-integrity.ts` → `pg-affordance-integrity.ts` (export `pageAffordanceIntegrity` → `pgAffordanceIntegrity`; `name: "page_affordance_integrity"` → `"pg_affordance_integrity"`). Update any `applies_to` / diagnostic-message strings inside both modules that embed the old name.

### 2. Update the registry (`tools/validators/src/public/registry.ts`)

Update the two `import { ... } from "../structural/<old-file>.js"` lines to the new filenames + symbols, and the two registered-validators array entries.

### 3. Rename + update colocated tests

Rename `tools/validators/tests/structural/page-plan-turn-driver-consistency.test.ts` → `pg-se-turn-driver-consistency.test.ts` and `tools/validators/tests/structural/page-affordance-integrity.test.ts` → `pg-affordance-integrity.test.ts`; update their imports, symbol references, and asserted name strings.

### 4. Update test consumers of the names (registry + integration)

Update the name-list assertion in `tools/validators/tests/structural/registry.test.ts`; update the snake-name assertions in `spec44-append-only-supersession.test.ts`, `spec92-scene-layer-capstone.test.ts`, `validate-patch-plan.test.ts`; update the camelCase-symbol imports/usages in `spec85-multi-actor-collision-confrontation.test.ts`, `spec85-secret-reveal-ledger-clue.test.ts`, `spec85-offstage-bridge-sabotage.test.ts`, `spec85-clock-fire-route-closes.test.ts`, `spec76-red-kiln-ambush.test.ts`.

### 5. Update docs + shared template

Update the validator inventory in `tools/validators/README.md` (the two old names → new names) and the §7 Hard-Gate-9 enforcing-validator row in `.claude/skills/_shared-templates/story-state-contract.md` (`page_plan_turn_driver_consistency` → `pg_se_turn_driver_consistency`).

## Files to Touch

- `tools/validators/src/structural/page-plan-turn-driver-consistency.ts` → rename to `pg-se-turn-driver-consistency.ts` (modify+move)
- `tools/validators/src/structural/page-affordance-integrity.ts` → rename to `pg-affordance-integrity.ts` (modify+move)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/page-plan-turn-driver-consistency.test.ts` → rename to `pg-se-turn-driver-consistency.test.ts` (modify+move)
- `tools/validators/tests/structural/page-affordance-integrity.test.ts` → rename to `pg-affordance-integrity.test.ts` (modify+move)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/spec44-append-only-supersession.test.ts` (modify)
- `tools/validators/tests/integration/spec92-scene-layer-capstone.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `tools/validators/tests/integration/spec85-multi-actor-collision-confrontation.test.ts` (modify)
- `tools/validators/tests/integration/spec85-secret-reveal-ledger-clue.test.ts` (modify)
- `tools/validators/tests/integration/spec85-offstage-bridge-sabotage.test.ts` (modify)
- `tools/validators/tests/integration/spec85-clock-fire-route-closes.test.ts` (modify)
- `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts` (modify)
- `tools/validators/README.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)

## Out of Scope

- Any change to either validator's firing logic, thresholds, or accept/reject behavior — rename only.
- `page-plan-active-pressure.ts` (NOT-registered helper) — left as-is, no rename.
- Adding, removing, or re-registering any other validator.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` passes (build + `node --test`) with all colocated and integration tests green on the renamed symbols/names.
2. `grep -rn "page_plan_turn_driver_consistency\|page_affordance_integrity\|pagePlanTurnDriverConsistency\|pageAffordanceIntegrity" tools/ .claude/skills/ | grep -v dist | grep -v archive` → zero matches.
3. `grep -rn "pg_se_turn_driver_consistency\|pg_affordance_integrity" tools/validators/src/public/registry.ts tools/validators/README.md` → both new names present in registry + inventory.

### Invariants

1. The validator set's COUNT is unchanged (rename, not add/remove); both validators remain registered.
2. Each validator's verdict behavior is byte-identical pre- and post-rename — no `applies_to`, threshold, or logic change.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/pg-se-turn-driver-consistency.test.ts` (renamed from `page-plan-turn-driver-consistency.test.ts`) — same assertions, renamed symbol/name.
2. `tools/validators/tests/structural/pg-affordance-integrity.test.ts` (renamed from `page-affordance-integrity.test.ts`) — same assertions, renamed symbol/name.
3. `tools/validators/tests/structural/registry.test.ts` + the 8 integration tests — name/symbol-string updates only; assertion logic unchanged.

### Commands

1. `cd tools/validators && npm test`
2. `grep -rn "page_plan_turn_driver_consistency\|page_affordance_integrity\|pagePlanTurnDriverConsistency\|pageAffordanceIntegrity" tools/ .claude/skills/ | grep -v dist | grep -v archive` (expect zero matches)
3. The validators build+test boundary plus the pipeline-wide grep is the correct verification: the validators package's own suite proves behavior preservation, and the grep proves the rename reached every reference site (including the shared-template and sibling-spec test consumers).
