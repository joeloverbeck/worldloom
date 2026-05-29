# Triage — Scene-Prose Planning, Second Iteration

**Date:** 2026-05-28
**Source:** `reports/scene-prose-planning-second-iteration.md` (ChatGPT-Pro; SHA-unverified per its own §2 — claims verified against the live tree before triage).
**Framing:** The first iteration deferred all `tools/story-explorer` changes; this iteration's purpose is to land the scene-first explorer. Engine half already landed: archived SPEC-92 (SCN render layer) + SPEC-93 (page-plan decoupling).
**Deliverables:** 6 specs (SPEC-94..99) + `specs/IMPLEMENTATION-ORDER.md`. SPEC-90 excluded (being removed; superseded by SPEC-98).

## Accepted → specs

| Item (report §) | Spec | Rationale |
|---|---|---|
| SCN.status is a dead-enum / stale field on append-only SCN (§3/§10/§12) | `specs/SPEC-94-scn-publication-status-decoupling.md` | `rendered`/`attached` unreachable; derive publication from artifact presence + receipt verdict, no hashing. |
| Scene-coverage index + page-prose inventory removal + validator rename (§11/§13) | `specs/SPEC-95-scene-coverage-index-and-validator-cleanup.md` | Build coverage on existing `scene_*` edges; rename 2 PG-causal validators; presence-based only. |
| Backend scene/timeline/unscened/x-ray API (§7/§9) | `specs/SPEC-96-story-explorer-scene-backend-api.md` | Replace page-first reader routes; PG demoted to x-ray surface. |
| Frontend scene-first / author-x-ray UI (§6/§8/§9) | `specs/SPEC-97-story-explorer-scene-first-frontend.md` | Timeline-primary; reuse x-ray infra; delete `/pages/:pageId`. |
| Search + MVP scene branch-map (§12/§14) | `specs/SPEC-98-story-explorer-scene-search-and-branch-map.md` | Container-grouped search; single-layer scene map (dual-layer deferred); removes SPEC-90 placeholders. |
| MCP scene_coverage packet + fixtures + docs closeout (§13/§15) | `specs/SPEC-99-context-packet-scene-surface-and-closeout.md` | Packet gets only authoring-skill-consumed fields; scene-first fixtures; docs sweep. |

## Rejected (contradict committed decisions)

- **Externalize scene-plan verbatim contract behind version/hash refs (§10/§13)** — reverses load-bearing verbatim inlining ([[feedback_page_plan_verbatim_sections]], SPEC-92/93 §64) + reintroduces rejected hash coupling.
- **Receipt freshness fingerprints + draft/review/publishable publication profiles (§10)** — hash coupling on editable artifacts ([[feedback_author_rejects_hash_coupling]]); existing strict+verdict+notes suffice.
- **Remove optional PG `plan`/`prose_plan_path` from live schema (§11/§13)** — contradicts SPEC-93's deliberate optional+grandfathered decision; zero benefit (0 PG records).
- **8-state `ScenePublicationState` machine / "stale_receipt" states (§10)** — rides on rejected hashing; replaced by SPEC-94's presence-based indicator.

## Deferred within scope (not rejected)

- **Dual-layer (scene+PG) branch map + full focus-mode set + reader/causal toggle (§14)** — SPEC-98 ships MVP single-layer; revisit if a playtest demands it.
- **PG→TICK record-class rename (§17)** — report itself says "not now"; agreed.

## Already resolved (SPEC-92/93)

- Page-plan validators, Hook 6/7, `branching-story-prose-attach` skill retired (§11/§13).
- `pages-prose*` reclassified read-only legacy; prose doesn't create state (§5/§11).

## Follow-up / author action

- Remove `specs/SPEC-90-*.md` and archive with a supersession note → SPEC-98 (author's action; SPEC-98 removes its placeholder routes/tests; SPEC-99 updates docs that reference it).
