# VALENH-053: Align the discoverable STCHAR schema's `source_operational_fact_map.target_section` to the runtime operational-section enum

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/story-character-authority.schema.json` (the schema surfaced by `mcp__worldloom__describe_envelope_schema` / `get_record_schema` and enforced by `record_schema_compliance`); plus a new validators-package schema-fixtures test. No change to `tools/world-mcp/` code or to the structural validators' logic.
**Deps**: none

## Problem

At intake, during the `branching-story-bootstrap` session that created the `red-bunny` bundle, I drafted an STCHAR frontmatter `source_operational_fact_map` entry for the `cannot_be_swapped_out_because` dramatic_core field with `disposition: transformed, target_section: "Validation / Audit Anchors"`. That value was fully conformant to the then-current STCHAR schema surfaced by `mcp__worldloom__describe_envelope_schema(append_story_character_authority_record)` — which typed `source_operational_fact_map.items.target_section` as `{ "type": "string", "minLength": 1 }` with no enum — yet `validate-patch-plan` rejected the envelope with `stchar_source_fact_coverage.invalid_target_section` (×3, one per STCHAR), because the runtime structural validator enforces membership in the closed 11-value `OPERATIONAL_TARGET_SECTIONS` for retained dispositions (`copied | transformed | compressed`).

This was a schema-discovery / runtime divergence: an author who built an STCHAR record from the machine-discoverable contract (the schema returned by `describe_envelope_schema` / `get_record_schema`) could emit a `target_section` the schema accepted but the runtime rejected. It was the inverse-prong of category 3 (Validator coverage gap) and the same shape as the `VALENH-024` precedent (`any_belief.holder_role` typed loosely in `predicate-dsl-grammar.schema.json` while the runtime `requireOptionalRole` enforced the bare role enum). The sibling docs ticket `STCHARDOC-001` (COMPLETED) documented the closed-set rule in the *skill prose* but explicitly placed "Any change to the STCHAR frontmatter JSON schema" Out of Scope, leaving the machine-discoverable contract divergent until this ticket tightened it.

## Assumption Reassessment (2026-05-29)

1. **Codebase check (Phase 5 verification + Rule 6 retcon justification).** At intake, `tools/validators/src/schemas/story-character-authority.schema.json` typed `source_operational_fact_map.items.target_section` as `{ "type": "string", "minLength": 1 }` (no enum); `tools/validators/src/structural/stchar-source-fact-coverage.ts` gates on `RETAINED_DISPOSITIONS = {copied, transformed, compressed}` and fails any retained entry whose `target_section` is not in `OPERATIONAL_TARGET_SECTIONS` (`tools/validators/src/structural/_stchar-operational-sections.ts`, 11 names, excludes `Source Distillation` and `Validation / Audit Anchors`). **Retcon attribution (Rule 6):** existing behavior — the schema accepted any non-empty `target_section`, so `describe_envelope_schema` advertised a looser contract than the runtime enforced; landed behavior — the schema constrains `target_section` to the operational enum when the disposition is retained; warrant — the bootstrap session's `invalid_target_section` rejection of a schema-valid value was the observed divergence. The fix tightens (rejects strictly more), so it invalidates no currently-committed STCHAR (red-bunny's three STCHARs already use operational `target_section` values post-repair).
2. **Doc / discoverable-surface check.** `tools/world-mcp/src/tools/describe-envelope-schema.ts` and `tools/world-mcp/src/tools/get-record-schema.ts` surface `story-character-authority.schema.json` verbatim as the discoverable contract; neither adds the operational-section constraint, so the divergence is exactly what an author reading the discoverable schema sees. `archive/tickets/STCHARDOC-001.md` (COMPLETED) fixed the *skill-prose* side (the closed-set rule + `cannot_be_swapped_out_because` routing now appear in `.claude/skills/story-character-profile/SKILL.md` and the bootstrap phase-1-2 reference) but its §Out of Scope reads "Any change to the STCHAR frontmatter JSON schema," leaving this machine-contract residual unaddressed.
3. **Shared boundary under audit.** `tools/validators/src/schemas/story-character-authority.schema.json` is consumed by three surfaces: (a) `record_schema_compliance` at the patch-engine pre-apply gate (via `tools/validators/src/structural/utils.ts`); (b) `describe_envelope_schema` / `get_record_schema` (`tools/world-mcp/src/tools/`) as the machine-discoverable contract; (c) alongside the separate cross-field runtime check in `stchar-source-fact-coverage.ts`. The fix is single-site in the schema file; consumers (a) and (b) inherit it with no edit of their own.
4. **FOUNDATIONS principle under audit.** FOUNDATIONS §Tooling Recommendation states the machine-facing guarantees "only hold when the underlying authoring surfaces are explicit and truthful," and §Machine-Facing Layer names the retrieval MCP server (which serves `describe_envelope_schema`) as the typed contract surface. A discoverable schema that advertises acceptance of values the runtime rejects violates the truthful-contract principle. This ticket restates that principle as its motivation; it introduces no new rule and amends no FOUNDATIONS clause.
5. **Pre-apply record-write-gating surface (Canon Safety confirmation).** `story-character-authority.schema.json` is enforced by `record_schema_compliance` at the patch-engine pre-apply gate, so this change alters that gate's accept/reject behavior: a retained-disposition entry with a non-operational `target_section`, previously schema-accepted (then caught downstream by `stchar_source_fact_coverage`), becomes schema-rejected at the same point the structural validator already rejects it. The change is a strict tightening aligned to the already-enforced runtime; it adds an earlier redundant rejection and removes no check. It does not touch any Mystery Reserve firewall surface, forbidden-`M` resolution path, or HARD-GATE ordering, and cannot weaken any Canon Safety Check — it only narrows an over-permissive schema toward the runtime it sits beside.
6. **Existing output schema extension (consumers + additive-vs-breaking).** The modified artifact is an existing output schema (`story-character-authority.schema.json`, the STCHAR hybrid-record schema, a character-dossier analogue). Consumers: `record_schema_compliance` (pre-apply), `describe_envelope_schema`, and `get_record_schema`. The change is *breaking* for the schema's accepted-value set in the narrow sense that a previously schema-valid non-operational `target_section` becomes schema-invalid for retained dispositions — but it is breaking only for inputs the runtime already rejects, so no currently-valid pipeline flow and no committed record is invalidated. To prevent the new schema enum from drifting from `OPERATIONAL_TARGET_SECTIONS` (the same single-source-of-truth concern that motivated this ticket), the change ships with a parity test asserting set equality between the schema enum and the TS constant.
7. **Package and public-surface boundary.** `tools/validators/README.md` and fixture READMEs do not document the STCHAR `target_section` enum, so no validators-package prose changed. `tools/world-mcp/src/tools/describe-envelope-schema.ts` has a separate `repair_story_character_authority_body_integrity` operation payload helper with its own loose `target_section`; that repair-operation schema is not the append/supersede STCHAR record schema owned here and remains outside this ticket's file set.

## Architecture Check

1. Encoding the operational-section enum in the schema via an `allOf`/`if`/`then` conditional on `source_operational_fact_map.items` (retained disposition → `target_section` required and constrained to the 11 operational sections) is cleaner than the alternatives: leaving the schema loose perpetuates the discoverable-vs-runtime divergence indefinitely; deleting the structural validator's check and relying on the schema alone would lose the disposition-conditional cross-field semantics and the actionable `invalid_target_section` suggested-fix message, and would not help the body-inventory `operational_home` surface (a markdown cell with no JSON-schema counterpart). Aligning the schema to the runtime closes the divergence at the discoverable surface while the structural validator remains the authoritative cross-field check. The schema already uses `allOf`/`if`/`then` for its `source_kind` conditionals, so the conditional form is idiomatic to this file.
2. No backwards-compatibility shims: the change is a direct schema tightening aligned to the already-enforced runtime — no alias path, no dual-accept transition window, no deprecated-but-tolerated value set.

## Verification Layers

1. Discoverable schema rejects a retained-disposition non-operational `target_section` → schema validation (Ajv fixture: `{disposition: transformed, target_section: "Validation / Audit Anchors"}` fails to compile-validate).
2. Discoverable schema accepts a retained-disposition operational `target_section` and an omitted-disposition entry without `target_section` → schema validation (Ajv fixtures: `{disposition: transformed, target_section: "Stable Persona Core"}` passes; `{disposition: story_irrelevant, rationale: "non_operational_trivia"}` passes).
3. Schema enum set equals the runtime source of truth → codebase grep-proof + parity test (test imports `OPERATIONAL_TARGET_SECTIONS` from `_stchar-operational-sections.ts` and asserts set-equality with the schema's `target_section` enum).
4. Runtime structural validator behavior unchanged → codebase grep-proof (no edit to `stchar-source-fact-coverage.ts`; its existing `stchar-source-fact-coverage.test.ts` still passes).
5. Truthful machine contract restored → FOUNDATIONS alignment check (§Tooling Recommendation: discoverable schema and enforced runtime now agree on the retained-disposition `target_section` value set).

## Landed Changes

### 1. Constrain `target_section` in the schema

In `tools/validators/src/schemas/story-character-authority.schema.json`, added an `allOf`/`if`/`then` to `source_operational_fact_map.items`: when `disposition` is one of `copied | transformed | compressed`, the schema now requires `target_section` and constrains it to `enum` = the 11 `OPERATIONAL_TARGET_SECTIONS` names (`Story-Facing Identity`, `Stable Persona Core`, `Emotional Appraisal Map`, `Pressure Behavior`, `Voice Bible / Dialogue Authority`, `Page-Plan Voice Block`, `Perception and Embodiment`, `Agency and Planning Tendencies`, `Relationship-Specific Behavior`, `Story-State Derivation Guide`, `Prose Rendering Constraints`). `target_section` remains unconstrained/not required for the omitted dispositions (`omitted_with_rationale | story_irrelevant`), matching the runtime's `RETAINED_DISPOSITIONS`-gated check.

### 2. Add a schema-fixtures + parity test

Added `tools/validators/tests/schemas/story-character-authority-schema-fixtures.test.ts` following the established `tools/validators/tests/schemas/*-schema-fixtures.test.ts` Ajv2020 pattern: accept/reject fixtures per Verification Layers 1-2, plus a parity assertion that the schema's `target_section` enum (as a set) equals `OPERATIONAL_TARGET_SECTIONS` imported from `tools/validators/src/structural/_stchar-operational-sections.ts`.

## Files to Touch

- `tools/validators/src/schemas/story-character-authority.schema.json` (modify)
- `tools/validators/tests/schemas/story-character-authority-schema-fixtures.test.ts` (new)

## Out of Scope

- The body Stable Source Material Inventory `operational_home` cell (enforced by `stchar_source_material_inventory_integrity`) — it is a markdown table cell with no JSON-schema counterpart; the author-facing side was landed by `archive/tickets/STCHARDOC-001.md`, and there is no discoverable schema to align for it.
- Changing `OPERATIONAL_TARGET_SECTIONS` membership or any structural-validator logic in `stchar-source-fact-coverage.ts` / `stchar-source-material-inventory-integrity.ts`.
- Skill-prose guidance (already landed by `STCHARDOC-001`).
- The compound-`operational_home` split-and-accept enhancement (`STCHARDOC-001` Assumption Reassessment item 5, resolution B).

## Acceptance Criteria

### Tests That Must Pass

1. Ajv validation of `story-character-authority.schema.json` REJECTS a record carrying `source_operational_fact_map: [{source_field: "cannot_be_swapped_out_because", disposition: "transformed", target_section: "Validation / Audit Anchors"}]`.
2. Ajv validation ACCEPTS `{..., disposition: "transformed", target_section: "Stable Persona Core"}` and ACCEPTS `{..., disposition: "story_irrelevant", rationale: "non_operational_trivia"}` (no `target_section`).
3. The parity test asserts the schema's `target_section` enum set equals `OPERATIONAL_TARGET_SECTIONS`.
4. `cd tools/validators && npm test` passes with no regression in `stchar-source-fact-coverage.test.ts` or the `record_schema_compliance` coverage.

### Invariants

1. The discoverable STCHAR schema's accepted `target_section` value set for retained dispositions equals the runtime structural validator's accepted set.
2. The schema `target_section` enum never diverges from `OPERATIONAL_TARGET_SECTIONS` (the parity test fails on drift).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/schemas/story-character-authority-schema-fixtures.test.ts` (new) — Ajv accept/reject fixtures for `target_section` keyed by `disposition`, plus the schema-enum-vs-`OPERATIONAL_TARGET_SECTIONS` parity assertion.

### Commands

1. `cd tools/validators && npm test` — full validators suite (build + `node --test dist/tests/**/*.test.js`); confirms the new fixtures pass and no existing stchar/schema-compliance test regresses.
2. `cd tools/validators && npm run build && node --test dist/tests/schemas/story-character-authority-schema-fixtures.test.js` — targeted run of the new fixtures test.
3. Package-local invocation is the correct boundary: the repo has no root `package.json` (`--workspace` / `--prefix` shapes do not resolve from the repo root, per the `MCPENH-063` proof-command correction), so commands run from within `tools/validators/`.

## Outcome

Completed 2026-05-29. The STCHAR JSON Schema now rejects retained-disposition `source_operational_fact_map[].target_section` values outside the 11 runtime operational sections, while still accepting omitted/story-irrelevant entries without `target_section`. A new validators-package schema fixture test proves the rejection, the accepted operational target, the omitted-disposition no-target case, and schema enum parity with `OPERATIONAL_TARGET_SECTIONS`.

## Verification Result

1. Pre-edit baseline: `cd tools/validators && npm test` — PASS (`1062` tests passed after build in the clean baseline).
2. `cd tools/validators && npm run build` — PASS; compiled the schema and new TS test with Ajv strict settings.
3. `cd tools/validators && node --test dist/tests/schemas/story-character-authority-schema-fixtures.test.js` — PASS (`4` tests): non-operational retained target rejected, operational retained target accepted, omitted/story-irrelevant no-target entry accepted, schema enum equals `OPERATIONAL_TARGET_SECTIONS`.
4. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance-story-character-authority.test.js dist/tests/structural/stchar-source-fact-coverage.test.js` — PASS (`23` tests); existing schema-compliance and runtime source-fact coverage behavior remain green.
5. Final broad proof: `cd tools/validators && npm test` — PASS (`1062` tests passed after build).
6. Package public-surface inspection: `tools/validators/README.md` and validators fixture READMEs contain no STCHAR `target_section` contract text requiring an update.

## Deviations

- `tools/world-mcp/src/tools/describe-envelope-schema.ts` contains a separate loose `target_section` schema for `repair_story_character_authority_body_integrity`. This ticket only owns the STCHAR record schema consumed by append/supersede record envelopes, `get_record_schema`, and `record_schema_compliance`; the repair-operation payload helper remains outside scope.
- `tools/validators/dist/` was refreshed by build/test commands and remains an ignored generated artifact; it is not a tracked file to review.
