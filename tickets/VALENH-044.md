# VALENH-044: Align remaining story-record provenance schemas with VALENH-043 prefix set

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — validators package JSON schemas and focused structural tests.
**Deps**: `archive/tickets/VALENH-043.md`

## Problem

`archive/tickets/VALENH-043.md` corrected five narrow story-record `derived_from` schema patterns to accept the real FOUNDATIONS-002 world-record prefixes (`OQ`, `ENT`, `ONT`, `CAU`, `DIS`, `SOC`, `AES`) and the two-level section form (`SEC-GEO-N`, etc.) while rejecting the dead `INV-N` branch. Post-ticket review found the adjacent story-record provenance surfaces still drift from that contract:

- `tools/validators/src/schemas/story-status.schema.json` uses a broad one-level pattern for `derived_from[]`; it accepts `ONT-1` / `ENT-1` style ids but still rejects the actual two-level section id shape `SEC-GEO-1`.
- `tools/validators/src/schemas/story-plan.schema.json` and `tools/validators/src/schemas/story-emotion.schema.json` use `$defs.recordId` patterns that still include the dead `INV` token and omit the actual world-prefix classes and two-level `SEC-X-N` form.

This leaves story-record provenance inconsistent: the same legitimate world-canon parent can be accepted for SF / THR / SREL / CNSQ / story-DA but rejected for STSTAT / STPLAN / STEMO.

## Assumption Reassessment (2026-05-25)

1. Current code check: `story-status.schema.json:33` defines `derived_from.items.pattern` as `^(SE-[0-9]+|[A-Z]+[A-Z0-9]*-[0-9]+)$`, which permits one-level uppercase prefixes but not `SEC-(GEO|INS|MTS|ECR|PAS|TML|ELF)-N`.
2. Current code check: `story-plan.schema.json:166` and `story-emotion.schema.json:195` define `$defs.recordId.pattern` as `^(STENT|STCHAR|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT|STPLAN|STEMO|CF|CH|M|INV|SEC)-[0-9]+$`, preserving the dead `INV` / bare `SEC` branches and omitting `OQ`, `ENT`, `ONT`, `CAU`, `DIS`, `SOC`, and `AES`.
3. Shared boundary under audit: story-record provenance id grammar for `derived_from[]` / `$defs.recordId` across validators package story schemas. This ticket owns the three adjacent surfaces intentionally left out of `archive/tickets/VALENH-043.md`.
4. FOUNDATIONS principle under audit: `docs/FOUNDATIONS.md` §Canonical Storage Layer records unpadded per-class ids, expanded invariant category prefixes (`ONT`, `CAU`, `DIS`, `SOC`, `AES`), entity/open-question prefixes (`ENT`, `OQ`), and two-level section ids (`SEC-GEO-N`, etc.). Validator schema provenance patterns should express those real prefixes rather than a generic `INV-N` or bare `SEC-N` form.
5. Adjacent contradiction classification: suffix strictness is separate compatibility work. Existing validators tests intentionally preserve padded legacy cross-reference acceptance, so this ticket should preserve `[0-9]+` suffix grammar unless it explicitly updates the package-wide compatibility tests and owns that broader migration.
6. Schema-specific class sets must be preserved. `story-plan` and `story-emotion` currently include `STCHAR`; do not remove it as part of the world-prefix cleanup. Reassess whether `story-status` should keep its currently broad one-level acceptance or switch to the explicit VALENH-043-style enumeration plus the section branch before editing.

## Architecture Check

1. Aligning the three remaining provenance patterns to the explicit VALENH-043 prefix model is cleaner than retaining one broad regex and two stale closed alternations: it makes the schema contract auditable and keeps all story-record provenance surfaces in step with actual storage ids.
2. No backwards-compatibility aliasing/shims are introduced. This is a schema-pattern correction only; do not add alternate id spellings or runtime normalization for `INV-N` / bare `SEC-N`.

## Verification Layers

1. `STSTAT`, `STPLAN`, and `STEMO` provenance schemas accept actual world-record prefixes and `SEC-X-N` -> focused schema/structural tests.
2. Dead `INV-N` and bare `SEC-N` branches are rejected where these three schemas own provenance ids -> negative schema/structural tests plus grep-proof over the three schema files.
3. Existing accepted story-record and legacy padded cross-reference examples remain valid -> existing contract roundtrip / record-schema compliance coverage, with targeted assertions where needed.

## What to Change

### 1. Align `story-status.schema.json`

Update `derived_from.items.pattern` so STSTAT provenance accepts the same actual world-record prefixes and `SEC-X-N` form as VALENH-043. Reassess the current broad one-level behavior before narrowing; preserve intended existing story-record parents.

### 2. Align STPLAN/STEMO `$defs.recordId`

Update `story-plan.schema.json` and `story-emotion.schema.json` `$defs.recordId.pattern` to remove `INV`, replace bare `SEC` with the explicit section branch, and add `OQ`, `ENT`, `ONT`, `CAU`, `DIS`, `SOC`, and `AES`. Preserve the existing `STCHAR` acceptance.

### 3. Add focused coverage

Extend validators structural/schema tests so the three surfaces accept representative new world prefixes (`ONT-1`, `CAU-2`, `ENT-1`, `SEC-GEO-1`) and reject `INV-1`.

## Files to Touch

- `tools/validators/src/schemas/story-status.schema.json` (modify)
- `tools/validators/src/schemas/story-plan.schema.json` (modify)
- `tools/validators/src/schemas/story-emotion.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify, if existing helpers cover STSTAT/STPLAN/STEMO)
- `tools/validators/tests/structural/record-schema-compliance-story-relationship.test.ts` (modify only if shared helper placement requires it)
- `tools/validators/tests/contract-schema-roundtrip.test.ts` (modify only if compatibility fixtures need explicit STPLAN/STEMO/STSTAT coverage)

## Out of Scope

- Reopening the five schemas already fixed by `archive/tickets/VALENH-043.md` except for shared helper/test reuse.
- Retiring padded legacy cross-reference acceptance package-wide.
- Skill-prose changes that encourage authors to cite world invariants/entities in story-record provenance.
- World-content migration to add newly accepted provenance references to existing story records.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance.test.js dist/tests/contract-schema-roundtrip.test.js`
3. `cd tools/validators && npm test`
4. `if rg -n '"INV\\|' tools/validators/src/schemas/story-status.schema.json tools/validators/src/schemas/story-plan.schema.json tools/validators/src/schemas/story-emotion.schema.json; then exit 1; fi` — zero hits unless implementation records a justified remaining non-provenance occurrence.

### Invariants

1. STSTAT / STPLAN / STEMO provenance surfaces accept actual FOUNDATIONS world-record prefixes and the `SEC-X-N` section form.
2. The dead `INV-N` and bare `SEC-N` provenance branches are not preserved as aliases.
3. STPLAN and STEMO continue to accept `STCHAR-N` where currently valid.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` — add or extend fixtures for STSTAT / STPLAN / STEMO provenance acceptance and `INV-1` rejection if this is the local record-schema coverage home.
2. `tools/validators/tests/contract-schema-roundtrip.test.ts` — preserve or extend legacy padded cross-reference compatibility only if the schema changes alter that existing proof surface.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance.test.js dist/tests/contract-schema-roundtrip.test.js`
3. `cd tools/validators && npm test`
4. `if rg -n '"INV\\|' tools/validators/src/schemas/story-status.schema.json tools/validators/src/schemas/story-plan.schema.json tools/validators/src/schemas/story-emotion.schema.json; then exit 1; fi`
