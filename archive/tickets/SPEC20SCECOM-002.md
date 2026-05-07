# SPEC20SCECOM-002: Phase 5 — Arc-Level State Mutation at Arc-Close

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md` extended with §Arc-Level Effect Application; existing Phase 2-derived op-generation prose retained only for legacy v1 records (which do not exist post-cutover).
**Deps**: `archive/tickets/SPEC20SCECOM-001.md` (variant must be selected before its required_effects can be applied); `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (op-generation maps to existing SE.op_type vocabulary owned by patch-engine; closed effect-type enum implementation in canonical-vocabularies)

## Problem

At intake, Phase 5 applied state mutations at beat granularity — consuming Phase 2's `facts_created/invalidated`, `obligations_*`, `intentions/threads pressure deltas`, and `required_aftermath` per beat-render. Under the scene-commitment-arc pivot, the unit of state transition is the arc, not the beat. Phase 5 now documents that it applies the chosen variant's `required_effects[]` as ONE batch at arc-close. SPEC-20 §C specifies the op-generation mapping (effect-type → SE.op_type) and the Branch-isolation invariant that ARC_TRACE records must respect.

## Assumption Reassessment (2026-05-07)

1. Verified `.claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md` exists and currently houses Phase 2-derived op-generation prose; the §Arc-Level Effect Application section is additive (existing prose retained as a deprecated path comment because no legacy v1 records survive the cutover per SPEC-22 §Track 5 Migration).
2. Verified archived SPEC-19 §A (`archive/specs/SPEC-19-scene-commitment-arc-schema.md`) defines `effect_model.variants[].required_effects[].type` as a closed enum (`relationship_axis_shift | thread_pressure_delta | obligation_status_change | fact_create | fact_invalidate | consequence_open | consequence_address | cast_change | location_change | mystery_progress`); SPEC-22 §Track 2 owns the `effect_model_legality` validator that enforces this enum at Phase 9.
3. Cross-skill boundary: this ticket consumes the chosen variant from SPEC20SCECOM-001 (Phase 4b) and produces SE.ops entries that the patch-engine applies at Phase 11. SE.op_type vocabulary is owned by archived SPEC-03 (patch-engine) — no SE.op_type extensions are introduced by this ticket; the mapping is from closed `required_effects.type` enum to existing SE.op_type values.
4. FOUNDATIONS Rule 5 (No Consequence Evasion) — renumbered from template item 4: arc-level effects MUST be applied at arc-close; the runtime cannot silently elide an arc's `required_effects` without failing `effect_model_replay_safety`. Documented in this ticket's §Branch-isolation invariant + SE.op_type mapping table.
5. HARD-GATE discipline checked because this ticket changes page-cycle skill-reference semantics for story-bundle `_source` record generation. The change does not weaken Phase 4.5 canon-promotion or Phase 10 approval; it documents the Phase 5 source-of-truth for the future patch plan that Phase 11 submits.
6. Parent `.claude/skills/branching-story-page-cycle/SKILL.md` still contains v1 Phase 5 summary prose. That stale summary is explicitly owned by active follow-up `tickets/SPEC20SCECOM-009.md`, so this ticket leaves it untouched and updates only the Phase 5 reference file.
7. Dirty worktree ledger: initial dirty path `.claude/skills/spec-to-tickets/SKILL.md` is unrelated to SPEC-20 page-cycle Phase 5 and was left untouched.

## Architecture Check

1. Applying effects at arc-close (one batch per page) is structurally cleaner than applying per-beat (N batches per page) because the arc IS the unit of state transition under the scene-commitment-arc pivot — applying per-beat would re-introduce the beat-cadence agency theater that the pivot eliminates. Beat-internal mutations are not authoritative for replay (per SPEC20SCECOM-001 §Replay-equality contract); applying them as engine ops would create a write/read asymmetry.
2. No backwards-compatibility aliasing/shims: v1 Phase 2-derived per-beat op-generation is retired; the prose is retained ONLY as a comment naming the deprecated path for future readers, not as an active code path. Post-cutover (SPEC-22 §Track 5 discards the test bundle), no v1 records survive.

## Verification Layers

1. SE.op_type mapping table (effect-type → SE.op_type) → codebase grep-proof in `phase-5-state-mutation.md` for the table; cross-check that every closed effect-type enum value maps to ≥1 existing SE.op_type.
2. Branch-isolation invariant (every non-PG emergent record carries `created_at_page == this_PG`; ARC_TRACE records also carry `created_at_page`) → codebase grep-proof in the same reference file for the invariant text; validator surface is `recursive_reference_closure` (existing Phase 9 gate, extended for ARC_TRACE references in SPEC20SCECOM-004).
3. STINT updates after variant ops apply → codebase grep-proof for the section preserving the existing STINT-refresh logic.
4. Replay-equality at arc cadence → schema validation via SPEC-22's `effect_model_replay_safety` validator (cross-spec dependency); this ticket's surface is documentation; full validation owned by SPEC20SCECOM-011 capstone.

## Landed Changes

### 1. §Arc-Level Effect Application

In `.claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md`, added a new top-level section §Arc-Level Effect Application immediately above the existing Phase 2-derived prose. Body documents:

- Phase 5 applies the chosen variant's `required_effects[]` (per SPEC20SCECOM-001 §Phase 4b) as one batch at arc-close.
- Op generation: each entry in `variants[<chosen>].required_effects[]` maps to one or more `SE.ops` entries per the table below (closed `op_type` enum preserved).

