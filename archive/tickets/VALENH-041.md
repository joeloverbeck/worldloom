# VALENH-041: predicate-DSL schema-discovery accepts a bare-alias form for `record_age.record` that the runtime rejects without the `bound:` prefix

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/predicate-dsl-grammar.schema.json`, `tools/validators/tests/predicate-dsl-grammar-parity.test.ts`.
**Deps**: `archive/tickets/VALENH-024.md` (worked precedent — same schema-vs-runtime parity pattern at role-filter fields), `archive/tickets/VALENH-034.md` (worked precedent — same schema-vs-runtime parity pattern at scope-restricted existentials).

## Problem

At intake, the discoverable JSON schema `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` (surfaced verbatim to authors via `mcp__worldloom__describe_envelope_schema`) typed `record_age.record` with the pattern `^(?:(?:STENT|STCHAR|STINT|SF|BEL|OBL|CNSQ|THR|SREL|STLOC|STOBJ|DA|STSTAT|CLK|STSEC|STQ|STPLAN|STEMO)-[0-9]+|[a-z][a-z0-9_-]*)$` — the second alternative `[a-z][a-z0-9_-]*` admitted a bare lower-case alias (e.g., `matured_clock`). The enforced runtime grammar — `requireActiveRecordOrBoundAlias` in `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`, consuming `BOUND_EFFECT_PATTERN = /^bound:([a-z][a-z0-9_-]*)$/` — required alias references to carry the `bound:` prefix; a bare alias fell through to `requireActiveRecordRef` which rejected with `predicate.invalid_reference: <path> must be an active story record id`. So the pre-ticket schema-conformant emission `{pred:"record_age", record:"matured_clock", comparator:">=", pages:2}` was runtime-rejected.

Session evidence (`commitment-block-authoring direct_batch` on red-bunny, this Claude session, SLB-3 batch): `tools/world-mcp/dist/src/cli/validate-patch-plan.js` against the SLT-25 patch (which carried `record:"matured_clock"`) failed with the verdict `storylet_predicate_dsl_parsability` / `predicate.invalid_reference` / `SLT-25: preconditions.hard[2].record must be an active story record id`. The fix was to change `record:"matured_clock"` to `record:"bound:matured_clock"`, after which validation passed and the patch submitted clean. The shared contract `_shared-templates/story-state-contract.md` §5 already documents the canonical form as `record_age(<record_id | bound:<alias>>, …)` (with the `bound:` prefix); only the JSON schema regex drifted to admit the bare-alias form.

This was the direct analogue of VALENH-024 (role-filter `^role:`-prefixed pattern that runtime rejected without the prefix) and VALENH-034 (existential scope-restriction that schema admitted but runtime rejected) — the schema-discovery artifact misrepresented the enforced runtime, an author following the discoverable contract could emit input the runtime rejected, and the fix aligned the schema to the authoritative runtime.

## Assumption Reassessment (2026-05-23)

1. At intake, grep confirmed that `predicate-dsl-grammar.schema.json:400` carries `pattern: "^(?:(?:STENT|STCHAR|STINT|SF|BEL|OBL|CNSQ|THR|SREL|STLOC|STOBJ|DA|STSTAT|CLK|STSEC|STQ|STPLAN|STEMO)-[0-9]+|[a-z][a-z0-9_-]*)$"` on `record_age.record`, while `rule_storylet_predicate_dsl_parsability.ts:77`'s `BOUND_EFFECT_PATTERN = /^bound:([a-z][a-z0-9_-]*)$/` requires the `bound:` prefix when the value is an alias (the alternative path through `requireActiveRecordRef` only accepts story-record IDs). The bare-alias branch in the schema regex is unreachable by any runtime-acceptable input. **Rule 6 retcon attribution**: existing behavior — the schema-discovery artifact advertised the bare-alias branch `[a-z][a-z0-9_-]*` for `record_age.record`; new behavior — the alias branch is narrowed to `bound:[a-z][a-z0-9_-]*` to match the runtime `BOUND_EFFECT_PATTERN`; the warrant is the runtime rejection of the schema-conformant value `record:"matured_clock"` observed in this session's SLB-3 dry-run.
2. Confirmed at HEAD: the schema IS the discoverable contract (`mcp__worldloom__describe_envelope_schema` returns it verbatim — verified in this session's `describe_envelope_schema(op_kind='create_slt_record')` response which embedded `predicate-dsl-grammar.schema.json` inline); correcting the schema corrects what authors read. The shared contract prose at `_shared-templates/story-state-contract.md` §5 already documents the canonical `record_age(<record_id | bound:<alias>>, …)` form, so no prose documentation file needs editing.
3. Shared boundary under audit: the contract between (a) `predicate-dsl-grammar.schema.json` (schema-discovery artifact), (b) the runtime `requireActiveRecordOrBoundAlias` in `rule_storylet_predicate_dsl_parsability.ts` (enforcement authority), and (c) `describe_envelope_schema` (the MCP surface delivering (a) to authors). The runtime (b) is authoritative; this ticket aligns (a) to it; (c) is a faithful messenger needing no change. Identical shared-boundary shape to VALENH-024 and VALENH-034.
4. **Parity-test scope adjustment**: the existing parity test at `tools/validators/tests/predicate-dsl-grammar-parity.test.ts:137` exercised `record_age` only through the record-id branch (`{pred:"record_age", record:"SF-1", comparator:">=", pages:1}`); the bare-alias branch was not tested, which is why the divergence stayed hidden. The landed parity assertion now (a) accepts `record:"bound:matured_clock"`, (b) rejects `record:"matured_clock"`, and (c) accepts `record:"SF-1"` through both Ajv schema validation and the runtime `storyletPredicateDslParsability` validator. This is the same parity-extension shape VALENH-024 added for role-filter fields and VALENH-034 added for scope-restricted existentials; the existing test file was the right home, no new test file was needed.
5. Baseline proof correction before source edits: `cd tools/validators && npm test` is red before this ticket's source edits, after a successful build, with failures in the compiled CLI/integration files `dist/tests/cli/world-validate.story-bundle.test.js`, `dist/tests/cli/world-validate.test.js`, `dist/tests/integration/spec09-verification.test.js`, `dist/tests/integration/spec34-integration.test.js`, `dist/tests/integration/spec43-midstory-introduction.test.js`, `dist/tests/integration/spec44-append-only-supersession.test.js`, `dist/tests/integration/spec64-world-compatibility-coverage.test.js`, and `dist/tests/integration/world-compatibility-cli.test.js`. The acceptance surface is narrowed to the package build, the focused compiled parity test, and a post-change broad-suite rerun recorded as baseline-red unless the failure set changes to implicate this ticket.

## Architecture Check

1. **Schema-side fix, not runtime-side fix.** The runtime is correct and already enforces a coherent invariant — `bound:<alias>` distinguishes effect-side bound alias references from raw record-id references AND the same `BOUND_EFFECT_PATTERN` is consumed by `validateBoundEffectReferences` and the canonical effect-reference regex at the storylet-schema `effectReference` definition, which already correctly requires `bound:`. The discoverable schema was the divergent artifact. Fixing the schema was one-line additive precision (replace `[a-z][a-z0-9_-]*` with `bound:[a-z][a-z0-9_-]*` in the `record_age.record` regex's alias branch), more discoverable (authors see the constraint at envelope-construction time via `describe_envelope_schema`, not at `validate_patch_plan` time), and architecturally cleaner (the schema-discovery surface is now a faithful contract). Widening the runtime to admit bare-alias values would have been the wrong direction — it would collide with the load-bearing `bound:` semantics used by effects.
2. **No backwards-compatibility aliasing/shims introduced.** The schema narrowing is subtractive precision on an input pattern; no schema export is renamed, no runtime helper is wrapped, no two-form acceptance shim is added. The existing parity-test assertions for the record-id branch of `record_age` are preserved unchanged; the new assertions add the `bound:`-form branch coverage.

## Verification Layers

1. Schema↔runtime parity for `record_age.record` → schema validation / unit test (`tools/validators/tests/predicate-dsl-grammar-parity.test.ts`): assert the narrowed schema rejects `record:"matured_clock"` under Ajv2020 AND accepts both `record:"bound:matured_clock"` and `record:"SF-1"`; pair each with the runtime `requireActiveRecordOrBoundAlias` verdict to confirm schema-runtime parity.
2. Existing runtime behavior unchanged → schema validation / focused unit test plus broad-suite comparison: the compiled parity test continues to pass and the full `validators` suite remains no worse than the pre-edit red baseline; no `requireActiveRecordOrBoundAlias` change is in scope.
3. Discoverable schema correctness → codebase grep-proof: grep `predicate-dsl-grammar.schema.json` for `record_age` and confirm the alias branch now reads `bound:[a-z][a-z0-9_-]*` (with the `bound:` prefix); confirm no other predicate's `.record` field carries an unprefixed bare-alias branch (preserve parity across the entire schema file).

## Landed Changes

### 1. Schema narrowing — `tools/validators/src/schemas/predicate-dsl-grammar.schema.json`

In the `record_age` oneOf branch, the `record` field's `pattern` now requires the `bound:` prefix for alias references:

- **Before**: `"^(?:(?:STENT|STCHAR|STINT|SF|BEL|OBL|CNSQ|THR|SREL|STLOC|STOBJ|DA|STSTAT|CLK|STSEC|STQ|STPLAN|STEMO)-[0-9]+|[a-z][a-z0-9_-]*)$"`
- **After**: `"^(?:(?:STENT|STCHAR|STINT|SF|BEL|OBL|CNSQ|THR|SREL|STLOC|STOBJ|DA|STSTAT|CLK|STSEC|STQ|STPLAN|STEMO)-[0-9]+|bound:[a-z][a-z0-9_-]*)$"`

The runtime `requireActiveRecordOrBoundAlias` implementation was not changed.

### 2. Parity test extension — `tools/validators/tests/predicate-dsl-grammar-parity.test.ts`

The existing `record_active` / `record_age` record-id vocabulary test remains unchanged. A new focused test now asserts:

1. `{pred:"record_age", record:"matured_clock", comparator:">=", pages:2}` — schema REJECTS (Ajv2020 verdict false).
2. `{pred:"record_age", record:"bound:matured_clock", comparator:">=", pages:2}` — schema ACCEPTS (Ajv2020 verdict true).
3. `{pred:"record_age", record:"SF-1", comparator:">=", pages:2}` — schema ACCEPTS (preserve record-id-branch acceptance).

Each schema verdict is paired with the runtime verdict from `storyletPredicateDslParsability`, using a synthetic storylet fixture that binds `matured_clock` through `any_clock_active`.

## Files to Touch

- `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` (modify)
- `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (modify)

