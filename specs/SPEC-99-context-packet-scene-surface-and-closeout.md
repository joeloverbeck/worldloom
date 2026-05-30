# SPEC-99 — MCP Context-Packet Scene Surface + Fixture/Test/Docs Closeout

**Status:** draft
**Date:** 2026-05-28
**Classification:** story-canon-related (adds a `scene_coverage` surface to the MCP story context packet consumed by authoring skills; wires that surface into `branching-story-health-audit`; verifies/closes out the scene-first test fixtures and docs. Reads story records, mutates nothing.)
**Depends on:** **SPEC-95** (the world-index scene-coverage view the packet surfaces) and, for the docs/fixtures closeout, the landed shape of **SPEC-96/97/98**. Land SPEC-95 first; do the docs closeout last.
**Related:** `docs/CONTEXT-PACKET-CONTRACT.md` §6 (story bundle context), `tools/world-mcp` (`buildStoryBundleContext`). MCP already supports SCN retrieval via `get_record`/`list_records` (`scene_record`) — this spec adds the *packet* surface + closeout, not new retrieval primitives.
**Source:** critical triage of `reports/scene-prose-planning-second-iteration.md` §13/§15/§19 phases 7–9 (adjudicated in `docs/triage/2026-05-28-scene-prose-second-iteration-triage.md`; SPEC-99 owns the §13 packet surface + §15 docs/fixture closeout; the report's other claims route to the landed SPEC-94..98).

---

## 1. Context & Motivation

The story context packet (`buildStoryBundleContext`, surfaced per `CONTEXT-PACKET-CONTRACT.md` §6) exposes ~two dozen live-state layers (storylet pool, active intentions/statuses/beliefs/relationships, threads, clocks, secrets, branch path + recent-page metadata, mysteries) but **no scene surface** — no scene coverage, no unscened-run signal, no PG→SCN binding. Authoring skills that legitimately need scene structure (`branching-story-turn-cycle`, `branching-story-health-audit`, `commitment-block-authoring`) currently have to discover SCN ids out-of-band and `get_record` them. SPEC-95 produces the coverage view; this spec surfaces a bounded projection of it in the packet **and wires the one load-bearing consumer (`branching-story-health-audit`) so the surface is not a dead field on landing** — a packet field is invisible to a skill until the skill's prose points an operator at it. The packet does **not** carry page-prose (it never did — prose is downstream of the packet), so nothing page-prose-related is removed here.

This spec also performs the iteration's **closeout**: the scene-first test fixtures (mostly already landed per-tool by SPEC-95/96/97/98 — this spec adds only the world-mcp packet-layer coverage) and the docs sweep, done last so names/contracts are stable.

## 2. Scope

### In scope

1. **`scene_coverage` packet layer** (`tools/world-mcp/src/context-packet/story-bundle-context.ts` + `shared.ts` interface + `assemble.ts` wiring): a bounded projection of SPEC-95's coverage view, scoped to the `longest_active_branch_path` the packet already computes — per relevant PG: `{ page_id, scene_ids: [...], unscened: boolean }`, plus a compact active-SCN list per branch with the SPEC-94 presence-based publication indicator. Token-budget discipline: trim-first under pressure, after the higher-priority existing layers; never carry prose bodies. Document the new layer in `CONTEXT-PACKET-CONTRACT.md` §6.

2. **Consumer enumeration (load-bearing — YAGNI gate)**: the layer ships only the fields with a named consumer. The **load-bearing consumer is `branching-story-health-audit`** — `scene_ids`/`unscened` plus the per-SCN publication indicator drive the new unscened-run / prose-debt health check (item 5). `branching-story-turn-cycle` is an **advisory, non-gating** consumer only: its state turn is scene-independent by design (it computes the delta from story records, never from prose/scene artifacts, per FOUNDATIONS §Story Bundles §4a), so it may surface an author-facing "parent PG sits N ticks into an unscened run" note but must not gate or alter state computation on `scene_coverage`. Fields without a named authoring-skill consumer (e.g., prose snapshots, PG-x-ray payloads) are **NOT** added to the packet — those serve only the story-explorer, which retrieves them via SPEC-96's API, not the packet.

3. **Scene-first test fixtures (mostly already landed — this spec verifies + adds the world-mcp packet fixture only)**: the cross-tool scene-first fixture vision already landed per-tool through SPEC-95/96/97/98 — there is no single shared fixture module, and test fixtures live per package. Specifically: `tools/story-explorer/test/scene-first-fixture.ts` is a full scene-first seed (committed PGs across two branches, a superseded SCN, a PASS scene, a planned-but-unrendered scene, a prose-present scene, a WARN-receipt scene, `scene_coverage` index rows, no page-prose artifacts); SPEC-95 built its world-index coverage tests inline (its AC#2: *"built in SPEC-99 or inline here"* → inline); validators ship their own scene tests. The world-index assertion that `pages-prose*` paths are not indexed **already landed via SPEC-95** (`tools/world-index/tests/schema.test.ts` "legacy page-prose deindex migration…", asserting zero `pages-prose*` node / file-version rows; SPEC-95 AC#1). **Residual work for this spec:** add world-mcp packet-layer test coverage for the `scene_coverage` layer, seeding the `scene_coverage` index in world-mcp's existing `tests/context-packet/` style (extend `story-bundle-context.test.ts` / `story-bundle-budget.test.ts`) — not a new shared fixture. (If a small shared seed proves worth extracting later, that is a separate refactor, not this spec.)

4. **Docs closeout**: update the **live docs that still present page-prose as a live artifact or reference removed page-first specs** — `README.md` (the `pages-prose*` directory table at lines 134–136 and the `pages-prose/PG-<n>.md` reference at line 440), `docs/WORKFLOWS.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/prose-renderer-contract/*`, and the `tools/{world-index,world-mcp,validators,story-explorer}/README.md` files — to describe the scene-first explorer + the `scene_coverage` packet layer, and to stop pointing at page-prose as a live artifact or at SPEC-90 as an active prerequisite. The concrete SPEC-90 residue is the dangling reference at `tools/story-explorer/README.md:82` (the `specs/SPEC-90-*.md` file is **already removed** — no file remains to archive; SPEC-98 carries its contract, per `specs/IMPLEMENTATION-ORDER.md`). **Already verified scene-first-correct — no sweep needed** (recorded here so the closeout is auditable): `docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/_shared-templates/story-record-schemas.md`, and `tools/patch-engine/README.md` all frame page-prose as read-only legacy / grandfathered (report §15 named them, but they need no edit; the §4.6 legacy receipt block is deliberately retained — see §8). `specs/IMPLEMENTATION-ORDER.md` is reconciled when SPEC-99 itself is marked complete.

5. **`scene_coverage` consumption in `branching-story-health-audit`** (`.claude/skills/branching-story-health-audit/SKILL.md`): add an unscened-run / prose-debt health sub-check (natural home: Phase 2c debt-and-saliency or Phase 2f continuation/terminal proof) that reads `story_bundle_context.scene_coverage` as its index surface and targeted-`get_record`s SCN bodies as needed, flagging (a) long unscened PG runs (accumulating prose-rendering debt), (b) scenes stuck `planned` with no prose, (c) `WARN`-receipt scenes, and (d) superseded scenes left un-resuperseded. The skill currently has **no** unscened-run check; this is the consumption that makes the item-1 field load-bearing (`story_bundle_context` is the skill's documented index surface per its SKILL.md). Per reassess-spec's spec-vs-implementation boundary, the SKILL.md edit lands at ticket-implementation time; this item is the spec-level commitment.

### Out of scope

- Prose snapshots / PG-x-ray in the packet — **excluded** (no authoring-skill consumer; story-explorer uses SPEC-96's API). Rejected report extra.
- The coverage computation itself → SPEC-95.
- New MCP retrieval primitives — none needed (SCN retrieval already works via `get_record`/`list_records`).
- A shared cross-tool fixture module — not built; per-tool fixtures already landed with SPEC-95/96/97/98 (see item 3).
- Editing `docs/FOUNDATIONS.md`, the shared-template contracts, or `tools/patch-engine/README.md` — verified already scene-first-correct (see item 4).
- A *gating* turn-cycle use of `scene_coverage` — turn-cycle is advisory-only (see item 2 and §8).

## 3. Key decisions

- **Packet ≠ explorer.** The packet gets only what *authoring skills* consume (scene/unscened binding for the health-audit prose-debt check; an advisory drift note for turn-cycle). The explorer's richer needs (prose, x-ray) are served by SPEC-96's API, not the packet — keeps the packet token-lean and YAGNI-clean.
- **One load-bearing consumer, wired now.** `scene_coverage` ships with `branching-story-health-audit` actually consuming it (item 5), not as an "available if noticed" field. `branching-story-turn-cycle` stays advisory/non-gating because its state turn is scene-independent by design.
- **Closeout last.** Docs land after the code contracts (SPEC-94..98) stabilize, so doc text doesn't churn. The scene-first fixtures already landed per-tool with those specs; this spec adds only the world-mcp packet-layer coverage.

## 4. Files to touch

- `tools/world-mcp/src/context-packet/story-bundle-context.ts`, `shared.ts` (interface), `assemble.ts` (wiring) + colocated `tests/context-packet/` tests (extend `story-bundle-context.test.ts` / `story-bundle-budget.test.ts` with the `scene_coverage` seed).
- `docs/CONTEXT-PACKET-CONTRACT.md` §6 (new layer), `README.md` (lines 134–136, 440), `docs/WORKFLOWS.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/prose-renderer-contract/*`, `tools/{world-index,world-mcp,validators,story-explorer}/README.md` (incl. the dangling `SPEC-90` reference at `tools/story-explorer/README.md:82`).
- `.claude/skills/branching-story-health-audit/SKILL.md` — new unscened-run / prose-debt sub-check consuming `story_bundle_context.scene_coverage` (item 5).
- `.claude/skills/branching-story-turn-cycle/SKILL.md` — optional advisory "unscened-run drift" note where it documents context-packet inputs; non-gating, update only if it materially helps the author.

Package shapes (verified): `@worldloom/world-mcp` (`build`/`test` via `node --test`); the world-mcp packet test seeds its own index, consistent with the existing `tests/context-packet/` suite.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| Context packet is bounded, retrieval-first, token-disciplined (CONTEXT-PACKET-CONTRACT) | aligns | `scene_coverage` is a bounded projection scoped to the active branch path, trim-first under budget, prose-free (packet-assembly surface). |
| YAGNI — surface elements need a named consumer (CLAUDE.md / brainstorm guardrails) | aligns | The layer ships with a real consumer wired on landing: `branching-story-health-audit`'s unscened-run / prose-debt check (item 5). turn-cycle is advisory-only; explorer-only needs stay in SPEC-96's API (packet-field surface). |
| Rendered prose is non-authoritative, downstream of the packet (story-state-contract §1; CONTEXT-PACKET-CONTRACT §6 note) | aligns | No prose body enters the packet; scene coverage is membership/coverage metadata only. |
| Machine-facing layer documents its surfaces (MACHINE-FACING-LAYER / CONTEXT-PACKET-CONTRACT) | aligns | The new layer is documented in §6; the docs sweep removes stale page-prose-as-live-artifact text (docs surface). |

## 6. Build & test

`tools/world-mcp`: `npm run build && npm test` (the `scene_coverage` layer + its packet tests). The cross-tool scene fixtures already landed with SPEC-95/96/97/98 and are exercised by those tools' own `npm test`; no shared fixture is added here. Docs are prose — verify by a sweep that no live doc says rendered prose lives at `pages-prose/PG-N.md` or names SPEC-90 as an active prerequisite. The world-index `pages-prose*`-not-indexed assertion already exists (SPEC-95, `tools/world-index/tests/schema.test.ts`).

## 7. Acceptance criteria

1. The story context packet carries a bounded `scene_coverage` layer (scene_ids/unscened per active-branch PG + active-SCN list with presence-based publication indicator), documented in `CONTEXT-PACKET-CONTRACT.md` §6; covered by world-mcp tests.
2. The layer ships only fields with a named consumer: `branching-story-health-audit` (load-bearing — item 5) and `branching-story-turn-cycle` (advisory, non-gating); no prose bodies, no PG-x-ray payloads in the packet.
3. world-mcp packet-layer tests seed the `scene_coverage` index (in the existing `tests/context-packet/` style) and assert the layer's projection. The per-tool scene-first fixtures (world-index / validators / story-explorer) already landed with SPEC-95/96/97/98, and the world-index `pages-prose*`-not-indexed assertion already landed (SPEC-95, `schema.test.ts`) — this spec adds no shared fixture.
4. Live docs (`README`, `WORKFLOWS`, `MACHINE-FACING-LAYER`, `CONTEXT-PACKET-CONTRACT`, `prose-renderer-contract/*`, per-tool READMEs) describe the scene-first explorer + `scene_coverage` layer and no longer present page-prose as a live artifact or SPEC-90 as an active prerequisite (incl. the dangling `tools/story-explorer/README.md:82` reference).
5. A docs sweep confirms no live doc states rendered prose lives at `pages-prose/PG-N.md` (concrete starting sites: `README.md:134-136,440`).
6. `npm test` passes for `@worldloom/world-mcp`.
7. `branching-story-health-audit` consumes `story_bundle_context.scene_coverage` in an unscened-run / prose-debt health sub-check (flagging long unscened runs, planned-but-unrendered scenes, WARN-receipt scenes, and un-resuperseded superseded scenes).

## 8. Risks & Open Questions

- **`scene_coverage` consumer wiring.** The layer is justified by `branching-story-health-audit`'s new unscened-run / prose-debt check (item 5); `branching-story-turn-cycle` is advisory-only because its state turn is scene-independent by design (FOUNDATIONS §Story Bundles §4a). Open: if a future turn-cycle change finds a *gating* use for scene structure, that is a separate spec — do not let `scene_coverage` creep into state computation.
- **Legacy prose-receipt surface (deferred upstream).** SPEC-95 deliberately retained the §4.6 legacy `pages-prose-receipts` block in `.claude/skills/_shared-templates/story-record-schemas.md` because `story-fact-promotion-to-canon` still reads `pages-prose-receipts/<page_id>.yaml.verdict` on legacy bundles. The docs sweep here must **not** delete that block; removal stays deferred until that consumer is migrated.
- **Per-tool fixtures, not a shared module.** The reassessment confirmed the cross-tool shared fixture never materialized; each tool seeds its own. If world-mcp's packet test and story-explorer's fixture drift in shape, extracting a shared seed is a future refactor, tracked separately — not in scope here.
