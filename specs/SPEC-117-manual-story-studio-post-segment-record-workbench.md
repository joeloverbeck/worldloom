# SPEC-117 — Manual Story Studio: Post-Segment Record Workbench (replace checklist modal)

**Status:** DRAFT
**Date:** 2026-06-02
**Classification:** tooling-adjacent (`tools/manual-story-studio`; no LLM/MCP/patch-engine; replaces a post-save UI modal + removes one current-context field; no canon-pipeline integration).
**Depends on:** archive/specs/SPEC-112-manual-story-studio-record-pickers.md (reuses `RecordForm`, `RecordCard`, `RecordPicker`), archive/specs/SPEC-114-manual-story-studio-mutable-record-delete-lifecycle.md (reuses the broad referrer scanner + block-on-referrer delete).
**Blocks:** SPEC-121 (the synthetic acceptance test exercises this workbench at step 19).
**Related:** `tools/manual-story-studio/src/state-update-checklist.ts`, `tools/manual-story-studio/src/read/records.ts`, `tools/manual-story-studio/src/schema/current-context.ts`, `tools/manual-story-studio/web/src/pages/PasteProse.tsx`, `tools/manual-story-studio/web/src/components/StateUpdateChecklist.tsx`, `tools/manual-story-studio/web/src/pages/Records.tsx`.
**Source:** critical triage of `reports/manual-story-studio-fourth-iteration.md` §§13 / 14 / 42 + Stage 2 (ChatGPT-Pro, 2026-06-02). This **reverses the iteration-3 DEFER** of the post-segment workbench (lift-condition "pickers validated in use" — SPEC-112 pickers landed); the user confirmed the reversal (AskUserQuestion, 2026-06-02). The verdict rests on verified design-level defects in the current checklist, not on the report's untested use claims.

**Implementation note (2026-06-03):** SPEC117MANSTOSTU-002 removed the checklist builder/component, `checklist_payload` save response field, and PasteProse modal render. Remaining checklist references in this spec are historical problem statement / planned-removal context unless superseded by later SPEC-117 tickets.

**Implementation note (2026-06-03):** archive/tickets/SPEC117MANSTOSTU-001.md removed `last_reviewed_after_segment` from current-context and manual-record schemas, validation, read/write/route handling, web types/UI, README common-field prose, and package fixtures. Existing files carrying the legacy key are sanitized on current-context and record read/write so the key loads but does not round-trip. Remaining references in this spec are historical requirement/proof context unless superseded by later SPEC-117 tickets.

**Implementation note (2026-06-03):** archive/tickets/SPEC117MANSTOSTU-003.md added the read-only backend workbench payload route at `GET /api/worlds/:slug/manual-stories/:msSlug/segments/:segmentId/post-segment-workbench`. The route returns accepted segment context, the honest no-inference reminder, and a deduped broad-referrer candidate list grouped from `scanReferences`.

---

## 1. Context & Motivation

After a segment is saved, the current flow is **backwards**. `PasteProse.tsx:148-153` renders a `StateUpdateChecklist` **modal** built from a server `checklist_payload`. Verified defects:

1. **Fake specificity over a narrow scan.** The checklist's cast-involvement count scans **only `record.refs.characters`** (`state-update-checklist.ts:96-102` `recordReferencesAnyCast`), while a strictly-broader referrer scanner already exists and is used for delete safety (`records.ts:248-291`: `STRING_FIELDS` = `holder/owed_by/owed_to/subject/caused_by_segment/current_location/current_holder`, `PAIR_FIELDS` = `between`, `LIST_FIELDS` = `held_by`, plus `refs.*`). The checklist therefore under-reports which records actually touch the segment's cast, and presents that under-count as a "Review N records" instruction.
2. **Review-debt coupled to the prompt selector.** "Mark state reviewed after SEG-x" stamps `last_reviewed_after_segment` into `current-context.yaml` (`current-context.ts:14-16`; `StateUpdateChecklist.tsx:47-72`). This makes the **Prompt Working Set** — a deterministic selection/guardrail lens over records — also carry compliance/review status, which is a category error: the working set is not a review ledger.
3. **A modal between acceptance and maintenance.** The author wants to *see the accepted prose and update records*, not dismiss a category-count modal and then navigate to a separate `Records.tsx` page via query params (`StateUpdateChecklist.tsx:32-45`).

