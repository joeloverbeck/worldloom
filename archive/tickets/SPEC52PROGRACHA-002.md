# SPEC52PROGRACHA-002: Revise propose-new-characters for protagonist-grade default

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `propose-new-characters` SKILL.md, references (phase-10, phases-6-9, phases-11-13, phases-14-16), templates (proposal-card.md, batch-manifest.md), and example NCP card.
**Deps**: archive/tickets/SPEC52PROGRACHA-001.md

## Problem

At intake, `propose-new-characters` treated protagonist-grade force as one diversification slot (slot 10, "potentially load-bearing round character") among ten — not the governing quality bar. "Valid but dull" was not a named failure mode, and appetite/contradiction/shame were prose fields that could flatten downstream. This ticket made protagonist-grade force a default generation requirement.

## Assumption Reassessment (2026-05-20)

1. At intake, the per-seed character engine lived in `.claude/skills/propose-new-characters/references/phases-6-9-seeds-engine-epistemic-voice.md` as the old `short_term_goal / long_term_desire / unavoidable_obligation / external_pressure / public_mask / private_appetite / social_fear / private_shame / central_contradiction / capability_path / cost_of_competence / relation_to_law_taboo_debt / repeated_forced_choice` list. The 10 scoring dimensions + 13 rejection triggers lived in `references/phases-11-13-score-filter-diversify.md`; the 12 validation tests lived in `references/phases-14-16-compose-validate-commit.md`. There was NO standalone "Phase 7" / "Phase 8" boundary — phases 6-9 are bundled; the protagonist-grade engine AUGMENTS the existing per-seed engine within phases 6-9 (per SPEC-52 §Key Design Decisions).
2. SPEC-52 §Phase 3 + Deliverable 3 enumerate the work: augment the per-seed engine with a `protagonist_grade_engine` block, add 14 high-yield mutation families to the existing 16, replace the single 10-dimension matrix with a two-layer matrix (`validity_total + 1.5 * memorability_total − canon_burden − overlap_risk`), add rejection triggers, add two critic-pass slots, add per-card validation tests.
3. Cross-skill boundary: the `protagonist_grade_engine` field names + the NCP `memorability_profile` template block MUST match `.claude/skills/_shared-references/protagonist-grade-character-engine.md` (001) exactly, and the proposal-card template's `memorability_profile` block is the same surface the NCP JSON schema (005) and the structural validator (006) will enforce.
4. FOUNDATIONS Rule 2 (No Pure Cosmetics) + Rule 3 (No Specialness Inflation): the new mutation families and edge-traits must be world-produced, not cosmetic; "engine density, not theatrical loudness." Rule 7 (Preserve Mystery): the canon-requiring routing must hand implied facts to `canon-addition`/`propose-new-canon-facts`, never assert them — preserving the Mystery Reserve firewall already present in the skill.
5. Output-schema extension (proposal card): adding the `memorability_profile` + `upgrade_lineage` blocks to `templates/proposal-card.md` extends the NCP output shape. Consumers: `character-generation` (003, reads `memorability_profile` as a preservation contract), the NCP JSON schema (005), and the structural validator (006). The extension makes `memorability_profile` required-on-every-card; the existing optional template fields (`occupancy_strength`, `score_aggregate`, the authorial-steer fields) must survive (the schema in 005 keeps them permitted) — Rule 6: this is a documented intended change to the NCP output contract, not a silent retcon.
6. Same-seam producer-surface inventory found two additional current-contract surfaces under `.claude/skills/propose-new-characters/`: `references/phase-10-canon-safety-check.md` still described old route labels (`direct_to_canon_addition` / `first_through_propose_new_canon_facts`), and `examples/NCP-0012-maren-toll-confessor.md` still illustrated the old flat scoring shape with no `memorability_profile`. Both were in scope because they are live skill reference/example surfaces for the same NCP output contract.
7. The drafted skill dry-run proof is not executable in this Codex context: there is no repo-local runner that invokes `.claude/skills/propose-new-characters` as a skill and captures an emitted preview. The accepted proof boundary is grep-proof over the edited operational surfaces plus manual contract review against `.claude/skills/_shared-references/protagonist-grade-character-engine.md`.

