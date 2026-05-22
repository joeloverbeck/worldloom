# SPEC70CHASTCHARSEM-001: STCHAR schema — `source_operational_fact_map` frontmatter field

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/story-character-authority.schema.json` (STCHAR frontmatter schema). No impact on existing STCHAR producers until the §2.4 coverage validator (SPEC70CHASTCHARSEM-003) consumes the field.
**Deps**: None

## Problem

The `CHAR → STCHAR` bridge records provenance (`source_char_id` / `source_char_hash` / `source_char_sections_used`) but has no field that proves *semantic coverage* — that each structured operational source fact from the world `CHAR` was carried into an operational STCHAR home rather than stranded in `## Source Distillation` commentary (SPEC-70 §1.2 triggering failure class). This ticket adds the frontmatter field that the §2.4 coverage validator (003) reads. Field-only change; the validator that enforces it lands in 003.

## Assumption Reassessment (2026-05-22)

1. `tools/validators/src/schemas/story-character-authority.schema.json` exists and currently requires `source_kind`, `source_char_id`, `source_char_hash`, `source_char_sections_used`, `profile_hash`, `voice_block_hash`, `page_packet_hash` with `source_char_id`/`source_char_hash` conditionally required for `source_kind: world_char` and null for `story_local` (verified at SPEC-70 reassessment). The field `source_operational_fact_map` does not exist anywhere in `tools/` or `.claude/` (grep returned zero hits in the live tree).
2. Spec source: SPEC-70 §2.3 (field shape + conditional requirements) and the §3 migration posture (warn-until-touched for the 3 existing `world_char` red-bunny STCHAR).
3. Cross-artifact boundary under audit: the STCHAR frontmatter schema is consumed at engine pre-apply by `record_schema_compliance` (frontmatter conformance) and will be consumed by the new `stchar_source_fact_coverage` validator (003). This ticket defines the field; 003 enforces its semantics. The schema must define the field as optional-at-the-JSON-Schema-level so legacy records do not hard-fail at `record_schema_compliance` time — the *required-for-`world_char`* discipline is enforced by 003's validator (with the warn-until-touched window), not by a JSON-Schema `required` entry that would block legacy records immediately. Reassessment corrected the proof surface from `tools/validators/tests/structural/stchar-structural-validators.test.ts` to the existing schema-owner test `tools/validators/tests/structural/record-schema-compliance-story-character-authority.test.ts`, with `contract-schema-roundtrip.test.ts` updated for the schema field-set guard.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism At Story Scope): every story-bundle schema field must be load-bearing. `source_operational_fact_map` is load-bearing because 003's validator reads it on every `world_char` STCHAR validation; array fields take one field-level entry each, so no per-element bloat is introduced. The field satisfies §5b rather than tensioning it.
5. Schema extension: this extends the STCHAR frontmatter schema (an existing output schema). Consumers: `record-schema-compliance` (must tolerate the new field — additive), `stchar_source_fact_coverage` (003, the enforcing consumer), and `compute-stchar-hashes` (unaffected — `profile_hash` is over the body markdown only, `voice_block_hash`/`page_packet_hash` over body/§16a-projection; a frontmatter field changes no hash). Extension is additive-only at the JSON-Schema level (new optional field), so existing STCHAR records remain schema-valid.

## Architecture Check

1. Defining the field in the schema but enforcing the required-for-`world_char` discipline in the dedicated coverage validator (003) keeps the JSON Schema purely structural (shape + closed enums) and leaves the conditional/migration semantics to the validator — matching the existing split where `record-schema-compliance` checks shape and dedicated structural validators check semantics. A JSON-Schema `required` entry would hard-fail the 3 legacy records immediately, defeating the §3 warn-until-touched window.
2. No backwards-compatibility shim: the field is genuinely new (additive optional), not an alias of an existing field; no legacy field is renamed or retained in parallel.

## Verification Layers

