# SPEC89STOEXPSTA-010: Hybrid section parser — STCHAR/DA/SAU/SP/RSP

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new `HybridSectionParser.ts` module + integration with `RecordCardExpanded` for hybrid record-class section splitting
**Deps**: archive/tickets/SPEC89STOEXPSTA-002.md

## Problem

SPEC-89 §12 was rewritten during the 2026-05-26 reassessment to clarify that SPEC-87's `/records/:recordId` route returns parsed frontmatter spread as top-level fields plus the raw markdown body string under the `body` field — it does NOT split the body into sections (the `section_path` projection only exists on the MCP `get_record` surface, deliberately bypassed per Named Assumption C). For hybrid record classes (STCHAR, DA, and the direct-file classes SAU / SP / RSP per SPEC-87 §7), the X-Ray frontend needs to split the markdown body by `##` headers into a section map so the expanded card can render per-section disclosures.

This ticket implements that client-side parser using `remark` / `mdast` (available via the SPEC-88-established markdown stack), and wires it into `<RecordCardExpanded>` so on first expand the body string is parsed into a `Record<string, string>` and memoized per record.

## Assumption Reassessment (2026-05-26)

1. SPEC-87 `tools/story-explorer/src/read/record-io.ts:85-113` (`parseRecordBody` function) returns frontmatter spread + a single `body: string` field (verified during 2026-05-26 reassessment). SPEC-88's `tools/story-explorer/web/src/lib/sanitize-markdown.ts` is the canonical markdown helper; this ticket reuses its underlying remark stack for section parsing.
2. SPEC-89 §12 (Hybrid-record rendering, rewritten 2026-05-26) prescribes the client-side parser pattern. SPEC-89 §16 Risk 2 names the resilience requirements: malformed bodies must not throw; non-standard heading depths, bold-wrapped headings, or non-heading anchors must degrade gracefully.
3. Cross-skill boundary: the parser consumes ONLY the `body` field from SPEC-87's `/records/:recordId` response — it does not re-fetch the raw record or duplicate SPEC-87's frontmatter parsing. The split-section result is a structured slice consumed by `<RecordCardExpanded>`; the parser is independent of any specific record class beyond requiring a markdown body string.
4. FOUNDATIONS principle restatement: §Story Bundles §6.1 — Story-Local Character Authority. STCHAR profiles are hybrid frontmatter+body markdown per §6.1; the X-Ray must render STCHAR's story-local authority (per-bundle profile) without substituting world-level CHAR provenance as a runtime shortcut. The section parser preserves this discipline by treating STCHAR's body sections (capabilities, voice, pressure behavior, regeneration reasons, etc.) as the story-local authority surface — never reading CHAR as a substitute. The compact card already enforces this via SPEC89STOEXPSTA-003's STCHAR renderer (which surfaces source-CHAR provenance as a frontmatter field, not as identity); this ticket extends the discipline to the expanded view.

## Architecture Check

1. Single-module parser keyed on `recordId + contentHash` (memoization) — the alternative (per-render re-parse) would re-walk the markdown body on every expand-collapse cycle; memoization caches across the session. Memoization keying parallels SPEC89STOEXPSTA-003's per-class renderer memoization.
2. No backwards-compatibility aliasing or shims — the parser is greenfield; no fallback to a server-side section-projection endpoint (because none exists per the 2026-05-26 reassessment).

## Verification Layers

1. Parses a representative STCHAR body (with `## Capabilities`, `## Voice`, `## Pressure Behavior` sections) into the expected `Record<string, string>` → fixture test → vitest.
2. Idempotent on second call (memoization) → counter-tracking test asserting the parser runs once per recordId+contentHash.
3. Degrades gracefully on malformed bodies: no `##` headers → fallback to a single "Body" section containing the full text; non-heading anchors → similar fallback; the parser MUST NOT throw → exhaustive negative-case tests.
4. FOUNDATIONS alignment: §Story Bundles §6.1 — STCHAR rendering uses the parser's output as the story-local authority surface; CHAR-related fields appear only as frontmatter provenance, never as substitute identity → render test asserting "Source CHAR" chip appears in the frontmatter summary but not as a body section.

## What to Change

### 1. Create `HybridSectionParser.ts`

