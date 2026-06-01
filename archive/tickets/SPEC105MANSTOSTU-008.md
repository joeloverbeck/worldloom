# SPEC105MANSTOSTU-008: Migrate enumerators (`manual-stories.ts` + `worlds.ts`) + callers

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/manual-story-studio/src/read/manual-stories.ts` and `tools/manual-story-studio/src/read/worlds.ts` (top-level enumerators) plus 2 caller files (`server/routes/worlds.ts`; `server/routes/manual-stories.ts`). No impact on canon-pipeline surfaces.
**Deps**: archive/tickets/SPEC105MANSTOSTU-002.md, archive/tickets/SPEC105MANSTOSTU-003.md

## Problem

At intake, the top-level enumerators in `tools/manual-story-studio/src/read/manual-stories.ts` (which enumerates `worlds/<world>/manual-stories/` per world) and `src/read/worlds.ts` (which enumerates `worlds/`) returned plain arrays or threw, so route callers had no typed read-error surface. `manual-stories.ts` also swallowed malformed sibling `manual-story.yaml` by listing the story with `title: null`. Per SPEC-105 §1 Context's fail-fast model, corruption rendered as absence or degraded metadata must become visible. This ticket migrated both enumerators and their route callers.

## Assumption Reassessment (2026-06-01)

1. Caller sites verified at HEAD:
   - `tools/manual-story-studio/src/read/manual-stories.ts` currently returns `title: null` on malformed `manual-story.yaml`, so a corrupt sibling remains listed but loses its title instead of surfacing as a read failure.
   - `tools/manual-story-studio/src/read/worlds.ts` does not parse `WORLD_KERNEL.md`; it only checks for the file's presence. The ticket's drafted "corrupt WORLD_KERNEL.md" example is not a live behavior surface.
   - `tools/manual-story-studio/src/server/routes/worlds.ts` consumes the world-list enumerator.
   - `tools/manual-story-studio/src/server/routes/manual-stories.ts` consumes the manual-story-list enumerator (the GET handler `registerManualStoriesGetRoute`).
2. SPEC-105 §4 Modify list `read/manual-stories.ts` and `read/worlds.ts` explicitly, plus routes/worlds.ts and routes/manual-stories.ts as consumers.
3. Cross-skill boundary: package-internal migration; no cross-package import added.
4. Rule 6 retcon attribution: 2 public enumerator signatures change non-additively. The behavior shift: a corrupt sibling manual story (e.g., one whose `manual-story.yaml` has invalid YAML) now surfaces as a `yaml_parse_failed` 409 from the parent world's manual-stories-list GET, rather than appearing as a valid entry with `title: null`. This is the spec's *"corruption rendered as absence is the precise failure mode"* framing applied to the sibling-enumeration case. No plain-array-only contract retained.
5. Blast-radius: 2 caller files (routes/worlds.ts, routes/manual-stories.ts). No write-side consumers — enumerators are read-only top-level discovery surfaces.

## Architecture Check

1. The two enumerators are sibling concerns (both walk the filesystem at a per-world or all-worlds level) and migrating them together makes sense — they share callers via the route layer's discovery surface (frontend world picker + per-world manual-story list).
2. Each enumerator's fail-fast policy: ANY parse failure on a sibling causes the entire enumeration to fail with `ok: false`. The alternative — partial results with a "warnings" array — would re-introduce the corruption-rendered-as-absence pattern that SPEC-105 is fixing. The fail-fast posture is consistent with `listRecords` in ticket 005 (which also fails the entire call on any single corrupt record).
3. No backwards-compatibility aliasing/shims.

## Verification Layers

1. Type signature changes → codebase grep-proof: `grep -nE "^export function.*ReadResult" tools/manual-story-studio/src/read/manual-stories.ts tools/manual-story-studio/src/read/worlds.ts` returns the new signatures.
2. Route-layer adaptation → `cd tools/manual-story-studio && npm run build:backend` compiles cleanly.
3. Frontend world picker/manual-story picker discovery still works under valid fixtures → focused enumerator tests and package tests pass; under a corrupt sibling manual story, the list GET returns 409 with the offending sibling named in the HealthReport finding's `path`.

## Landed Changes

### 1. `tools/manual-story-studio/src/read/manual-stories.ts`

Changed the enumerator to return `ReadResult<ManualStoryEntry[]>`. Any parse failure on a sibling produces `ok: false` with `code: "yaml_parse_failed"` and the offending path. Missing title remains a valid `ok: true` entry with `title: null`.

### 2. `tools/manual-story-studio/src/read/worlds.ts`

Changed the enumerator to return `ReadResult<WorldEntry[]>`. The live enumerator does not parse world-canon content; it only checks whether `WORLD_KERNEL.md` exists. Filesystem enumeration failures surface as `io_error` if encountered. World canon remains READ-ONLY in Manual Studio per SPEC-100's design.

### 3. `tools/manual-story-studio/src/server/routes/worlds.ts`

Adapted the GET handler to dispatch via `mapReadErrorToHttpReply` on `!result.ok`.

### 4. `tools/manual-story-studio/src/server/routes/manual-stories.ts`

Adapted `registerManualStoriesGetRoute` to dispatch via `mapReadErrorToHttpReply` on `!result.ok`. POST handlers are unaffected by this migration.

## Files to Touch

- `tools/manual-story-studio/src/read/manual-stories.ts` (modify)
- `tools/manual-story-studio/src/read/worlds.ts` (modify)
- `tools/manual-story-studio/src/server/routes/worlds.ts` (modify)
- `tools/manual-story-studio/src/server/routes/manual-stories.ts` (modify)
- `tools/manual-story-studio/test/read/manual-stories.test.ts` (modify)
- `tools/manual-story-studio/test/read/worlds.test.ts` (modify)
- `tools/manual-story-studio/test/server/manual-stories-routes.test.ts` (modify)

## Out of Scope

- Migrating any other read function — archive/tickets/SPEC105MANSTOSTU-004.md (metadata), 005 (records), 006 (segments), 007 (manuscript).
- World canon writes — out of scope by SPEC-100 design intent (Manual Studio is canon-read-only).
- Frontend rendering — SPEC105MANSTOSTU-011 / SPEC105MANSTOSTU-012.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend` compiles cleanly.
2. `cd tools/manual-story-studio && npm test` runs and existing discovery/route tests pass (adapted to `!result.ok` narrowing).
3. `grep -nE "^export function.*ReadResult" tools/manual-story-studio/src/read/manual-stories.ts tools/manual-story-studio/src/read/worlds.ts` returns matches for the migrated enumerators.

