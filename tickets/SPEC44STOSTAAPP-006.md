# SPEC44STOSTAAPP-006: `page_affordance_integrity` validator

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new structural validator `page_affordance_integrity` registered in `tools/validators/src/public/registry.ts`; consumes the `$defs.PageAffordance` schema component extracted in `archive/tickets/SPEC44STOSTAAPP-001.md`. No impact on existing validators.
**Deps**: archive/tickets/SPEC44STOSTAAPP-001.md

## Problem

`tools/validators/src/schemas/story-page.schema.json` defines `visible_affordances` as an array of affordance objects with structural constraints (`ordinal` integer ≥ 0, `label` minLength 1, `grounded_in` array of STLOC/STOBJ ids, `available_to` array of STENT ids, `action_families` array from a 20-value enum). Schema validation catches form-violations (missing required fields, wrong types), but four runtime integrity invariants are NOT enforced today:

1. **Ordinal uniqueness within a page**: two affordances on the same `PG.state_snapshot.visible_affordances` array can carry the same `ordinal` integer; schema permits it, but downstream choice grounding (which references affordances by ordinal) becomes ambiguous.
2. **Grounded-in records must be ACTIVE in the page's snapshot**: an affordance's `grounded_in: [STOBJ-4]` references a STOBJ that must appear in `state_snapshot.active_records.STOBJ`; today nothing enforces this, so an affordance can ground in a record that was closed or superseded out.
3. **Available-to entities must be ACTIVE**: same as #2 for STENT references in `available_to`.
4. **Action_families values from the closed enum**: schema already enforces this at parse-time; the validator adds runtime confirmation as a defense-in-depth check (catches enum drift between schema and consumer code).

Per SPEC-44 §Approach Phase 3 step 10, this validator codifies the four integrity invariants and emits `fail` for any violation. The `$defs.PageAffordance` extraction in `archive/tickets/SPEC44STOSTAAPP-001.md` supplies the validator with a reusable type reference rather than forcing the validator to duplicate the schema shape inline.

## Assumption Reassessment (2026-05-18)

1. `tools/validators/src/schemas/story-page.schema.json` now carries the `visible_affordances.items` shape under `$defs.PageAffordance`, with the original site referencing it via `$ref`. The 20 action_families enum values are: move, evade, pursue, perceive, investigate, communicate, persuade, negotiate, bond, oppose, harm, protect, control, transfer, use, make_change, ritual_protocol, recover, wait, decide. The shape requires `ordinal` (integer, minimum 0), `label` (string, minLength 1), `grounded_in` (array of `^(STLOC|STOBJ)-[0-9]+$`), `available_to` (array of `^STENT-[0-9]+$`), `action_families` (array with `minItems: 1`). `additionalProperties: false`.
2. SPEC-44 §Approach Phase 3 step 10 specifies the four integrity rules; §Out of Scope confirms no schema-shape change beyond Phase 1's $defs extraction. Existing validator `recursive-reference-closure.ts` validates that `visible_affordances` reference syntax is well-formed, but does not enforce ordinal-uniqueness, active-grounded-in, active-available-to, or action-family enum runtime.
3. **Cross-boundary surface under audit**: this validator consumes both `story-page.schema.json` `$defs.PageAffordance` (post-Phase-1 extraction) AND the page record's `state_snapshot.active_records` (to resolve grounded_in / available_to active-status checks). The boundary is the page-record + schema-shape pair.
4. **FOUNDATIONS principle**: §Story Bundles §5b (Schema-Minimalism At Story Scope) — affordances are page-local projections of durable records (STLOC / STOBJ / STENT); the integrity rules enforce that affordance fields are load-bearing (each named ordinal addresses one affordance; each grounded_in references an actually-active record).
5. **Canon Safety surface touched**: the new validator is a structural pre-apply gate under `tools/validators/src/structural/` per the per-ticket-type granularity rule. It gates page-record submission; the change does NOT weaken the Mystery Reserve firewall — affordance integrity is internal page-snapshot consistency, distinct from mystery-resolution gating.

## Architecture Check

1. **Runtime validator complements schema extraction.** Schema (`$defs.PageAffordance`) enforces parse-time form; the validator enforces runtime referential integrity (ordinal uniqueness within a page; grounded_in / available_to active-status; action_families enum confirmation). The two are layered: schema catches form; validator catches relationships across page-record boundaries.
2. **No backwards-compatibility shim.** The validator emits `fail` for any violation. Pre-SPEC-44 page records with valid affordances continue to validate clean; the validator does not penalize legitimate prior state.

## Verification Layers

