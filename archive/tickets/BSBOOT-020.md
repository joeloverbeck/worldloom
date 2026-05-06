# BSBOOT-020: Align downstream consumers with bootstrap Rule 4 sketch

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None - story-pipeline skill and report-template prose only.
**Deps**: `archive/tickets/BSBOOT-007.md`

## Problem

`BSBOOT-007` made `STORY_KERNEL.audited_thread_obligation_sketch` required for new bootstrap runs and made Phase 9 gate 2 compare Phase 5 THR/OBL records against that Phase 4 Rule 4 sketch.

At intake, two downstream story-pipeline consumers still omitted the new field:

- `storylet-pool-authoring` bootstrap seed mode accepted parent-supplied bootstrap context, but that context did not include `audited_thread_obligation_sketch`. Seed storylets could therefore be authored without seeing the exact THR/OBL branches that bootstrap gate 2 later treats as the Rule 4 anchor.
- `branching-story-health-audit` read `STORY_KERNEL.md`, but did not audit `audited_thread_obligation_sketch`. A new bootstrap bundle missing or drifting from the required sketch could pass health-audit pre-flight/coverage text silently.

`branching-story-page-cycle` and `story-fact-promotion-to-canon` were reviewed as named downstream consumers and do not need source changes for this ticket: page-cycle consumes runtime page state and `applied_event_ops`, while promotion consumes branch provenance and leaf `state_snapshot`/source records. Neither skill owns bootstrap-time Phase 4 sketch enforcement.

## Assumption Reassessment (2026-05-06)

1. `archive/tickets/BSBOOT-007.md` is completed and states that `audited_thread_obligation_sketch` is required for new bootstrap runs, while historical bundles without the field remain out of migration scope.
2. `docs/FOUNDATIONS.md` names the five story-pipeline skills in Skill Category 2c: `branching-story-bootstrap`, `branching-story-page-cycle`, `storylet-pool-authoring`, `branching-story-health-audit`, and `story-fact-promotion-to-canon`.
3. Cross-skill boundary under audit: `branching-story-bootstrap` produces `STORY_KERNEL.audited_thread_obligation_sketch`; `storylet-pool-authoring` consumes parent bootstrap context during `parent_skill_invocation: true` + `mode=seed`; `branching-story-health-audit` audits existing `STORY_KERNEL.md` bundles.
4. FOUNDATIONS principle under audit: Rule 4 (No Globalization by Accident) requires local claims and distribution/capability assumptions to remain scoped and audited. The bootstrap sketch is now the story-bundle's initial Rule 4 THR/OBL anchor.
5. `.claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md` lists bootstrap seed parent context as normalized premise/designing principle, bound STENT/STINT records, imported SFs, initial THRs/OBLs, whole-class M/INV loads, and loaded content_policy. It omits `audited_thread_obligation_sketch`.
6. `.claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` diagnoses bootstrap seed mode against initial THRs/OBLs, cast-bound STENT/STINT records, imported SFs, premise tone/themes, `mysteries_in_play[]`, and whole-class M/INV context. It omits the audited THR/OBL sketch now required by bootstrap gate 2.
7. `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` checks candidate SLT `fact_effects` and `relationship_effects` against INV `break_conditions`, but does not require bootstrap-seed SLT preconditions and obligation/thread targeting to remain compatible with the audited sketch.
8. `.claude/skills/branching-story-health-audit/SKILL.md` lists `STORY_KERNEL.md` fields consumed by the audit (`designing_principle`, `content_intensity_baseline`, `mysteries_in_play[]`, `invariants_acknowledged[]`, cast bind list), but omits `audited_thread_obligation_sketch`.
9. `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` consumes parent pages and records reachable from `parent_page.state_snapshot`; its Phase 9 gate 2 remains the runtime per-page `applied_event_ops` invariant audit. No bootstrap-sketch change is warranted there.
10. `.claude/skills/story-fact-promotion-to-canon/SKILL.md` consumes branch promotion provenance and source records for canon promotion; it does not own bootstrap-time THR/OBL sketch enforcement. No direct change is warranted there.
11. Adjacent contradiction classification: the stale `storylet-pool-authoring` and `branching-story-health-audit` omissions are required consequences of `BSBOOT-007` and are in scope here. Page-cycle/promotion are reviewed non-consumers and are out of scope unless implementation discovers text that incorrectly claims they consume every `STORY_KERNEL` field.
12. `docs/HARD-GATE-DISCIPLINE.md` was read during implementation because the patch touches story-pipeline HARD-GATE / Canon Safety Check prose. The landed health-audit change strengthens read-only pre-flight and finding classification; it does not weaken approval, write ordering, Mystery Reserve, or patch-plan semantics.

