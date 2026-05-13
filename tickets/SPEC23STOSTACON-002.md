# SPEC23STOSTACON-002: Rebuild SLT schema to contract §4.4 minimalist shape

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/validators/src/schemas/story-storylet.schema.json`
**Deps**: archive/tickets/SPEC23STOSTACON-001.md

## Problem

`tools/validators/src/schemas/story-storylet.schema.json` is a pre-rebuild artifact that encodes the OLD storylet-pool-authoring pipeline shape: `record_version: 2`, `shape: "scene_commitment_arc"`, plus required fields `content_intensity`, `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, `opens_obligations`, `pays_off_obligations`, `complicates_obligations`, `transfers_obligations`, `fact_effects`, `relationship_effects`, `tone_tags`, `theme_tags`, `tension_delta`, `aftermath_weight`, `mystery_safety`, `arc_contract`, `dramatic_unit`, `beat_plan`, `execution_envelope`, `stop_policy`, `effect_model`, `exit_portfolio`. The shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` §4.4 line 201 explicitly forbids `arc_contract`, `dramatic_unit`, `execution_envelope`, `effect_model`, `stop_policy` ("these are arc / plot-rail framings that commitment blocks deliberately reject") and reshapes the SLT into ~18 sub-paths with closed enums. The schema must be rebuilt wholesale against the post-SPEC23STOSTACON-001 contract; piecemeal property-edit attempted in the original spec wording (rename `purpose` → `move_family`) cannot apply because the current schema has no `purpose` field — the field structure is fundamentally different. Per FOUNDATIONS §Story Bundles §5b "the contract is the authoritative source"; the schema must align.

## Assumption Reassessment (2026-05-13)

1. Schema state verified: `tools/validators/src/schemas/story-storylet.schema.json` confirmed at lines 1-337; required fields list at lines 5-36; `record_version: const 2` at line 41; `shape: const "scene_commitment_arc"` at line 42; legacy block schemas at lines 77-270 (arc_contract, dramatic_unit, beat_plan, execution_envelope, stop_policy, effect_model, exit_portfolio).
2. Contract authority: `.claude/skills/_shared-templates/story-state-contract.md` §4.4 lines 164-203 specifies the post-rebuild SLT shape; line 201 enumerates explicitly forbidden fields. Post-SPEC23STOSTACON-001 the contract adds `move_family` (16 vals), `action_family` (20 vals), beats.function +action, `mystery_policy.allowed_authority` 4-val incl. `none`, `scope.visibility` 3-val, `provenance.origin` reconciled + `manual_authoring`.
3. Cross-artifact boundary under audit: SLT schema is consumed by `tools/validators/src/structural/utils.ts:93` (`storylet_record: "story-storylet"` mapping) and by every validator under `tools/validators/src/rules/` that runs against SLT records (notably the old-pipeline validators retired in SPEC23STOSTACON-008). The schema is also referenced by `tools/validators/tests/structural/` tests for SLT records (if any) — confirm test-side handling in implementation. Boundary preservation: the schema's `$id` (`https://worldloom.local/schemas/story-storylet.schema.json`) stays unchanged so callers' `$ref`s continue to resolve.
4. FOUNDATIONS principle motivating this ticket: Rule 1 (No Floating Facts). Every field in the SLT schema must trace to a load-bearing consumer per FOUNDATIONS §Story Bundles §5b. The rebuilt schema removes legacy fields whose consumers no longer exist (old arc_contract/effect_model/stop_policy/exit_portfolio validators are retired in SPEC23STOSTACON-008) and aligns the remaining fields to the post-amendment contract.
5. Schema extension classification: this is a **breaking schema change** — every old SLT field is dropped or restructured. No additive shim; no aliasing. The breaking-change risk is zero because no production SLT records exist (spec §Risks §138 + empty `worlds/erotica-world/stories/` directory verified at SPEC23STOSTACON-001 time).
6. Blast radius of removed fields (grep pipeline-wide): `arc_contract` referenced in `tools/validators/src/rules/arc_schema_compliance.ts` (retired in -008); `effect_model` in `effect_model_legality.ts` + `effect_model_replay_safety.ts` (retired); `stop_policy` in `stop_policy_parsability.ts` (retired); `exit_portfolio` only in this schema (no other consumer); `aftermath_weight` / `tension_delta` / `mystery_safety` / `content_intensity` / `hard_preconds` / `soft_preconds` / `cast_requirements` / `location_requirements` / `opens_obligations` / `pays_off_obligations` / `complicates_obligations` / `transfers_obligations` / `fact_effects` / `relationship_effects` / `tone_tags` / `theme_tags` — verify each at implementation against `tools/` + `.claude/skills/` + tests; remove dead references or split into a follow-up ticket per occurrence.
7. Adjacent contradictions classification: (a) SLT-schema test fixtures under `tools/validators/tests/` that construct SLT records with old shape → required consequence of this ticket; update inline. (b) `choice_templates: false` at line 76 — consistent with the contract's no-choice-templates posture; preserve the `false` constraint in the rebuilt schema. (c) The old `record_version: 2` constant — drop entirely; the contract line 201 says "greenfield resets to 1; no v2 / v3 history" — the rebuilt schema does not encode a `record_version` field at all (matches the contract's actual minimalist field list at lines 167-198, which has no `record_version`).

