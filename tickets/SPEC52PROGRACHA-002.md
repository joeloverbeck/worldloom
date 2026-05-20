# SPEC52PROGRACHA-002: Revise propose-new-characters for protagonist-grade default

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `propose-new-characters` references (phases-6-9, phases-11-13, phases-14-16), SKILL.md, and templates (proposal-card.md, batch-manifest.md).
**Deps**: 001

## Problem

In `propose-new-characters`, protagonist-grade force is one diversification slot (slot 10, "potentially load-bearing round character") among ten — not the governing quality bar. "Valid but dull" is not a named failure mode, and appetite/contradiction/shame are prose fields that can flatten downstream. SPEC-52 D3 makes protagonist-grade force a default generation requirement.

## Assumption Reassessment (2026-05-20)

1. The per-seed character engine lives in `.claude/skills/propose-new-characters/references/phases-6-9-seeds-engine-epistemic-voice.md` (line 34: `short_term_goal / long_term_desire / unavoidable_obligation / external_pressure / public_mask / private_appetite / social_fear / private_shame / central_contradiction / capability_path / cost_of_competence / relation_to_law_taboo_debt / repeated_forced_choice`). The 10 scoring dimensions + 13 rejection triggers live in `references/phases-11-13-score-filter-diversify.md`; the 12 validation tests live in `references/phases-14-16-compose-validate-commit.md`. There is NO standalone "Phase 7" / "Phase 8" boundary — phases 6-9 are bundled; the protagonist-grade engine AUGMENTS the existing per-seed engine within phases 6-9 (per SPEC-52 §Key Design Decisions).
2. SPEC-52 §Phase 3 + Deliverable 3 enumerate the work: augment the per-seed engine with a `protagonist_grade_engine` block, add 14 high-yield mutation families to the existing 16, replace the single 10-dimension matrix with a two-layer matrix (`validity_total + 1.5 * memorability_total − canon_burden − overlap_risk`), add rejection triggers, add two critic-pass slots, add per-card validation tests.
3. Cross-skill boundary: the `protagonist_grade_engine` field names + the NCP `memorability_profile` template block MUST match `.claude/skills/_shared-references/protagonist-grade-character-engine.md` (001) exactly, and the proposal-card template's `memorability_profile` block is the same surface the NCP JSON schema (005) and the structural validator (006) will enforce.
4. FOUNDATIONS Rule 2 (No Pure Cosmetics) + Rule 3 (No Specialness Inflation): the new mutation families and edge-traits must be world-produced, not cosmetic; "engine density, not theatrical loudness." Rule 7 (Preserve Mystery): the canon-requiring routing must hand implied facts to `canon-addition`/`propose-new-canon-facts`, never assert them — preserving the Mystery Reserve firewall already present in the skill.
5. Output-schema extension (proposal card): adding the `memorability_profile` + `upgrade_lineage` blocks to `templates/proposal-card.md` extends the NCP output shape. Consumers: `character-generation` (003, reads `memorability_profile` as a preservation contract), the NCP JSON schema (005), and the structural validator (006). The extension makes `memorability_profile` required-on-every-card; the existing optional template fields (`occupancy_strength`, `score_aggregate`, the authorial-steer fields) must survive (the schema in 005 keeps them permitted) — Rule 6: this is a documented intended change to the NCP output contract, not a silent retcon.

## Architecture Check

1. Augmenting the existing per-seed engine (rather than adding a parallel "Phase 7b") keeps the skill's phase structure intact and consolidates `private_appetite` / `private_shame` / `central_contradiction` / `repeated_forced_choice` into the protagonist-grade engine rather than duplicating them. The two-layer scoring with memorability weighted 1.5× makes "valid but dull" a hard failure by construction.
2. No backwards-compatibility aliasing/shims — the consolidation rewrites the engine block; old field names map into the new block per the explicit consolidation mapping stated in the reference edit.

## Verification Layers

