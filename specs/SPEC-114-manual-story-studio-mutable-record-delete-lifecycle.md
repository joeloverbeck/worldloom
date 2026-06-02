# SPEC-114 — Manual Story Studio: Mutable-Record Delete Lifecycle (Block-on-Referrer, Repair-Mode Force-Delete)

**Status:** DRAFT
**Date:** 2026-06-02
**Classification:** tooling-adjacent (backend delete-flow correction + frontend delete UX; no canon-pipeline integration).
**Depends on:** archive/specs/SPEC-101-manual-story-metadata-and-records.md (the record read/write layer whose delete path this spec corrects), archive/specs/SPEC-112-manual-story-studio-record-pickers.md (referrer cards in the block-on-referrer flow reuse the archived extended `RecordCard` surface).
**Blocks:** —
**Related:** `tools/manual-story-studio/src/write/records.ts`, `tools/manual-story-studio/src/read/records.ts`, `tools/manual-story-studio/src/schema/manual-story.ts`, `tools/manual-story-studio/src/server/routes/records.ts`, `tools/manual-story-studio/web/src/pages/Records.tsx`, `tools/manual-story-studio/web/src/api/records.ts`.
**Source:** critical triage of `reports/manual-story-studio-third-iteration.md` §10 / §30 / §39 Stage 5 (ChatGPT-Pro, 2026-06-02). Accepted on **product-coherence grounds, not FOUNDATIONS grounds** — see §1.1. The report's §7 framing of this as a FOUNDATIONS "drift" is corrected: the tool writes only under `manual-stories/`, never world canon, so there is no canon-integrity violation; the issue is that the delete lifecycle contradicts the clarified product brief ("records are mutable current truth").

---

## Implementation Notes

- **2026-06-02:** `archive/tickets/SPEC114MANSTOSTU-001.md`, `archive/tickets/SPEC114MANSTOSTU-002.md`, and `archive/tickets/SPEC114MANSTOSTU-003.md` landed the read/backend/records-page portion: `scanReferences` now covers current-context and template sidecar referrers, `deleteRecord` now hard-deletes unreferenced records, blocks referenced records with referrer summaries, persists repair-mode force-deletes to `repair-log.yaml`, and the Records page now shows a referrer-card blocker with repair force-delete behind a collapsed disclosure. Remaining beat-template UI/route parity and docs bullets below are still active until their tickets land. Historical prose below may still describe the pre-implementation `inactive_default` behavior as intake evidence.

## 1. Context & Motivation

Verified from the tree: the records page exposes a normal **Delete** that, when the record has referrers, **archives it as `active:false`** (outcome `inactive_default`, populating `retired_reason: force-delete-blocked-by-referrers: <ids>`) and then offers a **"Force delete anyway"** button. So the default normal-flow behavior is soft-delete-as-archive with a force-delete escape hatch (`src/write/records.ts` `deleteRecord` + `Records.tsx`).

The clarified product brief (report §6, §10) is: **records are mutable current truth.** There is no supersession history, no archive layer, no lifecycle ledger — the record set *is* the state. A default that silently archives a referenced record as `active:false` reintroduces exactly the archive/supersession-lite lifecycle the brief rejects, and it produces a confusing surface: the author thinks they deleted a record, but it lingers as inactive with a machine-written `retired_reason`.

The correct normal-flow behavior (report §30):

- **Create** → **Edit in place** → **Prompt include/exclude** (SPEC-113) → **Hard-delete if no referrers** / **Block delete if referenced** (show the referrers as cards with titles, classes, summaries, edit links).
- `active:false` and force-delete are **repair-mode-only** tools, behind an explicit warning, with a repair-log entry.

### 1.1 Why this is product-coherence, not FOUNDATIONS

FOUNDATIONS (line 105 / §598 / §614) governs **world canon not encoding story-bundle execution state**, and Hook 3 blocks direct writes to `_source/`. Manual Studio writes only under `worlds/<slug>/manual-stories/<slug>/`, which is **outside both world canon and the story-bundle `_source/` pipeline**. So the archive/supersession behavior is not a canon-integrity violation — it violates the *tool's own product brief*. This spec is justified on that basis. (The report's §7 conflated the two; the correction is recorded here and in the companion triage file.)

`active` itself is retained — the brief (report §38) allows "mark active/inactive only if 'temporarily not in current story truth/relevance' is genuinely useful." What changes is that *delete* no longer auto-sets `active:false`; toggling `active` becomes an explicit, separate, author-initiated action with author-meaning, not a side effect of a blocked delete.

## 2. Scope

### In scope

