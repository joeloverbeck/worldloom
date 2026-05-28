# MCPENH-074: `select_storylet_candidates` filter_trace surfaces per-SLT exclusion samples for every filter stage

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/tools/select-storylet-candidates.ts` (`StoryletCandidateFilterTrace` interface + per-stage rejected-sample collection), `tools/world-mcp/src/context-packet/shared.ts` (embedded selection-shortlist trace shape), `tools/world-mcp/src/server.ts` (registered tool description), `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` and `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` (fixtures + assertions), `docs/MACHINE-FACING-LAYER.md` (selector response-shape documentation), `tools/world-mcp/README.md` (mirror of selector response-shape docs).
**Deps**: None. `archive/tickets/STSELECT-001.md` is complementary — it fixed the indexer bug that made SLT-42 drop at the `after_predicate_class` stage; this ticket adds the per-stage exclusion observability that would have made that bug visible from the MCP response alone. They touch disjoint code paths.

## Problem

`mcp__worldloom__select_storylet_candidates` returns a `filter_trace` object that emits aggregate counts for nine filter stages (`pool_total`, `after_scope`, `after_driver_kind`, `after_action_family`, `after_predicate_shape`, `after_predicate_class`, `after_source_record_id`, `after_mystery_policy`, `after_cooldown`) plus per-SLT exclusion samples for exactly one stage (`cooldown_active_samples`, bounded to 3 entries). When an author expects a specific SLT to surface but it doesn't, the count-only stages provide no diagnostic surface — the operator cannot tell WHICH SLTs were dropped at WHICH stage or WHY.

Observed at `red-bunny` PG-6 → SE-7 turn-cycle invocation (this session): I called `select_storylet_candidates(world_slug='erotica-world', story_slug='red-bunny', parent_page_id='PG-6', turn_driver={kind:'npc_action', initiator:'STENT-1', driver_records:['STINT-10','STEMO-15','STQ-5','THR-7','BEL-16','STCHAR-1']}, intent_signature={action_families:['communicate','bond','negotiate'], grounding_record_ids:[...], grounding_record_classes:['STQ','STEMO','THR','STINT','BEL','STCHAR','SREL','STSEC']})` and received `filter_trace.pool_total: 42 → after_scope: 42 → after_driver_kind: 18 → after_action_family: 15 → after_predicate_shape: 15 → after_predicate_class: 3 → after_source_record_id: 3 → after_mystery_policy: 3 → after_cooldown: 3` with `shortlisted_candidate_ids: ['SLT-27','SLT-24','SLT-16']`. The canonical author-pool fit `SLT-42` (`NPC commits a response register to a pending offer` — `reason_to_exist` documents it as the dedicated NPC-response-commitment block for exactly this turn shape) was absent from the shortlist. With aggregate counts only, the response gave me zero information about which SLTs the `after_predicate_class` stage dropped or which records' classes the predicate indexer thought SLT-42 referenced.

To diagnose, I had to grep `tools/world-mcp/src/tools/select-storylet-candidates.ts` (lines 363-373's `matchesPredicateClass`) and trace upstream to `tools/world-index/src/parse/atomic.ts:1564` (`predicateReferencedClasses`) to discover that the indexer extracts `holder_role` / `kind` / `record_class` fields instead of mapping the predicate name (`any_story_question_open` → STQ, `any_intention` → STINT, etc.) to its referenced record class. The indexer bug was fixed under `archive/tickets/STSELECT-001.md`; THIS ticket addresses the parallel observability gap that delayed the root-cause discovery.

The fix mirrors the existing precedent: `cooldown_active_samples` returns up to 3 `CooldownActiveSample` entries with the dropped SLT's id + cooldown context. Extending this pattern to the seven previously count-only filtering stages — bounded to 3 samples each, each sample carrying the SLT id + stage-specific rejection reason — converts the filter_trace from a count-only surface to a diagnostic surface without bloating the response.

## Assumption Reassessment (2026-05-27)

1. **Codebase reassessment**: confirmed via `tools/world-mcp/src/tools/select-storylet-candidates.ts:41-52` that `StoryletCandidateFilterTrace` interface emits aggregate counts for 9 filter stages plus `cooldown_active_samples` (the only per-SLT exclusion surface). The filter implementation at lines 619-666 runs each stage's `.filter()` predicate and updates only the stage's count, discarding the rejected-SLT identities. The `cooldown_active_samples` collection at lines 655-665 is the implemented precedent: bounded to 3 entries, each holding the dropped SLT's id plus stage-specific rejection context (`CooldownActiveSample` type). No other stage collects samples; working tree clean for the affected file (`git status --porcelain tools/world-mcp/src/tools/select-storylet-candidates.ts` returned empty).
2. **Doc reassessment**: `docs/MACHINE-FACING-LAYER.md:208` documents `verify_pg_state_hash` but the `select_storylet_candidates` row's coverage of `filter_trace` is at the schema-shape level (it names the field exists) without per-stage exclusion-sample semantics. The discoverable MCP tool description at `tools/world-mcp/src/server.ts` registration carries the same shape (count-only). No archived MCPENH ticket addresses this gap: archive content-grep of `archive/tickets/MCPENH-*.md` for `filter_trace|exclusion[_ ]reason|per[_ ]sample|cooldown_active_samples` surfaces only MCPENH-070 (which widened the `after_source_record_id` filter to wildcard-pass existential SLTs — a different stage and a different concern; this ticket is not a duplicate of MCPENH-070). Same-surface verification: MCPENH-070's Outcome ("existential-only candidates wildcard-pass the source-record-id filter") addresses the `after_source_record_id` filter stage, not the `after_predicate_class` stage where this ticket's motivating SLT-42 drop occurred, and not the observability gap that delayed diagnosis.
3. **Cross-skill / cross-artifact boundary**: `select_storylet_candidates` is consumed by every story-pipeline skill that runs at PG-authoring scope — `branching-story-turn-cycle` Phase 2-3 (per `.claude/skills/branching-story-turn-cycle/SKILL.md` Procedure step 4), `branching-story-bootstrap` Phase 2 (when shortlisting seed-pool SLTs), and `commitment-block-authoring` (per its Phase prose). The selector is also invoked indirectly by `mcp__worldloom__get_context_packet` task types whose `story_bundle_context.selection_shortlist` runs the same projection per `docs/CONTEXT-PACKET-CONTRACT.md`. The shared boundary under audit is the `StoryletCandidateFilterTrace` response-shape contract: every consumer relies on `filter_trace` to audit selection decisions, and the count-only surface degrades audit utility uniformly across consumers. The fix lands additively in the response shape; consumers can opt-in to the new fields without breaking change.
4. **FOUNDATIONS principle restatement**: §Tooling Recommendation ("Reading and writing canon-shaped content must happen through `mcp__worldloom__*` tools whenever such a tool exists") is the contract principle this ticket strengthens. The principle's underlying motivation is that the MCP retrieval surface is the audit primitive operators rely on for selection decisions — without per-stage exclusion samples, operators who hit the documented retrieval surface still fall back to direct source-file inspection when a specific SLT is expected but missing, defeating the principle's intent. The current state is silently non-conformant: the MCP surface exists but its diagnostic utility is asymmetric across filter stages (cooldown stage has samples; eight other stages don't). Extending the sample-collection precedent to every stage preserves Tooling Recommendation's intent uniformly.
5. **Existing-output schema extended**: `StoryletCandidateFilterTrace` interface at `tools/world-mcp/src/tools/select-storylet-candidates.ts` is the existing output schema this ticket extends. The extension is additive-only: new per-stage array fields (`scope_rejected_samples`, `driver_kind_rejected_samples`, `action_family_rejected_samples`, `predicate_shape_rejected_samples`, `predicate_class_rejected_samples`, `source_record_id_rejected_samples`, `mystery_policy_rejected_samples`) plus the existing `cooldown_active_samples` (unchanged). Each new field is `ReadonlyArray<StageRejectedSample>` where `StageRejectedSample` carries `{slt_id: string, reason: string, evidence: Record<string, unknown>}` — the `evidence` field is per-stage typed-but-flexible (e.g., for `predicate_class_rejected_samples`, evidence contains `{indexed_classes: string[], requested_classes: string[]}`). Existing `SelectStoryletCandidatesResponse` consumers that destructure `filter_trace.cooldown_active_samples` are unaffected; new consumers can opt in. The schema-extension shape is additive-with-default-empty-array — every new field defaults to `[]` when no SLT was dropped at that stage, preserving response-shape stability across pre- and post-landing call patterns.
6. **Current-run reassessment**: `npm test` passed pre-edit in `tools/world-mcp` (496 tests, 0 failures), so the package baseline was green before implementation. Live consumer search showed `tools/world-mcp/src/context-packet/shared.ts` repeats the embedded `selection_shortlist.filter_trace` type, so the owned file set is widened to include that type projection. The direct MCP external call is unavailable in this Codex context; package-local handler tests plus package build/test remain the truthful proof surface.

## Architecture Check

1. **Cleaner than alternatives**. Option A (mirror `cooldown_active_samples` precedent across all stages) is the smallest, most local change and reuses an established pattern already documented in the MCP tool description. Option B (add a debug-only verbose mode toggled by an `intent_signature.debug=true` flag) introduces a parallel response shape with conditional fields, doubling the schema-discovery surface — strictly worse for documentation and for downstream consumers. Option C (return the full set of rejected SLTs per stage without bounding) bloats the response unpredictably (a stage that drops 30+ SLTs would emit 30+ rejected-sample entries); the 3-sample cap matches `cooldown_active_samples`'s established discipline. Option D (don't change the response and tell operators to grep the source) is what the current state does — the audit's session evidence documents the operator-time cost.
2. **No backwards-compatibility aliasing/shims introduced**. The fix is purely additive to the response shape. Existing consumers that access `filter_trace.pool_total` / `after_scope` / etc. continue to read the same aggregate counts; new consumers opt-in to per-stage samples. No deprecated field, no aliased name, no migration path required.

## Verification Layers

1. Every previously count-only filter stage that drops at least one SLT emits a non-empty rejected-samples array (bounded to 3), while the cooldown stage preserves `cooldown_active_samples` -> codebase grep-proof + schema validation.
2. Each sample carries the dropped SLT's id plus stage-specific rejection evidence sufficient to diagnose the drop without grepping source -> schema validation (per-stage `StageRejectedSample` shape) + regression test fixture for each stage.
3. Existing consumers of `StoryletCandidateFilterTrace` (the schema-discovery surface, `docs/MACHINE-FACING-LAYER.md`'s row, `get_context_packet`'s `selection_shortlist` consumer) are unaffected by the additive extension -> codebase grep-proof (`grep -rn 'StoryletCandidateFilterTrace\|filter_trace' tools/` to enumerate every consumer and assert each works with both the old and new shapes).
4. The motivating SLT-42 case is captured as a regression test: given a parent page state where SLT-42's predicate classes intersect the request, it returns SLT-42 in the shortlist with empty predicate-class rejection samples; with a deliberately omitted predicate class, it emits `predicate_class_rejected_samples` containing SLT-42 with evidence `{indexed_classes: [...], requested_classes: [...]}` -> focused package test.
5. The `cooldown_active_samples` precedent is unchanged in shape and behavior -> regression assertion in the existing test fixture.

## Landed Changes

### 1. Extend `StoryletCandidateFilterTrace` interface

In `tools/world-mcp/src/tools/select-storylet-candidates.ts`, `StoryletCandidateFilterTrace` now includes per-stage rejected-sample arrays. A generic `StageRejectedSample` type was added:

```typescript
export interface StageRejectedSample {
  slt_id: string;
  reason: string;
  evidence: Record<string, unknown>;
}
```

The trace interface includes `scope_rejected_samples`, `driver_kind_rejected_samples`, `action_family_rejected_samples`, `predicate_shape_rejected_samples`, `predicate_class_rejected_samples`, `source_record_id_rejected_samples`, and `mystery_policy_rejected_samples`. Each is `ReadonlyArray<StageRejectedSample>` and defaults to `[]`. `cooldown_active_samples` remains as-is; its existing `CooldownActiveSample` shape is more specialized.

### 2. Per-stage sample collection in the filter pipeline

Each filter stage now pushes a sample into the stage's collection array when the predicate rejects a candidate. Samples are bounded to 3 per stage; subsequent rejections at the stage are still counted but not sampled. The landed stage-specific evidence is:

- `scope_rejected_samples`: evidence carries `{slt_scope_visibility, branch_id, branch_path_prefix, parent_branch_id, parent_branch_path}` from the candidate's scope projection and parent page state.
- `driver_kind_rejected_samples`: evidence carries `{compatible_drivers: string[], requested_driver_kind: string}`.
- `action_family_rejected_samples`: evidence carries `{candidate_action_families: string[], requested_action_families: string[]}`.
- `predicate_shape_rejected_samples`: evidence carries `{predicate_pred_names: string[]}` and a `reason` explaining the shape rejection (e.g., "no concrete predicate names indexed").
- `predicate_class_rejected_samples`: evidence carries `{indexed_classes: string[], requested_classes: string[]}` (the surface that would have made the STSELECT-001 bug obvious immediately).
- `source_record_id_rejected_samples`: evidence carries `{indexed_source_record_ids: string[], requested_grounding_record_ids: string[]}`.
- `mystery_policy_rejected_samples`: evidence carries `{forbidden_mystery_resolutions: string[], unresolved_mystery_claims: string[]}`.
- `cooldown_active_samples`: unchanged.

### 3. Populate samples on response

`selectStoryletCandidatesImpl` includes the new fields in the returned `filter_trace`. Empty arrays are returned when no SLT was dropped at the stage.

### 4. Update tool description and per-package docs

- `tools/world-mcp/src/server.ts` extends the registered tool description to name `<stage>_rejected_samples` as the diagnostic surface for why a specific SLT was dropped at a given filter stage.
- `docs/MACHINE-FACING-LAYER.md` extends the `select_storylet_candidates` row to document the new fields and the 3-sample-per-stage cap.
- `tools/world-mcp/README.md` mirrors the new field documentation.
- `tools/world-mcp/src/context-packet/shared.ts` extends the embedded `selection_shortlist.filter_trace` type so context packets carry the same additive shape.

### 5. Update tests

`tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` now asserts non-empty rejected samples for the stages that previously lacked samples, asserts the SLT-42 predicate-class rejection evidence, and asserts the 3-sample cap. `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` keeps the hand-counted aggregate trace proof focused on counts while preserving the cooldown sample assertion.

## Files to Touch

- `tools/world-mcp/src/tools/select-storylet-candidates.ts` (modify — interface extension + per-stage sample collection in the filter pipeline)
- `tools/world-mcp/src/context-packet/shared.ts` (modify — embedded `selection_shortlist.filter_trace` type extended additively)
- `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (modify — fixtures + assertions for each new stage)
- `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` (modify — keep aggregate-count proof stable after additive trace fields)
- `tools/world-mcp/src/server.ts` (modify — registered tool description extended)
- `docs/MACHINE-FACING-LAYER.md` (modify — `select_storylet_candidates` row extended)
- `tools/world-mcp/README.md` (modify — mirror docs/MACHINE-FACING-LAYER.md)

