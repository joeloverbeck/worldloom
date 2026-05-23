# SPEC74STCHARDISBOU-004: _shared-templates/story-record-schemas.md STCHAR prose + regeneration_reason_class field rule

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-record-schemas.md` STCHAR section prose extension + new frontmatter field rule
**Deps**: None

## Problem

The shared `story-record-schemas.md` STCHAR schema prose does not currently include an explicit boundary statement clarifying that STCHAR is durable story-local character authority — not a root-page summary, opening-scene summary, or compressed current-state packet. The dormant-stable-material inclusion rule is implicit, scattered across `story-character-profile/SKILL.md` discipline rather than restated in the shared schema's normative prose. There is no `regeneration_reason_class` frontmatter field rule documented in the shared schema, so the JSON Schema add (SPEC74STCHARDISBOU-006) lacks its operator-facing contract.

## Assumption Reassessment (2026-05-23)

1. Verified current `.claude/skills/_shared-templates/story-record-schemas.md` STCHAR section: contains the existing schema prose describing `source_kind`, `source_char_id`, `supersedes`/`superseded_by`; does not contain an explicit "STCHAR is durable story-local character authority; must not be used as a root-page summary" boundary statement; does not document `regeneration_reason_class` as a frontmatter field.
2. Verified SPEC-74 §4.4 specifies the prose extension (boundary statement + dormant-stable-material inclusion rule) + new frontmatter field rule for `regeneration_reason_class` matching the §4.7 schema enum (`source_world_char_material_change`, `durable_branch_transformation`, `profile_fidelity_failure`, `story_local_character_promotion`, `stable_source_material_omission_repair`).
3. Cross-skill boundary under audit: the shared `story-record-schemas.md` IS the canonical reference for every story-bundle record class's normative prose; it is consumed by `story-character-profile`, `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `branching-story-health-audit` (all skills that produce, validate, or read story-bundle records); the new `regeneration_reason_class` field rule must align with the JSON Schema validator's enforcement (SPEC74STCHARDISBOU-006).
4. FOUNDATIONS principle restated: §Story Bundles §5b ("Schema-Minimalism At Story Scope" — every field load-bearing, no nice-to-have fields) + Rule 6 (No Silent Retcons — `regeneration_reason_class` is itself a retcon-audit field) are the load-bearing principles. The new field passes §5b's load-bearing test because it is consumed by the `stchar_regeneration_reason_integrity` validator (SPEC74STCHARDISBOU-011), the regenerate-mode skill instructions (SPEC74STCHARDISBOU-001), and the health-audit Phase 2m `stchar_regeneration_reason_invalid` finding (SPEC74STCHARDISBOU-012).
5. HARD-GATE / Canon Safety Check surface touched: the `regeneration_reason_class` field rule is the operator-facing contract for a retcon-audit field; the JSON Schema (SPEC74STCHARDISBOU-006) enforces it; the validator (SPEC74STCHARDISBOU-011) checks the field plus its evidence. The rule does NOT weaken the Mystery Reserve firewall (STCHAR is story-local; MR firewall is canon-pipeline scope).
6. Schema extension: this ticket extends the documented STCHAR record schema by adding the `regeneration_reason_class` field rule (operator-facing prose form). Consumers of the schema are named above (Assumption Reassessment item 3); the extension is additive — existing STCHAR records without `regeneration_reason_class` remain valid until the JSON Schema (SPEC74STCHARDISBOU-006) requires non-null values for regenerated/superseding profiles, at which point the field becomes conditionally-required per the SPEC74STCHARDISBOU-011 validator's enforcement.

## Architecture Check

1. The schema's prose is the canonical operator-facing reference; restating the Durable-Authority Boundary inclusion rule here keeps the rule discoverable from the schema rather than only from the skill. This is a deliberate redundancy: skill prose is procedural; schema prose is normative. Both are needed because operators authoring STCHAR by hand consult the schema, while operators using the skill consult the skill instructions.
2. No backwards-compatibility shims. The `regeneration_reason_class` field rule names the required vocabulary; existing in-flight STCHAR records without the field remain valid until the JSON Schema enforces non-null for regenerated profiles (SPEC74STCHARDISBOU-006).

## Verification Layers

