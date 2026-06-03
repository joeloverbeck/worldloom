# SPEC120MANSTOSTU-001: User-facing "archived" → "inactive" labels + model tooltip

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` web UI (`RecordCard`, `Records`, `BeatTemplates`). No backend, no schema, no canon surface.
**Deps**: None

## Problem

At intake, Manual Studio records were mutable current truth, not an append-only ledger, but the web UI still showed "archived" lifecycle vocabulary — implying a retirement/archive model the tool deliberately rejects. This ticket replaced the user-facing "archived" wording with "inactive" at all four sites, and states the lifecycle model near the inactive toggles so the author sees what "inactive" vs "deleted" means.

## Assumption Reassessment (2026-06-02)

1. Codebase: four user-facing "archived" sites confirmed — `web/src/components/RecordCard.tsx:88` (`summary.active ? "" : "(archived)"`), `web/src/pages/Records.tsx:258` ("include archived" checkbox label), `web/src/pages/BeatTemplates.tsx:189` ("Include archived" checkbox label), and `web/src/pages/BeatTemplates.tsx:266` ("(archived)" list badge rendered when `!tpl.active`). The fourth site (`:266`) was missed by the spec's original three-site survey and added during `/reassess-spec` 2026-06-02.
2. Specs/docs: SPEC-120 §2 in-scope items 1 + 4, §4 item-1 enumeration, and Acceptance Criteria #1 + #4. The `active` boolean field itself stays (§Out of scope) — only the displayed word changes.
3. Cross-artifact boundary: the `tools/manual-story-studio` web UI vocabulary surface (three React components). No backend / schema / skill / canon boundary is crossed — this is display-string-only within one package.

## Architecture Check

1. A pure display-string swap plus one static affordance is the minimal change that achieves vocabulary coherence; it leaves the `active`/inactive boolean model and all filtering logic untouched. Cleaner than introducing a derived "status label" abstraction the tool does not need.
2. No backwards-compatibility aliasing/shims — the strings are replaced outright, not dual-rendered.

## Verification Layers

1. No user-facing "archived" display string remains -> codebase grep-proof (`rg -n 'archived' tools/manual-story-studio/web/src` returns no hits).
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

## Outcome

Completed: 2026-06-03

The Manual Studio web UI now renders inactive record/template labels as `(inactive)`, changes both include toggles to "include inactive" / "Include inactive", and shows the one-line model statement near the Records and Beat Templates inactive toggles: "Inactive = kept for reference, hidden from normal selection. Deleted = file gone."

No filtering, selection, delete behavior, backend code, schema code, or `active` boolean contract changed. The active SPEC-120 spec now has an implementation note marking the UI-label slice as complete while leaving `includeArchived` and `retired_reason` as historical intake context for sibling tickets.

## Verification Result

Commands run from the repository checkout:

1. `npm --prefix web test` from `tools/manual-story-studio` — PASS; web TypeScript compile completed with `tsc -p tsconfig.json --noEmit`.
2. `rg -n 'archived' tools/manual-story-studio/web/src` — PASS; no hits, so no user-facing web UI `archived` display string remains.

Manual review confirmed the four owned sites now say `inactive` and the lifecycle model statement appears next to both inactive toggles.

## Deviations

- The model statement was mirrored on both Records and Beat Templates because both pages have an include-inactive toggle. This keeps the symmetric UI controls self-explanatory without adding behavior or a new component.
