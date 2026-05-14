# SCAUD-003: Tighten JSON validator schemas to match amended story-state-contract.md §4

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Large
**Engine Changes**: Yes — modifies 13 of 16 `tools/validators/src/schemas/story-*.schema.json` files; re-audits 3 strict schemas; updates validator fixtures/tests; modifies `tools/validators/src/structural/recursive-reference-closure.ts` (remove `introduced_at_page` fallback); updates PG hash helpers in `tools/world-index` / `tools/world-mcp`; inspects and retains `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` because `commitment_class` / `commitment_family` are vocabulary metadata rather than CHC schema fields.
**Deps**: archive/tickets/SCAUD-001-apply-audit-verdicts-to-story-state-contract.md (contract must be canonical first — landed). The former SCAUD-002 dependency is removed: red-bunny is removed and re-bootstrapped from zero rather than remediated in place, so no pre-existing drifted records exist for the tightened validators to reject.

## Problem

At intake, 13 of 16 JSON schemas under `tools/validators/src/schemas/story-*.schema.json` required only `{id, story_id}` (or `{id, story_id, event_kind}` for SE) and declared `additionalProperties: true`. They accepted any record regardless of structural drift. The amended contract (per SCAUD-001) defines load-bearing field sets for all 16 classes; before this ticket, the new contract's discipline was author-discipline only. This ticket promoted the amended contract's field sets into the JSON schemas, removed `additionalProperties: true` where the audit allows, and re-audited the 3 strict schemas (`story-belief`, `story-page`, `story-storylet`) against the amended contract.

## Assumption Reassessment (2026-05-14)

1. SCAUD-001 has landed: `story-state-contract.md` §4 carries amended schemas for all 16 classes (§4.1 BEL, §4.2 PG with R3 reconciliation, §4.3 SE, §4.4 SLT, §4.5.1-§4.5.12 for the remaining 12). The SPEC-24 per-class YAML schema blocks are the literal field set to encode into JSON schemas.
2. SCAUD-002 is superseded: rather than remediating red-bunny in place, the bundle is removed and re-bootstrapped from zero against the amended contract. The re-bootstrap should happen after this ticket lands so the new bundle is born under the tightened validators. At this ticket's execution time, no pre-existing drifted records exist on disk for the tightened validators to reject.
3. Shared boundary: `tools/validators/src/schemas/story-*.schema.json` (16 files), `tools/validators/src/structural/record-schema-compliance.ts`, the validator test fixtures, plus `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` (if it exposes any dropped property as MCP vocabulary).
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) is the motivating principle. JSON schemas become the mechanism that enforces the doctrine the amended contract describes.
5. HARD-GATE read required and completed: this ticket edits validator-side JSON schemas used by `record_schema_compliance`, which runs in `validate_patch_plan` / `submit_patch_plan` pre-apply paths. The edits do not mutate live world `_source/` records, but they do change the schema validation signal that Hook 3 and patch-engine validation depend on.
6. Schema-extension blast radius (additive vs breaking): this ticket is **breaking** — fields are removed from schemas, `additionalProperties: true` is flipped to `false` where the audit allows. The contract's amendment in SCAUD-001 is the authoritative driver; consumers downstream of the schemas (patch engine, MCP schema retrieval surface) must conform. There is no pre-existing-record migration blast radius: red-bunny — the only currently-affected user bundle — is removed and re-bootstrapped from zero, so no on-disk records carry dropped fields when the tightened validators first run.
7. Rename/remove blast radius — JSON schemas affected:
   - **Strict** (currently strict; re-audit and possibly tighten further): `story-belief.schema.json`, `story-page.schema.json`, `story-storylet.schema.json`.
   - **Minimal** (currently minimal; promote fields and flip `additionalProperties` where audit allows): `story-fact.schema.json`, `story-intention.schema.json`, `story-obligation.schema.json`, `story-consequence.schema.json`, `story-thread.schema.json`, `story-relationship.schema.json`, `story-entity.schema.json`, `story-location.schema.json`, `story-object.schema.json`, `story-branch.schema.json`, `story-choice.schema.json`, `story-diegetic-artifact.schema.json`, `story-event.schema.json`.
8. Adjacent contradictions surfaced: the `target_or_action_family` enum in `story-choice.schema.json` includes `attempt`, but per SPEC-24 audit `attempt` is an SE `outcome_route`, not an action family. This ticket removes `attempt` from the enum and renames the property to `target_or_action_families` (plural) carrying a non-empty array of the cleaned enum. The `recursive-reference-closure.ts` `introduced_at_page` fallback becomes dead code (per SCAUD-001 the field is dropped from the contract, and the red-bunny removal eliminates the one bundle that ever carried it); remove it.
9. Mismatch + correction: the live validator source paths are `tools/validators/src/structural/record-schema-compliance.ts` and `tools/validators/src/structural/recursive-reference-closure.ts`; the drafted `src/rules/*` paths are stale. Validator-side enforcement now matches contract-side definition; pre-SCAUD-003 the mismatch was the documented "legacy until reconciliation" state in both SKILL.md files.

