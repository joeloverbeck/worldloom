# SCAUD-006: Document witness-trigger conditions and public-BEL requirement in shared contract §6a / §7

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` documentation, plus skill SKILL.md cross-references; no code change in validators or schemas.
**Deps**: `archive/tickets/SCAUD-005-non-propagation-facts-group-enum-vs-free-form-contract-mismatch.md` (completed related contract amendment in the same neighbourhood, but independent)

## Problem

The `expected_witness_coverage` validator activates for an event only when one of four trigger conditions holds (`tools/validators/src/structural/expected-witness-coverage.ts` `eventHasWitnessTrigger`, lines 275-298):

1. The event creates a BEL with `visibility ∈ {public, shared, factional, rumored}`.
2. The event creates a DA with `circulation ∈ {public, factional}`.
3. The event creates or supersedes a STENT.
4. The event supersedes a STSTAT for an entity OTHER than the actor.

Once active, the validator requires direct witnesses (everyone alive, free, and at the actor's STLOC) to be covered by either a `public/shared/factional/rumored` BEL (`PUBLIC_BEL_VISIBILITIES`, line 13) OR a non-propagation fact whose `group` matches the computed group and whose `records[]` contains every direct witness. **Private BEL records do not count for coverage** even though they cover the same holders semantically.

None of this is documented in the shared contract or in any consuming skill's SKILL.md. The contract's §Story Bundles §6a "Belief vs. Fact" rule says BEL updates are mandatory for "secrecy / betrayal / deception / violence / sex / law / status / public ritual" events but never names the public-vs-private distinction; §7 gate descriptions mention witness coverage only as part of gate 8 (canon promotion hold), which is a different concern.

Concrete encounter: while running `branching-story-turn-cycle` to commit `worlds/erotica-world/stories/red-bunny/_source/pages/PG-5.yaml` (2026-05-23), the event superseded `STSTAT-2` (entity STENT-2, not the actor STENT-1) — triggering condition 4 above. BEL-12 (Ane's updated read) had `visibility: private`, semantically correct for an interior belief, but it did NOT count as direct-witness coverage. The dry-run failed with `expected_witness_coverage_missing_public_bel` until a `non_propagation_facts[]` entry with `group: direct_witnesses, records: [STENT-2]` was added. Earlier records in the bundle (SE-2/3/4) avoided this failure not by passing the rule but by not triggering it — none of them superseded a non-actor status — so prior bundle history doesn't surface the requirement.

The rule itself is sound; it's load-bearing. The gap is purely documentation.

## Assumption Reassessment (2026-05-23)

1. **Validator source under audit**: `tools/validators/src/structural/expected-witness-coverage.ts`. Specifically: `eventHasWitnessTrigger` (lines 275-298), `PUBLIC_BEL_VISIBILITIES` (line 13), `publicBelForEvent` (lines 300-310), `belCoverageForEvent` (lines 320-345), and `directWitnessVerdicts` (lines 124-156). These functions together encode the trigger-conditions-and-public-coverage rule that is not documented elsewhere.

2. **Contract sources under audit**:
   - `.claude/skills/_shared-templates/story-state-contract.md` §6a — currently silent on this rule. (Actually §6a is "Belief vs Fact" in FOUNDATIONS §Story Bundles; the contract's §6 is action routing. The witness coverage requirement straddles both — it's about when belief propagation must be explicit.)
   - `.claude/skills/_shared-templates/story-state-contract.md` §7 — eight hard gates. Gate 7 (plan grounding) implicitly covers observer firewall, but no gate explicitly names the public-BEL requirement.
   - `docs/FOUNDATIONS.md` §Story Bundles §6a — Belief vs Fact rule; the canonical source.

3. **Shared boundary under audit**: shared story-state contract §6a-style discipline (FOUNDATIONS §Story Bundles §6a; contract §7 gate 8 description; contract §5a.2 non-propagation facts) ↔ `expected-witness-coverage.ts` enforcement code. The contract should document the four trigger conditions and the public-vs-private BEL distinction so authors do not have to read validator source to know when supersession + private BEL is insufficient.

4. **FOUNDATIONS principle restated**: FOUNDATIONS §Story Bundles §6a (Belief vs Fact) requires BEL updates for actions involving "secrecy / betrayal / deception / violence / sex / law / status / public ritual." This ticket does not change that principle; it documents the orthogonal validator-level rule that a private BEL satisfies §6a as semantics but does NOT discharge the witness-coverage gate when status-supersession of a non-actor entity is in the state delta. Authors must either author a public-visibility BEL or an explicit non-propagation fact.

5. **No HARD-GATE semantics or Mystery Reserve firewall change**: this ticket documents existing validator behavior; it does not alter Canon Safety Checks or the Mystery Reserve firewall. The forbidden-mystery firewall (gate 3) is untouched.

6. **No schema extension**: the BEL schema's `visibility` enum (`{private, shared, factional, public, rumored, concealed, suppressed}`) is unchanged. The public-BEL distinction lives in `PUBLIC_BEL_VISIBILITIES` (a runtime set in the validator), not in the schema.

7. **Adjacent contradictions**: archived SCAUD-005 and this ticket together amend §5a.2 and a new §6a-or-§7 region of the contract. They are independent but share the witness-coverage subject area. SCAUD-005 is completed; this ticket should preserve its legal-group-label wording while adding the trigger/public-BEL documentation.

## Architecture Check

1. **Cleanest approach**: amend the shared contract to add a "Witness coverage and non-propagation" subsection (logical home: alongside §5a.2, or as a new §6a-prime explaining the rule that pairs with FOUNDATIONS §Story Bundles §6a). The subsection enumerates the four trigger conditions verbatim from validator source and explicitly distinguishes public-BEL coverage from private-BEL coverage. No code change.

2. **No backwards-compatibility shims**: documentation-only correction. The validator behavior is the source of truth and is correct; the contract just needs to surface what the validator enforces.

## Verification Layers

1. **Contract documents the trigger conditions** -> codebase grep-proof: `grep -nE "supersedes a status record|status-supersession|STSTAT.*supersede" .claude/skills/_shared-templates/story-state-contract.md` returns the documented trigger condition lines.

2. **Contract documents the public-BEL distinction** -> codebase grep-proof: `grep -nE "PUBLIC_BEL_VISIBILITIES|public.*BEL|public/shared/factional/rumored" .claude/skills/_shared-templates/story-state-contract.md` returns the documented enumeration.

3. **Cross-reference parity with FOUNDATIONS §Story Bundles §6a** -> manual review: the contract's amended subsection explicitly names FOUNDATIONS §Story Bundles §6a as the authoritative belief-vs-fact rule and frames itself as the validator-level discharge requirement for that rule.

4. **Validator behavior unchanged** -> manual review: `tools/validators/src/structural/expected-witness-coverage.ts` is not touched. `cd tools/validators && npm test` passes unchanged.

## What to Change

### 1. `.claude/skills/_shared-templates/story-state-contract.md` — new subsection

Add a subsection (logical home: after §5a.2 as §5a.3, or alongside §7 gate-7 commentary) titled "Witness Trigger Conditions and Public BEL Requirement" that:

- Names the four trigger conditions that activate `expected_witness_coverage` (creates a public BEL; creates a public DA; creates or supersedes a STENT; supersedes a STSTAT for an entity other than the actor). Cite the validator file and function as the authoritative source.
- States that the `PUBLIC_BEL_VISIBILITIES` set is `{public, shared, factional, rumored}` and that private/concealed/suppressed BEL records do NOT count for coverage even when their `holder` is a direct witness.
- States the two lawful discharge paths when the validator activates: (a) at least one public-visibility BEL covering every direct witness (either as holder or via `holder: public` / `holder: group:direct_witnesses`); OR (b) one non-propagation fact per archived SCAUD-005's legal group labels whose `records[]` contains every direct witness.
- Cross-references FOUNDATIONS §Story Bundles §6a as the belief-vs-fact rule this validator-level requirement implements.

Suggested skeleton wording (final text decided at implementation):

> ### Witness Trigger Conditions and Public BEL Requirement
>
> The `expected_witness_coverage` validator (authoritative source: `tools/validators/src/structural/expected-witness-coverage.ts`) activates for an `SE` record when ANY of these conditions holds:
>
> 1. The event creates a `BEL` with `visibility ∈ {public, shared, factional, rumored}`.
> 2. The event creates a `DA` with `circulation ∈ {public, factional}`.
> 3. The event creates or supersedes an active `STENT`.
> 4. The event supersedes an `STSTAT` for an entity other than the event's `actor` (typical case: relocations, life-or-agency changes, status revisions of non-actor cast).
>
> When active, the validator computes the direct-witness group as every entity alive and free at the actor's `STSTAT.location` (excluding the actor). Each direct witness must be discharged either by (a) a public-visibility BEL (`visibility ∈ {public, shared, factional, rumored}`) whose `holder` matches the witness (or is `public` / `group:direct_witnesses`), OR (b) a `SE.non_propagation_facts[]` entry whose `group` is a legal label per §5a.2 and whose `records[]` contains every direct witness.
>
> **Private BEL records do not count for coverage** even when they cover the same holder semantically. A private interior belief satisfies FOUNDATIONS §Story Bundles §6a (Belief vs Fact); it does not discharge witness coverage when one of the four trigger conditions is in the state delta. The two layers are intentionally orthogonal: §6a covers WHAT is recorded; the witness-coverage validator covers WHETHER recorded coverage is publicly observable.
>
> When the action is a status-supersession (condition 4) of a non-actor entity but no external observation of that entity by the direct-witness group is plausible (the entity's interior belief is the only registered effect), use a non-propagation fact with `reason: event_leaves_no_accessible_trace` to explicitly assert no public propagation. This is the lawful pattern for relocations and interior-state-only events.

### 2. `.claude/skills/branching-story-turn-cycle/SKILL.md`

Add a one-line cross-reference in the Phase 4-5 reference description or in the page-2 phase guidance: "When the state delta supersedes a non-actor STSTAT, expected_witness_coverage activates — see `_shared-templates/story-state-contract.md` §5a.3 (Witness Trigger Conditions)."

### 3. `.claude/skills/branching-story-bootstrap/SKILL.md`

Same one-line cross-reference if the bootstrap phase that creates the genesis SE record can supersede a non-actor STSTAT (typically rare at bootstrap but lawful).

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — add Witness Trigger Conditions subsection)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — add cross-reference)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — add cross-reference)

## Out of Scope

- Changing `expected-witness-coverage.ts` behavior or thresholds. The validator is correct.
- Changing the BEL schema's `visibility` enum. The public/private distinction is enforced at validation time, not at schema level.
- Adding a runtime "would-this-trigger" preview to skills. Authors can check the four conditions against their drafted state delta during Phase 4-5.
- Auditing historical SE records that may not have triggered the validator (e.g., the prior red-bunny pages with no non-actor STSTAT supersession). Those events validated under the same code path and passed; this ticket does not retroactively re-evaluate them.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "expected_witness_coverage|Witness Trigger Conditions|PUBLIC_BEL_VISIBILITIES|status-supersession" .claude/skills/_shared-templates/story-state-contract.md` returns the documented subsection.
2. `grep -n "Witness Trigger Conditions" .claude/skills/branching-story-turn-cycle/SKILL.md` returns the cross-reference line.
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
