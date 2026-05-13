# SPEC23STOSTACON-002: Rebuild SLT schema to contract §4.4 minimalist shape

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/validators/src/schemas/story-storylet.schema.json`, validator structural/integration tests
**Deps**: archive/tickets/SPEC23STOSTACON-001.md

## Problem

At intake, `tools/validators/src/schemas/story-storylet.schema.json` encoded the OLD storylet-pool-authoring pipeline shape: `record_version: 2`, `shape: "scene_commitment_arc"`, plus legacy fields including `content_intensity`, `hard_preconds`, `soft_preconds`, `mystery_safety`, `arc_contract`, `dramatic_unit`, `beat_plan`, `execution_envelope`, `stop_policy`, `effect_model`, and `exit_portfolio`. The shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` §4.4 forbids the arc / plot-rail framings and publishes the minimalist SLT shape. Per FOUNDATIONS §Story Bundles §5b, the contract is authoritative for story-record schemas, so the validator schema had to be rebuilt wholesale.

## Assumption Reassessment (2026-05-13)

1. Intake schema state verified before implementation: `tools/validators/src/schemas/story-storylet.schema.json` had `record_version: const 2`, `shape: const "scene_commitment_arc"`, and legacy block schemas for `arc_contract`, `dramatic_unit`, `beat_plan`, `execution_envelope`, `stop_policy`, `effect_model`, and `exit_portfolio`.
2. Contract authority: `.claude/skills/_shared-templates/story-state-contract.md` §4.4 specifies the post-rebuild SLT shape and explicitly forbids the retired arc / plot-rail fields. Post-SPEC23STOSTACON-001 the contract adds `move_family` (16 vals), `action_family` (20 vals), beats.function +action, `mystery_policy.allowed_authority` 4-val incl. `none`, `scope.visibility` 3-val, `provenance.origin` reconciled + `manual_authoring`.
3. Cross-artifact boundary under audit: SLT schema is consumed by `tools/validators/src/structural/utils.ts` (`storylet_record: "story-storylet"` mapping), `record_schema_compliance`, and pre-apply Shape B storylet tests. Old-pipeline rule validators that still inspect legacy SLT fields remain active but are owned by `SPEC23STOSTACON-008`. Boundary preservation: the schema's `$id` (`https://worldloom.local/schemas/story-storylet.schema.json`) stays unchanged so callers' `$ref`s continue to resolve.
4. FOUNDATIONS principle motivating this ticket: Rule 1 (No Floating Facts). Every field in the SLT schema must trace to a load-bearing consumer per FOUNDATIONS §Story Bundles §5b. The rebuilt schema removes legacy fields whose consumers no longer exist (old arc_contract/effect_model/stop_policy/exit_portfolio validators are retired in SPEC23STOSTACON-008) and aligns the remaining fields to the post-amendment contract.
5. Schema extension classification: this is a **breaking schema change** — every old SLT field is dropped or restructured. No additive shim; no aliasing. The breaking-change risk is zero because no production SLT records exist (spec §Risks §138 + empty `worlds/erotica-world/stories/` directory verified at SPEC23STOSTACON-001 time).
6. Blast radius of removed fields: old-pipeline validator files and tests still reference `arc_contract`, `effect_model`, and `stop_policy`; these are intentionally left for `SPEC23STOSTACON-008`. This ticket updated the schema-compliance and pre-apply SLT fixtures that prove the JSON Schema boundary, and left legacy rule-validator fixtures as explicit downstream debt.
7. Adjacent contradictions classification: (a) SLT-schema test fixtures under `tools/validators/tests/` that construct SLT records with old shape were required consequence of this ticket and were updated where they prove schema compliance. (b) `choice_templates: false` was not preserved because the contract has no `choice_templates` field; top-level `additionalProperties: false` now rejects it. (c) The old `record_version: 2` constant was dropped entirely; the rebuilt schema does not encode a `record_version` field.
8. Implementation correction: the contract no longer has `choice_templates` at all, and `additionalProperties: false` rejects it without a special `choice_templates: false` property. This is stricter and cleaner than preserving a one-off legacy-property sentinel.
9. Test-surface boundary: `tools/validators/tests/structural/record-schema-compliance.test.ts` and `tools/validators/tests/integration/validate-patch-plan.test.ts` now use contract-shaped SLT fixtures for schema-compliance proof. The old `story-storylet-complete.yaml` fixture remains available for legacy rule-validator tests and page-replay tests until `SPEC23STOSTACON-008` retires those validators.
10. Same-seam docs sweep: `docs/MACHINE-FACING-LAYER.md` still contains a `list_records` example using old storylet filter fields (`shape`, `content_intensity`, `visibility.scope`). That doc belongs to the world-mcp/public retrieval surface rather than this validators-schema ticket, so it is recorded as excluded follow-up surface rather than edited here.

