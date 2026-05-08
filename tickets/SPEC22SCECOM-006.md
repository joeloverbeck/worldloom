# SPEC22SCECOM-006: Add 6 canonical-vocabulary enums + `get_canonical_vocabulary` expose

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — extends `tools/world-index/src/public/canonical-vocabularies.ts` (6 new enums) and `tools/world-mcp/src/tools/get_canonical_vocabulary.ts` (surface new enum classes). No impact on existing enums.
**Deps**: None

## Problem

SPEC-22 §Track 3 requires TypeScript implementations of 6 closed enums defined by archived SPEC-19 §E (`commitment_class`, `arc_archetype`, `narrative_point`, `strong_axis`, `strong_outcome`, `stop_predicate`). Without these enums in `canonical-vocabularies.ts`, downstream code (Track 2 validators, Track 4 skills, MCP retrieval) has no authoritative TypeScript reference for the closed value sets. Without `get_canonical_vocabulary` exposing the new classes, runtime LLM authoring (storylet-pool-authoring, branching-story-bootstrap) cannot query the canonical enum values at decision time.

## Assumption Reassessment (2026-05-08)

1. `tools/world-index/src/public/canonical-vocabularies.ts` exists (218 lines). Current enums (verified at SPEC-22 reassessment): `CANONICAL_DOMAINS` (27 values, `as const`), `VERDICT_ENUM` (6 values), `MYSTERY_STATUS_ENUM`, `MYSTERY_RESOLUTION_SAFETY_ENUM`, `INVARIANT_CATEGORY_VALUES`, `ENTITY_KIND_VALUES`, `SEC_FILE_CLASS_VALUES`, `CHANGE_TYPE_VALUES`, `REVISION_DIFFICULTY_VALUES`, `CF_TYPE_*`. All use the `as const` array pattern.
2. `tools/world-mcp/src/tools/get_canonical_vocabulary.ts` exists. It surfaces existing enums via a class-name argument (e.g., `{class: 'domain'}` returns `CANONICAL_DOMAINS`).
3. **SPEC-22 §Track 3** verifies entry counts: `commitment_class` 20, `arc_archetype` 20, `narrative_point` 5, `strong_axis` 8, `strong_outcome` 8, `stop_predicate` 19 (11 normal_exits + 8 interrupt_before). The reassessed §Verification line confirms these counts explicitly.
4. **FOUNDATIONS Rule 1 (No Floating Facts)** restated: every enum value has a documented semantic anchor in archived SPEC-19 §E. The TypeScript implementation is the canonical machine-readable surface; archived SPEC-19 is the human-readable authority.
5. (HARD-GATE / canon-write ordering): N/A — canonical-vocabularies is meta-tooling read surface, not a canon-write surface.
6. **Schema extension is additive** — six new exports added; existing exports preserved. `get_canonical_vocabulary` accepts new class-name strings without breaking existing callers.
7. **Cross-skill boundary under audit**: `get_canonical_vocabulary` is consumed at runtime by skills that emit v2 records (storylet-pool-authoring's Phase 3 LLM, branching-story-bootstrap's Phase 6). The MCP-side schema for the tool's argument enum extends with the 6 new class names.

## Architecture Check

1. Adding enums to `canonical-vocabularies.ts` matches the existing convention (single file, `as const` array exports). Splitting into separate files would fragment the canonical-vocab surface unnecessarily.
2. `get_canonical_vocabulary` extension is purely additive — the existing class-name dispatch is a string-keyed switch / lookup; adding 6 new keys preserves all existing keys.
3. No backwards-compatibility shims.

## Verification Layers

1. Each enum exists in `canonical-vocabularies.ts` with the documented entry count → `grep -c '^\s*[a-z_]\+,$' tools/world-index/src/public/canonical-vocabularies.ts` per enum block (or per-enum length assertion in unit test).
2. `get_canonical_vocabulary({class: 'commitment_class'})` returns the 20-entry array; analogous calls return 20 / 5 / 8 / 8 / 19 entries for `arc_archetype` / `narrative_point` / `strong_axis` / `strong_outcome` / `stop_predicate` respectively.
3. Each entry name matches archived SPEC-19 §E verbatim (per SPEC-22 §Track 3 verbatim listing).
4. FOUNDATIONS alignment: enum values trace to archived SPEC-19 §E; no orphan terms.

## What to Change

### 1. Extend `tools/world-index/src/public/canonical-vocabularies.ts`

Add 6 new exports (per SPEC-22 §Track 3 verbatim list, lines 83-147):

