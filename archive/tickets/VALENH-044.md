# VALENH-044: Align remaining story-record provenance schemas with VALENH-043 prefix set

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — validators package JSON schemas and focused structural tests.
**Deps**: `archive/tickets/VALENH-043.md`

## Problem

At intake, `archive/tickets/VALENH-043.md` had corrected five narrow story-record `derived_from` schema patterns to accept the real FOUNDATIONS-002 world-record prefixes (`OQ`, `ENT`, `ONT`, `CAU`, `DIS`, `SOC`, `AES`) and the two-level section form (`SEC-GEO-N`, etc.) while rejecting the dead `INV-N` branch. Post-ticket review found the adjacent story-record provenance surfaces still drifted from that contract:

- `tools/validators/src/schemas/story-status.schema.json` used a broad one-level pattern for `derived_from[]`; it accepted `ONT-1` / `ENT-1` style ids but still rejected the actual two-level section id shape `SEC-GEO-1`.
- `tools/validators/src/schemas/story-plan.schema.json` and `tools/validators/src/schemas/story-emotion.schema.json` used `$defs.recordId` patterns that still included the dead `INV` token and omitted the actual world-prefix classes and two-level `SEC-X-N` form.

Before this ticket, story-record provenance was inconsistent: the same legitimate world-canon parent could be accepted for SF / THR / SREL / CNSQ / story-DA but rejected for STSTAT / STPLAN / STEMO.

## Assumption Reassessment (2026-05-25)

1. At intake, `story-status.schema.json` defined `derived_from.items.pattern` as `^(SE-[0-9]+|[A-Z]+[A-Z0-9]*-[0-9]+)$`, which permitted one-level uppercase prefixes but not `SEC-(GEO|INS|MTS|ECR|PAS|TML|ELF)-N`.
2. At intake, `story-plan.schema.json` and `story-emotion.schema.json` defined `$defs.recordId.pattern` as `^(STENT|STCHAR|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT|STPLAN|STEMO|CF|CH|M|INV|SEC)-[0-9]+$`, preserving the dead `INV` / bare `SEC` branches and omitting `OQ`, `ENT`, `ONT`, `CAU`, `DIS`, `SOC`, and `AES`.
3. Shared boundary under audit: story-record provenance id grammar for `derived_from[]` across validators package story schemas. This ticket owns the three adjacent surfaces intentionally left out of `archive/tickets/VALENH-043.md`.
4. FOUNDATIONS principle under audit: `docs/FOUNDATIONS.md` §Canonical Storage Layer records unpadded per-class ids, expanded invariant category prefixes (`ONT`, `CAU`, `DIS`, `SOC`, `AES`), entity/open-question prefixes (`ENT`, `OQ`), and two-level section ids (`SEC-GEO-N`, etc.). Validator schema provenance patterns should express those real prefixes rather than a generic `INV-N` or bare `SEC-N` form.
5. Adjacent contradiction classification: suffix strictness is separate compatibility work. Existing validators tests intentionally preserve padded legacy cross-reference acceptance, so this ticket should preserve `[0-9]+` suffix grammar unless it explicitly updates the package-wide compatibility tests and owns that broader migration.
6. Schema-specific class sets were preserved. `story-plan` and `story-emotion` include `STCHAR`; the implementation kept it in both the operational and provenance patterns. Live reassessment found `$defs.recordId` is reused by operational fields such as STPLAN `blockers`, `current_step.target_records`, `fallback_steps.target_records`, and STEMO `orientation.toward_records`; provenance widening therefore uses a dedicated derived-from/provenance pattern instead of making those operational fields accept world section ids. `story-status` switched from the broad one-level pattern to the explicit VALENH-043-style enumeration plus the section branch so the contract remains auditable and rejects dead `INV-N`.
7. Pre-edit baseline: `cd tools/validators && npm test` passed, 1025/1025 tests.

## Architecture Check

1. Aligning the three remaining provenance patterns to the explicit VALENH-043 prefix model is cleaner than retaining one broad regex and two stale closed alternations: it makes the schema contract auditable and keeps story-record provenance surfaces in step with actual storage ids without widening operational target-reference fields.
2. No backwards-compatibility aliasing/shims are introduced. This is a schema-pattern correction only; do not add alternate id spellings or runtime normalization for `INV-N` / bare `SEC-N`.

## Verification Layers

1. `STSTAT`, `STPLAN`, and `STEMO` provenance schemas accept actual world-record prefixes and `SEC-X-N` -> focused schema/structural tests.
2. Dead `INV-N` and bare `SEC-N` branches are rejected where these three schemas own provenance ids -> negative schema/structural tests plus grep-proof over the three schema files.
3. Existing accepted story-record and legacy padded cross-reference examples remain valid -> existing contract roundtrip / record-schema compliance coverage, with targeted assertions where needed.

## Landed Changes

### 1. Align `story-status.schema.json`

Updated `derived_from.items.pattern` so STSTAT provenance accepts the same actual world-record prefixes and `SEC-X-N` form as VALENH-043. The previous broad one-level behavior was replaced with explicit enumeration so `INV-N` and bare `SEC-N` are no longer accepted.

### 2. Align STPLAN/STEMO provenance ids

Updated `story-plan.schema.json` and `story-emotion.schema.json` so `derived_from.items` uses an explicit provenance id pattern that removes `INV`, replaces bare `SEC` with the explicit section branch, and adds `OQ`, `ENT`, `ONT`, `CAU`, `DIS`, `SOC`, and `AES`. `$defs.recordId` remains the operational record-reference pattern, with dead `INV` / bare `SEC` branches removed and existing `STCHAR` acceptance preserved.

