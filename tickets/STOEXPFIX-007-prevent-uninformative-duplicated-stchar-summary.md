# STOEXPFIX-007: Prevent uninformative duplicated `active` text in STCHAR record-card titles

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — changes confined to `tools/story-explorer/src/read/record-card.ts` and `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx`
**Deps**: None

## Problem

In the X-Ray Current State tab on any page-detail route (e.g., `/worlds/erotica-world/stories/red-bunny/pages/PG-5`), STCHAR record cards render a title that repeats the word `active` twice and a follow-up summary line that also reads `active`. Example title:

```
STCHAR-1 · active · STENT 1 · CHAR CHAR-0003 · active
```

Below the title (in the `<p class="record-card__line">` element), the same `active` appears again as a stand-alone paragraph. The card surfaces no informative identification of the STCHAR record beyond its ID — the user sees `active` three times and learns nothing about which character authority profile this is.

Verified DOM evidence: on PG-5, every visible STCHAR card (STCHAR-1, STCHAR-2, STCHAR-3, ...) follows the same pattern. The duplication arises from two coupled causes that together produce the visible repetition:

1. **`summaryLine` walker selects `status` as a fallback summary**: `tools/story-explorer/src/read/record-card.ts:289-310` calls `firstMeaningfulString(body, [...rule.primaryFields, ...DEFAULT_MEANINGFUL_FIELDS])`. For STCHAR (`rule.primaryFields = ["title", "name", "display_name", "status"]` per `record-card.ts:130-135`), if the underlying record has no `title` / `name` / `display_name` populated, the walker accepts the `status` field's value (`"active"`) as a meaningful summary and returns it. The summary becomes the bare enum value.
2. **STCHAR CompactLine renderer adds a second `active` from a different field**: `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx:243-251` composes the title as `[recordCard.recordId, title(recordCard), maybe('STENT', linkCount(...)), maybe('CHAR', fieldValue(...sourceChar)), fieldValue(supersessionStatus), fieldValue(regenerationReason)]`. The `title(recordCard)` helper at `RecordCardRenderers.tsx:111-113` returns `fieldValue(recordCard, 'title') ?? recordCard.summaryLine`, which for STCHAR falls back to the `summaryLine` from cause 1 (= `"active"`). Then `fieldValue(recordCard, 'supersessionStatus')` independently returns `"active"` because both the bound character's `status` and the STCHAR's `supersessionStatus` happen to be the enum value `active` in the current fixture. Two different fields, same enum value, both included in the title.

The `<p class="record-card__line">` below the title (`RecordCardCompact.tsx:27`) renders `recordCard.summaryLine` directly, which is also `"active"` — a third visible instance of the same string.

## Assumption Reassessment (2026-05-26)

1. `tools/story-explorer/src/read/record-card.ts:130-135` defines the STCHAR summary rule: `primaryFields: ["title", "name", "display_name", "status"], secondaryFields: ["profile_kind", "source_char_id", "created_from"], statusField: "status"`. The `primaryFields` list includes `status` as the fourth fallback, which is the source of the uninformative summary line.
2. `tools/story-explorer/src/read/record-card.ts:205` defines `EXPLICIT_SUMMARY_FIELDS = ["title", "label", "name", "display_name", "objective", "claim"]`. `summaryLine()` at `record-card.ts:289` calls `firstMeaningfulString(body, EXPLICIT_SUMMARY_FIELDS)` first; this set explicitly excludes `status`, which is correct (a status enum is not a summary). But when the explicit set returns null, the walker falls through to `firstMeaningfulString(body, [...rule.primaryFields, ...DEFAULT_MEANINGFUL_FIELDS])` which DOES include `status` via STCHAR's `primaryFields[3]`.
3. The fix at the view-model layer is to constrain `firstMeaningfulString`'s second-pass scan to skip the field named by `rule.statusField` when one is declared — the rule already knows that field is a status enum and not a summary candidate. This is a minimal targeted change that preserves the existing fallback chain for records that genuinely need a non-status fallback summary.
4. The CHAR CompactLine renderer at `RecordCardRenderers.tsx:243-251` includes BOTH `title(recordCard)` (which falls back to summaryLine) AND `fieldValue(recordCard, 'supersessionStatus')`. When the STCHAR record's `status` and its bound CHAR's record state both happen to be the enum value `active`, the same string ends up at title positions 2 and 5. The cleanest fix is to drop position 2 entirely for STCHAR — the CompactLine for STCHAR was clearly designed to render `[recordId, STENT linkCount, sourceChar, supersessionStatus]`; the `title()` helper at position 2 only adds value when the STCHAR has an explicit `title` field populated, and for the present worldloom story-bundle schema, STCHAR records do NOT have a `title` field (per the schema in `.claude/skills/_shared-templates/story-state-contract.md`).
5. Verifying the schema claim: `tools/story-explorer/src/read/record-card.ts:130-135` lists `"title", "name", "display_name"` in STCHAR's primaryFields. The story-state contract for STCHAR uses `display_name` (and possibly `name`) — never `title`. The `title` entry is anticipatory rather than schema-grounded. Removing the `title(recordCard)` slot from STCHAR's CompactLine is therefore safe: it never resolved to a real `title` field; it only ever surfaced the summaryLine fallback that's already redundant with the `<p class="record-card__line">` below the title.
6. The `<p class="record-card__line">` rendering of `recordCard.summaryLine` at `tools/story-explorer/web/src/components/xray/RecordCardCompact.tsx:27` is generally useful — it surfaces a one-liner about the record's content. The fix at cause (1) (the summaryLine walker) makes that line informative again (the walker will pick a non-status meaningful field, or fall through to the `${id} (${recordClass})` form at `record-card.ts:305-308`); we do NOT need to suppress the `<p>`.
7. No FOUNDATIONS principle is engaged. The story-explorer is a read-only human surface over `_source/`; record-card summary rendering is presentation, not canon storage or validation.

