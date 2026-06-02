# SPEC109MANSTOSTU-007: Composer plumbing + compose tests

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — modifies `src/prompt/compose.ts` to load current-context after metadata and reshape selector behavior for prompt sections §3 / §7 / §8 / §10 / §11; adds `test/current-context/compose-prefers-context.test.ts`.
**Deps**: SPEC109MANSTOSTU-002

## Problem

SPEC-109's current-context layer is purely additive at the composer level — when no current-context.yaml exists, the composer must preserve current per-section behavior; when one is present, the composer must reshape its selector inputs so the prompt renders the author's explicit point-of-view. The §3 Current Situation emitter replaces its existing sub-blocks with the author's `current_handoff_summary` (per `/reassess-spec` Q3=(b)); §7 Cast and Voice is seeded from `current_cast` and renders a new POV sub-bullet; §10 Beliefs/Secrets/Questions threads `active_secrets_questions` + a "Must not reveal" sub-block; §11 Physical Continuity (and §8 Emotional and Relationship State) pull from `pinned_records` indirectly via the composer's seeding pass. This ticket is the load-bearing prompt-quality deliverable of SPEC-109 — it is what makes the cockpit's current-context surface actually shape the external LLM prompt.

## Assumption Reassessment (2026-06-01)

1. **Codebase**: `tools/manual-story-studio/src/prompt/compose.ts` (396 lines) is a 12-stage pipeline. Stage 2 loads metadata (line 81); Stage 3 loads selected cast (line 90); the insertion point for current-context loading is between these stages. The §3 emitter at `src/prompt/sections/section-3-current-situation.ts:9` carries the `isCentralOrHigh` filter; §7 at `section-7-cast-and-voice.ts` filters `input.cast` by `input.included_cast_ids`; §8/§10/§11 emitters filter by `included_cast_ids` only (no importance heuristic). `tools/manual-story-studio/src/prompt/sections/index.ts` (`assembleSections`) takes a `SectionEmitterInput` with `included_cast_ids`, `cast`, `records`, etc. — the composer's seeding pass can extend this input shape if needed, OR override `included_cast_ids` / `input.records` before invoking `assembleSections`.
2. **Spec**: SPEC-109 §2 item 7 (rewritten per `/reassess-spec`) declares the per-section semantics: §3 replaces "In the moment" + "Pinned situation context" with `current_handoff_summary` (preserves "Most recent prose"); §7 seeds `included_cast_ids` from `current_cast` (ordered) + adds POV sub-bullet; §8/§10/§11 — caller-driven seeding upstream; §10 includes `active_secrets_questions` + "Must not reveal" sub-block. SPEC-109 §3 Key decisions documents the per-section fallback when context absent.
3. **Cross-skill boundary**: The composer's contract with the section emitters is the `SectionEmitterInput` shape + the `TranslatorContext` it carries. This ticket may extend `SectionEmitterInput` with optional current-context-derived fields (e.g., `current_handoff_summary`, `pov_holder`, `must_not_reveal`) that emitters consume conditionally — the additive shape preserves the existing emitter signatures.
4. **FOUNDATIONS §Tooling Recommendation**: the current-context-aware curation narrows the LLM packet to exactly the records relevant to the moment, increasing the precision of the external request. SPEC-109 §5 FOUNDATIONS alignment table cites this principle directly; the composer's seeding pass is the implementation surface where it lands.

## Architecture Check

1. The new "Stage 2.5" current-context load + seeding pass is additive to the existing 12-stage pipeline; the pipeline's deterministic-byte-identical contract is preserved (same inputs → same outputs).
2. Extending `SectionEmitterInput` with optional fields (rather than threading current-context-derived state through new emitter arguments) keeps section emitter signatures stable; emitters that ignore the new fields are unaffected.
3. The fallback path (when current-context is absent) is the existing behavior verbatim — no refactor of section-emitter heuristics is required; the composer just doesn't override `included_cast_ids` and doesn't pass the new optional fields.

## Verification Layers

1. Current-context-present: §3 emitter renders `current_handoff_summary` sub-block; "In the moment" + "Pinned situation context" suppressed → compose test asserts §3 output text.
2. Current-context-present: §7 emitter renders cast in `current_cast` order with POV sub-bullet at the top → compose test asserts §7 output text.
3. Current-context-present: §10 emitter renders `active_secrets_questions` + "Must not reveal" sub-block when `must_not_reveal` is non-empty → compose test.
4. Current-context-absent: §3 emitter retains its `isCentralOrHigh || referencesIncludedCast` filter → compose test (regression for fallback).
5. Current-context-absent: §7 / §8 / §10 / §11 render against caller-supplied `included_cast` / `included_records` unchanged → compose test (regression).
6. Byte-identical determinism: same fixture story → same compose output across two runs → compose test (existing-determinism regression).

