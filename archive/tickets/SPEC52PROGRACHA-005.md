# SPEC52PROGRACHA-005: Schemas — CHAR dramatic_core + NCP/NCB first-class

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/schemas/character-frontmatter.schema.json` (modify); `character-proposal-card.schema.json` + `character-proposal-batch.schema.json` (new).
**Deps**: archive/tickets/SPEC52PROGRACHA-002.md, archive/tickets/SPEC52PROGRACHA-003.md

## Problem

NCP proposal cards are indexed but not schema-validated, and CHAR dossiers have no `dramatic_core` schema. SPEC-52 D5 makes NCP/NCB first-class schema-validated records and adds the required `dramatic_core` block to the CHAR frontmatter schema, so weak records fail validation with actionable messages.

## Assumption Reassessment (2026-05-20)

1. `tools/validators/src/schemas/character-frontmatter.schema.json` exists with `additionalProperties: false` and a `required` array of identity/world-consistency fields (no `dramatic_core`). There is NO `schemas/index.ts` barrel — `record-schema-compliance.ts` `loadSchemaValidators()` (line 298) iterates `RECORD_TYPE_TO_SCHEMA` and reads `${schemaName}.schema.json` per-entry (line 305), so a new schema file is wired by adding it to `RECORD_TYPE_TO_SCHEMA` (ticket 006) — no barrel edit. The current NCP template (`propose-new-characters/templates/proposal-card.md`) emits `occupancy_strength` (line 62), `score_aggregate` (line 86), and optional authorial-steer fields `central_contradiction`/`desired_emotional_tone`/`desired_arc_type`/`taboo_limit_themes` (lines 43-46).
2. SPEC-52 §Phase 5 items 1-3 + Deliverable 5 enumerate: CHAR `dramatic_core` required block; NCP card schema (required set + conditional `implied_new_facts` when `canon-requiring`); NCB batch schema. SPEC-52 reassessment Issue I1 added the explicit requirement that the NCP schema's `properties` enumerate the FULL template surface (required + the optional fields above) under `additionalProperties: false`, with `scores` kept a permissive `{type: object}`.
3. Cross-artifact schema boundary: the CHAR `dramatic_core` block + NCP `memorability_profile` block field names MUST match `.claude/skills/_shared-references/protagonist-grade-character-engine.md` (001), the NCP templates emitted by `archive/tickets/SPEC52PROGRACHA-002.md`, and the CHAR templates emitted by 003. Consumers: `record-schema-compliance.ts` `loadSchemaValidators` (006, via `RECORD_TYPE_TO_SCHEMA`) and `hybridRecordsFromFiles` (006). Depends on `archive/tickets/SPEC52PROGRACHA-002.md`/003 so the schemas enforce what the skills now emit (per §Approach sequencing — schema enforcement lands after skill revisions to avoid breaking generation).
4. Output-schema extension: required `dramatic_core` (CHAR) and required `memorability_profile` (NCP) are breaking-by-design — existing animalia CHAR dossiers and NCP cards fail validation until manually edited (SPEC-52 §Key Design Decisions; Rule 6: documented intended break, not a silent retcon). The break must NOT extend to the legitimate optional NCP fields (per I1) — those stay permitted.

## Architecture Check

1. Per-record schema files loaded via `RECORD_TYPE_TO_SCHEMA` (no barrel) means adding two NCP/NCB schema files + (in 006) two map entries fully wires them — consistent with how every existing record schema is loaded. Enumerating the full NCP property surface (not just the required set) under `additionalProperties:false` is what keeps freshly-generated cards valid.
2. No backwards-compatibility aliasing/shims — old records fail with actionable messages; manual migration is the intended path.

## Verification Layers

1. CHAR schema has required `dramatic_core` (nested `pressure_behavior`/`voice_under_pressure` `additionalProperties:false`; `signature_scene_behaviors` minItems 3; `relational_charge` minItems 1) → AJV schema validation.
2. NCP schema accepts a complete card incl. the optional template fields; rejects missing `memorability_profile`; rejects `canon-requiring` with empty `implied_new_facts` → AJV pass/fail tests.
3. NCB schema validates the batch-manifest frontmatter shape → AJV validation.
4. `dramatic_core`/`memorability_profile` field names match 001 → codebase grep-proof + cross-check.

## What to Change

### 1. CHAR schema (`character-frontmatter.schema.json`)

Add a required `dramatic_core` object (the engine fields; nested `pressure_behavior` 5 keys + `voice_under_pressure` 4 keys with `additionalProperties:false`; `relational_charge` array minItems 1; `signature_scene_behaviors` array minItems 3; leaf strings minLength 1). Add `dramatic_core` to the top-level `required` array.

### 2. NCP card schema (`character-proposal-card.schema.json`, new)

`additionalProperties: false`; `required` = character-generation compatibility fields + `niche_summary`, `depth_class` (enum `emblematic|elastic|round_load_bearing|protagonist_grade`), `proposal_family`, `diagnosis_target`, `memorability_profile` (full required block per the SPEC-52 source skeleton), `scores`, `canon_assumption_flags`, `recommended_next_step`, `critic_pass_trace`, `canon_safety_check`, `source_basis`. `properties` ALSO enumerates the optional fields `batch_id` (`^NCB-[0-9]+$`), `upgrade_lineage`, `occupancy_strength`, `score_aggregate`, `notes`, `central_contradiction`, `desired_emotional_tone`, `desired_arc_type`, `taboo_limit_themes`; `scores` is `{type: object}`. Conditional `allOf`: when `canon_assumption_flags.status == canon-requiring`, `implied_new_facts` (each `{statement, reason_needed, preferred_route ∈ {canon-addition, propose-new-canon-facts}}`) is non-empty.

### 3. NCB batch schema (`character-proposal-batch.schema.json`, new)

Validate the batch-manifest frontmatter shape (extend, do not replace, the existing audit-record fields).

## Files to Touch

- `tools/validators/src/schemas/character-frontmatter.schema.json` (modify)
- `tools/validators/src/schemas/character-proposal-card.schema.json` (new)
- `tools/validators/src/schemas/character-proposal-batch.schema.json` (new)
- `tools/validators/tests/schemas/character-frontmatter-schema-fixtures.test.ts` (new)
- `tools/validators/tests/schemas/character-proposal-schema-fixtures.test.ts` (new)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify)
- `tools/validators/tests/integration/spec09-verification.test.ts` (modify)

## Out of Scope

- Wiring the schemas into `utils.ts` / `record-schema-compliance.ts` / the structural validator (006).
- The skill templates themselves (`archive/tickets/SPEC52PROGRACHA-002.md`/003).
- World-index regex / CLAUDE.md docs (007).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — new AJV tests: NCP schema accepts a complete card carrying the optional template fields; rejects missing `memorability_profile`; rejects `canon-requiring` with empty `implied_new_facts`; CHAR schema rejects missing `dramatic_core`.
2. The three schema files parse as valid JSON Schema (build step compiles them).

### Invariants

1. NCP `properties` covers the full current template surface; a conformant freshly-generated card validates.
2. `dramatic_core`/`memorability_profile` field names match the shared reference (001).
3. The required-field break is scoped to `dramatic_core`/`memorability_profile`; optional fields remain permitted.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/schemas/character-proposal-schema-fixtures.test.ts` — AJV accept/reject cases for the NCP schema plus NCB manifest acceptance.
2. `tools/validators/tests/schemas/character-frontmatter-schema-fixtures.test.ts` — `dramatic_core` acceptance, required-rejection, and `signature_scene_behaviors` minItems rejection.
3. `tools/validators/tests/integration/spec04-verification.test.ts` — updates the animalia full-world baseline to recognize the intended SPEC-52 legacy CHAR `dramatic_core` failures.
4. `tools/validators/tests/integration/spec09-verification.test.ts` — updates the animalia full-rule and validate-patch-plan baselines to recognize the same intended legacy CHAR failures while preserving the SPEC-09 owned assertions.

