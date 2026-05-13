# VALENH-011: Register `BEL` in `record_schema_compliance`; drop ARC_TRACE-related validators

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/`, `tools/validators/tests/`, and `tools/validators/README.md`
**Deps**: `archive/tickets/MCPENH-040-register-bel-id-class-and-drop-arctrace.md` (BEL id-class registration), `archive/tickets/PEENH-007-add-create-bel-record-op-and-drop-create-arctrace-record.md` (patch-engine `create_bel_record` op).

## Problem

At intake, the rebuilt story-skill family had introduced a first-class `BEL` (Belief) record class for story-bundle records (per `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md` §C.0 + §F.3). The shared story state contract §4.1 specifies the 12-field BEL schema. The live `record_schema_compliance` validator is `tools/validators/src/structural/record-schema-compliance.ts`, backed by schema registration in `tools/validators/src/structural/utils.ts`; it needed to enforce this schema for every BEL record submitted via `create_bel_record` (`archive/tickets/PEENH-007-add-create-bel-record-op-and-drop-create-arctrace-record.md`).

Before this ticket, the validator framework did not know about the `belief_record` node type materialized by the pre-apply overlay, so BEL records passed through the validator unchecked, defeating Rule 1 (No Floating Facts) at the validator layer.

The greenfield plan also deletes `ARC_TRACE` as a record class. This ticket removed validator-owned ARC_TRACE source surfaces and updated tests/docs so the validators package no longer advertises or runs those retired validators.

## Assumption Reassessment (2026-05-13)

1. **Validator surface verified.** `tools/validators/src/structural/record-schema-compliance.ts` is the live `record_schema_compliance` implementation; `tools/validators/src/structural/` also houses `snapshot-replay-equality`, `recursive-reference-closure`, and `state-snapshot-integrity`. `tools/validators/src/rules/` still contains legacy ARC_TRACE rule validators that this ticket removes from the registered validator surface.
2. **`BEL` schema canonical source.** `.claude/skills/_shared-templates/story-state-contract.md` §4.1 is the canonical schema reference (12 fields: `id`, `story_id`, `created_at_page`, `supersedes`, `holder`, `claim`, `truth_relation`, `confidence`, `visibility`, `basis.source_event`, `consequences.opens[]`, `consequences.constrains_choices[]`).
3. **Cross-skill schema parity.** The validator's accept/reject decision must match what the patch engine (`archive/tickets/PEENH-007-add-create-bel-record-op-and-drop-create-arctrace-record.md`) writes. A divergence would either accept patch-engine-rejected records (impossible by definition of validator order) or reject patch-engine-accepted records (causing false-positive validation failures on otherwise-valid plans).
4. **FOUNDATIONS principle.** Realizes Rule 1 (No Floating Facts) at the validator surface for the new BEL class; without this ticket, BEL records evade the structural completeness check that every other story-bundle record class receives.
5. **HARD-GATE / canon-write impact.** The change does not mutate canon or weaken the Mystery Reserve firewall, but `record_schema_compliance` runs in pre-apply validation, so `docs/HARD-GATE-DISCIPLINE.md` was read and the BEL validator is treated as a fail-closed validation-signal change.
6. **Schema extension impact.** Additive registration of BEL uses the field list from the shared contract. The live pre-apply overlay already materializes `create_bel_record` as node type `belief_record` in `tools/validators/src/_helpers/index-access.ts`, so the validator schema registry must recognize `belief_record`, not a speculative `bel_record` or `story_belief_record` name.
7. **Rename / removal blast radius.** `rg -n 'ARCTRACE|ARC_TRACE|arc-traces|arctrace|arc_trace' tools/validators/src tools/validators/tests tools/validators/README.md` showed validator-owned ARC_TRACE source references in the ARC rule validators, structural schema/authority mappings, story-page deferred-validation requirements, replay stamped-field exclusions, CLI/index access mapping comments, and tests. This ticket removes the registered validator-owned ARC_TRACE source/test surface; broader world-index retrieval/rendering support remains outside this validators package ticket.
8. **Adjacent contradictions.** The `state_snapshot.active_records` key list in the shared contract §4.2 includes `BEL`, while the live structural validators still assume the older flattened snapshot fields. This ticket owns the validator-side greenfield `active_records.BEL` acceptance path while leaving a wholesale PG/SE replay-model rewrite to the rebuilt story-skill family; tests use focused fixtures to prove BEL references are not treated as unknown or dangling.

## Architecture Check

1. **Field-by-field schema registration** for BEL matches the existing pattern (each story-bundle record class has its own schema entry in the validator registry). Alternative considered: a shared "story-bundle record" schema with class-specific overrides. Rejected: each class's fields are sufficiently distinct that a shared base would carry no real common fields, and the per-class registration is what the validator's exhaustiveness check relies on.
2. **No backwards-compatibility shim** for ARC_TRACE validators. The class is gone; structural validators that reference it have no live records to protect.

## Verification Layers

1. **BEL schema enforcement (happy path)**: a `belief_record` materialized from `create_bel_record` with a fully-conformant BEL payload (all 12 fields per contract §4.1) passes `record_schema_compliance`. → validator unit test.
2. **BEL schema enforcement (rejection paths)**: BEL payloads missing required fields (`holder`, `claim`, `truth_relation`, `confidence`, `visibility`, `basis.source_event`) or carrying disallowed enum values (e.g., `truth_relation: "maybe"` instead of one of the six allowed values) are rejected with field-specific errors. → validator unit tests.
3. **ARC_TRACE references absent from validator source/tests/docs**: `rg -n 'ARC_TRACE|ARCTRACE|arc-traces|arctrace|arc_trace' tools/validators/src tools/validators/tests tools/validators/README.md` returns zero matches. → grep-proof.
4. **Structural validators handle BEL in `state_snapshot.active_records`**: snapshot replay, recursive-reference-closure, state-snapshot-integrity all complete successfully against a PG record whose `state_snapshot.active_records` includes a BEL key with at least one BEL id. → integration test.

## Landed Changes

### 1. Register the BEL schema in `record_schema_compliance`

Added `tools/validators/src/schemas/story-belief.schema.json` and registered `belief_record` through `tools/validators/src/structural/utils.ts`. The entry enforces:

- Required: `id` (matches `^BEL-\d{4}$`), `story_id`, `created_at_page`, `holder`, `claim`, `truth_relation` (∈ `{true, false, partly_true, unknown, contested, branch_counterfactual}`), `confidence` (∈ `{certain, likely, suspected, rumor, performative_lie}`), `visibility` (∈ `{private, shared, public, concealed, suppressed}`), `basis.source_event` (matches `^SE-\d{4}$`).
- Optional: `supersedes` (default null; matches `^BEL-\d{4}$` when set), `consequences.opens[]` (each entry matches OBL/THR/CNSQ id pattern), `consequences.constrains_choices[]` (each entry matches CHC id pattern).
- Reject any field not listed above (schema-minimalism enforcement — no nice-to-have fields slip through).

### 2. Drop ARC_TRACE-related validators

Removed the validators package's registered ARC_TRACE rule/source surface: `arc_trace_evidence_alignment`, `narrative_point_classification`, `arc_envelope_conformance`, and the retired `story-arc-trace` schema. Updated the rule registry, CLI selector allowlist, README inventory, and tests to reflect the 14 active rule-derived validators.

### 3. Update structural validators for BEL in state_snapshot

`recursive-reference-closure` and `state-snapshot-integrity` now treat `BEL-NNNN` as a story-local id and resolve it through `belief_record` rows. `state-snapshot-integrity` accepts the greenfield `state_snapshot.active_records` shape for BEL fixtures while retaining existing legacy-shape coverage elsewhere in the suite. `snapshot-replay-equality` has a focused active-records fixture with a BEL entry and no longer carries ARC_TRACE stamped-field exclusions.

### 4. Update story-page schema and test fixtures

Added BEL-focused inline fixtures in structural tests and removed ARC_TRACE validator tests. Removed the retired `arc_trace_evidence_alignment` deferred-validation key from the story-page schema/tests and dropped `arc_trace_*` page-snapshot fixture fields. The existing checked-in JSON storylet fixtures did not require edits for this ticket.

## Files to Touch

- `tools/validators/src/structural/utils.ts` (modify — add `belief_record` schema registration and authority recognition)
- `tools/validators/src/structural/snapshot-replay-equality.ts` (modify — drop ARC_TRACE branch; add BEL handling)
- `tools/validators/src/structural/recursive-reference-closure.ts` (modify — add BEL handling)
- `tools/validators/src/structural/state-snapshot-integrity.ts` (modify — add BEL handling)
- `tools/validators/src/_helpers/index-access.ts` and `tools/validators/src/cli/_helpers.ts` (modify — remove ARC_TRACE node-type translation that only served the retired validators)
- `tools/validators/src/rules/arc_envelope_conformance.ts`, `tools/validators/src/rules/arc_trace_evidence_alignment.ts`, and `tools/validators/src/rules/narrative_point_classification.ts` (delete — retire ARC_TRACE validators from the package source surface)
- `tools/validators/src/public/registry.ts` (modify — remove retired validator registrations)
- `tools/validators/src/schemas/story-belief.schema.json` (new — BEL schema)
- `tools/validators/src/schemas/story-arc-trace.schema.json` (delete — retired ARC_TRACE schema)
- `tools/validators/src/schemas/story-page.schema.json` (modify — remove retired `arc_trace_evidence_alignment` deferred-validation requirement)
- `tools/validators/tests/**` (modify — add BEL tests and remove ARC_TRACE validator tests)
- `tools/validators/README.md` (modify — validator inventory and schema inventory)

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
4. A PG record with `state_snapshot.active_records.BEL: [BEL-0001]` passes the structural validators that inspect snapshot references; `snapshot-replay-equality` remains a replay-drift validator and is proved with a focused active-records fixture rather than a full PG/SE schema rewrite.
5. Full `tools/validators` test suite passes.

### Invariants

1. Every `BEL-NNNN.yaml` written by `create_bel_record` (`archive/tickets/PEENH-007-add-create-bel-record-op-and-drop-create-arctrace-record.md`) is structurally validated against the shared contract §4.1 schema before patch-apply.
2. No ARC_TRACE or `arc_trace` references remain in `tools/validators/src/`, `tools/validators/tests/`, or `tools/validators/README.md` after this ticket lands.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-bel.test.ts` (new) — field-by-field coverage of the BEL schema (happy path + required-field-missing paths + enum-violation path + additional-property rejection).
2. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify) — drop ARC_TRACE coverage; add BEL coverage.
3. `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify) — add BEL coverage.
4. `tools/validators/tests/structural/state-snapshot-integrity.test.ts` (modify) — add BEL coverage.

### Commands

1. `cd tools/validators && npm test` — full validator suite passes.
2. `rg -n 'ARC_TRACE|ARCTRACE|arc-traces|arctrace|arc_trace' tools/validators/src tools/validators/tests tools/validators/README.md` — returns zero matches.
3. `rg -n 'belief_record|story-belief|BEL' tools/validators/src/structural tools/validators/src/schemas` — returns matches showing the BEL schema is registered.

## Outcome

Completed: 2026-05-13.

`record_schema_compliance` now validates pre-apply/materialized `belief_record` rows against the shared BEL schema, including required field, enum, nested object, id-pattern, and additional-property enforcement. Structural reference validators now accept `state_snapshot.active_records.BEL` references when the referenced `belief_record` exists. The validators package no longer registers, ships source for, documents, or tests the retired ARC_TRACE validators/schema, and the story-page schema no longer requires the retired `arc_trace_evidence_alignment` deferred-validation key.

Post-review blocker resolved on 2026-05-13: the broader stale-anchor sweep now includes lowercase `arc_trace`, validator tests, and README, and returns zero matches.

## Verification Result

1. `cd tools/validators && npm run clean` — passed; removed stale compiled output before running the broad package suite after source/test deletions.
2. `cd tools/validators && npm test` — passed; `npm run build` succeeded and `node --test dist/tests/**/*.test.js` reported 190 passing tests.
3. `rg -n 'ARC_TRACE|ARCTRACE|arc-traces|arctrace|arc_trace' tools/validators/src tools/validators/tests tools/validators/README.md` — no matches.
4. `rg -n 'belief_record|story-belief|BEL' tools/validators/src/structural tools/validators/src/schemas` — found `belief_record` registration/authority handling and the `story-belief` schema.

## Deviations

- `record_schema_compliance` lives under `tools/validators/src/structural/`, not `tools/validators/src/rules/`; the implementation registered BEL through the existing schema map in `tools/validators/src/structural/utils.ts`.
- `create_bel_record` materializes as node type `belief_record` in the existing pre-apply overlay, so the validator schema key is `belief_record`.
- The active-records proof is focused on validator reference handling and replay comparison. A complete PG/SE schema migration from the older flattened page snapshot shape to the new shared contract remains outside this ticket.
- Post-ticket review found the ARC_TRACE stale-anchor proof was too narrow. The same-seam cleanup removed the remaining lowercase `arc_trace_evidence_alignment` and `arc_trace_*` schema/test residues, then reran the broader sweep.
