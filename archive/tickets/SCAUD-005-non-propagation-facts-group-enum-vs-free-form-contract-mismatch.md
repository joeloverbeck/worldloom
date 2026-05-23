# SCAUD-005: `non_propagation_facts[].group` is a closed enum in validator code but documented as free-form in the contract

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` documentation, plus same-seam branching-story skill references; no code change in validators or schemas.
**Deps**: none

## Problem

At intake, the shared story-state contract described `SE.non_propagation_facts[].group` as "a free-form witness-group label" (`.claude/skills/_shared-templates/story-state-contract.md` §5a.2), but the `expected_witness_coverage` validator only accepts the closed set `{direct, direct_witnesses, direct:<STLOC-id>, location:<STLOC-id>}` (`tools/validators/src/structural/expected-witness-coverage.ts` `computedGroupLabels`). Authors who followed the contract's stated semantics — descriptive prose group labels like `"anonymous lit-street passersby (no identifying acquaintance...)"` — produced envelopes that failed dry-run with `expected_witness_coverage_wrong_group_label`.

Concrete encounter: while running `branching-story-turn-cycle` to commit `worlds/erotica-world/stories/red-bunny/_source/pages/PG-5.yaml` (2026-05-23), the descriptive group label conformed to the contract but failed validation. The validator's `suggested_fix` ("Use group=direct_witnesses or another computed direct-group label") is correct; the contract documentation is misleading.

The single example in §5a.2 (`group: direct_witnesses`) already landed inside the enum, but the surrounding prose gave authors a permission slip the validator did not honor. This ticket corrected that prose and the same-seam branching-story guidance.

## Assumption Reassessment (2026-05-23)

1. **Contract source under audit**: `.claude/skills/_shared-templates/story-state-contract.md` §5a.2. At intake, the relevant wording was:

   > `reason` is one of `no_witness | witness_incapacitated | evidence_concealed | institution_suppresses_report | event_leaves_no_accessible_trace`. `group` is a free-form witness-group label. `records[]` names the story-local records that justify or contextualize the non-propagation fact.

2. **Validator source under audit**: `tools/validators/src/structural/expected-witness-coverage.ts` `computedGroupLabels` and `factMatchesGroup`. The legal label set is exactly `new Set(["direct", "direct_witnesses", "direct:${group.actorLocation}", "location:${group.actorLocation}"])`.

3. **Shared boundary**: shared story-state contract `_shared-templates/story-state-contract.md` §5a.2 ↔ `expected-witness-coverage.ts` `computedGroupLabels`. Both must agree on the legal `group` value set.

4. **No FOUNDATIONS principle directly under audit.** This is a contract-vs-implementation drift, not a Canon Layer/Validation Rule shift. FOUNDATIONS §Story Bundles §6a (Belief vs. Fact) covers when BEL coverage is mandatory; it does not mention non-propagation group labels.

5. **JSON schema is permissive.** `tools/validators/src/schemas/story-event.schema.json` declares `non_propagation_facts[].group` as `{"type": "string", "minLength": 1}` (no enum). The enforcement lives only in the structural validator, not the schema. This is intentional — the legal labels are computed at validation time from the actor's location — so the contract now documents the canonical labels in prose while the schema remains permissive.

6. **Adjacent same-seam guidance**: live grep found no other "free-form witness-group label" wording, but it did find placeholder or broader "direct or indirect witness group" guidance in `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md`, `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md`, `.claude/skills/branching-story-bootstrap/references/phase-3-4-facts-beliefs-da.md`, and `.claude/skills/branching-story-health-audit/SKILL.md`. These are same-seam documentation consumers because they tell authors/auditors what `SE.non_propagation_facts[].group` should contain.

7. **Adjacent contradictions**: no validator or schema contradiction uncovered during reassessment. The required consequence fallout is documentation-only same-seam guidance, not runtime behavior.

## Architecture Check

1. **Cleanest approach**: amend the contract documentation to enumerate the four legal group labels and explain why they are computed-at-validation-time (the `direct:<STLOC-id>` and `location:<STLOC-id>` forms depend on the actor's location, which is not known until validation). This keeps the schema permissive (intentional — labels are dynamic) while removing the contract-validator wording gap.

2. **No backwards-compatibility shims**: this is a one-way documentation correction; no runtime behavior change. The validator already accepts the closed set; the contract just needs to say so. No alias paths, no deprecated value support.

## Verification Layers

1. **Contract wording matches validator behavior** -> codebase grep-proof: `! grep -n "free-form witness-group label" .claude/skills/_shared-templates/story-state-contract.md` passes; `grep -nE "direct_witnesses|direct:<STLOC-id>|location:<STLOC-id>" .claude/skills/_shared-templates/story-state-contract.md` returns the documented labels in §5a.2.

2. **Skill cross-references stay consistent** -> codebase grep-proof: `grep -rn "non_propagation_facts" .claude/skills/branching-story-turn-cycle/ .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-health-audit/` — every reference still resolves to either the amended contract section or the skill-local procedure; none re-introduces "free-form" wording.

3. **Validator behavior unchanged** -> manual review: `tools/validators/src/structural/expected-witness-coverage.ts` `computedGroupLabels` and `factMatchesGroup` are not touched by this ticket; the change is documentation-only.

## Landed Changes

### 1. `.claude/skills/_shared-templates/story-state-contract.md` §5a.2

Replaced the stale "free-form witness-group label" sentence with the four legal computed direct-witness labels: `direct`, `direct_witnesses`, `direct:<STLOC-id>`, and `location:<STLOC-id>`. The landed text explains that location-bearing labels are computed from the event actor's active `STSTAT.location`, and that descriptive context belongs in `records[]` and `world_logic_rationale`.

The existing `reason` enum and `records[]` semantics remain unchanged.

### 2. Branching-story same-seam references

Updated branching-story bootstrap, turn-cycle, and health-audit guidance that used ambiguous `<label>` placeholders or implied arbitrary direct/indirect group labels. The landed wording points authors and auditors back to the computed direct-group labels from `_shared-templates/story-state-contract.md` §5a.2 while preserving the existing DA indirect-propagation rule.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §5a.2 wording)
- `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` (modify — clarify legal `group` labels)
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify — clarify legal `group` labels)
- `.claude/skills/branching-story-bootstrap/references/phase-3-4-facts-beliefs-da.md` (modify — clarify example placeholder)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — clarify audit wording for legal `group` labels)
- `archive/tickets/SCAUD-005-non-propagation-facts-group-enum-vs-free-form-contract-mismatch.md` (modify — reassessment/closeout truthing and archival handoff)

## Out of Scope

- Adding a JSON-schema-level enum to `non_propagation_facts[].group`. The location-bearing forms are computed at validation time and cannot be enumerated in a static schema.
- Changing `expected-witness-coverage.ts` behavior. The validator is correct; the docs are wrong.
- Auditing or repairing historical SE records (e.g., red-bunny's SE-2/3/4) that were committed with the older convention. Those records are under separate concern (likely already hand-reconciled per the engine-sync band-aid).
- Adding a "legal group labels" cookbook outside the contract. The contract amendment is sufficient.

## Acceptance Criteria

### Tests That Must Pass

1. `! grep -n "free-form witness-group label" .claude/skills/_shared-templates/story-state-contract.md` passes.
2. `grep -nE "direct_witnesses|direct:<STLOC-id>|location:<STLOC-id>" .claude/skills/_shared-templates/story-state-contract.md` returns the documented labels in §5a.2.
3. `cd tools/validators && npm test` passes unchanged (no validator behavior modified).
4. `! grep -rn "free-form witness-group label" .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle .claude/skills/branching-story-bootstrap .claude/skills/branching-story-health-audit` passes.

### Invariants

1. The shared contract §5a.2 enumerates exactly the four labels accepted by `computedGroupLabels` in `expected-witness-coverage.ts`. No drift between contract documentation and validator code.
2. The validator's permissive JSON schema (`story-event.schema.json` `group: {type: string, minLength: 1}`) is unchanged. The closed enum is documented in prose, not in the schema, because the location-bearing forms are dynamic.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `! grep -n "free-form witness-group label" .claude/skills/_shared-templates/story-state-contract.md` — confirm the misleading wording is removed from the contract.
2. `grep -nE "direct_witnesses|direct:<STLOC-id>|location:<STLOC-id>" .claude/skills/_shared-templates/story-state-contract.md` — confirm the legal labels are documented.
3. `! grep -rn "free-form witness-group label" .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle .claude/skills/branching-story-bootstrap .claude/skills/branching-story-health-audit` — confirm same-seam skill guidance does not reintroduce the stale wording.
4. `cd tools/validators && npm test` — confirm the existing validator suite still passes (no code change touches its behavior).

## Outcome

Completed. The shared story-state contract now documents `SE.non_propagation_facts[].group` as the computed direct-witness label set accepted by `expected_witness_coverage`: `direct`, `direct_witnesses`, `direct:<STLOC-id>`, and `location:<STLOC-id>`.

Same-seam branching-story guidance was updated where it previously used `<label>` placeholders or implied arbitrary direct/indirect group labels. Validator and JSON Schema code were not changed.

## Verification Result

1. `grep -n "free-form witness-group label" .claude/skills/_shared-templates/story-state-contract.md` returned no lines, as expected for the removed stale phrase.
2. `grep -nE "direct_witnesses|direct:<STLOC-id>|location:<STLOC-id>" .claude/skills/_shared-templates/story-state-contract.md` returned the §5a.2 example and documented label set.
3. `grep -rn "free-form witness-group label" .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle .claude/skills/branching-story-bootstrap .claude/skills/branching-story-health-audit` returned no lines, as expected.
4. `npm test` from `tools/validators` passed: 965 tests, 965 pass, 0 fail.

## Deviations

- Reassessment widened the documentation-only file set to include same-seam branching-story references and `branching-story-health-audit` wording discovered by live grep. This did not widen into validator or schema behavior.
- The `tools/validators` proof refreshed the pre-existing ignored `tools/validators/dist/` artifact and used pre-existing ignored `tools/validators/node_modules/`.
