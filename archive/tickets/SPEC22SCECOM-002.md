# SPEC22SCECOM-002: Schema infrastructure: extend `record_schema_compliance` + JSON schemas for SLT v2 / CHC v2 / ARC_TRACE

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/validators/src/structural/utils.ts` (`STRUCTURAL_NODE_TYPES`, `RECORD_TYPE_TO_SCHEMA`, structural authority filtering) and `tools/validators/src/schemas/` (2 modified + 1 new JSON schema). `record-schema-compliance.ts` was verified unchanged after live dispatch reassessment. No impact on existing record-type validation paths besides v1 SLT/CHC schema retirement.
**Deps**: None

## Problem

SPEC-22 introduces v2 SLT (`shape: scene_commitment_arc`) and v2 CHC (`choice_kind: scene_commitment` with a populated `choice_worthiness` block) records, plus an entirely new ARC_TRACE record type. Without extending the schema-validator infrastructure, `record_schema_compliance` cannot enforce structural shape on these records, leaving rule validators (003, 004, 005) to compensate with broader semantics — a layering violation. Schema validation enforces structural presence; rule validators enforce richer semantics; the two layers must remain distinct.

## Assumption Reassessment (2026-05-08)

1. `tools/validators/src/structural/record-schema-compliance.ts` exists (9.4KB, May 1). It dispatches via `RECORD_TYPE_TO_SCHEMA` (defined in `tools/validators/src/structural/utils.ts`), which maps record-type strings (e.g., `storylet_record`, `page_record`) to JSON schema file basenames (e.g., `story-storylet`, `story-page`).
2. `tools/validators/src/schemas/` ships 15 schema files: `story-branch`, `story-choice` (373B placeholder), `story-consequence`, `story-diegetic-artifact`, `story-entity`, `story-event`, `story-fact`, `story-intention`, `story-location`, `story-object`, `story-obligation`, `story-page`, `story-relationship`, `story-storylet` (4.7KB, partially populated for v1), `story-thread`. No `story-arc-trace.schema.json` exists.
3. **SPEC-19 §A** (archived) defines v2 SLT structural blocks: `arc_contract`, `dramatic_unit`, `beat_plan`, `execution_envelope`, `stop_policy`, `effect_model`, `exit_portfolio`. **§B** defines CHC v2 fields: `likely_effects`, `choice_worthiness` block (`strategic_question_answered`, `strong_axes`, `expected_state_delta`, `why_not_microbeat`, `foreseeable_difference`). **§C** defines ARC_TRACE record shape: `id` / `created_at_page` / `arc_realized` / `effect_variant_applied` / `semantic_critic_verdict` / `realized_beats[]` / `possible_violations[]` / `stop_condition_hit` / `effect_evidence[]` / `observed_actions[]`.
4. **FOUNDATIONS Rule 1 (No Floating Facts)** restated: every v2 record field must declare scope / prerequisites / limits / consequences. JSON Schema validation enforces structural presence; rule validators in 003, 004, 005 enforce richer semantics that go beyond shape (e.g., effect_model_legality checks `variants[].maps_to_outcome ∈ allowed_outcome_band`).
5. (HARD-GATE / canon-write ordering): N/A — validator framework is meta-tooling; no canon writes.
6. **Schema extension is additive within v2**: storylet schema gains 7 new top-level structural blocks (additive); choice schema gains 2 new top-level blocks (`likely_effects` + `choice_worthiness` — additive); ARC_TRACE schema is wholly new. v1 SLT/CHC records would fail v2 validation, but per SPEC-22 Track 5 the only v1 bundle (red-bunny) is discarded in 014; new bundles (animalia + future) are v2-native. Per SPEC-22 §Risks: "full cutover, no partial coexistence" — the v1 SLT/CHC schema paths are removed in lockstep with the test-bundle discard.
7. **Rename/removal blast radius**: removing v1 SLT/CHC paths in `record-schema-compliance.ts` is bounded to this validator + its test fixtures. Other consumers of these schemas (e.g., the ajv compile-time path in `tools/validators/src/structural/`) read the schema files lazily and will pick up the v2 shape on next invocation.
8. Live dispatch correction: `record_schema_compliance.ts` already compiles every schema named by `RECORD_TYPE_TO_SCHEMA` and does not need a source edit. The live enumeration gates are in `tools/validators/src/structural/utils.ts`: `STRUCTURAL_NODE_TYPES` must include `arc_trace_record`, and `isStructuralAuthorityRecord` must accept `stories/<story-slug>/_source/arc-traces/ARCTRACE-NNNN.yaml`.
9. Consumer boundary: Track 3 tickets 007/008 own world-index ingestion and MCP retrieval/schema-discovery surfaces such as `get_record_schema(record_type='arc_trace_record')`. This ticket provides the validator JSON schema and structural registration that those later surfaces can consume; it does not change `tools/world-mcp/`.
10. ARC_TRACE schema correction: archived SPEC-19 §C is the schema authority for ARC_TRACE. The landed schema therefore includes `story_id`, `observed_claims[]`, and `semantic_critic_verdict.status` values `pass | revise_prose | reject_arc | promote_interrupt`; the drafted `warn / reject_envelope` status pair was stale Track 2 prose, not the record-schema authority.

## Architecture Check

1. JSON schemas under `tools/validators/src/schemas/` are the canonical structural-shape source-of-truth, dispatched by `RECORD_TYPE_TO_SCHEMA`. Extending the existing dispatch mechanism is cleaner than introducing a parallel SLT-v2 dispatch path or a `record_version` discriminator (which SPEC-22 §Risks explicitly recommends against).
2. No backwards-compatibility aliasing/shims — v1 SLT/CHC paths are removed in lockstep with the red-bunny discard (014); no `record_version: 1 | 2` switch.

## Verification Layers

1. SLT v2 schema accepts a v2 storylet record → integration test (representative v2 fixture).
2. SLT v2 schema rejects a v2 storylet record missing one of the 7 structural blocks → integration test (mutated fixture).
3. CHC v2 schema accepts/rejects per `choice_worthiness` block presence → integration test.
4. ARC_TRACE schema accepts a well-formed trace and rejects malformed shape (out-of-range `evidence_span`, missing `semantic_critic_verdict`) → integration test.
5. `RECORD_TYPE_TO_SCHEMA` map registers `arc_trace_record` → `grep -n "arc_trace_record" tools/validators/src/structural/utils.ts`.
6. FOUNDATIONS Rule 1 alignment: schema enforces presence of every v2 structural field — manual review of each schema's `required` array against SPEC-19 §A / §B / §C.

## Landed Changes

### 1. Extend `tools/validators/src/schemas/story-storylet.schema.json`

Add JSON-Schema definitions for the seven v2 structural blocks per SPEC-19 §A:

- `arc_contract`: object with `commitment_class` (enum), `arc_archetype` (enum), `commitment_scope`, `allowed_outcome_band[]`, `entry_pressure_summary`.
- `dramatic_unit`: object with `entry_pressure`, `central_dramatic_question`, `closure_condition`.
- `beat_plan`: object with `beats[].state_significance`, `beats[].realization_target`.
- `execution_envelope`: object with `forbidden_actions[]`, `mystery_preservation.forbidden_resolutions[]`, etc.
- `stop_policy`: object with `normal_exits[].{id, predicate}` and `interrupt_before[].{id, predicate}`.
- `effect_model`: object with `variants[].{id, maps_to_outcome, required_effects[].{type, ...}, forbidden_effects[]}`.
- `exit_portfolio`: object with hybrid native + cross-arc seed eligibility.

Require all seven blocks for the forward-only `shape: scene_commitment_arc` v2 schema.

### 2. Extend `tools/validators/src/schemas/story-choice.schema.json`

Currently a 373B `{type: object}` placeholder. Add full schema:

- `likely_effects[]`: array of effect-reference shape (additive structural field).
- `choice_worthiness`: object with `strategic_question_answered`, `strong_axes[]`, `expected_state_delta`, `why_not_microbeat`, `foreseeable_difference`.

Mark both as required when `choice_kind == "scene_commitment"`.

### 3. Add `tools/validators/src/schemas/story-arc-trace.schema.json`

NEW JSON Schema for ARC_TRACE record shape per SPEC-19 §C:

- `id`: string matching `/^ARCTRACE-\d{4}$/`
- `created_at_page`: string matching `/^PG-\d{4}$/`
- `arc_realized`: string matching `/^SLT-\d{4}$/`
- `effect_variant_applied`: string (variant id from arc.effect_model.variants[].id)
- `semantic_critic_verdict`: object with `status` (enum: pass / revise_prose / reject_arc / promote_interrupt) + reasons / required revision constraints
- `realized_beats[]`: array of `{beat_id, realized: true | partially | not, evidence_span: {start, end}}`
- `possible_violations[]`: array of `{envelope_item, severity, evidence_span}`
- `stop_condition_hit`: object with `id`, `category` (enum: normal_exit / interrupt_before / safety_valve), `evidence_span`
- `effect_evidence[]`: array of `{effect_ref: integer, evidence_span: {start: integer, end: integer}}`
- `observed_actions[]`: array of `{actor, target?, evidence_span}`

### 4. Extend `tools/validators/src/structural/utils.ts`

Add `arc_trace_record: "story-arc-trace"` to the `RECORD_TYPE_TO_SCHEMA` map.

### 5. Verify `tools/validators/src/structural/record-schema-compliance.ts` dispatch

Confirm the validator's schema compiler picks up the new map entry without an explicit `record-schema-compliance.ts` change. The live dispatch enumeration lives in `utils.ts`; add `arc_trace_record` to `STRUCTURAL_NODE_TYPES` and the structural-authority path filter. Remove v1 SLT/CHC schema acceptance in lockstep with SPEC-22's forward-only cutover — no parallel-format coexistence.

## Files to Touch

- `tools/validators/src/schemas/story-storylet.schema.json` (modify — extend for v2)
- `tools/validators/src/schemas/story-choice.schema.json` (modify — replace placeholder with full v2 schema)
- `tools/validators/src/schemas/story-arc-trace.schema.json` (new)
- `tools/validators/src/structural/utils.ts` (modify — `RECORD_TYPE_TO_SCHEMA` extension)
- `tools/validators/src/structural/record-schema-compliance.ts` (verify only — no source edit needed after live dispatch reassessment)
- `tools/validators/tests/structural/record-schema-compliance-arc.test.ts` (new — covers SLT v2 + CHC v2 + ARC_TRACE)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify — retire v1 SLT fixture assertions in favor of v2 structural assertions)
- `tools/validators/tests/fixtures/story-storylet-complete.yaml` (modify — v2 SLT structural fixture)
- `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (modify — truth Track 2 status for landed `record_schema_compliance` work)