```typescript
export const COMMITMENT_CLASSES = [
  'stay_available_without_pressure', 'offer_practical_help',
  'ask_one_bounded_question', 'withdraw_without_abandoning',
  'confess_one_thing', 'accept_offered_help', 'refuse_with_grace',
  'escalate_to_confrontation', 'conceal_under_pressure',
  'seek_third_party', 'change_venue', 'make_public_commitment',
  'private_betrayal', 'bear_witness', 'release_pressure',
  'tighten_pressure', 'defer_decision', 'force_disclosure',
  'mirror_acknowledgment', 'intimacy_advance',
] as const;

export const ARC_ARCHETYPES = [
  'fragile_offer', 'bounded_question', 'confession_received',
  'refusal_and_aftercare', 'practical_aid_attempt',
  'withdrawal_without_abandonment', 'escalation_to_confrontation',
  'concealment_under_pressure', 'third_party_intervention',
  'investigation_followup', 'aftermath_processing', 'route_change',
  'public_commitment', 'private_betrayal', 'intimacy_negotiation',
  'boundary_setting', 'restitution_offered', 'silent_witness',
  'forced_disclosure', 'pressure_release',
] as const;

export const NARRATIVE_POINTS = [
  'CONTINUE_ARC', 'NATURAL_COMMITMENT_HINGE', 'INTERRUPT_HINGE',
  'CONTINUE_ONLY_PAUSE', 'TERMINAL_OR_CHAPTER_CLOSE',
] as const;

export const STRONG_AXES = [
  'relationship_trajectory', 'obligation_state', 'information_posture',
  'risk_cost_exposure', 'route_or_scene_type', 'thread_pressure',
  'irreversibility', 'character_intention',
] as const;

export const STRONG_OUTCOMES = [
  'succeeds', 'partially_succeeds', 'fails_with_consequence', 'backfires',
  'accepted_with_limits', 'refused_without_break', 'partially_deflected',
  'interrupted_before_resolution',
] as const;

export const STOP_PREDICATES = [
  // normal_exits (11)
  'commitment_satisfied', 'commitment_blocked', 'commitment_overturned',
  'npc_makes_demand', 'npc_makes_disclosure', 'participant_exits',
  'scene_goal_resolves', 'scene_goal_changes', 'new_obligation_created',
  'open_thread_reprioritized', 'time_or_location_changes',
  // interrupt_before (8)
  'irreversible_cost_imminent', 'consent_boundary_imminent',
  'violence_or_harm_imminent', 'forbidden_mystery_resolution_risk',
  'protagonist_goal_change_required', 'selected_commitment_would_be_violated',
  'user_write_in_conflicts_with_envelope',
  'only_next_action_would_create_major_state_change',
] as const;
```

Also export the corresponding TypeScript union types: `export type CommitmentClass = (typeof COMMITMENT_CLASSES)[number];` (and similar for other 5).

### 2. Extend `tools/world-mcp/src/tools/get_canonical_vocabulary.ts`

Add 6 new class-name keys to the dispatch map: `commitment_class`, `arc_archetype`, `narrative_point`, `strong_axis`, `strong_outcome`, `stop_predicate`. Each returns the corresponding enum array.

Update the tool's argument-schema enum to accept the 6 new class names alongside existing values.

## Files to Touch

- `tools/world-index/src/public/canonical-vocabularies.ts` (modify — add 6 enums + types)
- `tools/world-mcp/src/tools/get_canonical_vocabulary.ts` (modify — surface new classes)
- `tools/world-mcp/tests/tools/get_canonical_vocabulary.test.ts` (new or modify — count assertions for 6 new classes)

## Out of Scope

- Indexer ARC_TRACE support (in 007)
- MCP retrieval extensions for ARC_TRACE records (in 008)
- Allocator + CLAUDE.md docs (in 009)
- Schema definitions for these enums (owned by archived SPEC-19 §E)
- Validator-side imports of these enums — Track 2 validators (003, 004, 005) may import from this module in a follow-up; ship-with-inline-enum-first is acceptable to avoid blocking
- Same downstream Out of Scope as 001/002

## Acceptance Criteria

### Tests That Must Pass

1. `import { COMMITMENT_CLASSES, ARC_ARCHETYPES, NARRATIVE_POINTS, STRONG_AXES, STRONG_OUTCOMES, STOP_PREDICATES } from '@worldloom/world-index/dist/src/public/canonical-vocabularies.js';` resolves.
2. `COMMITMENT_CLASSES.length === 20`; `ARC_ARCHETYPES.length === 20`; `NARRATIVE_POINTS.length === 5`; `STRONG_AXES.length === 8`; `STRONG_OUTCOMES.length === 8`; `STOP_PREDICATES.length === 19`.
3. `get_canonical_vocabulary({class: 'commitment_class'})` returns the 20-entry array; analogous for the other 5 classes.
4. `get_canonical_vocabulary({class: 'unknown_class'})` rejects with structured error (existing dispatch behavior preserved).

### Invariants

1. The 6 new enums match archived SPEC-19 §E verbatim — no entry name drift, no entry count drift.
2. Existing enum exports (`CANONICAL_DOMAINS`, `VERDICT_ENUM`, etc.) are preserved unchanged.
3. `get_canonical_vocabulary` argument-schema accepts both pre-existing and 6 new class names (additive).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get_canonical_vocabulary.test.ts` (new or modify) — assert counts and verbatim entries for all 6 new classes; preserve existing-class assertions.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-mcp && npm run build`
3. `cd tools/world-mcp && npm run test`
