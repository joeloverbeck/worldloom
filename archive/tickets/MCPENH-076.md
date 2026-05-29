# MCPENH-076: Align STCHAR repair operation schema `target_section` with the runtime operational-section enum

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/describe-envelope-schema.ts` operation-payload schema for `repair_story_character_authority_body_integrity`, plus focused world-mcp schema-discovery tests. No validators-package schema or structural-validator logic change.
**Deps**: `archive/tickets/VALENH-053.md`

## Problem

At intake, post-ticket review of `VALENH-053` confirmed that the STCHAR record JSON Schema aligned retained `source_operational_fact_map[].target_section` with the runtime `OPERATIONAL_TARGET_SECTIONS` enum. The separate world-mcp operation schema for `repair_story_character_authority_body_integrity` still had its own inline `sourceOperationalFactMapEntrySchema()` helper with `target_section: stringSchema()` and no retained-disposition conditional.

That left a narrower schema-discovery/runtime divergence for the body-repair operation: an operator reading `mcp__worldloom__describe_envelope_schema({ op_kind: "repair_story_character_authority_body_integrity" })` could see a loose non-empty string contract for `target_section`, even though `stchar_source_fact_coverage` checks the repair operation in pre-apply and rejects retained entries whose `target_section` is not a real operational STCHAR section.

## Assumption Reassessment (2026-05-29)

1. `archive/tickets/VALENH-053.md` completed the STCHAR record schema fix in `tools/validators/src/schemas/story-character-authority.schema.json` and explicitly left the world-mcp repair-operation payload helper out of scope.
2. At intake, `tools/world-mcp/src/tools/describe-envelope-schema.ts` defined `repair_story_character_authority_body_integrity` with required payload fields `story_slug`, `target_record_id`, `body_markdown`, and `source_operational_fact_map`; that map used `sourceOperationalFactMapEntrySchema()`, whose `target_section` property was only `stringSchema()` with no retained-disposition conditional.
3. At intake, `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` already covered the STCHAR body-repair manifest, but only asserted `source_field` enum presence. The landed test now asserts the retained-disposition `target_section` contract and parity with `story-character-authority.schema.json`.
4. Shared boundary under audit: the machine-discoverable patch-operation schema for `repair_story_character_authority_body_integrity` versus the validators-package runtime structural check `stchar_source_fact_coverage`, which already has a pre-apply test named `stchar_source_fact_coverage checks repair_story_character_authority_body_integrity pre-apply plans`. `OPERATIONAL_TARGET_SECTIONS` is not exported from the validators public package; `archive/tickets/VALENH-053.md` made the STCHAR record JSON Schema the practical schema-side parity witness for that runtime enum.
5. FOUNDATIONS / HARD-GATE principle: `describe_envelope_schema` is part of the machine-facing authoring contract for patch plans, and this operation participates in pre-apply validation. Tightening the discoverable schema to match the already-enforced runtime does not weaken the Mystery Reserve firewall, approval-token flow, write ordering, or any Canon Safety Check; it only moves an already-invalid repair payload from later structural rejection to earlier schema discoverability.
6. This is not unfinished `VALENH-053` work. `VALENH-053` owned the STCHAR record schema consumed by append/supersede record envelopes, `get_record_schema`, and `record_schema_compliance`. This ticket owns the separate world-mcp operation-payload helper.
7. Pre-edit baseline: `cd tools/world-mcp && npm test` passed before source edits (`507` tests passed). The package already had ignored `tools/world-mcp/.secret`, `tools/world-mcp/node_modules/`, and `tools/world-mcp/dist/`; `dist/` was refreshed by package build/test commands and remains an ignored generated artifact.

## Architecture Check

1. Reusing the same retained-disposition conditional shape as the STCHAR record schema is cleaner than leaving the repair operation loose or deleting the structural check. The structural validator keeps the cross-field diagnostic authority; the operation schema becomes truthful for operators assembling repair envelopes from schema discovery.
2. No backwards-compatibility aliases or shims: previously schema-valid non-operational retained targets become schema-invalid only where the runtime already rejects them.

## Verification Layers

1. `repair_story_character_authority_body_integrity` operation schema exposes the retained-disposition `target_section` enum -> schema-discovery test against `describeEnvelopeSchema`.
2. Operation schema enum equals the already-aligned STCHAR record schema enum -> test reads or otherwise inspects `tools/validators/src/schemas/story-character-authority.schema.json` and asserts set equality with the operation-payload enum.
3. Existing repair-operation runtime behavior remains unchanged -> existing validators test `stchar-source-fact-coverage.test.ts` remains green, or a focused world-mcp/validators proof records that no structural-validator source changed.
4. HARD-GATE-facing behavior remains fail-closed -> package build plus focused schema-discovery test proves the discoverable schema tightened rather than weakened.

## Landed Changes

### 1. Tighten the repair operation payload schema

In `tools/world-mcp/src/tools/describe-envelope-schema.ts`, updated `sourceOperationalFactMapEntrySchema()` so retained dispositions (`copied`, `transformed`, `compressed`) require `target_section` and constrain it to the retained-disposition enum from `tools/validators/src/schemas/story-character-authority.schema.json`. Omitted/story-irrelevant entries remain able to omit `target_section` and the operation-payload helper still requires only `source_field` and `disposition` at the map-entry level.

### 2. Extend focused schema-discovery tests

In `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts`, extended the `repair_story_character_authority_body_integrity` assertions to verify:

- retained entries expose a `target_section` enum containing operational sections such as `Stable Persona Core`
- non-operational sections such as `Validation / Audit Anchors` are not accepted by that enum
- the exposed enum set equals the retained-disposition `target_section` enum in `tools/validators/src/schemas/story-character-authority.schema.json`

## Files to Touch

- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify)
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (modify)

## Out of Scope

- Further changes to `tools/validators/src/schemas/story-character-authority.schema.json`; `VALENH-053` already landed that record-schema fix.
- Changing `OPERATIONAL_TARGET_SECTIONS` membership.
- Changing structural-validator logic or verdict messages in `stchar-source-fact-coverage.ts`.
- Skill-prose guidance; `STCHARDOC-001` already documented author-facing STCHAR target-section routing.

## Acceptance Criteria

### Tests That Must Pass

1. `describeEnvelopeSchema({ op_kind: "repair_story_character_authority_body_integrity" })` exposes a retained-disposition `target_section` enum equal to the retained-disposition enum in `tools/validators/src/schemas/story-character-authority.schema.json`.
2. The same schema-discovery test proves `Validation / Audit Anchors` is absent from the retained-disposition target enum.
3. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/describe-envelope-schema.test.js` passes.
4. No validators-package runtime export is required; parity is against the checked-in STCHAR record schema file from `tools/validators/src/schemas/story-character-authority.schema.json`.

