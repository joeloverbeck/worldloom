# SPEC101MANSTOMET-002: Schema validator for Manual Studio records

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium-Large
**Engine Changes**: Yes — introduces `tools/manual-story-studio/src/validate/` directory and `schema.ts` validator module.
**Deps**: SPEC101MANSTOMET-001

## Problem

Manual Studio's record CRUD save flow must reject records that violate the per-class field contract (missing required fields, invalid enum values, wrong types) BEFORE writing to disk. Without a declarative schema validator, every malformed record (a `mbel-*.yaml` missing `holder`, a `mrel-*.yaml` with an invalid `axes.trust` value) would land on disk and surface only when downstream consumers attempt to read it — at which point the author has already lost the recover-from-form-state window. The validator must produce structured, author-readable error messages so the CRUD UI can surface "missing required fields: holder, truth_relation" rather than a raw parse exception.

## Assumption Reassessment (2026-05-30)

1. `tools/manual-story-studio/src/validate/` does NOT yet exist (verified via `ls tools/manual-story-studio/src/`); this ticket creates the directory and the `schema.ts` module. The `yaml` package (v2.9.0) is already a dependency per `tools/manual-story-studio/package.json` and is used by SPEC-100's read layer for parsing.
2. SPEC-101 §4 Files to touch line 141 names this module: *"`tools/manual-story-studio/src/validate/schema.ts` — YAML parse + required-field check per class (declarative schema definitions for the 18 MVP record classes — beat-templates land in SPEC-104)."* The 18 MVP class set matches SPEC-101 §2.2's enumeration (verified during in-session reassess-spec count fix 17→18).
3. Cross-artifact boundary under audit: `schema.ts` consumes the type contract from `tools/manual-story-studio/src/schema/manual-story.ts` (SPEC101MANSTOMET-001) and produces structured validation errors consumed by the write layer (SPEC101MANSTOMET-006). Boundary discipline: validator depends ONLY on schema types + parsed YAML; it does NOT touch the filesystem or other validators.
4. FOUNDATIONS principle motivating this ticket: §Story Bundles §5b Schema-Minimalism — every required field declared by the validator must be load-bearing for SPEC-102 (prompt composer reads), SPEC-103 (segment paste references), or SPEC-104 (beat-template filtering). The validator is also the structural enforcement of SPEC-101 §7 AC #1 + #2 (enum validation, missing required fields rejected, per-class required fields enforced).

## Architecture Check

1. A declarative per-class schema definition (one object per class listing required/optional/enum-validated fields) is cleaner than 18 hand-written validator functions — adding a per-class field is a single-object edit, not a function edit; consumers (CRUD save, test fixtures, future class extensions) see the schema shape directly rather than reverse-engineering it from validator code.
2. No backwards-compatibility shims. SPEC-100 introduced no record-shape validators (its capstone tests covered scaffolded surfaces only); this ticket is the first record-shape validator in the package.

## Verification Layers

1. Validator rejects records missing required fields → schema validation (test asserts `validate()` returns `{ ok: false, errors: [...] }` with field name).
2. Validator rejects records with invalid enum values → schema validation (test asserts error references the enum value and the closed-set vocabulary).
3. Validator accepts valid records of every class → codebase grep-proof + per-class round-trip test.
4. Manual Story metadata validation accepts all enum vocabularies from SPEC-101 §2.1 → manual review (test fixture covers every closed enum).

## What to Change

### 1. Create `tools/manual-story-studio/src/validate/schema.ts`

Module exports:

- **`SchemaDef`** type — describes one class's schema:
  - `required: string[]` (field names that must be present)
  - `optional: string[]` (field names allowed but not required)
  - `enums: Record<string, readonly string[]>` (field-name → closed value set)
  - `arrays: string[]` (field names that must be arrays of strings)
  - `nested?: Record<string, SchemaDef>` (for nested objects like `manual-story.yaml`'s `story_contract`)
- **`MANUAL_RECORD_SCHEMAS`** const map — `Record<ManualRecordClass, SchemaDef>` covering all 18 classes; each entry encodes that class's common + per-class fields.
- **`MANUAL_STORY_METADATA_SCHEMA`** — `SchemaDef` for `manual-story.yaml`.
- **`MANUAL_CHARACTER_PROFILE_SCHEMA`** — `SchemaDef` for the Manual Character Profile body (extends the common `cast` schema with the §3 sections).
- **`validateRecord(className: ManualRecordClass, parsed: unknown): ValidationResult`** — entry point for per-class record validation.
- **`validateManualStoryMetadata(parsed: unknown): ValidationResult`** — entry point for `manual-story.yaml` validation.
- **`parseAndValidateYaml<T>(yamlText: string, schema: SchemaDef): ValidationResult & { parsed?: T }`** — combined parse + validate helper.

`ValidationResult` shape: `{ ok: true } | { ok: false, errors: Array<{ field: string; message: string }> }`.

### 2. Per-class required-field enforcement

Each class's `required` array enumerates the common-field minimum (`id`, `title`, `active`, `importance`, `tags`, `summary`, `details`, `refs`, `prompt_visibility`, `last_reviewed_after_segment`, `notes`) plus the per-class additions (e.g., `holder`, `truth_relation`, `confidence` for `mbel-*`). The enumeration matches SPEC-101 §2.2 verbatim.

`refs` field validates as a nested object: `{ characters: string[]; locations: string[]; related_records: string[] }`; each sub-field must be an array (may be empty).

### 3. Enum validation

For each field in `enums`, the parsed value must be a member of the listed value set. Mismatch produces `{ field: "<name>", message: "value '<x>' not in allowed set: <enum members joined>" }`.

### 4. Manual Character Profile validation

The Manual Character Profile schema extends the `cast` class's common schema with the §3 nested sections. The validator descends into `identity`, `world_pressure_core`, `body_and_presence`, `voice`, `pressure_behavior`, `perception_and_embodiment`, `agency_and_planning`, `relationship_behavior`, `prose_constraints` — each is its own `SchemaDef` with required string fields and string-array fields per SPEC-101 §3.

The `source_world_character: CHAR-*` field validates as an OPTIONAL string matching pattern `^CHAR-[0-9]+$`; presence is allowed, absence is allowed. The validator does NOT attempt to resolve the value against world canon (resolution is out of scope per SPEC-101 §2.4 and §8 Risks).

### 5. Tests

Create `tools/manual-story-studio/test/validate/schema.test.ts` covering:

- Per-class required-field tests: for each of 18 classes, fixture a record missing one required field; assert `validate()` returns `{ ok: false, errors: [{ field: "<name>", ... }] }`.
- Per-class enum tests: for each closed-enum field in each class, fixture a record with an invalid enum value; assert error message names the bad value and the allowed set.
- Per-class valid-record round-trip: for each class, fixture a fully-populated valid record; assert `validate()` returns `{ ok: true }`.
- Manual Story metadata: assert each enum (`pov`, `tense`, `content_intensity`, `language_register`, `prose_preferences.*`) rejects invalid values; assert valid metadata passes.
- Manual Character Profile: assert `source_world_character: CHAR-7` is accepted; assert `source_world_character: STCHAR-7` is rejected (wrong prefix); assert absence is accepted.

## Files to Touch

- `tools/manual-story-studio/src/validate/schema.ts` (new)
- `tools/manual-story-studio/test/validate/schema.test.ts` (new)

## Out of Scope

- Reference-integrity validation (refs.*, per-class typed pointers like `belief.holder`) — SPEC101MANSTOMET-003.
- Write-layer integration (validator invocation, error-flow into CRUD response) — SPEC101MANSTOMET-006.
- HTTP-route validation surface (error mapping to HTTP status codes) — SPEC101MANSTOMET-007.
- Beat-template schema (`mtemplate-*`) — SPEC-104.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` passes including the new `test/validate/schema.test.ts` (SPEC-101 AC #1 and AC #2 for validator side: missing required fields rejected, per-class required fields enforced, all enum vocabularies validated).
2. `cd tools/manual-story-studio && npm run build:backend` succeeds (no type errors against SPEC101MANSTOMET-001 type module).
3. `grep -cE "^export (const|function|type) " tools/manual-story-studio/src/validate/schema.ts` returns the expected count of public symbols (≥ 6: SchemaDef, MANUAL_RECORD_SCHEMAS, MANUAL_STORY_METADATA_SCHEMA, MANUAL_CHARACTER_PROFILE_SCHEMA, validateRecord, validateManualStoryMetadata, parseAndValidateYaml, ValidationResult).

### Invariants

1. Every class in `MANUAL_RECORD_SCHEMAS` corresponds to a class in `MANUAL_RECORD_CLASS_PREFIXES` (SPEC101MANSTOMET-001); the key sets are equal (18 entries each).
2. Every required-field name in every `SchemaDef.required` array corresponds to a field declared in the matching per-class type alias from SPEC101MANSTOMET-001.
3. No `SchemaDef.enums` value set is empty — empty enums would silently accept any value.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/validate/schema.test.ts` — per-class required-field + enum + valid-round-trip tests; Manual Story metadata enum tests; Manual Character Profile nested-section + `source_world_character` pattern tests.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio && node --test dist/test/validate/schema.test.js` (after `npm run build:backend`) — runs the validator test suite in isolation for faster dev-loop iteration.
