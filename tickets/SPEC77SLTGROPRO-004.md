# SPEC77SLTGROPRO-004: turn-cycle Phase 2.1 compatible-driver filter (standalone)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` with a new Phase 2.1 sub-section documenting the driver-kind compatibility filter and the responsibility-split prose
**Deps**: archive/tickets/SPEC77SLTGROPRO-001.md

## Problem

SPEC-76 landed the `SE.turn_driver.kind` enum and the Phase 0 driver evaluation in `branching-story-turn-cycle`. SPEC-77's Slice D operationalizes the schema's promise — once the new `SLT.grounding.compatible_turn_drivers[]` field is required (SPEC77SLTGROPRO-001), Phase 2 must filter the author-pool SLT candidates by driver-kind compatibility at selection time, and runtime_jit SLTs must be created with a singleton-kind matching the resolved `SE.turn_driver.kind`. Without the filter, the schema field is documented but unenforced at runtime: a `pursuit`-pattern SLT declaring `compatible_turn_drivers: [npc_action, offstage_action]` could still be selected on a `clock_fire`-driven turn, defeating the structural compatibility promise the schema makes.

The reassessed SPEC-77 §3.5 names the rejection site explicitly: `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` — the existing Phase 2/3 reference file is where the new Phase 2.1 sub-section lands, alongside the Phase 2 commitment-block selection prose it refines. The reassessment also documented the responsibility split with SPEC77SLTGROPRO-002's validator: the storage-time validator enforces only length-1 on runtime_jit `compatible_turn_drivers`; the selection-time filter (this ticket) enforces the singleton-VALUE match against `SE.turn_driver.kind`.

## Assumption Reassessment (2026-05-23)

1. `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` exists at HEAD (verified during `/reassess-spec` session). The file currently documents Phase 2 commitment-block selection mechanics including the bind-then-instantiate step and the existing observer-firewall integration. Phase 2.1 is a new sub-section appended within or after the Phase 2 prose, positioned such that the driver-kind compatibility filter reads as a sub-step of Phase 2's selection logic.
2. SPEC-77 §3.5 (post-reassess-spec) specifies the Phase 2.1 filter mechanism (filter author-pool SLT candidates by `SLT.grounding.compatible_turn_drivers[]` containing the current `SE.turn_driver.kind`) and the responsibility-split prose (singleton-LENGTH validated by `slt_grounding_runtime_jit_driver_kind_singleton` at storage time; singleton-VALUE match enforced by Phase 2.1 at selection time). SPEC-76's `turn_driver.kind` enum (`player_action | player_write_in | npc_action | offstage_action | world_pressure | clock_fire | secret_reveal | multi_actor_collision`) is the byte-for-byte source for the filter values.
3. Cross-skill boundary: this ticket amends `branching-story-turn-cycle`'s Phase 2/3 reference. The skill is a Story-Pipeline (Category 2c) skill per FOUNDATIONS §Story Bundles §7. The filter mechanism is documented in the reference file (this ticket); runtime-side enforcement lives in the skill's actual Phase 2 implementation which an implementer of the reference file's prose will encode at skill-invocation time (the reference file is the contract; the skill body consumes the contract). The validator at SPEC77SLTGROPRO-002 enforces storage-time singleton-length; this ticket's filter enforces selection-time singleton-value-match — the two-surface responsibility split is named in the reference prose so a future operator reading either surface sees the full picture.
4. FOUNDATIONS §Story Bundles §5c (Present Causal State, Not Narrative Shape) at `docs/FOUNDATIONS.md:660-666`, specifically the "Driver salience is local" paragraph extended by SPEC-78: driver selection is a prior local-salience-ranking pass before SLT selection. Phase 2.1 operationalizes this — the compatibility filter is a local salience-narrowing pass (excluding SLTs whose `compatible_turn_drivers` does not include the resolved `SE.turn_driver.kind`), not a global narrative-shape planner. The filter composes with the nine shared hard gates (`_shared-templates/story-state-contract.md` §7) — it narrows the eligible pool before §7's gates run, preserving the local-salience-then-hard-gates architecture.