| `required_effects.type` | `SE.op_type` |
|---|---|
| `relationship_axis_shift` | `relationship_supersede` |
| `thread_pressure_delta` | `thread_supersede` |
| `obligation_status_change` | `obligation_pay_off` / `obligation_complicate` / `obligation_supersede` (per status target) |
| `fact_create` | `fact_create` |
| `fact_invalidate` | `fact_invalidate` |
| `consequence_open` | `consequence_open` |
| `consequence_address` | `consequence_address` |
| `cast_change` | `cast_change` |
| `location_change` | `location_change` |
| `mystery_progress` | (no op — recorded via `mystery_safety.M_progressed[]` on a new SF or the page's `state_snapshot`) |

### 2. STINT updates preserved

Documented that per-character intention refresh runs after the variant ops apply (existing Phase 5 logic preserved) — STINT updates are NOT part of `required_effects` and remain a deterministic engine-side step.

### 3. Branch-isolation invariant

Added prose stating: every non-PG emergent record carries `created_at_page == this_PG`. ARC_TRACE records (Phase 7.6 — SPEC20SCECOM-004) also carry `created_at_page`. The recursive reference closure validator (Phase 9 gate 3, extended in SPEC20SCECOM-009) enforces.

### 4. Deprecation of Phase 2-derived per-beat op-generation

The existing Phase 2-derived prose remains in the reference file after a deprecation comment naming the legacy path; it is marked as post-cutover documentation-only because no v1 story records execute after the cutover.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md` (modify)

## Out of Scope

- SE.op_type vocabulary extensions (none — the mapping reuses existing SE.op_type values; vocabulary is owned by archived SPEC-03 patch-engine).
- `effect_model_legality` validator implementation (SPEC-22 §Track 2).
- ARC_TRACE record class (SPEC20SCECOM-004).
- PG `state_snapshot.applied_effect_variant` schema field definition (SPEC-22 §Track 4).
- Phase 11 envelope op-enumeration extension (SPEC20SCECOM-008).
- SKILL.md Phase 5 description summary update (SPEC20SCECOM-009).

## Acceptance Criteria

### Tests That Must Pass

1. Documentation proof: `phase-5-state-mutation.md` documents Phase 5 applying the chosen variant's `required_effects[]` as one arc-close batch.
2. Documentation proof: `phase-5-state-mutation.md` documents every closed effect-type value and maps it to existing `SE.op_type` vocabulary, with the intended `mystery_progress` no-op asymmetry.
3. Documentation proof: `phase-5-state-mutation.md` documents branch isolation for non-PG emergent records and ARC_TRACE `created_at_page`.

### Invariants

1. Each closed effect-type enum value maps to ≥1 existing SE.op_type (no orphan effect types).
2. `mystery_progress` effect-type produces NO direct SE.op (recorded via `mystery_safety.M_progressed[]` on the page's state_snapshot or a new SF) — this asymmetry is intentional per SPEC-19 §A.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment. Full-pipeline empirical verification owned by SPEC20SCECOM-011 capstone.

### Commands

1. `grep -n "Arc-Level Effect Application" .claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md` — confirms NEW section anchor lands.
2. `grep -nE "relationship_axis_shift|thread_pressure_delta|obligation_status_change|fact_create|fact_invalidate|consequence_open|consequence_address|cast_change|location_change|mystery_progress" .claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md` — confirms all 10 closed effect-type values are documented.
3. `grep -n "created_at_page == this_PG" .claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md` — confirms branch-isolation invariant text lands.
4. `grep -n "STINT Refresh After Variant Ops" .claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md` — confirms STINT refresh ordering lands.

## Outcome

Completed: 2026-05-07. `.claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md` now documents Phase 5 as arc-close state mutation from the chosen variant's `required_effects[]`, includes the closed effect-type to `SE.op_type` mapping table, preserves STINT refresh as deterministic engine-side follow-through after the variant ops, labels the old beat-derived input path as documentation-only after cutover, and extends branch-isolation prose to ARC_TRACE `created_at_page`.

## Verification Result

1. PASS — `grep -n "Arc-Level Effect Application" .claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md`.
2. PASS — `grep -nE "relationship_axis_shift|thread_pressure_delta|obligation_status_change|fact_create|fact_invalidate|consequence_open|consequence_address|cast_change|location_change|mystery_progress" .claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md`.
3. PASS — `grep -n "created_at_page == this_PG" .claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md`.
4. PASS — `grep -n "STINT Refresh After Variant Ops" .claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md`.
5. PASS — manual review against `specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md` §C, archived `archive/specs/SPEC-19-scene-commitment-arc-schema.md` §A/§C, and `docs/FOUNDATIONS.md` §Story Bundles §5 confirmed the landed Phase 5 prose matches the arc-level effect, replay-safety, and branch-isolation contracts.

## Deviations

1. The drafted skill dry-run / fixture replay proof was not executed because SPEC-22's v2 validators and schema implementation remain pending. This ticket's accepted proof is the documentation-surface contract; empirical fixture validation remains SPEC20SCECOM-011 capstone scope.
2. Parent `.claude/skills/branching-story-page-cycle/SKILL.md` still has v1 Phase 5 summary prose by design. Active follow-up `tickets/SPEC20SCECOM-009.md` owns the cross-cutting SKILL.md process-flow and Phase 9 gate-list update after all phase reference files land.
