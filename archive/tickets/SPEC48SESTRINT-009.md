# SPEC48SESTRINT-009: Delete `tools/world-index/src/parse/intro-tag-parser.ts`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — deletes `tools/world-index/src/parse/intro-tag-parser.ts`, removes the world-index parser export, and removes/updates parser-specific tests
**Deps**: archive/tickets/SPEC48SESTRINT-003.md, archive/tickets/SPEC48SESTRINT-004.md, archive/tickets/SPEC48SESTRINT-008.md

## Problem

At intake, SPEC-48 §Phase C D-C1 specified deleting `tools/world-index/src/parse/intro-tag-parser.ts`, the parser file that hosted the 8 per-class trigger vocabularies + 7-value relation enum + the regex patterns + the `extractIntroTags` / `parsePlanRelationTags` / `parseIntroTag` exported functions. Under SPEC-48's clean break, no current package source or test consumer should import from this file after the upstream refactors land. Live reassessment found production imports gone but package/test fallout remaining; this ticket deletes the parser and removes those same-seam public/test consumers.

## Assumption Reassessment (2026-05-19)

1. **Parser file currently exists**: `tools/world-index/src/parse/intro-tag-parser.ts` (265 lines at live reassessment; carries `MIDSTORY_TRIGGERS_*` constants for 8 classes + `PLAN_RELATIONS` 7-value enum + `INTRO_TAG_PATTERN` regex + `INTRO_TAG_PARSE_PATTERN` regex + `PLAN_RELATION_TAG_PARSE_PATTERN` regex + `RECORD_ID_PATTERN` regex + `parseIntroTag` / `extractIntroTags` / `parsePlanRelationTags` / `parseExactIntroTag` / `parseExactPlanRelationTag` / `parseRecordList` functions). The pre-write existence check confirmed the file resolves at the cited path.
2. **Consumers verified by SPEC-48 reassess-spec M4 finding**: 2 known consumers — `tools/world-index/src/parse/atomic.ts` (refactored by archive/tickets/SPEC48SESTRINT-008.md) and `tools/validators/src/structural/midstory-record-introduction-grounding.ts:2,78` (refactored by archive/tickets/SPEC48SESTRINT-004.md). Additionally, `tools/validators/src/structural/midstory-introduction-utils.ts:2-12` re-exports parser symbols (refactored by ticket 003). After all three upstream tickets land, no source file imports from the parser path.
3. **Per-class trigger vocabularies migrated**: ticket 003 preserves the 8 per-class trigger constants as TypeScript exports under `tools/validators/src/structural/midstory-introduction-utils.ts` (renamed from the parser file's exports). The 7-value `PLAN_RELATIONS` enum is also migrated to `midstory-introduction-utils.ts` per ticket 003. The 8 per-class vocabularies are also encoded in `tools/validators/src/schemas/story-event.schema.json` per ticket 001 as `oneOf` branches. Two source-of-truth representations are intentional (TypeScript exports + JSON-schema enum), kept in sync by the parity test added in ticket 003.
4. **FOUNDATIONS Rule 6 (No Silent Retcons)**: the parser deletion is a documented clean-break, not a silent retcon. SPEC-48 documents the deletion + the clean-break rationale + the no-production-stories invariant that authorizes the deletion. The deletion's audit trail is the spec + this ticket + the CI gate added by ticket 010 that asserts the file's absence going forward. Rule 6 is preserved: the change is logged with justification.
5. **Canon Safety surface**: `intro-tag-parser.ts` lives under `tools/world-index/src/parse/` (NOT under `tools/validators/src/structural/`); per the per-ticket-type granularity rule, world-index parsers are not in the named directories that trigger item 5. However, the old non-propagation-tag-shape.ts (which ticket 007 deletes) IS in `tools/validators/src/structural/`. This ticket inherits item 5's firing from the deletion of validator-package files. Both deletions preserve all Canon Safety semantics (the validators' replacement coverage + schema-level enforcement together preserve every check the deleted code performed).
6. **Rename / remove**: this ticket removes the parser TypeScript file from the world-index package. Live reassessment corrected the drafted "zero consumers" premise: production consumers are gone, but `tools/world-index/package.json` still exports `./parse/intro-tag-parser`, `tools/world-index/tests/intro-tag-parser.test.ts` still tests the deleted parser directly, and `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` still imports the parser and reads the parser source as a SPEC-47 surface. Those are same-seam deletion fallout and are absorbed here: the public export is removed, the world-index parser unit test is deleted, and the SPEC-47 integration test is retargeted to the structured-field vocabulary/schema surfaces. Active tickets 010 and 012 intentionally keep their current parser-reference prose because they are downstream post-deletion CI/docs owners.