## Out of Scope

- Changes to the filter logic itself (`matchesScope`, `matchesActionFamily`, `matchesPredicateClass`, `matchesSourceRecordIds`, `matchesMysteryPolicy`, `matchesCooldown`, `rankCandidates`) — the filters' semantics are correct; only the observability layer is being extended.
- Fixing the `predicateReferencedClasses` indexer bug at `tools/world-index/src/parse/atomic.ts:1564` — that was `archive/tickets/STSELECT-001.md`'s scope. This ticket adds the observability that would have surfaced the bug; it does not duplicate the fix.
- Unifying `cooldown_active_samples` with the new generic `StageRejectedSample` shape — the cooldown precedent has more specialized per-stage evidence (`prior_selected_pages` etc.) and merging the types would force unnecessary uniformity at the cost of stage-specific clarity.
- Adding a verbose-mode toggle. The 3-sample cap is the discipline; verbose mode would require a separate schema for diagnostic output, defeating the schema's simplicity.
- Surfacing per-stage exclusion data for filter stages that drop ZERO SLTs (the array is empty; no diagnostic value).

## Acceptance Criteria

### Tests That Must Pass

1. New regression test in `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts`: against a synthetic fixture where SLT-42 is dropped at the `after_predicate_class` stage because indexed predicate classes do not intersect a deliberately narrow `intent_signature.grounding_record_classes`, `filter_trace.predicate_class_rejected_samples` contains the dropped SLT's id with evidence `{indexed_classes: [...], requested_classes: [...]}`.
2. Stage sweep: the selector fixture demonstrates non-empty `<stage>_rejected_samples` for scope, driver kind, action family, predicate shape, predicate class, source-record id, and mystery policy when at least one SLT is dropped at that stage.
3. Backward-compatibility regression: existing tests asserting `filter_trace.pool_total`, `after_scope`, `after_driver_kind`, etc. continue to pass after the additive fields are introduced.
4. Cap discipline: a fixture where 5 SLTs are dropped at the `after_predicate_class` stage proves `predicate_class_rejected_samples.length === 3`.
5. Full test suite: `cd tools/world-mcp && npm test` passes (existing tests + new fixtures).

