# SPEC113MANSTOSTU-004: Prompt Preview two-pane inspector

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/manual-story-studio` web (`PromptPreview.tsx` rebuild, web `resolution` types, `api/prompts.ts` passthrough). No canon-pipeline impact (package is canon-fenced per SPEC-100).
**Deps**: 003

## Problem

`PromptPreview.tsx` is a `<pre>` block of the composed markdown plus a lint badge and a toolbar; it cannot show *why* each record was included, excluded, suppressed, or blocked. SPEC-113 §2 item 3 rebuilds it into a two-pane inspector: the markdown on the left, a card-based **Prompt Inspector** on the right rendering the ledger produced by 002 (buckets) and 003 (`section_map`). This ticket needs the full ledger including `section_map`, hence Deps:003.

## Assumption Reassessment (2026-06-02)

1. `PromptPreview.tsx` renders `composeResult.markdown` in a `<pre>` (line 125) plus `LintBadge` + a `role="toolbar"` button row; `previewPrompt` (`web/src/api/prompts.ts:43`) casts the JSON response to the web `PromptComposeResult` at `web/src/types/manual-story.ts:315`. `RecordCard` (`web/src/components/RecordCard.tsx`) is the SPEC-112 card surface to reuse for record rendering. The backend `resolution` shape is defined by 002's `src/prompt/types.ts` and filled by 003's `section_map`; the web type must mirror it.
2. SPEC-113 §2 item 3 (inspector groups), §4 (`PromptPreview` rebuild, web `resolution` types, `api/prompts.ts` surfacing), and AC#6 fix the contract.
3. Cross-artifact boundary under audit: backend `resolution` type (002/003) ↔ web `PromptComposeResult.resolution` (this ticket adds the mirror) ↔ inspector render. The web type must mirror the backend exactly, or the runtime JSON cast in `previewPrompt` silently lies about the shape.
4. FOUNDATIONS Rule 6 (No Silent Retcons) via explainability: the inspector surfaces why each record was processed, making a change in inclusion between runs visible to the author rather than silent — SPEC-113 §5's alignment for the inspector.

## Architecture Check

1. Two-pane layout: the left pane keeps the existing `<pre>` + toolbar + `LintBadge`; the right pane is the new inspector rendering `resolution` buckets via `RecordCard`. The `api/prompts.ts` change is type-only — `previewPrompt` already returns the whole JSON body, so no new fetch or endpoint is introduced.
2. No backwards-compat shim: the web `PromptComposeResult` gains `resolution` mirroring the backend; `previewPrompt` is unchanged at runtime (type widening only).

## Verification Layers

1. Inspector renders included / excluded / suppressed / blocked groups with reasons -> `test/web/prompt-inspector.test.ts` against a ledger fixture (SPEC-113 AC#6).
2. Web `resolution` type mirrors backend -> `cd tools/manual-story-studio/web && npm test` (tsc --noEmit) over the shared shape.
3. Two-pane render + copy/save status preserved -> inspector test + manual review of `PromptPreview.tsx`.

## What to Change

### 1. Web `resolution` types (`web/src/types/manual-story.ts`)

Add the `resolution` / `inclusion_ledger` types to the web `PromptComposeResult` interface (line 315), mirroring `src/prompt/types.ts` (002) exactly — `included` / `excluded` / `suppressed` / `blocked` / `section_map` with the §3 reason unions.

### 2. API passthrough (`web/src/api/prompts.ts`)

`previewPrompt` already returns the whole JSON body cast to `PromptComposeResult`; widen the type so `resolution` is consumed (no runtime change). Update the surrounding comment to note the ledger is now surfaced.

### 3. Inspector rebuild (`web/src/pages/PromptPreview.tsx`)

Rebuild into two panes: **left** = markdown `<pre>` + copy/save toolbar + `LintBadge` (kept); **right** = the Prompt Inspector rendering grouped card sections — copy status (allowed/blocked), hard-lint findings, selected cast, selected template, working set, included-with-reasons, excluded-with-reasons, suppressed reveals, sections-generated (from `section_map`), and missing/blocked inputs. Records render via `RecordCard`. Each excluded/suppressed entry states its reason.

### 4. Inspector test

Create `test/web/prompt-inspector.test.ts` asserting the inspector renders included / excluded / suppressed / blocked groups (each with a stated reason) from a ledger fixture.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/PromptPreview.tsx` (modify)
- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify — add `resolution` to `PromptComposeResult`; shared file with 001's `CurrentContext` edit, different interface)
- `tools/manual-story-studio/web/src/api/prompts.ts` (modify)
- `tools/manual-story-studio/test/web/prompt-inspector.test.ts` (new)

## Out of Scope

- The backend ledger (002) and `section_map` (003).
- The `excluded_records` schema / validator / picker (001).
- The "Prompt Working Set" relabel (005).
- Search-and-highlight inside the inspector (report §33 — deferred per the SPEC-113 reassessment).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm test` — tsc --noEmit clean with the mirrored `resolution` type and the rebuilt page.
2. `cd tools/manual-story-studio && npm test` — `prompt-inspector` test green (runs under `node --test` via the backend test runner, like `test/web/record-picker.test.ts`).

### Invariants

1. The web `PromptComposeResult.resolution` shape mirrors `src/prompt/types.ts` exactly (no drift between the runtime JSON and the declared type).
2. Every excluded/suppressed entry rendered in the inspector states a reason (AC#6); copy/save status is shown.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/web/prompt-inspector.test.ts` — inspector group rendering from a ledger fixture (new).

### Commands

1. `cd tools/manual-story-studio/web && npm test`
2. `cd tools/manual-story-studio && npm test`
