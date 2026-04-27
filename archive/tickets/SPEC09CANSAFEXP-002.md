# SPEC09CANSAFEXP-002: Validator structural-schema extension for epistemic_profile + exception_governance blocks

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/schemas/canon-fact-record.schema.json` extended with two new top-level optional properties; `tools/validators/src/structural/record-schema-compliance.ts` extended with current-write conditional-presence enforcement keyed off CF `type`; n_a rationale regex check requiring fact-type keyword from FOUNDATIONS §Ontology Categories.
**Deps**: `archive/tickets/SPEC09CANSAFEXP-001.md`

## Problem

At intake, the CF Record JSONSchema at `tools/validators/src/schemas/canon-fact-record.schema.json` declared `additionalProperties: false` without `epistemic_profile` or `exception_governance`. Without schema extension, any CF that included either block would be rejected by `record_schema_compliance` as an unknown-property failure. This blocked SPEC09CANSAFEXP-004 (canon-addition emits `create_cf_record` ops with the new blocks) and SPEC09CANSAFEXP-007 (create-base-world genesis CF-0001 with blocks). The structural-schema needed to enforce the conditional-mandate posture at the validator layer rather than only at skill prose, per /reassess-spec finding I6 + Q2=(a).

## Assumption Reassessment (2026-04-27)

1. `tools/validators/src/schemas/canon-fact-record.schema.json` exists, declares `additionalProperties: false` at the schema's top level (confirmed via spot-check (b)), and currently declares 11 required top-level properties (id, title, status, type, statement, scope, truth_scope, domains_affected, required_world_updates, source_basis, contradiction_risk).
2. `tools/validators/src/structural/record-schema-compliance.ts` exists and is registered in `tools/validators/src/public/registry.ts` as part of the structural-validators set. It uses `ajv` (8.17.1, per `tools/validators/package.json`) to validate CF/CH/INV/M/OQ/ENT/SEC records against their JSON schemas.
3. **Cross-skill / cross-artifact boundary under audit**: this ticket extends the canonical CF schema. Every consumer of `record_schema_compliance` — the patch engine's pre-apply gate (via `validatePatchPlan`), Hook 5 (post-patch), `world-validate --structural` CLI — picks up the conditional-mandate enforcement automatically. Schema extension propagates without consumer-side changes.
4. **FOUNDATIONS principle motivating this ticket**: FOUNDATIONS §Canon Fact Record Schema declares the schema as the canonical fact representation, and SPEC-09 (Move 2) specifies that `epistemic_profile` and `exception_governance` are conditionally-mandatory. Block presence is a Rule 1 concern (No Floating Facts: facts must declare their scope/limits/consequences); the conditional-mandate operationalizes Rule 1 for capability-type and exception-introducing CFs.
5. **No HARD-GATE / canon-write ordering surface touched.** The patch engine's pre-apply validator chain calls `record_schema_compliance` as one of several validators; no Mystery Reserve firewall or canon-write-order semantics change. Q3=(b) settled that Hook 5 invocation does not need modification (Hook 5 stays structural-only; rule validators 11/12 ship via SPEC09CANSAFEXP-003).
6. **Schema extension shape**: additive-only. Two new top-level optional properties; `epistemic_profile` and `exception_governance` are NOT added to the `required` array. Existing CFs (animalia's 48 historical CFs per spot-check, including capability/technology types) lack both blocks and remain valid under the Genesis-world historical clause. The live enforcement distinguishes current write paths (`pre-apply` and incremental touched CF records) from full-world historical validation; new/current CFs that match the conditional taxonomy must include the relevant block, and any CF that supplies either block must conform to its declared `oneOf [populated-shape, n_a-shape]`.
7. **Package command correction**: `tools/validators` is package-local and already had ignored `dist/` and `node_modules/` before this ticket's commands. The standalone AJV proof must register `_shared/extension-entry.schema.json` before compiling the CF schema because the live schema already references that shared extension-entry schema.
8. **Downstream helper boundary**: `requiresEpistemicProfile` / `requiresExceptionGovernance` are exported from `tools/validators/src/structural/record-schema-compliance.ts` for same-package validators and future skill prose reference. This ticket did not add a package `exports` subpath for `@worldloom/validators/structural/record-schema-compliance`; same-family tickets were truthed to cite the source module path instead of a non-existent package export.
9. **Post-ticket review blocker resolved (2026-04-27)**: the first implementation made `currentSchemaRequiredFor(record, ctx)` return true for every CF under `pre-apply`, while `buildPreApplyReadSurface()` returns both historical indexed rows and overlay rows. A direct `validatePatchPlan()` probe against animalia emitted missing-block failures for historical CF-0006, CF-0007, CF-0015, CF-0020, and CF-0025 even when the new CF in the patch contained both blocks. The final implementation narrows pre-apply conditional-presence enforcement to paths present in the changed pre-apply file inputs produced by `buildPreApplyFileInputs()`, preserving historical indexed CF compatibility while still enforcing current/touched CF records.

## Architecture Check

1. JSONSchema-driven structural validation is already the canonical mechanism for CF field enforcement. Extending the existing schema (rather than introducing a separate "extended-schema" file or runtime-augmented validator) preserves single-source-of-truth and means every consumer of the schema picks up the new fields without code changes. This avoids the fragmentation that would result from defining the new blocks in skill prose alone.
2. No backwards-compatibility shims introduced. The conditional-mandate is keyed off the CF's `type` field via JSON Schema's `if/then/else` or via additional validator-level logic in `record-schema-compliance.ts` — both routes preserve the schema as a single declarative document, not a code-only enforcement.
3. Conditional-presence enforcement (capability-type ⇒ exception_governance required; pure-geography-type ⇒ exception_governance n_a permitted) lives in `record-schema-compliance.ts` (procedural) rather than purely in JSONSchema's `if/then`, because the type-classification taxonomy is more legibly expressed as a switch over enumerated CF types than as nested JSONSchema conditions. The schema declares the *shape* of the blocks (populated or n_a); the validator enforces *when* presence is required.

## Verification Layers

1. New schema fields parse — schema validation (load `canon-fact-record.schema.json` via ajv; confirm `validate.compile()` succeeds with no errors).
2. CF with populated `epistemic_profile` validates — schema validation against fixture.
3. CF with `exception_governance: { n_a: "Pure geography fact; no exception axis." }` validates — schema validation + n_a regex check (rationale contains a fact-type keyword from §Ontology Categories enum: `geography` matches the FOUNDATIONS §Ontology Categories list).
4. CF with bare `exception_governance: { n_a: "not applicable" }` FAILS — n_a regex check (rationale lacks any keyword from §Ontology Categories).
5. Current CF of `type: capability` lacking `exception_governance` FAILS — conditional-presence enforcement in record-schema-compliance.ts under `pre-apply` / incremental touched-record validation.
6. Animalia regression — codebase grep-proof + schema validation: all 48 existing CFs (CF-0001..CF-0048) still pass `world-validate animalia --structural` because full-world historical validation permits absence of the new blocks for historical CFs.
7. FOUNDATIONS alignment — manual review: schema declarations match FOUNDATIONS §Canon Fact Record Schema YAML example shape (post-SPEC09CANSAFEXP-001 landing).

## What to Change

### 1. `tools/validators/src/schemas/canon-fact-record.schema.json`

Add two new top-level optional properties under `properties`, between `notes` and any closing bracket:

```jsonschema
"epistemic_profile": {
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "directly_observable_by": { "type": "array", "items": { "type": "string" } },
        "inferable_by": { "type": "array", "items": { "type": "string" } },
        "recorded_by": { "type": "array", "items": { "type": "string" } },
        "suppressed_by": { "type": "array", "items": { "type": "string" } },
        "distortion_vectors": { "type": "array", "items": { "type": "string" } },
        "propagation_channels": { "type": "array", "items": { "type": "string" } },
        "evidence_left": { "type": "array", "items": { "type": "string" } },
        "knowledge_exclusions": { "type": "array", "items": { "type": "string" } }
      }
    },
    {
      "type": "object",
      "additionalProperties": false,
      "required": ["n_a"],
      "properties": { "n_a": { "type": "string", "minLength": 1 } }
    }
  ]
},
"exception_governance": {
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "activation_conditions": { "type": "array", "items": { "type": "string" } },
        "rate_limits": { "type": "array", "items": { "type": "string" } },
        "mobility_limits": { "type": "array", "items": { "type": "string" } },
        "diffusion_barriers": { "type": "array", "items": { "type": "string" } },
        "countermeasures": { "type": "array", "items": { "type": "string" } },
        "nondeployment_reasons": { "type": "array", "items": { "type": "string" } }
      }
    },
    {
      "type": "object",
      "additionalProperties": false,
      "required": ["n_a"],
      "properties": { "n_a": { "type": "string", "minLength": 1 } }
    }
  ]
}
```

Both properties are optional at the schema level (NOT in the top-level `required` array) — conditional-presence enforcement happens in `record-schema-compliance.ts`.

### 2. `tools/validators/src/structural/record-schema-compliance.ts` — conditional-presence enforcement

Extend the validator to perform a post-ajv check on every CF record:

- If `cf.type` matches `capability`, `bloodline`, `magic_practice`, `technology`, `divine_action`, OR if `cf.type` indicates an exception-introducing fact (use a small enum-driven helper `requiresExceptionGovernance(type: string): boolean`), then `cf.exception_governance` MUST be present (either populated or n_a-form). Absence ⇒ FAIL with a clear message naming the type.
- If `cf.type` matches the same capability/exception-introducing taxonomy OR matches `institution-with-secrecy` / `artifact_dependent_truth` / `knowledge_asymmetric_fact`, then `cf.epistemic_profile` MUST be present. Use a similar helper `requiresEpistemicProfile(type: string): boolean`.
- Pure-ontology / geography / physics types (configurable enum) permit `n_a`-form for both blocks.

The taxonomy helpers (`requiresExceptionGovernance`, `requiresEpistemicProfile`) live as exported functions in the validator module so SPEC09CANSAFEXP-004 (canon-addition Phase 13a block authoring) can reference the same conditional-mandate logic at skill-side.

### 3. n_a rationale regex check in `record-schema-compliance.ts`

When a block uses the n_a-form, additionally enforce that the `n_a` rationale string contains at least one keyword from the FOUNDATIONS §Ontology Categories list. Encode the categories as a constant:

```ts
const ONTOLOGY_CATEGORY_KEYWORDS = [
  "entity", "species", "person", "faction", "institution", "polity",
  "place", "region", "route", "resource", "craft", "technology",
  "magic practice", "magic", "belief", "ritual", "law", "taboo",
  "artifact", "hazard", "event", "historical process", "historical",
  "social role", "text", "tradition", "ecological system", "ecological",
  "bodily condition", "metaphysical rule", "metaphysical",
  "geography", "physics", "structural", "institutional"
];
```

The check is case-insensitive substring match. Bare `n_a: "not applicable"` FAILS because no keyword matches; `n_a: "Pure geography fact; no knowability axis."` PASSES because "geography" matches.

### 4. Test fixtures

Add fixtures under `tools/validators/tests/fixtures/`:
- `cf-with-populated-epistemic-profile.yaml` — capability-type CF with full `epistemic_profile` block.
- `cf-with-populated-exception-governance.yaml` — capability-type CF with full `exception_governance` block.
- `cf-with-na-blocks.yaml` — geography-type CF with both blocks set to n_a-form with valid fact-type rationales.
- `cf-missing-required-block.yaml` — capability-type CF lacking `exception_governance` (must FAIL).
- `cf-with-bare-na.yaml` — CF with `n_a: "not applicable"` (must FAIL the regex check).

Add test cases under `tools/validators/tests/structural/record-schema-compliance.test.ts` that exercise each fixture and assert the expected verdict.

## Files to Touch

- `tools/validators/src/schemas/canon-fact-record.schema.json` (modify) — add two new optional top-level properties
- `tools/validators/src/structural/record-schema-compliance.ts` (modify) — add `requiresEpistemicProfile`, `requiresExceptionGovernance`, n_a regex check, and conditional-presence enforcement
- `tools/validators/tests/fixtures/cf-with-populated-epistemic-profile.yaml` (new)
- `tools/validators/tests/fixtures/cf-with-populated-exception-governance.yaml` (new)
- `tools/validators/tests/fixtures/cf-with-na-blocks.yaml` (new)
- `tools/validators/tests/fixtures/cf-missing-required-block.yaml` (new)
- `tools/validators/tests/fixtures/cf-with-bare-na.yaml` (new)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify) — add test cases for the new fixtures
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify) — add regression that historical indexed CFs without blocks do not fail a valid current pre-apply CF
- `tickets/SPEC09CANSAFEXP-003.md` (modify) — truth downstream helper import wording
- `tickets/SPEC09CANSAFEXP-004.md` (modify) — truth downstream helper source-module wording
- `tickets/SPEC09CANSAFEXP-007.md` (modify) — truth downstream helper source-module wording
- `specs/IMPLEMENTATION-ORDER.md` (modify) — truth SPEC-09 Phase 2.5 order and structural proof wording

## Out of Scope

- Rule 11 (action-space) and Rule 12 (redundancy) validator implementation (delivered by SPEC09CANSAFEXP-003)
- canon-addition Phase 13a population of the new blocks (delivered by SPEC09CANSAFEXP-004; consumes the `requiresEpistemicProfile` / `requiresExceptionGovernance` helpers exported here)
- create-base-world genesis enforcement (delivered by SPEC09CANSAFEXP-007)
- Hook 5 invocation changes (per Q3=(b), Hook 5 stays structural-only; this ticket's structural extension flows through Hook 5 without code change)
- Token-budget regression measurement (spec §Verification 12 — no measurable target)
- World-index parser changes (parser is already permissive on YAML field names per `tools/world-index/tests/yaml.test.ts:193`; new blocks ingest as unknown YAML fields without error)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — full validator test suite passes including new fixture-driven test cases for both blocks (populated-form, n_a-form, missing-required, bare-na-fails-regex).
2. `node tools/validators/dist/src/cli/world-validate.js animalia --structural --json` from repo root — animalia's 48 existing CFs all pass `record_schema_compliance` (Genesis-world historical clause holds: full-world historical validation permits existing CFs to lack the new blocks, including capability/technology historical CFs).
3. ajv compile succeeds from repo root when using the package-local Ajv 2020 build and registering the shared extension-entry schema: `node -e "const Ajv = require('./tools/validators/node_modules/ajv/dist/2020'); const ajv = new Ajv({allErrors:true, strict:true, formats:{date:true}}); ajv.addSchema(require('./tools/validators/src/schemas/_shared/extension-entry.schema.json')); ajv.compile(require('./tools/validators/src/schemas/canon-fact-record.schema.json')); console.log('OK');"`.
4. Fixture `cf-missing-required-block.yaml` (capability-type, no `exception_governance`) FAILS validation with a message naming the missing block.
5. Fixture `cf-with-bare-na.yaml` (n_a rationale lacking fact-type keyword) FAILS the regex check with a message naming the n_a-rationale-quality rule.

### Invariants

1. `canon-fact-record.schema.json` remains a valid JSON Schema (Draft 2020-12). `additionalProperties: false` at the top level is preserved.
2. The 11 currently-required top-level properties are unchanged in the `required` array. The two new properties are optional at the schema level; conditional-presence is a procedural check, not a `required` declaration.
3. Schema extension is additive-only. Existing animalia CFs (which lack both new blocks) still pass `record_schema_compliance` post-extension under the grandfather clause.
4. The n_a regex keyword list mirrors FOUNDATIONS §Ontology Categories. New categories added to FOUNDATIONS in the future require an update to `ONTOLOGY_CATEGORY_KEYWORDS` (this is a known coupling; not a Rule 6 retcon, but worth noting in skill docs that change FOUNDATIONS §Ontology Categories).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify) — add 5 new test cases (one per fixture) plus a `requiresEpistemicProfile` / `requiresExceptionGovernance` unit-test block enumerating the type taxonomy.
2. `tools/validators/tests/fixtures/cf-with-populated-epistemic-profile.yaml` (new) — happy-path populated form.
3. `tools/validators/tests/fixtures/cf-with-populated-exception-governance.yaml` (new) — happy-path populated form.
4. `tools/validators/tests/fixtures/cf-with-na-blocks.yaml` (new) — n_a-form with valid rationale.
5. `tools/validators/tests/fixtures/cf-missing-required-block.yaml` (new) — capability-type CF lacking exception_governance.
6. `tools/validators/tests/fixtures/cf-with-bare-na.yaml` (new) — n_a rationale failing the keyword regex.
7. `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify) — regression for pre-apply overlay-only enforcement in the presence of historical indexed capability CFs.

