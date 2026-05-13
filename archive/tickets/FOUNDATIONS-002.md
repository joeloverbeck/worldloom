# FOUNDATIONS-002: Canonicalize per-class ID padding format in Canonical Storage Layer

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `docs/FOUNDATIONS.md`, `CLAUDE.md`, validator schemas, world-index record specs, world-mcp allocation/retrieval surfaces, and patch-engine op/allocation validation now use the FOUNDATIONS-002 unpadded natural-integer ID convention.
**Deps**: `archive/tickets/FOUNDATIONS-001.md`, `archive/tickets/MCPENH-029-emit-warning-on-world-index-skip-of-schema-failed-records.md`

## Problem

At intake, the storage contract was ambiguous about whether per-class record IDs were zero-padded or natural integers. Some prose examples and schema patterns implied fixed-width forms such as `CF-0001`, `M-0001`, and `SEC-GEO-001`, while live world data used unpadded filenames and IDs such as `M-1.yaml` with `id: M-1`.

The branching-story-bootstrap session of 2026-05-13 exposed the defect through red-bunny mystery references: story records could satisfy padded schema patterns while failing to resolve against the existing unpadded mystery-reserve records. The underlying issue was a cross-artifact contract gap: FOUNDATIONS did not pin a single canonical ID format, and schemas, allocator logic, indexing, and patch validation had diverged.

This ticket made the canonical decision and propagated it through the machine-facing engine surfaces. Existing world content was not migrated; the selected convention preserves the existing unpadded live data shape.

## Assumption Reassessment (2026-05-13)

1. `docs/FOUNDATIONS.md` and `CLAUDE.md` used placeholder forms such as `CF-NNNN`, `M-NNNN`, and `SEC-GEO-NNN` without explicitly deciding whether the suffix was fixed-width or a natural integer. Those placeholders are now replaced with `<integer>` notation where they describe the active contract.
2. Live code showed broader mixed padding than the initial M-only symptom. `M` was already unpadded in the allocator, while many other world, hybrid, pipeline, section, and story-bundle classes still emitted or validated fixed-width IDs. The landed boundary therefore covers every per-world atomic-source class, hybrid class, pipeline class, and story-bundle class.
3. The canonical decision is: record IDs use an unpadded natural-integer suffix. Filenames match the `id` field exactly, except hybrid/story artifacts that append a slug/date suffix after the numeric ID. Engine regexes use `^<CLASS>-[0-9]+$`, with prefix-specific variants such as `SEC-GEO-[0-9]+` and `CAU-[0-9]+`.
4. No backwards-compatibility aliasing was added. The relaxed regex shape technically accepts padded legacy strings because `[0-9]+` matches them, but allocators and documentation now mint only unpadded IDs.
5. The already-committed red-bunny data repair remains out of scope. This ticket fixes the forward contract and validation/allocation surfaces; world-content mutation must route through the appropriate canon/story workflows.
6. HARD-GATE discipline was reviewed because the changed schemas and allocation checks are used by gated canon/story patch flows. The change strengthens the gate by aligning accepted IDs with retrievable records.

## Architecture Check

The unpadded natural-integer convention is the least disruptive durable contract: it matches existing world data, keeps filenames human-readable, avoids whole-world migration, and removes the silent failure mode where schema-valid references point to non-existent padded IDs.

Forcing fixed-width padding would require renaming and retargeting every affected world record and cross-reference. That disruption is not justified when existing data already follows the unpadded shape.

## Landed Changes

1. `docs/FOUNDATIONS.md` now contains a `Per-class ID format conventions (FOUNDATIONS-002)` paragraph under the Canonical Storage Layer, codifying unpadded natural-integer IDs and exact filename/id matching.
2. `CLAUDE.md`, `docs/WORKFLOWS.md`, `docs/MACHINE-FACING-LAYER.md`, and `tools/world-mcp/README.md` now document `<integer>` ID notation and unpadded allocator behavior.
3. Validator JSON schemas now use `[0-9]+` ID patterns for affected atomic, hybrid, adjudication, and story-bundle record classes.
4. `tools/world-index/src/parse/atomic.ts` now recognizes unpadded IDs for atomic-source and story-bundle records, and its skip-warning tests expect the relaxed pattern.
5. `tools/world-mcp` allocation formats now emit unpadded IDs for all supported classes, including story-scoped, sub-audit-scoped, pipeline-scoped, and suffix-bearing hybrid artifacts. MCP input schemas and retrieval helpers no longer pin fixed-width CF/hybrid/story IDs.
6. `tools/patch-engine` op validators, temp-file metadata routing, allocation-race checks, and same-plan story/atomic record handling now accept and validate the unpadded contract.
7. Focused and broad tests were updated to assert unpadded allocation output and race diagnostics.

## Files Touched