## Architecture Check

1. The clean approach is per-class schema tightening, one schema per change, with corresponding test updates per change. The alternative — a single mass-update PR — is harder to review and risks regressions across multiple validator rules.
2. No backwards-compatibility shims. The pre-SCAUD-003 minimal schemas were the legacy state; tightening is the canonical mechanism. Hook 3 already routes all `_source/` writes through the patch engine which calls these validators.

## Verification Layers

1. **Schema conformance** → for each of 16 classes, the JSON schema's `required` and `properties` set matches SPEC-24's amended §4 schema for that class, with `additionalProperties: false` where the audit so dictates.
2. **Test-suite pass** → the full `tools/validators/` test suite passes against the synthetic test fixtures. The `tools/validators/` tests construct their own in-memory story bundles; they do not read any real `worlds/` bundle, so the red-bunny removal has no effect on them.
3. **Drop-property rejection** → submitting a patch plan containing any dropped field for any record class fails validation with a clear `record_schema_compliance` error citing the dropped field by name.
4. **Round-trip / field-set guard** → every story record class's amended required/property set is asserted against its JSON schema, and representative amended records validate against the tightened schemas (`tools/validators/tests/structural/contract-schema-roundtrip.test.ts` — new test fixture).
5. **Dead-code removal** → `recursive-reference-closure.ts` `introduced_at_page` fallback removed; manual review confirms.

## What to Change

### 1. Tighten `story-fact.schema.json`

