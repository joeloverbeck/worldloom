# Implementation Order — Scene-First Story Explorer (Second Iteration)

This iteration finally lands the scene-first Story Explorer that the first iteration deferred. The engine half (SCN render layer, page-plan decoupling) already landed as archived **SPEC-92** and **SPEC-93**; this sequence builds the contract fix + the index/backend/frontend/search/MCP/docs that make the explorer scene-first.

**SPEC-90 is excluded** from this order — it is the page-centric branch-map/search spec being **removed** this iteration; its live contract is carried by **SPEC-98**.

Source: critical triage of `reports/scene-prose-planning-second-iteration.md` (ChatGPT-Pro, 2026-05-28). Report proposals that contradicted committed decisions were rejected (verbatim-contract externalization, receipt hash-fingerprints + publication profiles, removing PG `plan`/`prose_plan_path`); the publication model throughout is **presence-based, no hashing** ([[feedback_author_rejects_hash_coupling]]).

## Progress (2026-05-30) — iteration complete

**All specs in this iteration have landed and are archived.** The contract → index → backend → frontend → search/branch-map half (SPEC-94, SPEC-95, SPEC-96, SPEC-97, SPEC-98) completed first; SPEC-98 shipped as tickets SPEC98STOEXPSCE-001..004 (search backend, branch-map backend + page-model teardown, search frontend, branch-map frontend). The final spec **SPEC-99** (MCP `scene_coverage` packet layer + scene-first fixtures + docs closeout) is now complete, shipped as tickets SPEC99CONPACSCE-001 (packet layer + tests + contract doc), SPEC99CONPACSCE-002 (docs scene-first closeout sweep), and SPEC99CONPACSCE-003 (scene_coverage consumption in branching-story-health-audit). All specs and tickets are in `archive/specs/` and `archive/tickets/`. This order is archived with a date suffix as the closeout of the iteration.

## Dependency sequence

```
SPEC-94  ✅ done — (contract: SCN.status decoupling; derived publication indicator)
   │
   ▼
SPEC-95  ✅ done — (world-index: drop pages-prose* inventory; derived scene-coverage layer; validator rename)
   │
   ▼
SPEC-96  ✅ done — (story-explorer backend: overview/timeline/scenes/unscened/state-tick-xray; remove page-prose routes)
   │
   ▼
SPEC-97  ✅ done — (story-explorer frontend: scene-first dashboard/timeline/scene-detail/unscened + x-ray drawer)
   │
   ▼
SPEC-98  ✅ done — (search grouped by scene/unscened + MVP single-layer branch-map; removed SPEC-90 placeholders)
   │
   ▼
SPEC-99  ✅ done — (MCP scene_coverage packet layer [needs SPEC-95]; scene-first fixtures; docs closeout [done last, after 96/97/98 stabilized])
```

## Phase table

| Order | Spec | Scope | Depends on | Phase (report §19) | Status |
|---|---|---|---|---|---|
| 1 | **SPEC-94** | Remove SCN `status`; derive publication indicator (no hashing) | — | 1 (contract) | ✅ done |
| 2 | **SPEC-95** | World-index: remove `pages-prose*` inventory; derived scene-coverage layer over existing scene edges; rename 2 PG causal validators; retire legacy page-prose receipt schema | SPEC-94 | 2–3 | ✅ done |
| 3 | **SPEC-96** | Backend scene/timeline/unscened/overview + state-tick x-ray API; remove page-prose reader routes + `PageDetail` | SPEC-95 | 4 | ✅ done |
| 4 | **SPEC-97** | Frontend route/view-model/component replacement; embedded PG x-ray drawer | SPEC-96 | 5 | ✅ done |
| 5 | **SPEC-98** | Search (scene/unscened grouping) + MVP single-layer scene branch-map; remove SPEC-90 placeholder routes | SPEC-96, SPEC-97 | 6 | ✅ done |
| 6 | **SPEC-99** | MCP `scene_coverage` packet layer; scene-first fixtures; docs closeout | SPEC-95 (packet); SPEC-96/97/98 (closeout) | 7–9 | ✅ done |

## Notes

- **Strict ordering 94 → 95 → 96 → 97** is load-bearing: each consumes the prior's contract (SCN-without-status → coverage view → backend API → frontend).
- **SPEC-99 is partially parallelizable**: its `scene_coverage` packet layer only needs SPEC-95 and can proceed alongside SPEC-96/97; its **docs/fixtures closeout must land last** (after 96/97/98) so doc text and fixture shapes are stable.
- **SPEC-98 removed the SPEC-90 placeholder routes/tests** (and the page-centric `BranchMapNode`/`BranchMapEdge` view-models + frontend mirrors); deleting the `specs/SPEC-90-*.md` file and archiving it with a supersession note is the author's separate action this iteration.
- Rejected report items are not specced: verbatim-contract externalization, receipt hash-fingerprints/publication profiles, PG `plan`/`prose_plan_path` removal, the 8-state publication machine, and (deferred, not rejected) the dual-layer branch-map + full focus-mode set.
