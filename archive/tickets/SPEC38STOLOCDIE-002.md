# SPEC38STOLOCDIE-002: Amend story-state-contract §4.5.10 with DA semantics commentary

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies `.claude/skills/_shared-templates/story-state-contract.md`; truths `specs/SPEC-38-story-local-diegetic-artifact-authoring.md`
**Deps**: archive/tickets/SPEC38STOLOCDIE-001.md

## Problem

At intake, the DA schema was defined at `story-record-schemas.md` §4.5.10 (12 fields) but `story-state-contract.md` carried no rule-of-use commentary explaining how the fields compose. Consumers could not deduce from the main contract alone that `truth_relation: true` requires branch/canon support, that `circulation: public|factional` triggers `expected_witness_coverage`, that claims inside a DA do not propagate to SF/CF automatically, or that `derived_from: [DA-N]` is cross-namespace ambiguous between story-local and world-level DA. This ticket added a 5-point commentary block in `story-state-contract.md` without modifying the schema definition itself.

## Assumption Reassessment (2026-05-17)

1. Verified `.claude/skills/_shared-templates/story-state-contract.md` exists and contains the predicate DSL at §5 (`artifact_accessible(STENT-<integer>, DA-<integer>)`). The live §4 is a navigational pointer to the split schema file, so the DA schema authority remains `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.10.
2. Verified SPEC-38 §D2 prescribes a commentary block — not schema changes. The schema definition itself lives in `story-record-schemas.md` and remained unchanged; this ticket touched only the contract's commentary surface plus a dated SPEC-38 implementation note.
3. Cross-skill boundary: `story-state-contract.md` is the canonical contract consumed by all 7 story-pipeline skills + commitment-block-authoring; the new commentary subsection must remain backwards-compatible with their existing reads. The commentary is additive — no existing prose is removed or contradicted.
4. FOUNDATIONS principles motivating this ticket: §Story Bundles §5b Schema-Minimalism (commentary, not schema changes); §Story Bundles §6a Belief vs. Fact (DA claim vs reader belief distinction); §Story Bundles §6b Information / Observer Firewall (propagation discipline).

## Architecture Check

1. Commentary subsection (cleaner than schema field additions): per SPEC-38 §Out of Scope, all proposed schema changes (`source_world_artifact`, `carrier_object`, `body_mode`, structured `claims[]`) are deferred. The schema-minimalism doctrine at §Story Bundles §5b forbids fields that aren't load-bearing for validation/replay/predicates/fork/audit; rules-of-use commentary is the missing piece the schema cannot carry without ambiguity, and it lives in the contract surface rather than the schema surface.
2. No backwards-compatibility shims; commentary is additive.

## Verification Layers

1. Commentary block present with all 5 rule-of-use points → codebase grep-proof: `grep -nE 'truth_relation.*relation.*artifact content|circulation.*access.*distribution|Claims inside a .DA. do not become|expected_witness_coverage|derived_from: \[DA-N\].*ambiguous' .claude/skills/_shared-templates/story-state-contract.md`.
2. Cross-reference to `da-authoring-reference.md` present → codebase grep-proof: `grep -n 'da-authoring-reference\.md' .claude/skills/_shared-templates/story-state-contract.md` returns ≥1 match.
3. No DA schema fields added or removed → codebase grep-proof over `git diff -- .claude/skills/_shared-templates/story-record-schemas.md` returns no diff.
4. Single-layer ticket: documentation-only; verification is grep-based.

## Landed Changes

### 1. Add §4.5.10a commentary block

Inserted `story-state-contract.md` §4.5.10a adjacent to the §4 schema pointer. The block covers the 5 rule-of-use points per SPEC-38 §D2:

1. `truth_relation` is the relation of artifact CONTENT to branch/canon truth — NOT reader belief. Reader belief lives in `BEL.belief_mode` and `BEL.truth_relation`.
2. `circulation` is artifact access/distribution state — NOT intended audience. `intended_audience` is who the artifact was meant for; `circulation` is who can actually access or receive it now.
3. Claims inside a DA do NOT become `SF` or `CF` automatically. Promotion to canon routes through `story-fact-promotion-to-canon` → `canon-addition`. Branch-truth establishment about DA content uses `SF` records that may cite the DA in `derived_from` but stand on independent branch evidence.
4. `circulation ∈ {public, factional}` triggers `expected_witness_coverage` enforcement: same-event BEL propagation through an indirect access route (one of `document | object_trace | location_trace | rumor | surveillance | institutional_channel | magic_tech`), OR the `non_propagation:event_leaves_no_accessible_trace(group=<label>, records=[DA-<N>])` tag in `SE.world_logic_rationale`.
5. `derived_from: [DA-N]` is cross-namespace ambiguous between world-level (`worlds/<slug>/diegetic-artifacts/DA-N.md`) and story-local (`worlds/<slug>/stories/<story>/_source/artifacts/DA-N.yaml`) namespaces. Until namespace resolution ships, prefer body annotation ("derived from world-level Council Edict DA-12") over `derived_from` for cross-namespace references.

### 2. Cross-reference da-authoring-reference.md

Included a one-line cross-reference to `.claude/skills/_shared-templates/da-authoring-reference.md` for the full triage rubric, decision matrix, field-semantics tables, and patch obligations.

### 3. Truth SPEC-38 handoff

Added a dated implementation note under SPEC-38 §D2 stating that ticket 002 landed the commentary as `story-state-contract.md` §4.5.10a while leaving the DA schema definition in `story-record-schemas.md` §4.5.10.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `specs/SPEC-38-story-local-diegetic-artifact-authoring.md` (modify)

## Out of Scope

- DA schema field additions or removals (deferred per SPEC-38 §Out of Scope; ticket 001 lists the four deferred fields)
- Schema changes to BEL, STOBJ, SF, CF, or any other story-bundle record class
- Modifications to `story-record-schemas.md` §4.5.10 schema definition itself
- Reorganization of `story-state-contract.md`'s existing section structure (commentary is additive)

## Acceptance Criteria

### Tests That Must Pass

1. Commentary block exists in `story-state-contract.md` with all 5 rule-of-use points.
2. Cross-reference to `da-authoring-reference.md` is present (`grep` returns ≥1 match).
3. No DA schema fields added or removed in `story-record-schemas.md` §4.5.10 (schema file has no diff).

### Invariants

1. The commentary lives in `story-state-contract.md` (rules-of-use surface), not in `story-record-schemas.md` (schema definition surface).
2. No schema field additions or removals; commentary-only.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-based against post-implementation file content and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'truth_relation.*relation.*artifact content|circulation.*access.*distribution|Claims inside a .DA. do not become|expected_witness_coverage|derived_from: \[DA-N\].*ambiguous' .claude/skills/_shared-templates/story-state-contract.md`
2. `grep -n 'da-authoring-reference' .claude/skills/_shared-templates/story-state-contract.md`
3. Cross-validation against unchanged schema: `git diff -- .claude/skills/_shared-templates/story-record-schemas.md` returns no diff.

