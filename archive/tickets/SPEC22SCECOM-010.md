# SPEC22SCECOM-010: branching-story-bootstrap v2 alignment: Phase 1/6/7/8/9/9.5 + STORY_KERNEL + INDEX templates

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — modified `.claude/skills/branching-story-bootstrap/SKILL.md`, bootstrap reference files, bootstrap templates, and SPEC-22 status prose. No code changes.
**Deps**: archive/tickets/SPEC22SCECOM-003.md, archive/tickets/SPEC22SCECOM-004.md, archive/tickets/SPEC22SCECOM-005.md, archive/tickets/SPEC22SCECOM-006.md

## Problem

At intake, SPEC-22 §Track 4's branching-story-bootstrap deliverable was still not reflected in the bootstrap skill. This ticket landed the cohesive Track 4 update: under v2, every authored SLT is treated as `shape: scene_commitment_arc`, the seed pool is sized in arcs, Phase 7 emits a scene-setter root page, Phase 8 delegates to the SPEC-20 §F choice-surface gate in PG-0001 special-case mode, Phase 9 has 17 gates with the 5 SPEC-20 §E validators applied at PG-0001, Phase 9 gate 9 measures `commitment_class` distribution, Phase 1 may derive arc-unit cadence_policy / menu_policy defaults from premise, and per-bundle INDEX template wording uses "covering <commitment_classes>". STORY_KERNEL template remains arc-unit-only for `cadence_policy` and `menu_policy`.

## Assumption Reassessment (2026-05-08)

