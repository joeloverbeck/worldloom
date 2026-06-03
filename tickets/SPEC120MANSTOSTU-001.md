# SPEC120MANSTOSTU-001: User-facing "archived" → "inactive" labels + model tooltip

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` web UI (`RecordCard`, `Records`, `BeatTemplates`). No backend, no schema, no canon surface.
**Deps**: None

## Problem

Manual Studio records are mutable current truth, not an append-only ledger, but the web UI still shows "archived" lifecycle vocabulary — implying a retirement/archive model the tool deliberately rejects. Replace the user-facing "archived" wording with "inactive" at all four sites, and state the lifecycle model once near the inactive toggle so the author sees what "inactive" vs "deleted" means.

## Assumption Reassessment (2026-06-02)

1. Codebase: four user-facing "archived" sites confirmed — `web/src/components/RecordCard.tsx:88` (`summary.active ? "" : "(archived)"`), `web/src/pages/Records.tsx:258` ("include archived" checkbox label), `web/src/pages/BeatTemplates.tsx:189` ("Include archived" checkbox label), and `web/src/pages/BeatTemplates.tsx:266` ("(archived)" list badge rendered when `!tpl.active`). The fourth site (`:266`) was missed by the spec's original three-site survey and added during `/reassess-spec` 2026-06-02.
2. Specs/docs: SPEC-120 §2 in-scope items 1 + 4, §4 item-1 enumeration, and Acceptance Criteria #1 + #4. The `active` boolean field itself stays (§Out of scope) — only the displayed word changes.
3. Cross-artifact boundary: the `tools/manual-story-studio` web UI vocabulary surface (three React components). No backend / schema / skill / canon boundary is crossed — this is display-string-only within one package.

## Architecture Check

1. A pure display-string swap plus one static affordance is the minimal change that achieves vocabulary coherence; it leaves the `active`/inactive boolean model and all filtering logic untouched. Cleaner than introducing a derived "status label" abstraction the tool does not need.
2. No backwards-compatibility aliasing/shims — the strings are replaced outright, not dual-rendered.

## Verification Layers

1. No user-facing "archived" display string remains -> codebase grep-proof (`grep -rni "archived" tools/manual-story-studio/web/src` shows only non-user-facing identifier hits such as `includeArchived`, pending ticket 002).
2. All four sites render "inactive" -> codebase grep-proof + manual review of the rendered badge/checkbox.
3. Lifecycle model statement present near the inactive toggle -> manual review.
4. Single-package UI ticket — FOUNDATIONS-alignment and schema-validation layers are not applicable (no canon, schema, or enforcement surface touched); the three layers above fully cover the change.

## What to Change

### 1. RecordCard badge

`web/src/components/RecordCard.tsx:88` — `"(archived)"` -> `"(inactive)"`.

### 2. Records page checkbox label

`web/src/pages/Records.tsx:258` — checkbox label `"include archived"` -> `"include inactive"`.

### 3. BeatTemplates page labels (two sites)

`web/src/pages/BeatTemplates.tsx:189` — checkbox label `"Include archived"` -> `"Include inactive"`; `:266` — list badge `"(archived)"` -> `"(inactive)"`.

### 4. Lifecycle model affordance

Add a one-line affordance/tooltip near the inactive toggle (Records page; mirror on BeatTemplates if the toggle is symmetric): "Inactive = kept for reference, hidden from normal selection. Deleted = file gone." Plain inline text or `title=`/`aria` affordance — no new component or state.

## Files to Touch

- `tools/manual-story-studio/web/src/components/RecordCard.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/Records.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/BeatTemplates.tsx` (modify)

## Out of Scope

- The `active` boolean field and any filtering/selection logic (unchanged — only rendered text differs).
- The `includeArchived` -> `includeInactive` param rename (ticket SPEC120MANSTOSTU-002).
- `retired_reason` removal (ticket SPEC120MANSTOSTU-003).
- Any delete / force-delete behavior (owned by SPEC-114, correct, not touched).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rni "archived" tools/manual-story-studio/web/src` returns only non-user-facing identifier hits (e.g. `includeArchived` until 002 lands) — zero user-facing "archived"/"archive" display strings.
2. `cd tools/manual-story-studio && npm --prefix web test` (web typecheck) passes.
3. Manual review: the inactive badge, both checkboxes, and the new model-statement affordance read "inactive"/the lifecycle sentence in the running UI.

### Invariants

1. The `active`/inactive boolean model is unchanged — only rendered text differs.
2. No behavior change to filtering, selection, or delete.

## Test Plan

### New/Modified Tests

1. `None — display-string + static-affordance change; existing web typecheck covers compilation.` (Optionally extend `tools/manual-story-studio/test/web/records-delete-ux.test.ts` to assert the "inactive" wording, but not required.)

### Commands

1. `cd tools/manual-story-studio && npm --prefix web test`
2. `grep -rni "archived" tools/manual-story-studio/web/src` (expect zero user-facing display-string hits)
3. A narrower web-only typecheck is the correct boundary here because the ticket touches no backend code; the full `npm test` is unnecessary for a display-string change.