The product goal (report §13) is low friction, high confidence — *not* arbitrary speed. The fix is a **Post-Segment Record Workbench**: accepted prose on the left, a record workbench on the right, with the broad referrer scan driving the "records that touch this segment" pile, and a one-line honest reminder that Manual Studio did not infer any changes.

## 2. Scope

### In scope

1. **Remove the checklist from the default save path.** `PasteProse` no longer opens `StateUpdateChecklist` after save; it routes to the Post-Segment Workbench for the just-saved segment.
2. **Post-Segment Workbench page (new).** Two-pane per-story page:
   - **Left:** accepted segment text (rendered Markdown), segment title, prompt ID, moment directive, word count, last paragraph, and the included-records list from the segment sidecar (read-only).
   - **Right:** record workbench reusing `RecordForm` / `RecordCard` / `RecordPicker`. Quick-add buttons for the meaningful post-segment classes (Fact, Belief, Emotion, Plan, Relationship, Clock, Secret, Question, Consequence, Status). Inline-edit common fields; open a detail drawer for complex fields; delete with referrer cards (the existing block-on-referrer path from SPEC-114).
   - **Side/bottom rail:** "Records that touch this segment" — computed from the **broad** referrer scanner over the segment's involved cast/locations/records, presented as a *working pile*, **not** a required checklist. Pre-filtered to involved cast but explicitly not limited to cast-linked records.
   - **Top reminder (single line):** "Segment saved. Manual Studio did not infer record changes. Update only the records you want to change."
3. **Reuse the broad referrer scanner.** Extend/expose the existing `scanReferences` pass in `src/read/records.ts` (entry ~`:123`; its `STRING_FIELDS`/`PAIR_FIELDS`/`LIST_FIELDS` tables at ~`:248-291` give the `holder/between/owed_by/subject/held_by/refs.*` coverage already used by delete-safety) so the workbench's "touches this segment" rail uses the same field coverage, replacing the narrow `refs.characters`-only logic. `scanReferences` resolves referrers of a single **target ID**, so the workbench route iterates the segment's involved cast/locations/records and unions the results. (Removing `last_reviewed_after_segment` per item 4 also drops the `records.ts:308` referrer line that currently scans `current-context.last_reviewed_after_segment`.)
4. **Remove `last_reviewed_after_segment` (both occurrences).** The field is declared in **two** schemas and both are removed: (i) `CurrentContext` (`src/schema/current-context.ts:16`) — the working-set review stamp the report §14/§17 targets; and (ii) `RecordCommonFields` (`src/schema/manual-story.ts:157`) — a per-record review stamp inherited by every manual record class, with per-record validation (`src/validate/schema.ts` common-field + `COMMON_NULLABLE` lists), web types (`web/src/types/manual-story.ts`), and a dedicated input in the reused `web/src/components/RecordForm.tsx`. Drop the field from both schemas, all read/write/validate paths, the GET/PUT current-context route, the `RecordForm` input, and any other UI. Existing persisted records and current-context files that still carry the field must load with it ignored/dropped and round-trip without it (see AC5). Keep `last_accepted_segment` (it seeds recent-prose context / workbench navigation, not review status — report §17). (The `current-context.ts` schema comment attributes the field to a "SPEC-108 repair precondition"; that attribution is stale — no code reads it for repair/health gating (verified) and SPEC-108 is COMPLETED+archived. Remove the stale comment with the field; see §8 Risks.)
5. **Delete the checklist surface.** Remove `state-update-checklist.ts`, its route/payload, and `StateUpdateChecklist.tsx`, plus their tests (replaced by workbench tests). Remove `checklist_payload` from the segment-save response.

### Out of scope