1. At intake, `.claude/skills/branching-story-bootstrap/SKILL.md` existed and Phase 9 had **12 gates** (verified at SPEC-22 reassessment via `phase-9-validation-gates.md` table row count + SKILL.md "12 gates"). SPEC-22 reassessment corrected the prior 13→18 math drift to 12→17.
2. `references/` directory contents (verified at reassessment): `phase-6-storylet-pool-seed.md`, `phases-1-3-premise-cast-facts.md` (Phase 3 content lives in this combined file, not a standalone `phase-3-story-kernel.md`), `phase-7-root-page-render.md`, `phase-8-choice-generation.md`, `phase-9-validation-gates.md`, `phase-9-5-bootstrap-discipline-validator.md`, `phase-7-5-visible-affordance-extraction.md`. Templates: `templates/story-kernel.md` (cadence_policy block currently in arc-units only), `templates/story-bundle-index.md`.
3. **Cross-skill boundary under audit**: bootstrap consumes (a) the v2 validator surface (003/004/005) — Phase 9 cites their gate names; (b) canonical-vocabularies (archive/tickets/SPEC22SCECOM-006.md) — Phase 9 gate 9 cites `commitment_class` enum semantics; (c) archived SPEC-20 §F's choice-surface gate — Phase 8 delegates to it in PG-0001 special-case mode. Bootstrap does NOT consume MCP retrieval (008) or the patch-engine op from archive/tickets/SPEC22SCECOM-001.md directly — those are runtime concerns.
4. **FOUNDATIONS §Story Bundles §7 (Story-Pipeline Skill Category)** restated: bootstrap is Category 2c. Sibling-scan is recommended-as-defensive-default for shared surfaces (predicate DSL, STENT `role_in_story` enum, `state_snapshot` schema, RSP card schema, content_policy block). This ticket touches none of those shared surfaces (it modifies bootstrap's own phase prose + templates), so no cross-skill cascade.
5. (HARD-GATE / canon-write ordering): Bootstrap's HARD-GATE remains intact — Phase 9 + Phase 9.5 record PASS-with-rationale; Phase 10 user approval clears the gate. Gate count grows from 12 to 17 but the per-gate PASS-with-rationale discipline is preserved.
6. (Schema extension): STORY_KERNEL template's `cadence_policy` and `menu_policy` blocks ship with hardcoded arc-unit defaults per archived SPEC-20 §H (post-reassessment). Word-count fields (`preferred_words_per_arc`, `default_min_words_between_menus`, `max_words_without_player_commitment_soft`) are explicitly forbidden per Prose Craft Contract Rule 11.
7. (Rename/removal blast radius): per-bundle INDEX template's shape-distribution wording → commitment_class distribution wording. The shape distribution language is removed in lockstep with v2's single-shape SLT regime; `storylet-pool-authoring` already uses per-commitment_class distribution for its direct INDEX updates.
8. Live-reference correction (2026-05-09): `phase-9-5-bootstrap-discipline-validator.md` does not currently contain a storylet-diversity check. The diversity rule lives in Phase 9 gate 9 and in the STORY_KERNEL / INDEX storylet-pool summaries. This ticket therefore rebinds bootstrap diversity at Phase 9 gate 9 plus the templates, while preserving Phase 9.5's 10 existing checks unchanged.

## Architecture Check

1. Cohesive single-skill update — all bootstrap phase edits land together so the skill remains internally consistent across phase prose, reference files, and templates. Splitting into per-phase tickets would risk inconsistency windows where Phase 6's arc-granularity prose ships before Phase 9's gate-count update.
2. No backwards-compatibility aliasing — v1 beat-granular SLT references are replaced wholesale; no parallel v1/v2 phase prose.

## Verification Layers

1. Phase 9 gate count math correct → grep `12 gates|17 gates` across SKILL.md + `phase-9-validation-gates.md`; no occurrences of `13 gates|18 gates|13 → 18`.
2. Phase 7 prompt structure preserved verbatim (content_policy FIRST + world context + story kernel + Prose Craft Contract + cast bound + state context); only the "selected storylet" block is replaced by "entry pressure framing" → manual review of `phase-7-root-page-render.md`.
3. Phase 8 delegates to SPEC-20 §F choice-surface gate in PG-0001 special-case mode; v1 "Required CHC diversification" + "Pair-distance discipline" sub-sections superseded → manual review of `phase-8-choice-generation.md`.
4. Phase 9 storylet-diversity gate rebinds from `shape:` to `arc_contract.commitment_class`; Phase 9.5 remains a 10-check operational validator → manual review of `phase-9-validation-gates.md` and `phase-9-5-bootstrap-discipline-validator.md`.
5. STORY_KERNEL template gains `cadence_policy` + `menu_policy` blocks in arc-units only → grep `templates/story-kernel.md` confirms `max_arcs_without_menu_soft`, `max_arcs_without_player_commitment_soft`; absence of word-count terms (`preferred_words_per_arc`, `default_min_words_between_menus`, `max_words_without_player_commitment_soft`).
6. Per-bundle INDEX template wording → grep `templates/story-bundle-index.md` for `commitment_classes`; absence of "covering <shapes>".
7. FOUNDATIONS Rule 11 (No Spectator Castes by Accident) alignment: word-count fields explicitly forbidden — bootstrap-time premise-derivation cannot reintroduce them.

## Landed Changes

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

### 5. Phase 9 storylet-diversity rebind; Phase 9.5 preserved

In `references/phase-9-validation-gates.md`: gate 9 rebinds from per-`shape:` distribution to per-`arc_contract.commitment_class` distribution (≤30% per commitment_class threshold for the seed batch, with the documented small-batch relaxation parallel to `storylet-pool-authoring`). `references/phase-9-5-bootstrap-discipline-validator.md` keeps its 10 existing discipline checks and gains only a short note that diversity is owned by Phase 9 gate 9, not Phase 9.5.

### 6. Phase 1 cadence_policy / menu_policy default derivation

In `references/phases-1-3-premise-cast-facts.md`: Phase 1's premise-normalization step MAY derive arc-unit overrides for `max_arcs_without_player_commitment_soft` and `max_arcs_without_menu_soft` from premise tone signals. Slow-paced literary premises lean toward lower defaults (more frequent menus); action-oriented premises lean toward higher defaults (faster onward momentum). Recommendation-only — user can override at Phase 10 HARD-GATE review or by editing STORY_KERNEL.md after bootstrap completes. When Phase 1 doesn't derive overrides (ambiguous tone), the hardcoded SPEC-20 §H defaults apply. Word-count derivation is explicitly forbidden per Prose Craft Contract Rule 11.

### 7. STORY_KERNEL template

In `templates/story-kernel.md`: gain (or confirm presence of) `cadence_policy` and `menu_policy` blocks in arc-units only — `max_arcs_without_menu_soft`, `max_arcs_without_player_commitment_soft`. Absence of word-count fields per Rule 11. (Per SPEC-22 reassessment, the existing template already uses arc-units; this ticket confirms the SKILL.md prose references match.)

### 8. Per-bundle INDEX template wording

In `templates/story-bundle-index.md`: storylet-pool summary line shifted from shape-distribution wording to "covering <commitment_classes>" enumerating the per-commitment_class distribution from the seed batch. SKILL.md's Phase 10 deliverable summary now matches.

### 9. Same-seam bootstrap reference and SPEC truthing

Updated `pre-flight-and-prerequisites.md`, `phase-7-5-visible-affordance-extraction.md`, and a stale comment in `templates/story-records.yaml` so sibling bootstrap references no longer point at selected-storylet choice templates or v1 Phase 8 diversification. Updated SPEC-22 current-state and deliverables prose for the completed bootstrap sub-slice and corrected the Phase 9.5 diversity drift.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — Phase 6/7/8/9/9.5 step descriptions + gate count + INDEX wording)
- `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` (modify — arc-granularity arithmetic)
- `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` (modify — scene-setter mode)
- `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` (modify — delegate-and-cite SPEC-20 §F)
- `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` (modify — gate count 12 → 17)
- `.claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md` (modify — clarify Phase 9.5 keeps 10 operational checks; diversity is Phase 9 gate 9)
- `.claude/skills/branching-story-bootstrap/references/phases-1-3-premise-cast-facts.md` (modify — Phase 1 cadence_policy/menu_policy derivation)
- `.claude/skills/branching-story-bootstrap/references/phase-7-5-visible-affordance-extraction.md` (modify — remove selected-storylet/choice-template assumptions)
- `.claude/skills/branching-story-bootstrap/references/pre-flight-and-prerequisites.md` (modify — prompt-order truthing)
- `.claude/skills/branching-story-bootstrap/templates/story-kernel.md` (modify — confirm arc-unit blocks; remove any latent word-count residue)
- `.claude/skills/branching-story-bootstrap/templates/story-bundle-index.md` (modify — wording update)
- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` (modify — stale Phase 8 comment truthing only; no schema extension)
- `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (modify — same-seam current-state / deliverables truthing)

