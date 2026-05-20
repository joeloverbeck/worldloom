# SPEC52PROGRACHA-003: Revise character-generation for dramatic_core + anti-flattening

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `character-generation` SKILL.md, references (phase-0-normalize-brief, phases-1-6-character-construction, phase-8-validation-tests), and the dossier template.
**Deps**: 001

## Problem

`character-generation` builds grounded, validated dossiers but has no structured surface for world-produced wound, appetite, self-mythology, pressure behavior, relational charge, moral edge, or signature scene behavior — and a strong NCP can be fed in and emerge as a safer, duller dossier. SPEC-52 D4 makes final CHAR dossiers preserve and deepen a proposal's memorability via a required `dramatic_core` block + an anti-flattening preservation contract.

## Assumption Reassessment (2026-05-20)

1. `character-generation` runs Phases 0-9 (`.claude/skills/character-generation/SKILL.md`); Phase 0 normalize lives in `references/phase-0-normalize-brief.md`; Phases 1-6 construction in `references/phases-1-6-character-construction.md` (Phase 4 = Goal and Pressure Construction); Phase 8 tests in `references/phase-8-validation-tests.md` (10 tests, incl. "World-Grown Specificity"). The dossier template `templates/character-dossier.md` has 9 body sections and NO `dramatic_core` frontmatter or protagonist-grade body sections (confirmed at SPEC-52 reassessment).
2. SPEC-52 §Phase 4 + Deliverable 4 enumerate: Phase 0 preservation contract (`input_memorability_contract`), Phase 4b deepening/preservation, required CHAR frontmatter `dramatic_core`, six new body sections before "Likely Story Hooks", and new Phase 8 validation tests.
3. Cross-skill boundary: the CHAR `dramatic_core` frontmatter block field names MUST match `.claude/skills/_shared-references/protagonist-grade-character-engine.md` (001) and the NCP `memorability_profile` block (002); when `character_brief_path` is an NCP card, Phase 0 extracts its `memorability_profile` as the preservation contract. The `dramatic_core` schema is enforced by `character-frontmatter.schema.json` (005) and the body sections by the structural validator (006).
4. FOUNDATIONS Rule 2 (No Pure Cosmetics) + Rule 3 (No Specialness Inflation): `dramatic_core` is required on every CHAR because every dossier-pipeline character is a deliberately-kept world character (ephemeral cast are story-system STENT records, outside this spec) — "engine density, not theatrical loudness," not universal exceptional capability. Rule 7: the Phase 7 Canon Safety Check / Mystery Reserve firewall is unchanged; if canon repair must weaken a dramatic element, the anti-flattening contract surfaces the tradeoff before commit.
5. Output-schema extension (character dossier): adding required `dramatic_core` frontmatter + six body sections extends the CHAR output shape. Consumers: `character-frontmatter.schema.json` (005), the structural validator (006), and `branching-story-bootstrap` (reads CHAR ids only — unaffected; no story-aware fields are added). The extension is required-breaking by design (existing animalia dossiers fail until manually edited) — Rule 6: this is the documented intended break (SPEC-52 §Key Design Decisions), not a silent retcon.

## Architecture Check

1. A Phase 4b that converts contradiction→repeated behavior, shame→self-mythology, desire→appetite, embedding→relational charge, voice→pressure speech preserves the NCP engine instead of flattening it, with the preservation contract making any canon-forced flattening explicit. Cleaner than a post-hoc "add dramatic flavor" pass.
2. No backwards-compatibility aliasing/shims — old dossiers fail validation and are manually migrated (intended).

## Verification Layers

1. `dramatic_core` frontmatter block present in `templates/character-dossier.md`, field names matching 001 → grep-proof + manual cross-check.
2. Six new body sections present before "Likely Story Hooks" → grep-proof.
3. Phase 0 `input_memorability_contract` + Phase 4b present → grep-proof.
4. New Phase 8 tests present; "Likely Story Hooks" stays non-story-system-specific → grep-proof + manual review.
5. Rule 2/3/7 conformance → FOUNDATIONS alignment check.

