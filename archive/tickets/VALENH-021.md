# VALENH-021: Tighten SLT `preconditions.hard | soft` JSON Schema to require a `pred` field

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/story-storylet.schema.json` gains structural enforcement of the predicate object shape (`pred` field with the closed `PRED_TYPES` enum), and the validators package schema-compliance tests gain focused accept/reject coverage. No deep per-predicate-args validation is added in the JSON schema (that already lives in `rule_storylet_predicate_dsl_parsability.ts`); the schema gains only the outermost shape enforcement. No skill prose, no FOUNDATIONS edits, no hook changes.
**Deps**: `archive/tickets/VALENH-017-predicate-dsl-id-regex-foundations-002-alignment.md` (immediate-prior work on the same predicate-DSL surface; this ticket complements it by tightening the JSON Schema layer), `archive/tickets/MCPENH-044-register-belief-record-class-in-world-index.md` (downstream consumer that depends on the predicate validator catching reference failures; ticket extends the same enforcement surface), `archive/tickets/PEENH-001.md` (the engine-routing ticket that wired storylet patch ops to the pre-apply validator gate)

## Problem

At intake, the JSON Schema at `tools/validators/src/schemas/story-storylet.schema.json:117-124` declares `SLT.preconditions.hard` and `SLT.preconditions.soft` as arrays of bare `{type: object}` items, with no enforcement of the predicate object's required shape. The actual shape — `{pred: "<predicate-name>", <flat predicate-specific args>}` — lives only in `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (the closed `PRED_TYPES` enum and per-predicate argument requirements) and is enforced at validator-runtime by `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`. The shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` §5 (lines 710-739) documents predicates in **surface form only** (e.g., `record_active(STENT-<integer>)`, `any_thread_active(alias, tag?, urgency?)`) and never shows the JSON-object form an operator must actually emit.

Before this ticket, a new operator authoring an SLT had to either (a) read the validator source to discover the JSON shape, or (b) author wrong-shape predicates and discover the requirement only at validation time as a wall of `predicate.missing_pred` errors. Neither path was documented anywhere a contract-following operator would look. The `describe_envelope_schema(op_kind='create_slt_record')` MCP retrieval returned the permissive schema directly, so even the machine-readable contract-discovery surface failed to teach the shape.

Session evidence (branching-story-bootstrap exercise, this Claude session, red-bunny bundle bootstrap): the operator authored 10 SLT records following the shared contract §5 surface form, producing predicate objects of shape `{"predicate": "record_active", "args": {"target": "STENT-1"}}`. The first `validate-patch-plan` invocation returned 32 `predicate.missing_pred` failures spanning every SLT preconditions block. Resolution required reading `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` and `rule_storylet_predicate_dsl_parsability.ts` to discover the actual shape `{"pred": "record_active", "record": "STENT-1"}`, then writing a small Python script to rewrite every predicate object across the envelope. Three round-trips would have been zero round-trips if the shape were either (a) enforced at the JSON Schema layer (immediate fail-fast against the schema-discovery surface) or (b) documented in the shared contract §5.

Ticket-intake codebase verification confirmed the gap: `tools/validators/src/schemas/story-storylet.schema.json:117-124` showed `"hard": { "type": "array", "items": { "type": "object" } }` with no nested shape constraints. `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts:4-29` declared the closed `PRED_TYPES` enum (24 predicate names) and `PREDICATE_ARG_SCHEMAS` (per-predicate required args). `.claude/skills/_shared-templates/story-state-contract.md` lines 710-739 carried only the surface-form predicate table — no JSON-object example anywhere. Working tree was clean at audit start.

VALENH-017 loosened the predicate-DSL ID regex but did not touch the JSON-Schema shape enforcement; VALENH-018 aligned the validator's `applies_to` filename regex with FOUNDATIONS-002 but did not touch the JSON-Schema shape enforcement. Before this ticket, the shape-enforcement gap remained unaddressed.

## Assumption Reassessment (2026-05-17)

1. **Pre-implementation codebase state**: before this ticket's source edit, `tools/validators/src/schemas/story-storylet.schema.json:113-127` confirmed `preconditions` was structured as `{required: ["hard"], properties: {hard: {type: array, items: {type: object}}, soft: {type: array, items: {type: object}}}}` — no nested shape enforcement. `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts:4-29` confirmed the closed `PRED_TYPES` array contains 24 predicate names: `fact_true`, `belief_record`, `entity_status`, `relationship_axis`, `obligation_open`, `consequence_pending`, `thread_active`, `any_obligation_open`, `any_consequence_pending`, `any_thread_active`, `any_relationship_axis`, `any_belief`, `any_intention`, `location`, `has_affordance`, `record_active`, `record_age`, `intention_active`, `object_accessible`, `artifact_accessible`, `affordance_available_to`, `not`, `all`, `any`. `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` performs the deeper shape/argument enforcement at runtime via the `pred`-field and per-argument checks. Working tree was clean at audit start.
2. **Spec / doc state**: `.claude/skills/_shared-templates/story-state-contract.md` §5 (lines 710-739) is the canonical predicate-DSL documentation surface for skill operators. The §5 table documents each predicate's surface-form signature (e.g., `record_active(STENT-<integer>)`, `any_thread_active(alias, tag?, urgency?)`) but never shows the JSON-object form. The `branching-story-bootstrap` SKILL.md references §5 as authoritative ("Use predicate DSL v2 for seed-block social-state coverage") but does not itself show the JSON form. `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` is the implementation-side source for shape requirements but is not surfaced via any operator-facing documentation.
3. **Shared boundary under audit**: the contract between (i) the SLT JSON Schema at `tools/validators/src/schemas/story-storylet.schema.json`, (ii) the runtime predicate validator at `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`, (iii) the `describe_envelope_schema` MCP-side schema-discovery surface, and (iv) the shared contract §5 documentation. All four should agree on the predicate-object shape. Before this ticket, (i), (iii), and (iv) under-specified the shape, while (ii) strictly enforced it at runtime. This ticket completes the schema-discovery side of the invariant: "every schema-discovery surface a skill operator could consult should teach the same shape the runtime validator enforces."
4. **Existing-output schema extension**: this ticket modifies the existing `story-storylet.schema.json` cross-skill schema. The change is **additive at the structural-shape level**: every previously-valid predicate-object (one that has a `pred` field naming a `PRED_TYPES` entry) continues to validate; previously-shape-invalid objects that the runtime validator was the only line of defense against now fail at the JSON-Schema layer instead, giving immediate fail-fast feedback through `describe_envelope_schema`. The deep per-predicate-args validation (required args per `PREDICATE_ARG_SCHEMAS`) is NOT added to the JSON Schema — that would require 24 oneOf branches and would duplicate the runtime validator's authority; the runtime validator remains the single source of per-predicate-args truth. Schema consumers in the patch engine's `record_schema_compliance` validator and `describe_envelope_schema` callers receive a more informative schema but no breaking shape change for legitimate inputs.
5. **Adjacent contradictions surfaced during reassessment**: other JSON Schemas in the patch-plan op envelope family that constrain free-form structured content via `{type: object}` without nested-shape enforcement may have the same "structural validator is the only enforcement" pattern. The `validation_trace` field on `story-page.schema.json` (line 109) uses `{type: object, additionalProperties: true}` and relies on `validation_trace_shape_compliance` for enforcement. Classification: this is a recurring pattern, not a one-off. This ticket scopes only the SLT preconditions case (the surface that produced session evidence); a broader "audit every `{type: object}` permissive schema slot and decide which gain structural enforcement" sweep is future cleanup and would be its own ticket. The Phase 8 final summary of the originating audit will note the shared-contract §5 documentation amendment as a routing-path-b direct-edit recommendation (the contract docs should also gain a JSON-object example), but that documentation work is not in this ticket's scope.
6. **Live proof-surface correction (2026-05-17)**: `tools/validators/package.json` confirms the package-local proof lane is `npm test`, which already runs `npm run build` before compiled tests. A pre-edit baseline `npm test` from `tools/validators` passed with 324/324 tests. Direct `mcp__worldloom__describe_envelope_schema(...)` / `mcp__worldloom__validate_patch_plan(...)` tools are not exposed in the active Codex session, so post-change acceptance uses the package-local `record_schema_compliance` and `validatePatchPlan` tests that exercise the same schema via the pre-apply validator path. `tools/world-mcp/src/tools/describe-envelope-schema.ts` references the same `story-storylet.schema.json` for `create_slt_record`, and `tools/world-mcp/tests/tools/get-record-schema.test.ts` already asserts schema-discovery returns that source schema verbatim.

## Architecture Check

1. **Why this approach is cleaner than alternatives**: tightening the JSON Schema to require `{pred: <PRED_TYPES enum>}` at minimum gives operators the fail-fast feedback they need at schema-discovery time without duplicating the per-predicate-args validation already owned by `rule_storylet_predicate_dsl_parsability.ts`. The alternative — encoding all 24 per-predicate sub-schemas in the JSON Schema — duplicates the runtime validator's authority and creates a synchronization burden across two surfaces. The alternative — leaving the JSON Schema permissive and relying solely on runtime validation — keeps the current state in which every new operator hits the same error wall. The minimum-viable enforcement is the cleanest: enforce the outermost shape (presence of `pred` field with a closed-enum value), let the runtime validator own per-predicate-args.
2. **No backwards-compatibility shim**: no alias / dual-shape / version-discriminator pattern is introduced. The schema change is purely tightening — previously-failing-at-runtime shapes now fail at schema-discovery time; previously-passing shapes continue to pass at both layers. There is no need to support an alternate shape for legacy SLT records because the runtime validator was already rejecting every wrong-shape predicate at submit time; the JSON Schema change just moves the rejection earlier in the operator workflow.

## Verification Layers

1. **JSON Schema enforces `pred` field with closed-enum value** → schema validation through `record_schema_compliance`: focused tests reject `{predicate: ..., args: {...}}` and `pred: "unknown_predicate"` with schema-layer verdicts.
2. **JSON Schema still accepts the correct `{pred: ...}` shape** → schema validation through `record_schema_compliance`: focused tests accept `preconditions.hard: [{pred: "record_active", record: "STENT-1"}]`.
3. **Schema enum stays aligned to runtime grammar** → package test: focused schema-source test compares the JSON Schema enum against `PRED_TYPES` from `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`.
4. **Runtime validator's per-predicate-args enforcement remains the deeper authority** → existing `validatePatchPlan` and `rule_storylet_predicate_dsl_parsability` tests continue to exercise missing/deeper predicate argument failures after the schema change.
5. **Schema-discovery consumers receive the tightened schema by reference** → existing `tools/world-mcp/tests/tools/get-record-schema.test.ts` asserts `storylet_record` returns `tools/validators/src/schemas/story-storylet.schema.json` verbatim; `describe-envelope-schema.ts` uses the same record schema mapping for `create_slt_record`. Direct MCP invocation is unavailable in this Codex session, so package-local build/test proof is the truthful substitute.

## Landed Changes

### 1. Tighten the SLT preconditions JSON Schema

In `tools/validators/src/schemas/story-storylet.schema.json`, `preconditions.hard.items` and `preconditions.soft.items` now reference `#/$defs/predicateObject`, which enforces:

```json
{
  "type": "object",
  "required": ["pred"],
  "properties": {
    "pred": {
      "type": "string",
      "enum": [
        "fact_true", "belief_record", "entity_status", "relationship_axis",
        "obligation_open", "consequence_pending", "thread_active",
        "any_obligation_open", "any_consequence_pending", "any_thread_active",
        "any_relationship_axis", "any_belief", "any_intention",
        "location", "has_affordance", "record_active", "record_age",
        "intention_active", "object_accessible", "artifact_accessible",
        "affordance_available_to", "not", "all", "any"
      ]
    }
  },
  "additionalProperties": true
}
```

The enum was copied from `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`'s `PRED_TYPES` constant. `tools/validators/tests/structural/record-schema-compliance.test.ts` now compares the JSON Schema enum to that runtime constant so future predicate additions fail fast if the two surfaces drift.

`additionalProperties: true` is intentional — the per-predicate-args validation lives in `rule_storylet_predicate_dsl_parsability.ts` and the JSON Schema deliberately does not duplicate it. The minimum-viable shape enforcement is the `pred` field with the closed enum.

### 2. Cross-reference between schema source and validator source

The predicate-object schema includes a JSON Schema `$comment` referencing `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` `PRED_TYPES` as the source of truth for the enum, and noting that deep per-predicate-args validation lives in `rule_storylet_predicate_dsl_parsability.ts`. A raw JSON comment block was not used because the schema file must remain valid JSON.

