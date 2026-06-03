# SPEC119MANSTOSTU-003: "Why is this missing?" ledger lookup

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` web frontend (`web/src/pages/PromptPreview.tsx`); a read-only search affordance over the resolution ledger. No backend change.
**Deps**: archive/tickets/SPEC119MANSTOSTU-002.md

## Problem

The confidence panel should answer the author's "why isn't record X in the prompt?" question (SPEC-119 §2 item 4, report §40). This ticket adds a search affordance: the author types a record title and the inspector reports the deterministic reason it was not included. Per the SPEC-119 reassessment decision (Q1 = a), the lookup is scoped to the resolution ledger — the composer never loads never-seeded records, so a full title→record index is intentionally not introduced.

## Assumption Reassessment (2026-06-03)

1. The resolution payload (`PromptResolution`, `web/src/types/manual-story.ts:353-359`) contains only records that entered the working set: `included` / `excluded` / `suppressed` / `blocked`. A record never seeded (not in `current_cast`, `pinned_records`, `included_records`, `active_secrets_questions`, `must_not_reveal`) is absent from the payload — `compose.ts` never loads it (confirmed: every ledger push in `compose.ts` follows a `readRecord` of a seeded id). The lookup therefore reads the ledger that `PromptPreview.tsx` already holds (`composeResult.resolution`); no new data source.
2. SPEC-119 §2 item 4 (rewritten under Q1 = a) + §3 ("rendered straight from the existing resolution ledger reasons — no inference") + §6 acceptance criterion 4 + §8 Risks ("why missing" data source, resolved) define this ticket: ledger-present record → its deterministic reason; title absent from the ledger → the generic "not in the working set (not selected, pinned, or active in the current context)" answer.
3. **Cross-artifact boundary under audit**: this ticket reads the SPEC119MANSTOSTU-001 enriched ledger (`resolution.excluded[i].reason`, `.suppressed[i].reason`, `.blocked[i].reason`) and shares `PromptPreview.tsx` with SPEC119MANSTOSTU-002 (hence `Deps: 002`); the title-match must use the enriched `title` field already on each ledger entry.
4. **FOUNDATIONS principle**: SPEC-119 §5 aligns the "why here / why missing" explanations to determinism — the answer is rendered straight from the ledger reasons with no inference or scoring narrative. The generic fallback is itself deterministic (a record absent from the ledger is, by construction, not in the working set).

## Architecture Check

1. Scoping the lookup to the ledger (rather than loading the full record corpus for a title index) keeps the explanation deterministic and adds zero new I/O, honoring SPEC-119 §3's no-inference rule and §8's resolved data-source decision. A future full-corpus lookup remains possible but is explicitly deferred (SPEC-119 §8).
2. No backwards-compatibility shim: the affordance is a new read-only UI control reading existing state; no aliasing.

## Verification Layers

1. Ledger-present title → deterministic reason -> `test/web/prompt-inspector.test.ts` assertion that searching a known-excluded record's title returns its `reason` (e.g., `never_prompt`, `working_set_excluded`, `must_not_reveal`, blocked).
2. Title absent from ledger → generic fallback -> test assertion that an unknown / never-seeded title returns "not in the working set (not selected, pinned, or active in the current context)".
3. No new data source -> codebase grep-proof: the lookup reads only `composeResult.resolution` (no new fetch / API call / record-list load introduced in `PromptPreview.tsx`).

## What to Change

### 1. Add the "Why is this missing?" search affordance (`PromptPreview.tsx`)

Add a labeled search input in the inspector aside. On query, match the typed title (case-insensitive, trimmed) against the enriched ledger entries' `title` across `resolution.excluded` / `suppressed` / `blocked` (and `included` → report "it IS included"). Report the matched entry's deterministic reason in author-readable form. For a title that matches no ledger entry, report the generic "not in the working set (not selected, pinned, or active in the current context)" answer. Render no inferred or scored narrative.

### 2. Extend the web inspector test (`test/web/prompt-inspector.test.ts`)

Add assertions for the ledger-present path (known-excluded title → its reason) and the absent-title path (→ generic fallback).

## Files to Touch

- `tools/manual-story-studio/web/src/pages/PromptPreview.tsx` (modify)
- `tools/manual-story-studio/test/web/prompt-inspector.test.ts` (modify)

## Out of Scope

- Loading the full record corpus or building a title→record index for never-seeded records (deferred per SPEC-119 §8).
- Any backend / `compose.ts` change.
- The card-identity rendering, reason badges, and panel cardification — those are SPEC119MANSTOSTU-002.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run test:backend` — `test/web/prompt-inspector.test.ts` asserts both the ledger-present-reason path and the absent-title generic-fallback path.
2. `cd tools/manual-story-studio && npm --prefix web test` — web bundle typechecks.
3. `cd tools/manual-story-studio && npm test` — full suite green.

### Invariants

1. The lookup reads only `composeResult.resolution` — no new data source, fetch, or record-list load (SPEC-119 §3 / §8).
2. Every reported reason is a deterministic value drawn from the ledger or the generic "not in the working set" fallback — no inference or scoring narrative.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/web/prompt-inspector.test.ts` (modify) — ledger-present-reason + absent-title-fallback assertions.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm --prefix web test`
3. `cd tools/manual-story-studio && npm test`
