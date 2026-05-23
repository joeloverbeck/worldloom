# SPEC-77 — Minimal SLT Grounding Provenance

**Status:** Draft (proposed 2026-05-23)
**Spec ID:** SPEC-77
**Depends on:** SPEC-76 (Turn-Driver Primitive — provides the closed `turn_driver.kind` enum that `compatible_turn_drivers[]` references)
**Source report:** `reports/slt-chc-overhaul-first-iteration.md` (triaged at `docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md`)

## 1. Problem

Once SPEC-76 lands, the turn-cycle can drive a turn from a non-player record (NPC action, clock fire, offstage action, world pressure). But two gaps remain at the SLT level:

1. **No structural compatibility check between a driver and an SLT.** Nothing prevents a runtime_jit SLT created for `npc_action` from being selected on a `clock_fire` turn, or a pursuit-pattern SLT from being chosen when the active driver is a secret reveal. Eligibility is checked at the predicate level, but driver-kind compatibility is not.

2. **Schema-valid SLTs can still be too generic.** The current `story-storylet.schema.json` requires move_family, preconditions, beats, exit_options, saliency, mystery_policy, provenance — but it does not require a reason the storylet exists. Authors can produce schema-valid SLTs whose presence is justified only by "dramatic variety," which is exactly what FOUNDATIONS §Story Bundles §5a forbids semantically ("a bad block says: *advance Act II*") but not yet structurally.

The source report proposed a 7-field `grounding` object on every SLT (`reason_to_exist`, `causal_pressures`, `source_records`, `actor_binding_policy`, `compatible_turn_drivers`, `stchar_axes`, `role_lanes`). Most of those duplicate existing surface (preconditions already cite source records; alias_bindings already binds actors) and fail FOUNDATIONS §5b's load-bearing test. This spec lands the **minimum-viable** subset: 2 fields.

## 2. Decision

Add a required `grounding` object to `SLT` records with exactly two fields:

```yaml
grounding:
  compatible_turn_drivers: []        # array, min 1, closed enum from SPEC-76 turn_driver.kind values
  reason_to_exist: <string>          # min length 16; banned-phrase list rejects generic justifications
```

A new validator (`slt_grounding_minimal_integrity`) enforces both fields and rejects banned generic phrases. The `commitment-block-authoring` skill is amended to require these fields at authoring time.

No other `grounding` fields are added. The 5 dropped fields (`causal_pressures`, `source_records`, `actor_binding_policy`, `stchar_axes`, `role_lanes`) and the dropped `reuse_mode` enum are documented in the triage decision record so future Claude does not silently re-propose them.

## 3. Scope

### 3.1 Schema change — `tools/validators/src/schemas/story-storylet.schema.json`

Add `grounding` to the required-fields list and to `properties`:

```yaml
required:
  - id
  - story_id
  - scope
  - title
  - move_family
  - preconditions
  - beats
  - exit_options
  - saliency
  - mystery_policy
  - provenance
  - grounding         # NEW
```

```yaml
grounding:
  type: object
  required: [compatible_turn_drivers, reason_to_exist]
  additionalProperties: false
  properties:
    compatible_turn_drivers:
      type: array
      minItems: 1
      uniqueItems: true
      items:
        type: string
        enum:
          - player_action
          - player_write_in
          - npc_action
          - offstage_action
          - world_pressure
          - clock_fire
          - secret_reveal
          - multi_actor_collision
    reason_to_exist:
      type: string
      minLength: 16
```

The `additionalProperties: false` constraint on `grounding` is intentional: it forbids the dropped fields from creeping back. To add a field later, this schema must be amended via a successor spec.

### 3.2 Shared story state contract — `.claude/skills/_shared-templates/story-state-contract.md`

Amend §4 (SLT schema canonical field list) to document `grounding.compatible_turn_drivers` and `grounding.reason_to_exist`. Cite SPEC-77 in the change note. Add an authoring guideline at §4 SLT subsection:

> An SLT's `reason_to_exist` must name the active or reusable pressure logic the storylet captures — what causal state makes it eligible, and what kind of move it represents. Generic phrases like "dramatic variety," "good conflict," "advance the plot," "raise stakes," "create tension," and "for pacing" are structurally rejected (see `slt_grounding_minimal_integrity` banned-phrase list).

### 3.3 Commitment-block-authoring skill — `.claude/skills/commitment-block-authoring/SKILL.md`

Amend Phase 4 (block-shape authoring) to:
- Require `grounding.compatible_turn_drivers[]` to be set per block. For a global-author-pool / branch-prefix pattern, list every driver kind the pattern can serve (commonly: `[player_action, player_write_in, npc_action, offstage_action]` for a pursuit pattern; `[clock_fire, world_pressure]` for a deadline-pressure pattern). For a branch-scoped runtime_jit block, list the single driver kind the JIT was created for.
- Require `grounding.reason_to_exist` per block. Provide a 1-2 sentence statement naming the active pressure record(s) or reusable pressure class. Examples:
  - "Covers offstage or onstage pursuit pressure from an active opposing actor." (global pattern)
  - "Varro's active plan (STPLAN-9) and ambush clock (CLK-3) became due; Jon and Mara must react in POV." (runtime_jit)
