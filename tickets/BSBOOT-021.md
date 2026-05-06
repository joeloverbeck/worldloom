# BSBOOT-021: Propagate `reader_visibility_basis` to downstream story consumers

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — downstream story-skill contract prose only (`branching-story-page-cycle`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, `storylet-pool-authoring`). No JSON-schema, validator, or patch-engine code change.
**Deps**: archive/tickets/BSBOOT-010.md

## Problem

`archive/tickets/BSBOOT-010.md` changed the bootstrap SF default to `visible_to_reader: false` and introduced `reader_visibility_basis` so an objective-but-secret SF does not accidentally enter `reader_known_facts`. That landed the bootstrap import contract and one page-cycle record-schema note, but several downstream consumers still treat reader visibility as either a bare boolean or an incidental state-snapshot membership list.

The gap is forward-looking but real: runtime page-cycle turns can create new SFs through `fact_create`; storylet-pool-authoring can propose `fact_effects.fact_template` shapes; health-audit treats `reader_known_facts` as a clean prose-grounding source; and story-fact-promotion-to-canon extracts SF fields for promotion without carrying the reader-visibility provenance. If those surfaces do not explicitly preserve the new basis discipline, future runtime-created facts can recreate the same accidental dramatic-irony leak BSBOOT-010 fixed for bootstrap-created facts.

## Assumption Reassessment (2026-05-06)

1. `archive/tickets/BSBOOT-010.md` completed the bootstrap-side contract: SF defaults to `visible_to_reader: false`, `reader_visibility_basis: unrevealed_objective_truth`, and `reader_known_facts` remains "SF ids with `visible_to_reader: true`."
2. `.claude/skills/branching-story-page-cycle/references/record-schemas.md` now notes that `reader_known_facts` entries carry a positive basis, but `.claude/skills/branching-story-page-cycle/references/phase-2-3-impact-and-feasibility.md` only models `facts_created: [SF-template, ...]`, and `.claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md` describes `fact_create` snapshot updates without stating `visible_to_reader` / `reader_visibility_basis` creation discipline.
3. Cross-skill / cross-artifact boundary: the shared contract is story-local SF reader visibility, produced by bootstrap, page-cycle structured ops, and storylet fact templates; consumed by page-cycle state snapshots, health-audit prose grounding, and story-fact promotion source extraction.
4. FOUNDATIONS principle: this remains Rule-7-adjacent Mystery Reserve preservation and Rule 1 No Floating Facts discipline. The change must not weaken mystery-firewall gates or promote reader knowledge into character/world knowledge; it only makes the reader-visible path auditable.
5. `storylet-pool-authoring/templates/storylet-record.yaml` says `fact_effects` carry `fact_template` and only comments that `fact_template includes epistemic_class`; the Phase 3 drafting reference says the engine generates `fact_template` machinery but does not require `visible_to_reader` or `reader_visibility_basis`.
6. `branching-story-health-audit` currently allows grounded offstage references when grounded in `reader_known_facts`, but does not verify that the cited SF has `visible_to_reader: true` with a positive non-`unrevealed_objective_truth` basis. Its report template repeats the same anchor list without the basis check.
7. `story-fact-promotion-to-canon` Phase 1 loads SF fields including `known_by`, `believed_by`, `derived_from_cf`, `canon_relation`, and `evidence`, but omits `visible_to_reader` and `reader_visibility_basis`. Promotion does not need to make reader visibility world canon, but it should preserve the source-provenance distinction so a reader-only reveal is not mistaken for diegetic spread during scope-inflation and downstream-impact review.
8. Existing `tickets/BSBOOT-015.md` owns a bootstrap-specific strict validator and already references `SF.reader_visibility_basis`; it does not own runtime page-cycle SF creation, health-audit prose-grounding classification, story-fact promotion extraction, or storylet-pool fact-template drafting. This ticket is not duplicate work.

## Architecture Check

1. Cleaner contract: define `reader_visibility_basis` once as a story-local SF provenance field and require every producer/consumer to preserve the same meaning, rather than leaving each downstream skill to infer reader visibility from a boolean or a state-snapshot list.
2. No backwards-compatibility aliasing/shims introduced. Existing SF records remain valid under permissive schemas; this is forward discipline for future emitted records and audits.

## Verification Layers

1. Page-cycle runtime SF creation defaults and state-snapshot integrity mention `reader_visibility_basis` -> codebase grep-proof plus manual review.
2. Storylet-pool fact templates require the field when creating reader-visible SFs -> codebase grep-proof plus manual review.
3. Health-audit prose-ledger and report guidance checks positive basis for `reader_known_facts` grounding -> codebase grep-proof plus manual review.
4. Story-fact-promotion source extraction carries reader visibility provenance without laundering it into world-canon knowledge -> codebase grep-proof plus FOUNDATIONS alignment review.
5. BSBOOT-015 remains the bootstrap-specific validator owner -> manual review; no duplicate ticket created for its owned bootstrap check.

## What to Change

### 1. `.claude/skills/branching-story-page-cycle`