## Architecture Check

1. Two surgical changes at two distinct surfaces — the view-model walker (root cause for uninformative summary) and the STCHAR CompactLine renderer (root cause for duplicated word). Each is a small change at the exact point of the bug.
2. The alternative — adding a deduplication pass to the CompactLine renderer — is a band-aid that masks the underlying issue (the summaryLine is uninformative). Better to fix the summary at the source.
3. No backwards-compatibility shim. The `chips()` cleanup landed in the prior session (per user's session note about removing the dead `chips[]` surface).
4. The fix preserves the CompactLine renderer's design intent: for STCHAR, surface `[recordId, STENT count, sourceChar, supersessionStatus]` — drop the `title()` slot that only ever produced the summaryLine fallback.

## Verification Layers

1. Puppeteer assertion on the live dev server, page-detail route showing STCHAR cards: title of any STCHAR card does NOT contain the substring `active · active` (the consecutive duplication pattern).
2. Puppeteer assertion: for any STCHAR card whose underlying record has no `display_name` / `name` / `title` field, the `<p class="record-card__line">` does not contain the bare string `active` — it contains either a meaningful non-status string or the `${id} (${recordClass})` fallback.
3. The existing test for STCHAR record cards (if any in `tools/story-explorer/test/`) still passes; add a regression test that asserts the title of a STCHAR with `status: active` and no `title`/`name`/`display_name` field is NOT `active · ... · active`.
4. `npm run test:backend` passes from `tools/story-explorer` (backend record-card view-model).
5. `npm test` passes from `tools/story-explorer/web` (frontend renderer).
6. `npm run build:backend` passes from `tools/story-explorer` AND `npm run build` passes from `tools/story-explorer/web` (these are the package-local typecheck lanes — no separate `typecheck` script exists in either `package.json`).

## What to Change

### 1. Skip the status field in `firstMeaningfulString`'s second pass in `tools/story-explorer/src/read/record-card.ts`

Modify the `summaryLine` function at `record-card.ts:289-310` so the second `firstMeaningfulString` call excludes the rule's `statusField`. The minimal shape:

```ts
function summaryLine(recordId: string, body: ParsedRecord, rule: SummaryRule): string {
  const explicit = firstMeaningfulString(body, EXPLICIT_SUMMARY_FIELDS);
  if (explicit !== null) {
    return explicit;
  }

  const classSpecificFields = [...rule.primaryFields, ...DEFAULT_MEANINGFUL_FIELDS].filter(
    (field) => field !== rule.statusField,
  );
  const classSpecific = firstMeaningfulString(body, classSpecificFields);
  if (classSpecific !== null) {
    return classSpecific;
  }

  const classSpecificReference = firstFieldValue(body, rule.primaryFields);
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

The `.filter((field) => field !== rule.statusField)` is the one-line change; everything else is preserved. For STCHAR (`rule.statusField === 'status'`), the `status` field at `rule.primaryFields[3]` is dropped from the second-pass scan, and the walker now falls through to the third pass (`firstFieldValue(body, rule.primaryFields)` which returns the raw field reference) or the fourth pass (`${id} (${recordClass(recordId)})`). For records with a meaningful `title` / `name` / `display_name` populated, behavior is unchanged because the explicit pass and the early primaryFields entries still resolve.

### 2. Drop the `title()` slot from the STCHAR CompactLine renderer in `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx`

Modify `RecordCardRenderers.tsx:243-251`:

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

The `title(recordCard)` slot at position 2 is removed. The render becomes `[recordId, "STENT N", "CHAR CHAR-0003", supersessionStatus, regenerationReason]`. The `<p class="record-card__line">` below the title (rendering `recordCard.summaryLine`, fixed by Change 1) handles the descriptive summary; the title row no longer carries a redundant fallback.

## Files to Touch

- `tools/story-explorer/src/read/record-card.ts` (modify)
- `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx` (modify)

## Out of Scope

- Adding a `display_name` field to STCHAR's `EXPLICIT_SUMMARY_FIELDS`. The `EXPLICIT_SUMMARY_FIELDS` set is shared across all record classes and already covers `display_name` for any record that uses it. STCHAR records that populate `display_name` will resolve their summary at the explicit pass without changes.
- Auditing other record-class CompactLine renderers (BR, CHC, CLK, CNSQ, ...) for similar redundancy with their respective summaryLine fallbacks. STCHAR is the empirically-observed regression on PG-5; other classes can be audited as a follow-up if they exhibit the same pattern.
- Reworking the `chips()` function in `record-card.ts:313-328` or the `chips: RecordChip[]` field on `RecordCard` — already cleaned up in the prior session per user note.
- Restructuring `EXPLICIT_SUMMARY_FIELDS`, `DEFAULT_MEANINGFUL_FIELDS`, or the four-pass summary-line walker shape. The single `.filter` change is sufficient.

## Acceptance Criteria

### Tests That Must Pass

1. Existing `tools/story-explorer/test/read/record-card.test.ts` (if present) passes; otherwise add a small unit test for `summaryLine` with a STCHAR record whose body has `{ status: "active" }` and asserts the returned summary is `${id} (STCHAR)` (the recordId-with-class form), not `"active"`.
2. On `http://127.0.0.1:5174/worlds/erotica-world/stories/red-bunny/pages/PG-5`, every STCHAR card title NOT containing the consecutive `active · active` pattern.
3. On the same route, no STCHAR card's `<p class="record-card__line">` contains the bare text `active` — it either contains a meaningful descriptor OR is omitted via the `recordCard.summaryLine ? ... : null` guard at `RecordCardCompact.tsx:27`.
4. `npm run test:backend` passes from `tools/story-explorer`.
5. `npm test` passes from `tools/story-explorer/web`.
6. `npm run build:backend` passes from `tools/story-explorer` AND `npm run build` passes from `tools/story-explorer/web`.

### Invariants

1. `summaryLine(recordId, body, rule)` never returns the value of `rule.statusField` from `body` when other primary/default fields exist; status enums are not summary candidates.
2. The STCHAR CompactLine title never contains the same enum value twice from two different source fields.
3. For STCHAR records with no `title` / `name` / `display_name` populated, the summary line is either omitted or shows the `${id} (STCHAR)` fallback — never just `active`.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/read/record-card.test.ts` (new test if file does not yet exist, or new test case if it does) — small unit test exercising `summaryLine` with a STCHAR body of `{ status: "active" }` and asserting the result is NOT `"active"`.
2. Existing `RecordCardCompact` rendering tests — if any explicitly assert the `record-card__line` content for STCHAR, update them to reflect the new summary fallback.

### Commands

1. `npm run test:backend` from `tools/story-explorer`
2. `npm test` from `tools/story-explorer/web`
3. `npm run build:backend` from `tools/story-explorer` (package-local typecheck lane)
4. `npm run build` from `tools/story-explorer/web` (package-local typecheck lane)
5. Manual visual check: `npm run dev` from `tools/story-explorer/web`, open `/worlds/erotica-world/stories/red-bunny/pages/PG-5`, scroll to the Cast & Status group, expand it, confirm STCHAR card titles read sensibly and the `<p>` summary below the title is either omitted or informative.
