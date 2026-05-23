# SCAUD-006: Document witness-trigger conditions and public-BEL requirement in shared contract §5a.3 / FOUNDATIONS §6a

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` documentation, plus same-seam branching-story skill guidance; no code change in validators or schemas.
**Deps**: `archive/tickets/SCAUD-005-non-propagation-facts-group-enum-vs-free-form-contract-mismatch.md` (completed related contract amendment in the same neighbourhood, but independent)

## Problem

At intake, the `expected_witness_coverage` validator activated for an event only when one of four trigger conditions held (`tools/validators/src/structural/expected-witness-coverage.ts` `eventHasWitnessTrigger`):

1. The event creates a BEL with `visibility ∈ {public, shared, factional, rumored}`.
2. The event creates a DA with `circulation ∈ {public, factional}`.
3. The event creates or supersedes a STENT.
4. The event supersedes a STSTAT for an entity OTHER than the actor.

Once active, the validator requires direct witnesses (everyone alive, free, and at the actor's STLOC) to be covered by either a `public/shared/factional/rumored` BEL (`PUBLIC_BEL_VISIBILITIES`) OR a non-propagation fact whose `group` matches the computed group and whose `records[]` contains every direct witness. **Private BEL records do not count for coverage** even though they cover the same holders semantically.

Before this ticket, none of this was documented in the shared contract or in consuming skill guidance. The contract's §Story Bundles §6a "Belief vs. Fact" rule said BEL updates are mandatory for "secrecy / betrayal / deception / violence / sex / law / status / public ritual" events but never named the public-vs-private distinction; §7 gate descriptions mentioned witness coverage only as part of gate 8 (canon promotion hold), which is a different concern.

Concrete encounter: while running `branching-story-turn-cycle` to commit `worlds/erotica-world/stories/red-bunny/_source/pages/PG-5.yaml` (2026-05-23), the event superseded `STSTAT-2` (entity STENT-2, not the actor STENT-1) — triggering condition 4 above. BEL-12 (Ane's updated read) had `visibility: private`, semantically correct for an interior belief, but it did NOT count as direct-witness coverage. The dry-run failed with `expected_witness_coverage_missing_public_bel` until a `non_propagation_facts[]` entry with `group: direct_witnesses, records: [STENT-2]` was added. Earlier records in the bundle (SE-2/3/4) avoided this failure not by passing the rule but by not triggering it — none of them superseded a non-actor status — so prior bundle history doesn't surface the requirement.

The rule itself is sound; it is load-bearing. The gap was purely documentation.

## Assumption Reassessment (2026-05-23)

1. **Validator source under audit**: `tools/validators/src/structural/expected-witness-coverage.ts`. Specifically: `eventHasWitnessTrigger` (lines 275-298), `PUBLIC_BEL_VISIBILITIES` (line 13), `publicBelForEvent` (lines 300-310), `belCoverageForEvent` (lines 320-345), and `directWitnessVerdicts` (lines 124-156). These functions together encode the trigger-conditions-and-public-coverage rule that is not documented elsewhere.

2. **Contract sources under audit**:
   - At intake, `.claude/skills/_shared-templates/story-state-contract.md` had no §5a.3 and was silent on this rule. The landed contract now hosts the validator-level rule in §5a.3.
   - At intake, `.claude/skills/_shared-templates/story-state-contract.md` §7 named the eight hard gates but did not name the public-BEL requirement.
   - `docs/FOUNDATIONS.md` §Story Bundles §6a — Belief vs Fact rule; the canonical source.

3. **Shared boundary under audit**: shared story-state contract §5a.2/§5a.3 non-propagation and witness-coverage discipline (aligned to FOUNDATIONS §Story Bundles §6a) ↔ `expected-witness-coverage.ts` enforcement code. The landed contract documents the four trigger conditions and the public-vs-private BEL distinction so authors do not have to read validator source to know when supersession + private BEL is insufficient.

4. **FOUNDATIONS principle restated**: FOUNDATIONS §Story Bundles §6a (Belief vs Fact) requires BEL updates for actions involving "secrecy / betrayal / deception / violence / sex / law / status / public ritual." This ticket does not change that principle; it documents the orthogonal validator-level rule that a private BEL satisfies §6a as semantics but does NOT discharge the witness-coverage gate when status-supersession of a non-actor entity is in the state delta. Authors must either author a public-visibility BEL or an explicit non-propagation fact.

5. **No HARD-GATE semantics or Mystery Reserve firewall change**: this ticket documents existing validator behavior; it does not alter Canon Safety Checks or the Mystery Reserve firewall. The forbidden-mystery firewall (gate 3) is untouched.

6. **No schema extension**: the BEL schema's `visibility` enum (`{private, shared, factional, public, rumored, concealed, suppressed}`) is unchanged. The public-BEL distinction lives in `PUBLIC_BEL_VISIBILITIES` (a runtime set in the validator), not in the schema.

7. **Adjacent same-seam guidance**: live grep found current `expected_witnesses` / `non_propagation_facts` guidance in `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md`, `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md`, `.claude/skills/branching-story-turn-cycle/references/governance-and-foundations.md`, `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/branching-story-bootstrap/references/phase-3-4-facts-beliefs-da.md`, `.claude/skills/branching-story-bootstrap/references/phase-10-validation.md`, and `.claude/skills/branching-story-health-audit/SKILL.md`. The active file set widens to those same-seam documentation consumers so the new shared-contract rule is discoverable where authors and auditors apply it.

8. **HARD-GATE discipline read**: `docs/HARD-GATE-DISCIPLINE.md` was read because this ticket touches content-generating story-skill validation-gate guidance and operator PASS/FAIL criteria. The change documents existing validation behavior only; it does not change HARD-GATE order, approval timing, `validation_trace` schema, Mystery Reserve firewall behavior, approval-token behavior, `validate_patch_plan`, `submit_patch_plan`, or pre-apply validator semantics.

9. **Adjacent contradictions**: archived SCAUD-005 and this ticket together amend §5a.2 and a new §5a.3/§6a region of the contract. They are independent but share the witness-coverage subject area. SCAUD-005 is completed; this ticket preserves its legal-group-label wording while adding the trigger/public-BEL documentation. Archived `archive/tickets/ENGINESYNC-006-compute-pg-hashes-yaml-vs-json-input-parity.md` mentions SCAUD-006 only as independent context and is not a dependency or same-seam owner.

## Architecture Check

1. **Cleanest approach**: amend the shared contract to add a "Witness coverage and non-propagation" subsection (logical home: alongside §5a.2, or as a new §6a-prime explaining the rule that pairs with FOUNDATIONS §Story Bundles §6a). The subsection enumerates the four trigger conditions verbatim from validator source and explicitly distinguishes public-BEL coverage from private-BEL coverage. No code change.

2. **No backwards-compatibility shims**: documentation-only correction. The validator behavior is the source of truth and is correct; the contract just needs to surface what the validator enforces.

## Verification Layers

1. **Contract documents the trigger conditions** -> codebase grep-proof: `grep -nE "supersedes a status record|status-supersession|STSTAT.*supersede" .claude/skills/_shared-templates/story-state-contract.md` returns the documented trigger condition lines.

2. **Contract documents the public-BEL distinction** -> codebase grep-proof: `grep -nE "PUBLIC_BEL_VISIBILITIES|public.*BEL|public/shared/factional/rumored" .claude/skills/_shared-templates/story-state-contract.md` returns the documented enumeration.

3. **Cross-reference parity with FOUNDATIONS §Story Bundles §6a** -> manual review: the contract's amended subsection explicitly names FOUNDATIONS §Story Bundles §6a as the authoritative belief-vs-fact rule and frames itself as the validator-level discharge requirement for that rule.

4. **Validator behavior unchanged** -> manual review: `tools/validators/src/structural/expected-witness-coverage.ts` is not touched. `cd tools/validators && npm test` passes unchanged.

## Landed Changes

### 1. `.claude/skills/_shared-templates/story-state-contract.md` — new subsection

Added §5a.3, "Witness Trigger Conditions and Public BEL Requirement", after §5a.2. The landed subsection:

- Names the four trigger conditions that activate `expected_witness_coverage` (creates a public-coverage BEL; creates a public/factional DA; creates or supersedes a STENT; supersedes a STSTAT for an entity other than the actor).
- States that the `PUBLIC_BEL_VISIBILITIES` set is `{public, shared, factional, rumored}` and that private/concealed/suppressed BEL records do NOT count for coverage even when their `holder` is a direct witness.
- States the two lawful direct-witness discharge paths when the validator activates: (a) public-visibility BEL coverage for every direct witness (either as holder or via `holder: public` / `holder: group:direct_witnesses`); OR (b) one non-propagation fact per archived SCAUD-005's legal group labels whose `records[]` contains every direct witness.
- Cross-references FOUNDATIONS §Story Bundles §6a as the belief-vs-fact rule this validator-level requirement implements.

### 2. Branching-story authoring guidance

Added cross-references where authors compute witness coverage and validate it:

- `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 4-5 summary.
- `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` expected-witness procedure.
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` additional checks 3-4.
- `.claude/skills/branching-story-turn-cycle/references/governance-and-foundations.md` FOUNDATIONS §Story Bundles §6a row.
- `.claude/skills/branching-story-bootstrap/SKILL.md` Phase 3-4 and Phase 10 summaries.
- `.claude/skills/branching-story-bootstrap/references/phase-3-4-facts-beliefs-da.md` DA/bootstrap witness coverage guidance.
- `.claude/skills/branching-story-bootstrap/references/phase-10-validation.md` gate 7 / bootstrap-additional check wording.

### 3. `.claude/skills/branching-story-health-audit/SKILL.md`

Truthed the `expected_witness_completeness` audit description so audit guidance distinguishes direct-witness public-visibility BEL coverage from private BEL semantics and points to shared contract §5a.3.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — add Witness Trigger Conditions subsection)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — add cross-reference)
- `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` (modify — add witness-trigger/public-BEL guidance)
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify — add validation-gate witness-trigger/public-BEL guidance)
- `.claude/skills/branching-story-turn-cycle/references/governance-and-foundations.md` (modify — align FOUNDATIONS §Story Bundles §6a row)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — add cross-reference)
- `.claude/skills/branching-story-bootstrap/references/phase-3-4-facts-beliefs-da.md` (modify — add bootstrap witness-trigger/public-BEL guidance)
- `.claude/skills/branching-story-bootstrap/references/phase-10-validation.md` (modify — align validation wording)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — align audit wording)

## Out of Scope

- Changing `expected-witness-coverage.ts` behavior or thresholds. The validator is correct.
- Changing the BEL schema's `visibility` enum. The public/private distinction is enforced at validation time, not at schema level.
- Adding a runtime "would-this-trigger" preview to skills. Authors can check the four conditions against their drafted state delta during Phase 4-5.
- Auditing historical SE records that may not have triggered the validator (e.g., the prior red-bunny pages with no non-actor STSTAT supersession). Those events validated under the same code path and passed; this ticket does not retroactively re-evaluate them.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "expected_witness_coverage|Witness Trigger Conditions|PUBLIC_BEL_VISIBILITIES|status-supersession" .claude/skills/_shared-templates/story-state-contract.md` returns the documented subsection.
2. ``grep -nE 'shared contract §5a\.3|public-BEL|public-coverage|private BEL|private `BEL`|non-actor `STSTAT`' .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md .claude/skills/branching-story-turn-cycle/references/governance-and-foundations.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-3-4-facts-beliefs-da.md .claude/skills/branching-story-bootstrap/references/phase-10-validation.md .claude/skills/branching-story-health-audit/SKILL.md`` returns the cross-reference / same-seam guidance lines.
3. `cd tools/validators && npm test` passes unchanged.