## Out of Scope

- Any change to `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` — the runtime is authoritative and correct.
- Any change to the shared contract `_shared-templates/story-state-contract.md` §5 prose — it already documents the canonical `record_age(<record_id | bound:<alias>>, …)` form.
- Any retroactive correction of in-repo SLT records — none currently emit the bare-alias form for `record_age.record` (the only `record_age` consumer landed this session, SLT-25, was corrected at authoring time and is on disk as `record:"bound:matured_clock"`).
- Parity audit of other predicate `.record` fields — `record_active.record` does NOT admit a bare-alias branch (its schema regex at the same file accepts only story-record IDs); only `record_age.record` has the alias-branch divergence. Confirmed via grep at intake.

## Acceptance Criteria

### Tests / Checks Exercised

1. `cd tools/validators && npm run build` — TypeScript compile clean.
2. `cd tools/validators && node --test dist/tests/predicate-dsl-grammar-parity.test.js` — parity test PASSES with the new `record_age.record` bound-alias assertions covering schema-rejects-bare, schema-accepts-bound, schema-accepts-record-id, and the matching runtime verdicts.
3. `cd tools/validators && npm test` — rerun the full validators suite and record the result against the pre-edit red baseline; this ticket does not require unrelated baseline-red CLI/integration files to become green.
4. `cd tools/world-mcp && node --test dist/tests/tools/describe-envelope-schema.test.js` — consumer schema-discovery test passes after rebuilding `tools/world-mcp`.

