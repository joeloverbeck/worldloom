# SPEC119MANSTOSTU-002: Render real identity + reasons in the confidence panel

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` web frontend (`web/src/pages/PromptPreview.tsx`, `web/src/components/RecordCard.tsx`); rendering change only. No backend or compose change.
**Deps**: archive/tickets/SPEC119MANSTOSTU-001.md

## Problem

With the resolution ledger carrying real identity from `archive/tickets/SPEC119MANSTOSTU-001.md`, the inspector needed to stop fabricating summaries and start reading as an author confidence panel (SPEC-119 §2 items 1/2/3/5/6, §3, report §40). At intake, `ledgerSummary()` (`PromptPreview.tsx`) built a fake `ManualRecordSummary` whose `summary` was `"Reason: <label>"`; the selected-cast and working-set panels rendered raw `.join(", ")` ID strings; the section map rendered raw ID lists; and the inclusion reason was a bare `<p>` outside the card. This ticket renders real identity per row, moves the reason to a labeled badge, cardifies the two raw-ID panels, collapses the section map, and adds confidence-panel header copy.

## Assumption Reassessment (2026-06-03)

1. At intake, `ledgerSummary()` (`PromptPreview.tsx`) hardcoded `importance:"medium"`, `prompt_visibility:"include_when_relevant"`, `tags:[]`, and `summary:"Reason: …"`; after `archive/tickets/SPEC119MANSTOSTU-001.md` the ledger entry carries the real values, so `ledgerSummary` was rewritten to pass them through. The selected-cast and working-set panels read `composeResult.sidecar_draft.included_cast` / `included_records` — raw ID `string[]`, **not** the resolution ledger (SPEC-119 §2 item 2). `RecordCard` already rendered the de-emphasized `.id-subscript` ID chip, Class row, Prompt-mode row, involved-Cast row, proposition, and tags; the only new card surface was an optional `reason` badge (SPEC-119 §4, M1).
2. SPEC-119 §2 items 1/2/3/5/6 + §3 (identity-first, reason-second, ID-last) + §6 acceptance criteria 1/2/3/5 define this ticket. §2 item 2 specifies the two panels resolve their `sidecar_draft` IDs against the enriched ledger entries; the working set is the **pre-filter** seeded set, so some IDs resolve to `resolution.excluded`/`suppressed` (identity lookup must cover non-included entries).
3. **Cross-artifact boundary under audit**: the `RecordCard` prop contract (`RecordCardProps`) is shared across the records pickers (SPEC-112) and the inspector; adding an optional `reason` prop must be additive (default omitted) so existing call sites are unaffected. The inspector also consumes the archived SPEC119MANSTOSTU-001 ledger contract (`PromptIncludedRecord` et al.).
4. **FOUNDATIONS principle**: SPEC-119 §5 aligns this work to the explainability / §Tooling-Recommendation analogy ("the author can verify the prompt carries the right story truth, instead of a reason-label standing in for the record") and to determinism ("rendered straight from the ledger reasons — no inference"). The rendering must invent no state: reasons and identity come straight from the enriched ledger.

## Architecture Check

1. Reusing `RecordCard` (rather than a new component) keeps the identity surface consistent with the records pickers and concentrates the change in one component + one page. Resolving the two raw-ID panels against the already-enriched ledger (rather than enriching `sidecar_draft` a second time) avoids a duplicate identity path and reuses SPEC119MANSTOSTU-001's single source of truth.
2. No backwards-compatibility shim: `ledgerSummary` is rewritten in place (not aliased); the `reason` prop is additive-optional with no fallback indirection.

## Verification Layers

1. No raw `mXXX-n` ID list as primary evidence -> `test/web/prompt-inspector.test.ts` assertion that selected-cast and working-set panels render card/identity output (title/class), with the technical ID only as the de-emphasized `.id-subscript` chip.
2. Cards show real proposition, not `"Reason: …"` -> test assertion that a rendered included card's summary equals the record's real `summary` and the reason appears as a separate labeled badge.
3. Section map collapsed by default + renders identity -> test assertion that the `Sections generated` block is collapsed and lists record identity, not bare ID lists.
4. `RecordCard` `reason` prop is additive -> codebase grep-proof that existing `RecordCard` call sites (records pickers) compile unchanged.

## Landed Changes

### 1. Rewrite `ledgerSummary()` to pass through real identity (`PromptPreview.tsx`)

`ledgerSummary()` now builds `ManualRecordSummary` from the enriched ledger entry's real `summary` / `importance` / `prompt_visibility` / `involved_cast` / `tags` instead of fabricated placeholders. The `summary: "Reason: …"` path was removed. Inclusion/exclusion/suppression reasons render through `RecordCard`'s labeled `reason` prop, so the reason is separate from the card summary.

### 2. Add an optional `reason` badge prop to `RecordCard` (`RecordCard.tsx`)

Added `reason?: string` to `RecordCardProps`; when present, it renders as a labeled reason line inside the card. The prop is additive and optional, so existing call sites compile unchanged.

### 3. Cardify selected-cast and working-set panels (`PromptPreview.tsx`)

Replaced the raw `.join(", ")` ID lists with `RecordCard` rendering by resolving each `sidecar_draft.included_cast` / `included_records` ID against the enriched resolution ledger entries (`resolution.included` ∪ `excluded` ∪ `suppressed`). The `RecordCard`'s existing `.id-subscript` remains the de-emphasized technical-ID detail. If an ID is absent from the ledger, the fallback explicitly says identity is unavailable and shows the id only as the technical chip.

### 4. Render section-map with identity + collapse by default (`PromptPreview.tsx`)

Each `section_map` entry now renders record identity via the same ledger lookup instead of `ids.join(", ")`, inside a collapsed-by-default `<details>` disclosure.

### 5. Confidence-panel header copy (`PromptPreview.tsx` inspector aside)

Applied the report §40 confidence framing to the panel headers: "These records will shape the prompt," "These were deliberately excluded," "These secrets are protected," and "This is safe to copy."

### 6. Update the web inspector test (`test/web/prompt-inspector.test.ts`)

Updated assertions for the new rendering: real proposition in cards, reason-as-badge, cardified cast/working-set panels, and collapsed section map.

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

## Outcome

Completed on 2026-06-03.

- Rewrote `PromptPreview` to render ledger entries from real enriched identity fields instead of fabricated `"Reason: …"` summaries.
- Added the additive `RecordCard` `reason` prop and used it for included, excluded, suppressed, selected-cast, working-set, and section-map records.
- Resolved selected-cast and working-set IDs through the enriched ledger, keeping technical IDs only as the existing de-emphasized subscript.
- Collapsed the section map by default and rendered record identity inside it.
- Updated confidence-panel header copy and strengthened `test/web/prompt-inspector.test.ts` for the new static rendering contract.

## Verification Result

- `cd tools/manual-story-studio && npm --prefix web test` — PASS; web TypeScript compiled with `tsc --noEmit`.
- `cd tools/manual-story-studio && npm run test:backend` — PASS; backend build plus 86 Node/static tests passed, including `dist/test/web/prompt-inspector.test.js`.
- `cd tools/manual-story-studio && npm test` — PASS; backend/static suite reported 487 passing tests and the web typecheck passed.

## Deviations

- The selected-cast / working-set fallback for an ID absent from the resolution ledger renders "Identity unavailable" plus the de-emphasized technical ID chip. This is a defensive fallback only; the normal path is ledger-backed identity from archived ticket 001.
