# SPEC22SCECOM-010: branching-story-bootstrap v2 alignment: Phase 1/6/7/8/9/9.5 + STORY_KERNEL + INDEX templates

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — modifies `.claude/skills/branching-story-bootstrap/SKILL.md` plus 5 reference files and 2 templates. No code changes.
**Deps**: archive/tickets/SPEC22SCECOM-003.md, 004, archive/tickets/SPEC22SCECOM-005.md, 006

## Problem

SPEC-22 §Track 4's branching-story-bootstrap deliverable is the cohesive Track 4 update for the bootstrap skill: under v2, every authored SLT carries `shape: scene_commitment_arc`, the seed pool is sized in arcs (not beats), Phase 7 emits a scene-setter root page (no SLT selection), Phase 8 delegates to the SPEC-20 §F choice-surface gate in PG-0001 special-case mode, Phase 9 grows from 12 to 17 gates with the 5 SPEC-20 §E validators applied at PG-0001, Phase 9.5 storylet-diversity rebinds to `commitment_class` distribution, Phase 1 may derive arc-unit cadence_policy / menu_policy defaults from premise, and per-bundle INDEX template wording shifts to "covering <commitment_classes>". STORY_KERNEL template gains arc-unit-only `cadence_policy` and `menu_policy` blocks per archived SPEC-20 §H (post-2026-05-07 reassessment).

## Assumption Reassessment (2026-05-08)

