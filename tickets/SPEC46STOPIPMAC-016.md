# SPEC46STOPIPMAC-016: Story fact derived-from edge extraction must use SF.derived_from[]

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index` story edge extraction/tests and `docs/MACHINE-FACING-LAYER.md`
**Deps**: archive/tickets/VALENH-026.md

## Problem

The current story fact schema uses `SF.derived_from[]` for both world-canon parent facts and story-local derivation, and `VALENH-026` now validates CF-shaped entries in that array against world canon. The world-index story edge producer still emits `story_fact_derived_from` from the retired scalar `derived_from_cf` field, and the machine-facing docs still describe that retired field. Current story facts using the live schema can therefore pass validation but fail to produce the documented world-canon derivation edge.

## Assumption Reassessment (2026-05-20)

1. `tools/world-index/src/parse/atomic.ts` still reads `derived_from_cf` for `story_fact_record` edge extraction, while `tools/validators/src/structural/cross-file-reference.ts` validates CF-shaped entries from `SF.derived_from[]`.
2. `docs/MACHINE-FACING-LAYER.md` still documents `story_fact_derived_from` as `SF.derived_from_cf` to the originating CF, while `.claude/skills/_shared-templates/story-record-schemas.md` says `derived_from_cf` does not exist and CF mirrors use `derived_from`.
3. Shared boundary: validators, story-record schemas, world-index edge extraction, and MCP graph consumers must agree on the machine-facing representation for a story fact's world-canon parent.
4. FOUNDATIONS Rule 1 and Rule 4 motivate the edge: a story-local mirror can cite its canon provenance without globalizing unrelated story-local derivation.
5. Adjacent contradiction classification: this is separate from `VALENH-026`. The completed validator ticket owns pre-apply referential integrity for CF-shaped `SF.derived_from[]`; this ticket owns the world-index producer/docs surface for the corresponding graph edge.
6. Mismatch + correction: replace `derived_from_cf` reads/fixtures/docs with CF-shaped entries from `derived_from[]`; keep the existing `story_fact_derived_from` edge type unless implementation evidence proves the edge name itself is wrong.

## Architecture Check

1. Reading the existing `derived_from[]` array keeps the schema single-source and avoids reintroducing an alias for a retired field.
2. No backwards-compatibility aliasing or shims should be added for `derived_from_cf`; current fixtures should migrate to the live schema field.

## Verification Layers

1. **Current-field extraction** -> world-index tests prove `SF.derived_from: [CF-...]` emits `story_fact_derived_from`.
2. **Story-local derivation isolation** -> tests prove non-CF entries in `SF.derived_from[]` do not emit `story_fact_derived_from`.
3. **Docs/schema agreement** -> grep/manual review proves current docs and fixtures no longer describe `SF.derived_from_cf` as an active field.

## What to Change

### 1. Update story fact edge extraction

Change `tools/world-index/src/parse/atomic.ts` so `story_fact_record` extraction iterates `derived_from[]` and emits `story_fact_derived_from` only for `CF-<integer>` targets.

### 2. Migrate tests and fixtures

Update the SPEC-46 story-bundle edge integration fixture and shared atomic fixture from `derived_from_cf: CF-...` to `derived_from: [CF-...]`. Add or preserve a negative assertion that story-local entries in `derived_from[]` do not become `story_fact_derived_from` edges.

### 3. Truth machine-facing docs

Update `docs/MACHINE-FACING-LAYER.md` so `story_fact_derived_from` is documented as CF-shaped entries in `SF.derived_from[]`, not `SF.derived_from_cf`.

## Files to Touch

- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` (modify)
- `tools/world-index/tests/helpers/atomic-fixture.ts` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)

## Out of Scope

- Renaming or removing the `story_fact_derived_from` edge type.
- Validator changes already completed by `VALENH-026`.
- Story fact schema changes.
- Emitting story-local derivation edges from non-CF `derived_from[]` entries.

## Acceptance Criteria

### Tests That Must Pass

1. `SF.derived_from: [CF-...]` emits `story_fact_derived_from` in the rebuilt world-index edge table.
2. Non-CF story-local entries in `SF.derived_from[]` do not emit `story_fact_derived_from`.
3. `docs/MACHINE-FACING-LAYER.md` and current world-index tests/fixtures no longer present `derived_from_cf` as the active story fact derivation field.
4. `npm test` from `tools/world-index` passes.
5. `npm run build` from `tools/world-index` passes.

### Invariants

1. The story fact schema has one derivation field: `derived_from[]`.
2. `story_fact_derived_from` remains a world-canon provenance edge and must only target CF-shaped world-canon facts.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` — migrate the positive fixture to `derived_from[]` and assert the emitted edge still exists.
2. `tools/world-index/tests/helpers/atomic-fixture.ts` — migrate shared fixture data to the current story fact field.
3. Add focused negative coverage in the integration test or a nearby parser test for non-CF `derived_from[]` entries.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/integration/spec46-story-bundle-edges-integration.test.js`
3. `cd tools/world-index && npm test`
4. `rg -n "derived_from_cf" tools/world-index/src tools/world-index/tests docs/MACHINE-FACING-LAYER.md`