## What to Change

### 1. Composer pipeline insertion at `src/prompt/compose.ts`

After Stage 2 (load metadata, line 81-88) and before Stage 3 (load selected cast, line 90), add Stage 2.5: call `readCurrentContext(input.manualStoryRoot)` (from 002). On `{ok: false}` (corrupt), throw with a structured error (parallel to the existing `manual_story_metadata_unavailable` throw at line 83) — the route layer or test harness handles it. On `{ok: true, value: null}`, leave the existing pipeline behavior untouched. On `{ok: true, value: <ctx>}`:
- Override `input.included_cast` with `ctx.current_cast` when `ctx.current_cast.length > 0` (preserves order).
- Merge `ctx.pinned_records` into `input.included_records` (deduped) for §8/§10/§11 pickup.
- Pass `ctx.current_handoff_summary`, `ctx.pov_holder`, `ctx.must_not_reveal`, `ctx.active_secrets_questions` into the `SectionEmitterInput` via new optional fields.

### 2. Section-emitter input extension at `src/prompt/types.ts` (or wherever `SectionEmitterInput` is defined)

Add four optional fields to `SectionEmitterInput`: `current_handoff_summary?: string | null`, `pov_holder?: string | null`, `must_not_reveal?: string[]`, `active_secrets_questions?: string[]`. Emitters that don't consume them are unaffected.

### 3. §3 emitter at `src/prompt/sections/section-3-current-situation.ts`

When `input.current_handoff_summary` is set and non-empty: render a "**Author's current handoff:**" sub-block with the verbatim text instead of "**In the moment:**" + "**Pinned situation context:**". Preserve the existing "**Most recent prose (last paragraph):**" sub-block as a trailing fallback. When `current_handoff_summary` is empty / undefined, retain the existing `isCentralOrHigh || referencesIncludedCast` filter unchanged.

### 4. §7 emitter at `src/prompt/sections/section-7-cast-and-voice.ts`

When `input.pov_holder` is set: render a "**POV:**" sub-bullet at the top of the section with the POV holder's title; cast members render in `input.included_cast_ids` order (which the composer has already seeded from `current_cast`).

### 5. §10 emitter at `src/prompt/sections/section-10-beliefs-secrets-questions.ts`

When `input.active_secrets_questions` is non-empty: surface those records explicitly in the beliefs/secrets/questions blocks (intersecting with the existing per-cast filter). When `input.must_not_reveal` is non-empty: append a "**Must not reveal:**" sub-block listing the forbidden-reveal IDs (resolved to titles via the existing translator).

### 6. New acceptance test at `test/current-context/compose-prefers-context.test.ts`

Hybrid test using fixture stories from `test/current-context/fixtures/`. Cover all six verification layers above. Assert byte-identical output across two runs with the same fixture.

## Files to Touch

- `tools/manual-story-studio/src/prompt/compose.ts` (modify)
- `tools/manual-story-studio/src/prompt/types.ts` (modify — add optional fields to `SectionEmitterInput`)
- `tools/manual-story-studio/src/prompt/sections/section-3-current-situation.ts` (modify)
- `tools/manual-story-studio/src/prompt/sections/section-7-cast-and-voice.ts` (modify)
- `tools/manual-story-studio/src/prompt/sections/section-10-beliefs-secrets-questions.ts` (modify)
- `tools/manual-story-studio/test/current-context/compose-prefers-context.test.ts` (new)

## Out of Scope

- 11-section prompt restructure (rejected per SPEC-109 §3 Key decisions — 15-section structure retained).
- Schema deepening of records (deferred per SPEC-109 §Out of Scope).
- Beat-template filter pressure-type integration (SPEC-110 scope per SPEC-109 §Out of Scope).
- Soft-prompt-lint behavior changes (SPEC-106 / prompt-safety scope, not this spec).
- The frontend Moment Composer's importance-suggested picker (`SUGGEST_IMPORTANCE`) is preserved as the picker default; deprioritizing it when current-context is present is owned by 009.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run test:backend` passes.
2. AC #6 — §3 emitter replaces sub-blocks with `current_handoff_summary` when present; preserves "Most recent prose" fallback.
3. AC #7 — §7 emitter renders `current_cast` members in `current_cast` order when present.
4. AC #8 — With current-context absent, composer preserves current per-section behavior.

### Invariants

1. Determinism: byte-identical compose output for the same fixture across runs.
2. The 12-stage pipeline boundary is preserved — the new current-context load is a single new step between stages 2 and 3, not a refactor of subsequent stages.
3. Section emitter signatures stay backward-compatible — new optional fields on `SectionEmitterInput`; no breaking changes to existing callers.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/current-context/compose-prefers-context.test.ts` — covers all six verification layers (present + absent + determinism).

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm test`