## Architecture Check

1. The clean end state keeps a single producer field (`STORY_KERNEL.audited_thread_obligation_sketch`) and teaches only the consumers that actually need that field to read or audit it. This avoids spreading bootstrap-only obligations into runtime page ticks or canon promotion.
2. No backwards-compatibility aliasing or shim fields are introduced. New bootstrap bundles require the sketch; old bundles without it are explicitly classified by health audit as legacy/out-of-migration-scope rather than silently rewritten.

## Verification Layers

1. Bootstrap seed parent context includes `audited_thread_obligation_sketch` -> codebase grep-proof.
2. Bootstrap-seed storylet checks reference the sketch as a Rule 4 guard for initial THR/OBL targeting and SLT preconditions -> manual review.
3. Health audit recognizes the sketch and distinguishes new-bundle missing/drift findings from legacy bundles -> manual review.
4. Page-cycle and promotion remain reviewed non-consumers, with no accidental bootstrap-sketch requirement added to their runtime/promotion flows -> manual review.
5. FOUNDATIONS Rule 4 alignment preserved -> FOUNDATIONS alignment check.

## Landed Changes

### 1. `storylet-pool-authoring` bootstrap seed context

Added `audited_thread_obligation_sketch` to the bootstrap seed parent-supplied context and Phase 1 diagnosis inputs. Phase 4/5 safety checks now require bootstrap-seed SLT preconditions, obligation targeting, thread targeting, and global-author-pool batch checks to remain compatible with the audited sketch when `parent_skill_invocation: true`, `mode=seed`, and `focus_area=bootstrap_mix`.

### 2. `branching-story-health-audit` sketch audit

Health audit now reads `STORY_KERNEL.audited_thread_obligation_sketch` and reports through a dedicated `bootstrap_rule4_sketch_integrity` finding category:

- `error` or `warning` for new bundles where the field is missing, empty, malformed, or materially mismatched against initial THR/OBL records.
- `info` or explicit legacy notation for historical bundles that predate `BSBOOT-007` and lack the field.

The audit still does not mutate `STORY_KERNEL.md`; it only reports the issue or emits manual/bootstrap-review guidance consistent with its read-only story-state contract. The report template now carries `story_kernel_sketch_status` so written SAU reports preserve the audit-time classification.

### 3. Reviewed non-consumers

No bootstrap-sketch requirements were added to `branching-story-page-cycle` or `story-fact-promotion-to-canon`.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md` (modify)
- `.claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` (modify)
- `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/templates/story-audit-report.md` (modify)

## Out of Scope

- Reopening `BSBOOT-007` or changing bootstrap's producer-side template/gates.
- Migrating existing story bundles.
- Adding a programmatic validator.
- Changing page-cycle's runtime `applied_event_ops` gate.
- Changing story-fact-promotion's canon-promotion flow.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE 'audited_thread_obligation_sketch' .claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` returns matches showing the bootstrap seed path consumes and checks the sketch.
2. `grep -nE 'audited_thread_obligation_sketch|legacy|BSBOOT-007' .claude/skills/branching-story-health-audit/SKILL.md` returns matches showing health audit reads the field and handles old bundles without false migration requirements.
3. `grep -nE 'bootstrap_rule4_sketch_integrity|story_kernel_sketch_status' .claude/skills/branching-story-health-audit/templates/story-audit-report.md .claude/skills/branching-story-health-audit/SKILL.md` returns matches showing the explicit health-audit finding/report surface.
4. Manual review confirms no new bootstrap-sketch requirement was added to `branching-story-page-cycle` or `story-fact-promotion-to-canon`.
5. FOUNDATIONS Rule 4 story-scope alignment is rechecked.
6. `git diff --check` passes.

