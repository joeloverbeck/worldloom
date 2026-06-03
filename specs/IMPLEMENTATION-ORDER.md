# Implementation Order — Manual Story Studio Fifth Iteration

**Status:** PROPOSED
**Date:** 2026-06-03
**Source:** triage of `reports/manual-story-studio-fifth-iteration.md` (ChatGPT-Pro) → `docs/triage/2026-06-03-manual-story-studio-fifth-iteration-triage.md`
**Specs:** SPEC-122 … SPEC-124 (all `tools/manual-story-studio`, tooling-adjacent).

## Dependency graph

```
SPEC-122 (post-segment prose/state boundary)   independent — PostSegmentWorkbench + post-segment route + PasteProse
SPEC-123 (current-context → prompt-working-set) independent — current-context surface (35 files); no file overlap with 122/124
SPEC-124 (source browser narrowing)             independent — SourceBrowser creation paths
```

All three specs touch **disjoint file sets** (verified against the rename surface enumerated in SPEC-123 §4):
- SPEC-122: `PostSegmentWorkbench.tsx`, `server/routes/post-segment-workbench.ts`, `PasteProse.tsx`, `test/post-segment-workbench.test.ts`.
- SPEC-123: the `current-context` modules + `compose.ts`/`health/compute.ts`/`read/records.ts`/`http.ts` + web `current-context` files + `Dashboard.tsx`/`MomentComposer.tsx`/`StoryPageNav.tsx`/`App.tsx`/`types` + `test/current-context/`.
- SPEC-124: `SourceBrowser.tsx` + source-derived creation client path.

There are **no hard prerequisites** between them; they can land in any order or in parallel.

## Recommended landing order

1. **SPEC-123 — `current-context` → `prompt-working-set` rename.** Land first as a tidiness measure: it is the widest (35 files) and purely mechanical, and landing it before the others avoids any later diff having to reason about the dual naming. (Strictly optional — no file overlap forces this.)
2. **SPEC-122 — Post-segment prose/state boundary cleanup.** The highest-value, FOUNDATIONS-aligned fix (removes a prose→record seeding regression introduced by SPEC-117). Land second so the boundary fix is in place early.
3. **SPEC-124 — Source browser creation narrowing.** Lifts the iter-4 D3 deferral now that the user confirmed real friction; smallest blast radius.

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
