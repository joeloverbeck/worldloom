# SPEC47STPSTE-012: Update describe-capabilities + CONTEXT-PACKET-CONTRACT for new MCP summaries

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `tools/world-mcp/src/tools/describe-capabilities.ts` to enumerate the 2 new context-packet fields; extends `docs/CONTEXT-PACKET-CONTRACT.md` `story_bundle_context` section with the 2 new summary specifications
**Deps**: `archive/tickets/SPEC47STPSTE-011.md`

## Problem

Ticket 011 lands `buildActiveActorPlans` and `buildActiveEmotionalStates` builders + the corresponding `ContextPacketStoryBundleContext` type extensions. Discovery surfaces — `describe-capabilities.ts` (runtime metadata exposed via `mcp__worldloom__describe_capabilities`) and `CONTEXT-PACKET-CONTRACT.md` (the documented retrieval contract consumed by story-pipeline skills at pre-flight) — must list the 2 new summary fields so consumers know they exist and what shape they have. Without this docs-sync ticket, the new summaries land but skills only discover them by reading the source code or stumbling into them via packet retrieval — neither path aligns with FOUNDATIONS §Tooling Recommendation's "directly or via the documented context-packet + targeted-retrieval pattern".

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified `tools/world-mcp/src/tools/describe-capabilities.ts` exists at HEAD per the pre-Write verification; the file emits MCP capability descriptions (consumed by `mcp__worldloom__describe_capabilities` MCP tool). Verified `docs/CONTEXT-PACKET-CONTRACT.md` is the documented retrieval contract at the worldloom-root docs/ level; it carries per-task-type context-packet specifications including the `story_bundle_context` layer for story-pipeline task types.
2. Verified SPEC-47 §Approach §C D-C3 + D-C4 specifies updating both surfaces: D-C3 extends describe-capabilities.ts to enumerate the new fields; D-C4 documents both new summaries in CONTEXT-PACKET-CONTRACT.md `story_bundle_context` section.
3. Cross-skill boundary under audit: MCP capability discovery (via `mcp__worldloom__describe_capabilities`) is the runtime metadata surface for all MCP consumers; the documented context-packet contract at CONTEXT-PACKET-CONTRACT.md is the pre-flight reference for story-pipeline skill authors. Both surfaces are normative; drift between them and ticket 011's actual context-packet shape would mislead consumers.
4. FOUNDATIONS §Tooling Recommendation — the context-packet contract is the documented mechanism for "skills should always receive ... via the documented context-packet + targeted-retrieval pattern"; CONTEXT-PACKET-CONTRACT.md is the authoritative document of that contract. Adding the 2 new summary fields to the contract document preserves the principle's documentation discipline.

## Architecture Check

1. Docs-sync after code lands preserves the canonical contract — discovery surfaces must reflect actual code surfaces. Landing docs-sync as its own small ticket (rather than co-edit with ticket 011) keeps the docs change reviewable independently and lets ticket 011's code-side review focus on the builder logic.
2. No backwards-compatibility aliasing/shims introduced — docs additions only. Existing capability descriptions and contract document content are unchanged.

## Verification Layers

1. describe-capabilities.ts emits the 2 new field names in the capability description → MCP capability dry-run via `mcp__worldloom__describe_capabilities`
2. CONTEXT-PACKET-CONTRACT.md `story_bundle_context` section lists the 2 new summary fields with their projection shapes → codebase grep-proof
3. Documented projection shapes match ticket 011's actual TypeScript type declarations → manual review against the type declarations in story-bundle-context.ts

## What to Change

### 1. Extend `tools/world-mcp/src/tools/describe-capabilities.ts`

Add `active_actor_plans` and `active_emotional_states` to the capability description's enumerated `story_bundle_context` fields. Include projection-shape metadata if the existing capability description includes per-field shape info; otherwise just the field names.

### 2. Extend `docs/CONTEXT-PACKET-CONTRACT.md` `story_bundle_context` section

Add 2 new entries documenting the projections:

```markdown
- `active_actor_plans`: array of `{id, holder, root_intention, objective, plan_status, current_step_action_family}` objects, one per active STPLAN record on the current branch. Populated when STPLAN records are active; omitted when no active STPLANs exist (token-budget discipline). Summary-fallback fields: `active_plan_ids` (string[]), `active_plan_holders` (string[]).
- `active_emotional_states`: array of `{id, holder, status, affect_kind, intensity, behavioral_pressure, agency_effect}` objects, one per active STEMO record on the current branch. `affect_kind` may be null when `status: dissociated`. Populated when STEMO records are active; omitted when no active STEMOs exist. Summary-fallback fields: `active_emotion_ids` (string[]), `active_emotion_holders` (string[]).
```

## Files to Touch

- `tools/world-mcp/src/tools/describe-capabilities.ts` (modify)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)

## Out of Scope

- Code-side builders for the new summaries — covered by ticket 011.
- World-index docs updates — covered by ticket 014.
- Skill-side consumption of the new summaries — covered by ticket 016.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "active_actor_plans|active_emotional_states" tools/world-mcp/src/tools/describe-capabilities.ts` returns ≥2 matches.
2. `grep -nE "active_actor_plans|active_emotional_states" docs/CONTEXT-PACKET-CONTRACT.md` returns ≥4 matches (2 field names + 4 summary-fallback id-list field names referenced in the projection prose).
3. Manual review: documented projection shapes match the TypeScript type declarations in `tools/world-mcp/src/context-packet/story-bundle-context.ts` (from ticket 011) exactly.

### Invariants

1. Existing capability descriptions and CONTEXT-PACKET-CONTRACT.md content are unchanged — only 2 new entries appended.
2. The documented projection shapes match the actual context-packet shape produced by ticket 011's builders — drift would mislead consumers.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "active_actor_plans|active_emotional_states" tools/world-mcp/src/tools/describe-capabilities.ts` (returns ≥2 matches)
2. `grep -nE "active_actor_plans|active_emotional_states" docs/CONTEXT-PACKET-CONTRACT.md` (returns ≥4 matches)
3. `npm --prefix tools/world-mcp run build` (capability text compiles; describe-capabilities.ts is TypeScript-valid)