## What to Change

### 1. Phase 0 preservation contract (`references/phase-0-normalize-brief.md`)

When `character_brief_path` is an NCP card carrying `memorability_profile`, extract it into `input_memorability_contract` (`source_proposal_id`, `preserved_essence[]`, `protagonist_grade_engine{}`, `flattening_forbidden_without_user_approval: true`).

### 2. Phase 4b deepening/preservation (`references/phases-1-6-character-construction.md`)

Insert Phase 4b after Phase 4: preserve NCP `memorability_profile` if present, else derive `dramatic_core`; convert contradiction→behavior, shame→self-mythology, desire→appetite, embedding→relational charge, voice→pressure speech; add ≥3 signature scene behaviors from body/work/status/fear/appetite/institution.

### 3. SKILL.md flow + dossier template (`SKILL.md`, `templates/character-dossier.md`)

Add Phase 4b to the flow + the anti-flattening tradeoff-surfacing at Phase 9. Add required `dramatic_core` frontmatter (engine fields; `signature_scene_behaviors` ≥3; `pressure_behavior` 5 keys; `voice_under_pressure` 4 keys; `relational_charge` ≥1) and the six body sections (`## Protagonist-Grade Core`, `## Pressure Behavior`, `## Self-Mythology and Blind Spots`, `## Relational Charge`, `## Moral and Psychological Edge`, `## Signature Scene Behavior`) before "Likely Story Hooks".

### 4. Phase 8 tests (`references/phase-8-validation-tests.md`)

Add: `dramatic_core` required + complete; wound world-produced; contradiction behavioral + recurrent; pressure behaviors distinct; relational charge has need + harm; voice-under-pressure passes swap test; if NCP source, dossier preserves/names any altered element; no story-system-specific fields.

## Files to Touch

- `.claude/skills/character-generation/SKILL.md` (modify)
- `.claude/skills/character-generation/references/phase-0-normalize-brief.md` (modify)
- `.claude/skills/character-generation/references/phases-1-6-character-construction.md` (modify)
- `.claude/skills/character-generation/references/phase-8-validation-tests.md` (modify)
- `.claude/skills/character-generation/templates/character-dossier.md` (modify)

## Out of Scope

- The shared reference (001) and `propose-new-characters` (002).
- `character-frontmatter.schema.json` / structural validator (005/006) — this ticket emits the dossier shape; the schema enforces it.
- Any story-system-specific field (arc beat, act position, plot destiny, companion quest); "Likely Story Hooks" stays a pressure-surface description.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "dramatic_core" .claude/skills/character-generation/templates/character-dossier.md` returns the frontmatter block.
2. `grep -nE "## Protagonist-Grade Core|## Pressure Behavior|## Signature Scene Behavior" .claude/skills/character-generation/templates/character-dossier.md` returns the six sections.
3. `grep -n "input_memorability_contract" .claude/skills/character-generation/references/phase-0-normalize-brief.md` returns the contract.
4. A skill dry-run from a strong NCP produces a CHAR preserving all load-bearing memorability elements; a canon-forced flattening is surfaced before commit.

### Invariants

1. `dramatic_core` field names match the shared reference (001) and NCP `memorability_profile` (002) exactly.
2. No story-system-specific fields are added; `branching-story-bootstrap` CHAR-id resolution is unaffected.
3. The Phase 7 Mystery Reserve firewall is unchanged (Rule 7).

## Test Plan

### New/Modified Tests

1. `.claude/skills/character-generation/references/phase-8-validation-tests.md` — adds the `dramatic_core` + anti-flattening validation tests (skill-internal test list).

### Commands

1. `grep -nE "dramatic_core|## Protagonist-Grade Core|input_memorability_contract" .claude/skills/character-generation/templates/character-dossier.md .claude/skills/character-generation/references/phase-0-normalize-brief.md`
2. Skill dry-run: invoke `character-generation` with an NCP `character_brief_path`; inspect the emitted dossier's `dramatic_core` + body sections without committing.
