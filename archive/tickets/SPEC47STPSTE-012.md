# SPEC47STPSTE-012: Update describe-capabilities + CONTEXT-PACKET-CONTRACT for new MCP summaries

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends the registered `get_context_packet` capability description in `tools/world-mcp/src/server.ts` so `tools/world-mcp/src/tools/describe-capabilities.ts` emits the 2 new context-packet fields; extends `docs/CONTEXT-PACKET-CONTRACT.md` `story_bundle_context` section with the 2 new summary specifications
**Deps**: `archive/tickets/SPEC47STPSTE-011.md`

## Problem

Before this ticket, ticket 011 had landed `buildActiveActorPlans` and `buildActiveEmotionalStates` builders + the corresponding `ContextPacketStoryBundleContext` type extensions, but discovery surfaces still lacked the 2 new summary fields. Those surfaces are the registered capability metadata emitted by `describe-capabilities.ts` (runtime metadata exposed via `mcp__worldloom__describe_capabilities`) and `CONTEXT-PACKET-CONTRACT.md` (the documented retrieval contract consumed by story-pipeline skills at pre-flight). Without this docs-sync ticket, skills could discover the new summaries only by reading the source code or stumbling into them via packet retrieval — neither path aligns with FOUNDATIONS §Tooling Recommendation's "directly or via the documented context-packet + targeted-retrieval pattern".

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified `tools/world-mcp/src/tools/describe-capabilities.ts` emits the registered MCP capability descriptions consumed by `mcp__worldloom__describe_capabilities`; the `get_context_packet` description text itself is registered in `tools/world-mcp/src/server.ts`, not hard-coded in `describe-capabilities.ts`. Verified `docs/CONTEXT-PACKET-CONTRACT.md` is the documented retrieval contract at the worldloom-root docs/ level; it carries per-task-type context-packet specifications including the `story_bundle_context` layer for story-pipeline task types.
2. Verified SPEC-47 §Approach §C D-C3 + D-C4 specifies updating both discovery surfaces: D-C3 extends the `describe_capabilities`-emitted metadata for `get_context_packet`; in the live repo that means updating the `registerToolWithCapability` description in `tools/world-mcp/src/server.ts`, because `describe-capabilities.ts` emits registered metadata generically. D-C4 documents both new summaries in CONTEXT-PACKET-CONTRACT.md `story_bundle_context` section.
3. Cross-skill boundary under audit: MCP capability discovery (via `mcp__worldloom__describe_capabilities`) is the runtime metadata surface for all MCP consumers; the documented context-packet contract at CONTEXT-PACKET-CONTRACT.md is the pre-flight reference for story-pipeline skill authors. Both surfaces are normative; drift between them and ticket 011's actual context-packet shape would mislead consumers.
4. FOUNDATIONS §Tooling Recommendation — the context-packet contract is the documented mechanism for "skills should always receive ... via the documented context-packet + targeted-retrieval pattern"; CONTEXT-PACKET-CONTRACT.md is the authoritative document of that contract. Adding the 2 new summary fields to the contract document preserves the principle's documentation discipline.

## Architecture Check

1. Docs-sync after code lands preserves the canonical contract — discovery surfaces must reflect actual code surfaces. Landing docs-sync as its own small ticket (rather than co-edit with ticket 011) keeps the docs change reviewable independently and lets ticket 011's code-side review focus on the builder logic.
2. No backwards-compatibility aliasing/shims introduced — docs additions only. Existing capability descriptions and contract document content are unchanged.

## Verification Layers

1. describe-capabilities.ts emits the 2 new field names from the registered capability description → source grep over the `get_context_packet` `registerToolWithCapability` metadata in `tools/world-mcp/src/server.ts`
2. CONTEXT-PACKET-CONTRACT.md `story_bundle_context` section lists the 2 new summary fields with their projection shapes → codebase grep-proof
3. Documented projection shapes match ticket 011's actual TypeScript type declarations → manual review against the type declarations in story-bundle-context.ts

## Landed Changes

### 1. Extend the registered `get_context_packet` capability description

Updated the `get_context_packet` `registerToolWithCapability` description in `tools/world-mcp/src/server.ts` to list `active_actor_plans` and `active_emotional_states`; `describe-capabilities.ts` emits that registered metadata through `mcp__worldloom__describe_capabilities`.

The existing capability description lists field names only, so this ticket adds field names rather than embedding full projection metadata there.

