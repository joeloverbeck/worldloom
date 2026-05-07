# Triage — Scene-Commitment Arc Pivot (2026-05-07)

## Source

- `reports/scene-arc-storylet-research-brief.md` — research brief authored 2026-05-06; documents the pacing pathology (30 choices over 8 pages, `likely_effects` empty in 30/30 records, late-page collapse into postural variants), proposes the scene-arc storylet pivot, lists 12 open design questions for external research.
- `reports/scene-commitment-arc.md` — ChatGPT-Pro deep-research proposal (2026-05-06); validates the pivot direction, sharpens it to "scene-commitment arc" semantics, proposes a choice-emission gate, an extended SLT v2 schema, a hybrid exit portfolio, three-layer validation, and a small predicate DSL for stop conditions; surveys storylet-system literature (Kreminski-Wardrip-Fruin 2018; Cardona-Rivera et al. 2014; Mawhorter et al. 2014/2018; Iten/Steinemann/Opwis 2018; Versu; Façade; etc.).

The brainstorm reassessed ChatGPT-Pro's proposal with codebase context (which the external researcher lacked).

## Reassessment summary

**Accepted from ChatGPT-Pro:**
- Scene-commitment arc as the unit of authoring + agency.
- Choice-emission as a gate (5-class narrative-point classifier).
- Effect-variant selection BEFORE prose (preserves replay equality).
- Hybrid exit portfolio (native_seeds + engine_discovered + JIT).
- Three-layer validation (deterministic / trace extraction / semantic critic).
- Stop-predicate DSL kept small (first-order predicates).
- Strong-axis vs weak-axis taxonomy for choice-worthiness.

**Adapted for the codebase:**
- Schema field naming reconciled with the existing v1 envelope; v2 is `record_version: 2` + `shape: scene_commitment_arc` plus seven new blocks (arc_contract, dramatic_unit, beat_plan, execution_envelope, stop_policy, effect_model, exit_portfolio).
- ARC_TRACE atomic-YAML records under `_source/arc-traces/` (SPEC-13 atomic-source discipline) routed through new patch-engine op.
- Phase 4.5 mystery resolution authority, branch-isolation invariant, 12-gate Phase 9 — all extended cleanly to arc semantics.
- Per-arc cadence_policy / menu_policy → moved to STORY_KERNEL.md (per-bundle, not per-arc).
- "split_arc" outcome → deferred (route validation back to "revise prose" with constraint feedback).
- Existing JIT mode in storylet-pool-authoring → extended with archetype-cascade rather than re-introduced.

## Post-write amendments (2026-05-07)

Surfaced post-initial-write by user query and folded back into the spec set:

- **Bootstrap PG-0001 choice-creation coverage gap** — the initial spec set focused on `branching-story-page-cycle`'s Phase 8 rewrite (SPEC-20 §F) but did not address `branching-story-bootstrap`'s Phases 7-9 (root render + initial choice generation + validation gates), even though bootstrap is the second skill that emits CHCs (PG-0001's initial 4-6) and renders the root page. Bootstrap's Phase 8 already delegates to page-cycle Phase 8, so the choice-surface gate propagates mechanically — but neither SPEC-20 nor SPEC-22 specified how the gate behaves at PG-0001 (no parent arc to classify against; no closed arc to draw `native_seeds` from; no ARC_TRACE to extract). Resolved by:
  - SPEC-20 §F gained a "Bootstrap PG-0001 special case" sub-paragraph defining the choice-surface gate's behavior at the root: narrative-point classification defaults to NATURAL_COMMITMENT_HINGE; hybrid exit portfolio drawn from initial obligations + threads + seed-pool arc eligibility (no `native_seeds` from a closed arc); choice-worthiness + strong-axis validation apply normally.
  - SPEC-22 Track 4's `branching-story-bootstrap` section expanded with Phase 7 (root page render becomes scene-setter mode — no SLT selection at PG-0001; first arc render is at PG-0002 via page-cycle), Phase 8 (delegate to SPEC-20 §F's choice-surface gate in PG-0001 special-case mode; the legacy `phase-8-choice-generation.md`'s Required CHC diversification + Pair-distance discipline sub-sections are SUPERSEDED by SPEC-20 §F), Phase 9 (gate count 13 → 18, with vacuous-at-root and root-page-exception semantics for the new validators), plus updated deliverables-table rows for the affected reference files.
  - SPEC-22 Problem Statement's bootstrap bullet extended to enumerate Phases 7 + 8 alongside Phase 6 as gap surfaces.
  - IMPLEMENTATION-ORDER's Tier 2 Track 4 description and Tier 3 SPEC-20 description both extended to mention the bootstrap PG-0001 special case.
  - PG-0001 root-page markers: `applied_effect_variant: null`, `narrative_point_classification: NATURAL_COMMITMENT_HINGE`, `arc_trace_id: null`, `arc_trace_emitted: false`. The `effect_model_replay_safety` and `narrative_point_classification` validators (SPEC-22) accept these null/default values when `id == PG-0001` (root-page exception).

- **Story-pipeline coverage pass — gaps surfaced post-bootstrap-amendment** — after the bootstrap PG-0001 fix landed, a follow-up coverage pass against all 5 story-pipeline skills (`branching-story-bootstrap`, `branching-story-health-audit`, `branching-story-page-cycle`, `story-fact-promotion-to-canon`, `storylet-pool-authoring`) surfaced additional gaps where v2 changes affected skills the initial spec set under-addressed. Resolved by:
  - **branching-story-page-cycle (SPEC-20)**: NEW §I sub-section "Phase 11 + Pre-flight Extensions for ARC_TRACE Persistence" — explicitly extends Phase 11's patch-engine op enumeration with `create_arc_trace_record` and Pre-flight's ID pre-allocation list with ARCTRACE per execution_mode budget. Closes the gap that SPEC-20 named the new op (defined in SPEC-22 Track 1) without saying which page-cycle phase emits it.
  - **storylet-pool-authoring (SPEC-21)**: Phase 4 gate 1 mystery-firewall row updated with "extended — see dual-field clarification below"; new "Gate 1 dual-field discipline" paragraph clarifies how v1 `mystery_safety` (storylet-level meta-declaration) and v2 `execution_envelope.mystery_preservation` (per-beat enforcement contract) coexist and must both pass gate 1. Closes the under-specification of how v1 + v2 mystery fields interact under the SLT v2 schema.
  - **branching-story-bootstrap (SPEC-22 Track 4 expansion)**: three new bullets — Phase 9.5 storylet-diversity check uses commitment_class under v2 (parallel to SPEC-21 Phase 5 refactor); Phase 1 may derive cadence_policy / menu_policy defaults from premise tone (literary slow-pace vs action); per-bundle INDEX.md template's storylet-pool summary line becomes "covering <commitment_classes>" instead of "covering <shapes>".
  - **branching-story-health-audit (SPEC-22 Track 4 expansion)**: comprehensive integration of the previously-named SAU report metrics into the audit's Process Flow — `audit_focus` enum gains `arc_conformance` / `choice_cadence` / `commitment_class_coverage` values; Pre-flight World-State Prerequisites adds ARC_TRACE whole-class load via `list_records(record_type='arc_trace_record', story_slug=...)`; the three new sub-checks live in Phase 3 Coverage Analysis with specific severity rules; Phase 7 self-check structural floors include ARC_TRACE evidence-alignment failure (always `error`) + envelope-violation high-severity (always `error`); Phase 4 Cross-Branch Reference Closure Leakage's exhaustive ID-reference list extends with ARC_TRACE references (`created_at_page`, `arc_realized`, `observed_actions[].actor`, `observed_actions[].target`, `effect_evidence[].effect_ref`, `stop_condition_hit.id`); existing `choice_pair_distance` extends to v2 strong-axis collective difference (≥2 distinct strong_axes across menu); existing `choice_continuation_capacity` extends to verify CHC's `commitment_class` matches the named arc's `arc_contract.commitment_class`. Phase 7 self-check test count grows from 11 to 13.
  - **story-fact-promotion-to-canon (SPEC-22 Track 4 expansion)**: full specification of the previously-named `arc_effect_promotion` source_kind — new arguments (`source_arc_id`, `source_page_id`, `applied_variant_id`, `effect_index`); Pre-flight validation branch (verify arc + page + variant + effect_index); Phase 1 source extraction (load arc + applied variant + ARC_TRACE if available); Phase 2 CF candidate translation per effect-type (fact_create / relationship_axis_shift / cast_change / location_change supported; thread_pressure_delta / obligation_status_change / consequence_open / consequence_address NOT directly promotable with structured-warning routing recommendations; mystery_progress routes via `source_kind: mystery_resolution` instead with Pre-flight HARD-REJECT on misuse); Phase 4 mystery firewall checks arc envelope's `forbidden_resolutions[]` against world's whole-class M load; Phase 10 superseding-record shape (the supersession unit is the arc-effect-derived SF / SREL / STENT — NOT the SLT itself, which remains in the bundle's pool unmodified — with new fields `promoted_to_cf`, `promoted_via_arc`, `promoted_via_variant`, `promoted_via_effect_index`); proposal_package extension fields (`source_arc_id`, `applied_variant_id`, `effect_index`, `arc_trace_id`, `arc_trace_evidence_span`).

## Accepted deliverables (4 specs)

| Spec | Path | One-line rationale |
|---|---|---|
| SPEC-19 | `archive/specs/SPEC-19-scene-commitment-arc-schema.md` | Completed foundation tier — SLT v2, CHC v2, ARC_TRACE record class, stop-predicate DSL extension, canonical-vocabulary enums. Every other spec consumes this. |
| SPEC-20 | `specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md` | Runtime tier — page-cycle rewrite for arc selection + effect-variant-before-render + multi-beat render + ARC_TRACE extraction + choice-surface gate. |
| SPEC-21 | `specs/SPEC-21-scene-commitment-arc-authoring.md` | Authoring tier — storylet-pool-authoring rewrite for arc semantics + arc archetype library (14-20 archetypes) + Rule 11 leverage gate. |
| SPEC-22 | `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` | Machine-layer + sibling-skill + migration tier — patch-engine op + 7 validators + canonical-vocabularies + indexer + MCP retrieval + branching-story-bootstrap/health-audit/promotion alignment + test-story discard. |

Plus:
- `specs/IMPLEMENTATION-ORDER.md` — fresh (no prior file in `specs/`); records the read order, implementation order (4 tiers), and dependency graph.

## Dismissed items (with rationale)

| Item | Reason |
|---|---|
| ChatGPT's "split_arc" validation outcome (split a multi-hinge arc into two pages retroactively) | Too complex for v1. Routes validation failure back to "revise prose with constraint feedback that the arc must close at one hinge." Future ticket if pilot data shows persistent split-arc patterns. |
| Per-arc `cadence_policy` block | Per-bundle, not per-arc. Lives on STORY_KERNEL.md (SPEC-20 §H). |
| Per-arc `menu_policy` block | Per-bundle, not per-arc. Lives on STORY_KERNEL.md (SPEC-20 §H). |
| Constrained decoding (NeuroLogic-style) | Deferred per ChatGPT-Pro's own §16 guidance. v1 enforces constraints via prompting + post-render validation. Future-spec candidate if pilot data shows lexical-constraint failures. |
| Wholesale CHC schema replacement | Kept additive. CHC v2 preserves the existing `choice_contract` and `continuation_capacity` blocks; adds `choice_kind`, `commitment_class`, `strategy_cluster`, `choice_worthiness`. Mandatory non-empty `likely_effects`. |
| SLT v2 / v1 parallel-format support | Forward-only. Test bundle discarded; no v1 records survive the cutover. Validator can drop v1 paths in lockstep. |
| RSP card class rename to "remediation-arc-proposal" | Preserved as `RSP-NNNN` for path stability (audit sub-directory paths under `audits/SAU-NNNN/remediation-storylet-proposals/`). Skill prose semantics shift to "remediation-arc-proposal" but id class is unchanged. |
| Façade-style beat-level reactive planning | Out per ChatGPT-Pro's §12 lessons table — "wrong default for your cost model; beat-level responsiveness is expensive." |
| IDtension-style narrative-action interpreter | Out per same source — "expressive formalism can become authorially heavy." |
| Per-page diegesis cache by branch hash | Deferred runtime optimization. Future-ticket candidate after pilot. |
| Empirical token-cost telemetry instrumentation | Implementation-time concern, not a separate spec. Captured in SPEC-20 §Verification and SPEC-22 §Tier 4 pilot. |

## Follow-ups (not in initial spec set)

- **JIT arc promotion to author-pool**: a runtime JIT arc that validates and is approved may be promoted to a permanent author-pool record. Reserve `provenance.origin: jit_promoted_to_authoring`. Future skill or manual workflow; not in v1.
- **Cache arc render packets by branch hash**: precompile the minimal packet needed for a given SLT (relevant participants, facts, obligations, relationships, mysteries, style constraints). Runtime optimization — measurable benefit on auto-chained `interactive_runtime` reads.
- **Arc archetype library expansion**: append-only authorial change to `canonical-vocabularies.ts` + `arc-archetypes.md`. Triggered when pilot Phase 1 diagnosis surfaces gaps.
- **Multi-page arc pagination**: the `CONTINUE_ARC` narrative-point class is reserved for future expansion. v1 implementations treat it as an error/edge case.
- **Beat-function vocabulary closure**: `beat_plan.beats[].function` is open-vocab in v1. If a stable beat-function vocabulary emerges, a future spec may close the grammar.

## Approval

- Brainstorm date: 2026-05-07
- User directive: "work without stopping for clarifying questions" (auto-mode); "create as many specs in specs/* as necessary"; "aligned with docs/FOUNDATIONS.md"
- Confidence at decomposition: ~88%
- Named assumptions carried through: (1) test bundle `worlds/erotica-world/stories/red-bunny/` discarded; (2) ARC_TRACE non-authoritative for replay; (3) cadence_policy / menu_policy live on STORY_KERNEL; (4) `interactive_runtime` auto-chains CONTINUE_ARC + CONTINUE_ONLY_PAUSE; (5) RSP id class preserved (no rename); (6) `effect_model.variants[]` is a list per outcome-band entry; (7) v2 is forward-only, no parallel-format support.
