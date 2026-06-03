# Implementation Order — Manual Story Studio Fifth Iteration

**Status:** PROPOSED (SPEC-123 completed; SPEC-122/SPEC-124 remain active)
**Date:** 2026-06-03
**Source:** triage of `reports/manual-story-studio-fifth-iteration.md` (ChatGPT-Pro) → `docs/triage/2026-06-03-manual-story-studio-fifth-iteration-triage.md`
**Active specs:** SPEC-122 and SPEC-124 (both `tools/manual-story-studio`, tooling-adjacent).
**Completed in this batch:** SPEC-123 — archived at `archive/specs/SPEC-123-manual-story-studio-prompt-working-set-rename.md` after `archive/tickets/SPEC123MANSTOSTU-001.md` and `archive/tickets/SPEC123MANSTOSTU-002.md`.

## Dependency graph

```
SPEC-122 (post-segment prose/state boundary)    active — independent — PostSegmentWorkbench + post-segment route + PasteProse
SPEC-123 (current-context → prompt-working-set) completed/archived — independent — current-context surface; no file overlap with 122/124
SPEC-124 (source browser narrowing)             active — independent — SourceBrowser creation paths
```

The three original specs touch **disjoint production file sets** (verified against the rename surface enumerated in SPEC-123 §4). One shared end-to-end test harness — `test/acceptance/one-real-story.test.ts` — is touched by SPEC-122's `touched_records` → `linked_record_candidates` payload-key rename (it asserts on `body.touched_records`); SPEC-122's production surfaces remain disjoint from SPEC-124's.
- SPEC-122: `PostSegmentWorkbench.tsx`, `server/routes/post-segment-workbench.ts`, `PasteProse.tsx`, `test/post-segment-workbench.test.ts`, `test/acceptance/one-real-story.test.ts`.
- SPEC-123: completed and archived at `archive/specs/SPEC-123-manual-story-studio-prompt-working-set-rename.md`; the `current-context` modules + `compose.ts`/`health/compute.ts`/`read/records.ts`/`http.ts` + web `current-context` files + `Dashboard.tsx`/`MomentComposer.tsx`/`StoryPageNav.tsx`/`App.tsx`/`types` + `test/current-context/`.
- SPEC-124: `SourceBrowser.tsx` + source-derived creation client path.

There are **no hard prerequisites** between them; they can land in any order or in parallel.

## Recommended landing order

Completed:
- **SPEC-123 — `current-context` → `prompt-working-set` rename.** Landed first as planned and archived at `archive/specs/SPEC-123-manual-story-studio-prompt-working-set-rename.md`.

Remaining active order:
1. **SPEC-122 — Post-segment prose/state boundary cleanup.** The highest-value, FOUNDATIONS-aligned fix (removes a prose→record seeding regression introduced by SPEC-117). Land next so the boundary fix is in place early.
2. **SPEC-124 — Source browser creation narrowing.** Lifts the iter-4 D3 deferral now that the user confirmed real friction; smallest blast radius.

## Deferred (not in this batch — see triage)

- **D-schema** — broad non-cast schema + translator enrichment (~30 fields). **Fourth deferral** (iter-2 T5b, iter-3, iter-4 D1). Lift: real authoring use names recurring field gaps; no new use evidence (ChatGPT-Pro never ran the tool).
- **D-cockpit** — single Writing Cockpit route. Deferred since iter-2 (SPEC-111 shipped load-bearing pieces only). Lift: foundational pieces validate in real-story use (author hasn't run a real linear story yet).
- **D-brief** — two-layer writer-facing brief renderer. Lift: real-story use surfaces a concrete brief-quality failure traceable to the 15-section structure.
- **D-e2e** — browser-like end-to-end UX tests. Demand-driven follow-up tooling (rejected-standalone iter-2, deferred iter-3; backend Glass-Orchard landed iter-4 as SPEC-121).
- **D-scale** — source-browser grouping/snippets/lazy backend. Premature for one small world.
- **D-misc** — prompt bloat-meter; quick-edit-card + drawer rewrite; manuscript tweaks; segment-repair outcome renames. No observed pain; bundles with the deferred cockpit/record-UX vision.

## Skipped at user request (this batch)

- **Minor-UX-polish bundle** (nav demotion of Beat Templates/Repair + fuzzy "Why is this missing?" lookup + RecordPicker `aria-activedescendant`) — legitimate but minor; user chose to skip for now. Re-raisable any time.

## Spec-ID allocation

Prior batch ended at SPEC-121 (archived); `specs/` was empty before this batch. This batch starts at SPEC-122.