## Architecture Check

1. **Single source of truth post-deletion**: with the parser gone, the 8 per-class trigger vocabularies live in `midstory-introduction-utils.ts` (TypeScript) + `story-event.schema.json` (JSON-schema). The parity test from ticket 003 ensures these two representations stay aligned. Removing the world-index export and parser-specific tests keeps the package contract aligned with that single source of truth.
2. **No backwards-compatibility aliasing**: no shim file replaces the deleted parser; no re-export wrapper preserves the parser's public surface. Consumers that may someday want extraction of structured fields use `readSeIntroductions` / `readSeStateRelations` / `readSeNonPropagationFacts` from `midstory-introduction-utils.ts` (per ticket 003).

## Verification Layers

1. Parser file deleted → `test ! -f tools/world-index/src/parse/intro-tag-parser.ts` returns success.
2. No current source/test consumers remain → grep proof over `tools/world-index` and `tools/validators` excluding `dist/` and `node_modules/` returns zero matches for `intro-tag-parser`, `extractIntroTags`, `parsePlanRelationTags`, and `parseIntroTag`. Active spec/ticket/docs prose may still mention the parser as historical or downstream-owned transition text until tickets 010/012 land.
3. Validators + world-index still build → `npm test --prefix tools/validators` AND `npm test --prefix tools/world-index` both pass (no broken imports after deletion).
4. Per-class vocabularies preserved at the new home → grep proof: `grep -n "MIDSTORY_TRIGGERS_CLK\|MIDSTORY_TRIGGERS_STEMO\|PLAN_RELATIONS" tools/validators/src/structural/midstory-introduction-utils.ts` returns ≥9 matches (8 per-class trigger constant exports + PLAN_RELATIONS export).

## Landed Changes

### 1. Delete `tools/world-index/src/parse/intro-tag-parser.ts`

Deleted the entire file. `test ! -f tools/world-index/src/parse/intro-tag-parser.ts` now succeeds.

### 2. Remove public export and obsolete parser tests

Removed the `./parse/intro-tag-parser` subpath from `tools/world-index/package.json` so downstream packages cannot import the deleted parser surface.

Deleted `tools/world-index/tests/intro-tag-parser.test.ts`; it tested the deleted grammar and has no post-clean-break equivalent. Retargeted `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` away from the parser import/source read and toward the structured-field vocabulary/schema surfaces that preserve the SPEC-47 STPLAN/STEMO contract under SPEC-48.

### 3. Verify no consumers remain

After deletion, the following holds:

- `tools/world-index/src/parse/atomic.ts` no longer imports from `./intro-tag-parser.js` (archive/tickets/SPEC48SESTRINT-008.md dependency).
- `tools/validators/src/structural/midstory-introduction-utils.ts` no longer re-exports from `@worldloom/world-index/parse/intro-tag-parser` (ticket 003 dependency).
- `tools/validators/src/structural/midstory-record-introduction-grounding.ts` no longer imports from `@worldloom/world-index/parse/intro-tag-parser` (archive/tickets/SPEC48SESTRINT-004.md dependency).
- `tools/world-index/package.json` no longer exports `./parse/intro-tag-parser`.
- No other current package source or test consumer exists (verified by package-scoped grep excluding generated `dist/` and `node_modules/`).

### 4. Verify the dist/ build regenerates without the file

`npm run clean --prefix tools/world-index`, `npm run build --prefix tools/world-index`, and `npm test --prefix tools/world-index` regenerated the `dist/` tree from current source; `dist/src/parse/intro-tag-parser.js` and `.d.ts` are absent.

## Files to Touch

- `tools/world-index/src/parse/intro-tag-parser.ts` (delete)
- `tools/world-index/package.json` (modify — remove `./parse/intro-tag-parser` export)
- `tools/world-index/tests/intro-tag-parser.test.ts` (delete — obsolete parser-specific unit tests)
- `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` (modify — retarget SPEC-47 parser assertions to structured-field vocabulary/schema surfaces)