## Out of Scope

- branching-story-page-cycle record-schemas extension (in 013)
- Health-audit alignment (in 011)
- Promotion alignment (in 012)
- Migration: red-bunny discard (in 014)
- Validators (in 003/004/005)
- Canonical vocabularies (in archive/tickets/SPEC22SCECOM-006.md)
- Same downstream Out of Scope as 001/002

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rE '12 gates|17 gates' .claude/skills/branching-story-bootstrap/` shows only live 17-gate current text in the skill/reference surfaces.
2. `grep -rE 'preferred_words_per_arc|default_min_words_between_menus|max_words_without_player_commitment_soft' .claude/skills/branching-story-bootstrap/` returns 0 matches.
3. `grep -rn 'covering <commitment_classes>\|covering <shapes>' .claude/skills/branching-story-bootstrap/` shows the new wording in SKILL.md and template; no `covering <shapes>` hits.
4. Manual review confirms Phase 7 prompt structure is content_policy FIRST, then world context / story kernel / Prose Craft Contract / cast bound / state context, then entry pressure framing.
5. Manual review confirms Phase 9 gate 9 now uses `commitment_class`, Phase 9 records 17 gates, and Phase 9.5 explicitly remains a 10-check operational validator.

### Invariants

1. Bootstrap remains a Category 2c story-pipeline skill with HARD-GATE intact; the gate-count-growth from 12 to 17 does NOT alter the gate-PASS-with-rationale discipline (FOUNDATIONS Rule 6 preserved).
2. Word-count fields are forbidden from STORY_KERNEL template, Phase 1 derivation, Phase 7 max_words discipline, and SAU choice-cadence sub-check (per Prose Craft Contract Rule 11).
3. Phase 8's legacy diversification/pair-distance model is superseded — bootstrap delegates to archived SPEC-20 §F.

## Test Plan

### New/Modified Tests

`None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rE '12 gates|17 gates' .claude/skills/branching-story-bootstrap/`
2. `grep -rE 'preferred_words_per_arc|default_min_words_between_menus|max_words_without_player_commitment_soft' .claude/skills/branching-story-bootstrap/`
3. `grep -rn 'covering <commitment_classes>\|covering <shapes>' .claude/skills/branching-story-bootstrap/`
4. Manual review of all modified bootstrap files against SPEC-22 §Track 4 prose.

## Outcome

Completed: 2026-05-09.

Implemented the bootstrap v2 alignment slice. `branching-story-bootstrap` now documents arc-unit seed sizing, PG-0001 scene-setter rendering, PG-0001 choice-surface delegation to page-cycle Phase 8, 17 Phase 9 gates, commitment_class storylet-pool diversity, arc-unit cadence/menu policy derivation, and commitment_class INDEX/STORY_KERNEL summaries. Same-seam bootstrap references and SPEC-22 prose were truthed so they no longer contradict the landed bootstrap contract.

## Verification Result

1. `grep -rE '12 gates|17 gates' .claude/skills/branching-story-bootstrap/` — passed; current bootstrap surfaces report 17 gates only.
2. `grep -rE 'preferred_words_per_arc|default_min_words_between_menus|max_words_without_player_commitment_soft' .claude/skills/branching-story-bootstrap/` — passed with zero matches.
3. `grep -rn 'covering <commitment_classes>\|covering <shapes>' .claude/skills/branching-story-bootstrap/` — passed; SKILL.md and `templates/story-bundle-index.md` contain `covering <commitment_classes>`, and there are no `covering <shapes>` hits.
4. `rg -n '13 gates|18 gates|13 → 18' .claude/skills/branching-story-bootstrap/` — passed with zero matches.
5. `git diff --check` — passed.
6. Manual review: Phase 7 scene-setter prompt order, Phase 8 PG-0001 choice-surface delegation, Phase 9 17-gate table, Phase 9.5 preservation note, STORY_KERNEL/INDEX commitment_class summaries, and SPEC-22 same-seam truthing all match the landed boundary.

## Deviations

- Reassessment corrected the drafted Phase 9.5 diversity claim. Diversity is Phase 9 gate 9 in the live bootstrap skill, so this ticket changed Phase 9 gate 9 plus the templates and added only a preservation note to Phase 9.5.
- Same-seam stale references in `phase-7-5-visible-affordance-extraction.md`, `pre-flight-and-prerequisites.md`, `templates/story-records.yaml`, and `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` were absorbed so the bootstrap contract remains internally consistent. No record-schema extension was made; SPEC22SCECOM-013 remains the owner for page-cycle record-schema changes.
