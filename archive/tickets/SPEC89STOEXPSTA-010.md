# SPEC89STOEXPSTA-010: Hybrid section parser — STCHAR/DA/SAU/SP/RSP

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new `HybridSectionParser.ts` module + integration with `RecordCardExpanded` for hybrid record-class section splitting
**Deps**: archive/tickets/SPEC89STOEXPSTA-002.md

## Problem

At intake, SPEC-89 §12 had been rewritten during the 2026-05-26 reassessment to clarify that SPEC-87's `/records/:recordId` route returns parsed frontmatter spread as top-level fields plus the raw markdown body string under the `body` field — it does NOT split the body into sections (the `section_path` projection only exists on the MCP `get_record` surface, deliberately bypassed per Named Assumption C). For hybrid record classes (STCHAR, DA, and the direct-file classes SAU / SP / RSP per SPEC-87 §7), the X-Ray frontend needed to split the markdown body by `##` headers into a section map so the expanded card could render per-section disclosures.

This ticket implemented that client-side parser with a small deterministic heading scanner, and wired it into `<RecordCardExpanded>` so on first expand the body string is parsed into a `Record<string, string>` and memoized per record.

## Assumption Reassessment (2026-05-26)

1. SPEC-87 `tools/story-explorer/src/read/record-io.ts:85-113` (`parseRecordBody` function) returns frontmatter spread + a single `body: string` field (verified during 2026-05-26 reassessment). SPEC-88's `tools/story-explorer/web/src/lib/sanitize-markdown.ts` is the canonical rendered-markdown helper, but the live web package uses `marked` + `dompurify` and does not directly depend on `remark`, `unified`, or `mdast`. This ticket therefore uses a deterministic line scanner for H1/H2 section boundaries instead of adding a parser dependency for a heading-split job.
2. SPEC-89 §12 (Hybrid-record rendering, rewritten 2026-05-26) prescribes the client-side parser pattern. SPEC-89 §16 Risk 2 names the resilience requirements: malformed bodies must not throw; non-standard heading depths, bold-wrapped headings, or non-heading anchors must degrade gracefully.
3. Cross-skill boundary: the parser consumes ONLY the `body` field from SPEC-87's `/records/:recordId` response — it does not re-fetch the raw record or duplicate SPEC-87's frontmatter parsing. The split-section result is a structured slice consumed by `<RecordCardExpanded>`; the parser is independent of any specific record class beyond requiring a markdown body string.
4. FOUNDATIONS principle restatement: §Story Bundles §6.1 — Story-Local Character Authority. STCHAR profiles are hybrid frontmatter+body markdown per §6.1; the X-Ray must render STCHAR's story-local authority (per-bundle profile) without substituting world-level CHAR provenance as a runtime shortcut. The section parser preserves this discipline by treating STCHAR's body sections (capabilities, voice, pressure behavior, regeneration reasons, etc.) as the story-local authority surface — never reading CHAR as a substitute. The compact card already enforces this via SPEC89STOEXPSTA-003's STCHAR renderer (which surfaces source-CHAR provenance as a frontmatter field, not as identity); this ticket extends the discipline to the expanded view.

## Architecture Check

1. Single-module parser keyed on `recordId + contentHash` (memoization) — the alternative (per-render re-parse) would re-walk the markdown body on every expand-collapse cycle; memoization caches across the session. Memoization keying parallels SPEC89STOEXPSTA-003's per-class renderer memoization.
2. No backwards-compatibility aliasing or shims — the parser is greenfield; no fallback to a server-side section-projection endpoint (because none exists per the 2026-05-26 reassessment).

## Verification Layers

1. Parses a representative STCHAR body (with `## Capabilities`, `## Voice`, `## Pressure Behavior` sections) into the expected `Record<string, string>` → fixture test → vitest.
2. Idempotent on second call (memoization) → counter-tracking test asserting the parser runs once per recordId+contentHash.
3. Degrades gracefully on malformed bodies: no `##` headers → fallback to a single "Body" section containing the full text; non-heading anchors → similar fallback; parser calls do not throw on covered resilience fixtures → negative-case tests.
4. FOUNDATIONS alignment: §Story Bundles §6.1 — STCHAR rendering uses the parser's output as the story-local authority surface and does not fetch world-level CHAR as a substitute identity → render test plus source review of the `CurrentStateTab.tsx` to `RecordCardExpanded.tsx` body handoff.

## Landed Changes

### 1. Created `HybridSectionParser.ts`

The module exports `parseSections(body: string): Record<string, string>` and `parseSectionsForRecord(...)`. It:
- Scans line-by-line for Markdown ATX headings at depth 1 or 2 (`#` / `##`) — these are the primary section markers per SPEC-89 §12 + §16 Risk 2.
- For each section header, collects all subsequent lines until the next H1/H2 or end-of-doc.
- Returns the resulting map keyed by header text.
- Memoizes via `parseSectionsForRecord(...)` keyed on `recordId + contentHash`.

Resilience requirements (per SPEC-89 §16 Risk 2):
- Empty body → returns `{}` (empty map).
- No `##` headers → returns `{ "Body": <full markdown> }` (single fallback section).
- Bold-wrapped headings (`## **Section Title**`) → unwrapped to `"Section Title"` as the key.
- Heading depths 3+ → walked under the most recent `##` parent (or under "Body" if no `##` precedes them).
- Heading depths 1 (`#`) → treated as `##` for splitting purposes (some hybrid markdown uses single-hash for top-level).
- Parser throws → caught and the function returns `{ "Body": <full body, unparsed> }` rather than re-throwing.

