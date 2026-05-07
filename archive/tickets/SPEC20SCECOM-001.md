# SPEC20SCECOM-001: Phase 4 + 4b — Arc Selection + Effect-Variant Selection Before Render

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md` rewritten for arc-granular Phase 4 selection plus a new Phase 4b deterministic variant pick.
**Deps**: `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (SPEC-22 must implement canonical-vocabularies for `commitment_class` enum, the `effect_model_replay_safety` validator, and the PG `state_snapshot.applied_effect_variant` schema extension before this ticket can be exercised end-to-end)

## Problem

At intake, Phase 4 selected beat-granular SLTs via storylet-shape filtering (`shape: entry_pressure | cast_introduction | ...`). Under the scene-commitment-arc pivot (archived SPEC-19), the selection unit shifted to arc-SLT (`shape: scene_commitment_arc`); the v1 shape enum is supplanted by per-arc `commitment_class` and `arc_archetype`. Additionally, replay-equality at arc cadence requires that one effect variant be chosen BEFORE render fires, not derived FROM render — so the runtime can deterministically replay the chain of choices from genesis without re-running the LLM render. SPEC-20 §A + §B specified the rewritten Phase 4 hard filters + extended salience scoring + a new Phase 4b deterministic variant-pick.

## Assumption Reassessment (2026-05-07)

1. Verified `.claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md` exists and housed beat-granular Phase 4 selection logic before this ticket. The rewrite targeted this file's storylet-shape-filter section while preserving the live salience-scoring skeleton (`obligation_relevance`, `causal_relevance`, `character_goal_relevance`, `reader_knowledge_relevance`, `thematic_continuity`, `tension_fit`, `novelty`, `contradiction_risk`, `unresolved_debt_increase`, `repetition_penalty`) and adding the SPEC-20 terms `commitment_class_continuity` and `exit_portfolio_richness`.
2. Verified archived SPEC-19 §A (`archive/specs/SPEC-19-scene-commitment-arc-schema.md`) defines the v2 SLT schema with `arc_contract`, `effect_model.variants[]`, `exit_portfolio.native_seeds[]` fields that this ticket consumes; storylet template at `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` confirmed already updated to v2 per the SPEC19SCECOM-001 implementation commit.
3. Cross-skill boundary: `branching-story-page-cycle/references/phase-4-…` consumes the SLT v2 schema produced by `storylet-pool-authoring`. The contract under audit is `arc.arc_contract.commitment_class`, `arc.exit_portfolio.native_seeds[].count`, and the deterministic `weighted_pick_seed` advancement for Phase 4b. SPEC-22 §Track 3 owns the `commitment_class` enum implementation in `tools/world-index/src/public/canonical-vocabularies.ts`; SPEC-22 §Track 4 owns the PG `state_snapshot.applied_effect_variant` field — this ticket consumes both surfaces.
4. Schema extension (renumbered from template item 6): this ticket references the PG record's `state_snapshot.applied_effect_variant` field (NEW per SPEC-20 §B); the field is owned by SPEC-22 §Track 4. This ticket documents the consumer-side write semantics (Phase 4b records the chosen variant id) but does not define the schema. Additive-only extension; root-page exception (PG-0001 carries `applied_effect_variant: null` per SPEC-20 §F Bootstrap special case).
5. Verification-boundary correction: the drafted skill dry-run and replay proof are not currently executable because SPEC-22's validator/schema implementation remains pending. This ticket's truthful proof is documentation-surface grep/manual review over the edited Phase 4/4b reference; end-to-end replay validation remains SPEC20SCECOM-011 capstone scope.

## Architecture Check

1. Selecting the variant BEFORE render is the load-bearing replay-equality property: replaying the chain of choices from genesis re-applies each PG's `applied_effect_variant` deterministically, without re-running the LLM render. Deriving the variant from the rendered prose would force replay to either re-render (LLM determinism is not guaranteed cross-run) or store the prose as authoritative state (defeats the ledger-as-truth contract).
2. No backwards-compatibility aliasing/shims: v1 shape-based selection is removed entirely (the test bundle at `worlds/erotica-world/stories/red-bunny/` is discarded in SPEC-22 §Track 5 Migration); v2 arc-shape SLTs are the only selection target post-cutover.

