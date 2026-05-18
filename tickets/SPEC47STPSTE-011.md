# SPEC47STPSTE-011: Add MCP context-packet active_actor_plans + active_emotional_states summaries

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/world-mcp/src/context-packet/story-bundle-context.ts` with 2 new builder functions (`buildActiveActorPlans`, `buildActiveEmotionalStates`) wired into `buildStoryBundleContext`; extends `ContextPacketStoryBundleContext` type with 2 new optional summary fields; extends `ContextPacketStoryBundleContextSummary` partial with parallel id-list fields
**Deps**: 003

## Problem

SPEC-47's STPLAN/STEMO records need MCP context-packet projections so story-pipeline skills can read active plans and emotional states via the `mcp__worldloom__get_context_packet` retrieval surface (the documented context-packet + targeted-retrieval pattern per FOUNDATIONS §Tooling Recommendation). Without these projections, story-pipeline skills would need to fall back to raw `_source/plans/STPLAN-*.yaml` / `_source/emotions/STEMO-*.yaml` reads (blocked by Hook 2 for oversized reads, then routed to per-id `get_record` calls), making the existing context-packet promise — "directly or via the documented context-packet + targeted-retrieval pattern" — fail to deliver for two of the spec's headline classes. The 2 new summaries follow the SPEC-46 Phase B builder pattern (per the 7 summaries SPEC-46 landed at `active_intentions`, `active_beliefs_by_holder`, etc.).

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified `tools/world-mcp/src/context-packet/story-bundle-context.ts` exists at HEAD per the pre-Write verification; per the reassess-spec session's grep, the file currently exports 17 builder functions including the 7 SPEC-46-landed Phase B builders (`buildActiveIntentions`, `buildActiveStatuses`, `buildActiveBeliefsByHolder`, `buildActiveRelationshipsByParticipant`, `buildActiveLocationsInScope`, `buildActiveObjectsInScope`, `buildActiveStoryDiegeticArtifacts`) and the master `buildStoryBundleContext` aggregator. The pattern for new builders is established by SPEC-46's Phase B implementation.
2. Verified SPEC-47 §Approach §C D-C1 + D-C2 specifies the 2 new builders by signature and projection shape per the table in §Approach §C (active_actor_plans: `[{id, holder, root_intention, objective, plan_status, current_step_action_family}]`; active_emotional_states: `[{id, holder, status, affect_kind, intensity, behavioral_pressure, agency_effect}]`) plus the parallel summary id-list extensions (`active_plan_ids`, `active_plan_holders`, `active_emotion_ids`, `active_emotion_holders`).
3. Cross-skill boundary under audit: the MCP context-packet is the documented retrieval surface for story-pipeline skills (Skill Category 2c per FOUNDATIONS §Story Bundles §7); extending `ContextPacketStoryBundleContext` with 2 new optional fields preserves backward compatibility (consumers unaware of the new fields continue to work). The summary-fallback id-list extension (`ContextPacketStoryBundleContextSummary`) lets summary-level retrieval pivot to targeted `get_record` calls when full bodies are wanted, parallel to SPEC-46's `*_ids` summary discipline.
4. FOUNDATIONS §Tooling Recommendation — "LLM agents should never operate on prose alone. They should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel, current Invariants, relevant canon fact records, affected domain files, ..." — extending the MCP context-packet to cover STPLAN/STEMO records preserves this principle at the story-bundle scope (parallel to SPEC-46's extension for the 7 Phase B classes). Without this ticket, STPLAN/STEMO records are queryable via per-id retrieval but not via the context-packet promise — a one-class gap in the retrieval surface.
5. The new `active_actor_plans` and `active_emotional_states` fields extend the existing `ContextPacketStoryBundleContext` TypeScript type — per the §Step 6.2(c) per-ticket-type granularity rule for item 6: "Existing output schema extended (... story-bundle record)" → the context-packet type IS an existing output schema being extended additively (new optional fields with default `undefined`). Consumers unaware of the new fields continue to work; new consumers (notably ticket 016's skill prose updates) opt into reading them.

## Architecture Check

1. The MCP context-packet is the single retrieval surface for story-pipeline skills; extending it to project STPLAN/STEMO records preserves the "directly or via context-packet" promise that FOUNDATIONS §Tooling Recommendation makes. Per-class summary additions (rather than a generic "active records by class" map) keep the type contract precise and let consumers ask narrow questions ("which actors have active plans?") without parsing class enums at the retrieval boundary.
2. No backwards-compatibility aliasing/shims introduced — additions only. Existing 7 SPEC-46 Phase B summaries and existing summary-fallback id-list fields are unchanged.

## Verification Layers

1. 2 new builder functions exist at `tools/world-mcp/src/context-packet/story-bundle-context.ts` → codebase grep-proof
2. `buildStoryBundleContext` aggregator wires both new builders → codebase grep-proof for builder-invocation
3. `ContextPacketStoryBundleContext` type includes 2 new optional summary fields → schema validation (TypeScript type-check)
4. `ContextPacketStoryBundleContextSummary` partial includes 4 new id-list fields → schema validation
5. Per-summary projection matches SPEC-47 §Approach §C field list exactly → manual review per builder against representative STPLAN/STEMO fixtures
6. Token-budget discipline preserved: each new summary is independently omittable under pressure per the existing per-field omission pattern → integration test against budget-constrained context-packet builds

## What to Change

### 1. Implement `buildActiveActorPlans` builder

Following the SPEC-46 Phase B pattern (e.g., `buildActiveIntentions` at line 260 of story-bundle-context.ts), implement:

```typescript
function buildActiveActorPlans(rows: StoryNodeRow[]): ContextPacketStoryBundleContext["active_actor_plans"] {
  // Filter to active STPLAN records (status != null; not superseded)
  // Project: {id, holder, root_intention, objective, plan_status, current_step_action_family}
  // Return array of projection objects
}
```

### 2. Implement `buildActiveEmotionalStates` builder

Same shape:

```typescript
function buildActiveEmotionalStates(rows: StoryNodeRow[]): ContextPacketStoryBundleContext["active_emotional_states"] {
  // Filter to active STEMO records (status == "active"; not superseded)
  // Project: {id, holder, status, affect_kind, intensity, behavioral_pressure, agency_effect}
  // Return array of projection objects
}
```

### 3. Wire both builders into `buildStoryBundleContext`

Add 2 entries to the master aggregator (line 487+ of story-bundle-context.ts), parallel to the SPEC-46 Phase B builders.

### 4. Extend `ContextPacketStoryBundleContext` type

Add 2 new optional summary fields with the projection shapes from SPEC-47 §Approach §C table.

### 5. Extend `ContextPacketStoryBundleContextSummary` partial with id-list fields

Add `active_plan_ids: string[]`, `active_plan_holders: string[]`, `active_emotion_ids: string[]`, `active_emotion_holders: string[]` parallel to existing SPEC-46 id-list fields.

## Files to Touch

- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify) — 2 new builders + wiring + type extensions

## Out of Scope

- Capability description and CONTEXT-PACKET-CONTRACT.md docs for the new summaries — covered by ticket 012.
- World-index edge extraction for STPLAN/STEMO fields — covered by ticket 013.
- Patch-engine ops for STPLAN/STEMO — covered by ticket 004.
- Skill-side consumption of the new summaries — covered by ticket 016 (skill prose updates).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "buildActiveActorPlans|buildActiveEmotionalStates" tools/world-mcp/src/context-packet/story-bundle-context.ts` returns ≥4 matches (function declarations + wiring invocations).
2. `grep -nE "active_actor_plans|active_emotional_states|active_plan_ids|active_plan_holders|active_emotion_ids|active_emotion_holders" tools/world-mcp/src/context-packet/story-bundle-context.ts` returns matches in type declarations + wiring.
3. New per-summary fixture tests: load a fixture bundle with STPLAN + STEMO records; call `buildActiveActorPlans` / `buildActiveEmotionalStates`; assert projection fields match the §Approach §C table exactly with no fabricated keys and no missing required keys.
4. Cross-summary integration test: `mcp__worldloom__get_context_packet({task_type: 'page_authoring', seed_nodes: [...], story_slug: ...})` returns `story_bundle_context` with both new summary fields populated when the fixture bundle has active STPLAN/STEMO records.