1. **Normal-flow delete = hard-delete-or-block.** Rework `deleteRecord` (`src/write/records.ts`) so the **default** (non-repair) path:
   - Hard-deletes (unlink) the record when it has **no referrers**.
   - **Blocks** with a structured result listing referrers when it **has** referrers — and does **not** set `active:false`. The blocked result returns each referrer's id + class + title + summary so the UI can render referrer cards with edit links.
   - The `inactive_default` outcome (auto-archive on blocked delete) is **removed** from the normal path.
2. **Referrer resolution.** **Extend the existing `scanReferences` pass** (`src/read/records.ts:123`, already consumed by `deleteRecord` and by SPEC-108's segment delete in `src/write/segments.ts`). Do **not** mutate its `ReferrerEntry` shape (`{recordClass, id, field}`) — `segments.ts` depends on it; mutating it in place would ripple into the segment-delete path. Instead add a thin summary-resolving wrapper (e.g. `resolveReferrerSummaries`) that maps each `ReferrerEntry` to the existing `ManualRecordSummaryWithClass` shape (`{recordClass, summary}`, already in `web/src/api/records.ts` / `listRecordsForClasses`) so the UI can render `RecordCard`s (id + class + title + summary). Separately, **broaden the scan surface** beyond `records/<class>/` to also cover current-context references — `pinned_records`, `must_not_reveal`, `excluded_records`, `current_cast` (all confirmed `CurrentContext` fields) plus the other ID-bearing fields (`pov_holder`, `active_pressure_clocks`, `active_secrets_questions`, `current_location`, `last_accepted_segment`) — which `scanReferences` does **not** read today. (The raw `scanReferences` is also what archived SPEC-112's deferred referenced-by count consumes — a count needs only `.length`, no enrichment.)
3. **Repair-mode force-delete + active toggle.** Confine `force_deleted` (unlink despite referrers) to an explicit repair surface, gated behind a warning, and recorded in a `repair-log.yaml` audit entry (id, timestamp, referrers-at-deletion). Keep `active`/`retired_reason` writable only as an explicit author action (repair surface or an explicit "mark inactive" control), never as an automatic consequence of delete.
4. **Records-page delete UX.** `Records.tsx`: the normal **Delete** button either hard-deletes (no referrers) or shows a **block dialog** listing referrer cards via the extended `RecordCard` surface from archived SPEC-112, with edit links and the message "Resolve these references first." The "Force delete anyway" affordance moves out of the normal flow into the repair surface (or a clearly-marked, warning-gated disclosure), never the default next click.
5. **Beat-template delete parity.** `deleteRecord` is the **shared** backend for the `beat-templates` class (`src/server/routes/beat-templates.ts` calls `deleteRecord(root, "beat-templates", …)`; `beat-templates` ∈ `MANUAL_RECORD_CLASSES`), so this rework changes beat-template delete automatically. Bring the beat-template UX into line: `web/src/pages/BeatTemplates.tsx` and `web/src/api/beat-templates.ts` still branch on the now-removed `inactive_default` outcome (dead branches) and must move to hard-delete-or-block with referrer cards. Because templates are referenced via segment/prompt sidecars' `selected_template` (not record `refs`), the referrer pass (item 2) must also scan those sidecars when the target is an `mtemplate-*` — otherwise a template with live references would wrongly hard-delete. See §8.

### Out of scope

- Removing the `active` field or `retired_reason` field from the schema — both are retained for explicit, author-meaningful use (report §38); only the *automatic* archive-on-delete behavior is removed.
- The `includeArchived` list option + "include archived" toggle (`Records.tsx`, `listRecords`) — **retained**. With `active` kept as an explicit author affordance, viewing deliberately-inactivated records stays useful; report §10 lists `includeArchived` as residue only because it paired with auto-archive-on-delete, which this spec removes.
- Supersession chains / historical-state artifacts — never existed; not added (report §9, §10).
- Segment deletion lifecycle — already correct (SPEC-108: referenced-segment delete removes from `segment_order`/preserves files; force-delete unlinks and returns an **in-memory** audit message — SPEC-108 persists **no** log file). Untouched here. Note: this spec **introduces** the persisted `repair-log.yaml` (see §3); it is not inherited from SPEC-108.
- A general repair-mode redesign beyond the force-delete + active-toggle confinement (the broader repair surface is its own concern).

## 3. Key decisions