1. `.claude/skills/branching-story-bootstrap/SKILL.md` exists; current Phase 9 has **12 gates** (verified at SPEC-22 reassessment via `phase-9-validation-gates.md` table row count + SKILL.md line 148 "12 gates"). SPEC-22 reassessment corrected the prior 13→18 math drift to 12→17.
2. `references/` directory contents (verified at reassessment): `phase-6-storylet-pool-seed.md`, `phases-1-3-premise-cast-facts.md` (Phase 3 content lives in this combined file, not a standalone `phase-3-story-kernel.md`), `phase-7-root-page-render.md`, `phase-8-choice-generation.md`, `phase-9-validation-gates.md`, `phase-9-5-bootstrap-discipline-validator.md`, `phase-7-5-visible-affordance-extraction.md`. Templates: `templates/story-kernel.md` (cadence_policy block currently in arc-units only), `templates/story-bundle-index.md`.
3. **Cross-skill boundary under audit**: bootstrap consumes (a) the v2 validator surface (003/004/005) — Phase 9 cites their gate names; (b) canonical-vocabularies (006) — Phase 9.5 rebinding cites `commitment_class` enum; (c) archived SPEC-20 §F's choice-surface gate — Phase 8 delegates to it in PG-0001 special-case mode. Bootstrap does NOT consume MCP retrieval (008) or the patch-engine op from archive/tickets/SPEC22SCECOM-001.md directly — those are runtime concerns.
4. **FOUNDATIONS §Story Bundles §7 (Story-Pipeline Skill Category)** restated: bootstrap is Category 2c. Sibling-scan is recommended-as-defensive-default for shared surfaces (predicate DSL, STENT `role_in_story` enum, `state_snapshot` schema, RSP card schema, content_policy block). This ticket touches none of those shared surfaces (it modifies bootstrap's own phase prose + templates), so no cross-skill cascade.
5. (HARD-GATE / canon-write ordering): Bootstrap's HARD-GATE remains intact — Phase 9 + Phase 9.5 record PASS-with-rationale; Phase 10 user approval clears the gate. Gate count grows from 12 to 17 but the per-gate PASS-with-rationale discipline is preserved.
6. (Schema extension): STORY_KERNEL template's `cadence_policy` and `menu_policy` blocks ship with hardcoded arc-unit defaults per archived SPEC-20 §H (post-reassessment). Word-count fields (`preferred_words_per_arc`, `default_min_words_between_menus`, `max_words_without_player_commitment_soft`) are explicitly forbidden per Prose Craft Contract Rule 11.
7. (Rename/removal blast radius): per-bundle INDEX template's "Storylet pool: <count> seed storylets covering <shapes>" wording → "covering <commitment_classes>". The shape distribution language is removed in lockstep with v2's single-shape SLT regime; no other skill consumes the INDEX template's wording line.

## Architecture Check

1. Cohesive single-skill update — all bootstrap phase edits land together so the skill remains internally consistent across phase prose, reference files, and templates. Splitting into per-phase tickets would risk inconsistency windows where Phase 6's arc-granularity prose ships before Phase 9's gate-count update.
2. No backwards-compatibility aliasing — v1 beat-granular SLT references are replaced wholesale; no parallel v1/v2 phase prose.

## Verification Layers

1. Phase 9 gate count math correct → grep `12 gates|17 gates` across SKILL.md + `phase-9-validation-gates.md`; no occurrences of `13 gates|18 gates|13 → 18`.
2. Phase 7 prompt structure preserved verbatim (content_policy FIRST + world context + story kernel + Prose Craft Contract + cast bound + state context); only the "selected storylet" block is replaced by "entry pressure framing" → manual review of `phase-7-root-page-render.md`.
3. Phase 8 delegates to SPEC-20 §F choice-surface gate in PG-0001 special-case mode; v1 "Required CHC diversification" + "Pair-distance discipline" sub-sections superseded → manual review of `phase-8-choice-generation.md`.
4. Phase 9.5 storylet-diversity check rebinds from `shape:` to `arc_contract.commitment_class` → manual review of `phase-9-5-bootstrap-discipline-validator.md`; other 9 discipline checks preserved verbatim.
5. STORY_KERNEL template gains `cadence_policy` + `menu_policy` blocks in arc-units only → grep `templates/story-kernel.md` confirms `max_arcs_without_menu_soft`, `max_arcs_without_player_commitment_soft`; absence of word-count terms (`preferred_words_per_arc`, `default_min_words_between_menus`, `max_words_without_player_commitment_soft`).
6. Per-bundle INDEX template wording → grep `templates/story-bundle-index.md` for `commitment_classes`; absence of "covering <shapes>".
7. FOUNDATIONS Rule 11 (No Spectator Castes by Accident) alignment: word-count fields explicitly forbidden — bootstrap-time premise-derivation cannot reintroduce them.

## What to Change

### 1. Phase 6 target_pool_size arithmetic

In `references/phase-6-storylet-pool-seed.md`: rewrite the target_pool_size formula for arc-granularity. Default: `target_pool_size = max(8, ceil(world_complexity_factor × 10))`. The world_complexity_factor derivation lives in this reference (premise breadth + cast count + thread count); explicit arithmetic is owned by this skill. Update SKILL.md Phase 6 step description.

### 2. Phase 7 scene-setter mode

In `references/phase-7-root-page-render.md`: rewrite for scene-setter mode. PG-0001 is rendered without an SLT selection. Prompt structure preserved (content_policy FIRST + world context + story kernel + Prose Craft Contract + cast bound + state context); the "selected storylet" prompt block is replaced by an "entry pressure framing" prompt block drawn from STORY_KERNEL's central dramatic question + Phase 5 obligations / threads. Instruction shifts from "render the selected beat" to "render the scene-setter that establishes entry pressure and exposes 4-6 plausible commitment-class next moves." Prose Craft Contract still applies; post-render cross-check still runs; runaway-prose defense routes through engine-only `safety_valves.max_words` (no per-arc word-count target — Rule 11 forbids). PG-0001's emitted records carry `applied_effect_variant: null`, `narrative_point_classification: NATURAL_COMMITMENT_HINGE`, `arc_trace_id: null`, `arc_trace_emitted: false` per archived SPEC-20 §F's Bootstrap PG-0001 special case.

### 3. Phase 8 PG-0001 special-case delegation

In `references/phase-8-choice-generation.md`: rewrite to delegate-and-cite archived SPEC-20 §F in PG-0001 special-case mode. Bootstrap supplies `PG-0001.state_snapshot` as current state, the Phase 7.5 Visible Affordance Map as additional anchors, and `governor_nudge: "bootstrap root; favor premise-aligned entry pressure and initial agency spread"`. The choice-surface gate runs in PG-0001 special-case mode per archived SPEC-20 §F: narrative-point classification defaults to NATURAL_COMMITMENT_HINGE; hybrid exit portfolio drawn from initial obligations + threads + seed-pool arc eligibility (no `native_seeds` from a closed arc); choice-worthiness validation applies normally; strong-axis collective difference applies normally. Supersede the v1 "Required CHC diversification" + "Pair-distance discipline" sub-sections with delegate-and-cite prose.

### 4. Phase 9 gate count 12 → 17

In `references/phase-9-validation-gates.md`: extend the existing 12-gate table with 5 new rows for the SPEC-20 §E validators applied at PG-0001:

- `arc_envelope_conformance` (vacuous at PG-0001 — no arc selected; auto-PASSes with rationale `"PG-0001 root special case — no arc selected"`)
- `effect_model_replay_safety` (root-page exception — accepts `applied_effect_variant: null` when `id == PG-0001`)
- `arc_trace_evidence_alignment` (vacuous at PG-0001 — no ARC_TRACE emitted; auto-PASSes)
- `narrative_point_classification` (PG-0001 root-page exception — accepts the bootstrap-default NATURAL_COMMITMENT_HINGE)
- `choice_worthiness_completeness` (applies non-vacuously to PG-0001's emitted CHCs — every CHC must satisfy the v2 validation)

Update SKILL.md HARD-GATE clause (c) and Phase 9 step description from "12 gates" to "17 gates"; per-gate PASS-with-rationale discipline preserved.

### 5. Phase 9.5 storylet-diversity rebind

In `references/phase-9-5-bootstrap-discipline-validator.md`: storylet-diversity check (currently per-`shape:` distribution) rebinds to per-`arc_contract.commitment_class` distribution (≤30% per commitment_class threshold for the seed batch, parallel to archived SPEC-21 Phase 5's diversity-axis refactor). Other 9 discipline checks v2-agnostic and preserved verbatim. Phase 9.5 total remains 10 checks; only the storylet-diversity check's measurement axis changes.

### 6. Phase 1 cadence_policy / menu_policy default derivation

In `references/phases-1-3-premise-cast-facts.md`: Phase 1's premise-normalization step MAY derive arc-unit overrides for `max_arcs_without_player_commitment_soft` and `max_arcs_without_menu_soft` from premise tone signals. Slow-paced literary premises lean toward lower defaults (more frequent menus); action-oriented premises lean toward higher defaults (faster onward momentum). Recommendation-only — user can override at Phase 10 HARD-GATE review or by editing STORY_KERNEL.md after bootstrap completes. When Phase 1 doesn't derive overrides (ambiguous tone), the hardcoded SPEC-20 §H defaults apply. Word-count derivation is explicitly forbidden per Prose Craft Contract Rule 11.

### 7. STORY_KERNEL template

In `templates/story-kernel.md`: gain (or confirm presence of) `cadence_policy` and `menu_policy` blocks in arc-units only — `max_arcs_without_menu_soft`, `max_arcs_without_player_commitment_soft`. Absence of word-count fields per Rule 11. (Per SPEC-22 reassessment, the existing template already uses arc-units; this ticket confirms the SKILL.md prose references match.)

### 8. Per-bundle INDEX template wording

In `templates/story-bundle-index.md`: storylet-pool summary line shifts from "covering <shapes>" to "covering <commitment_classes>" enumerating the per-commitment_class distribution from the seed batch. SKILL.md line 264's "Storylet pool: <count> seed storylets covering <shapes>" similarly updates.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — Phase 6/7/8/9/9.5 step descriptions + gate count + INDEX wording)
- `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` (modify — arc-granularity arithmetic)
- `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` (modify — scene-setter mode)
- `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` (modify — delegate-and-cite SPEC-20 §F)
- `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` (modify — gate count 12 → 17)
- `.claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md` (modify — storylet-diversity rebind to commitment_class)
- `.claude/skills/branching-story-bootstrap/references/phases-1-3-premise-cast-facts.md` (modify — Phase 1 cadence_policy/menu_policy derivation)
- `.claude/skills/branching-story-bootstrap/templates/story-kernel.md` (modify — confirm arc-unit blocks; remove any latent word-count residue)
- `.claude/skills/branching-story-bootstrap/templates/story-bundle-index.md` (modify — wording update)

## Out of Scope

- branching-story-page-cycle record-schemas extension (in 013)
- Health-audit alignment (in 011)
- Promotion alignment (in 012)
- Migration: red-bunny discard (in 014)
- Validators (in 003/004/005)
- Canonical vocabularies (in 006)
- Same downstream Out of Scope as 001/002

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE '12 gates|17 gates' .claude/skills/branching-story-bootstrap/SKILL.md` shows the gate count is 17 in current text and 12 only in references-to-prior-state (e.g., "extend gate count 12 → 17"); no occurrences of `13 gates`, `18 gates`, or `13 → 18`.
2. `grep -nE 'preferred_words_per_arc|default_min_words_between_menus|max_words_without_player_commitment_soft' .claude/skills/branching-story-bootstrap/` returns 0 active-prose matches (audit-trail rejection prose acceptable per spec-writing-rules `§Audit-trail retention exception`).
3. `grep -n "covering <commitment_classes>" .claude/skills/branching-story-bootstrap/` shows the new wording in SKILL.md and template; absence of `covering <shapes>` in active-prose contexts.
4. Phase 7 prompt structure preserved (manual review): content_policy FIRST, then world context / story kernel / Prose Craft Contract / cast bound / state context, then "entry pressure framing" replacing "selected storylet".
5. Phase 9.5 storylet-diversity check rebinds to commitment_class (manual review of `phase-9-5-bootstrap-discipline-validator.md`).

### Invariants

1. Bootstrap remains a Category 2c story-pipeline skill with HARD-GATE intact; the gate-count-growth from 12 to 17 does NOT alter the gate-PASS-with-rationale discipline (FOUNDATIONS Rule 6 preserved).
2. Word-count fields are forbidden from STORY_KERNEL template, Phase 1 derivation, Phase 7 max_words discipline, and SAU choice-cadence sub-check (per Prose Craft Contract Rule 11).
3. Phase 8's "Required CHC diversification" + "Pair-distance discipline" sub-sections are superseded — bootstrap delegates to archived SPEC-20 §F.

## Test Plan

### New/Modified Tests

`None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rE '12 gates|17 gates' .claude/skills/branching-story-bootstrap/`
2. `grep -rE 'preferred_words_per_arc|default_min_words_between_menus|max_words_without_player_commitment_soft' .claude/skills/branching-story-bootstrap/`
3. `grep -rn 'covering <commitment_classes>\|covering <shapes>' .claude/skills/branching-story-bootstrap/`
4. Manual review of all 9 modified files against SPEC-22 §Track 4 prose.
