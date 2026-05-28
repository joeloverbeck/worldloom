# SPEC93DECSTATUR-010: Shared contract templates — gate 7/9 redefinition, §8 retirement, schema field-optionality

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-record-schemas.md`, `.claude/skills/_shared-templates/story-state-contract.md`
**Deps**: archive/tickets/SPEC93DECSTATUR-002.md, archive/tickets/SPEC93DECSTATUR-003.md

## Problem

The shared story state contract is the schema-authoritative source the story-pipeline skills and validators read. SPEC-93 §4 amends it: `story-record-schemas.md` marks `plan.plan_hash` / `prose_plan_path` optional, documents the field-presence `state_hash` rule, and narrows the `compute-pg-hashes` mandate to `state_hash`-only; `story-state-contract.md §7` redefines gate 7 (state-delta grounding on the `PG`/`SE` record) and gate 9 (driver lawfulness on `SE`/`PG` driver fields), retires §8 (the page-plan 19-section enumeration) with a pointer to SPEC-92's scene-plan structure, and rewrites the "plan + (optional) prose-attach" pipeline note so state is authoritative at `PG`-record commit and prose is rendered at scene level.

## Assumption Reassessment (2026-05-28)

1. At intake, `_shared-templates/story-record-schemas.md` defined `plan_hash: sha256*` and `prose_plan_path: ...*` (required markers) with an "included in state_hash payload" note and a `compute-pg-hashes` mandate for PG-authoring skills; `_shared-templates/story-state-contract.md §7` defined the nine hard gates (gate 7 = "plan grounding", gate 9 = "Turn-Driver Lawfulness") and §8 = "Page Plan Minimum Contract" (19 sections). This ticket replaced those current-contract surfaces with the landed text below.
2. SPEC-93 §4 enumerates both contract amendments; §6 shared-templates bullet names both files; §8 AC6 (gates 7/9 validate the `PG`/`SE` record) + AC7 (contract amended consistently).
3. Cross-artifact boundary: this is the most load-bearing shared surface — `story-state-contract.md` is read by every Category 2c skill at hard-gate validation and is the canonical schema source per FOUNDATIONS §5b; the gate-9 validator-code rehoming (archive/tickets/SPEC93DECSTATUR-002.md) and the validator retirement (archive/tickets/SPEC93DECSTATUR-003.md) must land first so the contract documents the realized gate set. Skills consuming the gate definitions are reconciled in SPEC93DECSTATUR-007/008.
4. FOUNDATIONS Rule 1 (gate 7 grounding rehomes to the `PG` record's state delta) and Rule 7 (gate 9 retains the record-operating POV/observer firewall; gate 3 stays the authoritative plan-time MR firewall) — the contract must restate both consistently with the validator-code changes.
5. (HARD-GATE / Canon Safety) `story-state-contract.md §7` defines the nine hard gates that gate story-bundle record writes at engine pre-apply — redefining gate 7/9 is a Canon Safety Check surface change. The landed redefinition leaves gate 3 (the Mystery Reserve firewall) authoritative and unweakened; the rendered-prose firewall is handled by `scene_range_forbidden_mystery_resolution` at scene attach (SPEC-92).
6. (was template item 6 — schema field-optionality) `story-record-schemas.md` is the PG record schema-contract surface; mark `plan.plan_hash`/`prose_plan_path` optional, document the field-presence `state_hash` rule (legacy carry the fields, new omit them — no separate payload machinery), and narrow the `compute-pg-hashes` mandate to `state_hash`-only. Consumers: the story skills + validators reading the contract; the change is consistent with the relaxed `story-page.schema.json` (archive/tickets/SPEC93DECSTATUR-001.md).

## Architecture Check

1. Amending the contract after the validator code lands (Deps 002, 003) keeps the schema-authoritative source truthful to the realized gates — no window where the contract describes gates the code no longer enforces.
2. No backwards-compatibility shim: §8's 19-section enumeration is replaced by a pointer to the scene-plan structure (not kept alongside); the required-field markers become optional.

## Verification Layers

1. Gate 7/9 redefined on records -> manual review + FOUNDATIONS alignment check (the §7 gate text reads "state-delta grounding on the PG/SE record" / "driver lawfulness on SE/PG driver fields").
2. §8 retired -> codebase grep-proof (the "Page Plan Minimum Contract" 19-section enumeration is replaced by a scene-plan pointer).
3. Field-optionality documented -> codebase grep-proof (`story-record-schemas.md` marks `plan_hash`/`prose_plan_path` optional + field-presence rule; `compute-pg-hashes` mandate is `state_hash`-only).
4. MR firewall preserved -> FOUNDATIONS alignment check (gate 3 authoritative; rendered-prose firewall = scene `scene_range_forbidden_mystery_resolution`).

## Landed Changes

### 1. story-record-schemas.md

Marked `plan.plan_hash` and `prose_plan_path` as optional legacy-only PG fields, replaced the required page-plan hash workflow with the field-presence `state_hash` rule, and narrowed the `compute-pg-hashes` mandate so new PG-authoring flows compute `state_hash` only.

### 2. story-state-contract.md §7

Redefined gate 7 as state-delta grounding on `PG.state_snapshot`, `SE.state_delta`, selected `SLT`, and emitted choices. Redefined gate 9 as record-operating turn-driver lawfulness on `SE`/`PG` driver fields (`driver_records[]`, `pov_visibility`, driver kind), retaining the record-based driver-consistency and POV-observer-firewall logic. Gate 3 (MR firewall) text remains unchanged.

### 3. story-state-contract.md §8 + pipeline note

Retired §8's page-plan 19-section enumeration and replaced it with a short legacy-status note plus a pointer to SPEC-92's scene-plan structure. Rewrote the authority, branching, write-order, and usage notes so state is authoritative at `PG`-record commit and prose is rendered at scene level.

## Files to Touch

- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)

## Out of Scope

- The validator-code gate-9 rehoming (archive/tickets/SPEC93DECSTATUR-002.md) and validator retirement (archive/tickets/SPEC93DECSTATUR-003.md).
- FOUNDATIONS narrative amendments (archive/tickets/SPEC93DECSTATUR-011.md).
- The skill-side gate population (SPEC93DECSTATUR-007/008).

## Acceptance Criteria

### Tests That Must Pass

1. `story-state-contract.md §7` gate 7/9 text describes record-operating grounding/lawfulness; gate 3 text is unchanged.
2. `grep -n "Page Plan Minimum Contract\|19 numbered sections" .claude/skills/_shared-templates/story-state-contract.md` shows §8 retired (scene-plan pointer, not the enumeration).
3. `story-record-schemas.md` marks `plan_hash`/`prose_plan_path` optional + documents the field-presence rule + `state_hash`-only `compute-pg-hashes` mandate.

### Invariants

1. The contract is consistent with the relaxed `story-page.schema.json` (001), the rehomed gate-9 validators (002), and the retired validators (003).
2. Gate 3 (the Mystery Reserve firewall) remains the authoritative plan-time firewall on the `PG` record.

## Test Plan

### New/Modified Tests

1. `None — shared-contract ticket; verification is command-based (grep-proofs above) + manual review; downstream consumers (validators, skills) are exercised in their own tickets + SPEC93DECSTATUR-013.`

### Commands

1. `grep -n "state-delta grounding\|Turn-Driver Lawfulness\|Page Plan Minimum Contract\|plan_hash" .claude/skills/_shared-templates/story-state-contract.md .claude/skills/_shared-templates/story-record-schemas.md`
2. Consistency with realized code verified end-to-end in SPEC93DECSTATUR-013.

## Outcome

Completed: 2026-05-28

Updated the shared story contract templates for SPEC-93's planless PG state turn. `story-record-schemas.md` now marks `plan.plan_hash` and `prose_plan_path` as optional legacy-only fields, documents the field-presence `state_hash` payload rule, and gives the new `compute-pg-hashes` invocation as `state_hash`-only.

Updated `story-state-contract.md` so the Plan-Authority Boundary anchors on `PG` record commit, gate 7 is state-delta grounding, gate 9 is record-operating turn-driver lawfulness, §8 is a retired page-plan note pointing to §8a scene plans, and §9/§10 no longer require page-plan authoring or post-write plan-hash verification.

## Verification Result

PASS — `grep -n "state-delta grounding\|Turn-Driver Lawfulness\|Page Plan Minimum Contract\|plan_hash" .claude/skills/_shared-templates/story-state-contract.md .claude/skills/_shared-templates/story-record-schemas.md` showed gate 7 as `state-delta grounding`, gate 9 as `Turn-Driver Lawfulness`, no `Page Plan Minimum Contract` hit, and `plan_hash` only in the retired/legacy field-presence contexts.

PASS — `rg -n "Page Plan Minimum Contract|19 numbered sections" .claude/skills/_shared-templates/story-state-contract.md` returned no hits, proving §8 no longer carries the page-plan 19-section contract.

PASS — manual FOUNDATIONS/HARD-GATE alignment review confirmed gate 3 remains the mystery / invariant firewall and no forbidden-status `M` handling was weakened.

## Deviations

- The `PG.validation_trace` key remains `plan_grounding` because it is the existing schema key; this ticket redefines the gate's contract text to state-delta grounding without renaming the serialized key.
- `story-record-schemas.md §4.6` remains as a legacy prose-receipt schema for old bundles. New planless PG flows use scene prose receipts instead.
