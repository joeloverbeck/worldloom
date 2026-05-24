# SPEC-77 — Minimal SLT Grounding Provenance

**Status:** Draft (proposed 2026-05-23)
**Spec ID:** SPEC-77
**Depends on:** [SPEC-76](../archive/specs/SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md) (Turn-Driver Primitive — provides the closed `turn_driver.kind` enum that `compatible_turn_drivers[]` references)
**Source report:** `reports/slt-chc-overhaul-first-iteration.md` (triaged at `docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md`)

## 1. Problem

Now that SPEC-76 is archived, the turn-cycle can drive a turn from a non-player record (NPC action, clock fire, offstage action, world pressure). But two gaps remain at the SLT level:

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

### 3.2 Shared story-record schemas — `.claude/skills/_shared-templates/story-record-schemas.md`

Amend §4.4 (`SLT` commitment block canonical field list) to document `grounding.compatible_turn_drivers` and `grounding.reason_to_exist` as required sub-paths of a new required top-level `grounding` object. Cite SPEC-77 in the change note. Schema content authority: `story-record-schemas.md` §4.4 is the canonical home of the SLT field list per `story-state-contract.md` §4 (which is now a navigational stub redirecting to the sibling file); the matching JSON Schema source of truth remains `tools/validators/src/schemas/story-storylet.schema.json` per §3.1.

The companion authoring guideline (what `reason_to_exist` must name and which phrasings are structurally rejected) lands in the commitment-block-authoring skill — see §3.3 Phase 4 preamble — not in the schema field-list file, because authoring guidance is out of scope for `story-record-schemas.md`.

### 3.3 Commitment-block-authoring skill — `.claude/skills/commitment-block-authoring/SKILL.md`

Amend Phase 4 (block-shape authoring) with the following preamble + per-field requirements:

> An SLT's `reason_to_exist` must name the active or reusable pressure logic the storylet captures — what causal state makes it eligible, and what kind of move it represents. Generic phrases like "dramatic variety," "good conflict," "advance the plot," "raise stakes," "create tension," and "for pacing" are structurally rejected (see `slt_grounding_minimal_integrity` banned-phrase list below).

Per-field requirements:

- Require `grounding.compatible_turn_drivers[]` to be set per block. For a global-author-pool / branch-prefix pattern, list every driver kind the pattern can serve (commonly: `[player_action, player_write_in, npc_action, offstage_action]` for a pursuit pattern; `[clock_fire, world_pressure]` for a deadline-pressure pattern). For a branch-scoped runtime_jit block, list the single driver kind the JIT was created for.
- Require `grounding.reason_to_exist` per block. Provide a 1-2 sentence statement naming the active pressure record(s) or reusable pressure class. Examples:
  - "Covers offstage or onstage pursuit pressure from an active opposing actor." (global pattern)
  - "Varro's active plan (STPLAN-9) and ambush clock (CLK-3) became due; Jon and Mara must react in POV." (runtime_jit)
- Banned-phrase list (rejected by `slt_grounding_minimal_integrity`): "dramatic variety", "good conflict", "advance the plot", "raise stakes", "create tension", "for pacing", "dramatic moment", "story beat", "narrative momentum". This list is amendable via the shared utility at `tools/validators/src/structural/slt-grounding-utils.ts` (§3.4 Notes).

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

**Schema-overlap diagnostic semantics:** Two codes (`slt_grounding_missing`, `slt_grounding_compatible_turn_drivers_empty`) overlap JSON-Schema `required` checks at the `grounding` object level. The structural validator emits these codes regardless of whether the JSON Schema pre-apply pass also flagged the record — no early-return on schema fail. The intent is unified, named diagnostics in the structural validator surface (consumers parse codes, not schema messages); deduplication is the framework's responsibility, not the validator's. An author-time fail produces both a schema "required" violation and the structural code; downstream reporting concatenates or dedupes per its UX needs.

### 3.5 Validator interaction with turn-cycle Phase 2

The turn-cycle skill's Phase 2 (commitment-block selection) is amended:

- **Phase 2.1 driver-kind compatibility filter** — when `SE.turn_driver.kind` is set, Phase 2.1 filters the author-pool SLT candidates by `SLT.grounding.compatible_turn_drivers[]` containing the driver kind. SLTs without a matching compatible driver are excluded from selection. The filter rejection site lives in the existing turn-cycle Phase 2 reference file (`.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md`); ticket decomposition writes a new sub-section there.
- A runtime_jit SLT created in Phase 2 must declare its `compatible_turn_drivers` as `[<the kind matching the current SE.turn_driver.kind>]` — singleton, validated by `slt_grounding_runtime_jit_driver_kind_singleton` for the singleton-length constraint at storage time.

**Responsibility split:** the `slt_grounding_runtime_jit_driver_kind_singleton` validator enforces only that a runtime_jit SLT's `compatible_turn_drivers` is length-1 at storage time. Match between the JIT's singleton value and the resolved `SE.turn_driver.kind` is enforced by Phase 2.1's compatible-driver filter at selection time, not by the storage-time validator; a stored-singleton mismatch would only surface as a Phase 2.1 selection rejection (no SLT-record-level cross-reference check). This is intentional — Phase 2 creates the JIT from the resolved `SE.turn_driver.kind`, so the stored mismatch shape is structurally improbable; adding a cross-record validator for it would over-couple the validator to SE/PG retrieval. The runtime side is Phase 2.1; the schema side is `slt_grounding_runtime_jit_driver_kind_singleton`.

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

Schema-bearing SLT-construction sites in the validator package must be migrated to populate `grounding.compatible_turn_drivers` and `grounding.reason_to_exist`. A reassessment-time grep (`record_kind: storylet_record` + `create_slt_record`) finds the live consumer surface concentrated in `tools/validators/tests/{integration,structural,cli,rules,fixtures}/`:

- integration tests: `validate-patch-plan.test.ts`, `spec34-integration.test.ts`, `spec57-stchar-pipeline-integration.test.ts`
- structural tests: `chc-slt-selected-commitment-trace.test.ts`, `state-delta-class-integrity.test.ts`, `branch-isolation.test.ts`, `recursive-reference-closure.test.ts`, `record-schema-compliance.test.ts`
- cli tests: `world-validate.story-bundle.test.ts`
- rules tests: `rule_storylet_predicate_dsl_parsability.test.ts`
- JSON fixtures: `patch-plan-complete-slt.json`, `patch-plan-missing-mystery-safety-slt.json`

No live `worlds/<world>/stories/<story>/_source/storylets/` records exist in the worktree; migration scope is the test surface only. Inline-fixture-builder helpers that construct `storylet_record` should be updated in one pass to supply the new fields with realistic defaults; per-test overrides target only those tests whose assertions depend on the grounding shape. Document this in the implementation ticket's Assumption Reassessment.

## 7. Migration

Same posture as SPEC-76: no backwards-compat shims. SLT records without `grounding` fail validation. Existing test bundles must be rebuilt or hand-patched. The shared contract amendment names this as a fail-fast breaking schema change.

## 8. Implementation Slices

**Upstream tickets**: SPEC-77's slices run AFTER `archive/tickets/SPEC76TURDRIPRI-001.md` (schema introducing `turn_driver.kind`) and `archive/tickets/SPEC76TURDRIPRI-002.md` (shared contract amendment) land — both exist as of the SPEC-76 decomposition on 2026-05-23. When SPEC-77 is decomposed by `/spec-to-tickets`, every ticket that references the `compatible_turn_drivers` enum should declare an explicit upstream `Deps:` on `archive/tickets/SPEC76TURDRIPRI-001.md`; see §9 Risk Reassessment for the byte-for-byte enum-match obligation.

Smaller than SPEC-76:

1. **Slice A — Schema + shared-record-schemas amendment + banned-phrase utility.** `story-storylet.schema.json` + `.claude/skills/_shared-templates/story-record-schemas.md` §4.4 SLT subsection + new `tools/validators/src/structural/slt-grounding-utils.ts`. Schema tests written first (TDD).
2. **Slice B — `slt_grounding_minimal_integrity` validator + registry.** Tests inline-fixture-builder pattern.
3. **Slice C — Commitment-block-authoring skill amendment.** Phase 4 preamble (authoring guideline) + per-field requirements + banned-phrase list inlined into the skill (per §3.3). The authoring guideline lives here rather than in the schema field-list file (`story-record-schemas.md` is schema-only).
4. **Slice D — Turn-cycle Phase 2.1 compatible-driver filter (standalone).** Phase 2.1 filter + responsibility-split prose in the existing turn-cycle Phase 2 reference file (per §3.5). Standalone slice — SPEC-76 has completed and archived, so the prior "may be folded into SPEC-76 Slice B" option no longer applies.

`spec-to-tickets` will materialize these when the spec is decomposed.

## 9. Risk Reassessment

- **Banned-phrase false positives.** A real authorial phrase might overlap "raise stakes" or "dramatic moment" in context. Mitigation: list is conservative; operator can rephrase at validation time. The validator emits a fail-fast diagnostic, not a silent suppression.
- **Banned-phrase substring-precision limitation.** The validator uses case-insensitive substring matching against the closed list. This catches the canonical phrasing of laziness (e.g., "raise stakes" inside "raise stakes considerably") but does NOT catch near-paraphrases that break the substring (e.g., "raise the stakes", "raised stakes", "stakes get raised"). This is acceptable for a conservative-by-design list — the intent is to catch the cheapest authorial laziness, not to enforce literary quality (per §3.4 Notes). If linguistically-creative laziness becomes a problem in practice, a word-boundary or fuzzy-match upgrade to `slt-grounding-utils.ts` can be considered in a successor spec; today's mitigation is judgment-assisted review at audit time.
- **Compatibility-array overload at authoring time.** Authors might list every driver kind reflexively. Mitigation: the commitment-block-authoring skill's amended Phase 4 includes guidance examples (pursuit pattern → `[npc_action, offstage_action]`; deadline pattern → `[clock_fire, world_pressure]`); the runtime_jit singleton constraint prevents JIT blocks from over-claiming.
- **Upstream sequencing + enum-match dependency on SPEC-76.** SPEC-77's `compatible_turn_drivers` enum at §3.1 (lines 66-74) must match SPEC-76's `turn_driver.kind` enum (per SPEC-76 §3.1) byte-for-byte. At the SPEC-76 reassessment + decomposition session on 2026-05-23, both enums list the identical 8 values in the same order — `player_action`, `player_write_in`, `npc_action`, `offstage_action`, `world_pressure`, `clock_fire`, `secret_reveal`, `multi_actor_collision` — and the match was verified. The `additionalProperties: false` constraint on `grounding` (§3.1) plus the closed enum on `compatible_turn_drivers` make the cross-spec contract structurally enforceable, but the byte-for-byte values must match for the contract to compose. Mitigation: when SPEC-77 is decomposed by `/spec-to-tickets`, every ticket referencing the enum should declare upstream `Deps: archive/tickets/SPEC76TURDRIPRI-001.md` (the SPEC-76 schema ticket that lands the enum on `story-event.schema.json`) so the dependency is structurally enforced at implementation time. Any subsequent reassess-spec pass on SPEC-77 must re-verify the enum-match if either side is amended; a drift detected at reassess-spec time is cheaper than a drift detected at validator-runtime time when a real bundle's SLT fails compatibility-filtering.

## 10. References

- Source report: `reports/slt-chc-overhaul-first-iteration.md` (pain points §5.3 / §13.1 / §13.4; schema change §8.3; commitment-block-authoring change §9.3; validators §10.7).
- Triage decision record: `docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md`.
- FOUNDATIONS §Story Bundles §5a / §5b / §5c: `docs/FOUNDATIONS.md:648-666`.
- Existing schema: `tools/validators/src/schemas/story-storylet.schema.json`.
- Existing skill: `.claude/skills/commitment-block-authoring/SKILL.md`.
- Predecessor: [SPEC-76](../archive/specs/SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md) (Turn-Driver Primitive — provides the `turn_driver.kind` enum that `compatible_turn_drivers[]` references).
