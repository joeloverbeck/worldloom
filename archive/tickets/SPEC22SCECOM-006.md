# SPEC22SCECOM-006: Add 6 canonical-vocabulary enums + `get_canonical_vocabulary` expose

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — extends `tools/world-index/src/public/canonical-vocabularies.ts` (6 new enums) and `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` (surface new enum classes). No impact on existing enums.
**Deps**: None

## Problem

At intake, SPEC-22 §Track 3 required TypeScript implementations of 6 closed enums defined by archived SPEC-19 §E (`commitment_class`, `arc_archetype`, `narrative_point`, `strong_axis`, `strong_outcome`, `stop_predicate`). Without these enums in `canonical-vocabularies.ts`, downstream code (Track 2 validators, Track 4 skills, MCP retrieval) had no authoritative TypeScript reference for the closed value sets. Without `get_canonical_vocabulary` exposing the new classes, runtime LLM authoring (storylet-pool-authoring, branching-story-bootstrap) could not query the canonical enum values at decision time.

## Assumption Reassessment (2026-05-08)

1. `tools/world-index/src/public/canonical-vocabularies.ts` exists (218 lines). Current enums (verified at SPEC-22 reassessment): `CANONICAL_DOMAINS` (27 values, `as const`), `VERDICT_ENUM` (6 values), `MYSTERY_STATUS_ENUM`, `MYSTERY_RESOLUTION_SAFETY_ENUM`, `INVARIANT_CATEGORY_VALUES`, `ENTITY_KIND_VALUES`, `SEC_FILE_CLASS_VALUES`, `CHANGE_TYPE_VALUES`, `REVISION_DIFFICULTY_VALUES`, `CF_TYPE_*`. All use the `as const` array pattern.
2. The live handler path is `tools/world-mcp/src/tools/get-canonical-vocabulary.ts`, not the underscore path named in the draft ticket and SPEC-22 file inventory. It surfaces existing enums via a class-name argument (e.g., `{class: 'domain'}` returns `CANONICAL_DOMAINS`).
3. **SPEC-22 §Track 3** verifies entry counts: `commitment_class` 20, `arc_archetype` 20, `narrative_point` 5, `strong_axis` 8, `strong_outcome` 8, `stop_predicate` 19 (11 normal_exits + 8 interrupt_before). The reassessed §Verification line confirms these counts explicitly.
4. **FOUNDATIONS Rule 1 (No Floating Facts)** restated: every enum value has a documented semantic anchor in archived SPEC-19 §E. The TypeScript implementation is the canonical machine-readable surface; archived SPEC-19 is the human-readable authority.
5. (HARD-GATE / canon-write ordering): N/A — canonical-vocabularies is meta-tooling read surface, not a canon-write surface.
6. **Schema extension is additive** — six new exports added; existing exports preserved. `get_canonical_vocabulary` accepts new class-name strings without breaking existing callers.
7. **Cross-skill boundary under audit**: `get_canonical_vocabulary` is consumed at runtime by skills that emit v2 records (storylet-pool-authoring's Phase 3 LLM, branching-story-bootstrap's Phase 6). The MCP-side schema for the tool's argument enum extends with the 6 new class names.
8. Same-seam package docs and metadata consumers are in scope: `tools/world-mcp/src/server.ts` registers `VOCABULARY_CLASSES` as capability metadata; `tools/world-mcp/tests/server/dispatch.test.ts` asserts the exposed enum list; `tools/world-mcp/README.md`, `tools/world-index/README.md`, and `docs/MACHINE-FACING-LAYER.md` currently list the older class set and must be truthed with the additive classes.
9. Explicit SPEC-22 reference path resolved to `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md`; its draft inventory uses the stale underscore handler path and its current-state problem prose will be truthed for the canonical-vocabulary sub-slice after this ticket lands. Broader Track 3 indexer and ARC_TRACE retrieval work remains owned by 007/008 and is not absorbed here.
10. During consumer build proof, `tools/world-mcp` failed on an existing same-spec-family exhaustive switch gap in `tools/world-mcp/src/tools/describe-envelope-schema.ts`: `create_arc_trace_record` was present in `OPERATION_KINDS` but had no `operationSchema` case, so TypeScript could not prove the function returned for every operation kind. Because `describe_envelope_schema` is machine-facing introspection used by HARD-GATE patch-plan assembly, `docs/HARD-GATE-DISCIPLINE.md` was read before the minimal parity fix. The fix is not part of the vocabulary behavior, but it is same-package prerequisite fallout required for the ticket's package build/test proof to be truthful.

