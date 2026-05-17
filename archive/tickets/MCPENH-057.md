# MCPENH-057: Expose per-predicate argument schemas via the MCP schema-discovery surface

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify), `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` (new committed referenced schema), `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (new), `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (modify), `tools/world-mcp/README.md` (modify), and `docs/MACHINE-FACING-LAYER.md` (modify)
**Deps**: None

## Problem

At intake, when operators authored `SLT` records (especially `runtime_jit` blocks created mid-flow by `branching-story-turn-cycle`, or fresh author-pool batches authored by `commitment-block-authoring`), they had to emit `preconditions.hard[]` and `preconditions.soft[]` predicate objects whose per-predicate argument shapes (e.g., `obligation_open` requires `obligation: OBL-<integer>`; `consequence_pending` requires `consequence: CNSQ-<integer>`; `location` requires `entity: STENT-<integer>` and `location: STLOC-<integer>`; `intention_active` requires `intention: STINT-<integer>`) were canonically defined only in `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`'s `PREDICATE_ARG_SCHEMAS` table.

Before this ticket, that table was not exposed via any MCP retrieval tool. `tools/validators/src/schemas/story-storylet.schema.json` defines `predicateObject` with `additionalProperties: true` and a `$comment` that explicitly defers per-predicate argument validation to the TS rule file — so when `describe_envelope_schema(op_kind='create_slt_record')` returned the SLT envelope schema, the operator saw the closed `pred` enum (which was helpful) but received zero machine-readable per-predicate argument-shape information. The result was one of three fallback patterns:

1. **Read the TS source directly** — operator runs `Grep` / `Read` against `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` to enumerate `PREDICATE_ARG_SCHEMAS`. Works but requires source-file access and out-of-band lookup.
2. **Pattern-match from existing storylets** — operator scans an in-bundle SLT record for an example of the predicate they want to emit and copies its field shape. Works only when an in-bundle exemplar exists for the specific predicate; fresh bundles or rarely-used predicates have no exemplar.
3. **Defensive substitution to safer predicates** — operator emits `record_active(<id>)` instead of the semantically-precise `obligation_open(<id>)` / `consequence_pending(<id>)` to avoid the argument-name uncertainty. Validator passes (because `record_active` accepts any record class), but the emitted SLT loses semantic precision: `record_active(OBL-1)` checks only that OBL-1 is in active_records, while `obligation_open(OBL-1)` would additionally signal status-open semantics to readers and to any future validator that distinguishes them.

The `storylet_predicate_dsl_parsability` validator (VALENH-001) already caught malformed predicate emissions at validate-patch-plan time, so the system had a "try → get rejected → fix" loop. Authoring-time discoverability was the missing surface — the MCP schema-discovery surface (`describe_envelope_schema`, `get_record_schema`, `describe_capabilities`) is the place an operator looks first, and before this ticket the predicate-DSL grammar was the largest closed-vocabulary surface in story-bundle authoring not exposed there.

## Assumption Reassessment (2026-05-17)

