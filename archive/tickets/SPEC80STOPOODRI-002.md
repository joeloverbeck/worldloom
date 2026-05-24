# SPEC80STOPOODRI-002: commitment-block-authoring Phase 1 coverage targets #16/#17 + structured YAML

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/commitment-block-authoring/` (SKILL.md Phase 1 extended with new coverage targets #16 + #17, new Read paths paragraph, and new structured YAML output enrichment)
**Deps**: `archive/specs/SPEC-81-indexed-storylet-candidate-retrieval.md` (soft — provides the `mcp__worldloom__select_storylet_candidates` projection API that the SLT-pool read path uses; landed and archived; the fallback to `list_records(... include_full_body=true)` makes the dependency soft)

## Problem

At intake, `commitment-block-authoring` Phase 1 enumerated 15 causal-function + cast-role coverage targets at `SKILL.md:143-159` (target #15 is cast-role coverage parallel to the bootstrap-author-side rule), and named projection-field-based gap diagnosis using `compatible_turn_drivers` and `predicate_classes` as gap-diagnostic surfaces — but the existing surface stopped at field-level prose: it did not encode the structured trigger maps (which active-record classes IMPLY which driver-kinds must be expressible; which active-record classes IMPLY which existential predicates must reference them), did not encode the joint composition rule (each demanded (driver-kind, source-class) pair must be covered by at least one SLT), and did not emit a structured YAML output that downstream Phase 2-4 block generators can read to author gap-closing blocks systematically.

This completed ticket extends Phase 1 with two new coverage targets (#16 driver-kind composition coverage; #17 pressure-source-class composition coverage), a Read paths paragraph naming the two distinct reads the trigger maps require (bundle-state for the demand side; SLT-pool for the supply side), and a structured YAML output (`driver_kind_coverage`, `pressure_source_coverage`, `composition_gaps`) that enriches — does not replace — the existing move-family / causal-function gap-diagnosis output.

## Assumption Reassessment (2026-05-24)

1. At intake, verified `commitment-block-authoring/SKILL.md:143-159` enumerated exactly 15 coverage targets (14 causal-function + 1 cast-role at line 159); verified the nearby projection-field gap-diagnosis surface named "`compatible_turn_drivers` for driver-kind coverage, `predicate_classes` for active-record-class coverage". Verified Phase 1's existing output shape emitted "a list of `target_count` planned blocks, each with a `move_family` value … and a brief draft scope (preconditions sketch, beat outline, effects shape)." The new structured YAML output (`driver_kind_coverage` etc.) enriches this; it does not replace.
2. Verified SPEC-80 §3.1 driver-kind enum and §3.2 existential-predicate set match the schemas at `tools/validators/src/schemas/story-event.schema.json:96-103`, `story-storylet.schema.json:254-261, 317-327, 360-372`, `story-secret.schema.json:88`, and `.claude/skills/_shared-templates/story-state-contract.md:171-201` (predicate DSL). The trigger maps cite live schema/contract values, not aspirational ones.
3. **Cross-skill boundary under audit**: this ticket's Phase 1 coverage targets #16/#17 must use the same SPEC-80 §3.1/§3.2/§3.3 trigger maps that `archive/tickets/SPEC80STOPOODRI-001.md` wires into the bootstrap-author-side Phase 10 HARD-GATE. The two enforcement points (bootstrap genesis + commitment-block-authoring direct_batch additions) MUST share one source of truth so cast-role / driver-kind / pressure-source / composition coverage stays consistent across genesis and pool evolution. The shared contract surface: SPEC-80 §3 trigger maps (single source of truth, cited by both skill references rather than restated in either).
4. **FOUNDATIONS principles under audit**: Validation Rule 5 (No Consequence Evasion) — active records without expressive SLTs in the pool are a pool-level consequence-evasion risk; the Phase 1 gap diagnosis surfaces this. §Story Bundles §5c (Present Causal State, Not Narrative Shape) — the coverage check is structurally local (does the pool contain at least one SLT capable of expressing X?), not a global drama-manager planner; per SPEC-80 §2.1 and §3 framing, this is the load-bearing distinction.
5. Reassessment corrected the proof boundary: no executable `/commitment-block-authoring` dry-run runner is available in this Codex context. The accepted verification surface is manual contract review of Phase 1's direct_batch diagnostic prose plus grep proof over `.claude/skills/commitment-block-authoring/SKILL.md`. The drafted dry-run scenario remains a SPEC-80 future/operator validation example, not a command run by this ticket.

## Architecture Check

1. **Enrichment, not replacement**: the new structured YAML output is additive to the existing Phase 1 gap-diagnosis output (move-family + causal-function gaps continue to surface). Adding `driver_kind_coverage / pressure_source_coverage / composition_gaps` as new YAML keys preserves backward compatibility with downstream Phase 2-4 block generators that read `move_family` gaps today and lets them progressively consume the new structured surfaces.
2. **Two distinct reads, not one**: the bundle-state load (active-record enumeration for the trigger-map DEMAND side) and the SLT-pool load (projection records for the SUPPLY side) are structurally distinct reads served by distinct MCP surfaces — `story_bundle_context` + targeted `get_records`/`list_records` for bundle state at `commitment-block-authoring/SKILL.md:131`, and `select_storylet_candidates` for the SLT-pool projection at line 128. Naming both reads explicitly in the new Phase 1 prose prevents the conflation that would arise from a single "loaded via `select_storylet_candidates`" framing.
3. **Single source of truth for trigger maps**: this ticket cites SPEC-80 §3 trigger maps by reference rather than restating them in skill prose. If a future spec adds a new driver-kind or new active-record class, SPEC-80's trigger maps are amended in one place; the skill reference simply tracks the spec.
4. No backwards-compatibility aliasing or shims introduced. The existing 15 coverage targets remain unchanged structurally; the new #16/#17 are appended; the new YAML output keys are additive.

## Verification Layers

1. New coverage targets #16 and #17 added after the existing #15 cast-role coverage in `commitment-block-authoring/SKILL.md` Phase 1 → codebase grep-proof: `grep -n "^16\.\|^17\." .claude/skills/commitment-block-authoring/SKILL.md` returns the new target lines within the Phase 1 enumeration.
2. New context paragraph naming existing Phase 1 #15 + projection-field framing added → codebase grep-proof: `grep -n "Context - what Phase 1 already does" .claude/skills/commitment-block-authoring/SKILL.md` returns 1 match.
3. New Read paths paragraph naming both bundle-state and SLT-pool reads added → codebase grep-proof: `grep -n "Read paths\." .claude/skills/commitment-block-authoring/SKILL.md` returns ≥1 match (the §4.2 Read paths block).
4. New structured YAML output enrichment present and framed as additive → codebase grep-proof: `grep -n "driver_kind_coverage:\|pressure_source_coverage:\|composition_gaps:" .claude/skills/commitment-block-authoring/SKILL.md` returns 3 matches inside the Phase 1 output section.
5. Phase 1's manual contract surface emits the coverage YAML in SPEC-80 §4.2's shape and preserves the existing `target_count` planned-block list → manual contract review: inspect the edited Phase 1 prose and verify it still emits the existing planned-block output plus the additive `driver_kind_coverage`, `pressure_source_coverage`, and `composition_gaps` keys. The SPEC-80 §8 test 3 synthetic-bundle dry-run remains a future/operator validation example because this Codex context has no executable Claude-skill runner.

## Landed Changes

### 1. Added context paragraph naming existing Phase 1 #15 + projection-field framing

Inserted a paragraph immediately after Phase 1's existing 15-target enumeration and before the "Identify which coverage targets are absent" sentence:

> **Context - what Phase 1 already does.** Phase 1 currently enumerates 15 coverage targets (14 causal-function + target #15 cast-role coverage) and names projection-field-based gap diagnosis below (`compatible_turn_drivers` for driver-kind coverage; `predicate_classes` for active-record-class coverage). What is missing is the structured trigger maps (SPEC-80 §3.1, §3.2), the joint composition rule (SPEC-80 §3.3), and a structured YAML output that the Phase 2-4 block generators can read.

The landed skill prose uses an ASCII heading so the verification grep is shell-safe and stable.

### 2. Added new coverage targets #16 and #17

Appended after target #15 (cast-role coverage):

> 16. **Driver-kind composition coverage** — for each driver-kind value triggered by the bundle's active records per SPEC-80 §3.1's trigger map, the pool must contain at least one SLT whose `grounding.compatible_turn_drivers[]` includes that value.
>
> 17. **Pressure-source-class composition coverage** — for each load-bearing active-record class triggered per SPEC-80 §3.2's trigger map, the pool must contain at least one SLT whose `preconditions.hard[]` or `preconditions.soft[]` references that class via the appropriate existential predicate or literal record-id.
>
> The joint composition rule (SPEC-80 §3.3) applies: for each (driver-kind, source-class) pair the bundle demands, at least one SLT must satisfy BOTH.

### 3. Added Read paths paragraph

After the new targets #16/#17 and before the "Identify which coverage targets" output paragraph, added:

> **Read paths.** Two distinct reads cover this check:
>
> (a) **Bundle-state load** (the DEMAND side — enumeration of active records that trigger the §3.1 / §3.2 maps): use `story_bundle_context` plus targeted `mcp__worldloom__get_records` / `mcp__worldloom__list_records` per `commitment-block-authoring/SKILL.md:131`, which already enumerates active cast STENT ids and currently-open obligations / consequences / threads.
>
> (b) **SLT-pool load** (the SUPPLY side — projection of current pool storylets to check coverage against demand): use the SPEC-81 projection path `mcp__worldloom__select_storylet_candidates(max_candidates=pool_size)` already invoked at `commitment-block-authoring/SKILL.md:128`. Use `list_records(... include_full_body=true)` only as a fallback where the projection API is unavailable.

### 4. Added structured YAML output enrichment

In the Phase 1 output section, added the structured YAML enrichment as an additive output to the existing move-family / causal-function gap diagnosis (from SPEC-80 §4.2):

> **Output shape** (enrichment of existing Phase 1 gap-diagnosis output — does not replace move-family / causal-function gap reporting):
>
> ```yaml
> driver_kind_coverage:
>   triggered_kinds: [player_action, npc_action, clock_fire]
>   uncovered_kinds: [npc_action]   # bundle has active STPLAN/STEMO but no SLT with compatible_turn_drivers: [..., npc_action, ...]
> pressure_source_coverage:
>   triggered_classes: [STPLAN, STEMO, CLK, OBL]
>   uncovered_classes: [STEMO]      # bundle has active STEMO but no SLT with any_emotion_active or literal STEMO-N reference
> composition_gaps:
>   - {driver: npc_action, source: STPLAN}
>   - {driver: npc_action, source: STEMO}
> ```

### 5. Implemented the Phase 1 coverage diagnostics

Wired the new targets #16/#17 + composition rule into the Phase 1 gap-diagnosis flow. The diagnostics:

- Load bundle state per the Read paths paragraph (a).
- Load SLT pool per the Read paths paragraph (b).
- Apply SPEC-80 §3.1 trigger map to the bundle state → derived demanded driver-kinds.
- Apply SPEC-80 §3.2 trigger map to the bundle state → derived demanded source-classes.
- Walk the SLT pool's `grounding.compatible_turn_drivers[]` (from projection records) to compute covered driver-kinds.
- Walk the SLT pool's projected `predicate_classes` or full-body `preconditions.hard[]` / `preconditions.soft[]` to compute covered source-classes.
- Compute composition gaps as the set difference between demanded (driver-kind × source-class) pairs and covered pairs.
- Emit the YAML output enrichment per §4.

When the composition gap list exceeds a presentation limit, the landed prose emits the top 20 gaps by triggering-record count.

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify) — Phase 1 extension: context paragraph + targets #16/#17 + Read paths paragraph + structured YAML output enrichment + implementation wiring.

## Out of Scope

- Schema changes (SPEC-80 §5 explicitly forbids; the diagnostics operate over existing SLT fields and existing active-record class membership).
- Auto-generation of SLTs to close the surfaced composition gaps (SPEC-80 §6 explicit non-goal — Phase 1 INFORMS authoring; Phase 2-4 of `commitment-block-authoring` generates blocks to close gaps via existing flow).
- Modifying the existing 14 causal-function coverage targets or target #15 cast-role coverage (those remain unchanged).
- Editing `branching-story-bootstrap/` or `branching-story-health-audit/` — owned by `archive/tickets/SPEC80STOPOODRI-001.md` and SPEC80STOPOODRI-003 respectively.
- Pool-level pressure-distribution scoring or aggregate-salience weighting (SPEC-80 §6 explicit non-goal; the diagnostic decides presence/absence only, never relative weighting per FOUNDATIONS §Story Bundles §5c).

## Acceptance Criteria

### Tests That Must Pass

1. Codebase grep-proof: `grep -n "Context - what Phase 1 already does\|^16\.\|^17\.\|Read paths\.\|driver_kind_coverage:\|pressure_source_coverage:\|composition_gaps:" .claude/skills/commitment-block-authoring/SKILL.md` returns ≥7 matches across the Phase 1 section (1 context paragraph + 2 target lines + 1 read-paths heading + 3 YAML keys).
2. Manual contract review: Phase 1's output prose continues to require the existing move-family / causal-function `target_count` planned-block list and adds the SPEC-80 YAML enrichment without replacing that existing output.
3. Not run: `/commitment-block-authoring` with `mode: direct_batch` against a fixture bundle matching SPEC-80 §8 test 1 shape. No executable Claude-skill runner is available in this Codex context; the synthetic-bundle dry-run remains a future/operator validation example.

### Invariants

1. Phase 1's existing 15 coverage targets remain unchanged structurally; the new #16/#17 are appended.
2. The existing Phase 1 output (target_count list with move_family + draft scope per `SKILL.md:165`) continues to emit. The new YAML enrichment is additive; it does not replace or restructure the existing output.
3. Bundle-state read and SLT-pool read remain structurally distinct (different MCP surfaces, different read disciplines per SPEC-80 §4.2); the diagnostic does not conflate them.
4. The diagnostic INFORMS authoring; it does not auto-generate SLTs (SPEC-80 §6 invariant).
5. Phase 1's HARD-GATE-bearing semantics (per `commitment-block-authoring/SKILL.md:34` precondition + `SKILL.md:326` Phase 6 Commit/Write HARD-GATE) are unchanged: Phase 1 remains diagnostic; the Commit/Write HARD-GATE remains at Phase 6.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is grep-proof plus manual contract review because no executable Claude-skill dry-run runner is available in this Codex context.

### Commands

1. `grep -n "Context - what Phase 1 already does\|^16\.\|^17\.\|Read paths\.\|driver_kind_coverage:\|pressure_source_coverage:\|composition_gaps:" .claude/skills/commitment-block-authoring/SKILL.md` — verify all new context paragraph + targets + Read paths + YAML keys landed.
2. Manual contract review against SPEC-80 §3/§4.2 and `docs/FOUNDATIONS.md` §Story Bundles §5c / Validation Rule 5 — verify the Phase 1 diagnostic remains an additive authoring-time coverage diagnosis and does not become runtime ranking or auto-generation.

## Outcome

Completed: 2026-05-24

This ticket landed the commitment-block-authoring side of SPEC-80. Phase 1 now appends driver-kind composition coverage and pressure-source-class composition coverage after the existing cast-role coverage target, names distinct demand-side and supply-side read paths, preserves the existing `target_count` planned-block output, and adds the structured `driver_kind_coverage`, `pressure_source_coverage`, and `composition_gaps` YAML enrichment. The diagnostic is explicitly authoring-time only: it informs Phase 2-4 block drafting and does not auto-generate SLTs or change runtime ranking.

## Verification Result

1. `grep -n "Context - what Phase 1 already does\|^16\.\|^17\.\|Read paths\.\|driver_kind_coverage:\|pressure_source_coverage:\|composition_gaps:" .claude/skills/commitment-block-authoring/SKILL.md` — passed; returned the expected 7 Phase 1 hits for the context paragraph, targets #16/#17, read-paths heading, and YAML keys.
2. Manual contract review against SPEC-80 §3/§4.2 and `docs/FOUNDATIONS.md` §Story Bundles §5c / Validation Rule 5 — passed; the landed prose diagnoses expressive pool capacity against present active records, preserves additive output, and does not introduce runtime weighting, auto-generation, record mutation, or HARD-GATE semantic changes.

## Deviations

The drafted acceptance listed a `/commitment-block-authoring` dry-run against a synthetic fixture bundle. That was not run because this Codex context has no executable Claude-skill runner. The accepted proof boundary is grep proof plus manual contract review over the edited skill surface; the SPEC-80 §8 synthetic-bundle scenario remains a future/operator validation example.
