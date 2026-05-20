# MCPENH-061: Single-source world-index story `_source` directory enumeration from the parser registry

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/parse/story-directories.ts` (new; shared story-source directory authority); `tools/world-index/src/parse/atomic.ts` (modify; build `STORY_DIRS` from the shared authority); `tools/world-index/src/enumerate.ts` (modify; derive `STORY_SOURCE_DIRECTORIES` from the shared authority instead of manually duplicating it); `tools/world-index/tests/enumerate.test.ts` (modify; derivation/parity assertion)
**Deps**: `archive/tickets/MCPENH-060.md` (completed additive repair for the SPEC-42/47 enumerator omissions and evidence for the recurrence-prevention need)

## Problem

`archive/tickets/MCPENH-060.md` completed the immediate additive repair: `tools/world-index/src/enumerate.ts` now recognizes `stories/<story-slug>/_source/{clocks,secrets,story-questions,plans,emotions}/*.yaml`, and the package test suite proves the five classes are indexable.

At intake, the review surfaced a structural recurrence risk that MCPENH-060 intentionally left out of scope: `tools/world-index/src/enumerate.ts` maintained `STORY_SOURCE_DIRECTORIES` as a manual duplicate of `tools/world-index/src/parse/atomic.ts` `STORY_DIRS`. This drift had already happened at least twice:

- `MCPENH-044` registered `beliefs` on the parser side without updating the enumerator; `MCPENH-056` repaired the enumerator gap.
- SPEC-42/47 registered `clocks`, `secrets`, `story-questions`, `plans`, and `emotions` on the parser/schema side without updating the enumerator; `MCPENH-060` repaired that enumerator gap.

Before this ticket, as long as those two directory lists were maintained independently, the next parser-side story-bundle class could again be silently excluded from the inventory pass. That meant `world-index build` could classify legitimate records as `unexpected_path` and omit them from the parser feed even though the parser knew how to ingest them.

## Assumption Reassessment (2026-05-20)

1. **Codebase reassessment.** After MCPENH-060, a direct source comparison showed `tools/world-index/src/enumerate.ts` `STORY_SOURCE_DIRECTORIES` and `tools/world-index/src/parse/atomic.ts` `STORY_DIRS` contained the same directory names, with no missing or extra enumerator entries. The bug was therefore not a missing class; it was the remaining duplicated authority. This ticket replaced that duplicated authority with `tools/world-index/src/parse/story-directories.ts`.
2. **Doc reassessment.** `docs/FOUNDATIONS.md` §Story Bundles §6 names the story-bundle ID classes, and `docs/MACHINE-FACING-LAYER.md` documents retrieval over their indexed node types. The machine-facing invariant is that a canonical story record class registered for parsing is also eligible for enumeration; otherwise retrieval completeness can fail before parser dispatch.
3. **Shared boundary.** The boundary under audit is world-index inventory discovery (`enumerate.ts` `isIndexablePath`) vs. story record parsing (`parse/atomic.ts` `STORY_DIRS`). These are same-package producer/consumer surfaces: enumeration decides whether the parser will ever see a story `_source/<class>/*.yaml` file, while `STORY_DIRS` decides how that file becomes a node.
4. **FOUNDATIONS principle.** FOUNDATIONS §Story Bundles treats the per-bundle record classes as load-bearing story-state records, and the Tooling Recommendation requires MCP/index retrieval to operate over the modeled state rather than prose alone. A parser-registered class that is not enumerated breaks that retrieval path.
5. **Adjacent contradiction classification.** The current package tests now catch the known five SPEC-42/47 omissions through fixtures, but they still do not prevent future drift by construction. The owned fix is to make the enumerator derive from the parser-side directory authority and add a parity guard so future manual divergence fails locally.

## Architecture Check

1. The clean target is one story-source directory authority in the world-index package. Put a lightweight exported tuple/map in `tools/world-index/src/parse/story-directories.ts` that both `STORY_DIRS` and `enumerate.ts` consume, so importing the enumerator does not pull the full parser module and does not duplicate parser vocabulary by hand.
2. No backwards-compatibility aliases or shims are introduced. This is an internal authority refactor; file paths and node types remain unchanged.

## Verification Layers

1. `STORY_SOURCE_DIRECTORIES` is derived from the parser-side story directory authority, not manually duplicated -> code review / grep-proof in `tools/world-index/src/enumerate.ts` and `tools/world-index/src/parse/atomic.ts`.
2. The shared story directory authority and enumerator classification stay aligned -> package-local test that imports the shared authority, creates one fixture file per directory, and confirms `enumerate()` classifies each as indexable.
3. Story `_source` files for known classes still classify as indexable and unknown story `_source` directories still classify as unexpected -> `node --test dist/tests/enumerate.test.js`.
4. A built atomic fixture containing story record classes emits zero story `_source` `unexpected_path` warnings -> `node --test dist/tests/commands.test.js`.

## Landed Changes

### 1. Introduce a single story-source directory authority

Created `tools/world-index/src/parse/story-directories.ts` with exported story-source directory specs and directory names as the authority for story `_source/<class>/*.yaml` directories. `tools/world-index/src/parse/atomic.ts` now builds `STORY_DIRS` from that shared spec.

### 2. Derive the enumerator set from that authority

`tools/world-index/src/enumerate.ts` now imports the shared story-source directory names and builds its internal lookup set from them instead of maintaining a separate literal list.

### 3. Add drift-prevention proof

`tools/world-index/tests/enumerate.test.ts` now imports the shared story directory authority, creates one `stories/<slug>/_source/<directory>/<id>.yaml` fixture per directory, and confirms `enumerate()` classifies each as indexable. The existing closed-inventory behavior for unknown directories remains covered.

## Files to Touch

- `tools/world-index/src/parse/story-directories.ts` (new)
- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/world-index/src/enumerate.ts` (modify)
- `tools/world-index/tests/enumerate.test.ts` (modify)

## Out of Scope

- Adding new story-bundle record classes.
- Changing parser node types, edge extraction, or database schema.
- Changing story-bundle markdown/YAML artifact handling outside `stories/<slug>/_source/<class>/*.yaml`.
- Rebuilding or migrating live worlds; the next normal `world-index build` continues to regenerate derived indexes.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/enumerate.test.js`
3. `cd tools/world-index && node --test dist/tests/commands.test.js`
4. `cd tools/world-index && npm test`

### Invariants

1. A story-bundle record-class directory cannot be parser-registered without also becoming enumerator-indexable.
2. Unknown story `_source` directories remain unexpected; the refactor must not broaden the inventory to arbitrary paths.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/enumerate.test.ts` — import the shared story directory authority and prove every listed story `_source` directory is classified indexable by `enumerate()`.
2. Existing `tools/world-index/tests/enumerate.test.ts` closed-inventory cases — keep positive known-class and negative unknown-directory coverage.
3. Existing `tools/world-index/tests/commands.test.ts` fixture build — keep zero story `_source` `unexpected_path` proof.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/enumerate.test.js`
3. `cd tools/world-index && node --test dist/tests/commands.test.js`
4. `cd tools/world-index && npm test`

## Outcome

Completed on 2026-05-20.

`tools/world-index/src/parse/story-directories.ts` is now the single source of truth for story-bundle `_source/<class>` directories and their parser specs. `tools/world-index/src/parse/atomic.ts` derives `STORY_DIRS` from that shared spec, while `tools/world-index/src/enumerate.ts` derives its story-source lookup from the shared directory names. A future story record class added to the parser-side authority therefore becomes enumerator-indexable by construction.

The enumerate test now imports the same shared authority and creates one fixture path per registered story-source directory, so the package has direct drift-prevention coverage while preserving the unknown-directory rejection cases.

## Verification Result

1. Pre-edit baseline: `npm test` from `tools/world-index/` — passed; 125 tests passed. Output included the existing fixture diagnostics for one schema-pattern skip and one legacy-world rejection.
2. `npm run build` from `tools/world-index/` — passed.
3. `node --test dist/tests/enumerate.test.js` from `tools/world-index/` — passed; 3 tests passed.
4. `node --test dist/tests/commands.test.js` from `tools/world-index/` — passed; 3 tests passed.
5. Final broad proof: `npm test` from `tools/world-index/` — passed; 125 tests passed. Output included the same existing fixture diagnostics for one schema-pattern skip and one legacy-world rejection.
6. Manual package surface review: `tools/world-index/README.md`, `docs/WORKFLOWS.md`, and `docs/MACHINE-FACING-LAYER.md` do not document the internal story-source directory registry as a user-facing command/API surface; no package README or repo-doc update was required.

## Deviations

- The accepted proof ran a single `npm run build` before both direct compiled test commands, rather than repeating the build before each direct test command. The compiled artifact was fresh for both `node --test` runs.
- `tools/world-index/dist/` was refreshed by `npm run build`; it is an ignored generated artifact, not a tracked owned edit.