### Invariants

1. The two enumerators return `ReadResult<T>` — never plain arrays or thrown read errors for expected read-layer failures.
2. A corrupt sibling causes the entire enumeration to fail (`ok: false`), never a partial list. Fail-fast policy consistent with `listRecords` in ticket 005.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/read/worlds.test.ts` (modify) — adapted expectations to the `ReadResult<WorldEntry[]>` shape.
2. `tools/manual-story-studio/test/read/manual-stories.test.ts` (modify) — asserted `ok: true` for valid enumeration and `ok: false` for a sibling manual story with corrupt metadata.
3. `tools/manual-story-studio/test/server/manual-stories-routes.test.ts` (modify) — asserted 409 if a sibling manual story has corrupt metadata.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend` — compile check.
2. `cd tools/manual-story-studio && npm test` — full package test.

## Outcome

Completed on 2026-06-01.

This ticket migrated `enumerateManualStories` and `enumerateWorlds` to `ReadResult<T>`, adapted the worlds and manual-stories GET routes to dispatch read errors through `mapReadErrorToHttpReply`, and added fail-fast coverage for corrupt sibling manual-story metadata.

## Verification Result

Commands run:

1. `cd tools/manual-story-studio && npm run build:backend` — passed.
2. `cd tools/manual-story-studio && node --test dist/test/read/manual-stories.test.js dist/test/read/worlds.test.js dist/test/server/manual-stories-routes.test.js` — passed; 16 focused tests.
3. `cd tools/manual-story-studio && npm test` — passed; backend reported 367 tests passing and web `tsc --noEmit` passed.
4. `grep -nE "^export function.*ReadResult" tools/manual-story-studio/src/read/manual-stories.ts tools/manual-story-studio/src/read/worlds.ts` — passed; returned both migrated enumerators.
5. `git diff --check` — passed.

## Deviations

- The drafted corrupt-world example was not a live behavior surface: `enumerateWorlds` checks for `WORLD_KERNEL.md` presence but does not parse world-canon content. The landed world enumerator migration still returns `ReadResult<WorldEntry[]>` and surfaces filesystem enumeration failures as `io_error`.