## Out of Scope

- Rule-level validators (split across 003, 004, 005)
- v1 SLT/CHC migration shims — forward-only per SPEC-22 §Track 5; v1 path removed in lockstep with 014
- Schema definitions themselves (owned by archived SPEC-19; this ticket only encodes them as JSON Schema)
- PG record schema extension for `state_snapshot.applied_effect_variant` etc. — those fields are validated by rule validators (004, 005), not record_schema_compliance; no `story-page.schema.json` extension needed
- JIT arc promotion, cache arc render packets, arc archetype library expansion beyond initial 20, constrained decoding, empirical token-cost telemetry

## Acceptance Criteria

### Tests That Must Pass

1. `record_schema_compliance` accepts a well-formed v2 SLT record (all 7 structural blocks populated) — integration test.
2. `record_schema_compliance` rejects a v2 SLT record missing any of the 7 blocks — one rejection test per missing block.
3. `record_schema_compliance` accepts a well-formed v2 CHC record with full `choice_worthiness` block; rejects one with `likely_effects: []`.
4. `record_schema_compliance` accepts a well-formed ARC_TRACE record; rejects with malformed `evidence_span` (`{start: -1, end: 100}`).
5. `RECORD_TYPE_TO_SCHEMA` map exposes `arc_trace_record → "story-arc-trace"` when imported, and `STRUCTURAL_NODE_TYPES` / authority filtering make ARC_TRACE records reachable by `queryStructuralRecords`.

