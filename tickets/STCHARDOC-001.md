# STCHARDOC-001: Document the single-exact-operational-section rule for STCHAR operational_home / target_section, and give explicit guidance for `cannot_be_swapped_out_because`

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/story-character-profile/SKILL.md`, `.claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md`; no validator/schema logic change in the recommended scope.
**Deps**: none

## Problem

Authoring the three `world_char` STCHAR profiles for the `red-bunny` bootstrap produced 30 validator failures across two validators, all from one undocumented constraint plus one unaddressed field:

- `stchar_source_material_inventory_integrity.invalid_operational_home` (×27) — every Stable Source Material Inventory row whose `operational_home` cell was a compound (`"Stable Persona Core; Emotional Appraisal Map"`), parenthetical (`"Prose Rendering Constraints (Signature scene behaviors)"`), or abbreviation (`"Agency limits"`, `"Validation Anchors"`) failed, because the validator requires the cell to be **exactly one** of the 11 strings in `OPERATIONAL_TARGET_SECTIONS`.
- `stchar_source_fact_coverage.invalid_target_section` (×3) — the frontmatter `source_operational_fact_map` entry for the `cannot_be_swapped_out_because` dramatic_core field targeted `"Validation / Audit Anchors"` (a real H2 section, but not an *operational* one), which fails the same closed-set check.

Both constraints are correct and intentional, but **neither is stated in the authoring guidance**. The `story-character-profile` SKILL §Source Distillation documents the inventory columns, the disposition enum, and the `story_irrelevant` rationale categories, but never says `operational_home` (and the frontmatter `target_section`) must be a single exact member of the closed operational-section list. And no surface tells the author where the provenance-flavored `cannot_be_swapped_out_because` dramatic_core field should be dispositioned — it is the one `dramatic_core` field with no natural operational home, so authors reach for "Validation / Audit Anchors" (its semantically correct provenance home) and fail.

## Assumption Reassessment (2026-05-29)

1. **Codebase check.** Confirmed `tools/validators/src/structural/_stchar-operational-sections.ts` exports `OPERATIONAL_TARGET_SECTIONS` = exactly 11 H2 names (excludes `Source Distillation` and `Validation / Audit Anchors`). Confirmed `stchar-source-material-inventory-integrity.ts:157-165` fails any retained-disposition row whose `operationalHome` is not in that set, and `:149-156` separately fails `"Source Distillation"`. Confirmed `stchar-source-fact-coverage.ts:233-237` fails any retained `source_operational_fact_map[].target_section` not in the same set (`invalid_target_section`). Reproduced both against the red-bunny STCHARs; the fix (single exact operational sections + routing `cannot_be_swapped_out_because` to `Stable Persona Core`) cleared all 30 and re-validated `status: pass`.
2. **Specs/docs check.** `.claude/skills/story-character-profile/SKILL.md` §Source Distillation (Phase 3) lists the inventory columns and disposition enum but does not state the single-exact-operational-section rule for `operational_home`; Phase 4 frontmatter guidance shows a `source_operational_fact_map` example with `target_section: "Prose Rendering Constraints" | null` but does not enumerate the legal set or forbid compounds. `.claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md` (Phase 2 steps 2-4) inherits the same gap and adds no `cannot_be_swapped_out_because` guidance.
3. **Shared boundary under audit.** The STCHAR `stchar.v1` body + frontmatter authoring contract, shared by `story-character-profile` (general-purpose author) and `branching-story-bootstrap` (inline distillation), validated by `stchar_source_material_inventory_integrity` and `stchar_source_fact_coverage` against the single `OPERATIONAL_TARGET_SECTIONS` source of truth.
4. **FOUNDATIONS principle under audit.** FOUNDATIONS §Story Bundles §6.1 (Story-Local Character Authority) and the Semantic Preservation Contract: every structured operational source fact must be copied/transformed/compressed/omitted-with-rationale/story-irrelevant, and retained facts must land in an operational STCHAR home (not audit/provenance prose). The validators enforce exactly this; the gap is that the authoring guidance does not teach the author the closed operational-section vocabulary or how to disposition the one non-operational `dramatic_core` field.
5. **Adjacent contradiction (classified as required-consequence vs follow-up).** A single source area can genuinely inform two operational sections (e.g., a wound that shapes both `Stable Persona Core` and `Emotional Appraisal Map`); the validator forces the author to name one home per row. Two resolutions exist: (A, recommended) document that authors pick the single primary operational home per row; (B, follow-up) enhance the validator to split a delimited `operational_home` (`"A; B"`) and accept it iff every segment is operational. (B) is a validator behavior change requiring its own ticket and is out of scope here. This ticket takes (A): teach the single-home discipline.

## Architecture Check

1. Documentation is the correct primary fix: the validators already encode the intended contract (closed operational-section set; provenance sections are non-operational by design), and the failures were purely an authoring-vocabulary gap. Surfacing the closed list, a correct/incorrect worked example, and an explicit `cannot_be_swapped_out_because` routing rule makes the constraint discoverable before submission instead of after a 30-failure dry-run.
2. No backwards-compatibility aliasing/shims introduced — no validator/schema behavior changes; existing valid STCHARs remain valid.

## Verification Layers

1. Author writes inventory `operational_home` / frontmatter `target_section` as single exact operational sections → skill dry-run (`story-character-profile` or `branching-story-bootstrap` STCHAR) → `validate-patch-plan` returns zero `stchar_source_material_inventory_integrity.invalid_operational_home` and zero `stchar_source_fact_coverage.invalid_target_section`.
2. Documented operational-section list matches code → codebase grep-proof (the section list quoted in the two docs equals `OPERATIONAL_TARGET_SECTIONS` in `_stchar-operational-sections.ts`).
3. `cannot_be_swapped_out_because` has a documented lawful disposition → manual review (guidance names an operational home or a lawful omission disposition) + skill dry-run (a profile following the guidance passes both validators).

## What to Change

### 1. story-character-profile SKILL — Source Distillation + frontmatter guidance

In `.claude/skills/story-character-profile/SKILL.md`:
- In the §Source Distillation Phase 3 description of the Stable Source Material Inventory, state that `operational_home` must be **exactly one** operational STCHAR H2 section name, drawn from the closed list (quote the 11: Story-Facing Identity, Stable Persona Core, Emotional Appraisal Map, Pressure Behavior, Voice Bible / Dialogue Authority, Page-Plan Voice Block, Perception and Embodiment, Agency and Planning Tendencies, Relationship-Specific Behavior, Story-State Derivation Guide, Prose Rendering Constraints). Explicitly forbid compounds (`"A; B"`), parentheticals (`"X (Y)"`), abbreviations (`"Agency limits"`), and the two non-operational sections (`Source Distillation`, `Validation / Audit Anchors`). Add a one-line correct/incorrect example.
- Apply the same single-exact-operational-section rule to the Phase 4 `source_operational_fact_map[].target_section` guidance.
- Add an explicit routing rule for `cannot_be_swapped_out_because`: it is a provenance/irreplaceability statement with no native operational home, so disposition it `compressed` (or `transformed`) into `Stable Persona Core` (where the world-grounding it summarizes already lives), or omit it with a lawful rationale — never target `Validation / Audit Anchors`.

### 2. Bootstrap Phase 2 reference

Mirror the same two rules (single-exact-operational-section; `cannot_be_swapped_out_because` routing) into `.claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md` Phase 2 steps 2-4, so inline bootstrap distillation gets the guidance without re-reading the sibling skill.

## Files to Touch

- `.claude/skills/story-character-profile/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md` (modify)

## Out of Scope

- Changing `OPERATIONAL_TARGET_SECTIONS` or the two validators' logic.
- Validator enhancement to split/accept delimited compound `operational_home` values (Assumption Reassessment item 5, resolution B) — separate ticket if pursued.
- Any change to the STCHAR frontmatter JSON schema.

## Acceptance Criteria

### Tests That Must Pass

1. A `world_char` STCHAR authored per the updated guidance (single exact operational homes; `cannot_be_swapped_out_because` → `Stable Persona Core`) validates with zero `stchar_source_material_inventory_integrity.*` and zero `stchar_source_fact_coverage.invalid_target_section` verdicts via `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan.json>`.
2. The 11-name list quoted in both docs is set-equal to `OPERATIONAL_TARGET_SECTIONS` in `tools/validators/src/structural/_stchar-operational-sections.ts`.
3. Following the documented `cannot_be_swapped_out_because` routing produces a profile that passes `stchar_source_fact_coverage`.

### Invariants

1. An author who follows the STCHAR authoring guidance literally never produces an `invalid_operational_home` or `invalid_target_section` failure.
2. The documented operational-section vocabulary never diverges from `OPERATIONAL_TARGET_SECTIONS`.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage (`stchar_source_material_inventory_integrity`, `stchar_source_fact_coverage` structural tests) is named in Assumption Reassessment.`

### Commands

1. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/<stchar-plan>.json` — confirm zero inventory/coverage failures on a guidance-conformant profile.
2. `grep -n "" tools/validators/src/structural/_stchar-operational-sections.ts` then diff the 11 names against the lists quoted in the two edited docs.
3. A narrower command is correct because the change is prose-only; the validator binary is the authority and is exercised directly in command 1.
