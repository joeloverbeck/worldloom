# BSBOOT-021: Propagate `reader_visibility_basis` to downstream story consumers

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — downstream story-skill contract prose only (`branching-story-page-cycle`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, `storylet-pool-authoring`). No JSON-schema, validator, or patch-engine code change.
**Deps**: archive/tickets/BSBOOT-010.md

## Problem

At intake, `archive/tickets/BSBOOT-010.md` had changed the bootstrap SF default to `visible_to_reader: false` and introduced `reader_visibility_basis` so an objective-but-secret SF does not accidentally enter `reader_known_facts`. That landed the bootstrap import contract and one page-cycle record-schema note, but several downstream consumers still treated reader visibility as either a bare boolean or an incidental state-snapshot membership list.

Before this ticket, the gap was forward-looking but real: runtime page-cycle turns can create new SFs through `fact_create`; storylet-pool-authoring can propose `fact_effects.fact_template` shapes; health-audit treated `reader_known_facts` as a clean prose-grounding source; and story-fact-promotion-to-canon extracted SF fields for promotion without carrying the reader-visibility provenance. Those surfaces now explicitly preserve the new basis discipline so future runtime-created facts do not recreate the accidental dramatic-irony leak BSBOOT-010 fixed for bootstrap-created facts.

## Assumption Reassessment (2026-05-06)

1. `archive/tickets/BSBOOT-010.md` completed the bootstrap-side contract: SF defaults to `visible_to_reader: false`, `reader_visibility_basis: unrevealed_objective_truth`, and `reader_known_facts` remains "SF ids with `visible_to_reader: true`."
2. At intake, `.claude/skills/branching-story-page-cycle/references/record-schemas.md` noted that `reader_known_facts` entries carry a positive basis, but `.claude/skills/branching-story-page-cycle/references/phase-2-3-impact-and-feasibility.md` only modeled `facts_created: [SF-template, ...]`, and `.claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md` described `fact_create` snapshot updates without stating `visible_to_reader` / `reader_visibility_basis` creation discipline.
3. Cross-skill / cross-artifact boundary: the shared contract is story-local SF reader visibility, produced by bootstrap, page-cycle structured ops, and storylet fact templates; consumed by page-cycle state snapshots, health-audit prose grounding, and story-fact promotion source extraction.
4. FOUNDATIONS principle: this remains Rule-7-adjacent Mystery Reserve preservation and Rule 1 No Floating Facts discipline. The change must not weaken mystery-firewall gates or promote reader knowledge into character/world knowledge; it only makes the reader-visible path auditable.
5. At intake, `storylet-pool-authoring/templates/storylet-record.yaml` said `fact_effects` carry `fact_template` and only commented that `fact_template includes epistemic_class`; the Phase 3 drafting reference said the engine generates `fact_template` machinery but did not require `visible_to_reader` or `reader_visibility_basis`.
6. At intake, `branching-story-health-audit` allowed grounded offstage references when grounded in `reader_known_facts`, but did not verify that the cited SF had `visible_to_reader: true` with a positive non-`unrevealed_objective_truth` basis. Its report template repeated the same anchor list without the basis check.
7. At intake, `story-fact-promotion-to-canon` Phase 1 loaded SF fields including `known_by`, `believed_by`, `derived_from_cf`, `canon_relation`, and `evidence`, but omitted `visible_to_reader` and `reader_visibility_basis`. Promotion does not need to make reader visibility world canon, but this ticket preserves the source-provenance distinction so a reader-only reveal is not mistaken for diegetic spread during scope-inflation and downstream-impact review.
8. Existing `tickets/BSBOOT-015.md` owns a bootstrap-specific strict validator and already references `SF.reader_visibility_basis`; it does not own runtime page-cycle SF creation, health-audit prose-grounding classification, story-fact promotion extraction, or storylet-pool fact-template drafting. This ticket is not duplicate work.
9. Reassessment absorbed two same-seam `branching-story-health-audit` surfaces before source edits: `templates/remediation-storylet-proposal-card.md` mirrors storylet-pool-authoring's audit-mode consumer schema and comments that `sketch.fact_effects` carry `fact_template`, and `examples/sau-mixed-severity.md` repeats the old reader-known grounding shape with a DA record incorrectly described as living in `reader_known_facts`. Both are downstream consumer-contract prose, not separate behavior.
10. `docs/HARD-GATE-DISCIPLINE.md` was read because this ticket edits content-skill Phase 9 validation-gate prose. The change tightens reader-visibility validation expectations and does not weaken approval, patch-plan, Mystery Reserve, or canon-write hard gates.

## Architecture Check

1. Cleaner contract: define `reader_visibility_basis` once as a story-local SF provenance field and require every producer/consumer to preserve the same meaning, rather than leaving each downstream skill to infer reader visibility from a boolean or a state-snapshot list.
2. No backwards-compatibility aliasing/shims introduced. Existing SF records remain valid under permissive schemas; this is forward discipline for future emitted records and audits.

## Verification Layers

1. Page-cycle runtime SF creation defaults and state-snapshot integrity mention `reader_visibility_basis` -> codebase grep-proof plus manual review.
2. Storylet-pool fact templates require the field when creating reader-visible SFs -> codebase grep-proof plus manual review.
3. Health-audit prose-ledger and report guidance checks positive basis for `reader_known_facts` grounding -> codebase grep-proof plus manual review.
4. Story-fact-promotion source extraction carries reader visibility provenance without laundering it into world-canon knowledge -> codebase grep-proof plus FOUNDATIONS alignment review.
5. BSBOOT-015 remains the bootstrap-specific validator owner -> manual review; no duplicate ticket created for its owned bootstrap check.

## Landed Changes

### 1. `.claude/skills/branching-story-page-cycle`