1. `protagonist_grade_engine` block present in phases-6-9 with all engine fields → codebase grep-proof.
2. Two-layer scoring matrix + aggregate formula present in phases-11-13 → grep-proof.
3. New rejection triggers + two critic-pass slots + per-card tests present in phases-11-13 / phases-14-16 → grep-proof.
4. `memorability_profile` + `upgrade_lineage` blocks present in `templates/proposal-card.md`, field names matching 001 → grep-proof + manual cross-check against the shared reference.
5. Rule 2/3/7 conformance of the new families and routing → FOUNDATIONS alignment check (manual review).

## What to Change

### 1. Augment the per-seed engine (`references/phases-6-9-seeds-engine-epistemic-voice.md`)

Add a required `protagonist_grade_engine` block (the 10 engine fields, with `pressure_behavior{cornered,tempted,humiliated,offered_power,protecting_attachment}`, `relational_charge[{target_or_relation_type,need,resentment_or_fear,likely_harm_or_betrayal}]`, `signature_scene_behaviors[]`). State the consolidation mapping from the existing fields explicitly. Add the 14 mutation families (self-mythologizer, shame-defender, corrupted caretaker, sincere fanatic, failed prodigy, beloved institutional monster, pathetic gatekeeper, bodily taboo carrier, erotic/status transgressor [world-valid + within taboo limits], impossible witness, humiliated expert, dangerous innocent, obsolete loyalist, contaminating saint).

### 2. Two-layer scoring + triggers + critic slots (`references/phases-11-13-score-filter-diversify.md`)

Replace the 10-dimension matrix with Layer A (validity) + Layer B (memorability) and aggregate `validity_total + 1.5 * memorability_total − canon_burden − overlap_risk`. Add the new rejection triggers (valid-but-dull; abstract contradiction; generic/missing appetite; missing self-mythology; absent pressure behavior; cosmetic weirdness; relationship-neutral; sanded moral edge; timid mutation; suppressed canon-requiring brilliance; vocabulary-only voice; uncaused specialness). Add the blandness-executioner + protagonist-grade critic slots (both record rationale).

### 3. Per-card validation tests (`references/phases-14-16-compose-validate-commit.md`)

Add tests: engine present + fully populated; wound/appetite/self-mythology not generic; `pressure_behavior` ≥4 distinct responses; `relational_charge` ≥1 charged relation with need + harm; `cannot_be_swapped_out_because` world-specific; memorability critic pass recorded with rationale.

### 4. SKILL.md flow + templates

Update the SKILL.md Process Flow to name the augmented engine + critic slots. Add `memorability_profile` + `upgrade_lineage` blocks to `templates/proposal-card.md` (field names per 001). Extend (do not replace) `templates/batch-manifest.md` to record the new score layers.

## Files to Touch

- `.claude/skills/propose-new-characters/references/phases-6-9-seeds-engine-epistemic-voice.md` (modify)
- `.claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md` (modify)
- `.claude/skills/propose-new-characters/references/phases-14-16-compose-validate-commit.md` (modify)
- `.claude/skills/propose-new-characters/SKILL.md` (modify)
- `.claude/skills/propose-new-characters/templates/proposal-card.md` (modify)
- `.claude/skills/propose-new-characters/templates/batch-manifest.md` (modify)

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
4. A skill dry-run produces an NCP card whose `memorability_profile` field names match `_shared-references/protagonist-grade-character-engine.md`.

### Invariants

1. `protagonist_grade_engine` / `memorability_profile` field names match the shared reference (001) exactly.
2. The existing optional NCP fields (`occupancy_strength`, `score_aggregate`, authorial-steer fields) remain emitted; the schema in 005 keeps them permitted.
3. Canon-requiring implications are routed to `canon-addition`/`propose-new-canon-facts`, never asserted (Rule 7 MR firewall intact).

## Test Plan

### New/Modified Tests

1. `.claude/skills/propose-new-characters/references/phases-14-16-compose-validate-commit.md` — adds the per-card protagonist-grade validation tests (skill-internal test list, not a code test).

### Commands

1. `grep -nE "protagonist_grade_engine|blandness|cannot_be_swapped_out_because" .claude/skills/propose-new-characters/references/phases-6-9-seeds-engine-epistemic-voice.md .claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md`
2. Skill dry-run: invoke `propose-new-characters` against an existing world; inspect an emitted NCP card's `memorability_profile` block without committing.