## Architecture Check

1. Adding enums to `canonical-vocabularies.ts` matches the existing convention (single file, `as const` array exports). Splitting into separate files would fragment the canonical-vocab surface unnecessarily.
2. `get_canonical_vocabulary` extension is purely additive — the existing class-name dispatch is a string-keyed switch / lookup; adding 6 new keys preserves all existing keys.
3. No backwards-compatibility shims.

## Verification Layers

1. Each enum exists in `canonical-vocabularies.ts` with the documented entry count → `grep -c '^\s*[a-z_]\+,$' tools/world-index/src/public/canonical-vocabularies.ts` per enum block (or per-enum length assertion in unit test).
2. `get_canonical_vocabulary({class: 'commitment_class'})` returns the 20-entry array; analogous calls return 20 / 5 / 8 / 8 / 19 entries for `arc_archetype` / `narrative_point` / `strong_axis` / `strong_outcome` / `stop_predicate` respectively.
3. Each entry name matches archived SPEC-19 §E verbatim (per SPEC-22 §Track 3 verbatim listing).
4. FOUNDATIONS alignment: enum values trace to archived SPEC-19 §E; no orphan terms.

## Landed Changes

### 1. Extend `tools/world-index/src/public/canonical-vocabularies.ts`

Added 6 new exports (per SPEC-22 §Track 3 verbatim list):

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

Also exported the corresponding TypeScript union types: `CommitmentClass`, `ArcArchetype`, `NarrativePoint`, `StrongAxis`, `StrongOutcome`, and `StopPredicate`.

### 2. Extend `tools/world-mcp/src/tools/get-canonical-vocabulary.ts`

Added 6 new class-name keys to the dispatch map: `commitment_class`, `arc_archetype`, `narrative_point`, `strong_axis`, `strong_outcome`, `stop_predicate`. Each returns the corresponding enum array.

Updated the tool's argument-schema enum source (`VOCABULARY_CLASSES`) so MCP registration/capability metadata accepts the 6 new class names alongside existing values.

### 3. Truth same-seam docs and build prerequisite

Updated package/repo docs that list current `get_canonical_vocabulary` classes, truthed SPEC-22's current-state prose and live handler path for this sub-slice, and fixed the existing `describe_envelope_schema` `create_arc_trace_record` switch gap that blocked `tools/world-mcp` build proof.

## Files to Touch

