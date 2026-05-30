# SPEC102PROCOMREN-004: Translators bundle 2 — mental / relational classes

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds 6 pure-function translators under `tools/manual-story-studio/src/prompt/translators/` and registers them in the translator registry. No impact on existing code paths.
**Deps**: 002

## Problem

Six per-class translators are needed to lower mental-state and relational Manual Studio records into novelist-facing prose fragments that the section emitters (ticket 006) inject into §8 / §9 / §10 of the composed prompt: `beliefs`, `secrets`, `intentions`, `plans`, `emotions`, and `relationships`. Each translator is a pure function of the record's own fields. Spec §Scope item 2 stage 8 gives the worked examples ("a belief becomes 'Jon thinks Ane is hurt and is trying not to scare her off'... a secret becomes 'Ane has not told Jon she was followed last week'").

## Assumption Reassessment (2026-05-30)

1. Verified the 6 record classes exist in `tools/manual-story-studio/src/schema/manual-story.ts` with their `m`-prefix mappings: `beliefs` → `mbel`, `secrets` → `msecret`, `intentions` → `mint`, `plans` → `mplan`, `emotions` → `memo`, `relationships` → `mrel` (`MANUAL_RECORD_CLASS_PREFIXES`). Per-class field shapes (holder cast id, target cast ids, content, axes, audience_visibility, forbidden_reveal_tags, etc.) consumed verbatim from the schema; translators do not invent fields.
2. SPEC-102 §Scope item 3 §8 / §9 / §10 enumerate the consumption sites: §8 takes active `memo-*` / `mrel-*` records for involved cast; §9 takes active `mint-*` / `mplan-*` records; §10 takes active `mbel-*` / `msecret-*` / `mq-*` records (the `mq-*` translator lives in bundle 3). §10 specifically routes `secret.audience_visibility` and `question.must_not_resolve_unless` into reveal-permission language — the `secrets` translator emits this.
3. Cross-artifact shared boundary: the `RecordTranslator<C>` interface authored in 002 is the contract. The `secrets` translator's forbidden-reveal-tag handling produces text consumed by §10; the corresponding §12 emission of `secret.forbidden_reveal_tags` is the section emitter's responsibility (ticket 006), not this translator's.

## Architecture Check

1. Six small pure functions colocated under `src/prompt/translators/` extending bundle 1's pattern; uniform interface keeps the per-class fixture-test grid simple and grep-findable.
2. No backwards-compatibility aliasing — translators are greenfield; reveal-permission language is constructed from explicit schema fields rather than inferred via heuristics.

## Verification Layers

1. Each translator is registered — codebase grep-proof (`grep -E "registerTranslator\\(.(beliefs|secrets|intentions|plans|emotions|relationships).\\)" tools/manual-story-studio/src/prompt/translators/index.ts` returns 6 matches).
2. Each translator passes a fixture test — schema validation (per-class fixture record → expected prose fragment).
3. Secrets-translator reveal-permission language correctness — schema validation (fixture with `audience_visibility: "concealed"` emits "do not reveal" framing; fixture with `audience_visibility: "shared"` emits "may be referenced" framing).
4. No translator emits a Manual Studio record ID — codebase grep-proof on emitted fragments (regex `m[a-z]+-[0-9]+` returns no matches).

## What to Change

### 1. Beliefs translator (`translators/beliefs.ts`)

Pure function `(record: ManualBeliefRecord) => string`. Emit a `- <holder title> thinks: <details>` line. If the record names a `target` cast, render "<holder title> thinks about <target title>: <details>". Use the cast record `title` (looked up via reference fields), never `mchar-N`.

### 2. Secrets translator (`translators/secrets.ts`)

Pure function `(record: ManualSecretRecord) => string`. Emit a `- Secret: <details>` line, followed by:
- `Holder: <holder title>` line if a holder is named.
- `Audience: ` clause derived from `audience_visibility` — e.g., `concealed` → `"Do not let the prose reveal this secret"`; `shared` → `"Known to the involved cast"`; `factional` → `"Known within the faction"`; `private` → `"Held privately"`.
- If `forbidden_reveal_tags` is non-empty, emit a `Forbidden reveals: <tag list>` line (consumed by §12 separately, but echoed here for in-context reading).

### 3. Intentions translator (`translators/intentions.ts`)

