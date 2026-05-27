# STOEXPFIX-007: Prevent uninformative duplicated `active` text in STCHAR record-card titles

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — changes confined to Story Explorer read/render code and package-local tests
**Deps**: None

## Problem

At intake, in the X-Ray Current State tab on page-detail routes such as `/worlds/erotica-world/stories/red-bunny/pages/PG-5`, STCHAR record cards rendered a title that repeated the word `active` twice and a follow-up summary line that also read `active`. Example historical title:

```
STCHAR-1 · active · STENT 1 · CHAR CHAR-0003 · active
```

Below the title (in the `<p class="record-card__line">` element), the same `active` appeared again as a stand-alone paragraph. The card surfaced no informative identification of the STCHAR record beyond its ID — the user saw `active` three times and learned nothing about which character authority profile this was.

Historical DOM evidence: on PG-5, every visible STCHAR card (STCHAR-1, STCHAR-2, STCHAR-3, ...) followed the same pattern. The duplication arose from two coupled causes that together produced the visible repetition:

1. **`summaryLine` walker selects `status` as a fallback summary**: `tools/story-explorer/src/read/record-card.ts:289-310` calls `firstMeaningfulString(body, [...rule.primaryFields, ...DEFAULT_MEANINGFUL_FIELDS])`. For STCHAR (`rule.primaryFields = ["title", "name", "display_name", "status"]` per `record-card.ts:130-135`), if the underlying record has no `title` / `name` / `display_name` populated, the walker accepts the `status` field's value (`"active"`) as a meaningful summary and returns it. The summary becomes the bare enum value.
2. **STCHAR CompactLine renderer adds a second `active` from a different field**: `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx:243-251` composes the title as `[recordCard.recordId, title(recordCard), maybe('STENT', linkCount(...)), maybe('CHAR', fieldValue(...sourceChar)), fieldValue(supersessionStatus), fieldValue(regenerationReason)]`. The `title(recordCard)` helper at `RecordCardRenderers.tsx:111-113` returns `fieldValue(recordCard, 'title') ?? recordCard.summaryLine`, which for STCHAR falls back to the `summaryLine` from cause 1 (= `"active"`). Then `fieldValue(recordCard, 'supersessionStatus')` independently returns `"active"` because both the bound character's `status` and the STCHAR's `supersessionStatus` happen to be the enum value `active` in the current fixture. Two different fields, same enum value, both included in the title.

At intake, the `<p class="record-card__line">` below the title (`RecordCardCompact.tsx:27`) rendered `recordCard.summaryLine` directly, which was also `"active"` — a third visible instance of the same string.

## Assumption Reassessment (2026-05-26; amended 2026-05-27)