- `tools/world-index/src/public/canonical-vocabularies.ts` (modify — add 6 enums + types)
- `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` (modify — surface new classes)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify — same-package compile prerequisite: surface existing `create_arc_trace_record` op schema so package build can prove the vocabulary change)
- `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` (modify — count assertions for 6 new classes)
- `tools/world-mcp/README.md` (modify — current class list)
- `tools/world-index/README.md` (modify — public canonical-vocabularies export summary)
- `tools/world-index/tests/public-types.test.ts` (modify — public self-import guard covers new exports)
- `docs/MACHINE-FACING-LAYER.md` (modify — current class list)
- `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (modify — same-seam current-state/path truthing for this sub-slice)

## Out of Scope

- Indexer ARC_TRACE support (in 007)
- MCP retrieval extensions for ARC_TRACE records (in 008)
- Allocator + CLAUDE.md docs (in 009)
- Schema definitions for these enums (owned by archived SPEC-19 §E)
- Validator-side imports of these enums — Track 2 validators (003, 004, 005) may import from this module in a follow-up; ship-with-inline-enum-first is acceptable to avoid blocking
- Same downstream Out of Scope as 001/002

## Acceptance Criteria

### Tests That Must Pass

1. `tools/world-index` build and public self-import test resolve the new exports.
2. `COMMITMENT_CLASSES.length === 20`; `ARC_ARCHETYPES.length === 20`; `NARRATIVE_POINTS.length === 5`; `STRONG_AXES.length === 8`; `STRONG_OUTCOMES.length === 8`; `STOP_PREDICATES.length === 19`.
3. `get_canonical_vocabulary({class: 'commitment_class'})` returns the 20-entry array; analogous for the other 5 classes.
4. `get_canonical_vocabulary({class: 'unknown_class'})` rejects with structured error and the supported-class list includes the 6 new classes.
5. `describe_capabilities` exposes the extended `get_canonical_vocabulary.class` enum list through MCP-boundary capability metadata.

### Invariants

1. The 6 new enums match archived SPEC-19 §E verbatim — no entry name drift, no entry count drift.
2. Existing enum exports (`CANONICAL_DOMAINS`, `VERDICT_ENUM`, etc.) are preserved unchanged.
3. `get_canonical_vocabulary` argument-schema accepts both pre-existing and 6 new class names (additive).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` — asserts counts and verbatim entries for all 6 new classes; preserves existing-class assertions.
2. `tools/world-index/tests/public-types.test.ts` — asserts package self-import resolves the 6 new public exports without import-time IO.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-mcp && npm run build`
3. `cd tools/world-index && node --test dist/tests/public-types.test.js`
4. `cd tools/world-index && npm test`
5. `cd tools/world-mcp && node --test dist/tests/tools/get-canonical-vocabulary.test.js`
6. `cd tools/world-mcp && node --test --test-name-pattern "get_canonical_vocabulary|describe_capabilities" dist/tests/server/dispatch.test.js`
7. `cd tools/world-mcp && node --test dist/tests/tools/describe-envelope-schema.test.js`
8. `cd tools/world-mcp && npm run test` (broad lane; see Deviations)

## Outcome

Completion date: 2026-05-08.

Implemented SPEC-22's canonical-vocabulary sub-slice:

1. Added `COMMITMENT_CLASSES`, `ARC_ARCHETYPES`, `NARRATIVE_POINTS`, `STRONG_AXES`, `STRONG_OUTCOMES`, and `STOP_PREDICATES` plus TypeScript union types to `tools/world-index/src/public/canonical-vocabularies.ts`.
2. Extended `get_canonical_vocabulary` and `VOCABULARY_CLASSES` so handler calls and MCP capability metadata expose `commitment_class`, `arc_archetype`, `narrative_point`, `strong_axis`, `strong_outcome`, and `stop_predicate`.
3. Added focused count/verbatim tests for the new classes and public self-import coverage for the new world-index exports.
4. Updated package/repo docs and SPEC-22 same-seam prose to reflect the landed vocabulary surface and live hyphenated MCP handler path.
5. Fixed the existing `describe_envelope_schema` `create_arc_trace_record` operation-schema gap so `tools/world-mcp` can build and its envelope-schema introspection remains aligned with the existing patch-engine operation registry.

## Verification Result

Passed:

1. `cd tools/world-index && npm run build`
2. `cd tools/world-mcp && npm run build` (initial run failed on the pre-existing `describe-envelope-schema.ts` exhaustive switch gap; passed after the recorded prerequisite fix)
3. `cd tools/world-index && node --test dist/tests/public-types.test.js`
4. `cd tools/world-index && npm test`
5. `cd tools/world-mcp && node --test dist/tests/tools/get-canonical-vocabulary.test.js`
6. `cd tools/world-mcp && node --test --test-name-pattern "get_canonical_vocabulary|describe_capabilities" dist/tests/server/dispatch.test.js`
7. `cd tools/world-mcp && node --test dist/tests/tools/describe-envelope-schema.test.js`

Broad lane:

1. `cd tools/world-mcp && npm run test` rebuilt successfully, then failed in unrelated `getRecordSchema` coverage: `getRecordSchema returns the expected schema for every supported node type`, `getRecordSchema returns story-bundle schemas from validator sources`, and the corresponding server-dispatch loop fail with `ERR_INVALID_URL` / error payloads from `get_record_schema`. The focused vocabulary handler and MCP capability surfaces passed in the same package after rebuild.

## Deviations

1. The drafted underscore paths were stale. The live files are `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` and `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts`.
2. `tools/world-mcp/src/tools/describe-envelope-schema.ts` was added to the ticket-owned file set after build proof exposed a same-package compile blocker for the already-existing `create_arc_trace_record` operation. This touched machine-facing envelope introspection, so `docs/HARD-GATE-DISCIPLINE.md` was read before the minimal parity fix.
3. Direct external `mcp__worldloom__get_canonical_vocabulary(...)` invocation was not available in this Codex session; post-change MCP-boundary proof used the package-local in-memory server/client dispatch test and capability metadata assertions instead.
4. The broad `tools/world-mcp` test lane remains red for unrelated `get_record_schema` schema-ref handling. This ticket's acceptance is therefore the producer build/public export proof plus focused handler and MCP-boundary proofs listed above.
