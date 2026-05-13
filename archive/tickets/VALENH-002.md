# VALENH-002: Engine-side storylet record schema completeness

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `tools/validators/src/schemas/story-storylet.schema.json` to enforce the template-required-field set; updates validator and schema-discovery tests; updates `.claude/skills/storylet-pool-authoring/SKILL.md` (Phase 5b coverage prose) and `.claude/skills/storylet-pool-authoring/references/governance-and-foundations.md` (Phase 4 gate 9 mechanism prose) to reflect that engine-side schema completeness is now a structural backstop rather than a skill-internal-only gate.
**Deps**: `archive/tickets/VALENH-001.md` (predecessor — landed `storylet_predicate_dsl_parsability` validator and explicitly out-of-scoped a complete storylet schema validator at line 126: "A complete storylet schema validator for all SLT fields")

## Problem

At intake, `storylet-pool-authoring/SKILL.md` Phase 5b listed `record_schema_compliance` among the validator coverage that runs before the user-facing HARD-GATE summary, and the storylet-pool-authoring session on 2026-05-05 (SLB-0002 batch authoring 16 SLTs against `red-bunny`) returned `record_schema_compliance: pass` for every candidate. But the engine validator's storylet schema at `tools/validators/src/schemas/story-storylet.schema.json` only required `id` and `story_id` with `additionalProperties: true`; the storylet-record template (`.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`) documents 24+ structurally-required fields including `mystery_safety` (with sub-fields `forbidden_M_resolved` / `M_touched` / `M_progressed` / `M_resolution_claims` / `resolution_safety_per_M`), `provenance` (with `origin` / `source_audit` / `source_rsp` / `created_at_page`), `visibility` (with `scope` / `visible_from_page` / `visible_branch_path_prefix` / `allowed_branch_ids`), `choice_templates` (4-6 entries each with `operation` / `target_role` / `uses_fact_role` / `likely_effects` / `choice_mode` / `poetic_effect`), `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, `opens_obligations`, `pays_off_obligations`, `complicates_obligations`, `transfers_obligations`, `fact_effects`, `relationship_effects`, `tone_tags`, `theme_tags`, `tension_delta`, `aftermath_weight`, `title`, `shape`, and `content_intensity`.

Before this ticket, the skill's Phase 4 gate 9 (schema completeness) was the prose-side gate the operator ran during authoring; engine-side coverage was a no-op for everything beyond id+story_id pattern compliance. Three failure modes followed:

1. **Cross-skill submission asymmetry.** Multiple skills submit `create_slt_record` ops via the same engine path: storylet-pool-authoring direct invocation, `branching-story-bootstrap` Phase 6 sub-routine (`parent_skill_invocation: true` writing returned bootstrap-seed SLTs in its Phase 11 transaction), `branching-story-page-cycle` Phase 4 JIT sub-routine (`parent_skill_invocation: true` writing one runtime-JIT SLT in its Phase 11 page-tick transaction), and audit-mode batches consuming RSP cards. Each caller has its own gate-9 prose; none gets engine-side reinforcement. A future divergence between any caller's gate-9 implementation and the template contract lands silently in the pool.
2. **Operator-confidence misalignment.** The Phase 5b VALIDATION VERDICTS block in the storylet-pool-authoring HARD-GATE summary names `record_schema_compliance` as a coverage line. The operator approving the batch reasonably reads "PASS" as schema-complete; for storylets the verdict only confirms id and story_id presence. The 2026-05-05 SLB-0002 session relied on the skill's own Phase 4 gate 9 self-check to catch malformed records before submit; if Phase 4 had been skipped or weakened, the engine would have accepted the batch.
3. **Runtime-JIT divergence risk.** `branching-story-page-cycle` Phase 4 JIT generation produces one branch-scoped SLT per qualifying continuation-failure tick. JIT records share the SLT-NNNN namespace and the same `create_slt_record` op surface. Page-cycle's own gate-9-equivalent must remain in lockstep with the storylet-pool-authoring template; without engine-side enforcement, drift between the two is invisible until a malformed JIT SLT lands and breaks page-cycle Phase 4 selection on a later tick.