### 2. Extend `docs/CONTEXT-PACKET-CONTRACT.md` `story_bundle_context` section

Added 2 new entries documenting the projections:

```markdown
- `active_actor_plans`: array of `{id, holder, root_intention, objective, plan_status, current_step_action_family}` objects, one per active STPLAN record on the current branch. Populated when STPLAN records are active; omitted when no active STPLANs exist (token-budget discipline). Summary-fallback fields: `active_plan_ids` (string[]), `active_plan_holders` (string[]).
- `active_emotional_states`: array of `{id, holder, status, affect_kind, intensity, behavioral_pressure, agency_effect}` objects, one per active STEMO record on the current branch. `affect_kind` may be null when `status: dissociated`. Populated when STEMO records are active; omitted when no active STEMOs exist. Summary-fallback fields: `active_emotion_ids` (string[]), `active_emotion_holders` (string[]).
```

## Files to Touch

- `tools/world-mcp/src/server.ts` (modify)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)
- `archive/tickets/SPEC47STPSTE-012.md` (modify)

## Out of Scope

- Code-side builders for the new summaries — covered by ticket 011.
- World-index docs updates — covered by ticket 014.
- Skill-side consumption of the new summaries — covered by ticket 016.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "active_actor_plans|active_emotional_states" tools/world-mcp/src/server.ts` returns the registered `get_context_packet` capability description line containing both fields.
2. `grep -nE "active_actor_plans|active_emotional_states|active_plan_ids|active_plan_holders|active_emotion_ids|active_emotion_holders" docs/CONTEXT-PACKET-CONTRACT.md` returns the 2 projection-prose lines containing the 2 summary fields and 4 summary-fallback id-list fields.
3. Manual review: documented projection shapes match the TypeScript type declarations in `tools/world-mcp/src/context-packet/story-bundle-context.ts` (from ticket 011) exactly.

### Invariants

1. Existing capability descriptions and CONTEXT-PACKET-CONTRACT.md content are unchanged except for appending the 2 new story-bundle summaries and updating the SPEC-46 summary count from seven to nine.
2. The documented projection shapes match the actual context-packet shape produced by ticket 011's builders — drift would mislead consumers.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "active_actor_plans|active_emotional_states" tools/world-mcp/src/server.ts` (returns the registered capability-description line containing both fields)
2. `grep -nE "active_actor_plans|active_emotional_states|active_plan_ids|active_plan_holders|active_emotion_ids|active_emotion_holders" docs/CONTEXT-PACKET-CONTRACT.md` (returns the 2 projection-prose lines containing all 6 field names)
3. `npm --prefix tools/world-mcp run build` (capability text compiles; describe-capabilities.ts is TypeScript-valid)

## Outcome

Completed: 2026-05-19

Implemented the SPEC-47 ticket 012 discovery/docs sync:

- `tools/world-mcp/src/server.ts` now lists `active_actor_plans` and `active_emotional_states` in the registered `get_context_packet` capability description emitted by `describe_capabilities`.
- `docs/CONTEXT-PACKET-CONTRACT.md` now documents both summary projections and their summary-fallback id-list fields (`active_plan_ids`, `active_plan_holders`, `active_emotion_ids`, `active_emotion_holders`) in the `story_bundle_context` layer.
- The context-packet contract summary count was updated from seven to nine summaries.

## Verification Result

- `grep -nE "active_actor_plans|active_emotional_states" tools/world-mcp/src/server.ts` — passed; returned the registered `get_context_packet` capability description containing both fields.
- `grep -nE "active_actor_plans|active_emotional_states|active_plan_ids|active_plan_holders|active_emotion_ids|active_emotion_holders" docs/CONTEXT-PACKET-CONTRACT.md` — passed; returned the 2 documented summary fields and 4 fallback id-list fields.
- `npm --prefix tools/world-mcp run build` — passed.
- Manual review against `tools/world-mcp/src/context-packet/shared.ts` confirmed the documented projection fields match `ContextPacketStoryBundleContext`.

## Deviations

- The drafted file target `tools/world-mcp/src/tools/describe-capabilities.ts` was the emitter, not the metadata owner. The live metadata owner is the `get_context_packet` `registerToolWithCapability` description in `tools/world-mcp/src/server.ts`; the ticket was corrected before implementation and no edit to `describe-capabilities.ts` was needed.