1. **Codebase reassessment**: `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` exports `PRED_TYPES` (24 names) and `PREDICATE_ARG_SCHEMAS` (24 entries, one per predicate, each with `required[]` and inferable optional fields from rule logic). `tools/validators/src/schemas/story-storylet.schema.json:242-280` defines `predicateObject` with `additionalProperties: true` and an explicit `$comment` deferring per-arg validation to the rule TS. `tools/world-mcp/src/tools/describe-envelope-schema.ts` returns `envelope_schema`, `op_schemas`, and `referenced_schemas`; `referenced_schemas` already inlines JSON schemas by URI (e.g., `https://worldloom.local/schemas/story-page.schema.json`, `https://worldloom.local/schemas/extension-entry.schema.json`) — the natural extension point. Grep `tools/world-mcp/src/` for `predicate.dsl|predicate_grammar|get_predicate|describe_predicate` returns zero hits at HEAD; no MCP tool exposes the per-arg schema.
2. **Doc reassessment**: `docs/MACHINE-FACING-LAYER.md` documents `describe_envelope_schema` as the schema-discovery surface for patch ops but does not enumerate predicate-DSL discoverability as a separate concern. `.claude/skills/_shared-templates/story-state-contract.md` §5 (Closed Predicate DSL) names `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` as the canonical `pred` source and points at `tools/validators/src/schemas/story-storylet.schema.json` as the schema-discovery surface — but the schema-discovery surface today exposes only `pred` names (via the enum), not per-pred arg shapes. The contract's example block (lines 80-91) shows the canonical YAML form but is example-by-example rather than enumerated.
3. **Shared boundary under audit**: the contract between the MCP schema-discovery surface (`describe_envelope_schema` + `get_record_schema`) and downstream operators authoring SLT records. Today the boundary is asymmetric — the MCP exposes the SLT record schema and the `pred` enum, but per-predicate argument shapes are reachable only through direct TS source access. Operators who pattern-match from existing records implicitly trust that the existing records' predicate-arg shapes match the current TS grammar (which is true if both move together, but the asymmetry means schema drift in `PREDICATE_ARG_SCHEMAS` is invisible to MCP-only consumers).
4. **Existing-output schema extension**: this ticket extends the existing `describe_envelope_schema` op-schema response shape additively. The new addition is the existing URI-keyed `referenced_schemas` map populated with `https://worldloom.local/schemas/predicate-dsl-grammar.schema.json` for op-kinds whose record schemas reference `predicateObject` (currently `create_slt_record`; future-extensible to any op whose schema references the predicate DSL). The addition is additive-only: existing consumers continue to receive every existing field; new consumers can query `referenced_schemas['https://worldloom.local/schemas/predicate-dsl-grammar.schema.json']` for the per-predicate argument table. The corresponding JSON Schema file at `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` (new) serializes `PREDICATE_ARG_SCHEMAS` from TS into a JSON Schema document that describes each predicate's argument shape as a discriminated union keyed by `pred`.
5. **Live-path/proof correction**: the existing `describe_envelope_schema` focused test lives at `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts`, not `tools/world-mcp/tests/server/describe-envelope-schema.test.ts`. The package manifests have package-local scripts only; truthful proof is sequential package-root `npm run build` followed by compiled `dist/tests/**` direct lanes or package-local `npm test`. A direct post-change `mcp__worldloom__describe_envelope_schema` smoke is not available in this Codex toolset/restarted-server state, so MCP acceptance is substituted with package-local handler and in-memory dispatch coverage.
6. **Adjacent contradictions classification**: the same authoring-time discoverability gap applies to BEL records' `basis.access_route` enum (closed list of 11 routes: `direct_observation | testimony | document | object_trace | location_trace | inference | surveillance | institutional_channel | magic_tech | rumor | authorial_initialization`), to STENT role taxonomy (12 closed roles), to SREL axis taxonomy (14 closed axes), and to action_family taxonomy (20 closed families). All of these are exposed at the JSON-schema enum level via `describe_envelope_schema`, so they are already discoverable today; the predicate-DSL grammar is the unique outlier because its per-predicate argument shape is NOT in the JSON schema (the schema enumerates only the `pred` enum). This ticket is scoped to the predicate-DSL gap only; the other taxonomies do not need a parallel extension because they are already discoverable via existing enum-in-schema patterns. No separate cleanup ticket needed.

## Architecture Check

1. **JSON Schema as the surface, not a new MCP tool**. Two alternatives were considered:
   - **Alt A**: add a new MCP tool `describe_predicate_grammar()` returning the `PREDICATE_ARG_SCHEMAS` table. Rejected because it adds an MCP-surface vocabulary item that operators must discover separately, and because the same data is naturally co-located with the SLT record schema (any operator authoring an SLT will already query the SLT envelope schema; co-locating the predicate grammar there is cheaper than a separate discovery step).
   - **Alt B**: extend `describe_envelope_schema`'s `referenced_schemas` to include a `predicate-dsl-grammar.schema.json` document. Chosen because `referenced_schemas` is already the documented co-location surface for schemas the record-schema references (per `tools/world-mcp/src/tools/describe-envelope-schema.ts` current behavior). An operator querying `describe_envelope_schema('create_slt_record')` for SLT shape gets the predicate grammar in the same response, alongside the SLT record schema and any other referenced schemas — single discovery step, no out-of-band lookup.
2. **No backwards-compatibility aliasing/shims**. The new `predicate-dsl-grammar.schema.json` is added; existing `referenced_schemas` entries are unchanged; existing consumers that don't read the new entry continue to function. No deprecation of existing fields; no rename of existing schemas; no migration period needed.
3. **Single source of truth preserved**. `PREDICATE_ARG_SCHEMAS` in TS remains canonical for predicate names and required arguments. The new committed `predicate-dsl-grammar.schema.json` is guarded by `tools/validators/tests/predicate-dsl-grammar-parity.test.ts`, which compares the schema's oneOf entries, `pred` constants, and required argument lists against the TS table and also compiles the schema with Ajv2020 against valid and invalid samples.

## Verification Layers