1. `tools/story-explorer/src/read/record-card.ts:130-135` defines the STCHAR summary rule: `primaryFields: ["title", "name", "display_name", "status"], secondaryFields: ["profile_kind", "source_char_id", "created_from"], statusField: "status"`. The `primaryFields` list includes `status` as the fourth fallback, which is the source of the uninformative summary line.
2. `tools/story-explorer/src/read/record-card.ts:205` defines `EXPLICIT_SUMMARY_FIELDS = ["title", "label", "name", "display_name", "objective", "claim"]`. `summaryLine()` at `record-card.ts:289` calls `firstMeaningfulString(body, EXPLICIT_SUMMARY_FIELDS)` first; this set explicitly excludes `status`, which is correct (a status enum is not a summary). But when the explicit set returns null, the walker falls through to `firstMeaningfulString(body, [...rule.primaryFields, ...DEFAULT_MEANINGFUL_FIELDS])` which DOES include `status` via STCHAR's `primaryFields[3]`.
3. The fix at the view-model layer is to constrain STCHAR's summary fallback scan to skip the literal `status` enum field. Other status-like fields such as STSTAT `life` are already used as intentional summaries in existing tests, so the live boundary is narrower than the draft's broad `rule.statusField` wording.
4. The CHAR CompactLine renderer at `RecordCardRenderers.tsx:243-251` includes BOTH `title(recordCard)` (which falls back to summaryLine) AND `fieldValue(recordCard, 'supersessionStatus')`. When the STCHAR record's `status` and its bound CHAR's record state both happen to be the enum value `active`, the same string ends up at title positions 2 and 5. The cleanest fix is to drop position 2 entirely for STCHAR — the CompactLine for STCHAR was clearly designed to render `[recordId, STENT linkCount, sourceChar, supersessionStatus]`; the `title()` helper at position 2 only adds value when the STCHAR has an explicit `title` field populated, and for the present worldloom story-bundle schema, STCHAR records do NOT have a `title` field (per the schema in `.claude/skills/_shared-templates/story-state-contract.md`).
5. Verifying the schema claim: `tools/story-explorer/src/read/record-card.ts:130-135` lists `"title", "name", "display_name"` in STCHAR's primaryFields. The story-state contract for STCHAR uses `display_name` (and possibly `name`) — never `title`. The `title` entry is anticipatory rather than schema-grounded. Removing the `title(recordCard)` slot from STCHAR's CompactLine is therefore safe: it never resolved to a real `title` field; it only ever surfaced the summaryLine fallback that's already redundant with the `<p class="record-card__line">` below the title.
6. The `<p class="record-card__line">` rendering of `recordCard.summaryLine` at `tools/story-explorer/web/src/components/xray/RecordCardCompact.tsx:27` remains useful — it surfaces a one-liner about the record's content. The fix at cause (1) (the summaryLine walker) made that line informative again by picking a non-status meaningful field or falling through to the `${id} (${recordClass})` form; we did NOT suppress the `<p>`.
7. No FOUNDATIONS principle is engaged. The story-explorer is a read-only human surface over `_source/`; record-card summary rendering is presentation, not canon storage or validation.
8. 2026-05-27 live reassessment confirmed the drafted source seam is still current, and the package-local proof commands are executable from their package roots. Baseline `npm run test:backend` from `tools/story-explorer` passed before edits, and baseline `npm test` from `tools/story-explorer/web` passed before edits with existing React Router future-flag warnings and intentional ErrorBoundary jsdom stderr.
9. The live regression surfaces include existing backend and frontend tests: `tools/story-explorer/test/record-card.test.ts` already covers deterministic summary lines, and `tools/story-explorer/web/src/components/xray/__tests__/RecordCardRenderers.test.tsx` already covers STCHAR compact-line parts. These test files are same-seam proof fallout and are included in this ticket.
10. The drafted implementation snippet was incomplete: if only the second `firstMeaningfulString` pass skips `status`, the third `firstFieldValue(body, rule.primaryFields)` pass can still return STCHAR `status: "active"`. The live fix excludes `status` from both fallback candidate lists so a status-only STCHAR reaches the `${id} (STCHAR)` fallback.

## Architecture Check