- Banned-phrase list (rejected by `slt_grounding_minimal_integrity`): "dramatic variety", "good conflict", "advance the plot", "raise stakes", "create tension", "for pacing", "dramatic moment", "story beat", "narrative momentum". This list is amendable via the shared contract.

### 3.4 New validator — `slt_grounding_minimal_integrity`

Register in `tools/validators/src/public/registry.ts`. Runs in `full-world` and `pre-apply` modes.

**Severity:** fail
**Inputs:** SLT records (incremental scope: any new or superseded `create_slt_record` op)
**Codes:**
- `slt_grounding_missing` — `grounding` field absent (caught at schema-level too, but emit here for unified diagnostics).
- `slt_grounding_compatible_turn_drivers_empty` — `compatible_turn_drivers` is empty (also schema-level; emit here for unified diagnostics).
- `slt_grounding_compatible_turn_drivers_unknown` — `compatible_turn_drivers` contains a value not in the SPEC-76 enum.
- `slt_grounding_reason_too_short` — `reason_to_exist` shorter than 16 characters.
- `slt_grounding_reason_generic` — `reason_to_exist` matches a banned phrase (case-insensitive substring match against the closed banned-phrase list).
- `slt_grounding_runtime_jit_driver_kind_singleton` — `provenance.origin = runtime_jit` with `compatible_turn_drivers` longer than 1 (a JIT block is created for one specific driver context; multi-driver compatibility is for reusable patterns, not JIT blocks).

**Notes:** The banned-phrase list lives in `tools/validators/src/structural/slt-grounding-utils.ts` (new file) so the test suite can import it. The list is intentionally small (~9 entries) and conservative — the goal is to catch the cheapest authorial laziness, not to enforce literary quality. False positives (an author meaningfully writes "raise stakes" as part of a richer sentence) can be revisited with the operator at validation time; the operator can rephrase rather than override.

### 3.5 Validator interaction with turn-cycle Phase 2

The turn-cycle skill's Phase 2 (commitment-block selection) is amended (small change, may be folded into SPEC-76 Slice B implementation):

- When `SE.turn_driver.kind` is set, Phase 2 filters the author-pool SLT candidates by `SLT.grounding.compatible_turn_drivers[]` containing the driver kind. SLTs without a matching compatible driver are excluded from selection.
- A runtime_jit SLT created in Phase 2 must declare its `compatible_turn_drivers` as `[<the kind matching the current SE.turn_driver.kind>]` — singleton, validated by `slt_grounding_runtime_jit_driver_kind_singleton`.

This is the runtime side of the structural compatibility check. The validator enforces the schema-level promise; the skill operationalizes it at selection time.

## 4. Out of Scope

Documented here to prevent silent re-proposal. See `docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md` for the full rejection rationale.

- **`SLT.reuse_mode` enum** (`global_pattern | branch_pattern | branch_instantiated | runtime_jit`). Rejected as duplicative — derivable from `scope.visibility × provenance.origin`.
- **`SLT.grounding.causal_pressures[]`.** Rejected — derivable from `preconditions.hard[]` predicate kinds (e.g., `plan_active` → plan_pressure; `clock_at_least` → clock_pressure).
- **`SLT.grounding.source_records[]`.** Rejected — duplicates `preconditions.hard[]` record-id references.
- **`SLT.grounding.actor_binding_policy`** (`exact_actor | role_parametric | late_bound_actor`). Rejected — `scope.visibility` already encodes the binding capability (global_author_pool ⇒ role-parametric by construction; branch_scoped ⇒ exact actor possible).
- **`SLT.grounding.stchar_axes[]`** and **`SLT.grounding.role_lanes[]`.** Deferred — separate STCHAR-axis taxonomy concern; reactivity fix does not depend on it. May be revisited in a future spec if a concrete validator need surfaces.
- **`slt_stchar_axis_resolution` / `choice_stchar_axis_grounding` validators.** Deferred with the STCHAR-axis taxonomy.

## 5. Validation Rules Upheld

| Rule | Source | How upheld |
|---|---|---|
| FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) | `docs/FOUNDATIONS.md:654-658` | Only two fields added; both load-bearing. `compatible_turn_drivers` drives selection filtering and validator compatibility checks. `reason_to_exist` is structured audit-trail (the "recorded audit-trail discipline" carve-out in §5b), with a minimum length and a closed banned-phrase list that make the field functionally enforced, not decorative. |
| FOUNDATIONS §Story Bundles §5a (Commitment Blocks Are Causal Moves) | `docs/FOUNDATIONS.md:648-652` | `reason_to_exist` operationalizes §5a's "a good block says: when these conditions hold, this kind of action can happen" requirement. The banned-phrase list rejects exactly the failure modes §5a names: "advance Act II", "raise stakes before midpoint". |
| FOUNDATIONS §Validation Rule 1 (No Floating Facts) | `docs/FOUNDATIONS.md:422-432` | An SLT without a stated reason is a floating storylet — it exists without grounding in active or reusable pressure. The new validator forecloses that shape. |
| FOUNDATIONS §Story Bundles §5c (Present Causal State, Not Narrative Shape) | `docs/FOUNDATIONS.md:660-666` | The banned-phrase list rejects narrative-shape framings ("advance the plot", "story beat", "narrative momentum"); `compatible_turn_drivers` keeps the field in causal-state territory (driver kinds are causal-event types, not dramatic-arc positions). |

