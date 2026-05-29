# STCHARDOC-001: Document the single-exact-operational-section rule for STCHAR operational_home / target_section, and give explicit guidance for `cannot_be_swapped_out_because`

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/story-character-profile/SKILL.md`, `.claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md`; no validator/schema logic change in the recommended scope.
**Deps**: none

## Problem

At intake, authoring the three `world_char` STCHAR profiles for the `red-bunny` bootstrap produced 30 validator failures across two validators, all from one undocumented constraint plus one unaddressed field:

- `stchar_source_material_inventory_integrity.invalid_operational_home` (×27) — every Stable Source Material Inventory row whose `operational_home` cell was a compound (`"Stable Persona Core; Emotional Appraisal Map"`), parenthetical (`"Prose Rendering Constraints (Signature scene behaviors)"`), or abbreviation (`"Agency limits"`, `"Validation Anchors"`) failed, because the validator requires the cell to be **exactly one** of the 11 strings in `OPERATIONAL_TARGET_SECTIONS`.
- `stchar_source_fact_coverage.invalid_target_section` (×3) — the frontmatter `source_operational_fact_map` entry for the `cannot_be_swapped_out_because` dramatic_core field targeted `"Validation / Audit Anchors"` (a real H2 section, but not an *operational* one), which fails the same closed-set check.

Before this ticket, both constraints were correct and intentional, but **neither was stated in the authoring guidance**. The `story-character-profile` SKILL §Source Distillation documented the inventory columns, the disposition enum, and the `story_irrelevant` rationale categories, but did not say `operational_home` (and the frontmatter `target_section`) must be a single exact member of the closed operational-section list. And no surface told the author where the provenance-flavored `cannot_be_swapped_out_because` dramatic_core field should be dispositioned — it is the one `dramatic_core` field with no natural operational home, so authors reached for "Validation / Audit Anchors" (its semantically correct provenance home) and failed.

## Assumption Reassessment (2026-05-29)

1. **Codebase check.** Confirmed `tools/validators/src/structural/_stchar-operational-sections.ts` exports `OPERATIONAL_TARGET_SECTIONS` = exactly 11 H2 names (excludes `Source Distillation` and `Validation / Audit Anchors`). Confirmed `stchar-source-material-inventory-integrity.ts` fails any retained-disposition row whose `operationalHome` is not in that set and separately fails `"Source Distillation"`. Confirmed `stchar-source-fact-coverage.ts` fails any retained `source_operational_fact_map[].target_section` not in the same set (`invalid_target_section`). Historical intake evidence: the red-bunny STCHARs reproduced both failure classes before this ticket; applying single exact operational sections plus routing `cannot_be_swapped_out_because` to `Stable Persona Core` cleared all 30 and re-validated `status: pass`.
2. **Specs/docs check.** Before this ticket, `.claude/skills/story-character-profile/SKILL.md` §Source Distillation (Phase 3) listed the inventory columns and disposition enum but did not state the single-exact-operational-section rule for `operational_home`; Phase 4 frontmatter guidance showed a `source_operational_fact_map` example with `target_section: "Prose Rendering Constraints" | null` but did not enumerate the legal set or forbid compounds. `.claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md` (Phase 2 steps 2-4) inherited the same gap and added no `cannot_be_swapped_out_because` guidance.
3. **Shared boundary under audit.** The STCHAR `stchar.v1` body + frontmatter authoring contract, shared by `story-character-profile` (general-purpose author) and `branching-story-bootstrap` (inline distillation), validated by `stchar_source_material_inventory_integrity` and `stchar_source_fact_coverage` against the single `OPERATIONAL_TARGET_SECTIONS` source of truth.
4. **FOUNDATIONS principle under audit.** FOUNDATIONS §Story Bundles §6.1 (Story-Local Character Authority) and the Semantic Preservation Contract: every structured operational source fact must be copied/transformed/compressed/omitted-with-rationale/story-irrelevant, and retained facts must land in an operational STCHAR home (not audit/provenance prose). The validators enforce exactly this; the gap is that the authoring guidance does not teach the author the closed operational-section vocabulary or how to disposition the one non-operational `dramatic_core` field.
5. **Adjacent contradiction (classified as required-consequence vs follow-up).** A single source area can genuinely inform two operational sections (e.g., a wound that shapes both `Stable Persona Core` and `Emotional Appraisal Map`); the validator forces the author to name one home per row. Two resolutions exist: (A, recommended) document that authors pick the single primary operational home per row; (B, follow-up) enhance the validator to split a delimited `operational_home` (`"A; B"`) and accept it iff every segment is operational. (B) is a validator behavior change requiring its own ticket and is out of scope here. This ticket takes (A): teach the single-home discipline.
6. **Proof-surface check.** No runnable Claude skill dry-run is available in this Codex context. This implementation keeps the change prose-only and verifies it through manual contract review plus grep/list checks against `OPERATIONAL_TARGET_SECTIONS` and the edited authoring surfaces.

## Architecture Check

1. Documentation is the correct primary fix: the validators already encode the intended contract (closed operational-section set; provenance sections are non-operational by design), and the failures were purely an authoring-vocabulary gap. Surfacing the closed list, a correct/incorrect worked example, and an explicit `cannot_be_swapped_out_because` routing rule makes the constraint discoverable before submission instead of after a 30-failure dry-run.
2. No backwards-compatibility aliasing/shims introduced — no validator/schema behavior changes; existing valid STCHARs remain valid.

## Verification Layers

1. Authoring guidance requires inventory `operational_home` / frontmatter `target_section` as single exact operational sections -> manual contract review of the two edited skill surfaces.
2. Documented operational-section list matches code → codebase grep-proof (the section list quoted in the two docs equals `OPERATIONAL_TARGET_SECTIONS` in `_stchar-operational-sections.ts`).
3. `cannot_be_swapped_out_because` has a documented lawful disposition -> manual review (guidance names an operational home or a lawful omission disposition).

## Landed Changes

### 1. story-character-profile SKILL — Source Distillation + frontmatter guidance

In `.claude/skills/story-character-profile/SKILL.md`:
- The §Source Distillation Phase 3 description of the Stable Source Material Inventory now states that retained `operational_home` values must be **exactly one** operational STCHAR H2 section name, drawn from the closed 11-name list. It explicitly forbids compounds (`"A; B"`), parentheticals (`"X (Y)"`), abbreviations (`"Agency limits"`), and the two non-operational sections (`Source Distillation`, `Validation / Audit Anchors`), and includes a correct/incorrect example.
- The Phase 4 `source_operational_fact_map[].target_section` guidance now applies the same single-exact-operational-section rule.
- The `cannot_be_swapped_out_because` guidance now routes the retained field to `Stable Persona Core` with `compressed` or `transformed`, or allows lawful omission with rationale, and forbids targeting `Validation / Audit Anchors`.

### 2. Bootstrap Phase 2 reference

Mirrored the same two rules (single-exact-operational-section; `cannot_be_swapped_out_because` routing) into `.claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md` Phase 2 steps 3-5, so inline bootstrap distillation gets the guidance without re-reading the sibling skill.

## Files to Touch

- `.claude/skills/story-character-profile/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md` (modify)
- `archive/tickets/STCHARDOC-001.md` (modify)

## Out of Scope

- Changing `OPERATIONAL_TARGET_SECTIONS` or the two validators' logic.
- Validator enhancement to split/accept delimited compound `operational_home` values (Assumption Reassessment item 5, resolution B) — separate ticket if pursued.
- Any change to the STCHAR frontmatter JSON schema.

## Acceptance Criteria

### Tests That Must Pass

1. The two edited guidance surfaces state that retained inventory `operational_home` and frontmatter `target_section` values must be exactly one member of the 11-name operational-section set, with no compounds, parentheticals, abbreviations, `Source Distillation`, or `Validation / Audit Anchors`.
2. The 11-name list quoted in both docs is set-equal to `OPERATIONAL_TARGET_SECTIONS` in `tools/validators/src/structural/_stchar-operational-sections.ts`.
3. The documented `cannot_be_swapped_out_because` routing names `Stable Persona Core` as the normal retained operational home and also allows lawful omission with rationale instead of targeting `Validation / Audit Anchors`.

### Invariants

1. An author who follows the STCHAR authoring guidance literally never produces an `invalid_operational_home` or `invalid_target_section` failure.
2. The documented operational-section vocabulary never diverges from `OPERATIONAL_TARGET_SECTIONS`.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage (`stchar_source_material_inventory_integrity`, `stchar_source_fact_coverage` structural tests) is named in Assumption Reassessment.`