- Any **inference** of what changed from the prose (report §26: Manual Studio never infers state from prose). The rail is a referrer-based *candidate* pile, not a diff.
- A "mark reviewed" affordance of any kind (report §14: hide it unless a real use case appears).
- The broad non-cast schema field expansion (deferred — see triage D1). The workbench uses existing record fields/forms.
- New record classes or new write surfaces beyond what `RecordForm` already saves.

## 3. Key decisions

- **Workbench, not checklist.** The post-segment surface is for *doing* maintenance, not *counting* it. The "touches this segment" rail is advisory.
- **Broad scan everywhere.** The narrow `refs.characters` scan is replaced by the existing broad referrer scanner; there is no reason to keep two scanners with different coverage in one tool.
- **Working set is a lens, not a ledger.** Removing `last_reviewed_after_segment` restores the working set to a pure deterministic selector (report §17/§38).
- **Honest one-liner, no automation theater.** A single reminder replaces the modal's compliance framing.
- **Routed, not modal.** After save, navigate to the workbench via a real per-story route carrying the just-saved **segment id as a route param**, so the author is *in* the maintenance surface, not dismissing a dialog to reach it. The workbench is reached only by this post-save route — it is **not** a standalone `StoryPageNav` tab (Q2: route-only, since the payload is segment-scoped).

## 4. Files to touch

**Create:**
- `tools/manual-story-studio/web/src/pages/PostSegmentWorkbench.tsx` — the two-pane workbench (§2 item 2).
- `tools/manual-story-studio/src/server/routes/post-segment-workbench.ts` — GET payload: accepted segment + sidecar included-records + broad-referrer "touches this segment" candidates for a segment ID. (Or extend an existing segment route; pick the lower-churn option.)
- `tools/manual-story-studio/test/post-segment-workbench.test.ts` — payload uses the broad referrer scanner (a record referenced via `holder`/`between`/`held_by` appears in the candidate pile; a `refs.characters`-only check would miss it); no `last_reviewed_after_segment` is read or written; reminder text present; no inference of changes.

**Modify:**
- `tools/manual-story-studio/web/src/pages/PasteProse.tsx` — remove modal render; route to the workbench after save.
- `tools/manual-story-studio/src/schema/current-context.ts` — remove `last_reviewed_after_segment` (and its stale SPEC-108 comment); keep `last_accepted_segment`.
- `tools/manual-story-studio/src/schema/manual-story.ts` — remove `last_reviewed_after_segment` from `RecordCommonFields` (per-record occurrence, item 4-ii).
- `tools/manual-story-studio/src/validate/schema.ts` — drop `last_reviewed_after_segment` from the common-field and `COMMON_NULLABLE` lists.
- `tools/manual-story-studio/web/src/types/manual-story.ts` — drop the field from both type declarations.
- `tools/manual-story-studio/web/src/components/RecordForm.tsx` — remove the "Last reviewed after segment" input + its `common` state wiring.
- `tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx` — remove the current-context field input.
- `tools/manual-story-studio/src/read/current-context.ts`, write/validate paths, and the GET/PUT route — drop the removed field.
- `tools/manual-story-studio/src/read/records.ts` — export/reuse the `scanReferences` broad referrer scan for the workbench (no behavior change to delete); also drop the `current-context.last_reviewed_after_segment` referrer line (`:308`).
- `tools/manual-story-studio/web/src/App.tsx` — register the workbench route (segment-id param). No `StoryPageNav` tab is added (Q2: route-only; the workbench is segment-scoped and reached only post-save).
- `tools/manual-story-studio/web/src/index.css` — two-pane styling.

**Delete:**
- `tools/manual-story-studio/src/state-update-checklist.ts` + its route + the `checklist_payload` response field.
- `tools/manual-story-studio/web/src/components/StateUpdateChecklist.tsx`.
- their tests (replaced by the workbench test).

