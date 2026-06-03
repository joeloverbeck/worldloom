# SPEC-122 — Manual Story Studio: Post-Segment Prose/State Boundary Cleanup

**Status:** PROPOSED
**Date:** 2026-06-03
**Classification:** tooling-adjacent (`tools/manual-story-studio`; no LLM/MCP/patch-engine; writes only under `worlds/<slug>/manual-stories/`). The change directly engages the prose/state boundary (FOUNDATIONS §Tooling Recommendation), so the §5 alignment table is load-bearing rather than defensive.
**Depends on:** archive/specs/SPEC-117-manual-story-studio-post-segment-record-workbench.md (this corrects a regression SPEC-117 introduced in the post-segment workbench it created).
**Blocks:** —
**Related:** `tools/manual-story-studio/web/src/pages/PostSegmentWorkbench.tsx`, `tools/manual-story-studio/src/server/routes/post-segment-workbench.ts`, `tools/manual-story-studio/web/src/pages/PasteProse.tsx`, `tools/manual-story-studio/test/post-segment-workbench.test.ts`.
**Source:** critical triage of `reports/manual-story-studio-fifth-iteration.md` §§1.3 / 5 / 13 / 17 / 24 / 35 (ChatGPT-Pro, 2026-06-03). See `docs/triage/2026-06-03-manual-story-studio-fifth-iteration-triage.md` items R1 / R2 / R10. All code-state claims verified against the live tree.

---

## 1. Context & Motivation

Manual Story Studio's hardest product invariant is the **prose/state boundary**: the external LLM writes prose; the author accepts it outside the app; Manual Studio saves only accepted prose and **never infers record state from prose** — the author updates records manually afterward. SPEC-117 built the post-segment workbench as the surface where that manual update happens. In doing so it introduced a defect that quietly crosses the boundary it was meant to protect.

**Verified defects (live tree):**

1. **Prose-seeded record content (the boundary violation).** When the author creates a new record in the post-segment workbench, the form is pre-populated from the segment prose:
   - `web/src/pages/PostSegmentWorkbench.tsx:95-108` — `initialRecordForSegment()` sets `summary: payload?.segment.last_paragraph ?? ""` and `details: payload?.segment.body ?? ""`.
   - backend `src/server/routes/post-segment-workbench.ts:63-68` (`lastParagraph()`) + `:202` returns `last_paragraph` in the payload; `:206` carries the candidate set.
   This is a "fake extraction heuristic": the last paragraph of prose becomes a record summary, the full prose body becomes record details. The author then has to delete the pasted prose chunks. It trains exactly the wrong model — that the app derives record meaning from prose — and pollutes the record store with narrator-voice text.

2. **Misleading "touched" language.** The candidate payload field is `touched_records` (`post-segment-workbench.ts:206`; frontend type `PostSegmentWorkbench.tsx:44`) and the rail heading reads "Records that touch this segment" (`:351-352`). But the candidate logic (`:71-82`, `:182-189`) is a deterministic referrer/link scan over the segment ID, included cast, and included records — it surfaces records *linked to the prompt*, not records *touched by the prose*. "Touched" implies inferred prose effects the app does not and must not compute.

3. **Raw IDs in the segment meta.** Included cast/records render as raw comma-joined IDs (`PostSegmentWorkbench.tsx:334-345`, `.join(", ")`), not author-legible cards — inconsistent with the cardified inspector SPEC-119 shipped.

4. **"Paste or draft" placeholder.** `PasteProse.tsx:115` placeholder reads "Paste or draft the next manuscript segment here." "or draft" blurs the boundary — Manual Studio is not a prose editor; the author pastes prose **accepted** from the external LLM.