## Outcome

Completed: 2026-05-17

What changed:
- Added `story-state-contract.md` §4.5.10a with additive DA rule-of-use commentary for `truth_relation`, `circulation`, DA claim authority, public/factional propagation, and cross-namespace `derived_from: [DA-N]` ambiguity.
- Added the concrete cross-reference to `.claude/skills/_shared-templates/da-authoring-reference.md`.
- Added a dated SPEC-38 §D2 implementation note so the active spec records this slice as landed without rewriting historical proposal prose.

Deviations from original plan:
- The live `story-state-contract.md` §4 is a pointer to `story-record-schemas.md`, not the schema body itself, so the commentary landed as §4.5.10a next to the pointer. The DA schema definition remains unchanged in `story-record-schemas.md` §4.5.10.
- The drafted schema sanity command was replaced with a direct `git diff -- story-record-schemas.md` no-diff proof because the drafted broad grep counted unrelated enum appearances and did not prove field preservation.

## Verification Result

Commands run:

```bash
grep -nE 'truth_relation.*relation.*artifact content|circulation.*access.*distribution|Claims inside a .DA. do not become|expected_witness_coverage|derived_from: \[DA-N\].*ambiguous' .claude/skills/_shared-templates/story-state-contract.md
```

Result: matched all five rule-of-use anchors in §4.5.10a.

```bash
grep -n 'da-authoring-reference\.md' .claude/skills/_shared-templates/story-state-contract.md
```

Result: matched the concrete shared-reference link.

```bash
git diff -- .claude/skills/_shared-templates/story-record-schemas.md
```

Result: no output; the DA schema file was not modified.
