# SPEC105MANSTOSTU-008: Migrate enumerators (`manual-stories.ts` + `worlds.ts`) + callers

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/manual-story-studio/src/read/manual-stories.ts` and `tools/manual-story-studio/src/read/worlds.ts` (top-level enumerators) plus 2 caller files (`server/routes/worlds.ts`; `server/routes/manual-stories.ts`). No impact on canon-pipeline surfaces.
**Deps**: archive/tickets/SPEC105MANSTOSTU-002.md, archive/tickets/SPEC105MANSTOSTU-003.md

## Problem

The top-level enumerators in `tools/manual-story-studio/src/read/manual-stories.ts` (which enumerates `worlds/<world>/manual-stories/` per world) and `src/read/worlds.ts` (which enumerates `worlds/`) currently return `T | null` on parse failure of a sibling — meaning a corrupt sibling manual story silently disappears from the world's manual story list. Per SPEC-105 §1 Context's fail-fast model, this is exactly the failure mode the spec addresses. This ticket migrates both enumerators and their route callers.

## Assumption Reassessment (2026-06-01)

1. Caller sites verified at HEAD:
   - `tools/manual-story-studio/src/read/manual-stories.ts` returns null on parse failure at lines 61–63 (verified in the reassess-spec session).
   - `tools/manual-story-studio/src/server/routes/worlds.ts` consumes the world-list enumerator.
   - `tools/manual-story-studio/src/server/routes/manual-stories.ts` consumes the manual-story-list enumerator (the GET handler `registerManualStoriesGetRoute`).
2. SPEC-105 §4 Modify list `read/manual-stories.ts` and `read/worlds.ts` explicitly, plus routes/worlds.ts and routes/manual-stories.ts as consumers.
3. Cross-skill boundary: package-internal migration; no cross-package import added.
4. Rule 6 retcon attribution: 2 public enumerator signatures change non-additively. The behavior shift: a corrupt sibling manual story (e.g., one whose `manual-story.yaml` has invalid YAML) now surfaces as a `yaml_parse_failed` 409 from the parent world's manual-stories-list GET, rather than silently disappearing from the list as it does today. This is the spec's *"corruption rendered as absence is the precise failure mode"* framing applied to the sibling-enumeration case. No `T | null` overload retained.
5. Blast-radius: 2 caller files (routes/worlds.ts, routes/manual-stories.ts). No write-side consumers — enumerators are read-only top-level discovery surfaces.

## Architecture Check

1. The two enumerators are sibling concerns (both walk the filesystem at a per-world or all-worlds level) and migrating them together makes sense — they share callers via the route layer's discovery surface (frontend world picker + per-world manual-story list).
2. Each enumerator's fail-fast policy: ANY parse failure on a sibling causes the entire enumeration to fail with `ok: false`. The alternative — partial results with a "warnings" array — would re-introduce the corruption-rendered-as-absence pattern that SPEC-105 is fixing. The fail-fast posture is consistent with `listRecords` in ticket 005 (which also fails the entire call on any single corrupt record).
3. No backwards-compatibility aliasing/shims.

## Verification Layers

1. Type signature changes → codebase grep-proof: `grep -nE "^export.*ReadResult" tools/manual-story-studio/src/read/manual-stories.ts tools/manual-story-studio/src/read/worlds.ts` returns the new signatures.
2. Route-layer adaptation → `cd tools/manual-story-studio && npm run build:backend` compiles cleanly.
3. Frontend world picker still works under valid worlds → existing route tests pass; under a corrupt sibling, the list GET returns 409 with the offending sibling named in the HealthReport finding's `path`.

## What to Change

### 1. `tools/manual-story-studio/src/read/manual-stories.ts`

Change the enumerator (the public function listing manual stories under a world) to return `ReadResult<ManualStorySummary[]>`. Any parse failure on a sibling produces `ok: false` with `code: "yaml_parse_failed"` and the offending path.

### 2. `tools/manual-story-studio/src/read/worlds.ts`

Same shape: change the enumerator to return `ReadResult<WorldSummary[]>`. Any per-world enumeration failure (corrupt `WORLD_KERNEL.md` or missing per-world structure) produces `ok: false` with the appropriate code. Note: world canon is READ-ONLY in Manual Studio per SPEC-100's design — the enumerator only walks the `worlds/` directory to surface world slugs + summary info from `WORLD_KERNEL.md`'s frontmatter (if present).

### 3. `tools/manual-story-studio/src/server/routes/worlds.ts`

Adapt the GET handler to dispatch via `mapReadErrorToHttpReply` on `!result.ok`.

### 4. `tools/manual-story-studio/src/server/routes/manual-stories.ts`

Adapt `registerManualStoriesGetRoute` (and any GET handler in this file) to dispatch via `mapReadErrorToHttpReply` on `!result.ok`. POST handlers (manual-story creation) do not consume the enumerator's read path; they create new manual stories and so are unaffected by this migration except where they verify uniqueness against the enumerator's output.

## Files to Touch

- `tools/manual-story-studio/src/read/manual-stories.ts` (modify)
- `tools/manual-story-studio/src/read/worlds.ts` (modify)
- `tools/manual-story-studio/src/server/routes/worlds.ts` (modify)
- `tools/manual-story-studio/src/server/routes/manual-stories.ts` (modify)

## Out of Scope

- Migrating any other read function — SPEC105MANSTOSTU-004 (metadata), 005 (records), 006 (segments), 007 (manuscript).
- World canon writes — out of scope by SPEC-100 design intent (Manual Studio is canon-read-only).
- Frontend rendering — SPEC105MANSTOSTU-011 / SPEC105MANSTOSTU-012.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend` compiles cleanly.
2. `cd tools/manual-story-studio && npm test` runs and existing worlds-route + manual-stories-route tests pass (adapted to `!result.ok` narrowing).
3. `grep -nE "^export.*ReadResult" tools/manual-story-studio/src/read/manual-stories.ts tools/manual-story-studio/src/read/worlds.ts` returns matches for the migrated enumerators.

### Invariants

1. The two enumerators return `ReadResult<T>` — never `T | null`.
2. A corrupt sibling causes the entire enumeration to fail (`ok: false`), never a partial list. Fail-fast policy consistent with `listRecords` in ticket 005.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/routes/worlds.test.ts` (modify if affected) — assert 200 for valid enumeration; 409 if a corrupt world is encountered.
2. `tools/manual-story-studio/test/server/routes/manual-stories.test.ts` (modify) — assert 200 for valid enumeration of manual stories under a world; 409 if a sibling manual story has corrupt metadata.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend` — compile check.
2. `cd tools/manual-story-studio && npm test` — full package test.