## Architecture Check

1. **Why a documented filter in the reference file rather than only validator-side enforcement**: the validator (SPEC77SLTGROPRO-002) enforces storage-time invariants; selection-time filtering is a runtime concern that lives in the skill's Phase 2 logic. Documenting the filter in the Phase 2/3 reference makes the selection-time contract visible at the surface where Phase 2 is specified, preventing future operators from missing the compatibility check when reading the skill's existing prose.
2. **Why the responsibility split is documented explicitly**: per the reassess-spec Q3=(a) resolution, the singleton-value match (runtime_jit's stored singleton matching `SE.turn_driver.kind`) is NOT validator-enforced — it is Phase 2.1's responsibility because Phase 2 creates the JIT from the resolved driver kind, so a stored mismatch would require Phase 2 to be buggy. Adding a cross-record validator for the match would over-couple the validator to SE/PG retrieval; documenting the split in skill prose preserves audit-trail clarity without the over-coupling cost.
3. **Why Phase 2.1 rather than a separate Phase**: numbering as a sub-step (2.1) signals that the filter is a refinement of Phase 2's selection logic, not an independent phase that could be re-ordered. The phase-numbering convention also makes the existing Phase 2 prose forward-compatible — future sub-steps (2.2, 2.3) can be added without renumbering the established Phase 3.
4. No backwards-compatibility aliasing/shims introduced — skill reference prose change only; no skill-level behavior change beyond enforcing the new schema field's contract at selection time.

## Verification Layers

1. **Reference file documents Phase 2.1 filter mechanism** → codebase grep-proof: `grep -n 'Phase 2.1\|compatible_turn_drivers' .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` returns the new sub-section + the filter mechanic.
2. **Responsibility-split prose documents both surfaces** → codebase grep-proof: `grep -n 'slt_grounding_runtime_jit_driver_kind_singleton\|singleton-length\|singleton-value' .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` returns the validator-name cross-reference and the singleton-length-vs-singleton-value distinction.
3. **Filter values match the SPEC-76 enum byte-for-byte** → codebase grep-proof: the 8 driver-kind values cited in the Phase 2.1 prose match `tools/validators/src/schemas/story-event.schema.json`'s `turn_driver.kind` enum (the same 8 values introduced by SPEC-76 and reused by SPEC77SLTGROPRO-001's schema change).
4. **FOUNDATIONS §Story Bundles §5c alignment** → FOUNDATIONS alignment check: Phase 2.1 is a local-salience-narrowing pass (excluding incompatible SLTs), not a global narrative-shape planner; the prose explicitly cites this composition with the nine shared hard gates.

## What to Change

### 1. Phase 2.1 sub-section — `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md`

Append a new sub-section within the existing Phase 2 prose (or immediately after, before Phase 3 begins). The exact insertion point should preserve the file's existing structure — locate the Phase 2 commitment-block selection prose, find the natural end of the bind-then-instantiate step, and insert Phase 2.1 as a refinement before any Phase 3 prose begins.

**Recommended content** (adapted from SPEC-77 §3.5):

