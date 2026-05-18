# SPEC47STPSTE-003: Add story-plan + story-emotion JSON schemas

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds two new JSON schemas under `tools/validators/src/schemas/` (story-plan.schema.json + story-emotion.schema.json); no other code changes
**Deps**: `archive/tickets/SPEC47STPSTE-001.md`

## Problem

SPEC-47 introduces STPLAN and STEMO record classes whose schema content lives in `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.17/§4.5.18 (landed by ticket 001). The validator framework needs executable JSON schemas mirroring those field lists so the patch engine can reject malformed records at pre-apply gate and so the per-class deterministic validators (tickets 005/006) have a schema-compliance check surface to reference. The JSON schemas are the load-bearing machine-readable contract; without them, validators must encode field expectations inline and drift silently from the canonical §4.5.17/§4.5.18 definitions.

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified `tools/validators/src/schemas/` contains the established per-record-class schema convention: 16 existing story-* schemas (story-belief, story-branch, story-choice, story-consequence, story-diegetic-artifact, story-entity, story-event, story-fact, story-intention, story-location, ...). The two new schemas follow the `story-<class>.schema.json` naming convention. No central index.ts registry exists in `schemas/` (the schemas are flat JSON files loaded by file path).
2. Verified SPEC-47 §Approach §A deliverable D-A4 specifies `tools/validators/src/schemas/story-plan.schema.json` with closed-enum / required-field discipline; D-A5 specifies `tools/validators/src/schemas/story-emotion.schema.json` with the closed 18-value `affect_kind` and 18-value `behavioral_pressure` enums plus the `dissociated` status conditional-null discipline.
3. Cross-skill boundary under audit: JSON schemas are consumed by (a) the validator framework's schema-compliance validators (one per record class, registered in `tools/validators/src/public/registry.ts`); (b) the patch engine's pre-apply gate (via `tools/patch-engine/src/envelope/validate.ts`); (c) the MCP `describe_envelope_schema` capability tool. Adding two new schemas extends the surface those consumers iterate over; existing schemas are unchanged.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism At Story Scope) — every field in every schema must be load-bearing. The JSON schemas materialize the strict-minimalist v1 STPLAN field list (11 fields; drops `risk_posture` / `visibility` / `current_step.rationale` / `fallback_steps[*].rationale`) and the §5b-disciplined STEMO field list (13 fields; drops `orientation.toward_claim`) per SPEC-47 §Key Design Decisions item 1.

## Architecture Check

1. JSON schemas are the executable counterpart to the §4.5.17/§4.5.18 markdown schemas (landed by ticket 001) — markdown is human-readable contract; JSON schema is machine-readable enforcement. Keeping them in lockstep prevents the field-list drift failure mode that would otherwise let validators reject records the contract claims to allow (or vice versa).
2. No backwards-compatibility aliasing/shims introduced — both schema files are net-new. The patch engine's existing schema-loading logic discovers schemas by directory enumeration; no registry edit needed.

## Verification Layers

1. Schema files exist at canonical paths → codebase grep-proof `ls tools/validators/src/schemas/story-plan.schema.json tools/validators/src/schemas/story-emotion.schema.json` returns 2 files
2. Schema content matches §4.5.17/§4.5.18 markdown field lists exactly → schema validation (load both schemas with AJV or equivalent; manually compare field-by-field to ticket 001's markdown content)
3. Cross-skill boundary preserved: existing 16 story-*.schema.json files are unmodified → file-byte-equality check before/after
4. Closed-enum discipline: `affect_kind` enum lists exactly 18 values + null; `behavioral_pressure` enum lists exactly 18 values; `plan_status` enum lists exactly 7 values; `status` enum lists exactly 5 values; `intensity` enum lists exactly 4 values; `agency_effect` enum lists exactly 2 values → manual count against SPEC-47 §Approach §A specifications

## What to Change

### 1. Author `tools/validators/src/schemas/story-plan.schema.json`

Create new JSON schema mirroring story-record-schemas.md §4.5.17 STPLAN field list. Required fields (`required: [...]`): `id`, `story_id`, `created_at_page`, `created_by_event`, `holder`, `root_intention`, `objective`, `plan_status`, `belief_basis`, `current_step`, `expires_when`. Field types:

- `id`: `string` pattern `^STPLAN-[0-9]+$`
- `story_id`: `string` pattern `^STORY-[0-9]+$`
- `created_at_page`: `string` pattern `^PG-[0-9]+$`
- `created_by_event`: `string` pattern `^SE-[0-9]+$`
- `supersedes`: `string` pattern `^STPLAN-[0-9]+$` OR `null` (default null)
- `holder`: `string` pattern `^STENT-[0-9]+$`
- `root_intention`: `string` pattern `^STINT-[0-9]+$`
- `objective`: `string`
- `plan_status`: closed enum `[active, blocked, suspended, fulfilled, failed, abandoned, revised]`
- `belief_basis`: array of `BEL-<integer>` strings (default `[]`)
- `resource_basis`: object with sub-arrays `facts`, `objects`, `locations`, `artifacts`, `relationships`, `obligations` (all default `[]`)
- `blockers`: array of record-id strings (default `[]`)
- `current_step`: object with `action_family` (string per closed action_family enum at story-state-contract §4.4a), `target_records` array, `success_condition.predicates` array
- `fallback_steps`: array of objects each with `action_family`, `trigger_predicates`, `target_records` (default `[]`)
- `expires_when`: `string`
- `derived_from`: array of record-id strings (default `[]`)

Use `additionalProperties: false` to enforce the strict-minimalist scope.

### 2. Author `tools/validators/src/schemas/story-emotion.schema.json`

Create new JSON schema mirroring story-record-schemas.md §4.5.18 STEMO field list. Required fields: `id`, `story_id`, `created_at_page`, `created_by_event`, `holder`, `status`, `trigger_event`, `agency_effect`, `expires_when`. Conditional required: when `status != dissociated`, `affect_kind` + `intensity` + `appraisal_basis` (non-empty) + `behavioral_pressure` (non-empty) are required; when `status == dissociated`, `affect_kind: null` is allowed. Field types:

- `id`: `string` pattern `^STEMO-[0-9]+$`
- `story_id`: `string` pattern `^STORY-[0-9]+$`
- `created_at_page`: `string` pattern `^PG-[0-9]+$`
- `created_by_event`: `string` pattern `^SE-[0-9]+$`
- `supersedes`: `string` pattern `^STEMO-[0-9]+$` OR `null`
- `holder`: `string` pattern `^STENT-[0-9]+$`
- `status`: closed enum `[active, suppressed, settled, transformed, dissociated]`
- `affect_kind`: closed enum `[fear, anxiety, anger, disgust, grief, shame, guilt, humiliation, hope, relief, joy, awe, tenderness, desire, envy, contempt, confusion, dread]` OR `null`
- `intensity`: closed enum `[low, medium, high, extreme]`
- `orientation`: object with `toward_records` array (default `[]`)
- `appraisal_basis`: array of `BEL-<integer>` strings (default `[]`)
- `trigger_event`: `string` pattern `^SE-[0-9]+$`
- `behavioral_pressure`: array of closed-enum strings `[approach, flee, freeze, attack, reject, dominate, submit, seek_contact, protect_other, seek_help, confess, conceal, withdraw_socially, plan, accommodate, self_soothe, ruminate, collapse]` (default `[]`)
- `agency_effect`: closed enum `[none, constraining]`
- `expires_when`: `string`
- `derived_from`: array of record-id strings (default `[]`)

Use `additionalProperties: false` plus a JSON Schema conditional (`if`/`then`/`else` or `oneOf`) to enforce the dissociated-status null-allowed discipline.

## Files to Touch

- `tools/validators/src/schemas/story-plan.schema.json` (new)
- `tools/validators/src/schemas/story-emotion.schema.json` (new)

## Out of Scope

- Validator registrations referencing the new schemas — covered by tickets 005 (STPLAN validators) and 006 (STEMO validators).
- Patch-engine wiring — covered by ticket 004.
- The 16 existing story-*.schema.json files are unchanged.

## Acceptance Criteria

### Tests That Must Pass

1. `ls tools/validators/src/schemas/story-plan.schema.json tools/validators/src/schemas/story-emotion.schema.json` returns both file paths.
2. Schema parses as valid JSON Schema draft-07 (or whatever version the existing story-*.schema.json files use) — JSON parse + schema-self-validation.
3. Schema accepts well-formed STPLAN/STEMO records and rejects malformed ones (missing required fields, out-of-enum values, wrong type) — round-trip schema test against representative fixtures.

### Invariants

1. The two new schema files use the same JSON Schema draft version as the existing 16 story-*.schema.json files (consistency with the package's existing convention).
2. Closed-enum value lists match SPEC-47 §Approach §A specifications verbatim — no additions, no omissions, no reordering ambiguity at consumer surfaces.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/schemas/story-plan-schema-fixtures.test.ts` (new) — load story-plan.schema.json and assert: valid fixture passes; required-field-omission fixtures fail; out-of-enum value fixtures fail; pattern-mismatch fixtures fail.
2. `tools/validators/tests/schemas/story-emotion-schema-fixtures.test.ts` (new) — same shape for story-emotion.schema.json, plus dissociated-status conditional validation (when status=dissociated, affect_kind=null passes; when status=active, affect_kind=null fails).

### Commands

1. `node -e "JSON.parse(require('fs').readFileSync('tools/validators/src/schemas/story-plan.schema.json'))"` (parses without error)
2. `node -e "JSON.parse(require('fs').readFileSync('tools/validators/src/schemas/story-emotion.schema.json'))"` (parses without error)
3. `npm --prefix tools/validators run build && npm --prefix tools/validators test` (full validator package test suite passes)