## Verification Layers

1. Phase 4 hard filter 6 (commitment_class match) → codebase grep-proof in `phase-4-storylet-and-mystery-authority.md` for the new filter.
2. Phase 4b deterministic variant selection → codebase grep-proof and manual review in `phase-4-storylet-and-mystery-authority.md` for variant filtering, seed advancement, and `state_snapshot.applied_effect_variant` persistence.
3. Salience scoring extensions (`commitment_class_continuity`, `exit_portfolio_richness`) → codebase grep-proof in the same reference file for both new term names.
4. Replay-equality at arc cadence → documentation proof in this ticket; schema validation is deferred to SPEC-22 §Track 2's `effect_model_replay_safety` validator and the full-pipeline SPEC20SCECOM-011 capstone.

## Landed Changes

### 1. Phase 4 — Arc Selection

In `.claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md`, replaced the beat-granular selection prose with arc-granular semantics. Preserved the section's structural skeleton (hard filters → salience scoring → weighted-pick from top-K → JIT expansion when pool-thin). Extended hard filters to include:

- `arc.hard_preconds` parse + evaluate against `state_snapshot`
- `arc.cast_requirements` satisfied by `cast_present`
- `arc.location_requirements` (when present) satisfied by `current_location` + `accessible_locations`
- `arc.mystery_safety.forbidden_M_resolved == false` AND `arc.execution_envelope.mystery_preservation.forbidden_resolutions[]` ⊇ all `forbidden`-status M ids
- `arc.visibility` permits use along current `branch_path`
- `arc.arc_contract.commitment_class` matches the chosen CHC's `commitment_class` (Path A) OR the classified commitment-class from Phase 1 Path B's write-in classifier (see SPEC20SCECOM-006)

### 2. Salience scoring extensions