This ticket made the validator enforce the template's full required-field set as the engine-side structural backstop, with per-sub-field requireds for `mystery_safety` / `provenance` / `visibility` / `choice_templates`, enum constraints on the closed `shape` and `content_intensity` enums, and `minItems`/`maxItems` constraints on `choice_templates` (4-6). Free-form `notes` and any future additive template fields remain permitted by keeping `additionalProperties: true` at the top level.

## Assumption Reassessment (2026-05-05)

1. **Intake codebase state verified** — before implementation, `tools/validators/src/schemas/story-storylet.schema.json` was 12 lines with `required: ["id", "story_id"]` + `additionalProperties: true`; `tools/validators/src/structural/utils.ts:92` maps `storylet_record → "story-storylet"`; `tools/validators/src/structural/record-schema-compliance.ts` uses Ajv2020 in strict mode to compile schemas from `RECORD_TYPE_TO_SCHEMA`. The validator framework wiring was sound, and the remaining gap was the permissive storylet schema.
2. **Intake specs/docs state verified** — `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` enumerates 24+ required structural fields at lines 16-23 and §"Required structural fields"; before implementation, `.claude/skills/storylet-pool-authoring/references/governance-and-foundations.md` §"Validation Rules This Skill Upholds" Rule-1 row treated Phase 4 gate 7 + gate 9 as the SLT schema enforcement, and `.claude/skills/storylet-pool-authoring/SKILL.md` Phase 5b coverage prose listed `record_schema_compliance` without acknowledging the storylet-schema asymmetry.
3. **Cross-skill shared boundary under audit** — the boundary is the storylet record schema as a contract between the engine's `create_slt_record` op surface and four caller skills (storylet-pool-authoring direct, branching-story-bootstrap Phase 6 seed sub-routine, branching-story-page-cycle Phase 4 JIT sub-routine, branching-story-health-audit RSP-driven authoring via storylet-pool-authoring audit-mode). The schema file IS the canonical contract; tightening it is additive across all four callers.
4. **FOUNDATIONS Rule 1 (No Floating Facts) motivates this ticket** — `docs/FOUNDATIONS.md` §Story Bundles §5 Validation Rules at Story Scope reads "Rule 1 governs story-bundle record schemas. For example, SLT records require `mystery_safety`, `provenance`, `visibility`, predicate-DSL preconditions, and structured fact / relationship effects per `storylet-pool-authoring/templates/storylet-record.yaml`." The template IS the Rule-1 surface for SLT records; engine-side schema enforcement for those required fields IS the Rule-1 structural backstop.
5. **Schema extension is additive-only** — the present checkout's 48-record `red-bunny` pool validates against the extended schema. The historical VALENH-001 `marla-kern-seduction` pool is not present in this checkout, so it remains dependency evidence rather than a live acceptance lane. No backwards-compat shims were added; if a real existing record is malformed, the schema extension surfaces it as a real bug to fix.
6. **VALENH-001 explicitly out-of-scoped this work** — `archive/tickets/VALENH-001.md` §Out of Scope line 126: "A complete storylet schema validator for all SLT fields." VALENH-001 scoped predicate-DSL parsability narrowly; this ticket picks up the explicitly-deferred remainder. The retcon attribution is documented: VALENH-001's deferred-scope note IS the predecessor pointer for VALENH-002.
7. **Live-world fixture boundary corrected before implementation** — the current checkout has `worlds/erotica-world/stories/red-bunny/_source/storylets/SLT-1.yaml` through `SLT-48.yaml` under a gitignored world tree, but no `worlds/erotica-world/stories/marla-kern-seduction/` directory. VALENH-001's marla-kern-seduction proof remains historical dependency evidence, not an executable live-corpus acceptance lane for this run. The live-corpus proof is therefore narrowed to the present `red-bunny` pool plus synthetic package fixtures.
8. **Same-seam consumer added** — `tools/world-mcp/tests/tools/get-record-schema.test.ts` asserts `storylet_record.required_fields` from `tools/validators/src/schemas/story-storylet.schema.json`; tightening the schema requires updating that consumer-side schema-discovery proof. No source change is required in `tools/world-mcp/src/tools/get-record-schema.ts` because it already reads the validator schema dynamically.
9. **Dirty worktree overlap classified** — pre-existing same-seam edits are already present in `.claude/skills/storylet-pool-authoring/SKILL.md`, `.claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md`, `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md`, `.claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md`, and `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`. This ticket owns only the Phase 5b schema-completeness wording in `SKILL.md` and the Rule-1 mechanism wording in `references/governance-and-foundations.md`; the pre-existing Cn/id-assignment, projection-key recovery, and choice-mode vocabulary edits are left untouched.