### Invariants

1. The repair-operation discoverable schema and runtime `stchar_source_fact_coverage` accepted target set stay aligned for retained dispositions.
2. Omitted/story-irrelevant source facts remain able to omit `target_section`.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` — extend the existing STCHAR body-repair manifest test with retained-target enum and parity assertions.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/describe-envelope-schema.test.js` — focused schema-discovery proof for the repaired operation payload.
2. `cd tools/world-mcp && npm test` — broad package proof after the focused test passes.

## Outcome

Completed 2026-05-29. The `repair_story_character_authority_body_integrity` discoverable operation-payload schema now has the same retained-disposition `target_section` enum as the checked-in STCHAR record schema, requires `target_section` only for retained dispositions, and no longer advertises `Validation / Audit Anchors` as an accepted retained target. The implementation derives the enum from `story-character-authority.schema.json` instead of duplicating the 11 section names in world-mcp source.

## Verification Result

1. Pre-edit baseline: `cd tools/world-mcp && npm test` — PASS (`507` tests passed).
2. Package public-surface inspection: `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/WORKFLOWS.md`, `tools/world-mcp/src/server.ts`, and `tools/world-mcp/src/tools/describe-capabilities.ts` contain no repair-operation `target_section` enum prose requiring an update.
3. `cd tools/world-mcp && npm run build` — PASS.
4. `cd tools/world-mcp && node --test dist/tests/tools/describe-envelope-schema.test.js` — PASS (`9` tests); the focused test now proves the repair-operation retained `target_section` enum includes `Stable Persona Core`, excludes `Validation / Audit Anchors`, and equals the STCHAR record schema enum.
5. `cd tools/world-mcp && npm test` — PASS (`507` tests passed).
6. Runtime structural-validator source stayed unchanged: no edits were made under `tools/validators/src/structural/`; the existing `stchar_source_fact_coverage` pre-apply repair-operation behavior remains covered by the unchanged validators test named `stchar_source_fact_coverage checks repair_story_character_authority_body_integrity pre-apply plans`.

## Deviations

- The operation-payload schema now derives the retained target enum from `tools/validators/src/schemas/story-character-authority.schema.json` rather than hard-coding a separate world-mcp list. This is the same parity boundary the ticket requested and avoids another duplicated enum source.
- `tools/world-mcp/dist/` was refreshed by build/test commands and remains an ignored generated artifact; it is not a tracked file to review. Pre-existing ignored `tools/world-mcp/.secret` and `tools/world-mcp/node_modules/` were left in place.