## Architecture Check

1. Wholesale rebuild is cleaner than piecemeal property edits: the schema's structural mismatch (inverted block hierarchies — schema has `visibility.scope`, contract has `scope.visibility`; schema's `execution_envelope.mystery_preservation.allowed_claims` vs contract's `mystery_policy.allowed_authority`) means find-and-replace cannot bridge the gap. Replacing the entire `"properties"` block produces a clean diff and a clean schema.
2. No backwards-compatibility aliasing: contract §4.4 line 201 explicitly forbids the old fields. Carrying aliases would re-introduce arc-positional / plot-rail framings the contract rejects. Spec §Risks §138 + verified empty `worlds/erotica-world/stories/` directory means no compatibility cost.

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

## What to Change

### 1. Replace `tools/validators/src/schemas/story-storylet.schema.json` wholesale

New schema body (top-level structure follows contract §4.4):

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

The current schema's `$defs.stopCondition` and `$defs.effect` definitions support `stop_policy.normal_exits` / `effect_model.required_effects`. Both blocks are removed in the rebuilt schema; the `$defs` block can be dropped entirely (or retained empty if validator pipeline expects its presence — confirm in implementation).

### 3. Update / remove SLT-record test fixtures

Search `tools/validators/tests/` for SLT test fixtures or builders constructing storylet records with the old shape. Update each to the new shape (move_family / action_family / nested preconditions / new mystery_policy path / etc.) or remove if dead. Tests touching `arc_contract` / `effect_model` / `stop_policy` / `exit_portfolio` likely belong with the validators retired in SPEC23STOSTACON-008 (cross-reference at implementation time).

## Files to Touch

- `tools/validators/src/schemas/story-storylet.schema.json` (modify — wholesale rewrite of `"properties"` and `"required"` blocks)
- `tools/validators/tests/structural/` SLT-related test fixtures (modify — update to new shape) — exact files identified at implementation
- `tools/validators/tests/integration/` SLT-related test fixtures (modify if any) — exact files identified at implementation

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
3. `jq '.properties | keys | length' tools/validators/src/schemas/story-storylet.schema.json` returns the number of top-level properties matching contract §4.4 (approximately 12, depending on optional-property choices).
4. Forbidden-fields grep returns zero: `grep -E "(arc_contract|dramatic_unit|execution_envelope|stop_policy|effect_model|exit_portfolio|record_version|aftermath_weight|tension_delta|mystery_safety|content_intensity|hard_preconds|soft_preconds)" tools/validators/src/schemas/story-storylet.schema.json` returns no matches.
5. Required enums sized correctly: `move_family` returns 16, `action_family` (on `exit_options.items.properties.action_family`) returns 20, `beats.items.properties.function` returns 6, `mystery_policy.properties.allowed_authority` returns 4, `scope.properties.visibility` returns 3, `provenance.properties.origin` returns 5.

### Invariants

1. Schema strictly enforces the contract §4.4 SLT shape (`additionalProperties: false`); re-introducing a dropped legacy field via a new SLT record produces a schema-validation FAIL.
2. Schema's `$id` (`https://worldloom.local/schemas/story-storylet.schema.json`) is preserved; downstream `$ref` resolvers continue to find the schema.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-storylet.test.ts` (or equivalent path discovered at implementation) — rewrite test fixtures to construct contract-§4.4-shaped SLT records; assert PASS on valid records and FAIL on records carrying legacy fields like `arc_contract`.
2. (If no existing storylet-schema test exists) `tools/validators/tests/structural/record-schema-compliance-story-storylet.test.ts` — new file mirroring the pattern in `record-schema-compliance-story-page.test.ts`.

### Commands

1. `cd tools/validators && npm run build && npm test` — full validators build + test pass.
2. `jq '.properties.move_family.enum | length' tools/validators/src/schemas/story-storylet.schema.json` returns 16.
3. `jq '.properties.exit_options.items.properties.action_family.enum | length' tools/validators/src/schemas/story-storylet.schema.json` returns 20.
4. `grep -cE "(arc_contract|effect_model|stop_policy|exit_portfolio|record_version|aftermath_weight|tension_delta|mystery_safety|hard_preconds|soft_preconds)" tools/validators/src/schemas/story-storylet.schema.json` returns 0.
