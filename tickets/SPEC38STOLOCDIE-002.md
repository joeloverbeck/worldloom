# SPEC38STOLOCDIE-002: Amend story-state-contract §4.5.10 with DA semantics commentary

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies `.claude/skills/_shared-templates/story-state-contract.md`
**Deps**: SPEC38STOLOCDIE-001

## Problem

The DA schema is defined at `story-record-schemas.md` §4.5.10 (12 fields, lines 554-571) but `story-state-contract.md` carries no rule-of-use commentary explaining how the fields compose. Consumers cannot deduce from the schema alone that `truth_relation: true` requires branch/canon support, that `circulation: public|factional` triggers `expected_witness_coverage`, that claims inside a DA do not propagate to SF/CF automatically, or that `derived_from: [DA-N]` is cross-namespace ambiguous between story-local and world-level DA. This ticket adds a 5-point commentary block adjacent to or cross-referencing §4.5.10 without modifying the schema definition itself.

## Assumption Reassessment (2026-05-17)

1. Verified `.claude/skills/_shared-templates/story-state-contract.md` exists and contains the predicate DSL at §5 line 140 (`artifact_accessible(STENT-<integer>, DA-<integer>)`) and the BEL access-route enum context at §4.1 (per brainstorm agent quote of `direct_observation | testimony | document | object_trace | location_trace | inference | surveillance | institutional_channel | magic_tech | rumor | authorial_initialization`).
2. Verified SPEC-38 §D2 prescribes a commentary block — not schema changes. The schema definition itself lives in `story-record-schemas.md` and is explicitly out of scope here; this ticket touches only the contract's commentary surface.
3. Cross-skill boundary: `story-state-contract.md` is the canonical contract consumed by all 7 story-pipeline skills + commitment-block-authoring; the new commentary subsection must remain backwards-compatible with their existing reads. The commentary is additive — no existing prose is removed or contradicted.
4. FOUNDATIONS principles motivating this ticket: §Story Bundles §5b Schema-Minimalism (commentary, not schema changes); §Story Bundles §6a Belief vs. Fact (DA claim vs reader belief distinction); §Story Bundles §6b Information / Observer Firewall (propagation discipline).

## Architecture Check

1. Commentary subsection (cleaner than schema field additions): per SPEC-38 §Out of Scope, all proposed schema changes (`source_world_artifact`, `carrier_object`, `body_mode`, structured `claims[]`) are deferred. The schema-minimalism doctrine at §Story Bundles §5b forbids fields that aren't load-bearing for validation/replay/predicates/fork/audit; rules-of-use commentary is the missing piece the schema cannot carry without ambiguity, and it lives in the contract surface rather than the schema surface.
2. No backwards-compatibility shims; commentary is additive.

## Verification Layers

1. Commentary block present with all 5 rule-of-use points → codebase grep-proof: `grep -nE 'truth_relation.*relation.*content|circulation.*access.*distribution|claims.*DO NOT|expected_witness_coverage|derived_from.*ambiguous' .claude/skills/_shared-templates/story-state-contract.md`.
2. Cross-reference to `da-authoring-reference.md` present → codebase grep-proof: `grep -n 'da-authoring-reference\.md' .claude/skills/_shared-templates/story-state-contract.md` returns ≥1 match.
3. No DA schema fields added or removed → codebase grep-proof: `grep -cE 'truth_relation: (true|false|partly_true|unknown|contested|branch_counterfactual|future_contingent)' .claude/skills/_shared-templates/story-record-schemas.md` returns the same baseline (the field enum lives in `story-record-schemas.md` and is unchanged).
4. Single-layer ticket: documentation-only; verification is grep-based.

## What to Change

### 1. Add §4.5.10a commentary block

Insert a new subsection adjacent to §4.5.10 (placement chosen to match contract structure) covering the 5 rule-of-use points per SPEC-38 §D2:

1. `truth_relation` is the relation of artifact CONTENT to branch/canon truth — NOT reader belief. Reader belief lives in `BEL.belief_mode` and `BEL.truth_relation`.
2. `circulation` is artifact access/distribution state — NOT intended audience. `intended_audience` is who the artifact was meant for; `circulation` is who can actually access or receive it now.
3. Claims inside a DA do NOT become `SF` or `CF` automatically. Promotion to canon routes through `story-fact-promotion-to-canon` → `canon-addition`. Branch-truth establishment about DA content uses `SF` records that may cite the DA in `derived_from` but stand on independent branch evidence.
4. `circulation ∈ {public, factional}` triggers `expected_witness_coverage` enforcement: same-event BEL propagation through an indirect access route (one of `document | object_trace | location_trace | rumor | surveillance | institutional_channel | magic_tech`), OR the `non_propagation:event_leaves_no_accessible_trace(group=<label>, records=[DA-<N>])` tag in `SE.world_logic_rationale`.
5. `derived_from: [DA-N]` is cross-namespace ambiguous between world-level (`worlds/<slug>/diegetic-artifacts/DA-N.md`) and story-local (`worlds/<slug>/stories/<story>/_source/artifacts/DA-N.yaml`) namespaces. Until namespace resolution ships, prefer body annotation ("derived from world-level Council Edict DA-12") over `derived_from` for cross-namespace references.

### 2. Cross-reference da-authoring-reference.md

Include a one-line cross-reference to `.claude/skills/_shared-templates/da-authoring-reference.md` for the full triage rubric and decision matrix — the commentary stays terse and points readers at the canonical rubric.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)

## Out of Scope

- DA schema field additions or removals (deferred per SPEC-38 §Out of Scope; ticket 001 lists the four deferred fields)
- Schema changes to BEL, STOBJ, SF, CF, or any other story-bundle record class
- Modifications to `story-record-schemas.md` §4.5.10 schema definition itself
- Reorganization of `story-state-contract.md`'s existing section structure (commentary is additive)

## Acceptance Criteria

### Tests That Must Pass

1. Commentary block exists in `story-state-contract.md` with all 5 rule-of-use points.
2. Cross-reference to `da-authoring-reference.md` is present (`grep` returns ≥1 match).
3. No DA schema fields added or removed in `story-record-schemas.md` §4.5.10 (baseline field count unchanged: 12 fields per brainstorm agent quote of lines 554-571).

### Invariants

1. The commentary lives in `story-state-contract.md` (rules-of-use surface), not in `story-record-schemas.md` (schema definition surface).
2. No schema field additions or removals; commentary-only.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-based against post-implementation file content and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'truth_relation|circulation|expected_witness_coverage|non_propagation' .claude/skills/_shared-templates/story-state-contract.md`
2. `grep -n 'da-authoring-reference' .claude/skills/_shared-templates/story-state-contract.md`
3. Cross-validation against unchanged schema: `grep -c '^  ' .claude/skills/_shared-templates/story-record-schemas.md` baseline preserved (sanity check that §4.5.10 was not edited).
