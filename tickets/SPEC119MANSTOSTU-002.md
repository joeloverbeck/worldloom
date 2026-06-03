# SPEC119MANSTOSTU-002: Render real identity + reasons in the confidence panel

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` web frontend (`web/src/pages/PromptPreview.tsx`, `web/src/components/RecordCard.tsx`); rendering change only. No backend or compose change.
**Deps**: archive/tickets/SPEC119MANSTOSTU-001.md

## Problem

With the resolution ledger carrying real identity (SPEC119MANSTOSTU-001), the inspector must stop fabricating summaries and start reading as an author confidence panel (SPEC-119 §2 items 1/2/3/5/6, §3, report §40). Today: `ledgerSummary()` (`PromptPreview.tsx:29-41`) builds a fake `ManualRecordSummary` whose `summary` is `"Reason: <label>"`; the selected-cast (`:284`) and working-set (`:296`) panels render raw `.join(", ")` ID strings; the section map renders raw ID lists (`:359-365`); the inclusion reason is a bare `<p>` outside the card. This ticket renders real identity per row, moves the reason to a labeled badge, cardifies the two raw-ID panels, collapses the section map, and adds confidence-panel header copy.

## Assumption Reassessment (2026-06-03)

1. `ledgerSummary()` (`PromptPreview.tsx:29-41`) hardcodes `importance:"medium"`, `prompt_visibility:"include_when_relevant"`, `tags:[]`, `summary:"Reason: …"`; after SPEC119MANSTOSTU-001 the ledger entry carries the real values, so `ledgerSummary` is rewritten to pass them through. The selected-cast panel (`:282-285`) and working-set panel (`:294-297`) read `composeResult.sidecar_draft.included_cast` / `included_records` — raw ID `string[]`, **not** the resolution ledger (SPEC-119 §2 item 2). `RecordCard` (`web/src/components/RecordCard.tsx`) already renders the de-emphasized `.id-subscript` ID chip (`:86-90`), Class row (`:100-105`), Prompt-mode row (`:106-107`), involved-Cast row (`:108-113`), proposition (`:115-117`), and tags (`:118-134`); the only new card surface is an optional `reason` badge (SPEC-119 §4, M1).
2. SPEC-119 §2 items 1/2/3/5/6 + §3 (identity-first, reason-second, ID-last) + §6 acceptance criteria 1/2/3/5 define this ticket. §2 item 2 specifies the two panels resolve their `sidecar_draft` IDs against the enriched ledger entries; the working set is the **pre-filter** seeded set, so some IDs resolve to `resolution.excluded`/`suppressed` (identity lookup must cover non-included entries).
3. **Cross-artifact boundary under audit**: the `RecordCard` prop contract (`RecordCardProps`, `RecordCard.tsx:6-14`) is shared across the records pickers (SPEC-112) and the inspector; adding an optional `reason` prop must be additive (default omitted) so existing call sites are unaffected. The inspector also consumes the SPEC119MANSTOSTU-001 ledger contract (`PromptIncludedRecord` et al.).
4. **FOUNDATIONS principle**: SPEC-119 §5 aligns this work to the explainability / §Tooling-Recommendation analogy ("the author can verify the prompt carries the right story truth, instead of a reason-label standing in for the record") and to determinism ("rendered straight from the ledger reasons — no inference"). The rendering must invent no state: reasons and identity come straight from the enriched ledger.

## Architecture Check

1. Reusing `RecordCard` (rather than a new component) keeps the identity surface consistent with the records pickers and concentrates the change in one component + one page. Resolving the two raw-ID panels against the already-enriched ledger (rather than enriching `sidecar_draft` a second time) avoids a duplicate identity path and reuses SPEC119MANSTOSTU-001's single source of truth.
2. No backwards-compatibility shim: `ledgerSummary` is rewritten in place (not aliased); the `reason` prop is additive-optional with no fallback indirection.

## Verification Layers

1. No raw `mXXX-n` ID list as primary evidence -> `test/web/prompt-inspector.test.ts` assertion that selected-cast and working-set panels render card/identity output (title/class), with the technical ID only as the de-emphasized `.id-subscript` chip.
2. Cards show real proposition, not `"Reason: …"` -> test assertion that a rendered included card's summary equals the record's real `summary` and the reason appears as a separate labeled badge.
3. Section map collapsed by default + renders identity -> test/manual assertion that the `Sections generated` block is collapsed and lists record identity, not bare ID lists.
4. `RecordCard` `reason` prop is additive -> codebase grep-proof that existing `RecordCard` call sites (records pickers) compile unchanged.

## What to Change

### 1. Rewrite `ledgerSummary()` to pass through real identity (`PromptPreview.tsx`)

Build the `ManualRecordSummary` from the enriched ledger entry's real `summary` / `importance` / `prompt_visibility` / `involved_cast` / `tags` (from SPEC119MANSTOSTU-001) instead of fabricated placeholders. Remove the `summary: "Reason: …"` line. Render the inclusion/exclusion reason as a labeled badge via the new `RecordCard` `reason` prop (or the existing separate `<p>` retained as the labeled line) — reason second, never the card summary.

### 2. Add an optional `reason` badge prop to `RecordCard` (`RecordCard.tsx`)

Add `reason?: string` to `RecordCardProps`; when present, render it as a labeled badge inside the card (e.g., a "Reason" chip). Additive and optional — existing call sites unaffected.

### 3. Cardify selected-cast and working-set panels (`PromptPreview.tsx:282-285`, `:294-297`)

Replace the raw `.join(", ")` ID lists with `RecordCard` (or a compact title+class chip) by resolving each `sidecar_draft.included_cast` / `included_records` ID against the enriched resolution ledger entries (`resolution.included` ∪ `excluded` ∪ `suppressed`) for identity. Keep a small copyable technical-ID chip as a de-emphasized detail (report §16 compromise). Cover working-set IDs that resolved to excluded/suppressed.

### 4. Render section-map with identity + collapse by default (`PromptPreview.tsx:353-367`)

Render each `section_map` entry's IDs as record identity (title/class) rather than `ids.join(", ")`, inside a collapsed-by-default disclosure (keep the detail available).

### 5. Confidence-panel header copy (`PromptPreview.tsx` inspector aside)

Apply the report §40 confidence framing to the panel headers ("These records will shape the prompt," "These were deliberately excluded," "These secrets are protected," "This is safe to copy").

### 6. Update the web inspector test (`test/web/prompt-inspector.test.ts`)

Update assertions for the new rendering: real proposition in cards, reason-as-badge, cardified cast/working-set panels, collapsed section map.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/PromptPreview.tsx` (modify)
- `tools/manual-story-studio/web/src/components/RecordCard.tsx` (modify)
- `tools/manual-story-studio/test/web/prompt-inspector.test.ts` (modify)

## Out of Scope

- Any backend / `compose.ts` change — the enriched payload is delivered by SPEC119MANSTOSTU-001.
- The "why is this missing?" search affordance — SPEC119MANSTOSTU-003.
- Cockpit **spatial** relayout (top/middle/bottom record placement) — the two-column layout is kept (SPEC-119 §Out of scope).
- Per-row "referenced-by count" — a record-selector concern, not the inspector (SPEC-119 §Out of scope).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run test:backend` — `test/web/prompt-inspector.test.ts` asserts cards show real proposition + reason badge, and the cast/working-set panels render identity not raw IDs.
2. `cd tools/manual-story-studio && npm --prefix web test` — web bundle typechecks (additive `reason` prop, ledger consumption).
3. `cd tools/manual-story-studio && npm test` — full suite green.

### Invariants

1. No inspector panel renders a raw `mXXX-n` ID list as primary evidence; the technical ID appears only as a de-emphasized chip (SPEC-119 AC#1).
2. The `RecordCard` `reason` prop is additive-optional; existing pickers' call sites are unaffected.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/web/prompt-inspector.test.ts` (modify) — assertions for identity rendering, reason badge, cardified panels, collapsed section map.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm --prefix web test`
3. `cd tools/manual-story-studio && npm test`