**Removal-completeness sweep (run before drafting Acceptance Criteria as final):**
```
grep -rn "last_reviewed_after_segment\|StateUpdateChecklist\|checklist_payload\|state-update-checklist\|recordReferencesAnyCast" \
  tools/manual-story-studio docs/ .claude/skills/ specs/ archive/specs/
```
Every hit outside this spec and the companion triage file must be removed or repointed.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| Prose/state separation (no state inferred from prose) | aligns @ post-save UI | The workbench shows accepted prose and a referrer-based candidate pile; it performs **no** diff/inference. The honest reminder states this at authoring time. |
| §Soft Canon / Local Truth (explicit + author-maintained) | aligns @ record edits | Record changes remain explicit author saves through the existing validated write path; the workbench only makes them faster. |
| No-Silent-Retcons discipline (mirrored to local truth) | aligns @ referrer scan | Using the broad referrer scanner (not the narrow cast-only count) means the "touches this segment" surface reflects real references, so the author is not silently misled about what a change would affect. |
| §Tooling Recommendation (least mechanism) | aligns @ removed checklist | Removing the checklist + `last_reviewed_after_segment` deletes a compliance mechanism that added review-debt without knowing what changed. |
| §Canonical Storage Layer / Hook 3 | N/A @ write boundary | Manual Studio writes only under `manual-stories/`; this spec touches no world canon or `_source/` surface. Listed defensively because a reader might expect a record-editing surface to engage it. |

## 6. Acceptance criteria

1. Saving a segment via `PasteProse` routes to the Post-Segment Workbench; **no modal** is shown. (No remaining import of `StateUpdateChecklist`; removal sweep clean.)
2. The workbench left pane shows accepted prose, segment title, prompt ID, moment directive, word count, last paragraph, and sidecar included-records.
3. The "touches this segment" rail is produced by the broad referrer scanner: a fixture where record B references record/cast A via `holder` (not `refs.characters`) places B in the rail. A test asserts the narrow-scan-only result would have missed B.
4. Quick-add / inline-edit / detail-drawer / referrer-blocked-delete all work through the reused `RecordForm`/`RecordCard` and SPEC-114 delete path.
5. `last_reviewed_after_segment` no longer exists in **either** schema (`CurrentContext` and `RecordCommonFields`), read/write/validate, route, or UI (including the `RecordForm` input). A current-context fixture **and** a manual-record fixture each containing the old field still load (field ignored/dropped) and round-trip without it. `last_accepted_segment` is retained.
6. The single honest reminder line is present; no "mark reviewed" control exists anywhere.
7. `cd tools/manual-story-studio && npm run test:backend` and `npm --prefix web test` both pass; full `npm test` green.

## 7. Test plan

- Backend: `cd tools/manual-story-studio && npm run test:backend`
- Web typecheck: `cd tools/manual-story-studio && npm --prefix web test`
- Full (backend + web): `cd tools/manual-story-studio && npm test`

## 8. Risks & Open Questions

- **Per-record field removal is the larger blast radius (resolved — Q1=(a), remove both).** `last_reviewed_after_segment` is a required common field on every manual record (`RecordCommonFields`), not only a `CurrentContext` field. Removing it touches `manual-story.ts`, `validate/schema.ts`, `web/src/types/manual-story.ts`, the `RecordForm` input, and ~27 test fixtures. The §4 removal-completeness sweep is the backstop that catches every hit; AC5's record round-trip guards back-compat for persisted record YAML that still carries the field.
- **Stale SPEC-108 attribution (resolved — I2).** The `current-context.ts` schema comment attributes the field to a "SPEC-108 repair precondition," but SPEC-108 is COMPLETED+archived and no code reads the field for repair/health gating (verified: only schema/validation/referrer-scan consumers; `health/compute.ts` does not read it). Removal is runtime-safe and affects no SPEC-108 repair behavior; the stale comment is removed with the field.
- **Referrer scanner is per-target-ID.** `scanReferences` resolves referrers of one id; the workbench "touches this segment" rail must iterate the segment's involved cast/locations/records and union the results (§2 item 3).
- **Workbench routing (resolved — Q2=(a), route-only).** The workbench is reached only via the post-save route with the segment id as a route param; it is not a `StoryPageNav` tab. If a standalone entry point is wanted later, it needs a segment selector / most-recent-segment default and an empty-state for stories with no segments.