1. **`describe_envelope_schema('create_slt_record')` returns `predicate-dsl-grammar.schema.json` in `referenced_schemas`** → package-local handler proof: build `tools/world-mcp` and run `node --test dist/tests/tools/describe-envelope-schema.test.js`, which asserts `create_slt_record` includes the schema and `create_cf_record` excludes it.
2. **JSON schema enumerates every PRED_TYPE entry with its required arguments** → schema validation: run a JSON Schema validator against the new file with sample predicate emissions (one valid + one invalid per predicate) and confirm the schema correctly accepts the valid + rejects the invalid.
3. **TS PREDICATE_ARG_SCHEMAS and JSON predicate-dsl-grammar.schema.json stay in lockstep for names and required args** → compiled parity test: `node --test dist/tests/predicate-dsl-grammar-parity.test.js`.
4. **Operators querying via `describe_envelope_schema` no longer need to read TS source for predicate-DSL authoring** → documentation and handler proof: `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md` name the new referenced schema, and the handler test proves the schema body is returned with representative predicates such as `obligation_open` and `consequence_pending`.

## Landed Changes

### 1. Add the predicate-DSL JSON Schema file

Created `tools/validators/src/schemas/predicate-dsl-grammar.schema.json`. It is a JSON Schema document whose root is a discriminated union over the closed `pred` enum, with per-pred subschemas naming the required arguments. Example (abbreviated):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://worldloom.local/schemas/predicate-dsl-grammar.schema.json",
  "title": "PredicateDslGrammar",
  "description": "Per-predicate argument schemas for the closed predicate DSL used in SLT.preconditions.hard/soft. Mirrors PREDICATE_ARG_SCHEMAS in tools/validators/src/rules/_shared/predicate-dsl-grammar.ts.",
  "oneOf": [
    {
      "title": "fact_true",
      "properties": {
        "pred": { "const": "fact_true" },
        "fact": { "type": "string", "pattern": "^SF-[0-9]+$" }
      },
      "required": ["pred", "fact"]
    },
    {
      "title": "obligation_open",
      "properties": {
        "pred": { "const": "obligation_open" },
        "obligation": { "type": "string", "pattern": "^OBL-[0-9]+$" }
      },
      "required": ["pred", "obligation"]
    },
    {
      "title": "consequence_pending",
      "properties": {
        "pred": { "const": "consequence_pending" },
        "consequence": { "type": "string", "pattern": "^CNSQ-[0-9]+$" }
      },
      "required": ["pred", "consequence"]
    }
    // ... one entry per PRED_TYPE
  ]
}
```

The schema captures the required-args table from `PREDICATE_ARG_SCHEMAS` AND adds id-pattern constraints derived from the rule logic (e.g., `obligation` is OBL-shaped, `consequence` is CNSQ-shaped) so the discoverability surface matches the runtime validation surface.

### 2. Add a parity test keeping TS and JSON in lockstep

Added `tools/validators/tests/predicate-dsl-grammar-parity.test.ts`. It asserts the on-disk JSON schema's predicate names, `pred` constants, and required-argument lists match the TS table; failure means the JSON is stale. It also compiles the schema with Ajv2020 and checks representative valid and invalid predicate samples.

This is the lower-overhead choice: no build-time generation; the JSON is hand-committed and the test catches predicate-name and required-argument drift.

### 3. Extend `describe-envelope-schema.ts` to inline the new schema for SLT-touching ops

In `tools/world-mcp/src/tools/describe-envelope-schema.ts`, when the requested `op_kind` is one whose record schema references `predicateObject` (currently `create_slt_record`; future-extensible to any op whose schema references the predicate DSL by `$ref`), the handler includes the predicate-DSL grammar JSON schema in the `referenced_schemas` map under URI `https://worldloom.local/schemas/predicate-dsl-grammar.schema.json`.

For non-SLT-touching ops, the predicate-DSL schema is not included, preserving response brevity for ops that don't need it.

### 4. Update `docs/MACHINE-FACING-LAYER.md`

Added `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md` prose naming the predicate-DSL grammar's inclusion in `referenced_schemas` for `create_slt_record`, with a one-line operator lookup example.

## Files to Touch