## Architecture Check

1. Wholesale rebuild is cleaner than piecemeal property edits: the schema's structural mismatch (inverted block hierarchies — schema has `visibility.scope`, contract has `scope.visibility`; schema's `execution_envelope.mystery_preservation.allowed_claims` vs contract's `mystery_policy.allowed_authority`) means find-and-replace cannot bridge the gap. Replacing the entire `"properties"` block produces a clean diff and a clean schema.
2. No backwards-compatibility aliasing: contract §4.4 explicitly forbids the old fields. Carrying aliases would re-introduce arc-positional / plot-rail framings the contract rejects. Spec §Risks plus the completed dependency's empty-story-bundle check mean no compatibility cost.

## Verification Layers

1. Rebuilt schema's required[] list matches contract §4.4 required fields (marked `*`) → schema validation via `jq -r '.required[]' tools/validators/src/schemas/story-storylet.schema.json` returns the contract's required set and nothing else.
2. Forbidden fields (`arc_contract`, `dramatic_unit`, `execution_envelope`, `stop_policy`, `effect_model`, `exit_portfolio`, `record_version`, `shape`, `aftermath_weight`, `tension_delta`, `mystery_safety`, `content_intensity`, `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, etc.) are absent → codebase grep-proof: `grep -E "(arc_contract|dramatic_unit|execution_envelope|stop_policy|effect_model|exit_portfolio|aftermath_weight|tension_delta|mystery_safety|content_intensity|hard_preconds|soft_preconds|cast_requirements|location_requirements|tone_tags|theme_tags|fact_effects|relationship_effects)" tools/validators/src/schemas/story-storylet.schema.json` returns zero matches.
3. `move_family` enum has 16 values per contract §4.4 → schema validation: `jq -r '.properties.move_family.enum | length' tools/validators/src/schemas/story-storylet.schema.json` returns 16.
4. `exit_options.action_family` enum has 20 values from shared `action_family` taxonomy → schema validation.
5. `beats[].function` enum includes 6 values incl. `action` → schema validation.
6. `mystery_policy.allowed_authority` enum has 4 values incl. `none` → schema validation.
7. `scope.visibility` enum has 3 values (`global_author_pool`, `branch_prefix_scoped`, `branch_scoped`) → schema validation.
8. `provenance.origin` enum has 5 values (`bootstrap_seed`, `manual_authoring`, `author_batch`, `audit_repair`, `runtime_jit`) → schema validation.
9. Validator package builds + tests pass → `cd tools/validators && npm run build && npm test`.

## Landed Changes

### 1. Replace `tools/validators/src/schemas/story-storylet.schema.json` wholesale

Replaced the schema body with the contract §4.4 minimalist SLT shape:

- `$schema`, `$id` — unchanged.
- `type: "object"`.
- `required`: `["id", "story_id", "title", "scope", "preconditions", "beats", "mystery_policy", "provenance"]` plus any `*`-marked fields per contract §4.4 (also `move_family`, `exit_options`, `saliency` are marked required in the contract).
- `properties`:
  - `id`: pattern `^SLT-[0-9]{4}$`.
  - `story_id`: pattern `^STORY-[0-9]{3,4}$`.
  - `supersedes`: `{ type: ["string", "null"], pattern: "^SLT-[0-9]{4}$" }`.
  - `scope`: object with required `[visibility, branch_id]`; `visibility` is `enum: ["global_author_pool", "branch_prefix_scoped", "branch_scoped"]`; `branch_id` is `{ type: ["string", "null"], pattern: "^BR-[0-9]{4}$" }`.
  - `created_at_page`: `{ type: ["string", "null"], pattern: "^PG-[0-9]{4}$" }`.
  - `title`: `{ type: "string", minLength: 1 }`.
  - `move_family`: `enum: ["orient", "world_pressure", "pursuit", "investigation", "disclosure", "negotiation", "bond_shift", "status_shift", "conflict", "evasion", "protection", "resource_exchange", "transformation", "ritual_protocol", "decision", "recovery"]`.
  - `preconditions`: object with required `[hard]`; `hard` is array of predicate AST nodes (free-form objects — predicate-DSL parsability is enforced by `rule_storylet_predicate_dsl_parsability.ts` per SPEC23STOSTACON-008, not by JSON Schema); `soft` is optional array.
  - `beats`: array with `minItems: 1`, `maxItems: 5`; items are objects with required `[beat_id, function, instruction]`; `function` enum: `["setup", "action", "pressure", "turn", "consequence", "exit"]`.
  - `effects`: object with optional `create`, `supersede`, `close` arrays of record-id strings.
  - `exit_options`: array; items are objects with required `[action_family, surface_hint]`; `action_family` enum: 20 values per shared taxonomy (`["move", "evade", "pursue", "perceive", "investigate", "communicate", "persuade", "negotiate", "bond", "oppose", "harm", "protect", "control", "transfer", "use", "make_change", "ritual_protocol", "recover", "wait", "decide"]`); `surface_hint` is `{ type: "string", minLength: 1 }`; `likely_effects` is optional array of strings.
  - `saliency`: object with required `[urgency, cooldown_pages]`; `urgency` enum: `["low", "medium", "high"]`; `cooldown_pages` integer ≥ 0; optional `tags` array of strings.
  - `mystery_policy`: object with required `[allowed_authority]`; `forbidden_resolutions` is optional array of M-NNNN ids; `allowed_authority` enum: `["apparent", "branch_local_counterfactual", "canon_candidate", "none"]`.
  - `provenance`: object with required `[origin]`; `origin` enum: `["bootstrap_seed", "manual_authoring", "author_batch", "audit_repair", "runtime_jit"]`.
- `additionalProperties`: `false` — strict gate against re-introducing dropped legacy fields.

### 2. Drop the `$defs` block

Dropped the `$defs.stopCondition` and `$defs.effect` definitions because only the removed `stop_policy` and `effect_model` blocks consumed them.

### 3. Update SLT schema-compliance test fixtures

Updated `record-schema-compliance.test.ts` and `validate-patch-plan.test.ts` to construct contract-shaped SLT records with `move_family`, `scope.visibility`, nested `preconditions`, `beats[].function`, `exit_options[].action_family`, `saliency`, `mystery_policy`, and `provenance.origin`.

Updated `record-schema-compliance-arc.test.ts` so schema compliance now rejects legacy v2 scene-commitment storylets while preserving choice-route tests that still belong to the current choice schema. Legacy rule-validator tests continue to use `story-storylet-complete.yaml` until `SPEC23STOSTACON-008`.

## Files to Touch

- `tools/validators/src/schemas/story-storylet.schema.json` (modify — wholesale rewrite of `"properties"` and `"required"` blocks)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify — contract-shaped valid/invalid SLT schema fixtures)
- `tools/validators/tests/structural/record-schema-compliance-arc.test.ts` (modify — legacy SLT schema rejection boundary; choice-route tests preserved)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — contract-shaped SLT pre-apply schema fixtures)
- `specs/SPEC-23-story-state-contract-taxonomies.md` (modify — status note for completed SLT schema rebuild)

## Out of Scope

- Old-pipeline validator retirement (`arc_schema_compliance`, `effect_model_legality`, `effect_model_replay_safety`, `stop_policy_parsability`, `choice_worthiness_completeness`) — SPEC23STOSTACON-008.
- Predicate DSL grammar prune + parsability rewrite — SPEC23STOSTACON-008.
- Contract amendments — already done in `archive/tickets/SPEC23STOSTACON-001.md` (this ticket's dependency).
- PG schema rebuild — SPEC23STOSTACON-003.
- Skill prose updates referencing `move_family` / `action_family` / new enums — SPEC23STOSTACON-009.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build` — TypeScript builds clean (no consumers reference dropped block schemas like `arc_contract`); failures here indicate a validator under SPEC23STOSTACON-008 scope was not retired in time, OR a fixture was missed.
2. `cd tools/validators && npm test` — full test suite passes; SLT-touching tests use the new shape.
3. `jq '.properties | keys | length' tools/validators/src/schemas/story-storylet.schema.json` returns `14`, matching the landed top-level property set including optional `supersedes`, `created_at_page`, and `effects`.
4. Forbidden-fields grep returns zero: `grep -E "(arc_contract|dramatic_unit|execution_envelope|stop_policy|effect_model|exit_portfolio|record_version|aftermath_weight|tension_delta|mystery_safety|content_intensity|hard_preconds|soft_preconds)" tools/validators/src/schemas/story-storylet.schema.json` returns no matches.
5. Required enums sized correctly: `move_family` returns 16, `action_family` (on `exit_options.items.properties.action_family`) returns 20, `beats.items.properties.function` returns 6, `mystery_policy.properties.allowed_authority` returns 4, `scope.properties.visibility` returns 3, `provenance.properties.origin` returns 5.

### Invariants

1. Schema strictly enforces the contract §4.4 SLT shape (`additionalProperties: false`); re-introducing a dropped legacy field via a new SLT record produces a schema-validation FAIL.
2. Schema's `$id` (`https://worldloom.local/schemas/story-storylet.schema.json`) is preserved; downstream `$ref` resolvers continue to find the schema.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` — rewrote the existing storylet fixture helper to construct contract-§4.4-shaped SLT records; asserts PASS on valid records and FAIL on legacy fields / invalid enum values.
2. `tools/validators/tests/structural/record-schema-compliance-arc.test.ts` — updated legacy storylet tests to assert schema rejection while preserving choice-route schema checks.
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` — updated Shape B storylet pre-apply fixture to use the contract-shaped SLT record and assert missing `mystery_policy` rejection.

### Commands

1. `cd tools/validators && npm run build` — TypeScript build passes.
2. `cd tools/validators && npm test` — full validators build + test pass.
3. `jq '.properties | keys | length' tools/validators/src/schemas/story-storylet.schema.json` returns 14.
4. `jq '.properties.move_family.enum | length' tools/validators/src/schemas/story-storylet.schema.json` returns 16.
5. `jq '.properties.exit_options.items.properties.action_family.enum | length' tools/validators/src/schemas/story-storylet.schema.json` returns 20.
6. `grep -cE "(arc_contract|effect_model|stop_policy|exit_portfolio|record_version|aftermath_weight|tension_delta|mystery_safety|hard_preconds|soft_preconds)" tools/validators/src/schemas/story-storylet.schema.json` returns 0.

## Outcome

Completed on 2026-05-13. `story-storylet.schema.json` now enforces the contract §4.4 minimalist SLT shape with strict `additionalProperties: false`, no `$defs`, no `record_version` / `shape`, and no legacy arc / effect / stop-policy blocks. Structural and pre-apply tests now prove contract-shaped SLT acceptance and legacy-field rejection while leaving old rule-validator fixtures intact for `SPEC23STOSTACON-008`. The explicit SPEC-23 reference now has an implementation note marking the SLT schema rebuild complete and preserving older schema descriptions as historical intake context.

## Verification Result

1. `cd tools/validators && npm run build` — PASS.
2. `cd tools/validators && npm test` — PASS; 190 tests passed.
3. `jq -r '.required[]' tools/validators/src/schemas/story-storylet.schema.json` — PASS; returned `id`, `story_id`, `scope`, `title`, `move_family`, `preconditions`, `beats`, `exit_options`, `saliency`, `mystery_policy`, `provenance`.
4. `jq '.properties | keys | length' tools/validators/src/schemas/story-storylet.schema.json` — PASS; returned `14`.
5. `jq '.properties.move_family.enum | length' tools/validators/src/schemas/story-storylet.schema.json` — PASS; returned `16`.
6. `jq '.properties.exit_options.items.properties.action_family.enum | length' tools/validators/src/schemas/story-storylet.schema.json` — PASS; returned `20`.
7. `jq '.properties.beats.items.properties.function.enum | length' tools/validators/src/schemas/story-storylet.schema.json` — PASS; returned `6`.
8. `jq '.properties.mystery_policy.properties.allowed_authority.enum | length' tools/validators/src/schemas/story-storylet.schema.json` — PASS; returned `4`.
9. `jq '.properties.scope.properties.visibility.enum | length' tools/validators/src/schemas/story-storylet.schema.json` — PASS; returned `3`.
10. `jq '.properties.provenance.properties.origin.enum | length' tools/validators/src/schemas/story-storylet.schema.json` — PASS; returned `5`.
11. `grep -cE '(arc_contract|dramatic_unit|execution_envelope|stop_policy|effect_model|exit_portfolio|record_version|aftermath_weight|tension_delta|mystery_safety|content_intensity|hard_preconds|soft_preconds)' tools/validators/src/schemas/story-storylet.schema.json` — PASS; returned `0`.

## Deviations

1. The schema does not retain `choice_templates: false`; top-level `additionalProperties: false` rejects `choice_templates` and every other retired field uniformly.
2. Legacy rule-validator fixtures and tests that intentionally exercise `arc_schema_compliance`, `effect_model_legality`, `effect_model_replay_safety`, and `stop_policy_parsability` remain in place for `SPEC23STOSTACON-008`. This ticket updates only the schema-compliance and pre-apply schema fixture boundary.
3. `docs/MACHINE-FACING-LAYER.md` still has a `list_records` example with old storylet filter fields. That is a world-mcp/public retrieval docs surface and remains outside this validators-schema ticket.
