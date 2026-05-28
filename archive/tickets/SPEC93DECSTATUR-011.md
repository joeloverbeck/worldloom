# SPEC93DECSTATUR-011: FOUNDATIONS + docs amendments (pipeline shape, plan-authority, Rule 1/7, roster, page-plan refs)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `docs/FOUNDATIONS.md`, `docs/WORKFLOWS.md`, `docs/HARD-GATE-DISCIPLINE.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/REPOSITORY-MAP.md`, `docs/prose-renderer-contract/README.md`, and renderer-bound source headers under `docs/prose-renderer-contract/`
**Deps**: archive/tickets/SPEC93DECSTATUR-003.md, archive/tickets/SPEC93DECSTATUR-009.md

## Problem

SPEC-93 §5 amends FOUNDATIONS so the narrative contract matches the post-teardown pipeline: §Story Bundles §4 (pipeline shape — no page plan at bundle/turn commit), §4a (plan-authority anchors on the `PG` record; prose-deviation routing reroutes to scene-prose-attach), Rule 1 (grounding rehomes to the `PG` record's state delta), Rule 7 (gate 3 stays authoritative; rendered-prose firewall -> scene `scene_range_forbidden_mystery_resolution`; remove page-plan §11 references), §9 (drop page-plan §2/§3/§19 hosting language + drop prose-attach from the scope roster), and §7 (drop prose-attach from the Category 2c roster: ten -> nine). The sibling docs and renderer-bound source headers that reference page-plan/prose-attach surfaces are reconciled in the same atomic landing.

## Assumption Reassessment (2026-05-28)

1. At intake, `branching-story-prose-attach` appeared at FOUNDATIONS lines 474 (Rule 7 firewall), 616 (§4 pipeline shape), 626 (§4a routing), 702 (§7 roster, 10 skills), 718 (§9 scope roster, 10 skills); the §7 and §9 rosters enumerated the same ten skills; `scene_range_forbidden_mystery_resolution` was present at `tools/validators/src/structural/scene-prose-receipt-content.ts` (the firewall reroute target).
2. SPEC-93 §5 enumerates the FOUNDATIONS amendments (§4/§4a/Rule1/Rule7/§9/§7); §6 docs bullet names the five sibling `docs/` files; §8 AC7 (FOUNDATIONS + contract amended consistently; no dangling page-plan contract references remain).
3. Cross-artifact boundary: the §7/§9 Category 2c roster is mirrored in `cross-skill-consistency.md` (reconciled in archive/tickets/SPEC93DECSTATUR-009.md); the docs reference all upstream removed surfaces (validators retired in 003, prose-attach retired in 009 — Deps), so the docs must land after those exist coherently.
4. FOUNDATIONS Rule 1 (grounding → `PG` record), Rule 6 (the amendments are logged spec-level changes, not silent retcons — the teardown is documented), Rule 7 (gate 3 authoritative; rendered-prose firewall → scene attach) — the ticket restates all three consistently with the realized code/contract.
5. (HARD-GATE / Canon Safety) The Rule 7 mystery-firewall paragraph is a Canon Safety Check surface in prose. The landed amendment keeps gate 3 authoritative on the `PG` record and reroutes the rendered-prose firewall to `scene_range_forbidden_mystery_resolution` (verified present in `docs/FOUNDATIONS.md`) without weakening the MR firewall or resolving a forbidden-status `M`.
6. (was template item 7 — reference removal blast radius) Grep FOUNDATIONS + the ticket-owned docs for `branching-story-prose-attach`, `pages-prose-plans`, `page_plan_`, page-plan §11/§2/§3/§19 references; remove/reroute each; both the §7 and §9 rosters drop prose-attach (ten → nine) per reassessment M2.
7. During implementation, the stale page-plan header prose in `docs/prose-renderer-contract/{content-policy.md,prose-craft-contract.md,render-time-instruction.md}` proved same-seam with the README contract. Those files are absorbed into this ticket because they are the renderer-bound source files named by the README and §9 prose-length contract; leaving them as page-plan-authoring surfaces would make the docs amendment untruthful.

## Architecture Check

1. Landing all FOUNDATIONS + docs amendments in one atomic ticket (after the implementation tickets, Deps 003+009) avoids a staleness window where the narrative contract describes retired surfaces; it is the §Cross-Cutting Docs Ticket Shape.
2. No backwards-compatibility shim: page-plan §11/§2/§3/§19 references are removed (not kept alongside scene equivalents); prose-attach leaves both rosters.

## Verification Layers

1. §4/§4a pipeline-shape + plan-authority rewritten -> codebase grep-proof + manual review (no page-plan render artifact in the state turn; routing → scene-prose-attach).
2. Rule 1 / Rule 7 paragraphs rehomed -> FOUNDATIONS alignment check (grounding on `PG` record; gate 3 authoritative; rendered-prose firewall → scene).
3. §7 + §9 rosters drop prose-attach -> codebase grep-proof (both rosters list nine skills; the two scene skills present, prose-attach absent).
4. Ticket-owned docs reconciled -> codebase grep-proof per doc (post-implementation tree: no live page-plan-authoring / prose-attach references).

## Landed Changes

### 1. FOUNDATIONS §Story Bundles §4 / §4a

Rewrote §4 (no new `pages-prose-plans/PG-<integer>.md` at bundle/turn commit; state authoritative at `PG`-record commit; prose at scene level) and §4a (authority anchors on the `PG` record; "rendered prose is a rendering of committed state" generalizes to scene prose; the "prose deviating from plan is routed by `branching-story-prose-attach`" sentence reroutes to `branching-story-scene-prose-attach`).

### 2. FOUNDATIONS Rule 1 + Rule 7 paragraphs

Rule 1 now states that the load-bearing engine artifact is the `PG` record's state delta (grounded via gate 7), not a markdown page plan. Rule 7 keeps gate 3 as the authoritative state-turn firewall on the `PG` record, removes page-plan §11 references, and moves the rendered-prose firewall to scene attach (`scene_range_forbidden_mystery_resolution`).

### 3. FOUNDATIONS §9 + §7 rosters

§9 drops page-plan §2/§3/§19 hosting language (verbatim blocks hosted in scene plans) and drops `branching-story-prose-attach` from the §9 scope roster. §7 drops `branching-story-prose-attach` from the Category 2c roster (ten → nine; the two SPEC-92 scene skills remain). The verbatim-inlining decision is preserved at scene-plan level.

### 4. Sibling docs and renderer-contract source headers

Reconciled `docs/WORKFLOWS.md`, `docs/HARD-GATE-DISCIPLINE.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/REPOSITORY-MAP.md`, `docs/prose-renderer-contract/README.md`, and the three renderer-bound source headers under `docs/prose-renderer-contract/` — removed/rerouted page-plan-authoring + prose-attach references to the scene layer or planless-PG state.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `docs/WORKFLOWS.md` (modify)
- `docs/HARD-GATE-DISCIPLINE.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)
- `docs/REPOSITORY-MAP.md` (modify)
- `docs/prose-renderer-contract/README.md` (modify)
- `docs/prose-renderer-contract/content-policy.md` (modify)
- `docs/prose-renderer-contract/prose-craft-contract.md` (modify)
- `docs/prose-renderer-contract/render-time-instruction.md` (modify)

## Out of Scope

- The `cross-skill-consistency.md` roster reconcile (archive/tickets/SPEC93DECSTATUR-009.md — the FOUNDATIONS §7/§9 rosters are this ticket; their `cross-skill-consistency.md` mirror is 009).
- The shared-template contract amendments (archive/tickets/SPEC93DECSTATUR-010.md).
- Any production-code change (docs-only ticket).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "branching-story-prose-attach" docs/FOUNDATIONS.md` returns no hits; both §7 and §9 rosters list nine skills.
2. The Rule 7 paragraph names `scene_range_forbidden_mystery_resolution` as the rendered-prose firewall and keeps gate 3 authoritative on the `PG` record.
3. Per-doc grep-proofs: no live page-plan-authoring / prose-attach references survive in the ticket-owned docs (only annotated legacy-read mentions).

### Invariants

1. The §7 and §9 Category 2c rosters are consistent (both nine skills) and match `cross-skill-consistency.md` (009).
2. The MR firewall is preserved in prose (gate 3 authoritative; rendered-prose firewall → scene attach); no forbidden-status `M` is resolved.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based (per-doc grep-proofs above) and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rn "branching-story-prose-attach\|pages-prose-plans\|page_plan_" docs/FOUNDATIONS.md docs/WORKFLOWS.md docs/HARD-GATE-DISCIPLINE.md docs/MACHINE-FACING-LAYER.md docs/REPOSITORY-MAP.md docs/prose-renderer-contract | grep -v "scene-\|SPEC-93\|SPEC-92\|legacy\|grandfather"` — no hits.
2. `grep -n "branching-story-scene-plan\|branching-story-scene-prose-attach" docs/FOUNDATIONS.md` confirms both §7 and §9 rosters carry the scene skills.

## Outcome

Completed 2026-05-28. The docs contract now anchors story state on committed `PG` / `SE` records, preserves the nine shared hard gates with gate 7 and gate 9 rehomed to record surfaces, reroutes rendered-prose validation to `branching-story-scene-prose-attach`, and marks page-plan/page-receipt artifacts as legacy-read surfaces where they remain mentioned. The Category 2c roster in FOUNDATIONS now lists nine skills and excludes `branching-story-prose-attach`.

The prose-renderer contract README and source-file headers now describe scene-plan inlining as the current renderer-bound surface. No production code, schemas, validators, or world content changed.

## Verification Result

1. `grep -rn "branching-story-prose-attach\|pages-prose-plans\|page_plan_" docs/FOUNDATIONS.md docs/WORKFLOWS.md docs/HARD-GATE-DISCIPLINE.md docs/MACHINE-FACING-LAYER.md docs/REPOSITORY-MAP.md docs/prose-renderer-contract | grep -v "scene-\|SPEC-93\|SPEC-92\|legacy\|grandfather"` — PASS; returned no hits, proving no unannotated live page-plan/prose-attach anchors remain in the ticket-owned docs.
2. `grep -n "branching-story-scene-plan\|branching-story-scene-prose-attach" docs/FOUNDATIONS.md` — PASS; FOUNDATIONS carries scene-skill references in Rule 7, §4, §4a, §7, and §9, including the nine-skill Category 2c roster.
3. `git diff --check -- docs/FOUNDATIONS.md docs/WORKFLOWS.md docs/HARD-GATE-DISCIPLINE.md docs/MACHINE-FACING-LAYER.md docs/REPOSITORY-MAP.md docs/prose-renderer-contract` — PASS; no whitespace errors in the owned docs.

## Deviations

1. The drafted broad command over all `docs/` was narrowed to the ticket-owned docs and `docs/prose-renderer-contract/` directory. The original all-docs sweep still finds historical design/triage/proposal artifacts under `docs/plans/` and `docs/triage/`; those are not current contract docs for this ticket.
2. Three same-seam renderer-contract source headers were added to `Files to Touch` because their page-plan-specific current-state prose would have contradicted the README and FOUNDATIONS §9 updates.
