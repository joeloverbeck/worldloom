# VALDA-004: Repair red-bunny DA-0001 claim_map cf_id scalar schema failures

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — live `DA-0001` diegetic-artifact hybrid record and, if current engine routes are insufficient, a narrow DA frontmatter maintenance operation
**Deps**: `archive/tickets/VALSTCHAR-002-remove-legacy-stchar-page-packet-frontmatter.md`

## Problem

The focused `red-bunny` structural validation run used to close `VALSTCHAR-002` remains nonzero because live `DA-0001` has schema-invalid `claim_map[].cf_id` entries.

Current evidence from `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`:

- `record_schema_compliance.type` failures report `DA-0001 schema violation at /claim_map/<index>/cf_id: must be string`.
- Paired `record_schema_compliance.if` failures report the same `claim_map` entries do not match the conditional schema.
- The failing file is `diegetic-artifacts/marla-kerns-journal-the-iker-entries.md`.

This ticket owns repairing the live diegetic-artifact claim map shape through an approved engine route so `DA-0001` conforms to the current diegetic-artifact frontmatter schema.

## Assumption Reassessment (2026-05-22)

1. `archive/tickets/VALSTCHAR-002-remove-legacy-stchar-page-packet-frontmatter.md` did not touch DA content; it only exposed this DA schema debt while validating the focused story lane.
2. The current validator schema requires `claim_map[].cf_id` to be a string when present. The live `DA-0001` entries at several indices violate that scalar shape.
3. The shared boundary under audit is diegetic-artifact frontmatter schema compliance for `claim_map[]` and the patch-engine route used to mutate existing DA hybrid files.
4. FOUNDATIONS alignment: diegetic artifacts are canon-reading / in-world artifacts, not world-canon mutation. Repairing frontmatter shape must not silently canonize, retcon, or reinterpret the artifact claims.
5. Hybrid files under `diegetic-artifacts/` are engine-routed by repo discipline. Reassess the current patch-engine operation surface before choosing a repair route; do not direct-edit the file.
6. Red-bunny STCHAR body/hash/source-map failures are separate STCHAR validation debt and are not owned here.

## Architecture Check

1. Repair the malformed DA frontmatter through a supported patch-engine path so schema compliance and index state remain coherent.
2. No backwards-compatibility aliasing/shims introduced; do not loosen the DA schema to accept non-string `claim_map[].cf_id` values unless reassessment proves the schema itself is wrong.

## Verification Layers

1. DA schema shape restored -> focused `record_schema_compliance` proof over `DA-0001`.
2. Engine route respected -> patch receipt or supported operation evidence for the modified diegetic-artifact hybrid file.
3. Canon discipline preserved -> manual review that the repair changes only schema shape/serialization, not artifact claim meaning or world-canon status.

## What to Change

### 1. Inspect the live DA shape and schema

Inspect `DA-0001` through a targeted read and inspect `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json` before drafting the repair. Identify every `claim_map[]` entry whose `cf_id` is not a string.

### 2. Repair DA-0001 through the engine route

Through a supported patch-engine route, repair:

- `worlds/erotica-world/diegetic-artifacts/marla-kerns-journal-the-iker-entries.md`

The repair should preserve the artifact prose and claim meaning while converting malformed `claim_map[].cf_id` values into the schema-valid representation required by the live contract.

### 3. Validate the focused story surface

Rebuild the `erotica-world` index and rerun focused validation. This ticket does not own STCHAR body/hash/source-map failures.

## Files to Touch

- `worlds/erotica-world/diegetic-artifacts/marla-kerns-journal-the-iker-entries.md` (modify through supported engine route)
- `tools/patch-engine/src/` (modify only if current engine routes cannot lawfully perform the DA repair)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` and related tests (modify only if a new operation is required)
- `tools/validators/tests/` (modify only if validator fixture coverage is required)
- `worlds/erotica-world/_index/` (regenerate, ignored derived artifact)

## Out of Scope

- Changing artifact prose or claim meaning.
- Promoting DA claims to world canon.
- Loosening the DA schema to accept malformed `cf_id` values.
- Fixing STCHAR body-integrity or source-map warnings.
- Direct filesystem edits that bypass the supported diegetic-artifact hybrid write route.

## Acceptance Criteria

### Tests That Must Pass

1. Supported engine route validates and applies the DA repair without bypassing hybrid write discipline.
2. `node tools/world-index/dist/src/cli.js build erotica-world`
3. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` may remain nonzero for unrelated STCHAR failures, but it must no longer emit `record_schema_compliance` failures for `DA-0001 claim_map[].cf_id`.

### Invariants

1. `DA-0001 claim_map[].cf_id` values are strings when present.
2. DA claim meaning and canon status are preserved.
3. The repair does not mutate world-level canon.

## Test Plan

### New/Modified Tests

1. `None unless a new engine operation or validator fix is required; live-world repair proof is command-based against existing validators.`

### Commands

1. `node tools/world-index/dist/src/cli.js build erotica-world`
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`
3. Focused grep or validator-output proof showing no remaining `DA-0001 claim_map[].cf_id` schema failures.
