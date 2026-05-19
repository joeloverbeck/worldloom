# SPEC48SESTRINT-009: Delete `tools/world-index/src/parse/intro-tag-parser.ts`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — deletes `tools/world-index/src/parse/intro-tag-parser.ts`
**Deps**: archive/tickets/SPEC48SESTRINT-003.md, archive/tickets/SPEC48SESTRINT-004.md, archive/tickets/SPEC48SESTRINT-008.md

## Problem

SPEC-48 §Phase C D-C1 specifies deleting `tools/world-index/src/parse/intro-tag-parser.ts`, the parser file that hosts the 8 per-class trigger vocabularies + 7-value relation enum + the regex patterns + the `extractIntroTags` / `parsePlanRelationTags` / `parseIntroTag` exported functions. Under SPEC-48's clean break, no consumer should import from this file after the upstream refactors land — ticket 003 drops parser re-exports from `midstory-introduction-utils.ts`, archive/tickets/SPEC48SESTRINT-004.md retargets the cross-package import at `midstory-record-introduction-grounding.ts:2`, and archive/tickets/SPEC48SESTRINT-008.md removes the parser import from `tools/world-index/src/parse/atomic.ts`. With those three upstream tickets landed, the parser file has zero consumers and can be deleted safely.

## Assumption Reassessment (2026-05-19)

1. **Parser file currently exists**: `tools/world-index/src/parse/intro-tag-parser.ts` (266 lines per the SPEC-48 reassess-spec inspection; carries `MIDSTORY_TRIGGERS_*` constants for 8 classes + `PLAN_RELATIONS` 7-value enum + `INTRO_TAG_PATTERN` regex + `INTRO_TAG_PARSE_PATTERN` regex + `PLAN_RELATION_TAG_PARSE_PATTERN` regex + `RECORD_ID_PATTERN` regex + `parseIntroTag` / `extractIntroTags` / `parsePlanRelationTags` / `parseExactIntroTag` / `parseExactPlanRelationTag` / `parseRecordList` functions). The Pre-Write Files-to-Touch existence check at Step 5 confirmed the file resolves at the cited path.
2. **Consumers verified by SPEC-48 reassess-spec M4 finding**: 2 known consumers — `tools/world-index/src/parse/atomic.ts` (refactored by archive/tickets/SPEC48SESTRINT-008.md) and `tools/validators/src/structural/midstory-record-introduction-grounding.ts:2,78` (refactored by archive/tickets/SPEC48SESTRINT-004.md). Additionally, `tools/validators/src/structural/midstory-introduction-utils.ts:2-12` re-exports parser symbols (refactored by ticket 003). After all three upstream tickets land, no source file imports from the parser path.
3. **Per-class trigger vocabularies migrated**: ticket 003 preserves the 8 per-class trigger constants as TypeScript exports under `tools/validators/src/structural/midstory-introduction-utils.ts` (renamed from the parser file's exports). The 7-value `PLAN_RELATIONS` enum is also migrated to `midstory-introduction-utils.ts` per ticket 003. The 8 per-class vocabularies are also encoded in `tools/validators/src/schemas/story-event.schema.json` per ticket 001 as `oneOf` branches. Two source-of-truth representations are intentional (TypeScript exports + JSON-schema enum), kept in sync by the parity test added in ticket 003.
4. **FOUNDATIONS Rule 6 (No Silent Retcons)**: the parser deletion is a documented clean-break, not a silent retcon. SPEC-48 documents the deletion + the clean-break rationale + the no-production-stories invariant that authorizes the deletion. The deletion's audit trail is the spec + this ticket + the CI gate added by ticket 010 that asserts the file's absence going forward. Rule 6 is preserved: the change is logged with justification.
5. **Canon Safety surface**: `intro-tag-parser.ts` lives under `tools/world-index/src/parse/` (NOT under `tools/validators/src/structural/`); per the per-ticket-type granularity rule, world-index parsers are not in the named directories that trigger item 5. However, the old non-propagation-tag-shape.ts (which ticket 007 deletes) IS in `tools/validators/src/structural/`. This ticket inherits item 5's firing from the deletion of validator-package files. Both deletions preserve all Canon Safety semantics (the validators' replacement coverage + schema-level enforcement together preserve every check the deleted code performed).
6. **Rename / remove**: this ticket removes one TypeScript file from the world-index package. Pipeline-wide blast radius: 3 sources of imports (atomic.ts, midstory-introduction-utils.ts, midstory-record-introduction-grounding.ts), all refactored by upstream tickets before this deletion runs. No `.claude/skills/` or `docs/` consumers exist (verified by grep — the parser file is a TypeScript-internal helper). The 8 per-class trigger constants + `PLAN_RELATIONS` enum migrate to `midstory-introduction-utils.ts` per ticket 003; no consumer loses access to these constants.

