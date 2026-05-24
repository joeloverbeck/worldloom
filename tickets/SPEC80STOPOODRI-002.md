# SPEC80STOPOODRI-002: commitment-block-authoring Phase 1 coverage targets #16/#17 + structured YAML

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/commitment-block-authoring/` (SKILL.md Phase 1 extended with new coverage targets #16 + #17, new Read paths paragraph, and new structured YAML output enrichment)
**Deps**: `archive/specs/SPEC-81-indexed-storylet-candidate-retrieval.md` (soft — provides the `mcp__worldloom__select_storylet_candidates` projection API that the SLT-pool read path uses; landed and archived; the fallback to `list_records(... include_full_body=true)` makes the dependency soft)

## Problem

`commitment-block-authoring` Phase 1 currently enumerates 15 causal-function + cast-role coverage targets at `SKILL.md:143-159` (target #15 is cast-role coverage parallel to the bootstrap-author-side rule), and names projection-field-based gap diagnosis at line 161 using `compatible_turn_drivers` and `predicate_classes` as gap-diagnostic surfaces — but the existing surface stops at field-level prose: it does not encode the structured trigger maps (which active-record classes IMPLY which driver-kinds must be expressible; which active-record classes IMPLY which existential predicates must reference them), does not encode the joint composition rule (each demanded (driver-kind, source-class) pair must be covered by at least one SLT), and does not emit a structured YAML output that downstream Phase 2-4 block generators can read to author gap-closing blocks systematically.

This ticket extends Phase 1 with two new coverage targets (#16 driver-kind composition coverage; #17 pressure-source-class composition coverage), a Read paths paragraph naming the two distinct reads the trigger maps require (bundle-state for the demand side; SLT-pool for the supply side), and a structured YAML output (`driver_kind_coverage`, `pressure_source_coverage`, `composition_gaps`) that enriches — does not replace — the existing move-family / causal-function gap-diagnosis output.

## Assumption Reassessment (2026-05-24)

1. Verified `commitment-block-authoring/SKILL.md:143-159` enumerates exactly 15 coverage targets (14 causal-function + 1 cast-role at line 159); verified line 161 names the projection-field gap-diagnosis surface ("`compatible_turn_drivers` for driver-kind coverage, `predicate_classes` for active-record-class coverage"). Verified Phase 1's existing output shape at line 165 emits "a list of `target_count` planned blocks, each with a `move_family` value … and a brief draft scope (preconditions sketch, beat outline, effects shape)." The new structured YAML output (`driver_kind_coverage` etc.) enriches this; it does not replace.
2. Verified SPEC-80 §3.1 driver-kind enum and §3.2 existential-predicate set match the schemas at `tools/validators/src/schemas/story-event.schema.json:96-103`, `story-storylet.schema.json:254-261, 317-327, 360-372`, `story-secret.schema.json:88`, and `.claude/skills/_shared-templates/story-state-contract.md:171-201` (predicate DSL). The trigger maps cite live schema/contract values, not aspirational ones.
3. **Cross-skill boundary under audit**: this ticket's Phase 1 coverage targets #16/#17 must use the same SPEC-80 §3.1/§3.2/§3.3 trigger maps that SPEC80STOPOODRI-001 wires into the bootstrap-author-side Phase 10 HARD-GATE. The two enforcement points (bootstrap genesis + commitment-block-authoring direct_batch additions) MUST share one source of truth so cast-role / driver-kind / pressure-source / composition coverage stays consistent across genesis and pool evolution. The shared contract surface: SPEC-80 §3 trigger maps (single source of truth, cited by both skill references rather than restated in either).
4. **FOUNDATIONS principles under audit**: Validation Rule 5 (No Consequence Evasion) — active records without expressive SLTs in the pool are a pool-level consequence-evasion risk; the Phase 1 gap diagnosis surfaces this. §Story Bundles §5c (Present Causal State, Not Narrative Shape) — the coverage check is structurally local (does the pool contain at least one SLT capable of expressing X?), not a global drama-manager planner; per SPEC-80 §2.1 and §3 framing, this is the load-bearing distinction.

## Architecture Check

1. **Enrichment, not replacement**: the new structured YAML output is additive to the existing Phase 1 gap-diagnosis output (move-family + causal-function gaps continue to surface). Adding `driver_kind_coverage / pressure_source_coverage / composition_gaps` as new YAML keys preserves backward compatibility with downstream Phase 2-4 block generators that read `move_family` gaps today and lets them progressively consume the new structured surfaces.
2. **Two distinct reads, not one**: the bundle-state load (active-record enumeration for the trigger-map DEMAND side) and the SLT-pool load (projection records for the SUPPLY side) are structurally distinct reads served by distinct MCP surfaces — `story_bundle_context` + targeted `get_records`/`list_records` for bundle state at `commitment-block-authoring/SKILL.md:131`, and `select_storylet_candidates` for the SLT-pool projection at line 128. Naming both reads explicitly in the new Phase 1 prose prevents the conflation that would arise from a single "loaded via `select_storylet_candidates`" framing.
3. **Single source of truth for trigger maps**: this ticket cites SPEC-80 §3 trigger maps by reference rather than restating them in skill prose. If a future spec adds a new driver-kind or new active-record class, SPEC-80's trigger maps are amended in one place; the skill reference simply tracks the spec.
4. No backwards-compatibility aliasing or shims introduced. The existing 15 coverage targets remain unchanged structurally; the new #16/#17 are appended; the new YAML output keys are additive.

## Verification Layers

1. New coverage targets #16 and #17 added after the existing #15 cast-role coverage in `commitment-block-authoring/SKILL.md` Phase 1 → codebase grep-proof: `grep -n "^16\.\|^17\." .claude/skills/commitment-block-authoring/SKILL.md` returns the new target lines within the Phase 1 enumeration.
2. New context paragraph naming existing Phase 1 #15 + line 161 projection-field framing added → codebase grep-proof: `grep -n "Context — what Phase 1 already does" .claude/skills/commitment-block-authoring/SKILL.md` returns 1 match.
3. New Read paths paragraph naming both bundle-state and SLT-pool reads added → codebase grep-proof: `grep -n "Read paths\." .claude/skills/commitment-block-authoring/SKILL.md` returns ≥1 match (the §4.2 Read paths block).
4. New structured YAML output enrichment present and framed as additive → codebase grep-proof: `grep -n "driver_kind_coverage:\|pressure_source_coverage:\|composition_gaps:" .claude/skills/commitment-block-authoring/SKILL.md` returns 3 matches inside the Phase 1 output section.
5. Phase 1 emits the coverage YAML in §4.2's shape against a synthetic bundle → skill dry-run: invoke `/commitment-block-authoring` with `mode: direct_batch` against a fixture bundle matching SPEC-80 §8 test 1 shape (two NPC STENT + one STPLAN + one STEMO + one CLK); verify the Phase 1 output contains `driver_kind_coverage`, `pressure_source_coverage`, and `composition_gaps` keys with values matching the expected triggered/uncovered sets (SPEC-80 §8 test 3).

## What to Change

### 1. Add context paragraph naming existing Phase 1 #15 + line 161 projection-field framing

Insert a paragraph immediately after Phase 1's existing 15-target enumeration (around line 159-161) and before the "Identify which coverage targets are absent" sentence:

> **Context — what Phase 1 already does.** Phase 1 currently enumerates 15 coverage targets (14 causal-function + target #15 cast-role coverage) and names projection-field-based gap diagnosis at line 161 (`compatible_turn_drivers` for driver-kind coverage; `predicate_classes` for active-record-class coverage). What is missing is the structured trigger maps (SPEC-80 §3.1, §3.2), the joint composition rule (SPEC-80 §3.3), and a structured YAML output that the Phase 2-4 block generators can read.

### 2. Add new coverage targets #16 and #17

Append after target #15 (cast-role coverage at `SKILL.md:159`):

> 16. **Driver-kind composition coverage** — for each driver-kind value triggered by the bundle's active records per SPEC-80 §3.1's trigger map, the pool must contain at least one SLT whose `grounding.compatible_turn_drivers[]` includes that value.
>
> 17. **Pressure-source-class composition coverage** — for each load-bearing active-record class triggered per SPEC-80 §3.2's trigger map, the pool must contain at least one SLT whose `preconditions.hard[]` or `preconditions.soft[]` references that class via the appropriate existential predicate or literal record-id.
>
> The joint composition rule (SPEC-80 §3.3) applies: for each (driver-kind, source-class) pair the bundle demands, at least one SLT must satisfy BOTH.

### 3. Add Read paths paragraph

After the new targets #16/#17 and before the "Identify which coverage targets" output paragraph, add:

> **Read paths.** Two distinct reads cover this check:
>
> (a) **Bundle-state load** (the DEMAND side — enumeration of active records that trigger the §3.1 / §3.2 maps): use `story_bundle_context` plus targeted `mcp__worldloom__get_records` / `mcp__worldloom__list_records` per `commitment-block-authoring/SKILL.md:131`, which already enumerates active cast STENT ids and currently-open obligations / consequences / threads.
>
> (b) **SLT-pool load** (the SUPPLY side — projection of current pool storylets to check coverage against demand): use the SPEC-81 projection path `mcp__worldloom__select_storylet_candidates(max_candidates=pool_size)` already invoked at `commitment-block-authoring/SKILL.md:128`. Use `list_records(... include_full_body=true)` only as a fallback where the projection API is unavailable.

### 4. Add structured YAML output enrichment

In the Phase 1 output section (around `SKILL.md:165`), add the structured YAML enrichment as an additive output to the existing move-family / causal-function gap diagnosis (verbatim from SPEC-80 §4.2):

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

### 5. Implement the Phase 1 coverage diagnostics

Wire the new targets #16/#17 + composition rule into the Phase 1 gap-diagnosis flow. The diagnostics:

- Load bundle state per the Read paths paragraph (a).
- Load SLT pool per the Read paths paragraph (b).
- Apply SPEC-80 §3.1 trigger map to the bundle state → derived demanded driver-kinds.
- Apply SPEC-80 §3.2 trigger map to the bundle state → derived demanded source-classes.
- Walk the SLT pool's `grounding.compatible_turn_drivers[]` (from projection records) to compute covered driver-kinds.
- Walk the SLT pool's `preconditions.hard[]` / `preconditions.soft[]` (from projection records' `predicate_classes`) to compute covered source-classes.
- Compute composition gaps as the set difference between demanded (driver-kind × source-class) pairs and covered pairs.
- Emit the YAML output enrichment per §4.

When the composition gap list exceeds a presentation limit (suggest N=20 per SPEC-80 §9), emit the top-N gaps by triggering-record count.

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify) — Phase 1 extension: context paragraph + targets #16/#17 + Read paths paragraph + structured YAML output enrichment + implementation wiring.

## Out of Scope

- Schema changes (SPEC-80 §5 explicitly forbids; the diagnostics operate over existing SLT fields and existing active-record class membership).
- Auto-generation of SLTs to close the surfaced composition gaps (SPEC-80 §6 explicit non-goal — Phase 1 INFORMS authoring; Phase 2-4 of `commitment-block-authoring` generates blocks to close gaps via existing flow).
- Modifying the existing 14 causal-function coverage targets or target #15 cast-role coverage (those remain unchanged).
- Editing `branching-story-bootstrap/` or `branching-story-health-audit/` — owned by SPEC80STOPOODRI-001 and SPEC80STOPOODRI-003 respectively.
- Pool-level pressure-distribution scoring or aggregate-salience weighting (SPEC-80 §6 explicit non-goal; the diagnostic decides presence/absence only, never relative weighting per FOUNDATIONS §Story Bundles §5c).

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run: `/commitment-block-authoring` with `mode: direct_batch` against a fixture bundle matching SPEC-80 §8 test 1 shape; Phase 1 output emits the coverage YAML with `driver_kind_coverage / pressure_source_coverage / composition_gaps` keys populated correctly (triggered sets match the trigger maps applied to the fixture; uncovered sets match the absence in the seeded pool); composition gap list correctly enumerates demanded-but-uncovered pairs (SPEC-80 §8 test 3).
2. Codebase grep-proof: `grep -n "Context — what Phase 1 already does\|^16\.\|^17\.\|Read paths\.\|driver_kind_coverage:\|pressure_source_coverage:\|composition_gaps:" .claude/skills/commitment-block-authoring/SKILL.md` returns ≥7 matches across the Phase 1 section (1 context paragraph + 2 target lines + 1 read-paths heading + 3 YAML keys).
3. Existing Phase 1 output (move-family / causal-function gap diagnosis from line 165) continues to emit; new YAML is additive only — verified via skill dry-run inspection of Phase 1 output containing BOTH the existing target_count blocks list AND the new YAML enrichment.

### Invariants

1. Phase 1's existing 15 coverage targets remain unchanged structurally; the new #16/#17 are appended.
2. The existing Phase 1 output (target_count list with move_family + draft scope per `SKILL.md:165`) continues to emit. The new YAML enrichment is additive; it does not replace or restructure the existing output.
3. Bundle-state read and SLT-pool read remain structurally distinct (different MCP surfaces, different read disciplines per SPEC-80 §4.2); the diagnostic does not conflate them.
4. The diagnostic INFORMS authoring; it does not auto-generate SLTs (SPEC-80 §6 invariant).
5. Phase 1's HARD-GATE-bearing semantics (per `commitment-block-authoring/SKILL.md:34` precondition + `SKILL.md:326` Phase 6 Commit/Write HARD-GATE) are unchanged: Phase 1 remains diagnostic; the Commit/Write HARD-GATE remains at Phase 6.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is skill-dry-run based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -n "Context — what Phase 1 already does\|^16\.\|^17\.\|Read paths\.\|driver_kind_coverage:\|pressure_source_coverage:\|composition_gaps:" .claude/skills/commitment-block-authoring/SKILL.md` — verify all new context paragraph + targets + Read paths + YAML keys landed.
2. `/commitment-block-authoring` skill dry-run with `mode: direct_batch` against the SPEC-80 §8 test 3 fixture — verifies Phase 1 emits the structured YAML enrichment alongside the existing target_count blocks list. The skill is LLM-driven and not invokable from test-suite code; manual dry-run is the verification surface per `tickets/README.md` §3 valid verification surfaces (skill dry-run).