## Out of Scope

- The old `non-propagation-tag-shape.ts` deletion (covered by ticket 007 as part of the replacement).
- CI gates that assert the parser's absence (deferred to ticket 010).
- World-mcp / docs surface updates (deferred to ticket 012).
- Skill prose updates (deferred to ticket 011).

## Acceptance Criteria

### Tests That Must Pass

1. `test ! -f tools/world-index/src/parse/intro-tag-parser.ts` — file does not exist after the deletion.
2. `npm test --prefix tools/world-index` — full world-index test suite passes (no broken imports).
3. `npm test --prefix tools/validators` — full validator test suite passes (no broken imports).
4. `rg -n "intro-tag-parser|extractIntroTags|parsePlanRelationTags|parseIntroTag" tools/world-index tools/validators --glob '!dist/**' --glob '!node_modules/**'` returns zero matches.

### Invariants

1. The parser file is permanently removed; no re-introduction is possible without explicit reintroduction work (and the CI gate at ticket 010 prevents accidental reintroduction).
2. The 8 per-class trigger vocabularies + 7-value relation enum remain available to consumers — at `midstory-introduction-utils.ts` (TypeScript) and `story-event.schema.json` (JSON-schema), kept in sync by the parity test from ticket 003.
3. Build determinism preserved — `npm run clean && npm test` rebuilds cleanly without the file in either source or dist trees.

## Test Plan

### New/Modified Tests

1. `None — deletion-only ticket; verification is command-based (file absence + build succeeds) and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `test ! -f tools/world-index/src/parse/intro-tag-parser.ts` — confirms file deleted.
2. `npm test --prefix tools/world-index && npm test --prefix tools/validators` — both packages build + test clean.
3. `rg -n "intro-tag-parser|extractIntroTags|parsePlanRelationTags|parseIntroTag" tools/world-index tools/validators --glob '!dist/**' --glob '!node_modules/**'` — confirms zero matches in current package source/test trees.

## Outcome

Completed: 2026-05-19

The deprecated world-index introduction tag parser is gone. This ticket deleted `tools/world-index/src/parse/intro-tag-parser.ts`, removed the `./parse/intro-tag-parser` package export, deleted the parser-only unit test file, and retargeted the SPEC-47 validator integration proof to the structured-field vocabulary/schema surfaces that now preserve the STPLAN/STEMO contract.

## Verification Result

- `npm run clean --prefix tools/world-index` passed.
- `npm run build --prefix tools/world-index` passed.
- `npm test --prefix tools/world-index` passed (`119` tests). The count dropped from the prior `129` because the obsolete parser-only test file was deleted.
- First `npm test --prefix tools/validators` rerun failed at TypeScript compile on a retargeted assertion shape; the assertion was corrected to a `readonly string[]` membership check.
- Final `npm test --prefix tools/validators` passed (`620` tests).
- `test ! -f tools/world-index/src/parse/intro-tag-parser.ts` passed.
- `test ! -f tools/world-index/dist/src/parse/intro-tag-parser.js && test ! -f tools/world-index/dist/src/parse/intro-tag-parser.d.ts` passed after the clean rebuild.
- `rg -n "intro-tag-parser|extractIntroTags|parsePlanRelationTags|parseIntroTag" tools/world-index tools/validators --glob '!dist/**' --glob '!node_modules/**'` returned no matches, the expected proof signal.
- `rg -n "MIDSTORY_TRIGGERS_CLK|MIDSTORY_TRIGGERS_STEMO|PLAN_RELATIONS" tools/validators/src/structural/midstory-introduction-utils.ts` confirmed the preserved vocabulary/relation exports at the new authority surface.

## Deviations

- Live reassessment corrected the drafted zero-consumer premise. Production imports were gone, but `tools/world-index/package.json`, `tools/world-index/tests/intro-tag-parser.test.ts`, and `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` still consumed the parser surface. Those same-seam deletion fallout items were absorbed into this ticket.
- Active ticket/spec/docs references to `intro-tag-parser` remain in the SPEC-48 family as historical or downstream-owned transition prose. Tickets 010 and 012 own the CI/docs cleanup surfaces after this deletion.