### Commands

1. `cd tools/validators && npm test` — package-local test suite.
2. `cd tools/validators && npm run build` — TypeScript compilation succeeds (covers typecheck since `npm run build` runs `tsc -p tsconfig.json`; the package has no separate `typecheck` script).
3. `node tools/validators/dist/src/cli/world-validate.js animalia --structural --json` from repo root — animalia regression smoke test.
4. `node -e "const Ajv = require('./tools/validators/node_modules/ajv/dist/2020'); const ajv = new Ajv({allErrors:true, strict:true, formats:{date:true}}); ajv.addSchema(require('./tools/validators/src/schemas/_shared/extension-entry.schema.json')); ajv.compile(require('./tools/validators/src/schemas/canon-fact-record.schema.json')); console.log('OK');"` from repo root — standalone schema compile proof with the live shared `$ref` registered.

## Outcome

Completion date: 2026-04-27.

Implemented the validator-side canon-safety schema extension:

- Added optional `epistemic_profile` and `exception_governance` top-level CF schema properties with populated and `n_a` shapes.
- Added exported conditional-taxonomy helpers and structural-validator post-AJV checks for current `pre-apply` / incremental touched CF records.
- Added `n_a` rationale-quality checks keyed to FOUNDATIONS ontology-category keywords.
- Added fixture-driven structural tests for populated blocks, valid `n_a`, missing required block rejection, bare `n_a` rejection, helper taxonomy, and historical full-world compatibility.
- Fixed the post-review pre-apply blocker by enforcing missing-block requirements only for changed pre-apply file inputs rather than every historical indexed CF returned by the pre-apply read surface.
- Truthed same-family downstream tickets and `specs/IMPLEMENTATION-ORDER.md` where they still referenced a non-existent package helper subpath or stale SPEC-09 order/proof wording.

