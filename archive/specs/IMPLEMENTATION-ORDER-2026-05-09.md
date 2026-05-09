# Implementation Order — Scene-Commitment Arc Pivot

**Status**: COMPLETED (2026-05-09)

This document records the read order (for reviewers) and remaining implementation order (for builders) of the scene-commitment-arc spec bundle (SPEC-19 through SPEC-22). It is the first IMPLEMENTATION-ORDER.md in `specs/` since the SPEC-01 through SPEC-18 bundle was archived (`archive/specs/IMPLEMENTATION-ORDER-2026-04-27.md`).

Current state as of 2026-05-09: SPEC-19, SPEC-20, SPEC-21, and SPEC-22 are completed and archived. The scene-commitment-arc foundation bundle is finished; the remaining post-foundation work is the Tier 4 pilot.

## Source

- `reports/scene-arc-storylet-research-brief.md` — research brief authored 2026-05-06 (pacing-pathology evidence + design direction)
- `reports/scene-commitment-arc.md` — ChatGPT-Pro deep-research proposal, 2026-05-06 (validated and adapted to the worldloom codebase)
- `docs/triage/2026-05-07-scene-commitment-arc-triage.md` — brainstorm triage record

## Design read order (for reviewers)

`SPEC-19` → `SPEC-22` → `SPEC-20` → `SPEC-21`

This order builds conceptual understanding for the scene-commitment-arc pivot:

1. **SPEC-19** establishes the data-model contract (SLT v2, CHC v2, ARC_TRACE, stop-predicate DSL extension, canonical-vocabulary enums). Every other spec consumes these schemas. SPEC-19 is completed and archived at `archive/specs/SPEC-19-scene-commitment-arc-schema.md`.
2. **SPEC-22** is read second because it lands the engine surface (patch-engine op, validators, indexer/MCP retrieval, canonical-vocabularies implementation, sibling-skill alignment, test-story discard) that the runtime and authoring skills both depend on. SPEC-22 is completed and archived at `archive/specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md`.
3. **SPEC-20** rewrites the runtime page-cycle (Phase 4 arc selection, Phase 4b effect-variant selection, Phase 7 multi-beat render, Phase 7.6 ARC_TRACE extraction, Phase 8 choice-surface gate). SPEC-20 is completed and archived at `archive/specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md`; its deterministic runtime validator/package proof was completed through SPEC-22.
4. **SPEC-21** rewrites the authoring skill (storylet-pool-authoring) for arc semantics. SPEC-21 is completed and archived at `archive/specs/SPEC-21-scene-commitment-arc-authoring.md`; its deterministic validator/package proof was completed through SPEC-22.

## Implementation order (for builders)

### Phase 0 — Prep

1. Spec-bundle review and approval (this file + SPEC-19 / SPEC-20 / SPEC-21 / SPEC-22 + the triage file). User reads, requests revisions, approves. SPEC-19, SPEC-20, SPEC-21, and SPEC-22 are now completed/archived; remaining implementation attention is on the Tier 4 pilot.
2. Spec → tickets decomposition (via `/spec-to-tickets` or manual). Each spec produces 3-8 tickets.
3. Migration directive announcement: the test-story bundle at `worlds/erotica-world/stories/red-bunny/` is scheduled for deletion in SPEC-22 Track 5. Document the discard in the spec audit trail (the specs themselves serve as the audit trail).

**Completion gate**: spec bundle approved; SPEC-19, SPEC-20, SPEC-21, and SPEC-22 are archived; Tier 4 pilot is the only remaining post-foundation work.

### Tier 1 — Foundation (sequential)

**SPEC-19 — Schemas + canonical vocabularies + stop-predicate DSL** (completed; archived at `archive/specs/SPEC-19-scene-commitment-arc-schema.md`):

- Update `templates/storylet-record.yaml` to v2 schema.
- Update `branching-story-page-cycle/references/record-schemas.md` for CHC v2 + ARC_TRACE.
- Extend `templates/predicate-dsl.md` with stop predicates.
- (TypeScript implementation of canonical-vocabularies and types lands in Tier 2 with SPEC-22.)
- (Validators land in Tier 2 with SPEC-22.)

**Completion gate**: schema templates updated; the predicate DSL grammar file lists the stop-predicate tier. Spec text alone does not require Tier-2 work to land.

### Tier 2 — Engine surface + cross-skill alignment + migration (sequential within tier)

**SPEC-22 — Patch-engine op + validators + canonical-vocabularies + indexer + MCP retrieval + sibling-skill alignment + test-story discard** (completed; archived at `archive/specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md`):