Module exports `parseSections(body: string): Record<string, string>` that:
- Uses `remark.parse` (or equivalent mdast walker — `unified` + `remark-parse` from npm; already a transitive dep of `sanitize-markdown.ts`) to walk the markdown AST.
- Identifies `heading` nodes at depth 2 (`##`) — these are the primary section markers per SPEC-89 §12 + §16 Risk 2.
- For each `##` header, collects all subsequent siblings until the next `##` or end-of-doc; serializes them back to markdown via `remark-stringify`.
- Returns the resulting map keyed by header text.
- Memoizes via `useMemo`-equivalent keyed on `recordId + contentHash` (caller supplies these as additional arguments).

Resilience requirements (per SPEC-89 §16 Risk 2):
- Empty body → returns `{}` (empty map).
- No `##` headers → returns `{ "Body": <full markdown> }` (single fallback section).
- Bold-wrapped headings (`## **Section Title**`) → unwrapped to `"Section Title"` as the key.
- Heading depths 3+ → walked under the most recent `##` parent (or under "Body" if no `##` precedes them).
- Heading depths 1 (`#`) → treated as `##` for splitting purposes (some hybrid markdown uses single-hash for top-level).
- Parser throws → caught and the function returns `{ "Body": <full body, unparsed> }` rather than re-throwing.

### 2. Integrate with `<RecordCardExpanded>`

`<RecordCardExpanded>` (from SPEC89STOEXPSTA-002) — when the record class is in the hybrid set (`STCHAR`, `DA`, `SAU`, `SP`, `RSP`), on first expand call `parseSections(record.body)` and render each section as a collapsible disclosure within the expanded view. Cache the result per record. For non-hybrid record classes, the expanded view continues to render fields directly without section parsing.

The integration touches `RecordCardExpanded.tsx` — added to this ticket's Files to Touch as `(modify)` since SPEC89STOEXPSTA-002 created it `(new)`.

### 3. Add `__tests__/HybridSectionParser.test.ts`

Negative-case + happy-path tests: well-formed STCHAR body; malformed body (no headers); bold-wrapped headings; mixed-depth headings; empty body; parser-throws fallback.

## Files to Touch

- `tools/story-explorer/web/src/components/xray/HybridSectionParser.ts` (new)
- `tools/story-explorer/web/src/components/xray/RecordCardExpanded.tsx` (modify — wire parser for hybrid classes; created `(new)` in SPEC89STOEXPSTA-002 this batch, this ticket declares Deps: 002)
- `tools/story-explorer/web/src/components/xray/__tests__/HybridSectionParser.test.ts` (new)

## Out of Scope

- Re-rendering SPEC-87's frontmatter parse client-side — SPEC-87 already spreads the frontmatter as top-level fields on the record response; this ticket only parses the `body` field.
- Promoting SLB/SAU/SP/RSP to indexed-node retrieval at the SPEC-87 layer — that's a future indexer-extension spec (SPEC-87 §7 already names it as a v2 candidate).
- Markdown rendering inside the parsed sections — `sanitize-markdown.ts` from SPEC-88 handles that downstream of the section-split.
- Accessibility verification (SPEC89STOEXPSTA-012).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- HybridSectionParser.test` — all positive + negative fixtures pass.
2. `cd tools/story-explorer/web && npm test -- RecordCard.test` — RecordCardExpanded with hybrid-class fixture renders section disclosures (regression test against the SPEC89STOEXPSTA-002-landed test, extended).
3. `cd tools/story-explorer && npm run build` — build succeeds.

### Invariants

1. The parser NEVER throws — every malformed input falls back to a single "Body" section per SPEC-89 §16 Risk 2.
2. STCHAR rendering uses the parser's output as the story-local authority surface; world-level CHAR-related fields appear only as frontmatter provenance per FOUNDATIONS §Story Bundles §6.1.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/xray/__tests__/HybridSectionParser.test.ts` — parser-level tests covering positive + resilience cases.
2. `tools/story-explorer/web/src/components/xray/__tests__/RecordCard.test.tsx` (modify per SPEC89STOEXPSTA-002 existing test) — extend with a hybrid STCHAR fixture asserting section disclosures appear.

### Commands

1. `cd tools/story-explorer/web && npm test -- HybridSectionParser.test` — targeted parser tests.
2. `cd tools/story-explorer/web && npm test -- RecordCard.test` — integration with expanded card.
3. `cd tools/story-explorer && npm test` — full package suite.
