# Implementation Order — Scene-Commitment Arc Pivot

**Status**: UPDATED (2026-05-08)

This document records the read order (for reviewers) and remaining implementation order (for builders) of the scene-commitment-arc spec bundle (SPEC-19 through SPEC-22). It is the first IMPLEMENTATION-ORDER.md in `specs/` since the SPEC-01 through SPEC-18 bundle was archived (`archive/specs/IMPLEMENTATION-ORDER-2026-04-27.md`).

Current state as of 2026-05-08: SPEC-19 and SPEC-20 are completed and archived. SPEC-22 remains the active machine-facing / cross-skill foundation for engine ops, validators, canonical vocabularies, indexer/MCP retrieval, sibling-skill alignment, migration, and deterministic runtime proof. SPEC-21 remains active authoring-skill work.

## Source

- `reports/scene-arc-storylet-research-brief.md` — research brief authored 2026-05-06 (pacing-pathology evidence + design direction)
- `reports/scene-commitment-arc.md` — ChatGPT-Pro deep-research proposal, 2026-05-06 (validated and adapted to the worldloom codebase)
- `docs/triage/2026-05-07-scene-commitment-arc-triage.md` — brainstorm triage record

## Design read order (for reviewers)

`SPEC-19` → `SPEC-22` → `SPEC-20` → `SPEC-21`

This order builds conceptual understanding for the scene-commitment-arc pivot:

1. **SPEC-19** establishes the data-model contract (SLT v2, CHC v2, ARC_TRACE, stop-predicate DSL extension, canonical-vocabulary enums). Every other spec consumes these schemas. SPEC-19 is completed and archived at `archive/specs/SPEC-19-scene-commitment-arc-schema.md`.
2. **SPEC-22** is read second because it lands the engine surface (patch-engine op, validators, indexer/MCP retrieval, canonical-vocabularies implementation, sibling-skill alignment, test-story discard) that the runtime and authoring skills both depend on.
3. **SPEC-20** rewrites the runtime page-cycle (Phase 4 arc selection, Phase 4b effect-variant selection, Phase 7 multi-beat render, Phase 7.6 ARC_TRACE extraction, Phase 8 choice-surface gate). SPEC-20 is completed and archived at `archive/specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md`; its deterministic runtime validator/package proof remains routed through SPEC-22.
4. **SPEC-21** rewrites the authoring skill (storylet-pool-authoring) for arc semantics. It also depends on SPEC-19 + SPEC-22 but is independent of SPEC-20; with SPEC-20 complete, SPEC-21 now waits only on the relevant SPEC-22 foundations.

## Implementation order (for builders)

### Phase 0 — Prep

1. Spec-bundle review and approval (this file + SPEC-19 / SPEC-20 / SPEC-21 / SPEC-22 + the triage file). User reads, requests revisions, approves. SPEC-19 and SPEC-20 are now completed/archived; remaining review and implementation attention is on SPEC-22 and SPEC-21.
2. Spec → tickets decomposition (via `/spec-to-tickets` or manual). Each spec produces 3-8 tickets.
3. Migration directive announcement: the test-story bundle at `worlds/erotica-world/stories/red-bunny/` is scheduled for deletion in SPEC-22 Track 5. Document the discard in the spec audit trail (the specs themselves serve as the audit trail).

**Completion gate**: spec bundle approved; SPEC-19 and SPEC-20 are archived; remaining active tickets/spec work cover SPEC-22, SPEC-21, and the SPEC-22 Track 5 test-bundle discard.

### Tier 1 — Foundation (sequential)

**SPEC-19 — Schemas + canonical vocabularies + stop-predicate DSL** (completed; archived at `archive/specs/SPEC-19-scene-commitment-arc-schema.md`):

- Update `templates/storylet-record.yaml` to v2 schema.
- Update `branching-story-page-cycle/references/record-schemas.md` for CHC v2 + ARC_TRACE.
- Extend `templates/predicate-dsl.md` with stop predicates.
- (TypeScript implementation of canonical-vocabularies and types lands in Tier 2 with SPEC-22.)
- (Validators land in Tier 2 with SPEC-22.)

**Completion gate**: schema templates updated; the predicate DSL grammar file lists the stop-predicate tier. Spec text alone does not require Tier-2 work to land.

### Tier 2 — Engine surface + cross-skill alignment + migration (sequential within tier)

**SPEC-22 — Patch-engine op + validators + canonical-vocabularies + indexer + MCP retrieval + sibling-skill alignment + test-story discard**:

- **Track 1 (Patch-engine op)**: `create_arc_trace_record` lands in `tools/patch-engine/src/ops/`; envelope schema extended; pre-apply check extended.
- **Track 2 (Validators)**: 7 new validators + extensions to `record_schema_compliance` + `_shared/predicate-dsl-grammar.ts`. Includes unit-test fixtures.
- **Track 3 (Canonical-vocabularies + indexer + MCP retrieval)**: TypeScript enums; indexer parses ARC_TRACE; MCP retrieval surfaces accept ARCTRACE ids; `get_canonical_vocabulary` returns the new enums.
- **Track 4 (Sibling-skill alignment)**: `branching-story-bootstrap` Phase 6 arithmetic + STORY_KERNEL template extensions + Phase 7 scene-setter mode (no SLT selection at PG-0001) + Phase 8 PG-0001 special-case delegation to SPEC-20 §F's choice-surface gate + Phase 9 gate count 13 → 18 (5 new validators applied at PG-0001 with vacuous-at-root and root-page-exception semantics) + Phase 9.5 storylet-diversity check uses commitment_class + Phase 1 may derive cadence_policy / menu_policy defaults from premise + per-bundle INDEX.md template wording updated for arc cadence; `branching-story-health-audit` audit_focus enum + Pre-flight ARC_TRACE retrieval + three new Phase 3 sub-checks (choice_cadence / arc_conformance / commitment_class_coverage) + Phase 7 self-check structural floors for ARC_TRACE evidence-alignment + envelope-violation severity + Phase 4 recursive-closure walk extends to ARC_TRACE references + existing choice_pair_distance and choice_continuation_capacity sub-checks extend for v2 strong-axis collective difference and CHC v2 → arc references; `story-fact-promotion-to-canon` source_kind enum gains `arc_effect_promotion` with full specification (new arguments, Pre-flight validation, Phase 1 source extraction, Phase 2 CF translation, Phase 4 mystery firewall, Phase 10 superseding-record shape, proposal_package extension fields); `branching-story-page-cycle` record-schemas extension.
- **Track 5 (Migration)**: user-driven `rm -rf worlds/erotica-world/stories/red-bunny/`; `worlds/erotica-world/stories/INDEX.md` updated to remove the entry.

Tracks 1-3 land before Tracks 4-5 (sibling skills depend on validators and canonical-vocabularies being in place).

**Completion gate**: `world-validate` runs over a v2 SLT + CHC v2 + ARC_TRACE fixture and emits PASS for all new validators; `mcp__worldloom__get_canonical_vocabulary({class: 'commitment_class'})` returns the 20-entry array; the test bundle is absent from disk; the cross-skill alignment changes are complete in skill prose.

### Tier 3 — Runtime + authoring

**SPEC-20 — Runtime pipeline rewrite** (completed; archived at `archive/specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md`):