- **Track 1 (Patch-engine op)**: `create_arc_trace_record` lands in `tools/patch-engine/src/ops/`; envelope schema extended; pre-apply check extended.
- **Track 2 (Validators)**: 8 rule validators + extensions to `record_schema_compliance` + `_shared/predicate-dsl-grammar.ts`. Includes unit-test fixtures. Track 2 validator inventory is complete through `archive/tickets/SPEC22SCECOM-005.md`, including UTF-8 byte-offset trace-evidence coverage.
- **Track 3 (Canonical-vocabularies + indexer + MCP retrieval)**: TypeScript enums and `get_canonical_vocabulary` landed via `archive/tickets/SPEC22SCECOM-006.md`; indexer ARC_TRACE parsing landed via `archive/tickets/SPEC22SCECOM-007.md`; MCP retrieval surfaces accept ARCTRACE ids, `arc_trace_record` listing, ARC_TRACE field projection, and `arc_trace_node` schema discovery via `archive/tickets/SPEC22SCECOM-008.md`.
- **Track 4 (Sibling-skill alignment)**: `branching-story-bootstrap` Phase 6 arithmetic + STORY_KERNEL template extensions + Phase 7 scene-setter mode (no SLT selection at PG-0001) + Phase 8 PG-0001 special-case delegation to SPEC-20 §F's choice-surface gate + Phase 9 gate count 12 -> 17 (5 new validators applied at PG-0001 with vacuous-at-root and root-page-exception semantics) + Phase 9.5 storylet-diversity check uses commitment_class + Phase 1 may derive cadence_policy / menu_policy defaults from premise + per-bundle INDEX.md template wording updated for arc cadence; `branching-story-health-audit` audit_focus enum + Pre-flight ARC_TRACE retrieval + three new Phase 3 sub-checks (choice_cadence / arc_conformance / commitment_class_coverage) + Phase 7 self-check structural floors for ARC_TRACE evidence-alignment + envelope-violation severity + Phase 4 recursive-closure walk extends to ARC_TRACE references + existing choice_pair_distance and choice_continuation_capacity sub-checks extend for v2 strong-axis collective difference and CHC v2 -> arc references; `story-fact-promotion-to-canon` source_kind enum gains `arc_effect_promotion` with full specification (completed by `archive/tickets/SPEC22SCECOM-012.md`: new arguments, Pre-flight validation, Phase 1 source extraction, Phase 2 CF translation, Phase 4 mystery firewall, Phase 10 superseding-record shape, proposal_package and ledger extension fields); `branching-story-page-cycle` record-schemas extension completed by `archive/tickets/SPEC22SCECOM-013.md`.
- **Track 5 (Migration)**: user-driven `rm -rf worlds/erotica-world/stories/red-bunny/`; `worlds/erotica-world/stories/INDEX.md` updated to remove the entry via `archive/tickets/SPEC22SCECOM-014.md`.

Tracks 1-3 land before Tracks 4-5 (sibling skills depend on validators and canonical-vocabularies being in place).

**Completion gate**: completed by `archive/tickets/SPEC22SCECOM-015.md`. The capstone covers patch-engine validate/submit/re-read, validator registry and Phase 9 prose witnesses, canonical vocabulary counts, ARC_TRACE index ingestion, sibling-skill static contracts, migration state, and Hook 3 story-bundle `_source/` coverage.

### Tier 3 — Runtime + authoring (completed)

**SPEC-20 — Runtime pipeline rewrite** (completed; archived at `archive/specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md`):