### 3. Add focused coverage

Extended validators structural/schema tests so the three surfaces accept representative new world prefixes (`ONT-1`, `CAU-2`, `ENT-1`, `OQ-1`, `SEC-GEO-1`) and reject `INV-1` / `SEC-1`. STPLAN/STEMO tests also prove operational target/reference fields still reject `SEC-GEO-1`.

## Files to Touch

- `tools/validators/src/schemas/story-status.schema.json` (modify)
- `tools/validators/src/schemas/story-plan.schema.json` (modify)
- `tools/validators/src/schemas/story-emotion.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-status.test.ts` (modify)
- `tools/validators/tests/schemas/story-plan-schema-fixtures.test.ts` (modify)
- `tools/validators/tests/schemas/story-emotion-schema-fixtures.test.ts` (modify)
- `archive/tickets/VALENH-044.md` (modify)

## Out of Scope

- Reopening the five schemas already fixed by `archive/tickets/VALENH-043.md` except for shared helper/test reuse.
- Retiring padded legacy cross-reference acceptance package-wide.
- Skill-prose changes that encourage authors to cite world invariants/entities in story-record provenance.
- World-content migration to add newly accepted provenance references to existing story records.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance-story-status.test.js dist/tests/schemas/story-plan-schema-fixtures.test.js dist/tests/schemas/story-emotion-schema-fixtures.test.js dist/tests/structural/contract-schema-roundtrip.test.js`
3. `cd tools/validators && npm test`
4. `if rg -n '"INV\\|' tools/validators/src/schemas/story-status.schema.json tools/validators/src/schemas/story-plan.schema.json tools/validators/src/schemas/story-emotion.schema.json; then exit 1; fi` — zero hits unless implementation records a justified remaining non-provenance occurrence.

### Invariants

1. STSTAT / STPLAN / STEMO provenance surfaces accept actual FOUNDATIONS world-record prefixes and the `SEC-X-N` section form.
2. The dead `INV-N` and bare `SEC-N` provenance branches are not preserved as aliases.
3. STPLAN and STEMO continue to accept `STCHAR-N` where currently valid.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-status.test.ts` — added STSTAT provenance acceptance and `INV-1` / `SEC-1` rejection through `record_schema_compliance`.
2. `tools/validators/tests/schemas/story-plan-schema-fixtures.test.ts` — added STPLAN `derived_from` acceptance/rejection coverage and proved operational fields still reject world section ids.
3. `tools/validators/tests/schemas/story-emotion-schema-fixtures.test.ts` — added STEMO `derived_from` acceptance/rejection coverage and proved operational orientation targets still reject world section ids.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance-story-status.test.js dist/tests/schemas/story-plan-schema-fixtures.test.js dist/tests/schemas/story-emotion-schema-fixtures.test.js dist/tests/structural/contract-schema-roundtrip.test.js`
3. `cd tools/validators && npm test`
4. `if rg -n '"INV\\|' tools/validators/src/schemas/story-status.schema.json tools/validators/src/schemas/story-plan.schema.json tools/validators/src/schemas/story-emotion.schema.json; then exit 1; fi`

## Outcome

Implemented. STSTAT, STPLAN, and STEMO provenance now accept the actual world-record provenance prefixes `OQ`, `ENT`, `ONT`, `CAU`, `DIS`, `SOC`, `AES`, plus two-level section ids `SEC-(GEO|INS|MTS|ECR|PAS|TML|ELF)-N`. The dead `INV-N` and bare `SEC-N` branches were removed from the three owned schema surfaces.

STPLAN/STEMO now use a dedicated provenance id definition for `derived_from[]`; their operational `$defs.recordId` remains story/record-reference scoped and does not accept `SEC-GEO-1` as an operational target. `STCHAR-N` remains accepted where it was already valid.

## Verification Result

Pre-edit baseline:

1. `cd tools/validators && npm test` — PASS, 1025/1025 tests before source edits.

Post-edit verification:

1. `cd tools/validators && npm run build` — PASS.
2. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance-story-status.test.js dist/tests/schemas/story-plan-schema-fixtures.test.js dist/tests/schemas/story-emotion-schema-fixtures.test.js dist/tests/structural/contract-schema-roundtrip.test.js` — PASS, 27/27 focused tests.
3. `if rg -n '"INV\\|' tools/validators/src/schemas/story-status.schema.json tools/validators/src/schemas/story-plan.schema.json tools/validators/src/schemas/story-emotion.schema.json; then exit 1; fi` — PASS, no dead `INV` alternation branch remains in the three owned schema files.
4. `cd tools/validators && npm test` — PASS, 1031/1031 tests.
5. Manual package/docs surface review: `tools/validators/README.md`, `docs/WORKFLOWS.md`, and `docs/MACHINE-FACING-LAYER.md` do not document these story provenance regexes, so no public prose update was required.

Generated/ignored artifacts refreshed: `tools/validators/dist/` was regenerated by `npm run build` / `npm test`; pre-existing `tools/validators/node_modules/` remained untouched.

## Deviations

1. Reassessment narrowed the drafted STPLAN/STEMO implementation. The draft proposed updating shared `$defs.recordId` to accept world provenance prefixes, but that definition is also used by operational fields such as STPLAN `target_records` and STEMO `orientation.toward_records`. The landed implementation adds a dedicated provenance id definition for `derived_from[]` and keeps operational references from accepting world section ids.
2. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` was run as a regression proof but not modified; the existing padded legacy cross-reference compatibility test still passes.