### Commands

1. `npm test --prefix tools/validators`
2. `node -e "JSON.parse(require('fs').readFileSync('tools/validators/src/schemas/character-proposal-card.schema.json','utf8')); console.log('NCP schema parses')"`

## Outcome

Completed 2026-05-20.

Implemented the SPEC-52 schema layer:

- Added required CHAR `dramatic_core` to `tools/validators/src/schemas/character-frontmatter.schema.json`, including the shared protagonist-grade field names, five-key `pressure_behavior`, four-key `voice_under_pressure`, `relational_charge` minItems 1, and `signature_scene_behaviors` minItems 3.
- Added `tools/validators/src/schemas/character-proposal-card.schema.json` for NCP cards. It requires `memorability_profile`, preserves optional template fields under `additionalProperties:false`, permits optional `batch_id`, keeps `scores` permissive, and requires non-empty `implied_new_facts` when `canon_assumption_flags.status` is `canon-requiring`.
- Added `tools/validators/src/schemas/character-proposal-batch.schema.json` for NCB batch-manifest frontmatter.
- Added direct AJV schema fixture tests for CHAR, NCP, and NCB shapes.
- Updated existing full-world animalia validator baselines to truth the intended breaking posture: the two legacy CHAR dossiers currently fail for missing `dramatic_core`, and those failures are the expected post-SPEC-52 baseline until manual content migration.