## Verification Result

- `cd tools/validators && npm test` — passed; 60 tests passed, including new record_schema_compliance canon-safety cases and the pre-apply historical-compatibility regression.
- `cd tools/validators && npm run build` — passed both as part of `npm test` and as an explicit final build rerun.
- `node tools/validators/dist/src/cli/world-validate.js animalia --structural --json` — passed from repo root with `fail_count: 0`, `warn_count: 0`, `info_count: 0`.
- `node -e "const Ajv = require('./tools/validators/node_modules/ajv/dist/2020'); const ajv = new Ajv({allErrors:true, strict:true, formats:{date:true}}); ajv.addSchema(require('./tools/validators/src/schemas/_shared/extension-entry.schema.json')); ajv.compile(require('./tools/validators/src/schemas/canon-fact-record.schema.json')); console.log('OK');"` — passed from repo root.
- Post-ticket review probe before the final fix: direct `validatePatchPlan()` against animalia with a new CF-9999 that included both canon-safety blocks failed with historical missing-block verdicts on CF-0006, CF-0007, CF-0015, CF-0020, and CF-0025.
- Final direct `validatePatchPlan()` probe against animalia with a new CF-9999 that included both canon-safety blocks — passed; no `record_schema_compliance.missing_*` verdicts emitted.

## Deviations

- Conditional-presence enforcement is limited to current write surfaces (`pre-apply` changed file inputs and incremental touched CF records). Full-world historical validation still permits missing blocks so animalia's 48 existing CFs remain valid under the Genesis-world historical clause.
- The drafted root-level AJV command did not register the already-existing shared extension-entry schema and failed on that unresolved `$ref`; the accepted compile proof registers the shared schema explicitly.
- `tools/validators/dist/` and `tools/validators/node_modules/` were pre-existing ignored package artifacts before this ticket's commands and remain ignored generated/package-install state after verification.
- Post-ticket review found and fixed one owned pre-apply compatibility blocker before archival.