```markdown
### Phase 2.1: Driver-kind compatibility filter

When `SE.turn_driver.kind` is set (every `turn_resolution` event per SPEC-76), Phase 2's selection pass first filters the author-pool SLT candidates by `SLT.grounding.compatible_turn_drivers[]` containing the resolved driver kind. SLTs without a matching compatible driver are excluded from selection before any further salience ranking, predicate eligibility checks, or alias binding. This is a local-salience-narrowing pass per FOUNDATIONS §Story Bundles §5c ("Driver salience is local") — it composes with the nine shared hard gates (`_shared-templates/story-state-contract.md` §7) which run on the narrowed eligible pool.

A `runtime_jit`-origin SLT created at Phase 2 must declare its `compatible_turn_drivers` as `[<the kind matching the current SE.turn_driver.kind>]` — singleton.

**Responsibility split with `slt_grounding_minimal_integrity` (SPEC-77 §3.4)**: the validator enforces singleton-LENGTH at storage time via the `slt_grounding_runtime_jit_driver_kind_singleton` code — a `runtime_jit` SLT with `compatible_turn_drivers.length > 1` fails the storage-time gate. The validator does NOT enforce singleton-VALUE match — i.e., that the stored singleton equals the resolved `SE.turn_driver.kind` for the SE the JIT was created against. The match is enforced by this Phase 2.1 filter at selection time: a stored-singleton-value mismatch surfaces as a Phase 2.1 selection rejection (the JIT becomes ineligible for selection because its `compatible_turn_drivers` does not contain the current driver kind). This responsibility split is intentional — Phase 2 creates the JIT from the resolved `SE.turn_driver.kind`, so the stored mismatch shape is structurally improbable; adding a cross-record validator for it would over-couple the validator to SE/PG retrieval. The runtime side is Phase 2.1; the schema side is `slt_grounding_runtime_jit_driver_kind_singleton`.
```

The 8 driver-kind values referenced in the filter (`player_action | player_write_in | npc_action | offstage_action | world_pressure | clock_fire | secret_reveal | multi_actor_collision`) match the SPEC-76 enum byte-for-byte — preserve the spelling and order exactly.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` (modify)

## Out of Scope

- The schema change at `tools/validators/src/schemas/story-storylet.schema.json` (covered by SPEC77SLTGROPRO-001). This ticket assumes the schema field exists; the filter reads from it.
- The validator at `tools/validators/src/structural/slt-grounding-minimal-integrity.ts` (covered by SPEC77SLTGROPRO-002). This ticket's prose cross-references the validator's singleton-length code by name but does not implement it.
- The commitment-block-authoring Phase 4 amendment (covered by `archive/tickets/SPEC77SLTGROPRO-003.md`). That skill amendment is the authoring-time complement to this skill's selection-time filter.
- Implementation of the Phase 2.1 filter logic in the skill body itself (the reference file is the contract; the skill body that consumes it at runtime is a separate operator-time concern when the skill is invoked).
- Any changes to Phase 0 (driver evaluation) or Phase 3 (state delta) — Phase 2.1 is positioned as a Phase 2 sub-step refinement; the surrounding phases are untouched.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'Phase 2.1' .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` returns the new sub-section heading.
2. `grep -n 'compatible_turn_drivers' .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` returns the filter-mechanic description with the field name.
3. `grep -n 'slt_grounding_runtime_jit_driver_kind_singleton' .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` returns the responsibility-split prose's validator-name cross-reference.
4. `grep -nE 'player_action|npc_action|offstage_action|clock_fire' .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` returns the driver-kind values in the new Phase 2.1 prose.

### Invariants

1. **Filter is a local-salience pass, not a global planner** — Phase 2.1 narrows the eligible author-pool by driver-kind compatibility before further selection logic; it does not look ahead to a target narrative shape per FOUNDATIONS §Story Bundles §5c.
2. **Responsibility split is documented at both surfaces** — singleton-length is the validator's concern (SPEC77SLTGROPRO-002 at storage time); singleton-value match is Phase 2.1's concern (this ticket at selection time). The split is named in the reference prose so a future operator sees the full picture at either surface.
3. **Driver-kind enum byte-for-byte match with SPEC-76** — the 8 values cited in Phase 2.1 match `story-event.schema.json`'s `turn_driver.kind` enum verbatim; no paraphrasing or reordering.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'Phase 2.1|compatible_turn_drivers|slt_grounding_runtime_jit' .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` — confirms all three required cross-references are present in the new sub-section.
2. `grep -cE 'player_action|player_write_in|npc_action|offstage_action|world_pressure|clock_fire|secret_reveal|multi_actor_collision' .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` — confirms the 8 driver-kind values appear in the file (expected count ≥8; existing Phase 0 prose may already cite them, so the count is a floor).