- Phase 4 (arc selection); Phase 4b (effect-variant selection before render); Phase 5 (arc-level effect application); Phase 7 (multi-beat arc render); Phase 7.6 (ARC_TRACE extraction + three-layer validation); Phase 8 (choice-surface gate, including the Bootstrap PG-0001 special case sub-paragraph that bootstrap's Phase 8 delegates against); Phase 1 write-in commitment-class classification; STORY_KERNEL.md cadence_policy + menu_policy blocks; Phase 11 patch-engine op enumeration extends with create_arc_trace_record + Pre-flight ID pre-allocation extends with ARCTRACE per execution_mode budget.

Archive note: SPEC-20's implementation tickets landed and archived the runtime skill/reference contract. The final SPEC-20 verification-contract audit rejected a non-production Claude skill-run capstone; deterministic validator/package proof was completed by SPEC-22, while token-cost and pause-count evidence moves to production-pilot telemetry.

**SPEC-21 — Authoring-skill rewrite** (completed; archived at `archive/specs/SPEC-21-scene-commitment-arc-authoring.md`):

- Phase 1 (commitment-class coverage matrix); Phase 2 (arc seed format); Phase 3 (arc schema fill); Phase 4 (14 gates); Phase 5 (refactored diversity axes); JIT mode template cascade; Audit mode RSP card integration; new `arc-archetypes.md` template (14-20 archetypes).

Archive note: SPEC-21's implementation tickets landed and archived the authoring skill/reference contract. The final cross-cutting docs ticket aligned parent `SKILL.md` and the SLB manifest with the landed v2 authoring surfaces. Deterministic validator/package proof was completed by SPEC-22.

**Completion gate per spec**:
- SPEC-20: completed as the archived runtime contract at `archive/specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md`; runtime validator/package proof was completed by SPEC-22, and live token-cost / pause-count evidence is part of Tier 4 pilot telemetry.
- SPEC-21: completed as the archived authoring contract at `archive/specs/SPEC-21-scene-commitment-arc-authoring.md`; deterministic validator/package proof was completed by SPEC-22.

### Tier 4 — Pilot + iteration (post-Tier-3)

1. Bootstrap a fresh story bundle on `worlds/animalia/` (or another v2-native world) using the new `branching-story-bootstrap` (target_pool_size: 10 arcs).
2. Run 5-10 page-cycle ticks across 2-3 branches.
3. Measure: token cost per arc-page (target: ~4 LLM calls per arc vs ~5 per beat × N beats); choice cadence in arc-units only (mean arcs between menus, menu-emitting page ratio, and CONTINUE_ARC / CONTINUE_ONLY_PAUSE / INTERRUPT_HINGE counts); choice-worthiness (target: 0/N CHCs with empty likely_effects).
4. Iterate on the arc archetype library, the cadence_policy thresholds, and the validator gates based on pilot findings.

**Completion gate**: pilot bundle has 5+ arc-pages with PASS validation; token-cost reduction is empirically measured; the cadence_policy defaults are validated or adjusted.

## Cross-spec dependency graph

```
SPEC-19 (archived) ─────────┐
   │                        │
   ├─→ SPEC-22 (archived) ┬───┴─→ SPEC-20 (archived runtime contract)
   │   (foundation +    │
   │    cross-skill)    └─────→ SPEC-21 (archived authoring contract)
   │
   └────────────────────────────→ (Tier 1 schema-text-only deliverables)
```

## Notes

- **Test-story discard**: `worlds/erotica-world/stories/red-bunny/` is discarded as part of Tier 2. This is a one-time migration; the spec bundle itself is the audit trail (no CH-NNNN is allocated because no world-canon mutation occurs — bundles are story-local derived layers per FOUNDATIONS §Story Bundles §8).
- **Forward-only**: the v2 schema does not coexist with v1. Worlds with v1 records would need their bundles discarded before using the v2 flow. At intake, only `worlds/erotica-world/stories/red-bunny/` carried v1 records, and it was discarded in `archive/tickets/SPEC22SCECOM-014.md`.
- **No git-tracked migration of red-bunny**: the bundle's deletion lands as a single user-driven `rm -rf`; the spec text is the discoverable record.
- **Auto-chain in interactive_runtime**: SPEC-20's auto-chaining of CONTINUE_ARC and CONTINUE_ONLY_PAUSE pages requires the runtime page-cycle to be re-invocable from within itself (or the wrapping driver). The existing skill-invocation discipline supports this; no new skill-runtime feature is needed.
- **Spec-to-tickets**: when invoking `/spec-to-tickets` (or equivalent), use the namespace prefixes `SPEC19SCAS` (Schema), `SPEC20SCAR` (Runtime), `SPEC21SCAA` (Authoring), `SPEC22SCAE` (Engine + cross-skill). The 4-letter suffix mnemonics are: SCAS = Scene-Commitment-Arc Schema; SCAR = Scene-Commitment-Arc Runtime; SCAA = Scene-Commitment-Arc Authoring; SCAE = Scene-Commitment-Arc Engine.

## Estimated implementation effort

- **Tier 1 (SPEC-19 schema templates)**: ~2 days (template/markdown updates only).
- **Tier 2 (SPEC-22 engine + cross-skill + migration)**: completed and archived.
  - Tracks 1-3 (engine + validators + canonical-vocabularies + indexer + MCP): completed.
  - Track 4 (sibling-skill alignment): completed.
  - Track 5 (migration): completed.
- **Tier 3 (SPEC-20 runtime + SPEC-21 authoring)**: completed and archived.
- **Tier 4 (pilot)**: ~1-2 weeks of running, measuring, and iterating.

**Remaining total from 2026-05-09 state**: the spec bundle is complete; remaining work is the Tier 4 pilot (~1-2 weeks of running, measuring, and iterating). The original full-bundle estimate was ~6-9 weeks from spec approval to a piloted v2 page-cycle.

## Outcome (2026-05-09)

This implementation-order file is complete and archived as historical planning/status for the SPEC-19 through SPEC-22 scene-commitment-arc foundation bundle.

What changed during closeout:

- SPEC-22 was archived at `archive/specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md`.
- SPEC-22 status, dependency notes, completion gates, and estimates were updated from active/future wording to completed/archive wording.
- Tier 4 pilot work remains explicitly outside this archived foundation order.

Verification:

- `archive/specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` exists after the spec archive move.
- `rg -P '(?<!archive/)specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill\.md'` returned no stale active SPEC-22 path references before archiving this file.
- Patch hygiene passed for the archived spec and implementation-order edits.