## Architecture Check

1. Augmenting the existing per-seed engine (rather than adding a parallel "Phase 7b") keeps the skill's phase structure intact and consolidates `private_appetite` / `private_shame` / `central_contradiction` / `repeated_forced_choice` into the protagonist-grade engine rather than duplicating them. The two-layer scoring with memorability weighted 1.5× makes "valid but dull" a hard failure by construction.
2. No backwards-compatibility aliasing/shims — the consolidation rewrites the engine block; old field names map into the new block per the explicit consolidation mapping stated in the reference edit.

## Verification Layers

1. `protagonist_grade_engine` block present in phases-6-9 with all engine fields → codebase grep-proof.
2. Two-layer scoring matrix + aggregate formula present in phases-11-13 → grep-proof.
3. New rejection triggers + two critic-pass slots + per-card tests present in phases-11-13 / phases-14-16 → grep-proof.
4. `memorability_profile` + `upgrade_lineage` blocks present in `templates/proposal-card.md`, field names matching 001 → grep-proof + manual cross-check against the shared reference.
5. Rule 2/3/7 conformance of the new families and routing → FOUNDATIONS alignment check (manual review).

## Landed Changes

### 1. Augmented the per-seed engine (`references/phases-6-9-seeds-engine-epistemic-voice.md`)

Added the required `protagonist_grade_engine` block (the 10 engine fields, with `pressure_behavior{cornered,tempted,humiliated,offered_power,protecting_attachment}`, `relational_charge[{target_or_relation_type,need,resentment_or_fear,likely_harm_or_betrayal}]`, `signature_scene_behaviors[]`). The reference now states the consolidation mapping from the old appetite/shame/contradiction/forced-choice fields explicitly and adds the 14 mutation families.

### 2. Added two-layer scoring, triggers, and critic slots (`references/phases-11-13-score-filter-diversify.md`)

Replaced the 10-dimension matrix with Layer A (validity) + Layer B (memorability) and aggregate `validity_total + 1.5 * memorability_total - canon_burden - overlap_risk`. Added the new rejection triggers and the blandness-executioner + protagonist-grade critic slots, both requiring rationales.

### 3. Added per-card validation tests (`references/phases-14-16-compose-validate-commit.md`)

Added tests: engine present + fully populated; wound/appetite/self-mythology not generic; `pressure_behavior` at least 4 distinct responses; `relational_charge` at least 1 charged relation with need + harm; `cannot_be_swapped_out_because` world-specific; memorability critic pass recorded with rationale. The phase now has 18 tests.

### 4. SKILL.md flow + templates

Updated the SKILL.md Process Flow to name the augmented engine + critic slots. Added `memorability_profile` + `upgrade_lineage` blocks to `templates/proposal-card.md` (field names per 001). Extended `templates/batch-manifest.md` to record the new score layers and tests.

### 5. Truthed same-seam reference and example surfaces

Updated `references/phase-10-canon-safety-check.md` and `templates/proposal-card.md` route examples to `canon-addition` / `propose-new-canon-facts`. Updated `examples/NCP-0012-maren-toll-confessor.md` to illustrate `memorability_profile`, `upgrade_lineage`, two-layer scores, and the two new critic-pass slots.

## Files to Touch

- `.claude/skills/propose-new-characters/references/phases-6-9-seeds-engine-epistemic-voice.md` (modify)
- `.claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md` (modify)
- `.claude/skills/propose-new-characters/references/phases-14-16-compose-validate-commit.md` (modify)
- `.claude/skills/propose-new-characters/references/phase-10-canon-safety-check.md` (modify)
- `.claude/skills/propose-new-characters/SKILL.md` (modify)
- `.claude/skills/propose-new-characters/templates/proposal-card.md` (modify)
- `.claude/skills/propose-new-characters/templates/batch-manifest.md` (modify)
- `.claude/skills/propose-new-characters/examples/NCP-0012-maren-toll-confessor.md` (modify)

## Out of Scope

