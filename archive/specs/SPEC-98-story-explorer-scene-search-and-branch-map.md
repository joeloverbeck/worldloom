# SPEC-98 — Story Explorer Search + MVP Scene Branch-Map

**Status:** ✅ COMPLETED (tickets SPEC98STOEXPSCE-001..004; archived `archive/tickets/`)
**Date:** 2026-05-28
**Classification:** story-canon-related (tooling that operates on story-handling logic — implements scene/unscened-grouped search and an MVP single-layer scene branch-map over the SPEC-96 segment model; read-only).
**Depends on:** **SPEC-96** (timeline segment model + scene/unscened read layer) and **SPEC-97** (frontend shell to host the search modal + branch-map route). Both have **landed and are archived** (`archive/specs/SPEC-96-story-explorer-scene-backend-api.md`, `archive/specs/SPEC-97-story-explorer-scene-first-frontend.md`); `specs/IMPLEMENTATION-ORDER.md` marks SPEC-98 next/unblocked.
**Supersedes:** the page-centric search + branch-map intent of `SPEC-90` (`specs/SPEC-90-story-explorer-branch-map-and-search.md` — file already removed from `specs/`; its live contract is carried here per `specs/IMPLEMENTATION-ORDER.md`) and its `not_implemented` placeholder routes (`src/server/routes/search.ts`, `branch-map.ts`). **SPEC-90 is being removed this iteration; this spec carries the live search/branch-map contract.**
**Source:** critical triage of `reports/scene-prose-planning-second-iteration.md` §12/§14/§19 phase 6. Branch-map scope is the confirmed **MVP single-layer** scene map (full dual-layer deferred).

---

## 1. Context & Motivation

`search.ts` and `branch-map.ts` currently return `{ kind: "not_implemented", spec: "SPEC-90" }` placeholders; SPEC-90 itself is page-centric (PG graph nodes, page-search modal, page-jump actions, a `searchPages` client) but was never implemented — only its `not_implemented` route placeholders (and page-centric branch-map view-model sketches) exist in code. With the segment model (SPEC-96) and scene-first frontend (SPEC-97) in place, search and branch-map are implemented against scenes / unscened ranges / state ticks — not pages — and the SPEC-90 placeholders are removed.

## 2. Scope

### In scope