- `docs/FOUNDATIONS.md`
- `CLAUDE.md`
- `docs/WORKFLOWS.md`
- `docs/MACHINE-FACING-LAYER.md`
- `tools/world-mcp/README.md`
- `tools/validators/src/schemas/**/*.json`
- `tools/world-index/src/parse/atomic.ts`
- `tools/world-index/tests/atomic-source-input.test.ts`
- `tools/world-index/tests/commands.test.ts`
- `tools/world-mcp/src/**/*.ts`
- `tools/world-mcp/tests/**/*.test.ts` for allocator/schema/validate-plan coverage
- `tools/patch-engine/src/**/*.ts` for op validation, routing, and allocation checks
- `tools/patch-engine/tests/**/*.test.ts` for allocation/apply coverage
- `tools/validators/tests/integration/spec14-engine-roundtrip.test.ts`

## Out of Scope

- Migration of existing world records; the selected convention preserves their current unpadded filenames and IDs.
- Repairing already-committed red-bunny story-bundle data. Live `erotica-world` validation still reports missing BEL references unrelated to this ID-format contract.
- Updating story-pipeline skill prose that merely documents old example IDs; that should route through a follow-up skill-audit pass.

## Acceptance Criteria

1. FOUNDATIONS and CLAUDE codify unpadded natural-integer IDs.
2. Validator schemas, world-index parsing, world-mcp allocation/retrieval surfaces, and patch-engine validation use the same unpadded contract.
3. Allocator tests prove every supported ID class emits the canonical form.
4. Patch-engine pre-apply checks and operation validators accept unpadded IDs and report race diagnostics in the canonical form.
5. Existing live world data is preserved; `animalia` validates clean. `erotica-world` is classified in Deviations because its current red-bunny BEL-reference failures are world-content debt outside this ticket.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` verifies canonical unpadded allocation formats for all supported classes.
2. `tools/world-mcp/tests/server/dispatch.test.ts`, `tools/world-mcp/tests/tools/validate-patch-plan.test.ts`, and `tools/world-mcp/tests/cli/validate-patch-plan.test.ts` cover unpadded allocation and race diagnostics through MCP/server-facing seams.
3. `tools/patch-engine/tests/pre-apply-checks/id-allocation-race.test.ts` and integration/receipt tests cover unpadded apply-time allocation validation.
4. `tools/world-index/tests/atomic-source-input.test.ts` and `tools/world-index/tests/commands.test.ts` cover relaxed story-record skip diagnostics.
5. `tools/validators/tests/integration/spec14-engine-roundtrip.test.ts` covers engine-emitted unpadded OQ/PA records through validator schema compliance.

### Commands Run

1. `cd tools/patch-engine && npm test`
2. `cd tools/world-mcp && npm test`
3. `cd tools/validators && npm test`
4. `cd tools/world-index && npm test`
5. `node tools/validators/dist/src/cli/world-validate.js animalia`
6. `node tools/validators/dist/src/cli/world-validate.js erotica-world`

## Outcome

FOUNDATIONS-002 is implemented. The repo now has a single documented and executable ID-format contract: unpadded natural-integer suffixes across world, hybrid, pipeline, and story-bundle record classes.

## Verification Result

- `cd tools/patch-engine && npm test` passed: 70 tests.
- `cd tools/world-mcp && npm test` passed: 354 tests.
- `cd tools/validators && npm test` passed: 182 tests.
- `cd tools/world-index && npm test` passed: 78 tests.
- `node tools/validators/dist/src/cli/world-validate.js animalia` passed with 0 verdicts.
- `node tools/validators/dist/src/cli/world-validate.js erotica-world` failed with two pre-existing red-bunny predicate reference failures: missing `BEL-1` from `SLT-8` and missing `BEL-3` from `SLT-9`.
- Contract sweep passed: no fixed-width `\d{4}`, `\d{3}`, `[0-9]{4}`, or `[0-9]{3}` ID regex anchors remain in the owned docs/source/schema surfaces after final world-mcp cleanup.
- Post-review quick-reference sweep repaired `docs/WORKFLOWS.md` stale `*-NNNN` examples to the FOUNDATIONS-002 `<integer>` convention.

## Deviations

- The drafted `world-validate worlds/erotica-world` clean-run acceptance was not retained as a blocker. The live command currently fails on red-bunny missing BEL references, which are world-content/story-bundle repair work outside this ticket's schema/allocation contract boundary.
- Direct `mcp__worldloom__get_record` invocation was unavailable in this Codex session. The retrieval-surface substitute is the built `tools/world-mcp` test suite plus source sweep over the MCP get-record and context-packet ID validation paths.
- The ticket widened from an initial M-only schema mismatch to all record ID classes after live reassessment showed mixed fixed-width assumptions across allocator, patch-engine, world-index, validator schemas, and MCP helper surfaces.
- Post-review found and corrected stale quick-reference ID examples in `docs/WORKFLOWS.md`; this was same-seam documentation fallout, not a change to the engine implementation.