### Invariants

1. Schema-conformant `record_age.record` values are exactly the values runtime `requireActiveRecordOrBoundAlias` accepts; no value is accepted by one and rejected by the other.
2. The `bound:` prefix remains the unique alias-binding form across the predicate DSL (`effectReference` regex, `BOUND_EFFECT_PATTERN`, and `record_age.record` alias branch all require it).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (modify) — extended with a focused `record_age.record` parity test covering bare-alias rejection, `bound:`-form acceptance, and record-id acceptance, each paired with the runtime verdict via `storyletPredicateDslParsability`.

### Commands

1. `cd tools/validators && npm run build` — recompile schema and tests after the JSON change.
2. `cd tools/validators && node --test dist/tests/predicate-dsl-grammar-parity.test.js` — focused parity test.
3. `cd tools/validators && npm test` — broad suite comparison against the pre-edit red baseline; if it remains red in the same unrelated CLI/integration files, record the deviation rather than treating that as this ticket's acceptance gate.
4. `cd tools/world-mcp && npm run build` followed by `cd tools/world-mcp && node --test dist/tests/tools/describe-envelope-schema.test.js` — prove the schema-discovery consumer still builds and exposes the referenced schema surface.

## Outcome

Completed: 2026-05-23.

Completed. `record_age.record` in `predicate-dsl-grammar.schema.json` now admits only story active-record IDs or `bound:<alias>` references; the former bare alias branch was removed. The runtime validator was left unchanged. The parity test now exercises bare-alias rejection, `bound:`-alias acceptance, and record-id acceptance through both Ajv and `storyletPredicateDslParsability`.

