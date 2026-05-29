# SPEC-99 — MCP Context-Packet Scene Surface + Fixture/Test/Docs Closeout

**Status:** draft
**Date:** 2026-05-28
**Classification:** story-canon-related (adds a `scene_coverage` surface to the MCP story context packet consumed by authoring skills; rebuilds story-bundle test fixtures scene-first; closes out docs. Reads story records, mutates nothing.)
**Depends on:** **SPEC-95** (the world-index scene-coverage view the packet surfaces) and, for the docs/fixtures closeout, the landed shape of **SPEC-96/97/98**. Land SPEC-95 first; do the docs closeout last.
**Related:** `docs/CONTEXT-PACKET-CONTRACT.md` §6 (story bundle context), `tools/world-mcp` (`buildStoryBundleContext`). MCP already supports SCN retrieval via `get_record`/`list_records` (`scene_record`) — this spec adds the *packet* surface + closeout, not new retrieval primitives.
**Source:** critical triage of `reports/scene-prose-planning-second-iteration.md` §13/§15/§19 phases 7–9.

---

## 1. Context & Motivation

The story context packet (`buildStoryBundleContext`, surfaced per `CONTEXT-PACKET-CONTRACT.md` §6) exposes 21 live-state layers (storylet pool, active intentions/statuses/beliefs/relationships, threads, clocks, secrets, branch path + recent-page metadata, mysteries) but **no scene surface** — no scene coverage, no unscened-run signal, no PG→SCN binding. Authoring skills that legitimately need scene structure (`branching-story-turn-cycle`, `branching-story-health-audit`, `commitment-block-authoring`) currently have to discover SCN ids out-of-band and `get_record` them. SPEC-95 produces the coverage view; this spec surfaces a bounded projection of it in the packet. The packet does **not** carry page-prose (it never did — prose is downstream of the packet), so nothing page-prose-related is removed here.

This spec also performs the iteration's **closeout**: scene-first test fixtures and the docs sweep, done last so names/contracts are stable.

## 2. Scope

### In scope