- Phase 4 (arc selection); Phase 4b (effect-variant selection before render); Phase 5 (arc-level effect application); Phase 7 (multi-beat arc render); Phase 7.6 (ARC_TRACE extraction + three-layer validation); Phase 8 (choice-surface gate, including the Bootstrap PG-0001 special case sub-paragraph that bootstrap's Phase 8 delegates against); Phase 1 write-in commitment-class classification; STORY_KERNEL.md cadence_policy + menu_policy blocks; Phase 11 patch-engine op enumeration extends with create_arc_trace_record + Pre-flight ID pre-allocation extends with ARCTRACE per execution_mode budget.

Archive note: SPEC-20's implementation tickets landed and archived the runtime skill/reference contract. The final SPEC-20 verification-contract audit rejected a non-production Claude skill-run capstone; deterministic validator/package proof remains owned by SPEC-22, while token-cost and pause-count evidence move to production-pilot telemetry.

**SPEC-21 — Authoring-skill rewrite** (depends on SPEC-19 + SPEC-22; independent of SPEC-20):

- Phase 1 (commitment-class coverage matrix); Phase 2 (arc seed format); Phase 3 (arc schema fill); Phase 4 (14 gates); Phase 5 (refactored diversity axes); JIT mode template cascade; Audit mode RSP card integration; new `arc-archetypes.md` template (14-20 archetypes).

SPEC-21 can proceed once the relevant SPEC-22 foundations are in place. The pilot run (Tier 4 below) requires SPEC-21 to be complete and SPEC-22's deterministic validator/package proof surfaces to be available.

**Completion gate per spec**:
- SPEC-20: completed as the archived runtime contract at `archive/specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md`; runtime validator/package proof is part of SPEC-22, and live token-cost / pause-count evidence is part of Tier 4 pilot telemetry.
- SPEC-21: a `storylet-pool-authoring mode=seed` direct invocation produces a 10-arc batch (target_pool_size=10) where every arc passes all 14 Phase 4 gates and the batch passes Phase 5 diversity audit.

### Tier 4 — Pilot + iteration (post-Tier-3)

1. Bootstrap a fresh story bundle on `worlds/animalia/` (or another v2-native world) using the new `branching-story-bootstrap` (target_pool_size: 10 arcs).
2. Run 5-10 page-cycle ticks across 2-3 branches.
3. Measure: token cost per arc-page (target: ~4 LLM calls per arc vs ~5 per beat × N beats); choice cadence (target: mean words per arc-page in [700, 2000]; menu-emission ratio: pages with menus ÷ total pages); choice-worthiness (target: 0/N CHCs with empty likely_effects).
4. Iterate on the arc archetype library, the cadence_policy thresholds, and the validator gates based on pilot findings.

**Completion gate**: pilot bundle has 5+ arc-pages with PASS validation; token-cost reduction is empirically measured; the cadence_policy defaults are validated or adjusted.

## Cross-spec dependency graph

```
SPEC-19 (archived) ─────────┐
   │                        │
   ├─→ SPEC-22 ─────────┬───┴─→ SPEC-20 (archived runtime contract)
   │   (foundation +    │
   │    cross-skill)    └─────→ SPEC-21
   │
   └────────────────────────────→ (Tier 1 schema-text-only deliverables)
```

## Notes

- **Test-story discard**: `worlds/erotica-world/stories/red-bunny/` is discarded as part of Tier 2. This is a one-time migration; the spec bundle itself is the audit trail (no CH-NNNN is allocated because no world-canon mutation occurs — bundles are story-local derived layers per FOUNDATIONS §Story Bundles §8).
- **Forward-only**: the v2 schema does not coexist with v1. Worlds with v1 records would need their bundles discarded before SPEC-22 lands. At intake, only `worlds/erotica-world/stories/red-bunny/` carries v1 records.
- **No git-tracked migration of red-bunny**: the bundle's deletion lands as a single user-driven `rm -rf`; the spec text is the discoverable record.
- **Auto-chain in interactive_runtime**: SPEC-20's auto-chaining of CONTINUE_ARC and CONTINUE_ONLY_PAUSE pages requires the runtime page-cycle to be re-invocable from within itself (or the wrapping driver). The existing skill-invocation discipline supports this; no new skill-runtime feature is needed.
- **Spec-to-tickets**: when invoking `/spec-to-tickets` (or equivalent), use the namespace prefixes `SPEC19SCAS` (Schema), `SPEC20SCAR` (Runtime), `SPEC21SCAA` (Authoring), `SPEC22SCAE` (Engine + cross-skill). The 4-letter suffix mnemonics are: SCAS = Scene-Commitment-Arc Schema; SCAR = Scene-Commitment-Arc Runtime; SCAA = Scene-Commitment-Arc Authoring; SCAE = Scene-Commitment-Arc Engine.

## Estimated implementation effort

- **Tier 1 (SPEC-19 schema templates)**: ~2 days (template/markdown updates only).
- **Tier 2 (SPEC-22 engine + cross-skill + migration)**: ~3-4 weeks.
  - Tracks 1-3 (engine + validators + canonical-vocabularies + indexer + MCP): ~2-3 weeks for an experienced TypeScript engineer.
  - Track 4 (sibling-skill alignment): ~3-5 days of skill prose updates.
  - Track 5 (migration): ~30 minutes (one-time `rm -rf` + INDEX.md edit).
- **Tier 3 remaining (SPEC-21 authoring)**: ~1 week of skill prose updates + ~3-5 days for the arc archetype library content. SPEC-20 runtime contract work is complete and archived.
- **Tier 4 (pilot)**: ~1-2 weeks of running, measuring, and iterating.

**Remaining total from 2026-05-08 state**: ~5-8 weeks to complete SPEC-22, SPEC-21, and the pilot. The original full-bundle estimate was ~6-9 weeks from spec approval to a piloted v2 page-cycle, before SPEC-19 and SPEC-20 were archived.
