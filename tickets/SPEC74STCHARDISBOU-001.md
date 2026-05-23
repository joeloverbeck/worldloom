# SPEC74STCHARDISBOU-001: story-character-profile/SKILL.md durable-authority hardening

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/story-character-profile/SKILL.md` (5 wording changes; no schema/validator code touched)
**Deps**: None

## Problem

`story-character-profile/SKILL.md` lets the authoring model fold opening-page state into the durable STCHAR profile because (a) the `regeneration_reason` argument description allows "fidelity failure, story-state drift, or other reason" — the "or other reason" clause permits ordinary `STEMO`/`BEL`/`STPLAN`/`SREL` updates to trigger STCHAR regeneration; (b) `Page-Plan Voice Block` is described as a "compact projection suitable for page-plan section 16a" — readable as "put a page packet into STCHAR"; (c) the skill has no Durable-Authority Boundary section restating the rule that STCHAR holds stable persona, not current state; (d) the skill has no Stable Source Material Inventory authoring requirement, so stable operational material outside the 10 `dramatic_core` fields gets silently dropped when bootstrap distillation treats opening-page relevance as the filter; (e) the `regenerate` mode description doesn't constrain valid regeneration reasons. Empirically observed on `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-{1,2,3}.md` where opening-scene state contaminated durable profiles.

## Assumption Reassessment (2026-05-23)

1. Verified current SKILL.md content at `.claude/skills/story-character-profile/SKILL.md`: line 31 contains the current `regeneration_reason` argument description; line 270 describes Page-Plan Voice Block as "compact projection suitable for page-plan section 16a"; no Durable-Authority Boundary section currently exists; no Stable Source Material Inventory authoring subsection exists under `## Source Distillation`; current `regenerate` mode description allows broad regeneration reasons.
2. Verified SPEC-74 §4.1 lists 5 wording changes mapped to this ticket: regeneration_reason argument, Durable-Authority Boundary section, Page-Plan Voice Block characterization, Stable Source Material Inventory subsection, regenerate mode description.
3. Cross-skill boundary under audit: the STCHAR authoring contract this skill defines IS consumed by `branching-story-bootstrap` (Phase 2 distillation) and `branching-story-turn-cycle` (regenerate flow); changes here propagate to those skills' authoring discipline without code changes (they reference STCHAR through retrieval, not by re-invoking this skill).
4. FOUNDATIONS principle restated: §Story Bundles §6.1 ("STCHAR is durable story-local character authority") + §6b ("STCHAR shapes persona, voice, and pressure behavior; it is not an epistemic access route") are the load-bearing principles. The Durable-Authority Boundary section restates these as authoring hard gates.

## Architecture Check

1. Wording-only changes preserve the skill's existing structure (Modes / Phases / Source Distillation / Section Catalog / Validation Anchors); no architectural restructuring. The new Durable-Authority Boundary section sits between `## Modes` and the first Phase as a normative gate the authoring model must read before drafting.
2. No backwards-compatibility shims; the regeneration_reason vocabulary tightening is a constraint enforcement (the 5 named valid reasons), not a renaming — existing in-flight regeneration calls citing prose reasons must be reauthored against the new constrained vocabulary at next regeneration.

## Verification Layers

1. **Durable-Authority Boundary present** → codebase grep-proof: `grep -n '## Durable-Authority Boundary' .claude/skills/story-character-profile/SKILL.md` returns exactly 1 match.
2. **regeneration_reason constrained vocabulary present** → grep-proof: `grep -n 'source_world_char_material_change\|durable_branch_transformation\|profile_fidelity_failure\|story_local_character_promotion\|stable_source_material_omission_repair' .claude/skills/story-character-profile/SKILL.md` returns ≥5 matches (the 5 valid reasons cited in the regeneration_reason description + regenerate mode + Durable-Authority Boundary section).
3. **Page-Plan Voice Block characterized as "stable, context-free reusable voice-authority seed"** → grep-proof: `grep -n 'stable, context-free reusable voice-authority seed' .claude/skills/story-character-profile/SKILL.md` returns 1 match; the prior "compact projection suitable for page-plan section 16a" wording returns 0 matches.
4. **Stable Source Material Inventory subsection authored under Source Distillation** → grep-proof: `grep -n '### Stable Source Material Inventory' .claude/skills/story-character-profile/SKILL.md` returns 1 match, immediately preceded (within 50 lines) by `## Source Distillation`.

## What to Change

### 1. Replace `regeneration_reason` argument description at SKILL.md line ~31

Replace the current description (which allows "fidelity failure, story-state drift, or other reason") with a constrained-vocabulary description naming the 5 valid reasons: `source_world_char_material_change`, `durable_branch_transformation`, `profile_fidelity_failure`, `story_local_character_promotion`, `stable_source_material_omission_repair`. Explicitly exclude ordinary state-record updates (`STEMO`, `BEL`, `STPLAN`, `STINT`, `SREL`, `STSTAT`, `STOBJ`, `STLOC`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, `STQ`, `PG`, `SE`, page-local prose) unless durably consolidated.

### 2. Add new `## Durable-Authority Boundary` section after `## Modes`

