# SPEC93DECSTATUR-011: FOUNDATIONS + docs amendments (pipeline shape, plan-authority, Rule 1/7, roster, page-plan refs)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `docs/FOUNDATIONS.md`, `docs/WORKFLOWS.md`, `docs/HARD-GATE-DISCIPLINE.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/REPOSITORY-MAP.md`, `docs/prose-renderer-contract/README.md`
**Deps**: archive/tickets/SPEC93DECSTATUR-003.md, archive/tickets/SPEC93DECSTATUR-009.md

## Problem

SPEC-93 §5 amends FOUNDATIONS so the narrative contract matches the post-teardown pipeline: §Story Bundles §4 (pipeline shape — no page plan at bundle/turn commit), §4a (plan-authority anchors on the `PG` record; prose-deviation routing reroutes to scene-prose-attach), Rule 1 (grounding rehomes to the `PG` record's state delta), Rule 7 (gate 3 stays authoritative; rendered-prose firewall → scene `scene_range_forbidden_mystery_resolution`; remove page-plan §11 references), §9 (drop page-plan §2/§3/§19 hosting language + drop prose-attach from the scope roster), and §7 (drop prose-attach from the Category 2c roster: ten → nine). The five sibling docs that reference page-plan/prose-attach surfaces are reconciled in the same atomic landing.

## Assumption Reassessment (2026-05-28)

1. `branching-story-prose-attach` appears at FOUNDATIONS lines 474 (Rule 7 firewall), 616 (§4 pipeline shape), 626 (§4a routing), 702 (§7 roster, 10 skills), 718 (§9 scope roster, 10 skills); the §7 and §9 rosters enumerate the same ten skills; `scene_range_forbidden_mystery_resolution` is present at `tools/validators/src/structural/scene-prose-receipt-content.ts` (the firewall reroute target) — all confirmed during SPEC-93 reassessment (this session).
2. SPEC-93 §5 enumerates the FOUNDATIONS amendments (§4/§4a/Rule1/Rule7/§9/§7); §6 docs bullet names the five `docs/` files; §8 AC7 (FOUNDATIONS + contract amended consistently; no dangling page-plan contract references remain).
3. Cross-artifact boundary: the §7/§9 Category 2c roster is mirrored in `cross-skill-consistency.md` (reconciled in archive/tickets/SPEC93DECSTATUR-009.md); the docs reference all upstream removed surfaces (validators retired in 003, prose-attach retired in 009 — Deps), so the docs must land after those exist coherently.
4. FOUNDATIONS Rule 1 (grounding → `PG` record), Rule 6 (the amendments are logged spec-level changes, not silent retcons — the teardown is documented), Rule 7 (gate 3 authoritative; rendered-prose firewall → scene attach) — the ticket restates all three consistently with the realized code/contract.
5. (HARD-GATE / Canon Safety) The Rule 7 mystery-firewall paragraph (line 474) is a Canon Safety Check surface in prose — confirm the amendment keeps gate 3 authoritative on the `PG` record and reroutes the rendered-prose firewall to `scene_range_forbidden_mystery_resolution` (verified present) without weakening the MR firewall or resolving a forbidden-status `M`.
6. (was template item 7 — reference removal blast radius) Grep FOUNDATIONS + the five docs for `branching-story-prose-attach`, `pages-prose-plans`, `page_plan_`, page-plan §11/§2/§3/§19 references; remove/reroute each; both the §7 and §9 rosters drop prose-attach (ten → nine) per reassessment M2.

## Architecture Check

1. Landing all FOUNDATIONS + docs amendments in one atomic ticket (after the implementation tickets, Deps 003+009) avoids a staleness window where the narrative contract describes retired surfaces; it is the §Cross-Cutting Docs Ticket Shape.
2. No backwards-compatibility shim: page-plan §11/§2/§3/§19 references are removed (not kept alongside scene equivalents); prose-attach leaves both rosters.

## Verification Layers

1. §4/§4a pipeline-shape + plan-authority rewritten -> codebase grep-proof + manual review (no page-plan render artifact in the state turn; routing → scene-prose-attach).
2. Rule 1 / Rule 7 paragraphs rehomed -> FOUNDATIONS alignment check (grounding on `PG` record; gate 3 authoritative; rendered-prose firewall → scene).
3. §7 + §9 rosters drop prose-attach -> codebase grep-proof (both rosters list nine skills; the two scene skills present, prose-attach absent).
4. Five docs reconciled -> codebase grep-proof per doc (post-implementation tree: no live page-plan-authoring / prose-attach references).

## What to Change

### 1. FOUNDATIONS §Story Bundles §4 / §4a

Rewrite §4 (no `pages-prose-plans/PG-<integer>.md` at bundle/turn commit; state authoritative at `PG`-record commit; prose at scene level) and §4a (authority anchors on the `PG` record; "rendered prose is a rendering of committed state" generalizes to scene prose; the "prose deviating from plan is routed by `branching-story-prose-attach`" sentence reroutes to `branching-story-scene-prose-attach`).

### 2. FOUNDATIONS Rule 1 + Rule 7 paragraphs

Rule 1: the load-bearing engine artifact is the `PG` record's state delta (grounded via gate 7), not a markdown page plan. Rule 7: gate 3 stays the authoritative plan-time firewall on the `PG` record; remove page-plan §11 references; the rendered-prose firewall moves to scene attach (`scene_range_forbidden_mystery_resolution`).

### 3. FOUNDATIONS §9 + §7 rosters

§9: drop the page-plan §2/§3/§19 hosting language (verbatim blocks hosted in scene plans); drop `branching-story-prose-attach` from the §9 scope roster. §7: drop `branching-story-prose-attach` from the Category 2c roster (ten → nine; the two SPEC-92 scene skills remain). Preserve the verbatim-inlining decision (now at scene-plan level).

### 4. Five sibling docs

Reconcile `docs/WORKFLOWS.md`, `docs/HARD-GATE-DISCIPLINE.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/REPOSITORY-MAP.md`, `docs/prose-renderer-contract/README.md` — remove/reroute page-plan-authoring + prose-attach references to the scene layer or planless-PG state.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `docs/WORKFLOWS.md` (modify)
- `docs/HARD-GATE-DISCIPLINE.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)
- `docs/REPOSITORY-MAP.md` (modify)
- `docs/prose-renderer-contract/README.md` (modify)

## Out of Scope

- The `cross-skill-consistency.md` roster reconcile (archive/tickets/SPEC93DECSTATUR-009.md — the FOUNDATIONS §7/§9 rosters are this ticket; their `cross-skill-consistency.md` mirror is 009).
- The shared-template contract amendments (SPEC93DECSTATUR-010).
- Any production-code change (docs-only ticket).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "branching-story-prose-attach" docs/FOUNDATIONS.md` returns only annotated/historical mentions; both §7 and §9 rosters list nine skills.
2. The Rule 7 paragraph names `scene_range_forbidden_mystery_resolution` as the rendered-prose firewall and keeps gate 3 authoritative on the `PG` record.
3. Per-doc grep-proofs: no live page-plan-authoring / prose-attach references survive in the five `docs/` files (only annotated legacy-read mentions).

### Invariants

1. The §7 and §9 Category 2c rosters are consistent (both nine skills) and match `cross-skill-consistency.md` (009).
2. The MR firewall is preserved in prose (gate 3 authoritative; rendered-prose firewall → scene attach); no forbidden-status `M` is resolved.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based (per-doc grep-proofs above) and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rn "branching-story-prose-attach\|pages-prose-plans\|page_plan_" docs/ | grep -v "scene-\|SPEC-93\|SPEC-92\|legacy\|grandfather"` — remaining hits must be intentional legacy-read mentions.
2. `grep -n "branching-story-scene-plan\|branching-story-scene-prose-attach" docs/FOUNDATIONS.md` confirms both §7 and §9 rosters carry the scene skills.
