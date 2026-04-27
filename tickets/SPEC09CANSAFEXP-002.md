# SPEC09CANSAFEXP-002: Validator structural-schema extension for epistemic_profile + exception_governance blocks

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/schemas/canon-fact-record.schema.json` extended with two new top-level optional properties; `tools/validators/src/structural/record-schema-compliance.ts` extended with conditional-presence enforcement keyed off CF `type`; n_a rationale regex check requiring fact-type keyword from FOUNDATIONS §Ontology Categories.
**Deps**: `archive/tickets/SPEC09CANSAFEXP-001.md`

## Problem

The CF Record JSONSchema at `tools/validators/src/schemas/canon-fact-record.schema.json` declares `additionalProperties: false` (line 6). Without schema extension, any CF that includes the new `epistemic_profile` or `exception_governance` block will be REJECTED by `record_schema_compliance` validation — the structural validator will see the new fields as unknown properties and fail the CF outright. This blocks SPEC09CANSAFEXP-004 (canon-addition emits `create_cf_record` ops with the new blocks) and SPEC09CANSAFEXP-007 (create-base-world genesis CF-0001 with blocks). The structural-schema must enforce the conditional-mandate posture at the validator layer rather than only at skill prose, per /reassess-spec finding I6 + Q2=(a).

## Assumption Reassessment (2026-04-27)

1. `tools/validators/src/schemas/canon-fact-record.schema.json` exists, declares `additionalProperties: false` at the schema's top level (confirmed via spot-check (b)), and currently declares 11 required top-level properties (id, title, status, type, statement, scope, truth_scope, domains_affected, required_world_updates, source_basis, contradiction_risk).
2. `tools/validators/src/structural/record-schema-compliance.ts` exists and is registered in `tools/validators/src/public/registry.ts` as part of the structural-validators set. It uses `ajv` (8.17.1, per `tools/validators/package.json`) to validate CF/CH/INV/M/OQ/ENT/SEC records against their JSON schemas.
3. **Cross-skill / cross-artifact boundary under audit**: this ticket extends the canonical CF schema. Every consumer of `record_schema_compliance` — the patch engine's pre-apply gate (via `validatePatchPlan`), Hook 5 (post-patch), `world-validate --structural` CLI — picks up the conditional-mandate enforcement automatically. Schema extension propagates without consumer-side changes.
4. **FOUNDATIONS principle motivating this ticket**: FOUNDATIONS §Canon Fact Record Schema declares the schema as the canonical fact representation, and SPEC-09 (Move 2) specifies that `epistemic_profile` and `exception_governance` are conditionally-mandatory. Block presence is a Rule 1 concern (No Floating Facts: facts must declare their scope/limits/consequences); the conditional-mandate operationalizes Rule 1 for capability-type and exception-introducing CFs.
5. **No HARD-GATE / canon-write ordering surface touched.** The patch engine's pre-apply validator chain calls `record_schema_compliance` as one of several validators; no Mystery Reserve firewall or canon-write-order semantics change. Q3=(b) settled that Hook 5 invocation does not need modification (Hook 5 stays structural-only; rule validators 11/12 ship via SPEC09CANSAFEXP-003).
6. **Schema extension shape**: additive-only. Two new top-level optional properties; `epistemic_profile` and `exception_governance` are NOT added to the `required` array. Existing CFs (animalia's 48 historical CFs per spot-check) lack both blocks and remain valid under the grandfather clause. New CFs that supply either block must conform to its declared `oneOf [populated-shape, n_a-shape]`.

## Architecture Check

1. JSONSchema-driven structural validation is already the canonical mechanism for CF field enforcement. Extending the existing schema (rather than introducing a separate "extended-schema" file or runtime-augmented validator) preserves single-source-of-truth and means every consumer of the schema picks up the new fields without code changes. This avoids the fragmentation that would result from defining the new blocks in skill prose alone.
2. No backwards-compatibility shims introduced. The conditional-mandate is keyed off the CF's `type` field via JSON Schema's `if/then/else` or via additional validator-level logic in `record-schema-compliance.ts` — both routes preserve the schema as a single declarative document, not a code-only enforcement.
3. Conditional-presence enforcement (capability-type ⇒ exception_governance required; pure-geography-type ⇒ exception_governance n_a permitted) lives in `record-schema-compliance.ts` (procedural) rather than purely in JSONSchema's `if/then`, because the type-classification taxonomy is more legibly expressed as a switch over enumerated CF types than as nested JSONSchema conditions. The schema declares the *shape* of the blocks (populated or n_a); the validator enforces *when* presence is required.

## Verification Layers

1. New schema fields parse — schema validation (load `canon-fact-record.schema.json` via ajv; confirm `validate.compile()` succeeds with no errors).
2. CF with populated `epistemic_profile` validates — schema validation against fixture.
3. CF with `exception_governance: { n_a: "Pure geography fact; no exception axis." }` validates — schema validation + n_a regex check (rationale contains a fact-type keyword from §Ontology Categories enum: `geography` matches the FOUNDATIONS §Ontology Categories list).
4. CF with bare `exception_governance: { n_a: "not applicable" }` FAILS — n_a regex check (rationale lacks any keyword from §Ontology Categories).
5. CF of `type: capability` lacking `exception_governance` FAILS — conditional-presence enforcement in record-schema-compliance.ts.
6. Animalia regression — codebase grep-proof + schema validation: all 48 existing CFs (CF-0001..CF-0048) still pass `world-validate animalia --structural` because grandfather clause permits absence of the new blocks for historical CFs.
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

The taxonomy enums (`requiresExceptionGovernance`, `requiresEpistemicProfile`) live as exported constants in the validator module so SPEC09CANSAFEXP-004 (canon-addition Phase 13a block authoring) can import them and emit the same conditional-mandate logic at skill-side.

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
2. `node tools/validators/dist/src/cli/world-validate.js animalia --structural --json` from repo root — animalia's 48 existing CFs all pass `record_schema_compliance` (grandfather clause holds: existing CFs lack the new blocks and the conditional-presence check skips when blocks are absent for non-capability types; capability-type historical CFs are explicitly grandfathered via the existing `audits/validation-grandfathering.yaml` mechanism per archived SPEC-04).
3. ajv compile succeeds: `node -e "const Ajv = require('ajv'); const ajv = new Ajv(); const s = require('./tools/validators/src/schemas/canon-fact-record.schema.json'); ajv.compile(s); console.log('OK');"` from repo root.
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

### Commands

1. `cd tools/validators && npm test` — package-local test suite.
2. `cd tools/validators && npm run build` — TypeScript compilation succeeds (covers typecheck since `npm run build` runs `tsc -p tsconfig.json`; the package has no separate `typecheck` script).
3. `node tools/validators/dist/src/cli/world-validate.js animalia --structural --json` from repo root — animalia regression smoke test.