Authoring hard gate. State that STCHAR is a durable story-local character bible — not a root-page summary, opening-scene summary, compressed current-state packet, prose synopsis, or substitute for active story-state records. Include:
- **Inclusion rule**: stable material that can lawfully shape future voice, conduct, appraisal, pressure behavior, agency, relationship behavior, perception, embodiment, capabilities, limits, or choices.
- **Exclusion rule**: any fact that would be false, stale, or branch-dependent after a different choice, later page, or sibling branch.
- **Three paired durable-vs-transient examples** (durable: "Under humiliation, she converts shame into bravado, contempt, or performative brightness." / transient: "Today her bravado is worn through after crying in the park.").
- **Explicit rule**: "Opening-page relevance is never the inclusion test."

### 3. Replace `Page-Plan Voice Block` section requirement at SKILL.md line ~270

Replace "compact projection suitable for page-plan section 16a" with "stable, context-free reusable voice-authority seed for page-plan §16a" describing durable voice behavior, dialogue constraints, silence behavior, pressure shifts, register, rhythm, taboo language, and anti-generic warnings that remain valid across branches until durable profile regeneration. Explicitly forbid mentioning the current page, opening scene, current event, current emotional state, current physical status, active page ids, active event ids, or active belief/plan/emotion/status/relationship records. Note that page-specific modulation belongs in page-plan §16a, grounded in active state records.

### 4. Add new `### Stable Source Material Inventory` subsection under `## Source Distillation`

Authoring hard gate for `source_kind: world_char`. Body table with 5 columns (`source_area`, `stable operational material`, `disposition`, `operational_home`, `rationale`) covering every loaded source area carrying stable operational character material — not just the 10 `dramatic_core` fields. Disposition vocabulary mirrors the schema enum: `copied | transformed | compressed | omitted_with_rationale | story_irrelevant`. For bootstrap `story_irrelevant`, allowed rationale categories are `outside_story_scope`, `content_constraint`, `premise_incompatible`, `non_operational_trivia`, `duplicate_of_retained_material` — explicitly NOT `opening_not_relevant` or `not_needed_on_page_1`. State that `Source Distillation` is a provenance/compression-trace surface, NOT a retained operational home.

### 5. Replace `regenerate` mode description

Replace the broad current description with the 5-reason constrained list, the exclusion list of ordinary state-record updates, and the rule that those become regeneration-worthy only after durable consolidation changes the character model. Use the same vocabulary that the `regeneration_reason_class` schema field (SPEC74STCHARDISBOU-006) enforces.

## Files to Touch

- `.claude/skills/story-character-profile/SKILL.md` (modify)

## Out of Scope

- Schema changes (the `regeneration_reason_class` JSON Schema field add is SPEC74STCHARDISBOU-006).
- New validators (`stchar_temporal_reference_boundary`, `stchar_regeneration_reason_integrity`, `stchar_source_material_inventory_integrity` are SPEC74STCHARDISBOU-008 / -009 / -011).
- Bootstrap Phase 1b Ledger (SPEC74STCHARDISBOU-002).
- Health-audit Phase 2m findings registration (SPEC74STCHARDISBOU-012).
- Migration of existing red-bunny STCHAR profiles (SPEC74STCHARDISBOU-013).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n '## Durable-Authority Boundary' .claude/skills/story-character-profile/SKILL.md` returns exactly 1 match.
2. `grep -n '### Stable Source Material Inventory' .claude/skills/story-character-profile/SKILL.md` returns exactly 1 match, located under `## Source Distillation`.
3. `grep -n 'stable, context-free reusable voice-authority seed' .claude/skills/story-character-profile/SKILL.md` returns 1 match.
4. `grep -n 'compact projection suitable for page-plan section 16a' .claude/skills/story-character-profile/SKILL.md` returns 0 matches (old phrasing eliminated).
5. `grep -n 'or other reason' .claude/skills/story-character-profile/SKILL.md` returns 0 matches in the regeneration_reason argument description (old broad phrasing eliminated; the phrase may appear in unrelated prose — confirm by inspection that no match falls within the `regeneration_reason` argument block).
6. `grep -nE 'source_world_char_material_change|durable_branch_transformation|profile_fidelity_failure|story_local_character_promotion|stable_source_material_omission_repair' .claude/skills/story-character-profile/SKILL.md` returns ≥5 matches.

### Invariants

1. STCHAR is durable story-local character authority — not a current-state packet, not a page summary, not a prose-rendering substitute.
2. Opening-page relevance is never the inclusion test for `source_kind: world_char` distillation.
3. The 5 named regeneration reasons are the only valid `regeneration_reason_class` values; ordinary state-record updates are not regeneration triggers without durable consolidation evidence.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n '## Durable-Authority Boundary\|### Stable Source Material Inventory' .claude/skills/story-character-profile/SKILL.md` (confirms both new sections present)
2. `grep -nE 'source_world_char_material_change|durable_branch_transformation|profile_fidelity_failure|story_local_character_promotion|stable_source_material_omission_repair' .claude/skills/story-character-profile/SKILL.md | wc -l` (confirms ≥5 mentions of the 5 valid reasons across regeneration_reason description + regenerate mode + Durable-Authority Boundary)
3. Manual inspection of the regeneration_reason argument block and the regenerate mode description to confirm the constrained-vocabulary phrasing is in place at both sites.
