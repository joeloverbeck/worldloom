# SPEC113MANSTOSTU-003: Ledger `section_map` — emitter consumed-id reporting

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Large
**Engine Changes**: Yes — `tools/manual-story-studio` prompt section emitters + `assembleSections` + compose wiring. No canon-pipeline impact (package is canon-fenced per SPEC-100).
**Deps**: 002

## Problem

The inclusion ledger (002) emits `section_map: {}` as a placeholder. SPEC-113 §2 item 2 requires `section_map` to attribute each emitted section to the record ids that fed it (e.g. "§8 ← these emotion/relationship records"). Delivering this requires each section emitter to report which record ids it consumed, since `assembleSections` currently returns only a markdown string.

## Assumption Reassessment (2026-06-02)

1. `assembleSections` (`src/prompt/sections/index.ts:50`) returns a `string`; the 15 emitters (`section-1` … `section-15`) each return a markdown string. Translator-driven sections 7–11 (cast / emotion / intentions / beliefs / physical) carry most of the per-record attribution; `section-3-current-situation.ts:68` filters `input.records` by `isCentralOrHigh || referencesIncludedCast` and is **skipped entirely when a handoff summary exists** — so a record in `input.records` may feed §7/§8/§9/§10 rather than §3. The emitter signature must change to also return consumed ids.
2. SPEC-113 §2 item 2 (`section_map`) + §4 (`sections/*.ts` each reports consumed ids; `section-3` records its "Pinned situation context" membership) + §8 Risks ("`section_map` requires touching all 15 section emitters") fix the contract.
3. Cross-artifact boundary under audit: the `section_map` contract spans every emitter's return shape, `assembleSections`'s aggregation, and the `resolution.section_map` field defined in 002's `src/prompt/types.ts`. The aggregation must stay insertion-ordered for determinism. The shared test file `test/prompt/inclusion-ledger.test.ts` is created by 002 and extended here (Deps:002).
4. FOUNDATIONS §Tooling Recommendation (determinism): emitting `section_map` as side-output must not change emitted markdown and must be byte-identical for identical inputs (insertion-ordered structures, no wall-clock).

## Architecture Check

1. Change each emitter to return its consumed record ids alongside its body (e.g. `{ body: string; consumed: string[] }`, or a threaded `consumed` accumulator), and have `assembleSections` return `{ markdown, section_map }`. The markdown assembly is unchanged byte-for-byte; only the structured side-output is added — preserving the §Out-of-scope "emitted markdown unchanged" contract.
2. No backwards-compat shim: the emitter signature change is internal to the prompt module; `composePrompt` is the only caller of `assembleSections`.

## Verification Layers

1. `section_map` attributes each included record to the section it actually fed -> `inclusion-ledger.test.ts` assertion checked against the markdown (SPEC-113 AC#5).
2. Emitted markdown unchanged -> existing `prompt-sections.test.ts` / `prompt-compose.test.ts` stay green.
3. Determinism -> ledger test byte-identical `section_map` for identical inputs.

## What to Change

### 1. Emitter signature (`src/prompt/sections/*.ts`)

Each `emitSectionN` returns its consumed record ids alongside its body. Sections with no per-record input (1, 2, 4, 5, 6, 13, 14, 15) return `[]`; sections 3, 7, 8, 9, 10, 11, 12 return the ids they actually rendered.

### 2. `assembleSections` (`src/prompt/sections/index.ts`)

Return `{ markdown, section_map }` where `section_map["§N"] = consumed ids`; preserve the existing `## N. title` heading injection + `\n\n` join byte-for-byte.

### 3. Compose wiring (`src/prompt/compose.ts`)

Thread the `assembleSections` `section_map` into `resolution.section_map`, and set each `included` record's `section` field consistently with its `section_map` membership.

### 4. Test

Extend `test/prompt/inclusion-ledger.test.ts` with `section_map` attribution assertions (AC#5) and an unchanged-markdown regression guard.

## Files to Touch

- `tools/manual-story-studio/src/prompt/sections/index.ts` (modify)
- `tools/manual-story-studio/src/prompt/sections/section-3-current-situation.ts` and the remaining per-record emitters under `tools/manual-story-studio/src/prompt/sections/*.ts` (modify — sections 3, 7–12)
- `tools/manual-story-studio/src/prompt/compose.ts` (modify)
- `tools/manual-story-studio/test/prompt/inclusion-ledger.test.ts` (modify — created by 002 in this batch; Deps:002)

## Out of Scope

- The ledger bucket logic (002).
- Any change to emitted markdown text.
- The frontend inspector rendering of `section_map` (004).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run test:backend` — inclusion-ledger `section_map` assertions + unchanged-markdown regression green.
2. `cd tools/manual-story-studio && npm test`.

### Invariants

1. Emitted markdown is byte-identical to pre-003 for identical inputs (side-output only).
2. `section_map` and `included[].section` are mutually consistent and deterministic.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt/inclusion-ledger.test.ts` — `section_map` attribution + unchanged-markdown guard (modify).

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm test`
