# SPEC56STCHARMACFOU-004: Patch-engine STCHAR write + supersede ops

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/patch-engine` (new STORY_RECORD_SPECS entry + supersede op + `stchar_ids` allocation + stale-index); `tools/world-mcp` (`describe_envelope_schema` + patch-plan test).
**Deps**: archive/tickets/SPEC56STCHARMACFOU-002.md

## Problem

STCHAR records are engine-only write surfaces (hybrid markdown under `stories/<slug>/story-characters/`). Without a patch-engine op, there is no lawful way to create or supersede an STCHAR — direct writes are (and must remain) blocked. This ticket adds the write/supersede ops following the story-bundle convention.

## Assumption Reassessment (2026-05-20)

1. Story-bundle record ops are `STORY_RECORD_SPECS` registry entries in `tools/patch-engine/src/ops/story-record-specs.ts` (shape `{ allocationKey, idPattern, nodeType, prefix, sourceDir }`; e.g. `append_story_diegetic_artifact_record` at line ~237, verified this session). Supersession uses dedicated `supersede_<class>_record` ops (`supersede_clk_record`/`supersede_stsec_record`/`supersede_stq_record` at lines ~188/202/216). The patch-engine envelope `schema.ts` has `story_da_ids?: string[]` (no `stchar_ids` yet). Dispatch is via `create-story-record.ts`. The world-canon `append-character-record.ts` is a SEPARATE standalone-op pattern (writes `worlds/<slug>/characters/`) — NOT the model here.
2. The op design + the "do not model on append-character-record.ts" correction are specified in `specs/SPEC-56-stchar-machine-foundation.md` §Phase 4 (reassessed this session — finding I1 corrected the original world-canon-pattern mismodel).
3. **Cross-artifact boundary under audit**: the op's `STORY_RECORD_SPECS` entry must match the `append_story_diegetic_artifact_record` shape; `describe_envelope_schema` (world-mcp) must document the new ops; `validate-patch-plan.test.ts` (world-mcp) currently references `bound_char_id` in a patch-plan fixture and must be updated.
4. **FOUNDATIONS principle restatement**: §Canonical Storage Layer — `_source`/hybrid story-bundle writes are engine-only; STCHAR routes through `submit_patch_plan`, never direct-written. The op preserves that guarantee.
5. **Canon Safety surface** (`tools/patch-engine/src/`): the new ops gate STCHAR record writes at engine pre-apply time. Confirm the change does not weaken the Mystery Reserve firewall — STCHAR writes are character-authority writes, orthogonal to MR resolution; the engine's existing MR firewall and validator pre-apply gate are unchanged. **Implementer open-point**: STCHAR is the first *hybrid* story-bundle record needing supersession (story DA is append-only with no supersede op) — confirm/establish the hybrid-supersede path against the atomic `supersede_<class>_record` precedent and story DA's hybrid writer when implementing.

## Architecture Check

1. Registering the STCHAR op in `STORY_RECORD_SPECS` (rather than a standalone op file like `append-character-record.ts`) keeps it consistent with every other story-bundle op and reuses the existing dispatch + hybrid-write machinery. The world-canon standalone-op pattern would diverge the surface and mis-locate the write target.
2. No backwards-compatibility aliasing: op names use the story-bundle `<verb>_story_<class>_record` convention; no `*_stchar_profile` alias.

## Verification Layers

1. `allocate_next_id` supports `STCHAR` via `stchar_ids` envelope field → patch-plan validation test.
2. `append_story_character_authority_record` writes `stories/<slug>/story-characters/STCHAR-<id>.md` → op apply test (hybrid file lands at the correct path, NOT under `_source/`).
3. `supersede_story_character_authority_record` writes the superseding file + lifecycle-marks the old → op apply test mirroring an existing `supersede_<class>_record` test.
4. `describe_envelope_schema` documents the new ops → world-mcp tool test.

## What to Change

### 1. Envelope + allocation

Add `stchar_ids?: string[]` to the ID-allocation envelope fields in `tools/patch-engine/src/envelope/schema.ts`; add the new op kinds to the OPERATION_KINDS surface.

### 2. STORY_RECORD_SPECS entry + supersede op

Add `append_story_character_authority_record: { allocationKey: "stchar_ids", idPattern: /^STCHAR-\d+$/, nodeType: "story_character_authority_record", prefix: "STCHAR", sourceDir: "story-characters" }` to `story-record-specs.ts`. Add `supersede_story_character_authority_record` modeled on `supersede_clk_record`/`supersede_stsec_record`/`supersede_stq_record`. Reuse `stageNewHybridFile` for the hybrid write; confirm `create-story-record.ts` dispatches the hybrid path (mirror story DA).

### 3. Stale-index + envelope-schema doc

Add stale-index detection covering `stories/*/story-characters/STCHAR-*.md`. Document the new ops in `describe-envelope-schema.ts`. Update `validate-patch-plan.test.ts` (`bound_char_id` → `bound_stchar_id`).

## Files to Touch

- `tools/patch-engine/src/envelope/schema.ts` (modify)
- `tools/patch-engine/src/ops/story-record-specs.ts` (modify)
- `tools/patch-engine/src/ops/create-story-record.ts` (modify)
- `tools/patch-engine/src/apply.ts` (modify)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify)
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify)
- `tools/patch-engine/tests/**` (new + modify — op apply + stale-index tests)

## Out of Scope

- `allocate_next_id` `ID_CLASS_FORMATS`/`ID_CLASSES` enum (world-mcp) — ticket 006 (the patch-engine envelope `stchar_ids` field is here; the world-mcp allocator entry is there).
- A bespoke `retire_*` op — deferred (M2).
- World-index parsing of the written STCHAR file — ticket 005.

## Acceptance Criteria

### Tests That Must Pass

1. `append_story_character_authority_record` writes a valid STCHAR markdown file at `stories/<slug>/story-characters/STCHAR-<id>.md`; direct `Edit`/`Write` to that path remains blocked.
2. `supersede_story_character_authority_record` writes the superseding file and lifecycle-marks the predecessor.
3. `npm test --prefix tools/patch-engine` + `npm test --prefix tools/world-mcp` green (incl. updated `validate-patch-plan.test.ts`).

### Invariants

1. STCHAR writes route exclusively through the patch engine (engine-only surface — §Canonical Storage Layer).
2. Op naming follows the story-bundle `<verb>_story_<class>_record` convention.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/**` (new) — `append_story_character_authority_record` + `supersede_story_character_authority_record` apply tests + stale-index guard test.
2. `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify) — `bound_char_id` → `bound_stchar_id`; assert envelope accepts `stchar_ids`.

### Commands

1. `npm run build --prefix tools/patch-engine` (covers tsc).
2. `npm test --prefix tools/patch-engine` then `npm test --prefix tools/world-mcp`.