## Verification Result

1. Pre-edit baseline: `cd tools/validators && npm test` rebuilt successfully, then failed 8 compiled CLI/integration test files with 147 pass / 8 fail. The failing files were `dist/tests/cli/world-validate.story-bundle.test.js`, `dist/tests/cli/world-validate.test.js`, `dist/tests/integration/spec09-verification.test.js`, `dist/tests/integration/spec34-integration.test.js`, `dist/tests/integration/spec43-midstory-introduction.test.js`, `dist/tests/integration/spec44-append-only-supersession.test.js`, `dist/tests/integration/spec64-world-compatibility-coverage.test.js`, and `dist/tests/integration/world-compatibility-cli.test.js`.
2. `cd tools/validators && npm run build` — PASS.
3. `cd tools/validators && node --test dist/tests/predicate-dsl-grammar-parity.test.js` — PASS, 1 compiled test file passed.
4. Post-change broad comparison: `cd tools/validators && npm test` rebuilt successfully, then failed the same 8 compiled CLI/integration test files with 147 pass / 8 fail; no new failure implicated the `record_age.record` schema/test change.
5. Schema inspection command over `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` confirmed the only `.record` fields are `record_active.record` with active-record IDs only and `record_age.record` with active-record IDs or `bound:[a-z][a-z0-9_-]*`; no other `.record` field carries an unprefixed bare-alias branch.
6. `cd tools/world-mcp && npm run build` — PASS.
7. `cd tools/world-mcp && node --test dist/tests/tools/describe-envelope-schema.test.js` — PASS, 1 compiled test file passed.

## Deviations

- The broad `tools/validators` suite was already red before source edits and remained red afterward in the same 8 compiled CLI/integration files. The accepted proof is the successful validators build, focused compiled parity test, schema inspection, and `describe_envelope_schema` consumer test.
- The landed runtime pairing uses a direct `storyletPredicateDslParsability` synthetic fixture rather than a full `validate_patch_plan` envelope. This proves the same `requireActiveRecordOrBoundAlias` branch without depending on a live world or checkout-local patch-plan artifact.