## Architecture Check

1. **Cleaner than per-skill gate-9 duplication** — the storylet record schema is one contract shared by four caller skills. Centralizing structural enforcement in the engine validator is cleaner than maintaining four parallel Phase-4-gate-9-equivalent prose blocks, each at risk of drift relative to the template. Engine-side enforcement makes the template's required-field set authoritative for every caller without prose duplication.
2. **Closed enums where the template says closed; permissive where it says permissive** — `shape` is enum-bound (14 values in the live template); `content_intensity` is enum-bound (3 values); `provenance.origin` is enum-bound (4 values); `visibility.scope` is enum-bound (3 values); `choice_templates[].poetic_effect` is enum-bound (10 values). The schema enforces these closed boundaries. `choice_templates[].choice_mode`, `notes`, and any future additive fields stay permissive via top-level `additionalProperties: true`. This mirrors the closed/open discipline VALENH-001 §Architecture Check item 1 established for predicate DSL.
3. **No backwards-compatibility aliasing/shims introduced** — the present live storylet pool validates (verified per Verification Layer 4 below) and malformed storylets are flagged as real schema failures. The schema extension is the contract correction, not a compatibility layer.

## Verification Layers

1. Every template-required structural field is in the JSON Schema's `required[]` for its level → schema validation
2. Closed enums (`shape`, `content_intensity`, `provenance.origin`, `visibility.scope`, `choice_templates[].poetic_effect`) are enforced as `enum` constraints → schema validation
3. `choice_templates` array has `minItems: 4` and `maxItems: 6` per template line 22 → schema validation
4. Every existing SLT record in the present live checkout validates against the extended schema (live-corpus integration) → live-corpus integration check via `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` returning zero failures; the historical `marla-kern-seduction` dependency pool is not present in this checkout
5. `validate_patch_plan` on a fixture envelope with a complete SLT returns `record_schema_compliance: pass`; on a fixture envelope missing `mystery_safety`, it returns `record_schema_compliance: fail` with the missing field path. Other load-bearing fields, nested required fields, choice-template bounds, and closed enums are covered by package-local schema tests.
6. Cross-skill prose alignment: storylet-pool-authoring SKILL.md Phase 5b coverage prose names the strengthened backstop; governance-and-foundations.md Rule-1 row mechanism reads "Phase 4 gate 9 + structural via SLT schema (engine-enforced via VALENH-002)" → codebase grep-proof
7. `get_record_schema(node_type='storylet_record')` reports the strengthened `required_fields` list from the validator schema → package-local schema-discovery test
8. FOUNDATIONS Rule 1 alignment: SLT records cannot be floating facts because every required structural field is engine-enforced → FOUNDATIONS alignment check against `docs/FOUNDATIONS.md` §Story Bundles §5

## Landed Changes

### 1. Extend `tools/validators/src/schemas/story-storylet.schema.json`