1. Two surgical changes at two distinct surfaces — the view-model walker (root cause for uninformative summary) and the STCHAR CompactLine renderer (root cause for duplicated word). Each is a small change at the exact point of the bug.
2. The alternative — adding a deduplication pass to the CompactLine renderer — is a band-aid that masks the underlying issue (the summaryLine is uninformative). Better to fix the summary at the source.
3. No backwards-compatibility shim. The `chips()` cleanup landed in the prior session (per user's session note about removing the dead `chips[]` surface).
4. The fix preserves the CompactLine renderer's design intent: for STCHAR, surface `[recordId, STENT count, sourceChar, supersessionStatus]` — drop the `title()` slot that only ever produced the summaryLine fallback.

## Verification Layers

1. Playwright route smoke on the built local server, page-detail route showing STCHAR cards: title of any STCHAR card does NOT contain the substring `active · active` (the consecutive duplication pattern).
2. Playwright route smoke on the built local server: for STCHAR cards whose underlying record has no `display_name` / `name` / `title` field, the `<p class="record-card__line">` does not contain the bare string `active` — it contains the `${id} (${recordClass})` fallback.
3. The existing STCHAR record-card tests still pass, and regression coverage now asserts that a STCHAR with `status: active` and no `title`/`name`/`display_name` field does not render `active` as the summary fallback or duplicate that fallback in the compact title.
4. `npm run test:backend` passes from `tools/story-explorer` (backend record-card view-model).
5. `npm test` passes from `tools/story-explorer/web` (frontend renderer).
6. `npm run build:backend` passes from `tools/story-explorer` AND `npm run build` passes from `tools/story-explorer/web` (these are the package-local typecheck lanes — no separate `typecheck` script exists in either `package.json`).

## Landed Changes

### 1. Skip the STCHAR status field in fallback summary passes in `tools/story-explorer/src/read/record-card.ts`

Modified the `summaryLine` function so literal `status` fields are excluded from both the second `firstMeaningfulString` call and the raw primary-reference fallback. The landed shape:

```ts
function summaryLine(recordId: string, body: ParsedRecord, rule: SummaryRule): string {
  const explicit = firstMeaningfulString(body, EXPLICIT_SUMMARY_FIELDS);
  if (explicit !== null) {
    return explicit;
  }

  const primarySummaryFields = rule.primaryFields.filter((field) => field !== "status");
  const classSpecificFields = [...primarySummaryFields, ...DEFAULT_MEANINGFUL_FIELDS].filter((field) => field !== "status");
  const classSpecific = firstMeaningfulString(body, classSpecificFields);
  if (classSpecific !== null) {
    return classSpecific;
  }

  const classSpecificReference = firstFieldValue(body, primarySummaryFields);
  if (classSpecificReference !== null) {
    return classSpecificReference;
  }

  const id = stringValue(body.id);
  if (id !== null) {
    return `${id} (${recordClass(recordId)})`;
  }

  return `Untitled ${recordClass(recordId)} record`;
}
```

For STCHAR, the `status` field at `rule.primaryFields[3]` is dropped from both fallback scans, and the walker now falls through to the `${id} (${recordClass(recordId)})` fallback when no descriptive field exists. For records with a meaningful `title` / `name` / `display_name` populated, behavior is unchanged because the explicit pass and the early primaryFields entries still resolve. Non-`status` status-like fields, such as STSTAT `life`, remain unchanged.

### 2. Drop the `title()` slot from the STCHAR CompactLine renderer in `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx`

Modified the STCHAR renderer:

```tsx
STCHAR: (recordCard) =>
  renderParts(
    recordCard.recordId,
    maybe('STENT', linkCount(recordCard, 'STENT')),
    maybe('CHAR', fieldValue(recordCard, 'sourceChar')),
    fieldValue(recordCard, 'supersessionStatus'),
    fieldValue(recordCard, 'regenerationReason'),
  ),
```

The `title(recordCard)` slot at position 2 was removed. The render is now `[recordId, "STENT N", "CHAR CHAR-0003", supersessionStatus, regenerationReason]`. The `<p class="record-card__line">` below the title (rendering `recordCard.summaryLine`, fixed by Change 1) handles the descriptive summary; the title row no longer carries a redundant fallback.

## Files to Touch

- `tools/story-explorer/src/read/record-card.ts` (modify)
- `tools/story-explorer/test/record-card.test.ts` (modify)
- `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/__tests__/RecordCardRenderers.test.tsx` (modify)

## Out of Scope

- Adding a `display_name` field to STCHAR's `EXPLICIT_SUMMARY_FIELDS`. The `EXPLICIT_SUMMARY_FIELDS` set is shared across all record classes and already covers `display_name` for any record that uses it. STCHAR records that populate `display_name` will resolve their summary at the explicit pass without changes.
- Auditing other record-class CompactLine renderers (BR, CHC, CLK, CNSQ, ...) for similar redundancy with their respective summaryLine fallbacks. STCHAR is the empirically-observed regression on PG-5; other classes can be audited as a follow-up if they exhibit the same pattern.
- Reworking the `chips()` function in `record-card.ts:313-328` or the `chips: RecordChip[]` field on `RecordCard` — already cleaned up in the prior session per user note.
- Restructuring `EXPLICIT_SUMMARY_FIELDS`, `DEFAULT_MEANINGFUL_FIELDS`, or the four-pass summary-line walker shape. The scoped fallback-field filtering is sufficient.

## Acceptance Criteria

### Tests That Must Pass

1. Existing `tools/story-explorer/test/record-card.test.ts` passes, with an added unit test for a STCHAR record whose body has `{ status: "active" }` and asserts the returned summary is `${id} (STCHAR)`, not `"active"`.
2. On `http://127.0.0.1:5174/worlds/erotica-world/stories/red-bunny/pages/PG-5`, every STCHAR card title NOT containing the consecutive `active · active` pattern.
3. On the same route, no STCHAR card's `<p class="record-card__line">` contains the bare text `active` — it either contains a meaningful descriptor OR is omitted via the `recordCard.summaryLine ? ... : null` guard at `RecordCardCompact.tsx:27`.
4. `npm run test:backend` passes from `tools/story-explorer`.
5. `npm test` passes from `tools/story-explorer/web`.
6. `npm run build:backend` passes from `tools/story-explorer` AND `npm run build` passes from `tools/story-explorer/web`.

### Invariants

1. STCHAR `summaryLine(recordId, body, rule)` never returns the bare `status` enum from `body`; literal `status` enums are not summary candidates for status-only STCHAR cards.
2. The STCHAR CompactLine title never contains the same enum value twice from two different source fields.
3. For STCHAR records with no `title` / `name` / `display_name` populated, the summary line is either omitted or shows the `${id} (STCHAR)` fallback — never just `active`.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/record-card.test.ts` — added a unit test exercising `summaryLine` through `buildRecordCard` with a STCHAR body of `{ status: "active" }` and asserting the result is `STCHAR-99 (STCHAR)`, not `"active"`.
2. `tools/story-explorer/web/src/components/xray/__tests__/RecordCardRenderers.test.tsx` — updated STCHAR compact-line expectations and added a regression test that proves the summary fallback is not inserted into the title before `supersession_status: active`.

### Commands

1. `npm run test:backend` from `tools/story-explorer`
2. `npm test` from `tools/story-explorer/web`
3. `npm run build:backend` from `tools/story-explorer` (package-local typecheck lane)
4. `npm run build` from `tools/story-explorer/web` (package-local typecheck lane)
5. Route smoke: start the built backend with `node dist/src/cli.js --port 5174 --repo-root /home/joeloverbeck/projects/worldloom`, open `/worlds/erotica-world/stories/red-bunny/pages/PG-5`, and confirm STCHAR titles omit the duplicate `active` fallback while summary lines show the record-id fallback.

## Outcome

STCHAR summary generation now excludes bare `status` enum fields from fallback summary candidates, including the raw primary-reference fallback that would otherwise still return `active`. A status-only STCHAR now renders `STCHAR-<n> (STCHAR)` as its summary line.

STCHAR compact titles no longer include the `title(recordCard)` fallback slot, so live PG-5 cards render as `STCHAR-1 · STENT 1 · CHAR CHAR-0003 · active` rather than carrying both summary fallback and supersession status in the heading.

## Verification Result

1. Baseline before edits: `npm run test:backend` from `tools/story-explorer` passed.
2. Baseline before edits: `npm test` from `tools/story-explorer/web` passed with existing React Router future-flag warnings and intentional ErrorBoundary jsdom stderr.
3. Final backend proof: `npm run test:backend` from `tools/story-explorer` passed; 15 compiled Node test files passed, including the new STCHAR summary regression.
4. Final frontend proof: `npm test` from `tools/story-explorer/web` passed; 76 Vitest files / 185 tests passed, including the new STCHAR compact-line regression. The suite still emits the same React Router future-flag warnings and intentional ErrorBoundary jsdom stderr.
5. Type/build proof: `npm run build:backend` from `tools/story-explorer` passed.
6. Type/build proof: `npm run build` from `tools/story-explorer/web` passed.
7. Route smoke: after starting `node dist/src/cli.js --port 5174 --repo-root /home/joeloverbeck/projects/worldloom`, the PG-5 route rendered STCHAR cards with headings such as `STCHAR-1 · STENT 1 · CHAR CHAR-0003 · active` and summary lines such as `STCHAR-1 (STCHAR)`. A Playwright DOM probe found no `active · active` pattern and no bare `active` summary immediately before the status chip.

## Deviations

1. The drafted `rule.statusField`-wide filtering was narrowed to literal `status` filtering. Existing STSTAT behavior intentionally uses `life: "alive"` as a summary, and the backend regression suite confirms that remains unchanged.
2. The drafted route smoke named Puppeteer and Vite dev mode; the completed proof used the repo-local Playwright CLI against the built Story Explorer server on port 5174. The first server start hit sandbox `EPERM` and was rerun with approval; the first Playwright wrapper help probe hit sandboxed npm DNS failure and was rerun with network approval.
3. `tools/story-explorer/dist/`, `tools/story-explorer/web/dist/`, and existing package `node_modules/` directories are ignored verification artifacts. `.playwright-cli/` was generated during the browser smoke and removed before closeout.
