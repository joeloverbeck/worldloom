# VALENH-021: Tighten SLT `preconditions.hard | soft` JSON Schema to require a `pred` field and align the documentation surface

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/story-storylet.schema.json` gains structural enforcement of the predicate object shape (`pred` field with the closed `PRED_TYPES` enum). No deep per-predicate-args validation is added in the JSON schema (that already lives in `rule_storylet_predicate_dsl_parsability.ts`); the schema gains only the outermost shape enforcement. No skill prose, no FOUNDATIONS edits, no hook changes.
**Deps**: `archive/tickets/VALENH-017-predicate-dsl-id-regex-foundations-002-alignment.md` (immediate-prior work on the same predicate-DSL surface; this ticket complements it by tightening the JSON Schema layer), `archive/tickets/MCPENH-044-register-belief-record-class-in-world-index.md` (downstream consumer that depends on the predicate validator catching reference failures; ticket extends the same enforcement surface), `archive/tickets/PEENH-001.md` (the engine-routing ticket that wired storylet patch ops to the pre-apply validator gate)

## Problem

At intake, the JSON Schema at `tools/validators/src/schemas/story-storylet.schema.json:117-124` declares `SLT.preconditions.hard` and `SLT.preconditions.soft` as arrays of bare `{type: object}` items, with no enforcement of the predicate object's required shape. The actual shape — `{pred: "<predicate-name>", <flat predicate-specific args>}` — lives only in `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (the closed `PRED_TYPES` enum and per-predicate argument requirements) and is enforced at validator-runtime by `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`. The shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` §5 (lines 710-739) documents predicates in **surface form only** (e.g., `record_active(STENT-<integer>)`, `any_thread_active(alias, tag?, urgency?)`) and never shows the JSON-object form an operator must actually emit.

Net result: a new operator authoring an SLT must either (a) read the validator source to discover the JSON shape, or (b) author wrong-shape predicates and discover the requirement only at validation time as a wall of `predicate.missing_pred` errors. Neither path is documented anywhere a contract-following operator would look. The `describe_envelope_schema(op_kind='create_slt_record')` MCP retrieval returns the permissive schema directly, so even the machine-readable contract-discovery surface fails to teach the shape.

Session evidence (branching-story-bootstrap exercise, this Claude session, red-bunny bundle bootstrap): the operator authored 10 SLT records following the shared contract §5 surface form, producing predicate objects of shape `{"predicate": "record_active", "args": {"target": "STENT-1"}}`. The first `validate-patch-plan` invocation returned 32 `predicate.missing_pred` failures spanning every SLT preconditions block. Resolution required reading `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` and `rule_storylet_predicate_dsl_parsability.ts` to discover the actual shape `{"pred": "record_active", "record": "STENT-1"}`, then writing a small Python script to rewrite every predicate object across the envelope. Three round-trips would have been zero round-trips if the shape were either (a) enforced at the JSON Schema layer (immediate fail-fast against the schema-discovery surface) or (b) documented in the shared contract §5.

Codebase verification at HEAD confirms the gap: `tools/validators/src/schemas/story-storylet.schema.json:117-124` shows `"hard": { "type": "array", "items": { "type": "object" } }` with no nested shape constraints. `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts:4-29` declares the closed `PRED_TYPES` enum (24 predicate names) and `PREDICATE_ARG_SCHEMAS` (per-predicate required args). `.claude/skills/_shared-templates/story-state-contract.md` lines 710-739 carry only the surface-form predicate table — no JSON-object example anywhere. Working tree was clean at audit start.

VALENH-017 loosened the predicate-DSL ID regex but did not touch the JSON-Schema shape enforcement; VALENH-018 aligned the validator's `applies_to` filename regex with FOUNDATIONS-002 but did not touch the JSON-Schema shape enforcement; the shape-enforcement gap remains unaddressed.

## Assumption Reassessment (2026-05-17)

1. **Codebase state at HEAD**: `tools/validators/src/schemas/story-storylet.schema.json:113-127` confirms `preconditions` is structured as `{required: ["hard"], properties: {hard: {type: array, items: {type: object}}, soft: {type: array, items: {type: object}}}}` — no nested shape enforcement. `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts:4-29` confirms the closed `PRED_TYPES` array contains 24 predicate names: `fact_true`, `belief_record`, `entity_status`, `relationship_axis`, `obligation_open`, `consequence_pending`, `thread_active`, `any_obligation_open`, `any_consequence_pending`, `any_thread_active`, `any_relationship_axis`, `any_belief`, `any_intention`, `location`, `has_affordance`, `record_active`, `record_age`, `intention_active`, `object_accessible`, `artifact_accessible`, `affordance_available_to`, `not`, `all`, `any`. `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` performs the shape enforcement at runtime via the `pred`-field check (which is what produced the 32 `predicate.missing_pred` errors in the session evidence). Working tree was clean at audit start.
2. **Spec / doc state**: `.claude/skills/_shared-templates/story-state-contract.md` §5 (lines 710-739) is the canonical predicate-DSL documentation surface for skill operators. The §5 table documents each predicate's surface-form signature (e.g., `record_active(STENT-<integer>)`, `any_thread_active(alias, tag?, urgency?)`) but never shows the JSON-object form. The `branching-story-bootstrap` SKILL.md references §5 as authoritative ("Use predicate DSL v2 for seed-block social-state coverage") but does not itself show the JSON form. `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` is the implementation-side source for shape requirements but is not surfaced via any operator-facing documentation.
3. **Shared boundary under audit**: the contract between (i) the SLT JSON Schema at `tools/validators/src/schemas/story-storylet.schema.json`, (ii) the runtime predicate validator at `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`, (iii) the `describe_envelope_schema` MCP-side schema-discovery surface, and (iv) the shared contract §5 documentation. All four should agree on the predicate-object shape. Currently (i), (iii), and (iv) under-specify the shape, while (ii) strictly enforces it at runtime. The unwritten invariant: "every schema-discovery surface a skill operator could consult should teach the same shape the runtime validator enforces."
4. **Existing-output schema extension**: this ticket modifies the existing `story-storylet.schema.json` cross-skill schema. The change is **additive at the structural-shape level**: every previously-valid predicate-object (one that has a `pred` field naming a `PRED_TYPES` entry) continues to validate; previously-shape-invalid objects that the runtime validator was the only line of defense against now fail at the JSON-Schema layer instead, giving immediate fail-fast feedback through `describe_envelope_schema`. The deep per-predicate-args validation (required args per `PREDICATE_ARG_SCHEMAS`) is NOT added to the JSON Schema — that would require 24 oneOf branches and would duplicate the runtime validator's authority; the runtime validator remains the single source of per-predicate-args truth. Schema consumers in the patch engine's `record_schema_compliance` validator and `describe_envelope_schema` callers receive a more informative schema but no breaking shape change for legitimate inputs.
5. **Adjacent contradictions surfaced during reassessment**: other JSON Schemas in the patch-plan op envelope family that constrain free-form structured content via `{type: object}` without nested-shape enforcement may have the same "structural validator is the only enforcement" pattern. The `validation_trace` field on `story-page.schema.json` (line 109) uses `{type: object, additionalProperties: true}` and relies on `validation_trace_shape_compliance` for enforcement. Classification: this is a recurring pattern, not a one-off. This ticket scopes only the SLT preconditions case (the surface that produced session evidence); a broader "audit every `{type: object}` permissive schema slot and decide which gain structural enforcement" sweep is future cleanup and would be its own ticket. The Phase 8 final summary of the originating audit will note the shared-contract §5 documentation amendment as a routing-path-b direct-edit recommendation (the contract docs should also gain a JSON-object example), but that documentation work is not in this ticket's scope.

## Architecture Check

1. **Why this approach is cleaner than alternatives**: tightening the JSON Schema to require `{pred: <PRED_TYPES enum>}` at minimum gives operators the fail-fast feedback they need at schema-discovery time without duplicating the per-predicate-args validation already owned by `rule_storylet_predicate_dsl_parsability.ts`. The alternative — encoding all 24 per-predicate sub-schemas in the JSON Schema — duplicates the runtime validator's authority and creates a synchronization burden across two surfaces. The alternative — leaving the JSON Schema permissive and relying solely on runtime validation — keeps the current state in which every new operator hits the same error wall. The minimum-viable enforcement is the cleanest: enforce the outermost shape (presence of `pred` field with a closed-enum value), let the runtime validator own per-predicate-args.
2. **No backwards-compatibility shim**: no alias / dual-shape / version-discriminator pattern is introduced. The schema change is purely tightening — previously-failing-at-runtime shapes now fail at schema-discovery time; previously-passing shapes continue to pass at both layers. There is no need to support an alternate shape for legacy SLT records because the runtime validator was already rejecting every wrong-shape predicate at submit time; the JSON Schema change just moves the rejection earlier in the operator workflow.

## Verification Layers

1. **JSON Schema enforces `pred` field with closed-enum value** → schema validation: `node -e "const Ajv=require('ajv'); const a=new Ajv(); const v=a.compile(require('./tools/validators/src/schemas/story-storylet.schema.json')); console.log(v({id:'SLT-1', story_id:'STORY-1', scope:{visibility:'global_author_pool', branch_id:null}, title:'X', move_family:'orient', preconditions:{hard:[{predicate:'record_active', args:{target:'STENT-1'}}]}, beats:[{beat_id:'B1', function:'setup', instruction:'X'}], exit_options:[], saliency:{urgency:'low', cooldown_pages:0}, mystery_policy:{allowed_authority:'apparent'}, provenance:{origin:'bootstrap_seed'}}))"` returns `false` (the `{predicate: ..., args: {...}}` shape is rejected at schema-discovery time, not at runtime).
2. **JSON Schema still accepts the correct `{pred: ...}` shape** → schema validation: same compile with `preconditions:{hard:[{pred:'record_active', record:'STENT-1'}]}` returns `true`.
3. **JSON Schema rejects unknown predicate names** → schema validation: same compile with `preconditions:{hard:[{pred:'unknown_predicate', record:'STENT-1'}]}` returns `false`.
4. **Runtime validator's per-predicate-args enforcement remains the deeper authority** → skill dry-run: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/slt-malformed-args.json` against a plan where every predicate has a correct `pred` field but missing required args returns `status: fail` with `predicate.missing_*` verdicts from `storylet_predicate_dsl_parsability` (the runtime validator continues to catch the deeper violations the JSON Schema deliberately does not).
5. **`describe_envelope_schema` returns the tightened schema** → MCP retrieval: `mcp__worldloom__describe_envelope_schema(op_kind='create_slt_record')` returns a schema whose `preconditions.hard.items` has `required: ["pred"]` and a `pred` enum naming all `PRED_TYPES` entries.