## Verification Result

1. `npm test --prefix tools/validators` — passed; 686 tests passed.
2. `node --test dist/tests/integration/spec04-verification.test.js dist/tests/integration/spec09-verification.test.js dist/tests/schemas/character-frontmatter-schema-fixtures.test.js dist/tests/schemas/character-proposal-schema-fixtures.test.js` from `tools/validators` after `npm run build --prefix tools/validators` — passed; 27 focused tests passed.
3. `node -e "const fs=require('fs'); for (const p of ['tools/validators/src/schemas/character-proposal-card.schema.json','tools/validators/src/schemas/character-proposal-batch.schema.json','tools/validators/src/schemas/character-frontmatter.schema.json']) JSON.parse(fs.readFileSync(p,'utf8')); console.log('schemas parse')"` — passed.
4. `grep -nE "world_produced_wound|active_appetite|self_mythology|irreconcilable_contradiction|pressure_behavior|relational_charge|moral_psychological_edge|signature_scene_behaviors|voice_under_pressure|cannot_be_swapped_out_because" .claude/skills/_shared-references/protagonist-grade-character-engine.md tools/validators/src/schemas/character-frontmatter.schema.json tools/validators/src/schemas/character-proposal-card.schema.json` — passed; all shared field names appear on the reference and schema surfaces.
5. `git diff --check -- tools/validators/src/schemas/character-frontmatter.schema.json tools/validators/src/schemas/character-proposal-card.schema.json tools/validators/src/schemas/character-proposal-batch.schema.json tools/validators/tests/schemas/character-frontmatter-schema-fixtures.test.ts tools/validators/tests/schemas/character-proposal-schema-fixtures.test.ts tools/validators/tests/integration/spec04-verification.test.ts tools/validators/tests/integration/spec09-verification.test.ts` — passed.

## Deviations

- The draft test placeholders resolved to the package's actual schema-fixture test naming: `character-frontmatter-schema-fixtures.test.ts` and `character-proposal-schema-fixtures.test.ts`.
- Existing SPEC-04/SPEC-09 full-world animalia tests had to move with the intended breaking schema. They now assert that the only current full-world failures are the two legacy CHAR records missing `dramatic_core` (duplicated where both indexed and hybrid-file paths report them), rather than preserving a stale zero-failure baseline.
- Local dependency installation and producer-package builds were needed to run the validators package in this worktree. Lockfile drift from install was removed; ignored `node_modules/` and `dist/` artifacts remain local proof artifacts only.