- `references/phase-2-3-impact-and-feasibility.md` now states every created SF template carries `visible_to_reader` and `reader_visibility_basis`, defaulting to `false` / `unrevealed_objective_truth`.
- `references/phase-5-state-mutation.md` now adds new SFs to `reader_known_facts` only when `visible_to_reader: true` and `reader_visibility_basis` is one of `shown_in_pg0001`, `known_to_pov`, `dramatic_irony`, or `diegetic_artifact_visible`.
- `references/phase-9-validation-gates.md` now makes malformed `reader_known_facts` basis state a state-snapshot / SF-declaration validation failure.

### 2. `.claude/skills/storylet-pool-authoring`

- `templates/storylet-record.yaml` now documents `fact_effects[].fact_template` reader-visibility fields.
- `references/phase-3-structured-drafting.md` now defaults generated fact templates to `visible_to_reader: false` / `reader_visibility_basis: unrevealed_objective_truth` unless the storylet deliberately creates a reader-facing reveal.
- `references/phase-4-5-canon-safety-checks.md` now checks created fact templates for positive reader-visibility basis when `visible_to_reader: true`.

### 3. `.claude/skills/branching-story-health-audit`

- `SKILL.md` Phase 3 prose-ledger consistency now treats `reader_known_facts` grounding as clean only when the cited SF is reader-visible with a positive basis, and emits findings for malformed reader-visible SF grounding.
- `templates/story-audit-report.md` now requires prose-ledger findings to include missing/invalid `visible_to_reader` / `reader_visibility_basis` details when reader-known grounding is the issue.
- `templates/remediation-storylet-proposal-card.md` now preserves reader-visibility basis expectations in RSP `sketch.fact_effects` guidance.
- `examples/sau-mixed-severity.md` now keeps DA content separate from SF-only `reader_known_facts` and names the positive-basis requirement for reader-known SFs.

### 4. `.claude/skills/story-fact-promotion-to-canon/SKILL.md`

- Phase 1 `source_kind == story_fact` now loads `visible_to_reader` and `reader_visibility_basis` alongside the existing SF fields.
- Phase 3 scope-inflation checks now clarify that `reader_visibility_basis` is story-reader provenance, not evidence of diegetic spread; `known_by` / evidence / supporting prose still determine whether the promoted CF is believed, disputed, or objective at world scope.
- Phase 6 proposal package guidance now carries the source SF's reader-visibility provenance in the proposal provenance trail so reviewers can distinguish deliberate dramatic irony from in-world knowledge.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/phase-2-3-impact-and-feasibility.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (modify)
- `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (modify)
- `.claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` (modify)
- `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/templates/story-audit-report.md` (modify)
- `.claude/skills/branching-story-health-audit/templates/remediation-storylet-proposal-card.md` (modify)
- `.claude/skills/branching-story-health-audit/examples/sau-mixed-severity.md` (modify)
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
3. `rg -n "reader_visibility_basis|reader_known_facts" .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md .claude/skills/branching-story-health-audit/templates/remediation-storylet-proposal-card.md .claude/skills/branching-story-health-audit/examples/sau-mixed-severity.md` shows audit/report/RSP/example classification of invalid reader-known grounding.
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
3. `rg -n "reader_visibility_basis|reader_known_facts" .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md .claude/skills/branching-story-health-audit/templates/remediation-storylet-proposal-card.md .claude/skills/branching-story-health-audit/examples/sau-mixed-severity.md`
4. `rg -n "reader_visibility_basis|visible_to_reader" .claude/skills/story-fact-promotion-to-canon/SKILL.md`
5. `git diff --check`

## Outcome

Completion date: 2026-05-06.

Completed. The downstream story-skill contract now carries `reader_visibility_basis` discipline through page-cycle runtime SF creation, storylet fact-template authoring, health-audit prose grounding and RSP examples, and story-fact promotion provenance. The change remains prose/template-only; no JSON schema, validator, patch-engine code, bootstrap template, or existing story bundle was changed.

## Verification Result

1. `rg -n "reader_visibility_basis|visible_to_reader" .claude/skills/branching-story-page-cycle/references/phase-2-3-impact-and-feasibility.md .claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` — passed; returned the page-cycle SF-template defaults, `fact_create` reader-known update rule, and Phase 9 validation-gate checks.
2. `rg -n "reader_visibility_basis|visible_to_reader" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml .claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` — passed; returned storylet fact-template defaults, engine-wrap handling, and Rule 1 / Rule 7 schema-completeness guidance.
3. `rg -n "reader_visibility_basis|reader_known_facts" .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md .claude/skills/branching-story-health-audit/templates/remediation-storylet-proposal-card.md .claude/skills/branching-story-health-audit/examples/sau-mixed-severity.md` — passed; returned health-audit prose-ledger checks, report finding guidance, RSP fact-template guidance, and the corrected example.
4. `rg -n "reader_visibility_basis|visible_to_reader" .claude/skills/story-fact-promotion-to-canon/SKILL.md` — passed; returned story-fact source extraction, scope-inflation firewall guidance, and proposal provenance handling.
5. Manual review against `docs/FOUNDATIONS.md` and `docs/HARD-GATE-DISCIPLINE.md` — passed; the change preserves Rule 1 / Rule 7 discipline and only tightens validation/audit prose. It does not alter approval-token behavior, patch-plan validation/submission, canon-write ordering, or Mystery Reserve hard gates.
6. `git diff --check` — passed.

## Deviations

Reassessment absorbed two same-seam health-audit files not listed in the initial ticket draft: `templates/remediation-storylet-proposal-card.md` and `examples/sau-mixed-severity.md`. Both were reader-visibility consumer/producer contract prose. No archival was performed because this run was an implementation-only request.
