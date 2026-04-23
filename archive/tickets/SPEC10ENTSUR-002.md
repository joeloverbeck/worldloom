# SPEC10ENTSUR-002: Reassess `extractProseNodes` frontmatter sidecar draft

**Status**: NOT IMPLEMENTED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — no production change is warranted; the ticket is now a truthful no-op record.
**Deps**: `specs/SPEC-10-entity-surface-redesign.md`, `archive/tickets/SPEC10ENTSUR-001.md`, `archive/tickets/SPEC10ENTSUR-004.md`, `docs/FOUNDATIONS.md`

## Problem

SPEC-10 drafted a shared YAML-frontmatter sidecar on whole-file prose nodes so Stage A entity adapters could consume parsed frontmatter without reparsing persisted `body` text. Live repo validation disproved the remaining need for that refactor: the shipped entity pipeline already uses structured frontmatter fields truthfully, and the proposed parse-time-only sidecar would not survive the current persistence boundary into `finalizeEntityState`.

## Assumption Reassessment (2026-04-23)

1. `tools/world-index/src/parse/prose.ts` already has a shared opening-frontmatter helper, `parseOpeningFrontmatter(lines)`, used by `canonicalWholeFileNodeId(...)` to extract canonical IDs for whole-file records before fallback synthetic IDs are assigned.
2. `tools/world-index/src/parse/entities.ts` already reparses persisted whole-file `body` content with `parseFrontmatter(body)` and feeds that result into `authoritySourceForNode(...)` for `character_record.name`, `character_proposal_card.name`, and `diegetic_artifact_record.title`.
3. The real shared boundary under audit is not `extractProseNodes` alone; it is the persisted `NodeRow[]` path from `parseWorldFile(...)` through `insertNodes(...)` and later `finalizeEntityState(...)`. `finalizeEntityState(...)` reloads plain persisted `NodeRow` rows from SQLite, so a parse-time-only `frontmatter` sidecar attached inside `extractProseNodes(...)` would be dropped before Stage A consumes rows unless a second transport path were added.
4. `archive/tickets/SPEC10ENTSUR-001.md` explicitly records that `SPEC10ENTSUR-002` was not absorbed because the narrower reread path inside `entities.ts` was already sufficient for the shipped Stage A adapters. `archive/tickets/SPEC10ENTSUR-004.md` records the same extraction seam as completed under `001`.
5. `docs/FOUNDATIONS.md` `Core Principle`, `Ontology Categories`, and `Relation Types` still require authority-backed entity construction. The live implementation already satisfies that requirement by reading structured frontmatter fields directly from whole-file records; no heuristic promotion depends on this ticket.
6. Mismatch + correction: this ticket still describes an implementation that is no longer the truthful next step. The repo already has the needed behavior through narrower helpers, and the drafted sidecar refactor would currently add an unconsumed transient shape rather than a real capability.

## Architecture Check

1. Leaving the live two-helper arrangement in place is cleaner than introducing an in-memory sidecar with no surviving consumer across the SQLite boundary. It avoids dead intermediate state and keeps the authority-backed contract explicit.
2. No backwards-compatibility aliasing or shim was introduced. The correct fix here is ticket truthing, not a compatibility layer.

## Verification Layers

1. Whole-file canonical IDs still come from opening frontmatter when present. -> targeted tool command: `cd tools/world-index && node --test dist/tests/prose-whole-file.test.js`
2. Stage A canonical entity extraction still uses structured whole-file anchors. -> targeted tool command: `cd tools/world-index && node --test dist/tests/entities.test.js`
3. The package still compiles cleanly with the existing narrow frontmatter path. -> targeted tool command: `cd tools/world-index && npm run build`
4. FOUNDATIONS alignment remains intact because canonical entities still come only from authority-backed sources. -> manual code review of `parse/entities.ts` against `docs/FOUNDATIONS.md`

## What to Change

### 1. Rewrite the ticket to match the live repo

- Remove the stale sidecar-implementation plan.
- Record that no production change is needed because the shipped `entities.ts` reread path already satisfies the structured-anchor contract.

### 2. Preserve follow-up ownership boundaries

- Leave `SPEC10ENTSUR-007` and `SPEC10ENTSUR-008` active.
- Do not invent a new producer-to-consumer frontmatter transport until a real consumer needs it across the SQLite boundary.

## Files to Touch

- `tickets/SPEC10ENTSUR-002.md` (modify)

## Out of Scope

- Changing `tools/world-index/src/parse/prose.ts`
- Changing `tools/world-index/src/parse/entities.ts`
- Adding a new non-persisted frontmatter transport alongside SQLite rows
- SPEC-02 documentation updates (`SPEC10ENTSUR-007`)
- Animalia capstone verification (`SPEC10ENTSUR-008`)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/prose-whole-file.test.js dist/tests/entities.test.js`
3. Manual ticket re-read confirms the document no longer claims a stale sidecar implementation is required.

### Invariants

1. This ticket lands no production-code change.
2. Structured frontmatter remains the authority source for whole-file entity anchors through the live `entities.ts` reread path.
3. No new transient `frontmatter` field is added to persisted SQL row types.

## Test Plan

### New/Modified Tests

1. None — no production change. Verification is command-based against existing build and entity/prose tests.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/prose-whole-file.test.js dist/tests/entities.test.js`
3. Narrower command scope is correct because this ticket now closes as reassessment-only rather than a code change.

## Outcome

- Completed reassessment on 2026-04-23.
- Confirmed that the live package already covers the required authority-backed frontmatter behavior through `parse/prose.ts` canonical-ID parsing plus `parse/entities.ts` Stage A reread of persisted whole-file bodies.
- Rewrote the ticket as a truthful no-op record. No production change was made because the drafted sidecar refactor has no surviving consumer across the current SQLite boundary.

## Verification Result

- `cd tools/world-index && npm run build` ✅
- `cd tools/world-index && node --test dist/tests/prose-whole-file.test.js dist/tests/entities.test.js` ✅

## Deviations

- The original draft assumed a shared in-memory frontmatter sidecar was still the next architectural step. Live repo validation showed that `SPEC10ENTSUR-001` had already landed a narrower, sufficient implementation path, leaving this ticket without a truthful remaining code delta.
