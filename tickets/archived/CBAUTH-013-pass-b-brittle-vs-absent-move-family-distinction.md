# CBAUTH-013: Distinguish brittle-existing-blocks from absent move_family in Pass B `move_family_under_represented_at_moment` lanes

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — docs/skill only: `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` (no validator, tool, hook, schema, or new patch-op surface)
**Deps**: CBAUTH-008 (defines Pass B step 1 and the `moment_fit_lane` working-memory shape this ticket extends)

## Problem

CBAUTH-008's Pass B step 1 emits a `moment_fit_lane` named `move_family_under_represented_at_moment:<move_family>` whenever a move_family has under-represented coverage at the moment's `active_high_salience_records`. The lane's `lane_id` carries the move_family name but **not the underlying pool composition** — specifically, it does not distinguish:

- **"absent at moment"**: the move_family has 0 or few pool blocks AND every existing block currently hard-fires (the pool genuinely lacks moves of this shape). Authoring lane: **direct_batch** new block.
- **"brittle at moment"**: the move_family has ≥ 2 pool blocks but only 1 hard-fires; the other pool blocks have over-narrow hard predicates (e.g., `kind=dread` when no `dread` STEMO is active) that render them silently inert at this moment. Authoring lane: **audit_repair** via `branching-story-health-audit` Phase 2o `storylet_permanently_inert` (or its moment-scoped relative) producing an RSP card, then `commitment-block-authoring audit_repair` to mutate the brittle block. The brittle block's existence is information the operator needs to choose between authoring new vs repairing existing — the choice is structurally different even though both end at a `commitment-block-authoring` invocation.