### 2. Integrated with `<RecordCardExpanded>`

`<RecordCardExpanded>` (from SPEC89STOEXPSTA-002) now renders Body Sections for records in the hybrid set (`STCHAR`, `DA`, `SAU`, `SP`, `RSP`) when the expanded card opens and a `recordBody` string is available. It sanitizes section markdown through the existing `sanitizeMarkdown` helper. For non-hybrid record classes, the expanded view continues to render fields directly without section parsing.

`CurrentStateTab.tsx` now preserves `payload.record.body` from the already-issued SPEC-87 `/records/:recordId` fetch and passes it into `<RecordCardExpanded>`, avoiding a second body fetch.

### 3. Added focused tests

Negative-case + happy-path tests cover a well-formed STCHAR body, no-H1/H2 fallback, bold-wrapped headings, mixed heading depths, empty body, and memoization. `RecordCard.test.tsx` now covers hybrid STCHAR section rendering after expansion.

## Files to Touch

- `tools/story-explorer/web/src/components/xray/HybridSectionParser.ts` (new)
- `tools/story-explorer/web/src/components/xray/RecordCardExpanded.tsx` (modify — wire parser for hybrid classes; created `(new)` in SPEC89STOEXPSTA-002 this batch, this ticket declares Deps: 002)
- `tools/story-explorer/web/src/components/xray/tabs/CurrentStateTab.tsx` (modify — preserve fetched record body for expanded-card section rendering)
- `tools/story-explorer/web/src/components/xray/__tests__/HybridSectionParser.test.ts` (new)
- `tools/story-explorer/web/src/components/xray/__tests__/RecordCard.test.tsx` (modify — hybrid expanded-card rendering coverage)
- `tools/story-explorer/web/src/styles/app.css` (modify — section disclosure spacing)

## Out of Scope

- Re-rendering SPEC-87's frontmatter parse client-side — SPEC-87 already spreads the frontmatter as top-level fields on the record response; this ticket only parses the `body` field.
- Promoting SLB/SAU/SP/RSP to indexed-node retrieval at the SPEC-87 layer — that's a future indexer-extension spec (SPEC-87 §7 already names it as a v2 candidate).
- Full markdown editor or raw-source rendering changes; expanded-card sections render sanitized markdown through the existing `sanitize-markdown.ts` helper.
- Accessibility verification (SPEC89STOEXPSTA-012).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- HybridSectionParser.test` — all positive + negative fixtures pass.
2. `cd tools/story-explorer/web && npm test -- RecordCard.test` — RecordCardExpanded with hybrid-class fixture renders section disclosures (regression test against the SPEC89STOEXPSTA-002-landed test, extended).
3. `cd tools/story-explorer && npm run build` — build succeeds.
4. `cd tools/story-explorer && npm test` — full package suite passes.

### Invariants

1. The parser NEVER throws — every malformed input falls back to a single "Body" section per SPEC-89 §16 Risk 2.
2. STCHAR rendering uses the parser's output as the story-local authority surface; world-level CHAR-related fields appear only as frontmatter provenance per FOUNDATIONS §Story Bundles §6.1.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/xray/__tests__/HybridSectionParser.test.ts` — parser-level tests covering positive + resilience cases.
2. `tools/story-explorer/web/src/components/xray/__tests__/RecordCard.test.tsx` (modified per SPEC89STOEXPSTA-002 existing test) — extended with a hybrid STCHAR fixture asserting section disclosures appear.

### Commands

1. `cd tools/story-explorer/web && npm test -- HybridSectionParser.test` — targeted parser tests.
2. `cd tools/story-explorer/web && npm test -- RecordCard.test` — integration with expanded card.
3. `cd tools/story-explorer && npm test` — full package suite.

## Outcome

Completed on 2026-05-26.

The Story Explorer web X-Ray now splits hybrid markdown bodies for STCHAR, DA, SAU, SP, and RSP expanded cards. `HybridSectionParser.ts` performs deterministic H1/H2 section scanning, gracefully falls back to `Body`, unwraps bold heading text, and caches parsed sections by `recordId + contentHash`. `CurrentStateTab.tsx` passes the already-fetched record body into expanded cards, and `RecordCardExpanded.tsx` renders sanitized section disclosures only after expansion.

The implementation deliberately did not add `remark`, `unified`, or `mdast` dependencies because the live web package does not use them directly and the needed behavior is a bounded heading split.

## Verification Result

1. `cd tools/story-explorer/web && npm test -- HybridSectionParser.test` — PASS, 5 tests.
2. `cd tools/story-explorer/web && npm test -- RecordCard.test` — PASS, 3 tests.
3. `cd tools/story-explorer && npm run build` — PASS after fixing one strict TypeScript nullability diagnostic in `HybridSectionParser.ts`.
4. `cd tools/story-explorer && npm test` — PASS. Backend `node:test` reported 74 passing tests; web vitest reported 58 files and 163 passing tests. Existing React Router future-flag warnings and the intentional ErrorBoundary test stderr appeared but did not fail the suite.

## Deviations

1. The drafted parser implementation expected `remark` / `mdast`; live package reassessment found no direct `remark`, `unified`, or `mdast` dependency in `tools/story-explorer/web/package.json`, so the implementation uses a deterministic line scanner instead.
2. The body text source is the existing `/records/:recordId` response already fetched by `CurrentStateTab.tsx`; no new record-body route or raw-record fetch was added.