Pure function `(record: ManualIntentionRecord) => string`. Emit `- <holder title> intends: <details>`. If a target/object is named, include it ("intends to <details> regarding <target title>").

### 4. Plans translator (`translators/plans.ts`)

Pure function `(record: ManualPlanRecord) => string`. Emit a `- Plan (<holder title>): <details>` line; include `Status: <status>` line if the schema carries a status field.

### 5. Emotions translator (`translators/emotions.ts`)

Pure function `(record: ManualEmotionRecord) => string`. Emit `- <holder title> feels: <details>`. If the emotion has a `target`, render "<holder title> feels <details> toward <target title>".

### 6. Relationships translator (`translators/relationships.ts`)

Pure function `(record: ManualRelationshipRecord) => string`. Emit `### <character A title> ↔ <character B title>` followed by `Axes: <axes>` and `Current state: <details>` blocks. Looks up both party titles via the cast records the relationship references.

### 7. Per-translator fixture tests

Each translator gets `test/prompt-translators-<class>.test.ts` exercising one positive fixture, one no-internal-IDs assertion, and (for `secrets`) reveal-permission variant assertions across the closed `audience_visibility` enum.

## Files to Touch

- `tools/manual-story-studio/src/prompt/translators/index.ts` (modify) — adds 6 registrations alongside bundle 1's
- `tools/manual-story-studio/src/prompt/translators/beliefs.ts` (new)
- `tools/manual-story-studio/src/prompt/translators/secrets.ts` (new)
- `tools/manual-story-studio/src/prompt/translators/intentions.ts` (new)
- `tools/manual-story-studio/src/prompt/translators/plans.ts` (new)
- `tools/manual-story-studio/src/prompt/translators/emotions.ts` (new)
- `tools/manual-story-studio/src/prompt/translators/relationships.ts` (new)
- `tools/manual-story-studio/test/prompt-translators-beliefs.test.ts` (new)
- `tools/manual-story-studio/test/prompt-translators-secrets.test.ts` (new)
- `tools/manual-story-studio/test/prompt-translators-intentions.test.ts` (new)
- `tools/manual-story-studio/test/prompt-translators-plans.test.ts` (new)
- `tools/manual-story-studio/test/prompt-translators-emotions.test.ts` (new)
- `tools/manual-story-studio/test/prompt-translators-relationships.test.ts` (new)

## Out of Scope

- The remaining 6 narrative/temporal translators (ticket 005).
- §12 Forbidden Inventions emission — ticket 006 section emitter assembles the §12 body from `secret.forbidden_reveal_tags` plus cast `prose_constraints` fields; this translator's `Forbidden reveals` line is an in-context echo only.
- Reveal-permission enforcement — Manual Studio cannot verify the LLM respects reveal permissions; that's the author's responsibility per SPEC-102 §3 Key Decisions.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` passes — all 6 fixture tests included.
2. `grep -nE 'registerTranslator\("(beliefs|secrets|intentions|plans|emotions|relationships)"' tools/manual-story-studio/src/prompt/translators/index.ts` returns exactly 6 matches.
3. Secrets-translator fixture test asserts `audience_visibility: "concealed"` emits "do not" language and `audience_visibility: "shared"` emits non-restrictive language — proving reveal-permission language is derived from the schema field per SPEC-102 §Scope item 3 §10.

### Invariants

1. Each translator is a pure function — no I/O, no LLM, no state.
2. No translator emits a Manual Studio internal record ID.
3. Reveal-permission language is derived from the schema's closed `audience_visibility` enum, not from heuristics or inferred from `details` content.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt-translators-beliefs.test.ts` — holder/target/details emission; no `mchar-N` / `mbel-N`.
2. `tools/manual-story-studio/test/prompt-translators-secrets.test.ts` — multiple `audience_visibility` variants → distinct reveal-permission language; no internal IDs.
3. `tools/manual-story-studio/test/prompt-translators-intentions.test.ts` — holder/target/details emission.
4. `tools/manual-story-studio/test/prompt-translators-plans.test.ts` — holder/status/details emission.
5. `tools/manual-story-studio/test/prompt-translators-emotions.test.ts` — holder/target/details emission.
6. `tools/manual-story-studio/test/prompt-translators-relationships.test.ts` — pair title heading + axes + state.

### Commands

1. `cd tools/manual-story-studio && npm test`