## Architecture Check

1. **Single source of truth post-deletion**: with the parser gone, the 8 per-class trigger vocabularies live in `midstory-introduction-utils.ts` (TypeScript) + `story-event.schema.json` (JSON-schema). The parity test from ticket 003 ensures these two representations stay aligned. Cleaner than the pre-SPEC-48 dual-source state where the parser file was both the runtime extraction mechanism AND the canonical vocabulary source.
2. **No backwards-compatibility aliasing**: no shim file replaces the deleted parser; no re-export wrapper preserves the parser's public surface. Consumers that may someday want extraction of structured fields use `readSeIntroductions` / `readSeStateRelations` / `readSeNonPropagationFacts` from `midstory-introduction-utils.ts` (per ticket 003).

## Verification Layers

1. Parser file deleted → `test ! -f tools/world-index/src/parse/intro-tag-parser.ts` returns success.
2. No consumers remain → grep proof: `grep -rn "intro-tag-parser\|extractIntroTags\|parsePlanRelationTags\|parseIntroTag" tools/ .claude/skills/ docs/ 2>/dev/null` returns zero matches (excluding `dist/` build artifacts which regenerate from source). The CI gate added by ticket 010 makes this assertion permanent.
3. Validators + world-index still build → `npm test --prefix tools/validators` AND `npm test --prefix tools/world-index` both pass (no broken imports after deletion).
4. Per-class vocabularies preserved at the new home → grep proof: `grep -n "MIDSTORY_TRIGGERS_CLK\|MIDSTORY_TRIGGERS_STEMO\|PLAN_RELATIONS" tools/validators/src/structural/midstory-introduction-utils.ts` returns ≥9 matches (8 per-class trigger constant exports + PLAN_RELATIONS export).

## What to Change

### 1. Delete `tools/world-index/src/parse/intro-tag-parser.ts`

Remove the file via `rm tools/world-index/src/parse/intro-tag-parser.ts` (or equivalent git operation). No partial-delete; the entire file is gone.

### 2. Verify no consumers remain

After deletion, the following must hold:

- `tools/world-index/src/parse/atomic.ts` no longer imports from `./intro-tag-parser.js` (archive/tickets/SPEC48SESTRINT-008.md dependency).
- `tools/validators/src/structural/midstory-introduction-utils.ts` no longer re-exports from `@worldloom/world-index/parse/intro-tag-parser` (ticket 003 dependency).
- `tools/validators/src/structural/midstory-record-introduction-grounding.ts` no longer imports from `@worldloom/world-index/parse/intro-tag-parser` (archive/tickets/SPEC48SESTRINT-004.md dependency).
- No other consumer exists (verified by pipeline-wide grep prior to deletion).

If `npm test --prefix tools/world-index` or `npm test --prefix tools/validators` reports a broken import after deletion, the dependent ticket (003 / 004 / archive/tickets/SPEC48SESTRINT-008.md) did not land cleanly — block this ticket's deletion until the upstream refactor completes correctly.

### 3. Verify the dist/ build regenerates without the file

`npm run clean --prefix tools/world-index && npm test --prefix tools/world-index` regenerates the `dist/` tree from current source; the regenerated tree must not contain `dist/src/parse/intro-tag-parser.js` (or its `.d.ts`). The deletion is permanent across rebuilds.

## Files to Touch

- `tools/world-index/src/parse/intro-tag-parser.ts` (delete)

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
4. `grep -rn "intro-tag-parser\|extractIntroTags\|parsePlanRelationTags\|parseIntroTag" tools/world-index/src/ tools/validators/src/ 2>/dev/null` returns zero matches (excluding dist/ build output).

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
3. `grep -rn "intro-tag-parser" tools/ .claude/skills/ docs/ 2>/dev/null | grep -v '/dist/'` — confirms zero matches in source / skill / docs trees.