1. Field accepts the SPEC-70 §2.3 shape (`source_field` / `disposition` closed-enum / `target_section` / `rationale`) → schema validation (JSON Schema `enum` for `disposition`; object-array `items` shape).
2. Existing STCHAR records remain schema-valid without the field → schema validation (the field is not in the schema's `required` array; `record-schema-compliance` dry-run against the 3 red-bunny STCHAR passes).
3. No hash recomputation is triggered by the field → codebase grep-proof (`compute-stchar-hashes.ts` hashes the body / voice-block / §16a-projection, never frontmatter; confirm the field name does not appear in the hash CLI).

## What to Change

### 1. Add `source_operational_fact_map` to the STCHAR frontmatter schema

In `tools/validators/src/schemas/story-character-authority.schema.json`, add an optional array property:

- `source_operational_fact_map`: array of objects, each with:
  - `source_field` (string) — one of the 10 `dramatic_core` engine field names.
  - `disposition` (string, closed enum): `copied | transformed | compressed | omitted_with_rationale | story_irrelevant`.
  - `target_section` (string) — a real operational STCHAR H2 section name; semantically constrained (not `Source Distillation` for retained dispositions) by 003's validator, not by the schema.
  - `rationale` (string) — required-when-omission, enforced by 003's validator.

Do NOT add the field to the schema's top-level `required` array, and do NOT add a JSON-Schema conditional (`if`/`then`) that requires it for `world_char` — the required-for-`world_char` discipline + warn-until-touched migration window is 003's responsibility.

## Files to Touch

- `tools/validators/src/schemas/story-character-authority.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-character-authority.test.ts` (modify) — add cases asserting the schema accepts a well-formed `source_operational_fact_map`, still accepts a record without it, accepts `story_local` with a null map, and rejects an unknown disposition.
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify) — add the optional field to the aggregate schema property-set guard.

## Out of Scope

- The coverage-enforcement logic (required-for-`world_char`, `target_section` ≠ `Source Distillation`, rationale-required) — that is SPEC70CHASTCHARSEM-003.
- Any change to `profile_hash` / `voice_block_hash` / `page_packet_hash` computation.
- Any STCHAR body-section change — that is SPEC70CHASTCHARSEM-002.
- Backfilling the field into the 3 existing red-bunny STCHAR records.

## Acceptance Criteria

### Tests That Must Pass

1. Schema validates a STCHAR frontmatter carrying a well-formed `source_operational_fact_map` array (all 5 disposition enum values exercised).
2. Schema validates a STCHAR frontmatter WITHOUT the field (legacy shape) — confirms additive-only.
3. `npm test` green in `tools/validators` (build + node --test).

### Invariants

1. The field is additive-only at the JSON-Schema level — no existing STCHAR record becomes schema-invalid by its introduction.
2. `disposition` is a closed enum of exactly the 5 SPEC-70 §2.3 values; unknown disposition strings fail schema validation.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-character-authority.test.ts` (modify) — add accept-with-field, accept-without-field, `story_local`-null-map, and reject-bad-disposition cases.
2. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify) — keep the expected STCHAR property set synchronized with the schema.

### Commands

1. `npm test --prefix tools/validators` — runs `npm run build` (tsc) then `node --test` over `dist/tests/**`.
2. `npm run build --prefix tools/validators` — typecheck/compile gate (the package has no separate `typecheck` script; `build` invokes `tsc`).

## Verification Result

Completed 2026-05-22:

1. `npm test --prefix tools/validators` — PASS; rebuilt `tools/validators` and ran 883 Node tests with 883 passing.
2. `npm run build --prefix tools/validators` — PASS; `tsc -p tsconfig.json` completed and refreshed `dist/`.

## Outcome

Completed 2026-05-22. Added optional `source_operational_fact_map` to `story-character-authority.schema.json` with closed `source_field` and `disposition` enums, optional non-empty `target_section`, and optional non-empty `rationale`. The field is not top-level required and no `world_char` conditional requires it, preserving the legacy migration window for SPEC70CHASTCHARSEM-003. The semantic `target_section` checks remain owned by SPEC70CHASTCHARSEM-003, so its `Source Distillation` regression can fail at the coverage validator rather than being preempted by JSON Schema.

Tests were added to the STCHAR schema-compliance surface for well-formed maps, absent legacy maps, `story_local` null maps, and bad disposition rejection. The aggregate schema field-set guard now includes the new optional property.

Deviation from draft: the focused test target moved from `stchar-structural-validators.test.ts` to `record-schema-compliance-story-character-authority.test.ts`, because the latter is the live owner for STCHAR frontmatter schema behavior. `contract-schema-roundtrip.test.ts` was added as same-seam proof-surface fallout for the schema property-set guard.