### Invariants

1. Existing 7 SPEC-46 Phase B summary builders + their projections are unchanged.
2. Token-budget discipline: each new summary is independently omittable under pressure per the existing per-field omission pattern at lines 455-486 of story-bundle-context.ts.
3. `ContextPacketStoryBundleContextSummary` parallel id-list fields enumerate exactly the ids of records the corresponding full summary projects (no orphans, no missing).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/build-active-actor-plans.test.ts` (new) — per-builder fixture tests: well-formed STPLAN records project correctly; superseded records are excluded; empty result when no active STPLANs.
2. `tools/world-mcp/tests/context-packet/build-active-emotional-states.test.ts` (new) — same shape for STEMO including `status: dissociated` edge case (dissociated STEMO still appears in active list per the lifecycle rules; affect_kind is null).
3. `tools/world-mcp/tests/context-packet/story-bundle-context-integration-stplan-stemo.test.ts` (new) — full `buildStoryBundleContext` integration: both new fields populated; summary-fallback id-lists enumerate correctly.

### Commands

1. `npm --prefix tools/world-mcp run build && npm --prefix tools/world-mcp test` (full world-mcp package tests pass)
2. `npm --prefix tools/world-mcp test -- --test-name-pattern "active-actor-plans|active-emotional-states"` (only new summary tests run)