1. **Remove SPEC-90 placeholders**: replace the `not_implemented` bodies in `src/server/routes/search.ts` and `branch-map.ts` with real implementations; remove the page-centric branch-map view-models `src/view-models/branch-map-node.ts` (`BranchMapNode`, keyed on `pageId`/`turnIndex`/`hasProse`) and `branch-map-edge.ts` (`BranchMapEdge`, keyed on `fromPageId`/`toPageId`) — SPEC-87/SPEC-90-era page-model scaffolding — and the SPEC-90 references in tests (`sketch-routes.test.ts`: both the `not_implemented` assertions **and** its "branch-map view-model types expose the SPEC-87 type-only fields" test, plus `capstone-smoke.test.ts`). (No `searchPages` client was ever created — SPEC-90 was never implemented and SPEC-97 built the frontend scene-first — so there is no `searchPages` to remove; §6 keeps a trivially-passing absence guard. Deletion of the `specs/SPEC-90-*.md` file itself is the user's separate action this iteration.)
2. **Search** — `GET .../search?q=&kinds=&domains=&groupBy=scene_or_unscened_range`: result kinds `scene` | `scene_prose` | `scene_plan` | `scene_receipt` | `unscened_range` | `state_tick` | `event` | `choice` | `record` | `validation` | `raw_source`; domains: prose text, plan text, receipt text, state YAML, metadata/id, validation/freshness. Default grouping: (1) containing scene, (2) unscened range, (3) branch-level orphan/technical hit. A raw-record hit reports its container ("Record hit inside SCN-3, PG-9 state tick" / "...inside unscened range PG-14..PG-18"); raw bodies expandable, not dumped. Search must still work when no scene exists (group under unscened runs / PG x-ray contexts). Backed by the world-index FTS (`fts_nodes`) the MCP/hooks layer already uses, plus SPEC-95 coverage for grouping. Not named `searchPages`.
3. **Branch map — MVP single-layer scene map** — `GET .../branch-map?focus=SCN-N|PG-N|CHC-N|BR-N&depth=N`: returns **scene-layer** nodes only — `scene` nodes, `unscened_run` nodes (compressed bars: "PG-14..PG-18 · 5 ticks · no SCN · final choices: 4"), `branch_split` nodes, `choice_surface` nodes, `terminal_marker` nodes — plus focus + depth bounding and sibling-branch visibility (scenes are branch-local; do not force cross-branch segmentation). **Deferred** (not this spec): the expandable PG/tick layer, the full focus-mode set (ancestors/descendants/sibling-outcomes), and the reader-vs-causal map toggle — revisit if playtest demands. The frontend renders the map inside a focus-trapped drawer/route (WAI-ARIA APG: focus trap, Escape closes, focus returns), reusing SPEC-97's shell.
4. **Frontend**: `SearchModal` (query input, grouped results, jump-to-segment action wired to timeline/scene focus, keyboard nav) and `BranchMapCanvas` (single-layer scene segments; canvas library is implementer's choice, used only inside the drawer, never a permanent dominant graph). New client function `search(...)` (added) and a scene-layer `getBranchMap(...)` replacing the existing page-focused, currently-unused `getBranchMap` at `web/src/api/client.ts:506` (no `searchPages` exists to replace).

### Out of scope

- The full dual-layer (scene + PG tick) branch map, all focus modes, and the reader/causal toggle → deferred follow-up (confirmed MVP-only this iteration).
- Backend segment model / coverage layer → SPEC-96 / SPEC-95.
- Deleting the SPEC-90 spec file → user's action this iteration (this spec removes its placeholder *routes/tests*).

## 3. Key decisions

- **MVP branch-map.** Single-layer scene/unscened/choice/split/terminal nodes only; the report's dual-layer + multi-focus-mode ambition is deferred (your confirmed scope) to keep this phase shippable.
- **Search groups by container, not by page.** Hits roll up under containing scene or unscened range; raw record bodies are expandable, never the top-level output — and search degrades to unscened/x-ray grouping when no scenes exist.

## 4. Files to touch

- Backend: `tools/story-explorer/src/server/routes/search.ts`, `branch-map.ts` (real impl); `src/read/` search + branch-map modules; new scene-layer view-models `SearchHit`, `BranchMapGraph` — the latter introducing scene-layer node/edge types that **replace** the existing page-centric `src/view-models/branch-map-node.ts` / `branch-map-edge.ts` (remove those). Tests: rewrite `sketch-routes.test.ts` (remove both the SPEC-90 `not_implemented` assertions and the page-centric branch-map view-model type test), add search/branch-map route tests.
- Frontend: `web/src/components/SearchModal.tsx`, `BranchMapCanvas.tsx`; `web/src/api/client.ts` (add `search`; replace the page-focused `getBranchMap`); `web/src/app.tsx` (`/search`, `/branch-map` routes); a11y tests for drawer/modal.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| PG = causal tick, not a reader page (SPEC-92/93) | aligns | Search result kind `state_tick` and branch-map PG focus resolve to x-ray contexts, never page-reader jumps (result-routing surface). |
| `SCN` branch-local render unit (SPEC-92) | aligns | Branch-map scenes are branch-local; no forced cross-branch scene segmentation (graph-model surface). |
| Machine-facing honesty under stale index | aligns | Search/branch-map carry the index-status envelope; degrade rather than fabricate (envelope surface). |
| YAGNI (CLAUDE.md / brainstorm guardrails) | aligns | MVP single-layer map ships the load-bearing surface; dual-layer/focus-mode ambition deferred until a named playtest consumer (scope surface). |

## 6. Build & test

`tools/story-explorer`: `npm test` (backend `node --test` + `web` vitest). Add route tests for search grouping + branch-map MVP nodes; assert the SPEC-90 `not_implemented` placeholders are gone and no `searchPages` remains (the latter is a trivially-passing guard — `searchPages` was never created).

## 7. Acceptance criteria

1. `search` returns container-grouped hits (scene / unscened range / branch-level) across the named result kinds + domains, works when no scenes exist, and never dumps raw record bodies at top level; it is not named `searchPages`.
2. `branch-map` returns an MVP single-layer scene map (scene / unscened-run / branch-split / choice-surface / terminal nodes) with focus + depth + sibling-branch visibility; the dual-layer/focus-mode set is documented as deferred.
3. The SPEC-90 `not_implemented` placeholder routes, their tests, and the page-centric `BranchMapNode`/`BranchMapEdge` view-models are removed; both routes return real data. (No `searchPages` client ever existed — SPEC-90 was unimplemented — so its absence is a trivially-passing guard, not a removal task.)
4. Frontend `SearchModal` + `BranchMapCanvas` host the surfaces in an accessible drawer/modal (focus trap, Escape, focus return), reusing the SPEC-97 shell.
5. `npm test` passes for the story-explorer tool.

## 8. Risks & open questions

- **FTS coverage of text domains.** §2 asserts search is backed by the world-index FTS (`fts_nodes`), which indexes `body` / `heading_path` / `summary` of indexed `nodes` (`tools/world-index/src/schema/migrations/001_initial.sql`). Whether scene-prose / scene-plan / scene-receipt **body text** (the `prose text` / `plan text` / `receipt text` domains) is actually indexed into `fts_nodes` is unverified at spec time. If a domain is not FTS-covered, search over it must fall back to a direct artifact text scan via the `src/read/` layer (scene artifacts are already inventoried by SPEC-95 coverage). The implementer must confirm per-domain FTS coverage before relying on `fts_nodes` for all six domains.
- **Deferred branch-map surface.** The dual-layer (scene + PG tick) map, the full focus-mode set (ancestors / descendants / sibling-outcomes), and the reader-vs-causal toggle are deferred to a follow-up (confirmed MVP-only this iteration); revisit when a named playtest consumer demands them.
- **SPEC-90 file deletion is an out-of-band author action.** This spec removes SPEC-90's placeholder routes, tests, and page-centric view-models; deleting the `specs/SPEC-90-*.md` file is the author's separate action (already done — the file is absent from `specs/` and `archive/specs/`).