### 3. Add focused schema-compliance tests

`tools/validators/tests/structural/record-schema-compliance.test.ts` now verifies:

- correct `{pred, ...}` predicate objects pass schema compliance
- `{predicate, args}` legacy/wrong-shape objects fail with a missing-`pred` schema verdict
- unknown `pred` names fail with a schema enum verdict
- the schema enum mirrors `PRED_TYPES`

### 4. Rebuild and verify

`cd tools/validators && npm test` rebuilds the package first, refreshed the ignored `tools/validators/dist/` artifact, and passed after the schema/test edits.

## Files to Touch

- `tools/validators/src/schemas/story-storylet.schema.json` (modify — `preconditions.hard.items` and `preconditions.soft.items` shape tightening)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify — focused schema-layer accept/reject tests and enum parity with `PRED_TYPES`)
- `archive/tickets/VALENH-021.md` (modify — reassessment and closeout truthing)

## Out of Scope

- Deep per-predicate-args validation in the JSON Schema. The runtime validator at `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` remains the single source of truth for per-predicate-args validation; duplicating it into 24 oneOf branches in the JSON Schema creates a synchronization burden across two surfaces.
- The shared contract `.claude/skills/_shared-templates/story-state-contract.md` §5 documentation amendment to add a JSON-object example for predicates. That documentation work is recommended as a Phase 8 routing-path-b direct edit by the originating audit but is not in this ticket's scope (direct edits to shared-templates are out of the mcp-integration-audit ticket-emitting surface).
- The `branching-story-bootstrap` SKILL.md update to disclose the predicate-DSL JSON shape. Skill-prose updates route through `/skill-audit`, not this ticket.
- Other JSON Schemas with permissive `{type: object}` slots (e.g., `validation_trace` on `story-page.schema.json`). A broader sweep of permissive-schema slots is future cleanup and would be its own ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` passed after the schema edit and rebuild.
2. The schema-acceptance test now asserts that an SLT record with `preconditions.hard: [{pred: 'record_active', record: 'STENT-1'}]` validates against the schema, AND an SLT record with `preconditions.hard: [{predicate: 'record_active', args: {target: 'STENT-1'}}]` (the wrong shape) fails validation against the schema with a clear `pred`-related error.
3. The package-local `record_schema_compliance` proof returns `record_schema_compliance` verdicts for wrong-shape SLT predicates (the JSON Schema catches the wrong shape before `storylet_predicate_dsl_parsability` owns deeper per-argument failures). Direct MCP calls are not an available proof surface in this Codex session.

### Invariants

1. The SLT `preconditions.hard | soft` JSON Schema requires every item to carry a `pred` string field whose value is in the closed `PRED_TYPES` enum.
2. The deep per-predicate-args validation continues to live exclusively in `rule_storylet_predicate_dsl_parsability.ts`; the JSON Schema deliberately enforces only the outermost shape.
3. The JSON Schema enum is sourced from `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` `PRED_TYPES` constant; if a future ticket adds a predicate to `PRED_TYPES`, this schema must be updated to include it (the two surfaces are co-evolving).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` — extended the existing schema-compliance suite with correct-shape predicate acceptance, missing-`pred` rejection, unknown-`pred` rejection, and schema enum parity with `PRED_TYPES`.
2. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` — no source change expected; existing fixtures continue to pass and remain the deeper per-predicate-args authority.

### Commands

1. `cd tools/validators && npm test` — package-local validator suite.
2. Focused compiled test proof from the same package lane — `record_schema_compliance` accepts correct `{pred, ...}` predicates and rejects `{predicate, args}` plus unknown `pred` values at the schema layer.
3. Direct `mcp__worldloom__describe_envelope_schema` / `/tmp` plan smokes are unavailable or non-portable in this Codex session; schema-discovery propagation is proven by source mapping plus package tests unless a later run restarts/exposes the MCP tool.

## Outcome

Completed. The storylet JSON Schema now enforces the outer predicate-object contract for both `preconditions.hard[]` and `preconditions.soft[]`: each item must include a `pred` string whose value is one of the runtime `PRED_TYPES`. The schema remains intentionally permissive for predicate-specific argument fields via `additionalProperties: true`; `rule_storylet_predicate_dsl_parsability.ts` remains the deeper per-argument authority.

The existing `record_schema_compliance` suite now covers correct predicate-object acceptance, missing-`pred` rejection, unknown-`pred` rejection, and enum parity with the runtime predicate grammar.

## Verification Result

1. Pre-edit baseline: `npm test` from `tools/validators` — passed, 324/324 tests. This confirmed the broad validators package lane was green before the schema edit.
2. Final proof: `npm test` from `tools/validators` — passed, 326/326 tests. This rebuilt the package first and exercised the new focused schema-compliance tests plus existing `validatePatchPlan` and predicate-DSL rule coverage.
3. Source/artifact inspection: `rg -n 'predicateObject|PRED_TYPES|record_schema_compliance enforces storylet predicate object shape|storylet predicate schema mirrors' tools/validators/src/schemas/story-storylet.schema.json tools/validators/tests/structural/record-schema-compliance.test.ts tools/validators/dist/tests/structural/record-schema-compliance.test.js` — passed and confirmed the source schema and compiled test artifact contain the new predicate-object contract/tests. There is no `tools/validators/dist/src/schemas/story-storylet.schema.json`; the compiled validator reads schemas from `tools/validators/src/schemas/`, so the refreshed ignored `dist/` proof is the compiled test/runtime layer rather than a copied schema file.

## Deviations

- The drafted direct MCP proof (`mcp__worldloom__describe_envelope_schema(...)`) was not run because that tool is not exposed in this Codex session. Schema-discovery propagation is covered by source mapping (`describe-envelope-schema.ts` uses the `storylet_record` schema for `create_slt_record`) and the existing `get-record-schema` contract test that returns the source schema verbatim.
- The drafted `/tmp/slt-*.json` plan smokes were not run because those paths were not checked-in proof artifacts. The accepted proof is package-local schema compliance and `validatePatchPlan` coverage inside `tools/validators`.
- Post-ticket review created `tickets/VALENH-022.md` for the remaining operator-facing documentation gap in `.claude/skills/_shared-templates/story-state-contract.md` and directly consuming SLT-authoring skills. That prose work was explicitly out of scope for this schema ticket.
- `tools/validators/dist/` was refreshed by `npm test` and remains an ignored generated artifact. `tools/validators/node_modules/`, `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/` were pre-existing ignored artifacts and were left in place.