1. **`scene_coverage` packet layer** (`tools/world-mcp/src/context-packet/story-bundle-context.ts` + `shared.ts` interface + `assemble.ts` wiring): a bounded projection of SPEC-95's coverage view, scoped to the `longest_active_branch_path` the packet already computes — per relevant PG: `{ page_id, scene_ids: [...], unscened: boolean }`, plus a compact active-SCN list per branch with the SPEC-94 presence-based publication indicator. Token-budget discipline: trim-first under pressure, after the higher-priority existing layers; never carry prose bodies. Document the new layer in `CONTEXT-PACKET-CONTRACT.md` §6.
2. **Consumer enumeration (load-bearing — YAGNI gate)**: the layer ships only the fields with a named near-term consumer — `scene_ids`/`unscened` for `branching-story-turn-cycle` (knowing whether the parent PG is scened) and `branching-story-health-audit` (unscened-run health). Fields without a named authoring-skill consumer (e.g., prose snapshots, PG-x-ray payloads) are **NOT** added to the packet — those serve only the story-explorer, which retrieves them via SPEC-96's API, not the packet.
3. **Scene-first test fixtures**: a reusable fixture story bundle (root PG, several committed PGs, SCN-1 over PG-1..PG-3 with plan/prose/receipt, PG-4..PG-6 unscened, a sibling branch with no scene, one planned-but-unrendered scene, one attached-with-WARN receipt, no page-prose artifacts). Used by world-index coverage tests (SPEC-95), validators scene tests, story-explorer backend/frontend tests (SPEC-96/97/98), and the packet tests here. Add a world-index test asserting `pages-prose*` directories are unexpected outside archive.
4. **Docs closeout**: update `README.md`, `docs/WORKFLOWS.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/prose-renderer-contract/*`, and the `tools/*/README.md` files to describe the scene-first explorer + the `scene_coverage` packet layer, and to stop pointing at page-prose as a live artifact or at SPEC-90 as an active prerequisite. Archive `SPEC-90` with a supersession note pointing at SPEC-98 (the spec-file move is the user's action; this spec updates the *docs* that reference it).

### Out of scope

- Prose snapshots / PG-x-ray in the packet — **excluded** (no authoring-skill consumer; story-explorer uses SPEC-96's API). Rejected report extra.
- The coverage computation itself → SPEC-95.
- New MCP retrieval primitives — none needed (SCN retrieval already works via `get_record`/`list_records`).

## 3. Key decisions

- **Packet ≠ explorer.** The packet gets only what *authoring skills* consume (scene/unscened binding for turn-cycle + health-audit). The explorer's richer needs (prose, x-ray) are served by SPEC-96's API, not the packet — keeps the packet token-lean and YAGNI-clean.
- **Closeout last.** Docs + fixtures land after the code contracts (SPEC-94..98) stabilize, so doc text and fixture shapes don't churn.

## 4. Files to touch

- `tools/world-mcp/src/context-packet/story-bundle-context.ts`, `shared.ts` (interface), `assemble.ts` (wiring) + colocated tests.
- `docs/CONTEXT-PACKET-CONTRACT.md` §6 (new layer), `README.md`, `docs/WORKFLOWS.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/prose-renderer-contract/*`, `tools/{world-index,world-mcp,validators,story-explorer}/README.md`.
- Shared scene-first fixture (location chosen to be reusable across `tools/world-index`, `tools/validators`, `tools/story-explorer` test suites) + the `pages-prose*`-unexpected assertion test.
- `.claude/skills/branching-story-turn-cycle/`, `branching-story-health-audit/` — note (where they document context-packet inputs) that `scene_coverage` is now available; only update if they currently document the packet's layer list.

Package shapes (verified): `@worldloom/world-mcp` (`build`/`test` via `node --test`); fixtures consumed by each tool's own `npm test`.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| Context packet is bounded, retrieval-first, token-disciplined (CONTEXT-PACKET-CONTRACT) | aligns | `scene_coverage` is a bounded projection scoped to the active branch path, trim-first under budget, prose-free (packet-assembly surface). |
| YAGNI — surface elements need a named consumer (CLAUDE.md / brainstorm guardrails) | aligns | Only fields consumed by turn-cycle / health-audit ship; explorer-only needs stay in SPEC-96's API (packet-field surface). |
| Rendered prose is non-authoritative, downstream of the packet (story-state-contract §1; CONTEXT-PACKET-CONTRACT §6 note) | aligns | No prose body enters the packet; scene coverage is membership/coverage metadata only. |
| Machine-facing layer documents its surfaces (MACHINE-FACING-LAYER / CONTEXT-PACKET-CONTRACT) | aligns | The new layer is documented in §6; the docs sweep removes stale page-prose-as-live-artifact text (docs surface). |

## 6. Build & test

`tools/world-mcp`: `npm run build && npm test`. Cross-tool: the shared fixture is exercised by `tools/world-index`, `tools/validators`, `tools/story-explorer` test suites (`npm test` each). Docs are prose — verify by a sweep that no live doc says rendered prose lives at `pages-prose/PG-N.md` or names SPEC-90 as an active prerequisite.

## 7. Acceptance criteria

1. The story context packet carries a bounded `scene_coverage` layer (scene_ids/unscened per active-branch PG + active-SCN list with presence-based publication indicator), documented in `CONTEXT-PACKET-CONTRACT.md` §6; covered by world-mcp tests.
2. The layer ships only fields with a named authoring-skill consumer (turn-cycle, health-audit); no prose bodies, no PG-x-ray payloads in the packet.
3. A reusable scene-first fixture story bundle exists and is consumed by world-index / validators / story-explorer / world-mcp tests; a test asserts `pages-prose*` directories are unexpected outside archive.
4. Live docs (`README`, `WORKFLOWS`, `MACHINE-FACING-LAYER`, `CONTEXT-PACKET-CONTRACT`, `prose-renderer-contract/*`, per-tool READMEs) describe the scene-first explorer + `scene_coverage` layer and no longer present page-prose as a live artifact or SPEC-90 as an active prerequisite.
5. A docs sweep confirms no live doc states rendered prose lives at `pages-prose/PG-N.md`.
6. `npm test` passes for `@worldloom/world-mcp` and the cross-tool fixture consumers.
