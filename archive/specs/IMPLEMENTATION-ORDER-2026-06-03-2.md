# Implementation Order — Manual Story Studio Fifth Iteration

**Status:** COMPLETED
**Date:** 2026-06-03
**Source:** triage of `reports/manual-story-studio-fifth-iteration.md` (ChatGPT-Pro) → `docs/triage/2026-06-03-manual-story-studio-fifth-iteration-triage.md`
**Active specs:** None.
**Completed in this batch:** SPEC-122 — archived at `archive/specs/SPEC-122-manual-story-studio-post-segment-prose-state-boundary.md` after `archive/tickets/SPEC122MANSTOSTU-004.md`, `archive/tickets/SPEC122MANSTOSTU-001.md`, `archive/tickets/SPEC122MANSTOSTU-002.md`, and `archive/tickets/SPEC122MANSTOSTU-003.md`; SPEC-123 — archived at `archive/specs/SPEC-123-manual-story-studio-prompt-working-set-rename.md` after `archive/tickets/SPEC123MANSTOSTU-001.md` and `archive/tickets/SPEC123MANSTOSTU-002.md`; SPEC-124 — archived at `archive/specs/SPEC-124-manual-story-studio-source-browser-narrowing.md` after `archive/tickets/SPEC124MANSTOSTU-001.md`.

## Dependency graph

```
SPEC-122 (post-segment prose/state boundary)    completed/archived — independent — PostSegmentWorkbench + post-segment route + PasteProse
SPEC-123 (current-context → prompt-working-set) completed/archived — independent — current-context surface; no file overlap with 122/124
SPEC-124 (source browser narrowing)             completed — independent — SourceBrowser creation paths
```

The three original specs touch **disjoint production file sets** (verified against the rename surface enumerated in SPEC-123 §4). One shared end-to-end test harness — `test/acceptance/one-real-story.test.ts` — is touched by SPEC-122's `touched_records` → `linked_record_candidates` payload-key rename (it asserts on `body.touched_records`); SPEC-122's production surfaces remain disjoint from SPEC-124's.
- SPEC-122: completed and archived at `archive/specs/SPEC-122-manual-story-studio-post-segment-prose-state-boundary.md`; touched `PostSegmentWorkbench.tsx`, `server/routes/post-segment-workbench.ts`, `PasteProse.tsx`, `test/post-segment-workbench.test.ts`, and `test/acceptance/one-real-story.test.ts`.
- SPEC-123: completed and archived at `archive/specs/SPEC-123-manual-story-studio-prompt-working-set-rename.md`; the `current-context` modules + `compose.ts`/`health/compute.ts`/`read/records.ts`/`http.ts` + web `current-context` files + `Dashboard.tsx`/`MomentComposer.tsx`/`StoryPageNav.tsx`/`App.tsx`/`types` + `test/current-context/`.
- SPEC-124: completed and archived at `archive/specs/SPEC-124-manual-story-studio-source-browser-narrowing.md` after `archive/tickets/SPEC124MANSTOSTU-001.md`; touched `SourceBrowser.tsx`, source-derived creation client path, and same-seam spec/status notes.

There are **no hard prerequisites** between them; they can land in any order or in parallel.

## Recommended landing order

Completed:
- **SPEC-122 — Post-segment prose/state boundary cleanup.** Landed after SPEC-123 and archived at `archive/specs/SPEC-122-manual-story-studio-post-segment-prose-state-boundary.md`.
- **SPEC-123 — `current-context` → `prompt-working-set` rename.** Landed first as planned and archived at `archive/specs/SPEC-123-manual-story-studio-prompt-working-set-rename.md`.

Remaining active order: none.

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

## Outcome

Completed on 2026-06-03. The fifth-iteration Manual Story Studio batch landed and archived SPEC-122, SPEC-123, and SPEC-124 with their implementation tickets. No active specs remain in this implementation-order batch.

Deviation from the original plan: SPEC-122 landed after SPEC-123, but the specs were independent and the final archived handoff records the actual order. SPEC-124 was completed by `archive/tickets/SPEC124MANSTOSTU-001.md` and archived at `archive/specs/SPEC-124-manual-story-studio-source-browser-narrowing.md`.

Verification for the final SPEC-124 slice is recorded in `archive/tickets/SPEC124MANSTOSTU-001.md`; post-archive hygiene for this implementation-order closeout used path-existence checks, stale active-reference sweeps, and `git diff --check`.