Preserved the live salience formula structure and added two new dimensions:
- `commitment_class_continuity`: bonus for arcs whose `commitment_class` aligns with current scene-question (recency-weighted from parent page's arc).
- `exit_portfolio_richness`: bonus for arcs whose `exit_portfolio.native_seeds[]` count ≥ 3.

### 3. Weighted-pick + JIT expansion preserved

K=5 weighted-pick from top-K preserved; JIT expansion via `storylet-pool-authoring mode=jit` (sub-routine; SPEC-21) preserved when no candidate scores above threshold. JIT language now requires v2 `shape: scene_commitment_arc` output and routes the chosen JIT arc through Phase 4b before Phase 5.

### 4. NEW Phase 4b — Effect-Variant Selection Before Render

Added a new sub-section (Phase 4b) between Phase 4 and Phase 4.5. After arc selection, the engine selects ONE row from `arc.effect_model.variants[]` BEFORE prose render fires:

- **Variant filtering**: drop variants whose `forbidden_effects[]` would violate current `state_snapshot` invariants, the world's whole-class INV records, or the world's `forbidden`-status M preservation discipline.
- **Probability-weighted pick**: among surviving variants, weighted-pick by `variant.probability_weight`. Seed: the page's `weighted_pick_seed` advanced by one tick (the same seed used for arc-pick).
- **Persistence**: chosen variant's `id` recorded in pending PG transaction at `state_snapshot.applied_effect_variant`. PG record commits at Phase 11.

### 5. Replay-equality contract

Documented that beat-internal mutations (intermediate fact-claims, intermediate emotional-state shifts) are NOT authoritative for replay — only `arc.effect_model.variants[<chosen>].required_effects[]` is. Stated this is a deliberate relaxation of per-op replay discipline; soundness rests on the arc being the unit of state transition, not the beat.

### 6. `storylet_selection_audit_trail` reuse

The page record's `storylet_selection_audit_trail` block (existing field) is reused; `top_k_considered`, `scores`, `governor_nudge_bias`, `jit_expansion_fired`, and `weighted_pick_seed` all carry forward unchanged.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md` (modify)

## Out of Scope

- Phase 5 state mutation at arc-close (SPEC20SCECOM-002).
- Phase 7 multi-beat render with chosen variant in prompt (SPEC20SCECOM-003).
- Validator implementation `effect_model_replay_safety` (SPEC-22 §Track 2).
- PG schema extension `state_snapshot.applied_effect_variant` field definition (SPEC-22 §Track 4).
- Stop-predicate DSL grammar (already landed via archived SPEC-19 §D / SPEC19SCECOM-003).
- Phase 1 write-in commitment-class classification (SPEC20SCECOM-006) — Phase 4 hard filter 6 references this but does not implement it.
- SKILL.md Process Flow + Phase descriptions update (SPEC20SCECOM-009).

## Acceptance Criteria

### Tests That Must Pass

1. Documentation proof: `phase-4-storylet-and-mystery-authority.md` documents arc-shape hard filtering, commitment-class matching, Phase 4b variant filtering, seed advancement, and `state_snapshot.applied_effect_variant` persistence.
2. Documentation proof: `phase-4-storylet-and-mystery-authority.md` documents the replay-equality contract at arc cadence and labels beat-internal mutations as non-authoritative for replay.
3. Documentation proof: `phase-4-storylet-and-mystery-authority.md` preserves JIT expansion through `storylet-pool-authoring mode=jit parent_skill_invocation=true` and requires the returned JIT arc to re-enter Phase 4b before Phase 5.

### Invariants

1. The chosen variant's `id` exists in the realized arc's `effect_model.variants[].id` list (else `effect_model_legality` validator HARD-REJECTs at Phase 9 — SPEC-22 §Track 2).
2. `weighted_pick_seed` advancement for Phase 4b is deterministic — replay yields the same variant id for the same (arc, page) pair given the same parent state.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment. Empirical fixture-based verification remains owned by SPEC20SCECOM-011 capstone.

### Commands

1. `grep -nE "Phase 4b|commitment_class_continuity|exit_portfolio_richness|applied_effect_variant" .claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md` — confirms all new section anchors and salience-term names landed.
2. `grep -n "shape: scene_commitment_arc" .claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md` — confirms arc-shape filter is documented.
3. Full-pipeline verification owned by SPEC20SCECOM-011 once SPEC-22 §Track 2/3/4 has landed; this ticket's verification stops at documentation-prose surface.

## Outcome

Completed: 2026-05-07. `.claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md` now describes Phase 4 as v2 scene-commitment arc selection, adds the SPEC-20 salience dimensions, preserves weighted-pick/JIT auditability through `storylet_selection_audit_trail`, and adds Phase 4b effect-variant selection before render with `state_snapshot.applied_effect_variant` persistence.

## Verification Result

1. PASS — `grep -nE "Phase 4b|commitment_class_continuity|exit_portfolio_richness|applied_effect_variant" .claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md`.
2. PASS — `grep -n "shape: scene_commitment_arc" .claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md`.
3. PASS — manual review against `specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md` §A/§B and archived SPEC-19 §A confirmed the landed Phase 4/4b prose matches the authoritative arc-selection, salience-extension, variant-pick, and replay-equality contracts.
4. PASS — `git diff --check -- .claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md`; the untracked archived ticket was covered with `git diff --check --no-index /dev/null archive/tickets/SPEC20SCECOM-001.md` and produced no whitespace diagnostics.

## Deviations

1. The drafted skill dry-run and replay-equality fixture proof were not executed because the live repo does not yet have SPEC-22's v2 validators/schema implementation. This ticket's accepted proof is the documentation-surface contract; empirical fixture validation remains SPEC20SCECOM-011 scope.
2. Parent `.claude/skills/branching-story-page-cycle/SKILL.md` process-flow wording still describes the broader v1 runtime until the planned SPEC20SCECOM-009 summary/update ticket lands. This ticket intentionally changed only the Phase 4/4b reference.