- **Default delete must never silently archive.** The single most confusing behavior today is "I deleted it but it's still here as inactive." Hard-delete-or-block makes the outcome unambiguous: either it's gone, or you're told what's stopping you.
- **Block by referrers, with cards, not just an id list.** The author needs to *act* on the block — the referrer cards carry edit links so the author can clear the reference and retry. An id-only error forces the author to go hunting.
- **Retain `active`, demote its auto-setting.** `active:false` as deliberate "temporarily not current truth" is useful; `active:false` as a delete side effect is the lifecycle residue. Keeping the field while removing the automatic write resolves the tension without losing a genuinely-useful affordance.
- **Force-delete is repair, and repair is logged durably.** A destructive override that ignores referrers belongs behind a warning with a **persisted** audit trail. This spec establishes `repair-log.yaml` as a per-manual-story control file at `worlds/<slug>/manual-stories/<slug>/repair-log.yaml` (non-ID-bearing, parallel to `manual-story.yaml`): an append-only YAML list of entries `{deleted_class_and_id, deleted_at (ISO-8601), referrers_at_deletion: [{recordClass, id, field}]}`, reusing the shape `deleteRecord` already returns in its in-memory `auditEntry`, now also written to disk via `safeWriteFile` (inside the existing write sandbox; read-append-write on each force-delete). *Why a file and not the existing in-memory entry:* an in-memory-only entry (SPEC-108's pattern, and the current behavior) vanishes on reload and would not honor the Rule 6 (No Silent Retcons) discipline this decision rests on — SPEC-108's in-memory-only audit is a gap this spec improves on, not a model it copies.
- **Reuse the existing `scanReferences` pass as archived SPEC-112's count source.** The same backend pass — *extended, not duplicated* — serves both the delete-block flow and the deferred referenced-by count, avoiding a second corpus scan. The summary-enrichment wrapper is additive; `ReferrerEntry` stays unchanged for the SPEC-108 segment-delete consumer in `src/write/segments.ts`.

## 4. Files to touch

**Modify:**

- `tools/manual-story-studio/src/write/records.ts` — rework `deleteRecord`: default path = hard-delete-if-unreferenced / block-with-referrers (no `inactive_default`); `force_deleted` confined to a repair flag and **appends** an entry to `repair-log.yaml` (read-append-write, per §3); stop auto-writing `active:false`/`retired_reason` on delete.
- `tools/manual-story-studio/src/read/records.ts` — **extend** the existing `scanReferences` (do not duplicate it; do not change `ReferrerEntry`): add a `resolveReferrerSummaries` wrapper returning `{recordClass, summary}` entries, and broaden the scan surface to include current-context ID fields (per §2 item 2).
- `tools/manual-story-studio/src/server/routes/records.ts` — delete route returns the structured blocked-with-referrers result; force-delete requires the explicit repair flag.
- `tools/manual-story-studio/web/src/api/records.ts` — surface the blocked-with-referrers result shape; separate the force-delete call behind the repair flag.
- `tools/manual-story-studio/web/src/pages/Records.tsx` — normal Delete → hard-delete or block dialog with referrer cards + edit links; move "Force delete anyway" out of the default flow into a warning-gated repair affordance.
- `tools/manual-story-studio/web/src/pages/BeatTemplates.tsx` — drop the `inactive_default` branch (dead after the backend change); mirror the Records-page block dialog (referrer cards) for template delete (§2 item 5).
- `tools/manual-story-studio/web/src/api/beat-templates.ts` — remove `inactive_default` from the delete-result union; surface the blocked-with-referrers shape.
- `tools/manual-story-studio/README.md` — update the delete-outcomes documentation (currently documents `inactive_default` at the "Delete outcomes" list): remove `inactive_default`; document hard-delete-or-block + repair-mode force-delete + the `repair-log.yaml` audit trail.
- `tools/manual-story-studio/test/write/records.test.ts` and `tools/manual-story-studio/test/capstone-spec101.test.ts` — rewrite the existing `inactive_default` assertions (the latter is SPEC-101 AC #5's hybrid-delete capstone) to assert block-on-referrer / no-auto-archive; left unchanged, these tests fail and AC #7 (`npm test` green) cannot pass.
- `docs/ID-ALLOCATION.md` (§Manual-story-scoped) — add a one-line note registering `repair-log.yaml` as a non-ID-bearing per-manual-story control file, parallel to the existing `manual-story.yaml` control-file note.

**Create:**

- `tools/manual-story-studio/test/write/delete-lifecycle.test.ts` — asserts: unreferenced delete hard-deletes (file unlinked); referenced delete blocks and does **not** set `active:false`; the blocked result lists referrer summaries; force-delete (repair flag) unlinks and writes a `repair-log.yaml` entry; toggling `active` is never a side effect of delete.
- `tools/manual-story-studio/test/read/referrers.test.ts` — asserts the referrer pass finds references in record `refs` and in current-context fields.

**No modification to:** segment delete lifecycle (SPEC-108), record schema fields (`active`/`retired_reason` retained), prompt pipeline.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| §World Generativity vs Story-Bundle State (FOUNDATIONS line 105) | N/A @ tooling-adjacent — **explicitly the corrected framing** | The report §7 framed archive/force-delete as FOUNDATIONS drift; this is incorrect. Manual Studio writes only under `manual-stories/`, outside world canon and story-bundle `_source/`, so no canon-integrity principle is engaged. The fix is justified on product-coherence grounds (the "records are mutable current truth" brief), not this principle. Recorded as N/A defensively because a reader would expect the report's §7 claim to map here. |
| Rule 6 No Silent Retcons | aligns @ delete semantics | A delete that silently archives a record as inactive is a quiet, unexplained state change. Hard-delete-or-block makes the outcome explicit and visible — the analog at the tooling layer of the no-silent-retcon discipline. |
| §Soft Canon / Local Truth (explicit + validated) | aligns @ referrer-block | Blocking on referrers (vs orphaning a dangling reference by force) keeps the story-local record graph referentially consistent by construction. |
| Rule 1 No Floating Facts | N/A @ tooling-adjacent | No world-canon facts engaged. |
| §Canonical Storage Layer | N/A @ tooling-adjacent | No `_source/` interaction; manual-story records only. |

## 6. Build & test

`tools/manual-story-studio`:
- `npm run test:backend` runs the delete-lifecycle + referrer tests under `node --test`.
- `npm --prefix web test` (web `tsc --noEmit`) covers the Records-page delete dialog + referrer-card mount.
- `npm test` runs both; `npm run build` must succeed.

## 7. Acceptance criteria

1. **PASS rationale required.** Deleting an **unreferenced** record hard-deletes it (the file is unlinked) — verified by a test that confirms the file is gone.
2. Deleting a **referenced** record **blocks** and returns referrer summaries (id + class + title + summary), and the record's `active` flag is **unchanged** (no auto-archive) — verified by a test asserting `active` is not flipped.
3. The `inactive_default` outcome no longer occurs on the normal delete path.
4. Force-delete is reachable only via the explicit repair flag, unlinks despite referrers, and **appends** an entry to the persisted `repair-log.yaml` (`{deleted_class_and_id, deleted_at, referrers_at_deletion}`) — verified by a test reading the file back after two force-deletes (append, not overwrite).
5. Toggling `active` is an explicit author action, never a side effect of delete.
6. The Records page normal Delete shows referrer cards with edit links when blocked; "Force delete anyway" is not the default next click.
7. **Beat-template delete follows the same lifecycle** (shared `deleteRecord`): hard-delete-or-block, no `inactive_default`; `BeatTemplates.tsx` shows referrer cards when blocked, and a template referenced by a segment sidecar's `selected_template` is blocked (not hard-deleted).
8. `npm test` is green; `npm run build` succeeds.

## 8. Risks & Open Questions

- **Beat-template parity is in scope (Q1 → include uniformly).** Because `deleteRecord` is shared across the `records` and `beat-templates` URL spaces, the lifecycle change reaches beat-templates whether or not the UI is updated. The risk is a *split surface*: an un-updated `BeatTemplates.tsx` / `api/beat-templates.ts` would branch on an outcome the backend no longer returns. Both are listed in §4. **Template-referrer completeness** is the residual gotcha: templates are referenced by `selected_template` on segment/prompt sidecars, which `scanReferences` does not scan today — the referrer pass (§2 item 2) must extend to those sidecars for `mtemplate-*` targets, or a referenced template would wrongly hard-delete. Ticket decomposition should treat the `selected_template` scan extension as a distinct, testable slice.
- **`repair-log.yaml` is net-new infrastructure this spec establishes (Q2 → persist).** It is **not** inherited from SPEC-108 (whose force-delete returns only an in-memory audit message). Decision: persist, on Rule 6 (No Silent Retcons) durability grounds. Open sub-decisions deferred to implementation: exact field naming (snake_case keys above are the proposed shape), and whether the log is per-manual-story (chosen) vs per-world. The append path must read-modify-write under the existing `safeWriteFile` sandbox; concurrent force-deletes from two browser tabs are an accepted last-writer-wins risk (single-user local tool).
- **`docs/ID-ALLOCATION.md` doc-gap.** `repair-log.yaml` should be registered as a non-ID-bearing control file in §Manual-story-scoped (parallel to `manual-story.yaml`). Routed as a §4 deliverable rather than a separate docs spec.
- **Existing-test churn.** The SPEC-101 AC #5 capstone (`test/capstone-spec101.test.ts`) and `test/write/records.test.ts` assert the old `inactive_default` behavior; they are rewritten, not merely supplemented. The capstone rewrite is a deliberate, attributed change to a landed spec's acceptance test (Rule 6 visibility), not a silent edit.