- The shared reference itself (001).
- The NCP JSON schema and structural validator (005/006) — this ticket emits the template shape; the schema enforces it.
- `character-generation` changes (003).
- Any new MCP task type (Phase 6 is a no-op; the skill keeps its existing `propose_new_characters` retrieval).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "protagonist_grade_engine" .claude/skills/propose-new-characters/references/phases-6-9-seeds-engine-epistemic-voice.md` returns the new block.
2. `grep -n "1.5 \* memorability" .claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md` returns the aggregate formula.
3. `grep -n "memorability_profile\|upgrade_lineage" .claude/skills/propose-new-characters/templates/proposal-card.md` returns both blocks.
4. Manual contract review confirms the NCP template/example `memorability_profile` field names match `_shared-references/protagonist-grade-character-engine.md`.

### Invariants

1. `protagonist_grade_engine` / `memorability_profile` field names match the shared reference (001) exactly.
2. The existing optional NCP fields (`occupancy_strength`, `score_aggregate`, authorial-steer fields) remain emitted; the schema in 005 keeps them permitted.
3. Canon-requiring implications are routed to `canon-addition`/`propose-new-canon-facts`, never asserted (Rule 7 MR firewall intact).

## Test Plan

### New/Modified Tests

1. `.claude/skills/propose-new-characters/references/phases-14-16-compose-validate-commit.md` — adds the per-card protagonist-grade validation tests (skill-internal test list, not a code test).

### Commands

1. `grep -nE "protagonist_grade_engine|Blandness|cannot_be_swapped_out_because" .claude/skills/propose-new-characters/references/phases-6-9-seeds-engine-epistemic-voice.md .claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md`
2. `grep -nE "memorability_profile|upgrade_lineage|blandness_executioner|protagonist_grade_critic" .claude/skills/propose-new-characters/templates/proposal-card.md .claude/skills/propose-new-characters/examples/NCP-0012-maren-toll-confessor.md`
3. Manual contract review: compare the NCP template/example `memorability_profile` fields against `.claude/skills/_shared-references/protagonist-grade-character-engine.md`.

## Outcome

Completed: 2026-05-20

Revised `propose-new-characters` so protagonist-grade construction is part of the default generation contract. The skill now loads the shared protagonist-grade reference, builds the canonical `protagonist_grade_engine`, scores world validity and memorability separately, rejects valid-but-dull or cosmetically strange cards, records blandness/protagonist-grade critic rationales, and emits NCP templates/examples with `memorability_profile` and `upgrade_lineage`.

## Verification Result

1. `grep -nE "protagonist_grade_engine|Blandness|cannot_be_swapped_out_because" .claude/skills/propose-new-characters/references/phases-6-9-seeds-engine-epistemic-voice.md .claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md` — passed.
2. `grep -n "1.5 \\* memorability" .claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md` — passed.
3. `grep -nE "memorability_profile|upgrade_lineage|blandness_executioner|protagonist_grade_critic" .claude/skills/propose-new-characters/templates/proposal-card.md .claude/skills/propose-new-characters/examples/NCP-0012-maren-toll-confessor.md` — passed.
4. Field-name grep over `_shared-references/protagonist-grade-character-engine.md`, `templates/proposal-card.md`, and `examples/NCP-0012-maren-toll-confessor.md` — passed; all 10 shared engine field names appear on the NCP surfaces.
5. Stale old-contract sweep over `.claude/skills/propose-new-characters` — passed for current operational surfaces; only this ticket preserves old counts as labelled intake evidence.
6. `git diff --check -- .claude/skills/propose-new-characters archive/tickets/SPEC52PROGRACHA-002.md` — passed after archival path repair.
7. Manual FOUNDATIONS alignment review — passed; the edits preserve Rule 2 world-producedness, Rule 3 cost/distribution discipline, and Rule 7 canon routing. The HARD-GATE approval block remains absolute and no canon write surface was added.

## Deviations

- The drafted skill dry-run was replaced with manual contract review plus grep proof because this Codex session has no executable runner for `.claude/skills/propose-new-characters` that can produce a non-writing preview.
- Same-seam reference/example surfaces were added to the file set after reassessment: `references/phase-10-canon-safety-check.md` and `examples/NCP-0012-maren-toll-confessor.md`.