Replace the current minimal schema with one matching SPEC-24 §4.5.3 SF:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://worldloom.local/schemas/story-fact.schema.json",
  "type": "object",
  "required": ["id", "story_id", "created_at_page", "statement"],
  "properties": {
    "id": { "type": "string", "pattern": "^SF-[0-9]+$" },
    "story_id": { "type": "string", "pattern": "^STORY-[0-9]+$" },
    "created_at_page": { "type": "string", "pattern": "^PG-[0-9]+$" },
    "supersedes": { "type": ["string", "null"], "pattern": "^SF-[0-9]+$" },
    "statement": { "type": "string", "minLength": 1 },
    "derived_from": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^(CF|SF|BEL|SE|STENT|STINT|OBL|CNSQ|THR|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT)-[0-9]+$"
      },
      "default": []
    }
  },
  "additionalProperties": false
}
```

### 2. Tighten `story-intention.schema.json` per SPEC-24 §4.5.2

Required: `id`, `story_id`, `created_at_page`, `holder`, `intent`, `urgency`, `expires_when`. Properties match SPEC-24 enums (`urgency`: `low | medium | high`). `additionalProperties: false`.

### 3. Tighten `story-obligation.schema.json` per SPEC-24 §4.5.4

Required: `id`, `story_id`, `created_at_page`, `status`, `obligation_kind`, `description`, `owed_by`, `owed_to`, `trigger_to_close`. Status enum: `open | closed | escalated | abandoned | transferred`. `additionalProperties: false`. The `introduced_at_page` field is explicitly NOT in properties (dropped per SPEC-24 verdict).

### 4. Tighten `story-consequence.schema.json` per SPEC-24 §4.5.5

Required: `id`, `story_id`, `created_at_page`, `status`, `consequence_kind`, `description`, `resolves_when`. Status enum: `pending | resolved | escalated | abandoned`. `derived_from` (renamed from `trace_records`) optional. `additionalProperties: false`.

### 5. Tighten `story-thread.schema.json` per SPEC-24 §4.5.6

Required: `id`, `story_id`, `created_at_page`, `status`, `title`, `summary`, `urgency`. Status enum: `active | resolved | escalated | abandoned`. Urgency: `low | medium | high`. `derived_from` optional. `additionalProperties: false`.

### 6. Tighten `story-relationship.schema.json` per SPEC-24 §4.5.7

Required: `id`, `story_id`, `created_at_page`, `axis`, `participants` (2-item array), `direction`, `value`, `valence`, `description`. Axis enum: §4.4b closed list. Value enum: `none | trace | low | medium | high | extreme`. Valence enum: `symmetric | asymmetric | bidirectional | adversarial`. `derived_from` optional. `additionalProperties: false`. The `magnitude` field (renamed to `value`) is not in properties.

### 7. Tighten `story-entity.schema.json` per SPEC-24 §4.5.1

Required: `id`, `story_id`, `created_at_page`, `display_name`, `role_in_story`. `role_in_story` is an array of strings from §4.4b closed enum (12 values). `bound_char_id` optional nullable. `notes` is NOT in properties (dropped). `additionalProperties: false`.

### 8. Tighten `story-location.schema.json` per SPEC-24 §4.5.8

Required: `id`, `story_id`, `created_at_page`, `label`, `description`. `bound_ent` optional nullable. `open_at_opening` is NOT in properties (dropped). `additionalProperties: false`.

### 9. Tighten `story-object.schema.json` per SPEC-24 §4.5.9

Required: `id`, `story_id`, `created_at_page`, `label`, `description`, `owner`, `current_location`. `owner` is one of `STENT-<integer>` pattern, `group:<name>` pattern, `public` const, `null`. `current_location` similar polymorphic shape including `carried_by:STENT-<integer>` form. `additionalProperties: false`.

### 10. Tighten `story-branch.schema.json` per SPEC-24 §4.5.11

Required: `id`, `story_id`, `created_at_page`, `label`, `parent_branch_id`, `forked_at_page_id`, `root_page_id`. `parent_branch_id` and `forked_at_page_id` nullable (null for root branch). `description` optional. `supersedes` is NOT in properties (dropped — branches do not supersede; they fork). `additionalProperties: false`.

### 11. Tighten `story-choice.schema.json` per SPEC-24 §4.5.12

Required: `id`, `story_id`, `created_at_page`, `surface_label`, `player_visible_intent`, `target_or_action_families`, `likely_state_pressure`, `associated_commitment_block`. `target_or_action_families` is a NON-EMPTY array of strings from the §4.4a enum **with `attempt` removed**. `associated_commitment_block` is `^SLT-[0-9]+$ | null`. `success_policy` is optional string. `supersedes` is `^CHC-[0-9]+$ | null`. `additionalProperties: false`. The dropped fields (`choice_contract`, `choice_kind`, `choice_worthiness`, `commitment_class`, `commitment_detail`, `commitment_family`, `continuation_capacity`, `likely_effects`, `record_version`, `strategy_cluster`, `emitted_at_branch`, `emitted_by_page`, `target_or_action_family` singular) are NOT in properties.

### 12. Tighten `story-diegetic-artifact.schema.json` per SPEC-24 §4.5.10

Required: `id`, `story_id`, `created_at_page`, `title`, `author`, `genre`, `body`, `intended_audience`, `circulation`, `truth_relation`. Enums per SPEC-24 §4.5.10. `derived_from` optional. `additionalProperties: false`.

### 13. Tighten `story-event.schema.json` per SPEC-24 §4.3

Add to required: `created_at_page`, `parent_page_id`, `actor`, `outcome_route`, `world_logic_rationale`, `state_delta`. Add properties with enums per §4.3 (event_kind already present; outcome_route enum `accept | accommodate | attempt | world_block | promotion_hold | terminal`). `state_delta` is an object with `create`, `supersede`, `close` array sub-properties. `promotion_claims` optional array. `targets` optional array. `parent_page_id` nullable. `additionalProperties: false`.

### 14. Re-audit `story-belief.schema.json` per SPEC-24 §4.1 (no changes expected)

Compare current schema against §4.1. The audit verdict was "keep all 13 fields; this is the model case." Verify no fields drift. `additionalProperties: false` stays.

### 15. Re-audit `story-page.schema.json` per SPEC-24 §4.2 (R3 reconciliation applied)

Current schema requires `id`, `story_id`, `prose_plan_path`, `plan`, `state_hash`. Per R3 reconciliation:
- Add `prose_path` (optional, nullable, `^pages-prose/PG-[0-9]+\\.md$`) — already present.
- Add `prose_receipt_path` (optional, nullable, `^pages-prose-receipts/PG-[0-9]+\\.yaml$`) — NEW property.
- Encode `plan: {plan_hash}` only; SCAUD-001 collapsed the redundant `plan.path`, and the top-level `prose_plan_path` is the plan address.
- Add to required: `branch_id`, `parent_page_id`, `branch_path`, `turn_index`, `input`, `state_hash_parent`, `state_snapshot`, `emitted_choices`, `validation_trace`. (Each requires its own sub-schema; copy from contract §4.2.)
- `emitted_choices` is an array of `^CHC-[0-9]+$` strings; allow empty array for audit_repair pages.
- `additionalProperties: false` at top level; keep `additionalProperties: true` on `validation_trace` for forward extensibility.

### 16. Re-audit `story-storylet.schema.json` per SPEC-24 §4.4 (no changes expected)

The audit verdict was "keep all fields; no changes." Verify alignment with current §4.4. `additionalProperties: false` stays.

### 17. Remove `introduced_at_page` fallback from `recursive-reference-closure.ts`

The validator at `tools/validators/src/structural/recursive-reference-closure.ts` read `introduced_at_page` as a fallback when `created_at_page` was absent. Per SCAUD-001 plus the red-bunny removal, no OBL record will carry `introduced_at_page` — the amended schema requires `created_at_page`, and the one bundle that carried the duplicate field (red-bunny OBL-1) is removed. The fallback becomes dead code. Remove it; rely solely on `created_at_page`.

### 18. Update `record_schema_compliance` test fixtures

Drop test fixtures referencing dropped fields. Specifically in `tools/validators/tests/structural/record-schema-compliance-arc.test.ts`: remove fixtures using `choice_contract`, `choice_kind`, `choice_worthiness`, `commitment_class`, `commitment_detail`, `commitment_family`, `continuation_capacity`, `record_version`, `strategy_cluster`, `likely_effects` on CHC, and `user_intent` if it appears.

Add positive-case fixtures:
- A CHC record with `target_or_action_families: ["communicate", "bond"]` (multi-element list).
- An OBL record with only `created_at_page` (no `introduced_at_page`).
- A PG record with `prose_plan_path`, `prose_path: null`, `prose_receipt_path: null` (no `rendered_prose:` block).

Add negative-case fixtures:
- A CHC record with `target_or_action_family: "communicate"` (singular form) — should FAIL `record_schema_compliance`.
- A CHC record with `record_version: 2` (dropped field, `additionalProperties: false` rejects it) — should FAIL.
- A PG record with `rendered_prose: {path: null, receipt_path: null}` — should FAIL (the nested block is no longer permitted at top level).
- An OBL record with `introduced_at_page` — should FAIL.

### 19. Add `contract-schema-roundtrip.test.ts`

A new test fixture asserts the amended required/property sets for all 16 story record classes and validates representative amended records against the tightened schemas. This is the live surrogate for a parser-based contract roundtrip because this ticket's user-specified authority was SPEC-24, and the field-set guard directly encodes the SPEC-24 amended contract surface.

### 20. Check `get-canonical-vocabulary.ts`

The Explore agent's earlier trace noted that `commitment_class` and `commitment_family` are exposed via `get-canonical-vocabulary.ts` as MCP vocabulary properties. Per SPEC-24 audit, both are DROPPED from the CHC schema. Live reassessment found they remain independent vocabulary metadata for storylet/arc surfaces, not CHC record fields, so this ticket retains the vocabulary surface while asserting CHC no longer exposes either property through `get_record_schema`.

## Files to Touch

- `tools/validators/src/schemas/story-fact.schema.json` (modify)
- `tools/validators/src/schemas/story-intention.schema.json` (modify)
- `tools/validators/src/schemas/story-obligation.schema.json` (modify)
- `tools/validators/src/schemas/story-consequence.schema.json` (modify)
- `tools/validators/src/schemas/story-thread.schema.json` (modify)
- `tools/validators/src/schemas/story-relationship.schema.json` (modify)
- `tools/validators/src/schemas/story-entity.schema.json` (modify)
- `tools/validators/src/schemas/story-location.schema.json` (modify)
- `tools/validators/src/schemas/story-object.schema.json` (modify)
- `tools/validators/src/schemas/story-branch.schema.json` (modify)
- `tools/validators/src/schemas/story-choice.schema.json` (modify; remove `attempt` from enum; rename singular → plural array)
- `tools/validators/src/schemas/story-diegetic-artifact.schema.json` (modify)
- `tools/validators/src/schemas/story-event.schema.json` (modify)
- `tools/validators/src/schemas/story-belief.schema.json` (re-audit; likely no change)
- `tools/validators/src/schemas/story-page.schema.json` (modify per R3 reconciliation)
- `tools/validators/src/schemas/story-storylet.schema.json` (re-audit; likely no change)
- `tools/validators/src/structural/recursive-reference-closure.ts` (modify — remove `introduced_at_page` fallback)
- `tools/validators/tests/structural/record-schema-compliance*.test.ts` (modify — drop legacy fixtures, add positive + negative fixtures)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (new)
- `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` (inspect; retain or modify depending on whether `commitment_class` / `commitment_family` remain an independent vocabulary surface)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify — update assertions if they reference dropped properties)
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify — update story DA pre-apply fixture)
- `tools/world-index/src/hash/content.ts` and `tools/world-index/tests/hash/content.test.ts` (modify — align PG state-hash exclusion with top-level prose receipt fields)
- `tools/world-mcp/src/cli/compute-pg-hashes.ts` and `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` (modify — align CLI helper with PG hash contract)

## Out of Scope

- Any contract amendment (covered by SCAUD-001).
- Any world-side record cleanup. Red-bunny — the only currently-affected bundle — is removed and re-bootstrapped from zero (superseding the former SCAUD-002); other drifted bundles, if any, are remove-and-re-bootstrapped or supersession-cleaned manually by their owner.
- World-level record schemas (`canon-fact-record.schema.json`, etc.) — these are unrelated to the story-bundle audit.
- Adding new validator rules. This ticket strengthens existing schema-conformance enforcement; novel validation logic is a separate concern.

## Acceptance Criteria

### Tests That Must Pass

1. The full `tools/validators/` test suite passes (`npm test` or equivalent in `tools/validators/`).
2. The new `contract-schema-roundtrip.test.ts` passes for all 16 record classes.
3. Submitting a patch plan that creates a CHC record with `target_or_action_family: "communicate"` (singular form) fails with a typed `record_schema_compliance` error.
4. Submitting a patch plan that creates a CHC record with `record_version: 2` fails with a typed `record_schema_compliance` error citing the dropped property.
5. Submitting a patch plan that creates a PG record with `rendered_prose: {path: null, receipt_path: null}` fails with a typed `record_schema_compliance` error.
6. Submitting a patch plan that creates an OBL record with `introduced_at_page: PG-1` (instead of `created_at_page`) fails with a typed `record_schema_compliance` error.
7. The positive-case fixtures added in §18 (a CHC with multi-element `target_or_action_families`, an OBL with only `created_at_page`, a PG with `prose_plan_path` plus null `prose_path` / `prose_receipt_path`) all PASS `record_schema_compliance` — the tightened schemas accept conforming records without false positives.
8. `grep -E 'introduced_at_page' tools/validators/src/structural/recursive-reference-closure.ts` returns zero hits.

### Invariants

1. Every JSON schema's required + properties set matches SPEC-24's amended §4 schema for that class, with `additionalProperties: false` where the audit so dictates.
2. The amended SPEC-24/SCAUD-001 field sets and the JSON schemas are equivalent in field-set terms, verified by `contract-schema-roundtrip.test.ts`.
3. Hook 3 + the patch engine continue to enforce the schema-compliance check at every `_source/*.yaml` write.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-arc.test.ts` — modify: drop legacy fixtures, add positive + negative fixtures per §18.
2. `tools/validators/tests/structural/record-schema-compliance-story-*.test.ts` — modify: align with the tightened schemas.
3. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` — new: assert amended field sets for all story schemas and validate representative amended records.
4. `tools/validators/tests/structural/recursive-reference-closure.test.ts` — modify: remove tests that exercise the `introduced_at_page` fallback (the fallback is removed).
5. `tools/world-mcp/tests/tools/get-record-schema.test.ts` — modify: update assertions for dropped CHC properties (`commitment_class`, `commitment_family`).
6. `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` — modify: update story DA pre-apply fixture.

### Commands

1. `cd tools/validators && npm test` — full validator test suite.
2. `cd tools/world-index && npm test` — PG hash helper and world-index regression suite.
3. `cd tools/world-mcp && npm test` — MCP schema retrieval and pre-apply validation surface.

(The former command 4 — a sweep over red-bunny's on-disk records — is dropped: red-bunny is removed and re-bootstrapped from zero, so there are no pre-existing records to sweep. The synthetic positive/negative fixtures in §18 plus the §19 roundtrip test are the verification surface.)

## Outcome (2026-05-14)

Outcome: completed. Tightened the 13 formerly minimal story JSON schemas, re-audited the strict BEL/PG/SLT schemas, tightened SE, removed the `introduced_at_page` recursive-reference fallback, aligned PG hash helpers with `prose_path` / `prose_receipt_path` exclusion, and updated the MCP schema/pre-apply fixtures.

Verification:
- `cd tools/validators && npm test` — PASS, 188 tests.
- `cd tools/world-index && npm test` — PASS, 83 tests.
- `cd tools/world-mcp && npm test` — PASS, 359 tests.
- `git diff --check` — PASS.

Deviation: `get_canonical_vocabulary` still exposes `commitment_class` and `commitment_family`; reassessment found they are independent storylet/arc vocabulary metadata, not CHC fields. The CHC schema and MCP `get_record_schema` assertions now prove they are absent from CHC.
