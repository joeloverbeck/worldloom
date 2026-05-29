# SLTLIFE-001: Detect permanently-inert storylets and guide against over-narrow affect_kind predicates

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `branching-story-health-audit` structural-mode storylet-pool-coverage pass (skill prose + supporting validator/util if implemented as a deterministic check); authoring guidance in `commitment-block-authoring`. No record-schema change.
**Deps**: none

## Problem

A bootstrap-seeded commitment block can be rendered **permanently unselectable** by the engine's own state lifecycle, silently shrinking the eligible move pool with no signal to the author. Concretely, in `red-bunny` the seed block `SLT-4` "Guard the self and withhold" (move_family `evasion`) — the thematically correct block for a frightened character guarding herself — has hard predicate `any_emotion_active(kind=dread)`. But the bootstrap's own first turn (`SE-2`) matured the holder's *dread* `STEMO-2` into *fear* `STEMO-3`, and no active `dread` emotion exists anywhere in the bundle thereafter. `SLT-4` is therefore inert on every fear-driven turn — exactly the turns it was authored for. During the PG-2 → PG-3 turn this forced selection of `SLT-9` (investigation) as the nearest eligible substitute.

This is a common-sense smell: an exact-value predicate over closely-related, lifecycle-adjacent affect kinds (`dread`/`fear`/`anxiety`) is brittle against the STEMO lifecycle the engine runs. The author gets no warning that a seed block is dead.

## Assumption Reassessment (2026-05-29)

1. **Code/content**: `SLT-4` body (`worlds/erotica-world/stories/red-bunny/_source/storylets/SLT-4.yaml`): `preconditions.hard = [{pred: any_emotion_active, alias: wary, kind: dread}]`. `STEMO` `affect_kind` is an 18-value closed enum including both `dread` and `fear` (`tools/validators/src/schemas/story-emotion.schema.json`; `story-record-schemas.md` §4.5.18). `any_emotion_active(kind=…)` matches only the exact `affect_kind` (predicate-DSL grammar `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`). The dread→fear transition is recorded in `SE-2.world_logic_rationale` and the `STEMO-3` supersession of `STEMO-2`.
2. **Docs/spec**: `branching-story-health-audit` already runs a structural-mode "storylet pool coverage" pass and a "reactivity inertness" pass (SKILL § structural mode; lines ~365-372). FOUNDATIONS §Story Bundles §5a (commitment blocks are causal moves), §5b (every field load-bearing), and Rule 5 (No Consequence Evasion — every page must leave at least one continuation storylet eligible) are the governing principles: a permanently-inert block is dead schema weight and a latent consequence-capacity risk.
3. **Shared boundary under audit**: the `SLT.preconditions` predicate DSL vs the `STEMO` lifecycle. An exact `kind` filter couples a block's eligibility to a specific affect kind that the lifecycle may transition away from.
4. **FOUNDATIONS principle**: §5a/§5b and Rule 5. The audit signal flags dead causal moves; the authoring guidance keeps seed blocks eligible across lifecycle-adjacent affect kinds without inventing plot rails. Neither weakens the Mystery Reserve firewall.
8. **Adjacent contradiction**: none introduced; this surfaces a latent content-quality gap (over-narrow seed predicate) and a missing diagnostic, both future-cleanup-grade until now.

## Architecture Check

1. A bounded, deterministic audit signal — "global-pool SLT has never been eligible across the bundle's committed page history (and/or its hard predicate references an `affect_kind`/exact value that appears in no active record across that history)" — is cleaner than attempting full reachability analysis over hypothetical future states. It uses only committed snapshots the audit already walks. The authoring guidance (prefer `any_emotion_active` without an over-narrow `kind`, or a `kind` consistent with the bundle's lifecycle, or an `any[…]` of adjacent kinds) keeps blocks causal-move-shaped, not arc-shaped.
2. No backwards-compatibility shim; existing `SLT-4` is repaired through normal `commitment-block-authoring` supersession, not aliased.

## Verification Layers

1. A global-pool SLT eligible on no committed page of a bundle is flagged → skill dry-run of `branching-story-health-audit` structural mode on `red-bunny`, expecting an inert-storylet finding for `SLT-4`.
2. A block whose `kind`-exact predicate names an `affect_kind` never active in the bundle is sub-classified → audit finding detail names the unsatisfiable predicate and the absent `affect_kind`.
3. Authoring guidance is present and aligned → manual review of `commitment-block-authoring` prose citing FOUNDATIONS §5a/§5b/Rule 5.
4. No false positive for blocks that simply have not fired yet but remain eligible → audit distinguishes "eligible-but-unused" (fine) from "never-eligible" (flagged).

## What to Change

### 1. Health-audit: inert-storylet detection (storylet-pool-coverage pass)

Extend the structural-mode storylet-pool-coverage pass to emit a finding (WARNING) for each `global_author_pool` / `branch_prefix_scoped` SLT that is eligible on **no** committed page across the audited scope. Add a sub-reason when the cause is an exact-value predicate (notably `any_emotion_active(kind=…)` / `emotion_active(kind=…)`) whose named `affect_kind` appears in no active `STEMO` across the scope. The finding cites the SLT id, the unsatisfiable predicate, and (for the affect case) the absent `affect_kind` plus any lifecycle-adjacent kinds that *are* active. Recommend `repair_kind: commitment_block`.

### 2. commitment-block-authoring: affect-predicate guidance

Add authoring guidance: prefer `any_emotion_active` without an over-narrow `kind`, or an `any[…]` over lifecycle-adjacent affect kinds (e.g. `dread`/`fear`/`anxiety`), when a block should fire across a fear-family pressure rather than one exact affect kind. Cite FOUNDATIONS §5a/§5b and Rule 5.

### 3. (Content follow-up, optional) Repair SLT-4 in red-bunny

Note in the ticket that `red-bunny`'s `SLT-4` should be superseded via `commitment-block-authoring` to broaden its predicate; this is illustrative content repair, not part of the engine change.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — storylet-pool-coverage pass)
- `tools/validators/src/structural/…` (modify/add — only if the inert-storylet check is implemented as a deterministic validator/util rather than skill-prose audit logic; name per existing structural-validator layout)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — affect-predicate guidance)

