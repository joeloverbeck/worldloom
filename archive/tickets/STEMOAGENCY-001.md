# STEMOAGENCY-001: Replace `non_propagation_facts` escape hatch in `stemo_agency_effect_compatibility` with downstream-grounding evidence

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/stemo-agency-effect-compatibility.ts`, `tools/validators/src/structural/stemo-utils.ts`, `tools/validators/tests/structural/stemo-agency-effect-compatibility.test.ts`, `tools/validators/tests/structural/stemo-helpers.ts`, `tools/validators/tests/integration/validate-patch-plan.test.ts`, plus `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md`, `.claude/skills/branching-story-bootstrap/SKILL.md`, and `.claude/skills/branching-story-bootstrap/references/phase-5-debts-and-optional-seeds.md` workflow notes; no schema rename, no patch-engine op change, no shared-template `_shared-templates/story-record-schemas.md` change. No backwards-compat shim path.
**Deps**: None (the recently landed `stemo_supersession_lifecycle_valid` parent-page fix is orthogonal; both fixes are independent.)

## Problem

At intake, `stemo_agency_effect_compatibility` (`tools/validators/src/structural/stemo-agency-effect-compatibility.ts`) failed any STEMO record with `agency_effect: constraining` unless one of:

- the holder's active `STSTAT.agency` is in the closed set `{constrained, coerced}` (`COMPATIBLE_AGENCY` in `tools/validators/src/structural/stemo-utils.ts:41`), OR
- the same-event `SE.state_relations[]` or `SE.non_propagation_facts[]` is non-empty (`sameEventExplainsConstrainedAgency` in `tools/validators/src/structural/stemo-utils.ts:338`).

That forced an undocumented authoring pattern observed in `worlds/erotica-world/stories/red-bunny/_source/events/SE-1.yaml`: emit a placeholder `non_propagation_facts: [{reason: event_leaves_no_accessible_trace, group: direct_witnesses, records: []}]` whenever a STEMO with `agency_effect: constraining` is created on a holder whose `STSTAT.agency` is `free`. The same pattern was required during the 2026-05-25 red-bunny PG-2 turn-cycle for `STEMO-5` (defensive entry with `records: [STENT-1]`).

Two semantic problems:

1. **Field-mismatch hack.** `non_propagation_facts[]` is FOUNDATIONS §Story Bundles §5a.2 / §5a.3 territory — it documents *witness propagation absence* for the `expected_witness_coverage` validator. Using it as the receipt for "this emotion constrains agency" couples two unrelated concerns through the same field. A reader of an SE that carries a defensive `non_propagation_facts` entry cannot tell whether the entry exists for witness-coverage purposes or for STEMO-receipt purposes.

2. **Wrong validator question.** `STSTAT.agency` is external freedom (captive, incapacitated, unconscious, dead — see `tools/validators/src/schemas/story-page.schema.json` `entity_status.agency` enum). `STEMO.agency_effect: constraining` is an *internal* affective claim: the holder's choices are shaped by the affect. A character can experience constraining dread without being externally constrained. Demanding `STSTAT.agency ∈ {constrained, coerced}` for `constraining` STEMOs conflates internal pressure with external coercion.

The landed validator now asks the FOUNDATIONS-aligned Rule 5 question: if a STEMO claims `agency_effect: constraining`, where is the observable downstream constraint on choice / plan / relationship? An "internal" STEMO that produces no visible downstream effect on any active record is a floating fact (Rule 1), and the receipt is now the downstream record, not an unrelated event field.

## Assumption Reassessment (2026-05-25)

1. At intake, `tools/validators/src/structural/stemo-agency-effect-compatibility.ts` (full file, 14 lines) returned no verdicts when `holderHasCompatibleAgency` OR `sameEventExplainsConstrainedAgency` returned true; both helpers lived in `tools/validators/src/structural/stemo-utils.ts`. `COMPATIBLE_AGENCY = new Set(["constrained", "coerced"])` and `sameEventExplainsConstrainedAgency` returned `true` iff `readSeStateRelations(event).length > 0 || readSeNonPropagationFacts(event).length > 0`. The landed source removes that helper and expands compatible agency.

2. `docs/FOUNDATIONS.md` §Validation Rules Rule 1 (No Floating Facts) and Rule 5 (No Consequence Evasion) are the principles under audit. Rule 1: "No fact may exist without domain, scope, prerequisites, limits, consequences." Rule 5: "If a new fact has obvious second-order effects, either integrate them or explicitly explain why they do not manifest." A `constraining` STEMO whose constraint produces no downstream artifact violates both. The validator's *intent* is correct (force the receipt); its *escape-hatch surface* is wrong.

3. Cross-skill boundary: the validator runs at patch-engine pre-apply on every `create_stemo_record` and at full-world scope. Authoring sites are `branching-story-bootstrap` Phase 6/7 (creates initial STEMOs at story_start), `branching-story-turn-cycle` Phase 4-5 (creates STEMO supersessions and new STEMOs), `commitment-block-authoring` (does not create STEMO records; not affected), and `branching-story-prose-attach` (does not create STEMO records; not affected). The shared boundary under audit is `tools/validators/src/structural/stemo-utils.ts` downstream-grounding semantics plus the SKILL.md and phase-reference workflow notes in turn-cycle and bootstrap. No schema field is renamed; no PG / SE schema is changed; no patch-engine op is changed.

4. FOUNDATIONS principle under audit (per Rule 5): every consequence-bearing fact must have a visible downstream artifact OR an explicit non-manifestation note. The validator currently accepts a *witness-absence* note as the non-manifestation note, but witness-absence and agency-constraint-absence are unrelated. The replacement check must align the receipt with the claim.

5. This is a validator-semantic change, not a schema field rename. No grep across `tools/` or `worlds/` is required for field-removal; the existing `STEMO.agency_effect` field stays. `SE.non_propagation_facts[]` and `SE.state_relations[]` semantics for the witness-coverage / plan-relation validators remain unchanged.

6. Adjacent contradictions exposed during reassessment: `stemo_supersession_lifecycle_valid` was patched in the same 2026-05-25 session to read parent-page snapshots (separate fix; landed). `branching-story-bootstrap` SE-1 fixture in red-bunny already carries the defensive `non_propagation_facts` entry. It is harmless (an empty `records: []` entry produces no false witness-coverage assertion), but it is now obsolete and belongs to follow-up story-bundle cleanup. Classified as future cleanup; NOT in this ticket's scope.

7. Current-run dirty-worktree boundary: `tools/validators/src/structural/stemo-utils.ts` and `tools/validators/tests/structural/stemo-helpers.ts` already contained same-seam supersession lifecycle hunks before this run. This ticket added only the agency-effect compatibility hunks in those files and preserved the sibling supersession work. `.claude/skills/brainstorm/references/carve-outs.md`, `.claude/skills/reassess-spec/references/codebase-validation.md`, `.claude/skills/reassess-spec/references/foundations-alignment.md`, `specs/SPEC-87-story-explorer-backend-foundation.md`, `tools/validators/src/structural/stemo-supersession-lifecycle-valid.ts`, `tools/validators/tests/structural/stemo-supersession-lifecycle-valid.test.ts`, and unrelated untracked SPEC-87 / PGHASHCLI tickets were pre-existing or sibling work and were left out of this ticket's owner boundary.

8. Verification exposed live-corpus fallout outside this package/skill ticket: `node tools/validators/dist/src/cli/world-validate.js erotica-world` now reports two `stemo_agency_effect_compatibility.unexplained_constraining_effect` findings on red-bunny `STEMO-3` and `STEMO-4`, plus unrelated page-plan failures. This is a real story-bundle cleanup surface, but story `_source` repair is engine-routed and out of scope here. Follow-up `tickets/STEMOAGENCY-002.md` tracks that cleanup.

## Architecture Check

1. **Why this is cleaner than alternatives.** Three alternatives considered:

   - *Drop the validator entirely.* Loses the FOUNDATIONS Rule 1/5 enforcement. Rejected.
   - *Rename `agency_effect` to `behavioral_constraint` with new enum values.* Requires schema migration, downstream consumer updates in every story-pipeline skill, and a full bundle restamp. Disproportionate to the actual semantic gap.
   - *Add a separate `internal_only` boolean to STEMO.* Pollutes the schema with a workaround flag whose only purpose is to opt out of a validator.

   The chosen design — replace the receipt check with cross-record downstream-grounding evidence — keeps the schema unchanged, aligns the receipt with the FOUNDATIONS rule the validator is enforcing, and removes the field-coupling hack without introducing a new field or migration.

2. **No backwards-compatibility shims.** The validator change is direct: `sameEventExplainsConstrainedAgency` is replaced by a new helper `constrainingEffectHasDownstreamGrounding`. Old STEMO records that previously passed via the witness-absence escape hatch may now fail if they have no downstream grounding. Mitigation: bootstrap STEMO records on PG-1 are checked against the same-envelope emitted CHCs (which DO ground in them — verified for red-bunny PG-1: CHC-1, CHC-2, CHC-3 all ground in `STEMO-1` and `STEMO-2`). No migration shim; bundles whose STEMOs lack any downstream grounding genuinely violate Rule 1/5 and should be repaired through a turn-cycle.

## Verification Layers

1. Validator semantics change correctly enforced → unit-test grep-proof (`grep -n "sameEventExplainsConstrainedAgency" tools/validators/src/structural/` returns no matches after the change; `grep -n "constrainingEffectHasDownstreamGrounding" tools/validators/src/structural/stemo-utils.ts` returns the new helper definition; `grep -n "constrainingEffectHasDownstreamGrounding" tools/validators/src/structural/stemo-agency-effect-compatibility.ts` returns the call site).
2. Validator behavior verified → unit-test invariants: (a) constraining STEMO with active STSTAT.agency ∈ {constrained, coerced, captive, incapacitated, unconscious, dead} passes; (b) constraining STEMO whose holder has an active CHC `grounded_in.records[]` referencing this STEMO passes; (c) constraining STEMO whose holder has an active STPLAN `derived_from[]` referencing this STEMO passes; (d) constraining STEMO whose holder has an active SREL `derived_from[]` referencing this STEMO passes; (e) constraining STEMO with no downstream grounding fails with `stemo_agency_effect_compatibility.unexplained_constraining_effect`.
3. Pre-apply validator integration → `validatePatchPlan` integration test verifies an ungrounded constraining STEMO emits `stemo_agency_effect_compatibility.unexplained_constraining_effect`, while a same-envelope CHC grounding suppresses that code.
4. FOUNDATIONS alignment → FOUNDATIONS alignment check (the new helper's behavior is documented in the SKILL.md workflow note for turn-cycle and bootstrap, citing FOUNDATIONS §Validation Rules Rule 1 and Rule 5).
5. Full-suite regression → codebase verification command (`cd tools/validators && npm test --silent` reports 1046 tests passing, no failures).

## Landed Changes

### 1. Add `constrainingEffectHasDownstreamGrounding` helper to `stemo-utils.ts`

`tools/validators/src/structural/stemo-utils.ts` now exports `constrainingEffectHasDownstreamGrounding`. The helper walks `maps.all` so it sees both indexed records and same-envelope new records during pre-apply, scopes candidate records to the same story bundle, accepts CHC grounding through `grounded_in.records[]`, accepts holder-matched STPLAN grounding through `derived_from[]`, and accepts holder-participating SREL grounding through `derived_from[]`. `COMPATIBLE_AGENCY` now includes `constrained`, `coerced`, `captive`, `incapacitated`, `unconscious`, and `dead`.

### 2. Replace the escape-hatch check in `stemo-agency-effect-compatibility.ts`

`tools/validators/src/structural/stemo-agency-effect-compatibility.ts` now calls `constrainingEffectHasDownstreamGrounding` instead of `sameEventExplainsConstrainedAgency`, carries a Rule 1 / Rule 5 comment, and emits a failure message naming the accepted downstream-grounding surfaces. `sameEventExplainsConstrainedAgency` and its `SE.state_relations[]` / `SE.non_propagation_facts[]` reads were removed.

### 3. Update unit-test fixture and tests

`tools/validators/tests/structural/stemo-helpers.ts` now includes focused downstream-grounding fixtures:

- Add a `choice(overrides)` helper that creates a minimal `choice_record` with `grounded_in.records: ["STEMO-N"]` for downstream-grounding test fixtures.
- Add a `plan(overrides)` helper that creates a minimal `story_plan_record` with `derived_from: ["STEMO-N"]`.
- Add a `srel(overrides)` helper that creates a minimal `relationship_record_story` with `derived_from: ["STEMO-N"]`.

`tools/validators/tests/structural/stemo-agency-effect-compatibility.test.ts` now covers compatible external agency, CHC grounding, STPLAN grounding, SREL grounding, no-grounding rejection, `agency_effect: none`, and the two removed SE-field escape hatches.

`tools/validators/tests/integration/validate-patch-plan.test.ts` now proves the pre-apply `validatePatchPlan` path emits the new failure code for an ungrounded constraining STEMO and suppresses it when the same envelope includes CHC grounding.

### 4. Update SKILL.md workflow notes

`.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md`, `.claude/skills/branching-story-bootstrap/SKILL.md`, and `.claude/skills/branching-story-bootstrap/references/phase-5-debts-and-optional-seeds.md` now tell authors that `agency_effect: constraining` requires downstream CHC/STPLAN/SREL grounding and that `SE.non_propagation_facts[]` / `SE.state_relations[]` do not discharge affective-constraint grounding.

### 5. Validator-level documentation comment

Added a header comment to `stemo-agency-effect-compatibility.ts` citing FOUNDATIONS Rule 1 + Rule 5 and explaining the receipt-must-match-claim discipline.

## Files to Touch

- `tools/validators/src/structural/stemo-agency-effect-compatibility.ts` (modify — change imports + escape-hatch helper call + failure message)
- `tools/validators/src/structural/stemo-utils.ts` (modify — add `constrainingEffectHasDownstreamGrounding`; remove `sameEventExplainsConstrainedAgency`; expand `COMPATIBLE_AGENCY`)
- `tools/validators/tests/structural/stemo-helpers.ts` (modify — add `choice`, `plan`, `srel` helpers; preserve pre-existing supersession helper changes)
- `tools/validators/tests/structural/stemo-agency-effect-compatibility.test.ts` (modify — replace test suite)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — prove pre-apply same-envelope grounding behavior)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — workflow note)
- `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` (modify — phase-local workflow note)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — workflow note)
- `.claude/skills/branching-story-bootstrap/references/phase-5-debts-and-optional-seeds.md` (modify — phase-local workflow note)
- `archive/tickets/STEMOAGENCY-001.md` (modify — closeout)
- `tickets/STEMOAGENCY-002.md` (new — bounded live-corpus cleanup follow-up)

## Out of Scope

- Removing the obsolete defensive `non_propagation_facts` entry from `worlds/erotica-world/stories/red-bunny/_source/events/SE-1.yaml` or repairing red-bunny `STEMO-3` / `STEMO-4` (this is follow-up cleanup that requires a HARD-GATE-approved story-bundle restamp; tracked by `tickets/STEMOAGENCY-002.md`).
- Schema-renaming `agency_effect` or expanding its enum (separate architectural decision; this ticket keeps the field unchanged).
- Touching `expected_witness_coverage` or `non_propagation_facts_completeness` validators (they correctly enforce witness-coverage discipline; this ticket only removes the unrelated cross-coupling).
- Changing patch-engine ops or shared-templates `story-record-schemas.md` (no schema field added or removed).

## Acceptance Criteria

### Tests That Must Pass

1. `cd /home/joeloverbeck/projects/worldloom/tools/validators && npm test --silent` reports `pass 1046` and `fail 0`. The new tests in `stemo-agency-effect-compatibility.test.ts` and `validate-patch-plan.test.ts` are included in the count.
2. `grep -rn "sameEventExplainsConstrainedAgency" tools/` returns zero matches.
3. `grep -n "constrainingEffectHasDownstreamGrounding" tools/validators/src/structural/stemo-utils.ts tools/validators/src/structural/stemo-agency-effect-compatibility.ts` returns the helper definition plus the validator import and call site.
4. `cd /home/joeloverbeck/projects/worldloom/tools/validators && node --test dist/tests/integration/validate-patch-plan.test.js` includes the `validatePatchPlan runs STEMO agency-effect compatibility over same-envelope downstream grounding` subtest.
5. `cd /home/joeloverbeck/projects/worldloom/tools/world-mcp && npm run build` succeeds after the validators package rebuild.
6. `cd /home/joeloverbeck/projects/worldloom && node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | grep -c 'stemo_agency_effect_compatibility.unexplained_constraining_effect'` returns `2`, preserving the live content gap as `tickets/STEMOAGENCY-002.md` rather than hiding it inside this package/skill ticket.

### Invariants

1. `STEMO.agency_effect: constraining` is satisfied by ANY of: compatible external STSTAT, CHC downstream grounding, STPLAN downstream grounding, or SREL downstream grounding. No other surface (SE event fields, free-text rationale, narrator notes) discharges the validator.
2. `SE.non_propagation_facts[]` and `SE.state_relations[]` semantics remain governed exclusively by `expected_witness_coverage`, `non_propagation_facts_completeness`, and `stplan_event_plan_relation_consistency`. They no longer participate in STEMO-receipt logic.
3. `STEMO.agency_effect: none` is unconditionally accepted (no receipt required); this matches the current behavior.
4. The validator continues to be `severity_mode: "fail"` and applies in `full-world`, `pre-apply`, and `touched-files` modes via `stemoValidatorApplies` (unchanged).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stemo-agency-effect-compatibility.test.ts` — rewritten with cases covering compatible external agency, CHC/STPLAN/SREL downstream grounding, no-grounding rejection, agency_effect:none ignore behavior, and the two removed SE-field escape hatches.
2. `tools/validators/tests/structural/stemo-helpers.ts` — added `choice()`, `plan()`, and `srel()` helpers wrapping the existing `record()` builder; retained the pre-existing supersession helper changes.
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` — added pre-apply proof for ungrounded constraining STEMO failure and same-envelope CHC-grounded suppression.

### Commands

1. `cd /home/joeloverbeck/projects/worldloom/tools/validators && npm run build`
2. `cd /home/joeloverbeck/projects/worldloom/tools/validators && node --test dist/tests/structural/stemo-agency-effect-compatibility.test.js dist/tests/integration/validate-patch-plan.test.js dist/tests/integration/spec49-stplan-stemo-hardening.test.js`
3. `cd /home/joeloverbeck/projects/worldloom/tools/validators && npm test --silent`
4. `cd /home/joeloverbeck/projects/worldloom/tools/world-mcp && npm run build`
5. `cd /home/joeloverbeck/projects/worldloom && node tools/validators/dist/src/cli/world-validate.js erotica-world`
6. `cd /home/joeloverbeck/projects/worldloom && node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | grep -c 'stemo_agency_effect_compatibility.unexplained_constraining_effect'`

## Outcome

Implemented. `stemo_agency_effect_compatibility` no longer accepts `SE.state_relations[]` or `SE.non_propagation_facts[]` as agency-constraint receipts. It accepts compatible external agency states and downstream CHC/STPLAN/SREL grounding, with focused structural coverage and a pre-apply `validatePatchPlan` integration test.

Workflow guidance was updated in both bootstrap and turn-cycle operational surfaces, including their phase-local references, so authors are routed to downstream-grounding evidence instead of witness-absence fields.

## Verification Result

1. `cd /home/joeloverbeck/projects/worldloom/tools/validators && npm run build` — passed.
2. `cd /home/joeloverbeck/projects/worldloom/tools/validators && node --test dist/tests/structural/stemo-agency-effect-compatibility.test.js dist/tests/integration/validate-patch-plan.test.js dist/tests/integration/spec49-stplan-stemo-hardening.test.js` — passed, 40 tests / 40 pass.
3. `cd /home/joeloverbeck/projects/worldloom/tools/validators && npm test --silent` — passed, 1046 tests / 1046 pass.
4. `cd /home/joeloverbeck/projects/worldloom/tools/world-mcp && npm run build` — passed.
5. `cd /home/joeloverbeck/projects/worldloom && rg -n 'sameEventExplainsConstrainedAgency' tools .claude/skills/branching-story-bootstrap .claude/skills/branching-story-turn-cycle` — no matches.
6. `cd /home/joeloverbeck/projects/worldloom && rg -n 'constrainingEffectHasDownstreamGrounding' tools/validators/src/structural/stemo-utils.ts tools/validators/src/structural/stemo-agency-effect-compatibility.ts` — found the helper definition plus the import and call site.
7. `cd /home/joeloverbeck/projects/worldloom && rg -n 'same-event state_relations\[\] / non_propagation_facts\[\] entry|plan_relation/non_propagation|same-event structured relation|state_relations\[\].*constrained-agency|non_propagation_facts\[\].*constrained-agency|defensive \`non_propagation_facts\`|witness-absence escape' tools/validators/src tools/validators/tests .claude/skills/branching-story-bootstrap .claude/skills/branching-story-turn-cycle` — no matches.
8. `cd /home/joeloverbeck/projects/worldloom && node tools/validators/dist/src/cli/world-validate.js erotica-world` — exited 1 with 20 fail / 0 warn / 3 info. Two failures are the expected newly exposed `stemo_agency_effect_compatibility.unexplained_constraining_effect` findings for red-bunny `STEMO-3` and `STEMO-4`; the rest are unrelated page-plan failures.
9. `cd /home/joeloverbeck/projects/worldloom && node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | grep -c 'stemo_agency_effect_compatibility.unexplained_constraining_effect'` — returned `2`.

## Deviations

1. The drafted world-validate acceptance expected zero red-bunny STEMO agency-effect failures. Live validation instead exposed two real story-bundle content failures (`STEMO-3`, `STEMO-4`). This ticket does not direct-edit story `_source`; follow-up `tickets/STEMOAGENCY-002.md` owns the engine-routed red-bunny cleanup.
2. The drafted CLI synthetic-envelope proof was implemented as a package integration test in `tools/validators/tests/integration/validate-patch-plan.test.ts`, which exercises the same pre-apply `validatePatchPlan` path without relying on ad hoc `/tmp` envelope files.
3. `scripts/check-all.sh` was not run. The validators package full suite and `tools/world-mcp` build were run as the truthful proof surface for this validator/skill contract change.
4. `tools/validators/src/structural/stemo-utils.ts` and `tools/validators/tests/structural/stemo-helpers.ts` already contained same-seam supersession lifecycle hunks before this run; this ticket only owns the agency-effect compatibility hunks in those files.