### Invariants

1. The contract documents the four trigger conditions verbatim against `eventHasWitnessTrigger` in the validator source. No drift.
2. The contract distinguishes private-BEL coverage (semantic; satisfies §6a) from public-BEL coverage (discharges the validator gate). Authors reading the contract before drafting Phase 4-5 do not need to read validator source to know which lawful discharge path applies.
3. The validator code is unchanged; the contract amendment surfaces existing behavior.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "Witness Trigger Conditions|PUBLIC_BEL_VISIBILITIES" .claude/skills/_shared-templates/story-state-contract.md` — confirm the new subsection exists with the load-bearing terms.
2. `grep -nE "non_propagation_facts.*direct_witnesses|status-supersession" .claude/skills/_shared-templates/story-state-contract.md` — confirm the discharge-path documentation is present.
3. `cd tools/validators && npm test` — confirm the existing validator suite still passes.

## Outcome

Completed: 2026-05-23. The shared story-state contract now documents the four `expected_witness_coverage` trigger conditions and the public-BEL discharge requirement in §5a.3. It preserves SCAUD-005's legal non-propagation group labels and explicitly states that private, concealed, and suppressed BEL records do not discharge direct-witness coverage.

Same-seam branching-story turn-cycle, bootstrap, governance, validation, and health-audit guidance now points authors and auditors to §5a.3 where they compute or validate witness coverage. Validator and schema code were not changed.

## Verification Result

1. `grep -nE 'expected_witness_coverage|Witness Trigger Conditions|PUBLIC_BEL_VISIBILITIES|status-supersession' .claude/skills/_shared-templates/story-state-contract.md` returned the new §5a.3 heading, trigger wording, `PUBLIC_BEL_VISIBILITIES`, private-BEL wording, and status-supersession discharge guidance.
2. `grep -n 'Witness Trigger Conditions' .claude/skills/_shared-templates/story-state-contract.md` returned the §5a.3 heading.
3. ``grep -nE 'shared contract §5a\.3|public-BEL|public-coverage|private BEL|private `BEL`|non-actor `STSTAT`' ...`` over the touched branching-story SKILL/reference surfaces returned the expected same-seam guidance lines in turn-cycle, bootstrap, governance, and health-audit files.
4. `npm test` from `tools/validators` passed: 965 tests, 965 pass, 0 fail.

## Deviations

- Reassessment widened the documentation-only file set from the drafted three files to include same-seam turn-cycle references, bootstrap references, governance guidance, and health-audit guidance discovered by live grep. This kept the change inside the existing story witness-coverage contract and did not widen into validator or schema behavior.
- `docs/HARD-GATE-DISCIPLINE.md` was read because the landed wording touches content-generating story-skill validation-gate guidance. The landed change preserves HARD-GATE order, approval timing, `validation_trace` shape, Mystery Reserve firewall behavior, approval-token behavior, and validate/submit behavior.
- The `tools/validators` proof refreshed the pre-existing ignored `tools/validators/dist/` artifact and used pre-existing ignored `tools/validators/node_modules/`.