These are one cohesive surface (the post-segment / prose-acceptance loop) and one cohesive theme (don't let prose leak into records or into the language about records).

## 2. Scope

### In scope

1. **Remove prose-seeding of new records (R1).** New-record defaults in the post-segment workbench must NOT copy prose into `summary` or `details`. Per the report §17/§35 recommended defaults:
   - `title`, `summary`, `details` start **empty**.
   - `refs` are prefilled **only** if the author explicitly chooses to link to the prompt cast/records (the existing link affordance), not by default.
   - keep the deterministic `tags: ["segment:<seg-id>"]` tag (a cheap, non-prose provenance link — not prose content).
   - provide an explicit **"Copy selected prose into notes"** affordance for when the author *wants* a quote — manual, opt-in, into `notes`, never automatic body seeding.
   - the backend `last_paragraph` field becomes unused by the seeding path; remove it from the payload unless the "copy selected prose" affordance consumes it (see §3).
2. **Rename `touched_records` → `linked_record_candidates` (R2)** across the payload (backend route + frontend type), and reword the UI:
   - rail heading "Records that touch this segment" → "Records linked to this segment's prompt".
   - "candidate" framing → "linked record".
   - reason lines render human phrasing ("Linked through holder → Mira", "Referenced by included record") rather than raw `fields -> target_ids`. (The deterministic link reasons already exist in the candidate payload; this is presentation only.)
3. **Cardify included cast/records in segment meta (R2).** Replace the raw `.join(", ")` ID lists (`:334-345`) with the existing `RecordCard` rendering used elsewhere (the inspector already resolves IDs → cards; reuse that path).
4. **Paste Prose placeholder (R10).** `PasteProse.tsx:115` → "Paste accepted prose" (or "Paste the accepted prose for the next segment here.").

### Out of scope

- The candidate **scanning logic** itself — the broad referrer scan (`:71-82`, `:182-189`) is correct and deterministic; only its *name* and *presentation* change.
- Any inference of record changes from prose (the app must continue to do none).
- The full post-segment "record maintenance cockpit" layout (report §35) and quick-action shortcuts ("update emotion", "tick clock", etc.) — deferred with the cockpit work (triage D-cockpit / D-misc).
- Schema/translator enrichment (triage D-schema, fourth deferral).
- Any on-disk file or record-format change.

## 3. Key decisions

- **Empty defaults, opt-in provenance.** The correct post-segment new-record default is a blank form plus optional deterministic links (the `segment:<id>` tag and author-chosen `refs`). Provenance that costs nothing and asserts nothing about prose meaning (a tag, a ref) is fine; provenance that copies prose text into structured fields is the violation.
- **Keep "Copy selected prose into notes" as an explicit button.** This preserves the legitimate "I want to quote this line" workflow without ever auto-seeding. It writes to `notes`, the free-text field, never to `summary`/`details`. If implementing this affordance requires the segment body client-side, the body is already available to the page; the backend `last_paragraph` convenience field can be dropped.
- **"Linked," not "touched."** The candidate set is provably link-derived, not prose-derived. The name and heading must say what the computation actually is, to keep the author's mental model aligned with the prose/state boundary.
- **Reuse the SPEC-119 card path.** The inspector already turns IDs into cards with resolved titles; the segment-meta cast/record lists should use the same component rather than a parallel raw-ID rendering.

## 4. Files to touch

**Modify (R1 — remove prose-seeding):**
- `tools/manual-story-studio/web/src/pages/PostSegmentWorkbench.tsx` (`:95-108`) — `initialRecordForSegment()` returns empty `summary`/`details`; keep the `segment:<id>` tag; refs only on explicit link action; add the "Copy selected prose into notes" affordance writing to `notes`.
- `tools/manual-story-studio/src/server/routes/post-segment-workbench.ts` (`:63-68`, `:202`) — remove `lastParagraph()` and the `last_paragraph` payload field if no longer consumed (the segment `body` may remain in the payload only if the "copy into notes" affordance reads it server-side; otherwise drop body from the workbench payload too, since nothing else should seed from it).

**Modify (R2 — rename + cardify):**
- `tools/manual-story-studio/src/server/routes/post-segment-workbench.ts` (`:206`) — payload key `touched_records` → `linked_record_candidates`.
- `tools/manual-story-studio/web/src/pages/PostSegmentWorkbench.tsx` (`:44` type; `:351-352` heading; `:334-345` meta lists) — type field rename; heading/wording; raw-ID lists → `RecordCard`; reason lines → human phrasing.

**Modify (R10 — placeholder):**
- `tools/manual-story-studio/web/src/pages/PasteProse.tsx` (`:115`) — placeholder string.

**Modify (tests):**
- `tools/manual-story-studio/test/post-segment-workbench.test.ts` (`:161`, `:175-180`) — drop/replace the `last_paragraph` assertion; rename `touched_records` → `linked_record_candidates` in payload assertions; keep the broad-scanner regression assertion (it tests the scan, which is unchanged); add an assertion that new-record defaults carry no prose-derived `summary`/`details`.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| §Tooling Recommendation — "LLM agents should never operate on prose alone" / least-agency | aligns @ post-segment seeding surface | The defect auto-derived structured record content from prose at the workbench surface; removing the seeding restores the discipline that the deterministic layer never extracts meaning from prose. Manual Studio has no LLM, but the same least-agency posture forbids prose→record inference in its UI. |
| Prose/state boundary (report §24/§26; product invariant inherited from SPEC-107) | aligns @ new-record defaults + naming | Empty defaults + "linked" (not "touched") naming keep the author's model: prose is saved, records are author-maintained, the app infers nothing. The prior wording/seeding leaked prose into both records and the language about records. |
| Rule 6 — No Silent Retcons (analogue) | aligns @ provenance | Keeping the `segment:<id>` tag + explicit opt-in refs preserves a truthful, non-fabricated provenance link; auto-pasting prose into `details` fabricated a record body the author never asserted. |
| §Canonical Storage Layer / Hook 3 | N/A @ write boundary | Manual Studio writes only under `manual-stories/`; touches no world canon or `_source/`. Listed defensively only. |

## 6. Acceptance criteria

1. Creating a new record in the post-segment workbench yields **empty** `summary` and `details` — verified by a test asserting `initialRecordForSegment()` (or the rendered form's initial values) contains no segment-prose text. `grep -n "last_paragraph" tools/manual-story-studio/web/src tools/manual-story-studio/src` returns no seeding-path hit (only, at most, an opt-in "copy into notes" consumer).
2. The deterministic `segment:<id>` tag still prefills on new records (cheap provenance retained).
3. An explicit "Copy selected prose into notes" affordance exists and writes only to `notes` (never `summary`/`details`/`title`).
4. `grep -rn "touched_records" tools/manual-story-studio --include=*.ts --include=*.tsx` returns zero hits outside `dist/`; the payload key is `linked_record_candidates`. Backend + frontend renamed in lockstep (a half-rename breaks the page — see §8).
5. The rail heading reads "Records linked to this segment's prompt" (no "touch" wording); `grep -rni "records that touch this segment" tools/manual-story-studio/web/src` returns nothing.
6. Included cast/records in segment meta render as `RecordCard`s, not raw comma-joined IDs (no `.join(", ")` over raw ID arrays at `PostSegmentWorkbench.tsx:334-345`).
7. The Paste Prose placeholder reads "Paste accepted prose" (no "or draft"); `grep -rni "paste or draft" tools/manual-story-studio/web/src` returns nothing.
8. The broad-referrer-scan regression assertion in `post-segment-workbench.test.ts` still passes (scan logic unchanged).
9. `cd tools/manual-story-studio && npm --prefix web test` and `npm run test:backend` pass; full `npm test` green.

## 7. Test plan

- Backend (payload rename + seeding removal): `cd tools/manual-story-studio && npm run test:backend`
- Web typecheck: `cd tools/manual-story-studio && npm --prefix web test`
- Full: `cd tools/manual-story-studio && npm test`

## 8. Risks & Assumptions

- **Payload-key lockstep (R2).** `touched_records` → `linked_record_candidates` is a client↔server contract: the backend route key and the frontend type/consumer must rename together. A half-rename compiles on the side that didn't change but breaks the workbench rail at runtime (frontend reads a key the backend no longer sends → empty rail). AC#4's end-to-end check is the guard.
- **`last_paragraph`/`body` payload removal.** If the "copy selected prose into notes" affordance is implemented client-side (the page already has the segment body), drop `last_paragraph` and reconsider whether the full `body` still needs to ride in the workbench payload. Removing fields nothing consumes is preferred; verify no other consumer reads them before deletion (grep).
- **Card reuse.** The segment-meta cardification should reuse SPEC-119's existing ID→card resolution path, not introduce a second resolver. Assumption: that path is importable from the inspector/components layer.
- **Assumption: no behavior change to candidate scanning.** Only naming/presentation/seeding change; the deterministic referrer scan is correct and untouched.