### Commands

1. `node -e '<section-list comparison script>'` — compare the 11 operational names in `tools/validators/src/structural/_stchar-operational-sections.ts` against the lists quoted in the two edited docs.
2. `rg -n 'cannot_be_swapped_out_because|operational_home|target_section|Source Distillation|Validation / Audit Anchors' .claude/skills/story-character-profile/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md` — inspect the edited guidance and confirm stale guidance was replaced.
3. A narrower command is correct because the change is prose-only; no runnable Claude skill dry-run exists in this Codex context, and the validators' closed-set behavior is already implemented.

## Outcome

Completed 2026-05-29. The two STCHAR authoring surfaces now document the single exact operational-section rule for retained `operational_home` and `source_operational_fact_map[].target_section` values, quote the same 11 operational sections enforced by `OPERATIONAL_TARGET_SECTIONS`, forbid compound / parenthetical / abbreviated / provenance-section targets, and give explicit `cannot_be_swapped_out_because` routing to `Stable Persona Core` or lawful omission with rationale.

## Verification Result

1. `node -e '<section-list comparison script>'` — PASS. Both edited docs include all 11 names from `tools/validators/src/structural/_stchar-operational-sections.ts`; no missing operational names were reported.
2. `rg -n 'cannot_be_swapped_out_because|operational_home|target_section|Stable Persona Core; Emotional Appraisal Map|Validation / Audit Anchors' .claude/skills/story-character-profile/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md` — PASS by manual review. The current hits show the new exact-section guidance, the explicit compound anti-example, and the `cannot_be_swapped_out_because` routing; remaining `Validation / Audit Anchors` hits are legitimate section names or explicit forbidden-target guidance.
3. `git diff --check` — PASS.

## Deviations

- Replaced the drafted skill dry-run / `validate-patch-plan` proof with manual contract review plus grep/list proof because no runnable Claude skill dry-run is available in this Codex context and the change is documentation-only.