## What to Change

### 1. Tighten the SLT preconditions JSON Schema

In `tools/validators/src/schemas/story-storylet.schema.json`, replace the current `preconditions.hard.items` and `preconditions.soft.items` declarations (currently `{type: object}`) with:

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

The enum is sourced from `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`'s `PRED_TYPES` constant. The implementer should treat that constant as the single source of truth for the enum contents and copy them verbatim at implementation time; the audit-time enum above is a snapshot.

`additionalProperties: true` is intentional — the per-predicate-args validation lives in `rule_storylet_predicate_dsl_parsability.ts` and the JSON Schema deliberately does not duplicate it. The minimum-viable shape enforcement is the `pred` field with the closed enum.

### 2. Cross-reference between schema source and validator source

Add a comment block to the predicate-items schema referencing `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` `PRED_TYPES` as the source of truth for the enum, and noting that the deep per-predicate-args validation lives in `rule_storylet_predicate_dsl_parsability.ts`. This is the engineering equivalent of FOUNDATIONS-002's intentional cross-reference between the contract and the implementation.

### 3. Rebuild the dist

`cd tools/validators && npm run build` to regenerate any built artifact that consumes the schema files.

### 4. Confirm the test suite still passes

`cd tools/validators && npm test` after the rebuild. Existing fixtures using correctly-shaped predicates continue to pass; any test fixture that previously authored predicates with `{predicate: ..., args: ...}` (the wrong shape) and relied on the runtime validator to catch it is now caught earlier by the JSON Schema — the assertion should be updated to expect the earlier rejection.