### Invariants

1. Every previously count-only filter stage that drops at least one SLT MUST emit a non-empty `<stage>_rejected_samples` array (bounded to 3 entries); the cooldown stage MUST continue to emit `cooldown_active_samples`.
2. Every `StageRejectedSample` MUST carry `slt_id`, `reason`, and `evidence` fields; evidence shape is per-stage typed.
3. The 3-sample cap is uniform across stages (matching the established `cooldown_active_samples` cap).
4. The schema extension is additive-only: no existing field is renamed, removed, or has its type changed; consumers of the pre-landing response shape continue to read aggregate counts identically.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (modify) — extends the existing fixture with every newly sampled stage, adds the SLT-42 predicate-class rejection regression, and adds a 3-sample cap regression.
2. `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` (modify) — keeps the aggregate count contract stable while allowing the additive rejected-sample arrays.

### Commands

1. `cd tools/world-mcp && npm run build` — confirms types compile after `StoryletCandidateFilterTrace` extension and `StageRejectedSample` type addition.
2. `cd tools/world-mcp && node --test dist/tests/tools/select-storylet-candidates.test.js dist/tests/integration/spec81-storylet-candidate-retrieval.test.js` — focused compiled proof for the selector response shape plus SPEC-81 trace counts.
3. `cd tools/world-mcp && npm test` — full test suite (existing tests + new fixtures).

