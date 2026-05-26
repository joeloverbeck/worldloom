# Implementation Order — Story Explorer (SPEC-87 → SPEC-90) + Page-Plan Cleanliness (SPEC-91)

**Origin**: triage of `reports/website-proposal.md` (2026-05-25) — SPEC-87..90; triage of `reports/page-plans-improvements-first-iteration.md` (2026-05-26) — SPEC-91
**Companion triage (SPEC-87..90)**: `docs/triage/2026-05-25-website-proposal-triage.md`

This file orders the four Story Explorer specs and records the named assumptions and "Should Wait" backlog that came out of the triage. All four specs together implement the v1 viewer the proposal calls for. SPEC-91 is an orthogonal page-plan body-cleanup track added 2026-05-26; it has no dependency on SPEC-87..90 and vice versa.

---

## Order

| # | Spec | Subject | Depends on |
|---|---|---|---|
| 1 | SPEC-87 | Backend foundation (package skeleton, read-only HTTP API, view models, source priority, index freshness) | — |
| 2 | SPEC-88 | Frontend foundation & page reading surface (React/Vite scaffold, pickers, prose panel, choice navigation, accessibility baseline) | SPEC-87 |
| 3 | SPEC-89 | State X-Ray layer (8 record groups, 4 tabs, deterministic summaries, raw YAML escape hatch, linked-record navigation) | SPEC-87, SPEC-88 |
| 4 | SPEC-90 | Branch map drawer & page search (focus-trapped drawer overlay, FTS-backed search) | SPEC-87, SPEC-88, SPEC-89 |
| — | SPEC-91 | Page-plan body renderer cleanliness & structural enforcement (extends PPLAN-005/006 to §7/§7a/§9/§9b/§9c/§10b/§14; new plan-body engine-vocabulary validator; `reports/prose-quality-instructions.md` cleanup) | — (orthogonal to SPEC-87..90; extends PROSESPLIT + PPLAN) |

SPEC-87 is the structural base; nothing else compiles or renders without it.

**Implementation status (2026-05-26):** SPEC-87 is completed and archived at `archive/specs/SPEC-87-story-explorer-backend-foundation.md`; SPEC-88 is completed and archived at `archive/specs/SPEC-88-story-explorer-frontend-foundation.md`; SPEC-89 is completed and archived at `archive/specs/SPEC-89-story-explorer-state-xray-layer.md`. Downstream SPEC-90 dependencies should treat those archived foundations as active prerequisites.

SPEC-88 must land before SPEC-89 or SPEC-90 because both reuse the disclosure primitive, the modal/drawer pattern, the API client, and the accessibility baseline that SPEC-88 establishes.

SPEC-89 should land before SPEC-90 because SPEC-90's branch-map node click navigates into pages that SPEC-89 fully populates with X-Ray content. SPEC-90 can technically land in parallel with SPEC-89 if the team prefers — they touch independent UI surfaces — but the user experience is more coherent landing SPEC-89 first.

---

## Named assumptions (carry-overs from the triage; user can override on review)

### A. Index refresh stays manual in v1

The Story Explorer does NOT invoke `world-index build` or `world-index sync` from inside the app. When an index is missing or stale, the frontend renders the remedy string from the backend's `IndexStatus` view-model and the user runs the CLI manually. This keeps the backend structurally read-only (Layer 4 fence in SPEC-87 §6) — there is no code path that mutates anything on disk under the worldloom repository, including derived artifacts.

**Rationale**: FOUNDATIONS §Canonical Storage Layer is unambiguous that `_source/` writes are engine-only; `_index/world.db` is derived/gitignored/regenerable, so a "refresh derived cache" button would not violate the principle. The proposal hedged on this. We default to the stricter posture for v1 because: (1) the fencing test in SPEC-87 §6 is simpler (the backend imports no write paths at all, rather than carrying a permitted-write whitelist); (2) `world-index sync` is fast and the friction is small; (3) a future spec can lift this if real friction emerges.

**Override path**: a future spec can add a "Refresh derived index" route that shells out to `world-index sync`. That spec would extend SPEC-87's read-only fence to permit a single, explicitly-named subprocess call and update the Layer 3/4 tests.

### B. Frontend framework: React + Vite