## Out of Scope

- Full forward-reachability analysis of hypothetical future states (intentionally not attempted).
- Any change to the predicate DSL grammar or the `STEMO` `affect_kind` enum.
- Auto-repairing seed blocks (repair stays operator-driven via `commitment-block-authoring`).

## Acceptance Criteria

### Tests That Must Pass

1. `branching-story-health-audit` structural mode on `red-bunny` emits an inert-storylet finding naming `SLT-4` with the `any_emotion_active(kind=dread)` predicate and absent `affect_kind: dread`.
2. A bundle where every global-pool SLT is eligible on at least one committed page produces no inert-storylet finding (no false positive).
3. If implemented as a validator: targeted unit test for the satisfiability check (predicate names an affect_kind present vs absent in the active set).

### Invariants

1. A `global_author_pool` SLT that is eligible on no committed page in scope is always surfaced (Rule 5 / consequence-capacity protection).
2. "Eligible-but-unused" blocks are never flagged as inert.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/<inert-storylet-coverage>.test.ts` — if implemented as a deterministic check; rationale: pin the absent-affect_kind satisfiability case and the no-false-positive case.
2. `None for skill-prose-only portion — verified by audit dry-run named below.`

### Commands

1. `/branching-story-health-audit --world_slug erotica-world --story_slug red-bunny --mode structural` (dry-run; inspect the audit report for the `SLT-4` inert finding) — targeted.
2. `npm test --workspace tools/validators -- <inert-storylet>` — if a validator is added.

## Implementation Notes (2026-05-29)

- **Implemented as skill-prose audit logic, not a deterministic validator.** The `branching-story-health-audit` pipeline executes its passes in working memory against MCP retrieval (it does not run `tools/validators` structural validators — those run on the patch-engine pre-apply / full-world surface). A validator added under `tools/validators/src/structural/` would be orphaned from the audit and would change full-world validation behavior in a surface this ticket does not scope. So the inert-storylet check lives in Phase 2o prose alongside the existing `storylet_pool_coverage_gap` logic, which is the correctly-placed surface. The `tools/validators/...` "Files to Touch" entry (conditional on the validator path) and AC "Tests That Must Pass" #3 (conditional on a validator) therefore do not apply.
- `branching-story-health-audit/SKILL.md` Phase 2o: added **Permanently-inert storylet detection** — for each `global_author_pool` / `branch_prefix_scoped` SLT (skip `branch_scoped` JIT), test eligibility against every committed page's `state_snapshot.active_records` using the bind-then-instantiate discipline; emit `storylet_permanently_inert` (WARNING, `repair_kind: commitment_block`) for any pool block eligible on no committed page. Explicit never-eligible (flagged) vs eligible-but-unused (never flagged) distinction. Sub-reason `inert_cause: unsatisfiable_affect_kind` for an exact-value `any_emotion_active(kind=…)` / `emotion_active(kind=…)` predicate whose `affect_kind` is in no active `STEMO` across scope; names the absent kind + the lifecycle-adjacent active kinds. Updated the Phase 2o intro, the Rule 5 mechanism line, and the Rule 5 alignment-table row.
- `commitment-block-authoring/references/phase-2-draft-blocks.md` (§Plan / emotion authoring patterns): added **Affect-predicate brittleness** guidance — do not over-narrow `kind` on a hard predicate of a global-pool block (the STEMO lifecycle transitions `dread`→`fear`→`anxiety`); prefer `any_emotion_active` with no `kind`, a lifecycle-stable `kind`, or an `any[…]` over adjacent kinds, or push the `kind` narrowing into `soft`. Cites FOUNDATIONS §5a/§5b/Rule 5.
- Verified against `red-bunny`: `SLT-4` (`any_emotion_active(kind=dread)`, `global_author_pool`) — STEMO-2 (`dread`) was superseded into STEMO-3/4 (`fear`); active STEMO affect kinds across history are {`desire`, `fear`, `anxiety`}, no active `dread`. The new pass would emit `storylet_permanently_inert` for `SLT-4` with `inert_cause: unsatisfiable_affect_kind` (absent `dread`; adjacent active `fear`/`anxiety`).
- **Content follow-up (§3, out of engine scope):** repairing red-bunny `SLT-4` to broaden its predicate is operator-driven via `commitment-block-authoring` (HARD-GATE) and is explicitly not part of this engine change; left for a separate authoring run.