## Files to Touch

- `tools/validators/src/schemas/story-storylet.schema.json` (modify — `preconditions.hard.items` and `preconditions.soft.items` shape tightening)

## Out of Scope

- Deep per-predicate-args validation in the JSON Schema. The runtime validator at `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` remains the single source of truth for per-predicate-args validation; duplicating it into 24 oneOf branches in the JSON Schema creates a synchronization burden across two surfaces.
- The shared contract `.claude/skills/_shared-templates/story-state-contract.md` §5 documentation amendment to add a JSON-object example for predicates. That documentation work is recommended as a Phase 8 routing-path-b direct edit by the originating audit but is not in this ticket's scope (direct edits to shared-templates are out of the mcp-integration-audit ticket-emitting surface).
- The `branching-story-bootstrap` SKILL.md update to disclose the predicate-DSL JSON shape. Skill-prose updates route through `/skill-audit`, not this ticket.
- Other JSON Schemas with permissive `{type: object}` slots (e.g., `validation_trace` on `story-page.schema.json`). A broader sweep of permissive-schema slots is future cleanup and would be its own ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` passes after the schema edit and rebuild.
2. A new schema-acceptance test asserts that an SLT record with `preconditions.hard: [{pred: 'record_active', record: 'STENT-1'}]` validates against the schema, AND an SLT record with `preconditions.hard: [{predicate: 'record_active', args: {target: 'STENT-1'}}]` (the wrong shape) fails validation against the schema with a clear `pred`-related error.
3. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/slt-wrong-shape-plan.json` returns `status: fail` with `record_schema_compliance` verdicts on every SLT record (the JSON Schema catches the wrong shape before `storylet_predicate_dsl_parsability` runs).