- In `references/phase-2-3-impact-and-feasibility.md`, expand `facts_created: [SF-template, ...]` to state that every SF-template carries `visible_to_reader` and `reader_visibility_basis`, defaulting to `false` / `unrevealed_objective_truth`.
- In `references/phase-5-state-mutation.md`, update the `fact_create` snapshot rule: add new SFs to `reader_known_facts` only when `visible_to_reader: true` and `reader_visibility_basis` is one of `shown_in_pg0001`, `known_to_pov`, `dramatic_irony`, or `diegetic_artifact_visible`.
- In `references/phase-9-validation-gates.md`, extend the state-snapshot integrity or epistemic-class-declared gate prose so a `reader_known_facts` entry without a positive basis fails validation.

### 2. `.claude/skills/storylet-pool-authoring`

- In `templates/storylet-record.yaml`, make `fact_effects[].fact_template` guidance include `visible_to_reader` and `reader_visibility_basis`.
- In `references/phase-3-structured-drafting.md`, instruct generated fact templates to default to `visible_to_reader: false` / `reader_visibility_basis: unrevealed_objective_truth` unless the storylet deliberately creates a reader-facing reveal.
- In `references/phase-4-5-canon-safety-checks.md`, add a Rule 1 / Rule 7 check that any `fact_effects` entry with `visible_to_reader: true` uses a positive basis and not `unrevealed_objective_truth`.

### 3. `.claude/skills/branching-story-health-audit`

- In `SKILL.md` Phase 3 prose-ledger consistency, refine `reader_known_facts` grounding: a reference is clean only when the cited SF is in `reader_known_facts`, has `visible_to_reader: true`, and carries a positive `reader_visibility_basis`.
- Add an audit finding rule for malformed reader-visible SFs: `visible_to_reader: true` with missing basis, `unrevealed_objective_truth`, or absence from `reader_known_facts` when page prose relies on it.
- In `templates/story-audit-report.md`, update the `prose_ledger_consistency` finding guidance to include the missing/invalid `reader_visibility_basis` when reader-known grounding is the issue.

### 4. `.claude/skills/story-fact-promotion-to-canon/SKILL.md`

- In Phase 1 `source_kind == story_fact`, load `visible_to_reader` and `reader_visibility_basis` alongside the existing SF fields.
- In Phase 3 scope-inflation checks, clarify that `reader_visibility_basis` is story-reader provenance, not evidence of diegetic spread; `known_by` / evidence / supporting prose still determine whether the promoted CF is believed, disputed, or objective at world scope.
- In Phase 6 proposal package guidance, carry the source SF's reader-visibility provenance in the SP / proposal provenance trail so reviewers can distinguish deliberate dramatic irony from in-world knowledge.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/phase-2-3-impact-and-feasibility.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (modify)
- `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (modify)
- `.claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` (modify)
- `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/templates/story-audit-report.md` (modify)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)
- `tickets/BSBOOT-021.md` (closeout)

## Out of Scope

- Editing bootstrap's SF template or Phase 3 import rules; BSBOOT-010 already landed that.
- Implementing JSON-schema enforcement for `reader_visibility_basis`.
- Migrating existing story bundles or story-local SF records.
- Changing the semantics of `reader_known_facts`; it remains "SF ids with `visible_to_reader: true`."
- Expanding BSBOOT-015 beyond bootstrap-specific strict validation.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "reader_visibility_basis|visible_to_reader" .claude/skills/branching-story-page-cycle/references/phase-2-3-impact-and-feasibility.md .claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` shows runtime SF creation and validation discipline.
2. `rg -n "reader_visibility_basis|visible_to_reader" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml .claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` shows fact-template drafting and safety checks.
3. `rg -n "reader_visibility_basis|reader_known_facts" .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md` shows audit/report classification of invalid reader-known grounding.
4. `rg -n "reader_visibility_basis|visible_to_reader" .claude/skills/story-fact-promotion-to-canon/SKILL.md` shows source extraction and promotion-provenance handling.
5. `git diff --check` passes.

### Invariants

1. `visible_to_reader: true` on an SF requires a positive `reader_visibility_basis` in every future producer.
2. `unrevealed_objective_truth` is valid only with `visible_to_reader: false`.
3. `reader_visibility_basis` never substitutes for `known_by` or world-canon evidence during story-fact promotion.
4. Health-audit does not treat a bare `reader_known_facts` id as clean grounding when the SF basis is missing or invalid.

## Test Plan

### New/Modified Tests

1. None — documentation-only downstream contract ticket; verification is grep/manual-review based.

### Commands

1. `rg -n "reader_visibility_basis|visible_to_reader" .claude/skills/branching-story-page-cycle/references/phase-2-3-impact-and-feasibility.md .claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md`
2. `rg -n "reader_visibility_basis|visible_to_reader" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml .claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md`
3. `rg -n "reader_visibility_basis|reader_known_facts" .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md`
4. `rg -n "reader_visibility_basis|visible_to_reader" .claude/skills/story-fact-promotion-to-canon/SKILL.md`
5. `git diff --check`