Observed on the 2026-05-30 red-bunny SLB-5 run: at PG-8 the evasion family has 2 pool blocks — SLT-4 (`hard: any_emotion_active(kind=dread)`, brittle — no `dread` STEMO active among STEMO-1 desire / STEMO-16 hope / STEMO-17 fear / STEMO-18 anxiety) and SLT-25 (`hard: any_emotion_active(holder_role=primary_actor, min_intensity=medium)`, fires on STEMO-1 high desire). Pass B emits `move_family_under_represented_at_moment:evasion`. The operator (this session) chose `direct_batch` new SLT-34 with a lifecycle-robust relationship-keyed hard predicate (`any_relationship_axis(desire, ≥high, participant_role=primary_actor)`) — the right move for this moment, but the brittle-SLT-4 signal was operator-derived from the existing `phase-2-draft-blocks.md` §"Affect-predicate brittleness" prose paragraph, not surfaced by Pass B itself. A future operator without that prose paragraph in working memory could mis-route to `direct_batch` when `audit_repair` (repair SLT-4's `kind=dread` over-narrowing) is the more durable fix.

The distinction is computable from data Pass B step 1 already collects — for each move_family, the existing-block iteration already counts hard-firing blocks at the moment; extending the iteration to also count non-hard-firing-but-existing blocks adds no new MCP retrieval.

## Assumption Reassessment (2026-05-30)

1. `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` §Pass B step 1 currently reads "For each `move_family` value (16-value enum per shared contract §4.4), count pool SLTs that hard-fire on the signature's `active_high_salience_records` ... Under-represented move_families with active high-salience records targeting them emit a `moment_fit_lane` named `move_family_under_represented_at_moment:<move_family>`." Verified by direct Read this session. The step emits the lane id only; pool-composition data is computed transitively but not preserved on the lane.
2. `.claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` §"Affect-predicate brittleness — do not over-narrow `kind` on a global-pool block" (paragraph anchored at "The `STEMO` lifecycle the engine runs transitions affect between lifecycle-adjacent kinds...") explicitly names the brittleness pattern as the `storylet_permanently_inert` finding `branching-story-health-audit` Phase 2o emits. Verified by direct Read. The brittle-block detection therefore exists in the codebase pipeline (health-audit Phase 2o); CBAUTH-013 surfaces it from Pass B as an operator-routing signal at authoring time.
3. Shared boundary under audit: the `moment_fit_lane` working-memory shape consumed by Phase 2 authoring guidance (CBAUTH-009) and the Phase 6 deliverable summary (CBAUTH-008). Both consumers benefit from the brittle-vs-absent distinction without changing the lane's `source` enum (`source` continues to be `move_family_under_represented_at_moment` for both cases; the new field is an annotation).
4. FOUNDATIONS principle under audit: §Story Bundles §5b (every story-bundle field/record load-bearing) + Rule 5 (No Consequence Evasion). A pool with a brittle block silently routes around the move_family on certain moments; the brittleness is latent consequence-capacity loss the operator should be told about explicitly, not asked to infer.
5. Adjacent contradiction classification: this ticket extends CBAUTH-008's Pass B output shape and CBAUTH-009's Phase 2 authoring-guidance translation patterns. Both extensions are additive; the lane's `lane_id` and `source` are unchanged, only the per-lane composition annotation is added. Required-consequence elaboration on the existing Pass B → Phase 2 dataflow.
6. Out-of-scope creep guard: this ticket does NOT add a Phase 2 procedure that auto-routes brittle-block findings to `audit_repair` mode (the operator's mode choice remains explicit — Phase 2 surfaces the brittleness; the operator decides). It does NOT change the health-audit `storylet_permanently_inert` Phase 2o detection (the audit already runs there; this ticket only mirrors a subset of its signal at authoring time so the operator chooses a mode before authoring rather than after).

## Architecture Check

1. Cleaner than alternatives: extending the Pass B `moment_fit_lane` working-memory entry with two integer annotations (`hard_firing_block_count` and `existing_non_hard_firing_block_count`) plus a derived `composition_class` (`absent_or_thin | brittle_existing_blocks_present`) keeps the lane's identity (`lane_id`, `source`, `addressed_by_blocks[]`) stable while adding the routing signal. The alternative — splitting the lane into two `source` values (e.g., `move_family_absent_at_moment` and `move_family_brittle_at_moment`) — proliferates the enum (Phase 2 authoring-guidance translation patterns would need two new branches) without clarifying the underlying check (Pass B step 1 still walks all move_families and counts the same things).
2. No backwards-compatibility aliasing/shims introduced: existing Pass B output consumers (CBAUTH-008's Phase 6 surfacing, CBAUTH-009's Phase 2 translation) tolerate the new annotation fields because they read fields explicitly; the additive annotation does not change existing field semantics.

## Verification Layers

1. Invariant: Pass B step 1 computes per-move_family hard-firing count and existing non-hard-firing count from the pool projection already loaded at pre-flight step 4(i) → codebase grep-proof (`phase-1-coverage-diagnosis.md` Pass B step 1 contains a sub-bullet naming `hard_firing_block_count` and `existing_non_hard_firing_block_count` derivation from the pool projection).
2. Invariant: the `moment_fit_lane` working-memory shape includes the two count annotations and a derived `composition_class` enum → codebase grep-proof (`phase-1-coverage-diagnosis.md` Pass B output shape carries the three new fields on the lane entry).
3. Invariant: the Phase 2 authoring-guidance translation (CBAUTH-009) names how to read `composition_class` when choosing between `direct_batch` new and `audit_repair` for brittle blocks → manual review (re-read `phase-2-draft-blocks.md` §"Authoring against moment-fit lanes" subsection and confirm a one-paragraph routing addition: `composition_class: brittle_existing_blocks_present` → recommend running `branching-story-health-audit` first to produce an RSP card, then `commitment-block-authoring audit_repair` rather than `direct_batch`).

## What to Change

### 1. Extend Pass B step 1 with per-move_family composition counts

In `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` §Pass B step 1, after the "Under-represented move_families..." sentence, add:

> Additionally, for each emitted `move_family_under_represented_at_moment:<move_family>` lane, count and record on the lane: (i) `hard_firing_block_count` (pool blocks in this move_family whose hard preconditions match the signature's `active_high_salience_records`); (ii) `existing_non_hard_firing_block_count` (pool blocks in this move_family that exist but whose hard preconditions do NOT match the signature — i.e., the over-narrow / brittle pattern); (iii) derived `composition_class`: `absent_or_thin` when `existing_non_hard_firing_block_count == 0` (the move_family lacks blocks of this shape at the moment); `brittle_existing_blocks_present` when `existing_non_hard_firing_block_count >= 1` (the move_family has blocks but at least one is brittle vs. the moment's affect/state shape). The brittle-block detection mirrors `branching-story-health-audit` Phase 2o's `storylet_permanently_inert` signal scoped to the present moment.

### 2. Extend the working-memory shape

Update the `moment_fit_lanes` entry shape from `{lane_id: "<name>", source: <...>, addressed_by_blocks: [...]}` to also carry the three new fields when `source == move_family_under_represented_at_moment`:

```yaml
moment_fit_lanes:
  - lane_id: "<name>"
    source: <supersession_set | forward_affordance+active_high_salience | cast_role_engagement | move_family_under_represented_at_moment>
    addressed_by_blocks: [SLT-NEW-<N>, ...]
    # Below 3 fields populated only when source == move_family_under_represented_at_moment:
    hard_firing_block_count: <integer>
    existing_non_hard_firing_block_count: <integer>
    composition_class: absent_or_thin | brittle_existing_blocks_present
```

### 3. Phase 2 authoring-guidance routing paragraph

In `.claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` §"Authoring against moment-fit lanes", in the `move_family_under_represented_at_moment source` paragraph, add:

> Read the lane's `composition_class`: when `absent_or_thin`, author a `direct_batch` new block per the worked example pattern. When `brittle_existing_blocks_present`, the move_family is covered at the lane shape but the existing pool block(s) are inert against the moment's affect/state shape — recommend running `branching-story-health-audit` first (its Phase 2o `storylet_permanently_inert` detection will produce an RSP card naming the brittle block) and then re-invoking `commitment-block-authoring audit_repair` to mutate the brittle block, rather than authoring a `direct_batch` new block that adds pool size without addressing the latent inertness. The operator may still choose `direct_batch` when authoring time is the immediate constraint and a follow-up `audit_repair` cycle is scheduled separately — but the choice is now explicit.

### 4. Phase 6 deliverable-summary surfacing

In `.claude/skills/commitment-block-authoring/SKILL.md` Phase 6 sub-step 3 deliverable-summary bullet for `moment_fit_lanes`, extend with: "when a `move_family_under_represented_at_moment` lane reports `composition_class: brittle_existing_blocks_present`, surface the brittle-block hint in the deliverable summary so the user can confirm the `direct_batch` vs `audit_repair` routing choice at HARD-GATE time."

## Files to Touch

- `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` (modify)
- `.claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` (modify)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)

## Out of Scope

- Any change to `branching-story-health-audit` Phase 2o `storylet_permanently_inert` detection. The health-audit is the authoritative brittle-block surface for repair; CBAUTH-013 mirrors a subset of its signal at authoring time so the routing choice can be made before authoring.
- Auto-routing the lane from `direct_batch` to `audit_repair` when `brittle_existing_blocks_present`. The operator's mode choice remains explicit; Pass B surfaces the data, the operator decides.
- Generalization of the brittle-vs-absent distinction to Pass A's 17-target coverage diagnosis. Pass A is pool-wide; the brittle-vs-absent distinction only meaningfully applies at the moment-anchored axis Pass B already operates on.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "composition_class\|hard_firing_block_count\|existing_non_hard_firing_block_count" .claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` returns the new Pass B sub-bullet and the working-memory shape extension.
2. `grep -n "brittle_existing_blocks_present" .claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` returns the new authoring-guidance routing paragraph.
3. Re-running `commitment-block-authoring` against red-bunny PG-8 produces a moment_signature whose `move_family_under_represented_at_moment:evasion` lane reports `composition_class: brittle_existing_blocks_present` (citing SLT-4's `kind=dread` over-narrowing vs no active dread STEMO), and the Phase 6 deliverable summary surfaces the brittle-block hint.

### Invariants

1. The brittle-vs-absent distinction is computable from the pool projection already loaded at pre-flight step 4(i); no new MCP retrieval is added.
2. The `lane_id` and `source` of existing Pass B emissions are unchanged (additive annotation only).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "composition_class\|brittle_existing_blocks_present\|hard_firing_block_count" .claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md .claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md .claude/skills/commitment-block-authoring/SKILL.md`
2. Re-invoke `commitment-block-authoring --world_slug erotica-world --story_slug red-bunny --mode direct_batch --target_count 1 --focus 'evasion'` on red-bunny and confirm the deliverable summary's moment_fit_lanes entry for evasion carries `composition_class: brittle_existing_blocks_present` and names SLT-4 as the brittle existing block.
3. (No narrower verification surface needed — prose-only ticket; the brittle-block distinction is verifiable by re-running on the live bundle.)