1. **Durable-Authority boundary statement present in STCHAR schema prose** → grep-proof: `grep -n 'STCHAR is durable story-local character authority\|must not be used as a root-page summary' .claude/skills/_shared-templates/story-record-schemas.md` returns ≥1 match.
2. **`regeneration_reason_class` field rule documented** → grep-proof: `grep -n 'regeneration_reason_class' .claude/skills/_shared-templates/story-record-schemas.md` returns ≥2 matches (the field rule statement + the vocabulary enumeration).
3. **5-value vocabulary cited** → grep-proof: `grep -nE 'source_world_char_material_change|durable_branch_transformation|profile_fidelity_failure|story_local_character_promotion|stable_source_material_omission_repair' .claude/skills/_shared-templates/story-record-schemas.md` returns ≥5 matches.

## What to Change

### 1. Add the STCHAR schema prose boundary statement

Insert into the existing STCHAR schema prose section:

> `STCHAR` is durable story-local character authority. It must not be used as a root-page summary, opening-scene summary, or compressed current-state packet. Opening or branch-current facts belong to `STSTAT`, `STOBJ`, `STLOC`, `SE`, `BEL`, `STPLAN`, `STINT`, `STEMO`, `SREL`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, `STQ`, `PG`, and page-plan §16a.

Add the dormant-stable-material inclusion rule restating the §4.1 Durable-Authority Boundary in schema-prose form:

> Stable source material that can lawfully shape future voice, conduct, appraisal, pressure behavior, agency, relationship behavior, perception, embodiment, capabilities, limits, or choices belongs in STCHAR operational sections — even if dormant at the story's opening page. "Not needed on page 1" is never the omission criterion.

### 2. Add new frontmatter field rule for `regeneration_reason_class`

Document the field rule in the STCHAR record schema prose section, matching the JSON Schema enum vocabulary (SPEC74STCHARDISBOU-006):

> `regeneration_reason_class` — durable profile-change reason classification. Field is required and non-null when `source_kind: regenerated` OR `supersedes` is non-null. Vocabulary: `source_world_char_material_change` | `durable_branch_transformation` | `profile_fidelity_failure` | `story_local_character_promotion` | `stable_source_material_omission_repair`. Ordinary updates to active state records (`STEMO`, `BEL`, `STPLAN`, `SREL`, `STSTAT`, `STOBJ`, `STLOC`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, `STQ`, `PG`, `SE`) or page-local prose are NOT valid reason classes unless the evidence has durably consolidated into a changed character model.

## Files to Touch

- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)

## Out of Scope

- JSON Schema property add (SPEC74STCHARDISBOU-006 — `story-character-authority.schema.json`).
- The validator that enforces the field rule (SPEC74STCHARDISBOU-011 — `stchar_regeneration_reason_integrity`).
- Skill regenerate-mode wording (SPEC74STCHARDISBOU-001 — `story-character-profile/SKILL.md`).
- Health-audit Phase 2m finding registration (SPEC74STCHARDISBOU-012).
- Existing in-flight STCHAR records without `regeneration_reason_class` (covered by SPEC74STCHARDISBOU-013 migration).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'STCHAR is durable story-local character authority\|must not be used as a root-page summary' .claude/skills/_shared-templates/story-record-schemas.md` returns ≥1 match.
2. `grep -n 'regeneration_reason_class' .claude/skills/_shared-templates/story-record-schemas.md` returns ≥2 matches.
3. `grep -nE 'source_world_char_material_change|durable_branch_transformation|profile_fidelity_failure|story_local_character_promotion|stable_source_material_omission_repair' .claude/skills/_shared-templates/story-record-schemas.md` returns ≥5 matches.
4. The dormant-stable-material inclusion rule is present in the STCHAR schema prose section.

### Invariants

1. The shared schema's STCHAR prose explicitly forbids using STCHAR as a current-state packet, root-page summary, or opening-scene summary.
2. The `regeneration_reason_class` field rule vocabulary in the schema prose matches the JSON Schema enum exactly (5 named values).
3. Ordinary state-record updates are NOT valid `regeneration_reason_class` values without durable-consolidation evidence.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n 'regeneration_reason_class\|durable story-local character authority' .claude/skills/_shared-templates/story-record-schemas.md` (confirms both surfaces are present)
2. Cross-check the vocabulary against the SPEC74STCHARDISBOU-006 JSON Schema enum to confirm bit-for-bit alignment (manual review during code review).
