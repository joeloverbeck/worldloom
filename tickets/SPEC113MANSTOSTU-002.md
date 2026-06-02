# SPEC113MANSTOSTU-002: Inclusion-ledger core — `resolution` shape + compose buckets + excluded suppression

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/manual-story-studio` prompt module (`src/prompt/types.ts`, `src/prompt/compose.ts`). No canon-pipeline impact (package is canon-fenced per SPEC-100).
**Deps**: archive/tickets/SPEC113MANSTOSTU-001.md

## Problem

`composePrompt()` returns only `{ markdown, lint, sidecar_draft }` — no per-record account of what was included, excluded, suppressed, or blocked. SPEC-113 §2 item 2 extends the result with a `resolution` ledger so the Prompt Preview inspector (004) can answer the author's real question: "did the app process my records the way I expected?". This ticket lands the ledger's `included` / `excluded` / `suppressed` / `blocked` buckets, computed inside the existing 12-stage compose, plus the compose-time enforcement of `excluded_records` (the field added by 001). `section_map` population lands in 003.

## Assumption Reassessment (2026-06-02)

1. `composePrompt` (`src/prompt/compose.ts:71`) seeds records at stage 2.5 as `mergeIds(input.included_records, [...pinned_records, ...active_secrets_questions, ...must_not_reveal])` and drops `active === false` records at stage 4 (line 173). There is **no** `prompt_visibility` consultation and **no** relevance gate — `current_location` / `active_pressure_clocks` are not seeded as records at all. `PromptComposeResult` is at `src/prompt/types.ts:75`. The ledger reasons must therefore be *descriptive* of these actual seeding paths per SPEC-113 §3 "Descriptive ledger, not evaluative" — not the richer report-§14 model.
2. SPEC-113 §2 item 2 fixes the bucket shape; §3 fixes the descriptive reason vocabulary (`included ∈ {explicitly_selected, pinned, active_secret_question, current_cast}`; `excluded ∈ {inactive, working_set_excluded}`; `suppressed` reason `must_not_reveal`); §Acceptance #1–4 fix the test contract. The `excluded_records` field consumed here is added by archive/tickets/SPEC113MANSTOSTU-001.md.
3. Cross-artifact boundary under audit: the `resolution` type in `src/prompt/types.ts` is the contract consumed downstream by the frontend inspector (004, which adds the mirrored web type) and extended by 003 (`section_map` population). The buckets must be insertion-ordered for byte-identical determinism.
4. FOUNDATIONS §Tooling Recommendation (deterministic packets) + Rule 6 (No Silent Retcons): the ledger is computed deterministically inside the existing pipeline (no LLM, no network) and makes each inclusion/exclusion decision explicit, so a change in what the prompt asserts between runs becomes visible in the ledger rather than silent.

## Architecture Check

1. The ledger is derived during the existing stages (each stage records its decision as it fires) rather than via a second pass — guaranteeing the ledger describes the *actual* composition, not a re-derivation that could drift from the markdown. `excluded_records` suppression is applied at the seeding stage so an excluded record never reaches the markdown and is reported once, in `excluded`.
2. No backwards-compat shim: `resolution` is a new required field on `PromptComposeResult`; the sole producer (compose) and the in-batch consumer (004) are updated together.

## Verification Layers

1. Determinism -> `test/prompt/inclusion-ledger.test.ts` byte-identical `resolution` assertion for identical inputs.
2. Excluded record absent from markdown + reported `working_set_excluded` -> ledger test assertion (SPEC-113 AC#2).
3. Inactive seeded record reported `inactive`; must-not-reveal reported `suppressed` (not `excluded`) -> ledger test assertions (AC#3, AC#4).
4. Bucket reasons map to real seeding paths -> FOUNDATIONS alignment check against §3 descriptive-ledger decision (no `prompt_visibility`/relevance reasons emitted).

## What to Change

### 1. `resolution` type (`src/prompt/types.ts`)

Add a `PromptResolution` interface (the spec accepts `inclusion_ledger` as an alias name): `included: { id; title; class; reason; section }[]` with `reason` the §3 union `"explicitly_selected" | "pinned" | "active_secret_question" | "current_cast"`; `excluded: { id; title; class; reason }[]` with `reason` `"inactive" | "working_set_excluded"`; `suppressed: { id; title; reason: "must_not_reveal" }[]`; `blocked: { ref; reason }[]`; `section_map: Record<string, string[]>` (populated by 003 — emit `{}` here). Add `resolution: PromptResolution` to `PromptComposeResult`.

### 2. Compose ledger threading + excluded suppression (`src/prompt/compose.ts`)

At stage 2.5, drop every `excluded_records` id from `seededRecordIds` and record each dropped id as `excluded` with reason `working_set_excluded`. At stage 4: record `active === false` drops as `excluded` reason `inactive`; record must-not-reveal records as `suppressed`; record each surviving included record with its seeding-path reason (`explicitly_selected` for `input.included_records`, `pinned` for `pinned_records`, `active_secret_question` for `active_secrets_questions`, `current_cast` for cast seeded from `current_cast`). Map the existing `missingCastFindings` / `missingRecordFindings` / `templateLintFindings` into `blocked` (group, do not re-lint). A record in BOTH `excluded_records` and `must_not_reveal` → `excluded` (exclusion wins, per §3). Initialize `resolution.section_map = {}` (003 fills it). Return `resolution` on the result, including the early-exit path.

### 3. Ledger test

Create `test/prompt/inclusion-ledger.test.ts` asserting determinism + AC#2/#3/#4 buckets against a fixture working set.

## Files to Touch

- `tools/manual-story-studio/src/prompt/types.ts` (modify)
- `tools/manual-story-studio/src/prompt/compose.ts` (modify)
- `tools/manual-story-studio/test/prompt/inclusion-ledger.test.ts` (new)

## Out of Scope

- `section_map` population (003) — emit `{}` here.
- The frontend inspector (004).
- The `excluded_records` schema / validator / picker (001).
- Any change to emitted markdown text (the ledger is side-output; exclusion only removes already-excluded records before assembly).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run test:backend` — inclusion-ledger suite green (determinism + AC#2/#3/#4 buckets).
2. Existing `prompt-compose.test.ts` stays green (markdown byte-identical for non-excluded inputs).

### Invariants

1. Same inputs → byte-identical `resolution` (insertion-ordered buckets, no wall-clock, no `Date.now()`).
2. An `excluded_records` member is absent from `markdown` AND present in `excluded` with reason `working_set_excluded`.
3. must-not-reveal records appear in `suppressed`, never `excluded` — unless also listed in `excluded_records`, where exclusion wins.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt/inclusion-ledger.test.ts` — ledger buckets + determinism (new).

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm test`