The proposal called React/Vite "a reasonable default, not a requirement" and noted SvelteKit, Solid, or Vite + web components as alternatives. SPEC-88 names React + Vite as the chosen default.

**Rationale**: low friction with the TypeScript/Node ecosystem already in `tools/`, mature accessibility tooling (axe-core, React Aria, etc.), React Flow available as the natural fit for SPEC-90's branch-map drawer. Substitution to another framework is a single-spec change (SPEC-88).

**Override path**: substitute the framework in SPEC-88 before implementation. SPEC-89 and SPEC-90 mostly depend on the disclosure / modal / API patterns SPEC-88 establishes, not on React specifically.

### C. Backend transport: local HTTP, direct `world-index` dependency

The backend depends on `@worldloom/world-index` public exports + `better-sqlite3` directly. It does NOT host an MCP server and does NOT depend on `@worldloom/world-mcp` (which would pull in the patch-engine mutation surface transitively).

**Rationale**: the verification audit confirmed no shared read-only facade exists between `world-index` and `world-mcp`. A viewer must either depend directly on `world-index` and re-implement the read parsing it needs (chosen path), or stand up MCP server-side (rejected for v1 — extra process to manage, no benefit for a single-user local tool). A future refactor could extract a shared read library if `world-mcp` is also moved off direct duplication.

### D. No spoiler protection in v1

The Story Explorer is explicitly an author/x-ray surface (proposal §4 / §7). Hidden state — beliefs, secrets, mystery reserves, branch-local truth, validation traces, author-only plan material — appears in the X-Ray when relevant, with visibility chips for clarity, but is NOT masked.

**Rationale**: FOUNDATIONS §6b Information / Observer Firewall enforcement happens at story-pipeline authoring time (SLT selection, CHC emission, page-plan commit), not at viewing time. A reader-safe spoiler mode is a separate product surface (Future Enhancements).

**Override path**: a future "Reader-safe mode" spec can add a presentation filter that masks records by visibility class, rendering "[hidden]" placeholders for `concealed` / `suppressed` / `protected_mystery` material.

### E. MVP cut matches proposal §13

The v1 ships everything in proposal §13 "Must be in v1": local Node backend, web frontend, world picker, story picker, open PG-1, page search/jump by PG ID, centered rendered prose, missing-prose placeholder, existing-child-only choice navigation, multi-child variants per choice, parent/back, lightweight breadcrumb, branch-map drawer, Current State / What Changed Here X-Ray, deterministic record cards for core classes, raw-YAML escape hatch, plan/prose/receipt boundary display, stale/missing index detection, local search/filter, keyboard-accessible disclosures/tabs/drawer, no write routes.

The "Should Wait" list (proposal §13) is captured in the Future Enhancements section below; none of those items are spec'd here.

---

## Future Enhancements (deferred — NOT spec'd here)

Carried forward from proposal §14 and §13 "Should Wait":

- Richer branch map (clustering, branch coloring, path focus)
- Timeline mode (SE/PG/CHC evolution view)
- Sibling branch comparison
- "What differs between these two outcome variants" view
- Static export / share bundle
- Reader-safe spoiler mode
- Prose receipt quality overlays over prose
- Full record diff visualization across supersession chains
- Packaged desktop app
- Author annotations (if future records support them)
- Screenshot / thumbnail support (if story assets ever exist)
- Saved reading sessions stored outside story source
- Graph neighborhood around a selected record
- X-Ray "why is this active?" provenance explainer beyond the SE-link chain SPEC-89 ships
- Schema-aware validation explanations beyond the deterministic pass/fail strings
- Import-free demo mode using fixture worlds
- Editing / generation / continuation / skill integration (explicitly out — would break the read-only architecture)

A future spec that picks up any of these should start with a brainstorm reassessment, because the v1 user experience may shift the priority order materially.

---

## Resolved SPEC-87 decisions

These were open decisions before SPEC-87 implementation. Final SPEC-87 state:

1. **Default port**: `5174`.
2. **Capstone smoke fixture**: the checkout-local `worlds/erotica-world/stories/red-bunny/` path was absent in this worktree, so the archived SPEC-87 capstone uses a temp-seeded red-bunny-shaped fixture and verifies no checkout-local world path is created.
3. **Bin command**: `story-explorer`.