## 6. Tests

### 6.1 Schema-level (under `tools/validators/tests/schemas/`)

- SLT without `grounding` fails.
- SLT with `grounding.compatible_turn_drivers: []` (empty) fails.
- SLT with `grounding.compatible_turn_drivers: ["bogus_kind"]` fails.
- SLT with `grounding.reason_to_exist: "short"` (< 16 chars) fails.
- SLT with `additionalProperties` under `grounding` (e.g., `grounding.causal_pressures: [...]`) fails.

### 6.2 Structural validator tests (`tools/validators/tests/structural/slt-grounding-minimal-integrity.test.ts`)

Per the inline-fixture-builder pattern (SPEC-75 precedent):

- **Positive:** SLT with `compatible_turn_drivers: [npc_action, offstage_action]` and `reason_to_exist: "Covers offstage pursuit pressure from an active opposing actor."` passes.
- **Positive:** runtime_jit SLT with `compatible_turn_drivers: [npc_action]` (singleton) and a specific source-naming reason passes.
- **Negative:** `reason_to_exist: "Good dramatic conflict"` → `slt_grounding_reason_generic`.
- **Negative:** `reason_to_exist: "Raise stakes before the midpoint"` → `slt_grounding_reason_generic`.
- **Negative:** runtime_jit SLT with `compatible_turn_drivers: [npc_action, clock_fire]` → `slt_grounding_runtime_jit_driver_kind_singleton`.
- **Negative:** `compatible_turn_drivers: ["narrative_beat"]` (unknown kind) → `slt_grounding_compatible_turn_drivers_unknown`.

### 6.3 Existing-fixture migration

If any test bundle (e.g., `red-bunny`) carries SLT records, each must gain `grounding.compatible_turn_drivers` and `grounding.reason_to_exist`. Document this in the implementation ticket's Assumption Reassessment.

## 7. Migration

Same posture as SPEC-76: no backwards-compat shims. SLT records without `grounding` fail validation. Existing test bundles must be rebuilt or hand-patched. The shared contract amendment names this as a fail-fast breaking schema change.

## 8. Implementation Slices

Smaller than SPEC-76:

1. **Slice A — Schema + shared contract amendment + banned-phrase utility.** `story-storylet.schema.json` + `.claude/skills/_shared-templates/story-state-contract.md` §4 SLT subsection + new `tools/validators/src/structural/slt-grounding-utils.ts`. Schema tests written first (TDD).
2. **Slice B — `slt_grounding_minimal_integrity` validator + registry.** Tests inline-fixture-builder pattern.
3. **Slice C — Commitment-block-authoring skill amendment.** Phase 4 changes + banned-phrase list inlined into the skill's reference file.
4. **Slice D — Turn-cycle Phase 2 compatible-driver filter.** Small change; may be folded into SPEC-76 Slice B (Phase 0 + bootstrap + health-audit) rather than a separate slice.

`spec-to-tickets` will materialize these when the spec is decomposed.

## 9. Risk Reassessment

- **Banned-phrase false positives.** A real authorial phrase might overlap "raise stakes" or "dramatic moment" in context. Mitigation: list is conservative; operator can rephrase at validation time. The validator emits a fail-fast diagnostic, not a silent suppression.
- **Compatibility-array overload at authoring time.** Authors might list every driver kind reflexively. Mitigation: the commitment-block-authoring skill's amended Phase 4 includes guidance examples (pursuit pattern → `[npc_action, offstage_action]`; deadline pattern → `[clock_fire, world_pressure]`); the runtime_jit singleton constraint prevents JIT blocks from over-claiming.

## 10. References

- Source report: `reports/slt-chc-overhaul-first-iteration.md` (pain points §5.3 / §13.1 / §13.4; schema change §8.3; commitment-block-authoring change §9.3; validators §10.7).
- Triage decision record: `docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md`.
- FOUNDATIONS §Story Bundles §5a / §5b / §5c: `docs/FOUNDATIONS.md:648-666`.
- Existing schema: `tools/validators/src/schemas/story-storylet.schema.json`.
- Existing skill: `.claude/skills/commitment-block-authoring/SKILL.md`.
- Predecessor: SPEC-76 (Turn-Driver Primitive — provides the `turn_driver.kind` enum that `compatible_turn_drivers[]` references).
