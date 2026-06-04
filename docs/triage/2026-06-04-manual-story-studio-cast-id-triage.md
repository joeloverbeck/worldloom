# Triage — Manual Story Studio cast member (Ane Arrieta) not selectable

**Date**: 2026-06-04
**Trigger**: Diagnostic request — cast member Ane Arrieta is on file but unselectable across four Manual Story Studio surfaces. Analyze (Puppeteer + code) and file fix tickets aligned with `docs/FOUNDATIONS.md`.
**Classification**: tooling-adjacent (Manual Story Studio is a standalone local writing cockpit — `No LLM, no MCP, no patch engine`; `manual-story` bundles are not `_source/` story-bundle records).
**Shape**: no-source-report diagnostic. No formal report was triaged; all findings are auditor-discovered (`O<N>`). No verdict buckets apply.
**Outcome**: 3 tickets — `MSSUX-010`, `MSSUX-011`, `MSSUX-012` (user-selected "All 3").

## Root cause (single)

`worlds/erotica-world/manual-stories/red-bunny/records/cast/mchar-1.yaml` was persisted with an empty `id` field (`id: ""`) while its filename was correct (`mchar-1.yaml`). Every reported symptom is a faithful downstream consequence; the React layer is not at fault (it consistently keys off `summary.id`).

Confirmed at three levels:
- **Code**: write-path clobber + missing id validation (below).
- **Live API**: `GET …/records?class=cast` → `{"id":"",…}`; `POST …/template-candidates {"selected_cast":[""]}` → `400 invalid_id_shape` (control `[]` → 200); `GET …/records/cast/` (empty id) → 400.
- **Puppeteer**: clicking Ane's card on `…/records?class=cast` → `navigated: false` (no-op).

### Symptom → cause map

| Surface | Reported symptom | Mechanism |
|---|---|---|
| `…/prompt-working-set/edit` | "Invalid cast IDs:" (empty) | `EditPromptWorkingSet.tsx:171` flags ids failing the `mchar-` prefix; selecting Ane contributes `""`. |
| `…/cast` | card click does nothing | `RecordCard` calls `onOpen(summary.id)` = `onOpen("")`; `""` is falsy → no detail/navigation. |
| `…/records?class=cast` | card click does nothing | Same `summary.id === ""` no-op. |
| `…/moment-composer` | involved-cast no-op + `template-candidates` 400 | Handler calls `readRecord(root,"cast","")`; `^mchar-\d+$` shape check fails → `invalid_id_shape` → 400. |

## Findings (out-of-report)

### O1 — Create path clobbers the allocated id → **MSSUX-010**
`createRecord` (`src/write/records.ts`) composes `{ id, ...body }` — body spread last, so the form's `id: ""` overwrites the allocated `mchar-1`. Sibling `updateRecord` correctly uses `{ ...body, id }`. Answers the user's "why isn't the id set?".

### O2 — Id validation is not fail-closed → **MSSUX-010**
`validateRecord`/`MANUAL_RECORD_SCHEMAS` treat `id` as a plain `string`; `""` passes. No `^<prefix>-[0-9]+$` check. Beat-templates already enforce `^mtemplate-\d+$` (`BEAT_TEMPLATE_ID_PATTERN`); the 18 generic `SchemaDef` classes do not. Answers the user's "why was the file able to be created at all?" — and is the direct FOUNDATIONS-002 violation.

### O3 — Existing record on disk is corrupt → **MSSUX-011**
`mchar-1.yaml` has `id: ""` now; a code fix does not heal existing data. Repairing `id → mchar-1` is the immediate live unblock for all four surfaces.

### O4 — Read path silently propagates the bad id → **MSSUX-012** (defense-in-depth)
`listRecords`/`toSummary` surface the body `id` (`obj.id`), not the filename stem, so one corrupt file silently breaks every consumer with no diagnostic. Making the filename authoritative at read (and surfacing non-empty mismatches loudly) enforces FOUNDATIONS-002 at the read boundary for files that bypass the studio write path (manual edits, `SourceBrowser` import, pre-fix files).

## FOUNDATIONS alignment

| Principle | Stance | Rationale (surface) |
|---|---|---|
| FOUNDATIONS-002 — filename ≡ `id`; checks use `^<CLASS>-[0-9]+$` | aligns | MSSUX-010 enforces it on write (validator gate); MSSUX-011 restores it for the stored record; MSSUX-012 enforces it at the read boundary. |
| Validator Framework — structural id integrity enforced fail-closed (§Machine-Facing Layer) | aligns | MSSUX-010 turns id-shape from "accepted any string" to a fail-closed validation error, matching the beat-template precedent. |
| Tooling Recommendation — determinism / no silent corruption | aligns | MSSUX-012 replaces silent propagation of a bad id with a visible structured signal. |

## Deliverables

| Ticket | Scope | Priority |
|---|---|---|
| `archive/tickets/MSSUX-010-cast-record-id-integrity-and-fail-closed-validation.md` | O1+O2 — create-path id authority + fail-closed id validation | HIGH — completed |
| `archive/tickets/MSSUX-011-repair-corrupt-cast-record-id.md` | O3 — data repair (`id: "" → mchar-1`) | HIGH — completed |
| `archive/tickets/MSSUX-012-read-path-filename-authoritative-id-guard.md` | O4 — read-path filename-authoritative id (defense-in-depth) | MEDIUM — completed |

**Suggested order**: MSSUX-011 (immediate unblock) → MSSUX-010 (prevent recurrence) → MSSUX-012 (harden read boundary). MSSUX-011 can be applied first independently; MSSUX-010 then guarantees no new corruption; MSSUX-012 catches any future out-of-band divergence.

## Assumptions

1. `cast_order: []` in `manual-story.yaml` is author-controlled and not part of this defect (selectable cast is read from `records/cast/`, not `cast_order`) — left untouched.
2. Only one corrupt record exists (`records/cast/` contains a single file), so no scan-and-repair migration is warranted.
3. Repairing a `manual-stories/` record by direct edit is not a HARD-GATE/patch-engine bypass — Hook 3 covers only `_source/<subdir>/*.yaml`; manual-story records are studio-owned.