### Invariants

1. New bootstrap bundles have one Rule 4 THR/OBL sketch producer and all relevant consumers name that same field.
2. Legacy bundles without the field are not silently migrated by audit or authoring skills.
3. Runtime page ticks and canon promotion remain governed by their own state/provenance contracts, not by bootstrap's Phase 4 sketch.

## Test Plan

### New/Modified Tests

1. None - documentation-only ticket; verification is command-based and existing skill/manual-review coverage is named in Assumption Reassessment.

### Commands

1. `grep -nE 'audited_thread_obligation_sketch' .claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md`
2. `grep -nE 'audited_thread_obligation_sketch|legacy|BSBOOT-007' .claude/skills/branching-story-health-audit/SKILL.md`
3. `grep -nE 'bootstrap_rule4_sketch_integrity|story_kernel_sketch_status' .claude/skills/branching-story-health-audit/templates/story-audit-report.md .claude/skills/branching-story-health-audit/SKILL.md`
4. `rg -n 'audited_thread_obligation_sketch' .claude/skills/branching-story-page-cycle .claude/skills/story-fact-promotion-to-canon`
5. `grep -nE 'Rule 4: No Globalization by Accident|story-scope branch isolation|Global author-pool storylets' docs/FOUNDATIONS.md`
6. `git diff --check`

## Outcome

Completed: 2026-05-06.

`storylet-pool-authoring` bootstrap seed mode now consumes the Phase 4 `audited_thread_obligation_sketch` and treats it as the Rule 4 boundary for diagnosis, candidate preconditions, OBL/THR targeting, and bootstrap-seed batch checks. `branching-story-health-audit` now reads the same field, classifies missing/malformed/drifted sketch state through `bootstrap_rule4_sketch_integrity`, records `story_kernel_sketch_status` in the audit report template, and keeps legacy pre-`BSBOOT-007` bundles as info-only/non-migration cases. `branching-story-page-cycle` and `story-fact-promotion-to-canon` remain non-consumers.

## Verification Result

Completed:

1. `grep -nE 'audited_thread_obligation_sketch' .claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` — pass; matches in all three storylet references.
2. `grep -nE 'audited_thread_obligation_sketch|legacy|BSBOOT-007' .claude/skills/branching-story-health-audit/SKILL.md` — pass; health audit reads the field and distinguishes explicit pre-`BSBOOT-007` legacy bundles.
3. `grep -nE 'bootstrap_rule4_sketch_integrity|story_kernel_sketch_status' .claude/skills/branching-story-health-audit/templates/story-audit-report.md .claude/skills/branching-story-health-audit/SKILL.md` — pass; health audit and the SAU template expose the explicit finding/report surface.
4. `rg -n 'audited_thread_obligation_sketch' .claude/skills/branching-story-page-cycle .claude/skills/story-fact-promotion-to-canon` — pass; no matches, confirming no new bootstrap-sketch requirement was added to the reviewed non-consumers.
5. `grep -nE 'Rule 4: No Globalization by Accident|story-scope branch isolation|Global author-pool storylets' docs/FOUNDATIONS.md` — pass; FOUNDATIONS Rule 4 story-scope basis rechecked.
6. `git diff --check` — pass.

## Deviations

The ticket's optional report-template edit became required because `branching-story-health-audit` needed an explicit `bootstrap_rule4_sketch_integrity` category and `story_kernel_sketch_status` report field to preserve the new read-only audit classification. `docs/HARD-GATE-DISCIPLINE.md` was read during implementation because the landed prose touches HARD-GATE / Canon Safety Check surfaces, but no patch-plan, approval-token, submit, write-order, or Mystery Reserve behavior changed.