Added to `required[]`: `title`, `shape`, `content_intensity`, `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, `opens_obligations`, `pays_off_obligations`, `complicates_obligations`, `transfers_obligations`, `fact_effects`, `relationship_effects`, `tone_tags`, `theme_tags`, `tension_delta`, `aftermath_weight`, `mystery_safety`, `choice_templates`, `provenance`, `visibility`.

Added to `properties`:
- `title`: `{ "type": "string", "minLength": 1 }`
- `shape`: `{ "type": "string", "enum": ["entry_pressure", "cast_introduction", "threat_escalation", "relational_dynamics", "routine_disruption", "aftermath_sequel", "reflection_dilemma", "mystery_edge_brush", "fork_recovery", "thread_resolution", "aftermath_residue", "intimacy", "confrontation", "other"] }` (14 values in the live template)
- `content_intensity`: `{ "type": "string", "enum": ["tame", "mature", "explicit"] }` (3 values per template line 32)
- `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, `opens_obligations`, `pays_off_obligations`, `complicates_obligations`, `transfers_obligations`, `fact_effects`, `relationship_effects`, `tone_tags`, `theme_tags`: `{ "type": "array" }` (per-element shape validation deferred to predicate-DSL validator and inner-shape checks; this ticket's scope is presence + array typing)
- `tension_delta`: `{ "type": "integer", "minimum": -2, "maximum": 2 }` (per template line 99)
- `aftermath_weight`: `{ "type": "number", "minimum": 0.0, "maximum": 1.0 }` (per template line 100)
- `mystery_safety`: `{ "type": "object", "required": ["forbidden_M_resolved", "M_touched", "M_progressed", "M_resolution_claims", "resolution_safety_per_M"], "properties": { "forbidden_M_resolved": { "type": "boolean" }, "M_touched": { "type": "array" }, "M_progressed": { "type": "array" }, "M_resolution_claims": { "type": "array" }, "resolution_safety_per_M": { "type": "object" } } }`
- `choice_templates`: `{ "type": "array", "minItems": 4, "maxItems": 6, "items": { "type": "object", "required": ["operation", "target_role", "uses_fact_role", "likely_effects", "choice_mode", "poetic_effect"], "properties": { "operation": { "type": "string" }, "target_role": { "type": "string" }, "uses_fact_role": { "type": "string" }, "likely_effects": { "type": "array" }, "choice_mode": { "type": "string" }, "poetic_effect": { "type": "string", "enum": ["relaxed", "obvious", "dilemma", "risky_truth", "sacrifice", "tragic_irony", "seduction", "desperation", "revelation", "flight"] } } } }` (10 poetic_effect values per template line 123)
- `provenance`: `{ "type": "object", "required": ["origin", "source_audit", "source_rsp", "created_at_page"], "properties": { "origin": { "type": "string", "enum": ["bootstrap_seed", "focus_authoring", "audit_remediation", "runtime_jit"] }, "source_audit": { "type": ["string", "null"] }, "source_rsp": { "type": ["string", "null"] }, "created_at_page": { "type": ["string", "null"] } } }`
- `visibility`: `{ "type": "object", "required": ["scope", "visible_from_page", "visible_branch_path_prefix", "allowed_branch_ids"], "properties": { "scope": { "type": "string", "enum": ["global_author_pool", "branch_prefix_scoped", "branch_scoped"] }, "visible_from_page": { "type": ["string", "null"] }, "visible_branch_path_prefix": { "type": ["array", "null"] }, "allowed_branch_ids": { "type": ["array", "null"] } } }`

Keep top-level `additionalProperties: true` so `notes` and future additive fields pass.

### 2. Added fixture coverage to `tools/validators/tests/structural/record-schema-compliance.test.ts`

New cases cover:
- Complete SLT record passes
- SLT missing `mystery_safety` fails with a `record_schema_compliance.required` message naming `mystery_safety`
- SLT missing `provenance.origin` fails
- SLT missing `visibility.scope` fails
- SLT with `choice_templates.length === 3` fails with `/choice_templates` minItems error
- SLT with `choice_templates.length === 7` fails with `/choice_templates` maxItems error
- SLT with `shape: "invalid_shape"` fails with `/shape` enum error
- SLT with `content_intensity: "extreme"` fails with `/content_intensity` enum error
- SLT with `provenance.origin: "weird_origin"` fails with `/provenance/origin` enum error

### 3. Updated `.claude/skills/storylet-pool-authoring/SKILL.md` Phase 5b prose

Clarified that `record_schema_compliance` for storylet records now structurally enforces the template's required-field set including `mystery_safety` / `provenance` / `visibility` / `choice_templates` 4-6. Added a one-line link to VALENH-002 as the engine-side backstop for Phase 4 gate 9.

### 4. Updated `.claude/skills/storylet-pool-authoring/references/governance-and-foundations.md` Rule-1 row

Updated the Mechanism cell from "Phase 4 gates 7 + 9; structural via SLT schema" to "Phase 4 gates 7 + 9; structural via SLT schema (engine-enforced via VALENH-002 + storylet_predicate_dsl_parsability via VALENH-001)" so the audit trail of which validator covers which gate is explicit.

## Files to Touch

- `tools/validators/src/schemas/story-storylet.schema.json` (modify — extend required[]/properties as detailed above)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify — add SLT fixture coverage)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — add Shape B complete-SLT pass and missing-field failure coverage)
- `tools/validators/tests/fixtures/story-storylet-complete.yaml` (new — complete SLT fixture for test)
- `tools/validators/tests/fixtures/patch-plan-complete-slt.json` (new — repo-root CLI fixture for the complete-SLT pre-apply path)
- `tools/validators/tests/fixtures/patch-plan-missing-mystery-safety-slt.json` (new — repo-root CLI fixture for the missing-field pre-apply path)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify — schema-discovery required_fields assertion follows the strengthened storylet schema)
- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify — Phase 5b coverage prose names VALENH-002)
- `.claude/skills/storylet-pool-authoring/references/governance-and-foundations.md` (modify — Rule-1 row mechanism cites VALENH-002)