### Invariants

1. v2 SLT records have all 7 structural blocks populated.
2. v2 CHC records with `choice_kind: scene_commitment` have non-empty `likely_effects` and populated `choice_worthiness` block.
3. ARC_TRACE records have structurally valid `evidence_span: {start, end}` offsets (`start >= 0`, positive `end`) and structurally-valid `semantic_critic_verdict.status` (one of the closed enum values). Cross-field byte-range alignment such as `end > start` and prose-length bounds remains rule-level validation owned by 005.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-arc.test.ts` (new) — covers SLT v2, CHC v2, ARC_TRACE schema acceptance / rejection scenarios.
2. `tools/validators/tests/fixtures/story-storylet-complete.yaml` (modified) — representative v2 SLT fixture.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && npm run test`

## Outcome

Completed: 2026-05-08.

Implemented the `record_schema_compliance` structural infrastructure for the scene-commitment arc cutover. The storylet JSON schema is now v2-only (`record_version: 2`, `shape: scene_commitment_arc`) and requires the seven arc structural blocks. The choice schema now enforces the v2 scene-commitment surface, including non-empty `likely_effects` and populated `choice_worthiness` for `choice_kind: scene_commitment`. Added the new ARC_TRACE JSON schema and registered `arc_trace_record` through the structural schema map, structural node enumeration, and authority-file filter.

The existing v1 storylet structural fixture/tests were retired in favor of v2 fixtures. SPEC-22 Track 2 prose now records that `record_schema_compliance` has landed while the remaining rule-level validators are still active follow-up work.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance.test.js dist/tests/structural/record-schema-compliance-arc.test.js` — passed, 27 focused structural tests.
3. `cd tools/validators && npm test` — passed, 145 tests.
4. Manual FOUNDATIONS alignment check: preserves §Story Bundles §5 Rule 1 by enforcing v2 story-bundle structural fields at the schema layer while leaving richer semantic validation to tickets 003/004/005.
5. Codebase grep-proof: `arc_trace_record` appears in `tools/validators/src/structural/utils.ts` in `STRUCTURAL_NODE_TYPES`, `RECORD_TYPE_TO_SCHEMA`, and the structural-authority path filter.

## Deviations

- `tools/validators/src/structural/record-schema-compliance.ts` did not need a source edit after reassessment. The live dispatch work was in `tools/validators/src/structural/utils.ts`.
- Track 3 MCP/index schema-discovery consumers remain out of scope for this ticket and are still owned by 007/008.
- ARC_TRACE status values follow archived SPEC-19 §C (`pass | revise_prose | reject_arc | promote_interrupt`), correcting the stale drafted `warn / reject_envelope` wording.
