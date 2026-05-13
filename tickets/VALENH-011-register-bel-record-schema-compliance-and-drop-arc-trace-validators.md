# VALENH-011: Register `BEL` in `record_schema_compliance`; drop ARC_TRACE-related validators

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/` (record-schema validator + structural validators referencing ARC_TRACE)
**Deps**: `archive/tickets/MCPENH-040-register-bel-id-class-and-drop-arctrace.md` (BEL id-class registration), `archive/tickets/PEENH-007-add-create-bel-record-op-and-drop-create-arctrace-record.md` (patch-engine `create_bel_record` op).

## Problem

The rebuilt story-skill family introduces a first-class `BEL` (Belief) record class for story-bundle records (per `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md` §C.0 + §F.3). The shared story state contract §4.1 specifies the 12-field BEL schema. The `record_schema_compliance` validator at `tools/validators/src/rules/` must enforce this schema for every BEL record submitted via `create_bel_record` (`archive/tickets/PEENH-007-add-create-bel-record-op-and-drop-create-arctrace-record.md`).

The validator framework currently does not know about the `BEL` class — its absence means BEL records pass through the validator unchecked, defeating Rule 1 (No Floating Facts) at the validator layer.

The greenfield plan also deletes `ARC_TRACE` as a record class. Existing structural validators referencing ARC_TRACE (verified at gap-filler time: `tools/validators/src/structural/snapshot-replay-equality.ts` plus related test fixtures) must be dropped or refactored to remove ARC_TRACE dependence.

## Assumption Reassessment (2026-05-13)

1. **Validator surface verified.** `tools/validators/src/rules/` houses Rule-1-7 enforcement; `tools/validators/src/structural/` houses structural validators (snapshot-replay-equality, recursive-reference-closure, state-snapshot-integrity). The `record_schema_compliance` validator lives in this tree.
2. **`BEL` schema canonical source.** `.claude/skills/_shared-templates/story-state-contract.md` §4.1 is the canonical schema reference (12 fields: `id`, `story_id`, `created_at_page`, `supersedes`, `holder`, `claim`, `truth_relation`, `confidence`, `visibility`, `basis.source_event`, `consequences.opens[]`, `consequences.constrains_choices[]`).
3. **Cross-skill schema parity.** The validator's accept/reject decision must match what the patch engine (`archive/tickets/PEENH-007-add-create-bel-record-op-and-drop-create-arctrace-record.md`) writes. A divergence would either accept patch-engine-rejected records (impossible by definition of validator order) or reject patch-engine-accepted records (causing false-positive validation failures on otherwise-valid plans).
4. **FOUNDATIONS principle.** Realizes Rule 1 (No Floating Facts) at the validator surface for the new BEL class; without this ticket, BEL records evade the structural completeness check that every other story-bundle record class receives.
5. **HARD-GATE / canon-write impact.** None. The validator operates at the story-bundle scope; Mystery Reserve firewall surfaces and world-canon Rule-1-7 enforcement are unchanged.
6. **Schema extension impact.** Additive registration of BEL is straightforward; the field list comes from the contract. ARC_TRACE removal is destructive in the validator scope — confirm no production worlds reference ARC_TRACE records in `state_snapshot.active_records` or replay logic before merging; per the greenfield plan §B and the legacy-removal pass, no live ARC_TRACE records exist.
7. **Rename / removal blast radius.** `grep -rn "ARCTRACE\|ARC_TRACE\|arc-traces\|arctrace" tools/validators/src/` identifies the validator-side ARC_TRACE references: known sites include `tools/validators/src/structural/snapshot-replay-equality.ts` and related test fixtures + integration tests. Each requires audit at implementation time.
8. **Adjacent contradictions.** The `state_snapshot.active_records` key list in the shared contract §4.2 now includes `BEL`. Any validator that walks `state_snapshot.active_records` for replay or branch-isolation checks must add BEL to its known-class set — verify each structural validator (`snapshot-replay-equality`, `recursive-reference-closure`, `state-snapshot-integrity`) handles the new key.

## Architecture Check

1. **Field-by-field schema registration** for BEL matches the existing pattern (each story-bundle record class has its own schema entry in the validator registry). Alternative considered: a shared "story-bundle record" schema with class-specific overrides. Rejected: each class's fields are sufficiently distinct that a shared base would carry no real common fields, and the per-class registration is what the validator's exhaustiveness check relies on.
2. **No backwards-compatibility shim** for ARC_TRACE validators. The class is gone; structural validators that reference it have no live records to protect.

## Verification Layers

1. **BEL schema enforcement (happy path)**: a `create_bel_record` patch with a fully-conformant BEL payload (all 12 fields per contract §4.1) passes `record_schema_compliance`. → validator unit test.
2. **BEL schema enforcement (rejection paths)**: BEL payloads missing required fields (`holder`, `claim`, `truth_relation`, `confidence`, `visibility`, `basis.source_event`) or carrying disallowed enum values (e.g., `truth_relation: "maybe"` instead of one of the six allowed values) are rejected with field-specific errors. → validator unit tests.
3. **ARC_TRACE references absent**: `grep -rn "ARC_TRACE\|ARCTRACE\|arc-traces" tools/validators/src/` returns zero matches in non-test code. → grep-proof.
4. **Structural validators handle BEL in `state_snapshot.active_records`**: snapshot replay, recursive-reference-closure, state-snapshot-integrity all complete successfully against a PG record whose `state_snapshot.active_records` includes a BEL key with at least one BEL id. → integration test.

## What to Change

### 1. Register the BEL schema in `record_schema_compliance`

Add a BEL entry to the validator's per-class schema registry. The entry enforces:

- Required: `id` (matches `^BEL-\d{4}$`), `story_id`, `created_at_page`, `holder`, `claim`, `truth_relation` (∈ `{true, false, partly_true, unknown, contested, branch_counterfactual}`), `confidence` (∈ `{certain, likely, suspected, rumor, performative_lie}`), `visibility` (∈ `{private, shared, public, concealed, suppressed}`), `basis.source_event` (matches `^SE-\d{4}$`).
- Optional: `supersedes` (default null; matches `^BEL-\d{4}$` when set), `consequences.opens[]` (each entry matches OBL/THR/CNSQ id pattern), `consequences.constrains_choices[]` (each entry matches CHC id pattern).
- Reject any field not listed above (schema-minimalism enforcement — no nice-to-have fields slip through).

### 2. Drop ARC_TRACE-related validators

In `tools/validators/src/structural/snapshot-replay-equality.ts` (and any related structural validator referencing ARC_TRACE per the grep), remove ARC_TRACE-specific branches. The replay logic continues to work over the remaining record classes; ARC_TRACE simply has no entries to replay because the class is gone.

### 3. Update structural validators for BEL in state_snapshot

`snapshot-replay-equality`, `recursive-reference-closure`, and `state-snapshot-integrity` must recognize the new `state_snapshot.active_records.BEL` key. Add BEL to each validator's known-class enumeration so it walks BEL entries instead of treating them as unknown.

### 4. Update test fixtures

Add BEL-bearing fixtures for the happy path; drop ARC_TRACE fixtures from `tools/validators/tests/fixtures/` (verified at gap-filler time: at least `patch-plan-complete-slt.json` and `patch-plan-missing-mystery-safety-slt.json` may reference ARC_TRACE indirectly through PG records; audit each fixture).

## Files to Touch

- `tools/validators/src/rules/record_schema_compliance.ts` OR equivalent registry file (modify — add BEL schema)
- `tools/validators/src/structural/snapshot-replay-equality.ts` (modify — drop ARC_TRACE branch; add BEL handling)
- `tools/validators/src/structural/recursive-reference-closure.ts` (modify — add BEL handling)
- `tools/validators/src/structural/state-snapshot-integrity.ts` (modify — add BEL handling)
- `tools/validators/tests/fixtures/**` (modify — add BEL fixtures; drop ARC_TRACE fixtures)
- `tools/validators/tests/structural/**` (modify — extend tests for BEL; drop ARC_TRACE tests)

## Out of Scope

- The patch-engine `create_bel_record` op itself — `archive/tickets/PEENH-007-add-create-bel-record-op-and-drop-create-arctrace-record.md`.
- The allocator's BEL id-class registration — `archive/tickets/MCPENH-040-register-bel-id-class-and-drop-arctrace.md`.
- Renaming legacy `story_page_cycle` / `storylet_pool_authoring` task types — separate MCPENH-NNN ticket.
- BEL-specific Rule 7 enforcement (mystery firewall) beyond schema-completeness — the shared contract §11 routes mystery authority through `mystery_policy.allowed_authority` on `SLT` and `unresolved_mystery_claims` on `PG`, not on `BEL` directly. If a future BEL-touching firewall surfaces, file a separate ticket.

## Acceptance Criteria

### Tests That Must Pass

1. A BEL record with all 12 fields per shared contract §4.1 passes `record_schema_compliance`.
2. A BEL record missing any required field is rejected with a field-specific error message.
3. A BEL record carrying a disallowed enum value (e.g., `truth_relation: "maybe"`) is rejected.
4. A PG record with `state_snapshot.active_records.BEL: [BEL-0001]` passes all three structural validators (snapshot-replay-equality, recursive-reference-closure, state-snapshot-integrity).
5. Full `tools/validators` test suite passes.

### Invariants

1. Every `BEL-NNNN.yaml` written by `create_bel_record` (`archive/tickets/PEENH-007-add-create-bel-record-op-and-drop-create-arctrace-record.md`) is structurally validated against the shared contract §4.1 schema before patch-apply.
2. No ARC_TRACE references remain in `tools/validators/src/` after this ticket lands.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/record-schema-compliance-bel.test.ts` (new) — exhaustive field-by-field coverage of the BEL schema (happy path + each required-field-missing path + each enum-violation path).
2. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify) — drop ARC_TRACE coverage; add BEL coverage.
3. `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify) — add BEL coverage.
4. `tools/validators/tests/structural/state-snapshot-integrity.test.ts` (modify) — add BEL coverage.

### Commands

1. `cd tools/validators && npm test` — full validator suite passes.
2. `grep -rn "ARC_TRACE\|ARCTRACE\|arc-traces\|arctrace" tools/validators/src/` — returns zero matches in non-test source code.
3. `grep -rn "BEL" tools/validators/src/rules/record_schema_compliance.ts` — returns matches showing the BEL schema is registered.