### Invariants

1. The SLT `preconditions.hard | soft` JSON Schema requires every item to carry a `pred` string field whose value is in the closed `PRED_TYPES` enum.
2. The deep per-predicate-args validation continues to live exclusively in `rule_storylet_predicate_dsl_parsability.ts`; the JSON Schema deliberately enforces only the outermost shape.
3. The JSON Schema enum is sourced from `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` `PRED_TYPES` constant; if a future ticket adds a predicate to `PRED_TYPES`, this schema must be updated to include it (the two surfaces are co-evolving).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/schemas/story-storylet.test.ts` (new or extend if a sibling exists) — schema-acceptance fixtures asserting correct-shape predicates validate and wrong-shape predicates fail at the JSON-Schema layer.
2. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` — existing fixtures continue to pass; any fixture that authored `{predicate: ..., args: ...}` wrong-shape and relied on the runtime check to catch it should be updated to author the correct shape OR explicitly assert the earlier JSON-Schema rejection.

### Commands

1. `cd tools/validators && npm test` — package-local validator suite.
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/slt-correct-shape-plan.json` — end-to-end PASS against a representative SLT plan with correctly-shaped predicates.
3. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/slt-wrong-shape-plan.json` — end-to-end FAIL against the same plan with `{predicate, args}` wrong-shape; failure should come from `record_schema_compliance` (the JSON-Schema-layer check) not from `storylet_predicate_dsl_parsability` (the runtime check that previously was the only catcher).