## Out of Scope

- Schema completeness for other story-bundle record types (page, branch, choice, thread, obligation, consequence, intention, story-fact, story-event, story-relationship, story-location, story-object, story-entity) — each would be a separate VALENH ticket scoped to that record class's template.
- Schema completeness for hybrid records (CHAR-NNNN, DA-NNNN, PA-NNNN) — different surface (frontmatter + body), different validator coverage path.
- Per-element shape validation inside `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements` — those are predicate-DSL elements covered by VALENH-001's `storylet_predicate_dsl_parsability` validator. This ticket adds presence + array typing only; predicate-shape validation is already engine-enforced.
- Per-element shape validation inside `pays_off_obligations`, `complicates_obligations`, `transfers_obligations`, `opens_obligations`, `fact_effects`, `relationship_effects` — obligation-matcher and effect-template shape validation are out-of-scope here. A follow-up VALENH ticket can land obligation-matcher schema enforcement once the obligation-matcher schema is itself extracted (currently lives only in `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` §Obligation matcher schema).
- Updating `branching-story-page-cycle/SKILL.md` Phase 4 JIT-prose or `branching-story-bootstrap/SKILL.md` Phase 6 seed-sub-routine prose to reference VALENH-002. Those skills consume storylet-pool-authoring's no-write sub-routine packet; their own Phase 11 write transactions inherit the engine-side enforcement automatically. Sibling-skill prose updates to mention VALENH-002 explicitly are deferrable to `/skill-audit` follow-ups.
- Hook 5 post-apply integration for the storylet schema validator. Validator runs at `validate_patch_plan` and `submit_patch_plan` pre-apply; post-apply Hook 5 wiring is a separate hook-coverage ticket if needed.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — full validator package test suite passes including the new fixture coverage in `record-schema-compliance.test.ts` and `validate-patch-plan.test.ts`.
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js tools/validators/tests/fixtures/patch-plan-complete-slt.json` returns `status: "pass"` with `record_schema_compliance: pass`.
3. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js tools/validators/tests/fixtures/patch-plan-missing-mystery-safety-slt.json` returns `status: "fail"` with `record_schema_compliance: fail` and an error path naming `mystery_safety`.
4. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` reports zero failures against the present live 48-storylet pool.
5. `cd tools/world-mcp && npm test` — consumer package suite passes and proves `get_record_schema(node_type='storylet_record')` reflects the strengthened `required_fields`.

### Invariants

1. **Storylet schema completeness**: every SLT record submitted via `create_slt_record` op must include all 21 template-required structural fields with their template-required sub-field structure. Engine-side enforcement at `validate_patch_plan` and `submit_patch_plan` pre-apply.
2. **Backwards compatibility at HEAD**: every existing SLT record in the present checkout validates against the extended schema. If any existing record fails, the failure surfaces a real malformed-record bug to fix in a follow-up data-cleanup ticket; the schema extension does not retroactively invalidate the contract.
3. **Closed-enum discipline**: `shape`, `content_intensity`, `provenance.origin`, `visibility.scope`, and `choice_templates[].poetic_effect` are engine-enforced as enums. New enum values require a coordinated edit to (a) the JSON Schema, (b) the storylet-record.yaml template, and (c) downstream skill prose that references the enum — same lockstep discipline VALENH-001 §Architecture Check item 4 established for predicate DSL.
4. **No new validator rule registered**: VALENH-002 extends the existing `record_schema_compliance` structural validator's per-record-type schema; it does NOT add a new entry to `tools/validators/src/public/registry.ts`. The Phase 5b coverage line `record_schema_compliance` continues to name a single validator that grows in coverage as schemas tighten.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify) — added complete-pass and rejection-path SLT fixture cases covering required fields, nested required fields, choice-template bounds, and closed enums.
2. `tools/validators/tests/fixtures/story-storylet-complete.yaml` (new) — canonical complete SLT fixture mirroring the storylet-record.yaml template.
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify) — added Shape B complete-SLT pass and missing-field failure coverage through `validatePatchPlan`.
4. `tools/validators/tests/fixtures/patch-plan-complete-slt.json` (new) — repo-root CLI fixture for the complete-SLT pre-apply path.
5. `tools/validators/tests/fixtures/patch-plan-missing-mystery-safety-slt.json` (new) — repo-root CLI fixture for the missing-field pre-apply path.
6. `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify) — strengthened `storylet_record.required_fields` expectation.