## Outcome

Implemented additive per-stage rejected-sample arrays on `select_storylet_candidates.filter_trace` for scope, driver kind, action family, predicate shape, predicate class, source-record id, and mystery policy stages. Each sample includes `slt_id`, a diagnostic `reason`, and stage-specific `evidence`, and each stage is capped at 3 samples. The existing aggregate counts and specialized `cooldown_active_samples` shape are unchanged.

The shared context-packet shortlist type, MCP registered description, package README, and repo machine-facing docs now describe the additive trace shape.

## Verification Result

- `cd tools/world-mcp && npm test` passed before edits: 496 tests, 0 failures.
- `cd tools/world-mcp && npm run build` passed after implementation.
- `cd tools/world-mcp && node --test dist/tests/tools/select-storylet-candidates.test.js dist/tests/integration/spec81-storylet-candidate-retrieval.test.js` passed after implementation: 12 tests, 0 failures.
- `cd tools/world-mcp && npm test` passed after implementation and closeout edits: 498 tests, 0 failures.

## Deviations

- `tools/world-mcp/src/context-packet/shared.ts`, `tools/world-mcp/src/server.ts`, and `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` were added to the owned file set during reassessment because the live package repeats the `filter_trace` shape in the context-packet shortlist type, exposes the selector through registered metadata, and has a hand-counted SPEC-81 trace assertion.
- The original live `red-bunny` PG-6 → SE-7 operational smoke was not run in this ticket. That proof depends on checkout-local story state and the separately completed `archive/tickets/STSELECT-001.md` indexer fix; this ticket's owned invariant is the additive MCP response-shape observability, proven with package-local fixtures and tests.