1. **Validator registered with `fail` severity** → codebase grep-proof: `grep -n 'page_affordance_integrity' tools/validators/src/public/registry.ts` returns a registry entry with `severity_mode: "fail"`.
2. **Validator fires on duplicate ordinal** → synthetic-fixture test: a page record with two affordances sharing `ordinal: 2` returns a `fail` verdict.
3. **Validator fires on inactive grounded_in** → synthetic-fixture test: an affordance with `grounded_in: [STOBJ-4]` where `STOBJ-4` is not in `state_snapshot.active_records.STOBJ` returns a `fail` verdict.
4. **Validator fires on inactive available_to** → synthetic-fixture test: an affordance with `available_to: [STENT-1]` where `STENT-1` is not in `state_snapshot.active_records.STENT` returns a `fail` verdict.
5. **Validator fires on unknown action_families value** → synthetic-fixture test: an affordance with `action_families: ["fly"]` (not in the 20-value enum) returns a `fail` verdict.
6. **Validator validates clean on a well-formed page** → synthetic-fixture test: a page with two affordances at distinct ordinals, all grounded_in / available_to records active, all action_families from the closed enum, returns a clean verdict.

## What to Change

### 1. Author the validator module

Create `tools/validators/src/structural/page-affordance-integrity.ts`. The module exports a `pageAffordanceIntegrity` validator following the existing structural-validator pattern. The validator:
- Targets the pre-apply and full validation phases (`applies_to: ["pre_apply", "full"]`).
- Iterates each `PG` record's `state_snapshot.visible_affordances` array.
- For each page:
  - Build a set of `ordinal` values; emit `fail` on any duplicate.
  - For each affordance, check `grounded_in[i]` ∈ `state_snapshot.active_records.STLOC ∪ state_snapshot.active_records.STOBJ`; emit `fail` per unresolved reference.
  - For each affordance, check `available_to[i]` ∈ `state_snapshot.active_records.STENT`; emit `fail` per unresolved reference.
  - For each affordance, check `action_families[i]` ∈ the closed 20-value enum; emit `fail` per unknown value.
- Embed the 20-value action_families enum as a typed constant (matching `story-page.schema.json` `$defs.PageAffordance` post-Phase-1); the constant is the single source of truth for this validator's enum check.

### 2. Register the validator

Edit `tools/validators/src/public/registry.ts` to add an import for the new validator module and a registry entry alongside the other page-record structural validators.

### 3. Author the test module

Create `tools/validators/tests/structural/page-affordance-integrity.test.ts` covering:
- **Negative test 1 (duplicate ordinal)**: a page with two affordances sharing `ordinal: 2` → expect `fail`.
- **Negative test 2 (inactive grounded_in)**: an affordance grounded in STOBJ-4 where STOBJ-4 is absent from `state_snapshot.active_records.STOBJ` → expect `fail`.
- **Negative test 3 (inactive available_to)**: an affordance available_to STENT-1 where STENT-1 is absent from `state_snapshot.active_records.STENT` → expect `fail`.
- **Negative test 4 (unknown action_family)**: an affordance with `action_families: ["fly"]` → expect `fail`.
- **Positive test (well-formed)**: a page with two affordances at distinct ordinals, all grounded_in / available_to records active, all action_families from the closed enum → expect clean verdict.

## Files to Touch

- `tools/validators/src/structural/page-affordance-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — add import + registry entry)
- `tools/validators/tests/structural/page-affordance-integrity.test.ts` (new)

## Out of Scope

- Changes to `story-page.schema.json` `visible_affordances` shape beyond `archive/tickets/SPEC44STOSTAAPP-001.md`'s `$defs.PageAffordance` extraction.
- Choice grounding integrity (which references affordance ordinals from `CHC.grounded_in.affordance_ordinals`) — covered by the existing `choice-grounding-accessibility.ts` validator (if present) or out of scope for SPEC-44.
- Validation of `state_snapshot.active_records` shape — covered by ticket SPEC44STOSTAAPP-008's `active_records_full_shape` validator.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators -- page-affordance-integrity` passes all 5 test cases (4 negative, 1 positive).
2. `npm test --prefix tools/validators` exits 0 (full validator suite regression).
3. `npm run build --prefix tools/validators` exits 0.

### Invariants

1. Within a single page record, all `visible_affordances[i].ordinal` values are unique.
2. Every `visible_affordances[i].grounded_in[j]` reference resolves to an active STLOC or STOBJ record in the same page's `state_snapshot.active_records`.
3. Every `visible_affordances[i].available_to[j]` reference resolves to an active STENT record in the same page's `state_snapshot.active_records`.
4. Every `visible_affordances[i].action_families[j]` value is drawn from the closed 20-value enum (matching schema's `$defs.PageAffordance.properties.action_families.items.enum`).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/page-affordance-integrity.test.ts` (new) — 5 test cases per §What to Change step 3.
2. No modifications to existing tests.

### Commands

1. `npm test --prefix tools/validators -- page-affordance-integrity` — targeted validator test.
2. `npm test --prefix tools/validators` — full validator suite regression.
3. `npm run build --prefix tools/validators` — compilation check.