### Commands

1. `cd tools/validators && npm run build` — producer build.
2. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance.test.js dist/tests/integration/validate-patch-plan.test.js` — focused compiled structural/pre-apply proof.
3. `cd tools/validators && npm test` — full validator package suite.
4. `cd tools/world-mcp && npm run build` — rebuild MCP CLIs that consume the validator package.
5. `cd tools/world-mcp && node --test dist/tests/tools/get-record-schema.test.js` — focused consumer schema-discovery proof.
6. `cd tools/world-mcp && npm test` — full consumer package suite.
7. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` — full-pipeline live-corpus check against the present 48-storylet `red-bunny` pool.
8. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js tools/validators/tests/fixtures/patch-plan-complete-slt.json` — fixture-level dry-run via the MCP CLI surface.
9. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js tools/validators/tests/fixtures/patch-plan-missing-mystery-safety-slt.json` — failure-path dry-run via the MCP CLI surface.

## Outcome

Completion date: 2026-05-05.

Completed. `story-storylet.schema.json` now enforces the storylet template's required structural field set, nested `mystery_safety` / `provenance` / `visibility` / `choice_templates` required fields, closed enums for `shape`, `content_intensity`, `provenance.origin`, `visibility.scope`, and `choice_templates[].poetic_effect`, and 4-6 `choice_templates`. The validator package has focused structural and pre-apply tests plus reusable complete/failure fixtures. `world-mcp` schema discovery now expects the strengthened `storylet_record.required_fields`. Storylet-pool authoring prose now states that `record_schema_compliance` is the VALENH-002 engine-side backstop for Phase 4 gate 9.

## Verification Result

Passed:

1. `cd tools/validators && npm run build`.
2. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance.test.js dist/tests/integration/validate-patch-plan.test.js`.
3. `cd tools/validators && npm test` — 102 tests passed.
4. `cd tools/world-mcp && npm run build`.
5. `cd tools/world-mcp && node --test dist/tests/tools/get-record-schema.test.js`.
6. `cd tools/world-mcp && npm test` — 339 tests passed.
7. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` — 6 structural validators ran; 0 fail, 0 warn, 0 info.
8. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js tools/validators/tests/fixtures/patch-plan-complete-slt.json` — `status: "pass"` with `record_schema_compliance: pass`.
9. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js tools/validators/tests/fixtures/patch-plan-missing-mystery-safety-slt.json` — `status: "fail"` with `record_schema_compliance.required` at `mystery_safety`, as intended.

## Deviations

The drafted live-corpus command `--rules record_schema_compliance` was not a supported `world-validate` selector; the live CLI exposes structural validators through `--structural`, so acceptance uses `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`. The historical `marla-kern-seduction` pool cited by VALENH-001 is not present in this checkout, so it was not used as a live-corpus proof lane. Pre-existing same-seam storylet authoring edits in `.claude/skills/storylet-pool-authoring/` were preserved; this ticket owns only the Phase 5b and governance wording hunks described above.
