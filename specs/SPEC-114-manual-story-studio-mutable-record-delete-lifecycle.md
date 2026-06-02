# SPEC-114 — Manual Story Studio: Mutable-Record Delete Lifecycle (Block-on-Referrer, Repair-Mode Force-Delete)

**Status:** DRAFT
**Date:** 2026-06-02
**Classification:** tooling-adjacent (backend delete-flow correction + frontend delete UX; no canon-pipeline integration).
**Depends on:** archive/specs/SPEC-101-manual-story-metadata-and-records.md (the record read/write layer whose delete path this spec corrects), SPEC-112 (referrer cards in the block-on-referrer flow reuse `RecordCardMini`).
**Blocks:** —
**Related:** `tools/manual-story-studio/src/write/records.ts`, `tools/manual-story-studio/src/read/records.ts`, `tools/manual-story-studio/src/schema/manual-story.ts`, `tools/manual-story-studio/src/server/routes/records.ts`, `tools/manual-story-studio/web/src/pages/Records.tsx`, `tools/manual-story-studio/web/src/api/records.ts`.
**Source:** critical triage of `reports/manual-story-studio-third-iteration.md` §10 / §30 / §39 Stage 5 (ChatGPT-Pro, 2026-06-02). Accepted on **product-coherence grounds, not FOUNDATIONS grounds** — see §1.1. The report's §7 framing of this as a FOUNDATIONS "drift" is corrected: the tool writes only under `manual-stories/`, never world canon, so there is no canon-integrity violation; the issue is that the delete lifecycle contradicts the clarified product brief ("records are mutable current truth").

---

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
2. **Referrer resolution.** Provide a "who references record X" pass: scan record `refs` (characters/locations/related_records) plus current-context references (`pinned_records`, `must_not_reveal`, `excluded_records`, `current_cast`, etc.) for the target id, returning referrer summaries. (This pass is also the backend SPEC-112's deferred referenced-by count consumes.)
3. **Repair-mode force-delete + active toggle.** Confine `force_deleted` (unlink despite referrers) to an explicit repair surface, gated behind a warning, and recorded in a `repair-log.yaml` audit entry (id, timestamp, referrers-at-deletion). Keep `active`/`retired_reason` writable only as an explicit author action (repair surface or an explicit "mark inactive" control), never as an automatic consequence of delete.
4. **Records-page delete UX.** `Records.tsx`: the normal **Delete** button either hard-deletes (no referrers) or shows a **block dialog** listing referrer cards (`RecordCardMini`, SPEC-112) with edit links and the message "Resolve these references first." The "Force delete anyway" affordance moves out of the normal flow into the repair surface (or a clearly-marked, warning-gated disclosure), never the default next click.

### Out of scope

- Removing the `active` field or `retired_reason` field from the schema — both are retained for explicit, author-meaningful use (report §38); only the *automatic* archive-on-delete behavior is removed.
- Supersession chains / historical-state artifacts — never existed; not added (report §9, §10).
- Segment deletion lifecycle — already correct (SPEC-108: referenced-segment delete removes from `segment_order`/preserves files; force-delete repair-log-gated). Untouched here.
- A general repair-mode redesign beyond the force-delete + active-toggle confinement (the broader repair surface is its own concern).

## 3. Key decisions

- **Default delete must never silently archive.** The single most confusing behavior today is "I deleted it but it's still here as inactive." Hard-delete-or-block makes the outcome unambiguous: either it's gone, or you're told what's stopping you.
- **Block by referrers, with cards, not just an id list.** The author needs to *act* on the block — the referrer cards carry edit links so the author can clear the reference and retry. An id-only error forces the author to go hunting.
- **Retain `active`, demote its auto-setting.** `active:false` as deliberate "temporarily not current truth" is useful; `active:false` as a delete side effect is the lifecycle residue. Keeping the field while removing the automatic write resolves the tension without losing a genuinely-useful affordance.
- **Force-delete is repair, and repair is logged.** A destructive override that ignores referrers belongs behind a warning with an audit trail (`repair-log.yaml`), consistent with the segment repair model SPEC-108 already established.
- **Reuse the referrer pass as SPEC-112's count source.** One backend pass serves both the delete-block flow and the deferred referenced-by count, avoiding a second corpus scan.

## 4. Files to touch

**Modify:**

- `tools/manual-story-studio/src/write/records.ts` — rework `deleteRecord`: default path = hard-delete-if-unreferenced / block-with-referrers (no `inactive_default`); `force_deleted` confined to a repair flag and writes a `repair-log.yaml` entry; stop auto-writing `active:false`/`retired_reason` on delete.
- `tools/manual-story-studio/src/read/records.ts` — add the referrer-resolution pass (returns referrer summaries for a target id).
- `tools/manual-story-studio/src/server/routes/records.ts` — delete route returns the structured blocked-with-referrers result; force-delete requires the explicit repair flag.
- `tools/manual-story-studio/web/src/api/records.ts` — surface the blocked-with-referrers result shape; separate the force-delete call behind the repair flag.
- `tools/manual-story-studio/web/src/pages/Records.tsx` — normal Delete → hard-delete or block dialog with referrer cards + edit links; move "Force delete anyway" out of the default flow into a warning-gated repair affordance.

**Create:**

- `tools/manual-story-studio/test/write/delete-lifecycle.test.ts` — asserts: unreferenced delete hard-deletes (file unlinked); referenced delete blocks and does **not** set `active:false`; the blocked result lists referrer summaries; force-delete (repair flag) unlinks and writes a `repair-log.yaml` entry; toggling `active` is never a side effect of delete.
- `tools/manual-story-studio/test/read/referrers.test.ts` — asserts the referrer pass finds references in record `refs` and in current-context fields.

**No modification to:** segment delete lifecycle (SPEC-108), record schema fields (`active`/`retired_reason` retained), prompt pipeline.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| §world-canon vs story-bundle execution state (FOUNDATIONS line 105) | N/A @ tooling-adjacent — **explicitly the corrected framing** | The report §7 framed archive/force-delete as FOUNDATIONS drift; this is incorrect. Manual Studio writes only under `manual-stories/`, outside world canon and story-bundle `_source/`, so no canon-integrity principle is engaged. The fix is justified on product-coherence grounds (the "records are mutable current truth" brief), not this principle. Recorded as N/A defensively because a reader would expect the report's §7 claim to map here. |
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
4. Force-delete is reachable only via the explicit repair flag, unlinks despite referrers, and writes a `repair-log.yaml` entry.
5. Toggling `active` is an explicit author action, never a side effect of delete.
6. The Records page normal Delete shows referrer cards with edit links when blocked; "Force delete anyway" is not the default next click.
7. `npm test` is green; `npm run build` succeeds.
