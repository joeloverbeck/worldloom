# SPEC48SESTRINT-001: Extend story-event schema with `record_introductions[]`, `state_relations[]`, `non_propagation_facts[]` fields

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — extends `tools/validators/src/schemas/story-event.schema.json` (additive only; new optional fields with closed enums)
**Deps**: None

## Problem

SPEC-48 replaces three parseable tag patterns currently riding on `SE.world_logic_rationale` (`intro:<CLASS>(...)`, `plan_relation:<...>(plan=...)`, `non_propagation:<...>(group=..., records=[...])`) with three first-class structured fields on the `SE` schema. This ticket lands the schema extension that every downstream refactor (Phase B validators, Phase D world-index, Phase E skill prose) reads against. Without the schema, validators have nothing to consume and the JSON-schema rejection of malformed structured content (trigger-class mismatch, duplicate record_id, invalid relation enum value) cannot fire at patch-engine pre-apply time.

## Assumption Reassessment (2026-05-19)

1. `tools/validators/src/schemas/story-event.schema.json` exists and is the canonical SE schema consumed by patch-engine `create_se_record` op validation (verified via `ls tools/validators/src/schemas/` during SPEC-48 reassess-spec; confirmed file path resolves via Pre-Write Files-to-Touch existence verification at this ticket's batch).
2. SPEC-48 D-A1/D-A2/D-A3 enumerate three new optional fields with closed-enum constraints; the 8 per-class trigger vocabularies (CLK/STSEC/STQ/THR/STENT/SREL/STPLAN/STEMO), 7 relation enum values (`advances | tests | blocks | revises | fulfills | abandons | ignores`), and 5 non-propagation reason enum values (`no_witness | witness_incapacitated | evidence_concealed | institution_suppresses_report | event_leaves_no_accessible_trace`) are migrated verbatim from the existing parser constants per `tools/world-index/src/parse/intro-tag-parser.ts:4-85` and the existing closed-reason set at `tools/validators/src/structural/non-propagation-tag-shape.ts:9-14`.
3. Cross-skill boundary under audit: the SE schema is consumed by the patch-engine `create_se_record` op (`tools/patch-engine/src/ops/create-story-record.ts:104` STORY_RECORD_SPECS map) + structural validators in `tools/validators/src/structural/` + world-index parsers in `tools/world-index/src/parse/atomic.ts`. The new optional fields must not break any existing consumer; the additive-only shape (every new field carries no `required` marker at the schema level) is the contract.
4. Extends existing output schema: `tools/validators/src/schemas/story-event.schema.json` is the host SE schema. The extension is **additive-only** — three new optional `properties` entries plus their per-property `oneOf` / `enum` / `pattern` constraints. No existing field is renamed, removed, or made required by this change. Consumers that don't yet emit the new fields continue to validate as-is.

## Architecture Check

1. **JSON-schema as the source of truth for closed enums**: the 8 per-class trigger vocabularies move from TypeScript-only constants (in `intro-tag-parser.ts`) into the JSON-schema as `oneOf` per-class branches, paired with a TypeScript-side parity test at later tickets. This makes schema-level rejection authoritative for malformed structured content at submit time, rather than deferring rejection to per-validator runtime checks. Cleaner than keeping the closed sets only in TypeScript: schema-level closure catches authoring errors before patch-engine pre-apply, not at Phase 9.
2. **No backwards-compatibility aliasing**: the new fields are added beside the existing `world_logic_rationale` string; no fallback to parseable tags is wired into the schema. Tag-syntax in `world_logic_rationale` becomes inert prose under the clean-break design per SPEC-48 §D2.

## Verification Layers

1. Schema syntactic validity → JSON-schema parse via `ajv` (existing validator dependency); `npm test --prefix tools/validators` builds and runs schema-conformance smoke tests.
2. Closed-enum constraint coverage → per-class `oneOf` rejects an invalid `class` + `trigger` pairing at schema validation (covered later by ticket 013's integration test T-2).
3. Additive-only invariant → grep proof that no `required` marker references the 3 new field names; existing SE records (without the new fields) continue to validate.

## What to Change

### 1. Add `record_introductions[]` property to `story-event.schema.json`

Insert a new optional property `record_introductions` of type `array`. Each item is an object with the following properties:

- `record_id`: string matching pattern `^[A-Z]+-(?:0|[1-9][0-9]*)$` (RECORD_ID pattern; required per item)
- `class`: string enum `["CLK", "STSEC", "STQ", "THR", "STENT", "SREL", "STPLAN", "STEMO"]` (required per item)
- `trigger`: string (required per item; per-class constrained via `oneOf` — see below)
- `evidence`: array of RECORD_ID-matching strings (required per item; may be empty array)
- `distinct_from`: array of RECORD_ID-matching strings (required per item; may be empty array)
- `rationale`: optional string (free-form prose; no schema constraint beyond `string` type)

The array carries `uniqueItems: true` keyed on `record_id` so the same record cannot be declared in two `record_introductions[]` entries on the same SE.

Per-class `trigger` enum (via `oneOf` with 8 branches matching the 8 class values; migrate verbatim from `tools/world-index/src/parse/intro-tag-parser.ts:4-75`):

- `class: CLK` → trigger ∈ `["deadline_declared", "pursuit_started", "exposure_accumulation_started", "faction_mobilized", "environmental_degradation_started", "mission_or_race_started", "staged_danger_became_trackable"]`
- `class: STSEC` → trigger ∈ `["lie_made_hidden_truth_branch_relevant", "hidden_truth_constrains_action", "clue_carrier_enters_play", "holder_access_changed", "protected_mystery_story_secret_needed"]`
- `class: STQ` → trigger ∈ `["promise_made", "explicit_question_raised", "unexplained_evidence_introduced", "affordance_setup_introduced", "open_decision_created"]`
- `class: THR` → trigger ∈ `["new_ongoing_causal_concern", "investigation_line_opened", "recovery_line_opened", "negotiation_line_opened", "mission_line_opened", "social_fallout_line_opened"]`
- `class: STENT` → trigger ∈ `["actor_enters_branch", "witness_needed", "information_source_enters", "pressure_driver_enters", "counterparty_enters", "choice_target_enters"]`
- `class: SREL` → trigger ∈ `["alliance_forms", "rivalry_forms", "debt_relation_forms", "authority_relation_forms", "trust_axis_becomes_relevant", "intimacy_axis_becomes_relevant", "hostility_axis_becomes_relevant"]`
- `class: STPLAN` → trigger ∈ `["tactical_approach_committed", "resource_gained_enables_plan", "blocker_requires_plan", "pressure_forces_plan", "opportunity_recognized", "counterparty_plan_observed"]`
- `class: STEMO` → trigger ∈ `["event_revealed_truth_to_actor", "event_threatened_actor_or_charge", "event_harmed_actor_or_charge", "event_relieved_pressure_on_actor", "event_violated_actor_principle_or_value", "event_changed_relationship_with_other", "accumulated_pressure_crossed_threshold"]`

### 2. Add `state_relations[]` property to `story-event.schema.json`

Insert a new optional property `state_relations` of type `array`. Each item is an object with:

- `relation`: string enum `["advances", "tests", "blocks", "revises", "fulfills", "abandons", "ignores"]` (required per item)
- `target_record`: string matching RECORD_ID pattern (required per item; domain restriction to `STPLAN-*` is enforced by the `stplan-event-plan-relation-consistency` validator at Phase B, not by the schema)

### 3. Add `non_propagation_facts[]` property to `story-event.schema.json`

Insert a new optional property `non_propagation_facts` of type `array`. Each item is an object with:

- `reason`: string enum `["no_witness", "witness_incapacitated", "evidence_concealed", "institution_suppresses_report", "event_leaves_no_accessible_trace"]` (required per item; migrated verbatim from `tools/validators/src/structural/non-propagation-tag-shape.ts:9-14` `VALID_REASONS` set)
- `group`: string (required per item; free-form group label per `non-propagation-tag-shape.ts:85` regex group pattern `[^,()[\]\s]+`)
- `records`: array of RECORD_ID-matching strings (required per item; may be empty array)

### 4. Verify schema parses cleanly via existing build path

After the property insertions, run `npm test --prefix tools/validators` — `tsc` build succeeds and `ajv`-driven schema-conformance test cases pass with no regression on the existing SE-field set.

## Files to Touch

- `tools/validators/src/schemas/story-event.schema.json` (modify)

## Out of Scope

- Schema field changes other than the three new optional properties named above.
- Validator refactor that consumes the new fields (deferred to tickets 003-007).
- Patch-engine STORY_RECORD_SPECS verification (folded into ticket 013 as a sub-assertion per SPEC-48 D-A7's "no code change expected" framing).
- World-index parser refactor (deferred to ticket 008).
- Skill prose updates (deferred to ticket 011).
- Contract document rewrite at `story-state-contract.md` §5a (deferred to ticket 002).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — full validator package test suite passes (schema-parse smoke tests + existing structural validator tests).
2. `node -e "const Ajv = require('ajv'); const ajv = new Ajv({allErrors:true,strict:false}); const s = require('./tools/validators/src/schemas/story-event.schema.json'); console.log(ajv.compile(s) ? 'compiles' : 'fails');"` — schema compiles via `ajv` without error.
3. Existing SE records (without the new fields) continue to validate successfully — `npm test --prefix tools/validators` re-runs any fixture-bundle SE conformance tests with no regression.

### Invariants

1. The 3 new properties are optional — no `required` marker on the root SE schema references `record_introductions` / `state_relations` / `non_propagation_facts`.
2. The 8 per-class trigger vocabularies in the schema match the 8 TypeScript exports `MIDSTORY_TRIGGERS_CLK` through `MIDSTORY_TRIGGERS_STEMO` in `tools/world-index/src/parse/intro-tag-parser.ts` exactly (parity asserted by a separate test in ticket 003).

## Test Plan

### New/Modified Tests

1. `None — schema-extension ticket; verification is command-based (ajv compile + existing test suite regression). Schema-vs-vocabulary parity test arrives with ticket 003's typed reader infrastructure.`

### Commands

1. `npm test --prefix tools/validators` — full test suite passes.
2. `node -e "..."` ajv compile check (see Acceptance Criteria #2) — schema compiles standalone.