- `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` (new)
- `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (new — parity test option (b))
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify — include the new schema in `referenced_schemas` for SLT-touching ops)
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (modify — add test asserting predicate-DSL schema is returned for `create_slt_record` and is absent for ops that don't reference predicateObject)
- `tools/world-mcp/README.md` (modify — package-local public-surface note for the new referenced schema)
- `docs/MACHINE-FACING-LAYER.md` (modify — add the documentation paragraph)

## Out of Scope

- Extending the predicate-DSL beyond its current 24 closed `pred` names. This ticket exposes the existing grammar; grammar additions go through their own ticket.
- Replacing `additionalProperties: true` in `predicateObject` at `tools/validators/src/schemas/story-storylet.schema.json` with a discriminated union that enforces per-pred arg shapes at JSON-schema level. Tempting because it would push enforcement from the TS rule into the schema, but the TS rule already covers it; the additionalProperties relaxation is the deliberate boundary between schema-shape validation and rule-logic validation, and changing it is a larger refactor.
- Building a separate authoring CLI / helper for SLT block construction. The discoverability gap this ticket addresses is the underlying enabler; downstream authoring helpers can build on the exposed grammar.
- Extending the new `referenced_schemas` inlining pattern to other closed-vocabulary surfaces (BEL access_route, STENT roles, SREL axes, action_family). Those are already discoverable via existing enum-in-schema patterns per Assumption Reassessment item 5; no parallel work needed.

## Acceptance Criteria

### Tests That Must Pass

1. Package-local `npm test` for `tools/validators/` — the new `predicate-dsl-grammar-parity.test.ts` asserts the on-disk JSON schema mirrors `PRED_TYPES` and `PREDICATE_ARG_SCHEMAS` for predicate names and required arguments, and Ajv2020 accepts/rejects representative samples.
2. Package-local `npm test` for `tools/world-mcp/` — the modified `describe-envelope-schema.test.ts` asserts the predicate-DSL schema is returned for `create_slt_record` and absent for ops that do not reference `predicateObject` (e.g., `create_cf_record`).
3. Package-local MCP substitute: build `tools/world-mcp`, run the focused compiled `dist/tests/tools/describe-envelope-schema.test.js` handler test, and run/extend MCP dispatch coverage if needed; direct `mcp__worldloom__describe_envelope_schema` smoke remains a post-restart operational check outside this run.

### Invariants

1. `PREDICATE_ARG_SCHEMAS` in `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` and the per-pred subschemas in `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` enumerate the same 24 `pred` names with matching required-argument lists; drift is caught by the parity test before commit.
2. `describe_envelope_schema(op_kind='create_slt_record')` returns the predicate-DSL grammar under `referenced_schemas['https://worldloom.local/schemas/predicate-dsl-grammar.schema.json']`; operators discovering SLT schema through MCP also discover predicate grammar in the same response.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (new) — compare the committed schema's predicate names, `pred` constants, and required argument lists to `PREDICATE_ARG_SCHEMAS`, then compile the schema and validate representative valid/invalid predicate samples.
2. `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (modify) — extend with two assertions: (a) `create_slt_record` response includes the predicate-DSL schema under its canonical URI; (b) `create_cf_record` (a non-predicate op) response does NOT include the predicate-DSL schema.

### Commands

1. Targeted validators: from `tools/validators`, run `npm run build` and `node --test dist/tests/predicate-dsl-grammar-parity.test.js` — validates the parity and schema sample tests pass against compiled output.
2. Targeted MCP: from `tools/world-mcp`, run `npm run build` and `node --test dist/tests/tools/describe-envelope-schema.test.js` — confirms `create_slt_record` includes the predicate schema and `create_cf_record` excludes it.
3. Broad package gates: from `tools/validators` and `tools/world-mcp`, run package-local `npm test` as the broad regression surface. Direct `mcp__worldloom__describe_envelope_schema(op_kind='create_slt_record')` remains a post-restart operational smoke, not an in-session proof claim.

## Outcome

Completion date: 2026-05-17.

Implemented. `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` now exposes the closed 24-predicate DSL as a discriminated JSON Schema with required arguments and representative runtime-derived ID/enum constraints. `tools/world-mcp/src/tools/describe-envelope-schema.ts` now inlines that schema in `referenced_schemas` when the requested operation's record schema contains `predicateObject`, which covers `create_slt_record` and leaves non-storylet ops such as `create_cf_record` unchanged.

The package-local and repo-level user-facing docs now tell operators to inspect `referenced_schemas['https://worldloom.local/schemas/predicate-dsl-grammar.schema.json']` when authoring storylet preconditions through `describe_envelope_schema(op_kind='create_slt_record')`.

## Verification Result

Passed:

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/predicate-dsl-grammar-parity.test.js` — 3 tests passed.
3. `cd tools/world-mcp && npm run build`
4. `cd tools/world-mcp && node --test dist/tests/tools/describe-envelope-schema.test.js` — 7 tests passed.
5. `cd tools/validators && npm test` — 342 tests passed.
6. `cd tools/world-mcp && npm test` — 390 tests passed.

## Deviations

- Direct `mcp__worldloom__describe_envelope_schema(op_kind='create_slt_record')` smoke was not run because this Codex session does not expose a restarted post-build MCP server call. The acceptance proof is the package-local compiled handler test plus the full `tools/world-mcp` package suite.
- The selected parity implementation does not add a build-time generator and does not byte-compare a generated file. It asserts the committed schema's predicate names, `pred` constants, and required argument lists against the TS `PRED_TYPES` / `PREDICATE_ARG_SCHEMAS` table, then compiles and samples the schema through Ajv2020. This preserves the intended drift guard without introducing a generator surface.
