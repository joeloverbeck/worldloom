# SPEC102PROCOMREN-007: Compose pipeline (12 stages)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/manual-story-studio/src/prompt/compose.ts` orchestrating the 12-stage deterministic composition pipeline. No impact on existing code paths.
**Deps**: 001, 006

## Problem

The 12-stage deterministic composition pipeline is the heart of Manual Studio's externalized FOUNDATIONS §Tooling Recommendation packet. It takes a compose-input (moment directive + selected cast/record/template IDs), loads every dependency from disk, calls the 15 section emitters, runs the lint pass, and returns the assembled Markdown plus lint result plus sidecar draft. The output must be byte-identical across runs for identical inputs (SPEC-102 §Acceptance criterion 1).

## Assumption Reassessment (2026-05-30)

1. Verified `tools/manual-story-studio/src/prompt/compose.ts` does not exist. The dependencies it consumes are: `src/prompt/sections/index.ts` (ticket 006), `src/prompt/translators/index.ts` (tickets 002-005), `src/prompt/types.ts` (ticket 002), `src/read/manual-story-metadata.ts` (existing), `src/read/records.ts` (existing), `src/write/sandbox.ts` (existing — `resolveManualStoryRoot`, `assertInsideSandbox`), `docs/prose-renderer-contract/content-policy.md` (existing), `docs/manual-story-studio/prose-craft-contract.md` (ticket 001).
2. SPEC-102 §Scope item 2 enumerates the 12 stages exactly: validate moment directive non-empty; load metadata + prose preferences; load selected cast profiles; load selected/active relevant records; load optional beat template; load content policy from disk; load prose-craft-contract from disk; translate records via per-class translators; compose Markdown via 15 sections; run prompt lint; return Markdown + lint status; write on author "Save Prompt" action (write side is ticket 009; compose returns the sidecar draft).
3. Cross-artifact shared boundary: the compose orchestrates the 18-translator surface + 15-section surface + lint surface into one byte-deterministic call. Determinism requires: stable record ordering (read-layer returns deterministic order; compose preserves it), stable cast ordering (preserves `included_cast` array order), stable section ordering (006's barrel owns this), and stable disk reads (no concurrent writes during compose). Fixture-based byte-equality testing is the determinism proof per SPEC-102 §6 Build & test.
4. FOUNDATIONS principle restated: §Tooling Recommendation — "LLM agents should never operate on prose alone. They should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel, current Invariants, relevant canon fact records, affected domain files, unresolved contradictions list, mystery reserve entries touching the same domain." The compose pipeline is the Manual Studio externalization across a process boundary: world-context equivalents reach the LLM via the 15-section packet rather than via MCP.

## Architecture Check

1. A single orchestrator file makes the 12-stage pipeline grep-findable; each stage is a method or a clearly-commented block in `compose()`. The alternative (a stage-per-file orchestrator) over-decomposes for what is intrinsically one sequential pipeline.
2. No backwards-compatibility aliasing — pipeline is greenfield; no shim between old (none) and new compose entry points.

## Verification Layers

1. Byte-deterministic output — schema validation (fixture inputs A and B produce byte-identical Markdown across 10 invocations).
2. Empty moment directive rejected — schema validation (stage 1 throws or returns hard-lint finding).
3. Content-policy loaded at compose time, not bundled — codebase grep-proof (no Webpack/Vite asset import of `content-policy.md` anywhere in `src/`).
4. Recent-segment fallback graceful — schema validation (fixture with no segments produces §3 without the fallback paragraph; fixture with a segment produces §3 with the paragraph).
5. FOUNDATIONS §Tooling Recommendation packet realization — manual review of an emitted fixture prompt (does it cover World-Kernel-equivalent + Invariant-equivalent + relevant-records + mystery-reserve-equivalent surfaces?).

## What to Change

### 1. Create `tools/manual-story-studio/src/prompt/compose.ts`

Export an async `composePrompt(input: PromptComposeInput): Promise<PromptComposeResult>` function. Stages (one per SPEC-102 §Scope item 2 stage):

1. Validate `moment_directive` is non-empty (whitespace-trimmed). On empty, return early with a hard `PromptLintFinding` and empty Markdown.
2. Load metadata via `readManualStoryMetadata(input.manualStoryRoot)`. If null, throw `manual_story_not_found`.
3. Load selected cast profiles — for each id in `input.included_cast`, call `readRecord(root, "cast", id)`; collect into `cast[]`. Missing ids surface as hard lint findings (selected-cast-exists rule).
4. Load selected / active relevant records — for each id in `input.included_records`, call `readRecord(root, <class>, id)` (resolving class from id prefix); collect into `records[]`. Filter `active: false` records out per SPEC-102 §Scope item 1 ("Relevant records picker auto-suggests active records"). Missing ids → hard finding.
5. Load optional beat template — read `input.included_template_path` from disk if non-null; null body otherwise. (SPEC-104 supplies the path; this pipeline accepts an optional pre-resolved path.)
6. Load content policy: `fs.readFileSync(path.join(repoRoot, "docs/prose-renderer-contract/content-policy.md"), "utf8")`. Read at compose time, not bundled.
7. Load Manual Studio prose-craft contract: `fs.readFileSync(path.join(repoRoot, "docs/manual-story-studio/prose-craft-contract.md"), "utf8")`. Read at compose time, not bundled.
8. Translate records — implicit; the section emitters in 006 call `getTranslator(recordClass)` per-record. Compose passes records and cast into `SectionEmitterInput`; the per-class translators are invoked at section-emit time.
9. Compose Markdown — call `assembleSections(emitterInput)` from `sections/index.ts` (ticket 006).
10. Run prompt lint — call `lintPrompt(markdown, expectedContentPolicyBody, allKnownRecordIds)` from `lint.ts` (ticket 008; this pipeline accepts the lint function as an import and tolerates the test that "lint module empty until 008 lands" by using a `lintPrompt` stub returning `{findings: [], cleanForCopy: true, blockingForCopy: false}` only when running outside the integration test seam. Concretely: import `lintPrompt` from `../lint.ts`; tickets are ordered so 008 lands before 007's lint integration test is exercised).
11. Return `{ markdown, lint, sidecar_draft }` — `sidecar_draft` carries the closeable subset (`manual_story_slug`, `included_cast`, `included_records`, `included_template_path`, `moment_directive`); id/created_at/prompt_sha256 are populated by ticket 009 at write time.
12. On author "Save Prompt" action — out of scope for this ticket; ticket 009 owns the write side. The route layer (ticket 010) wires compose + write together.

Pre-paragraph for stage 3 fallback: when `metadata.prompt_policy.include_recent_segments > 0` AND a segment directory exists, read the latest segment file's last paragraph and supply it as `recent_segment_last_paragraph` in `SectionEmitterInput`. Per SPEC-102 §Scope item 3 §3, when no segments exist, supply `null` and the §3 emitter omits the fallback paragraph.

The `manualStoryRoot` is repo-root-relative; `compose()` derives `repoRoot` from `path.resolve(input.manualStoryRoot, "..", "..", "..", "..")` (manual-stories/<slug>/.. = manual-stories; ../ = world; ../ = worlds; ../ = repoRoot) OR accepts `repoRoot` as an additional input field — choose the latter for explicitness.

Update `PromptComposeInput` shape (in ticket 002's `types.ts`) by addition during this ticket: add `repoRoot: string` field; this is an additive change to a type interface created in 002 and consumed nowhere yet (translator/section tickets don't construct `PromptComposeInput`).

### 2. Compose pipeline test

`test/prompt-compose.test.ts` covers:
- Fixture manual story → assembled Markdown is byte-identical across 5 invocations (determinism).
- Fixture with empty `moment_directive` returns hard finding + empty Markdown.
- Fixture with a missing cast id returns hard finding + degraded Markdown.
- Fixture with no segments produces §3 without the fallback paragraph.
- Fixture with a present segment produces §3 with the fallback paragraph.
- Loaded content-policy matches disk content-policy byte-for-byte (regression-proof for bundling).

## Files to Touch

- `tools/manual-story-studio/src/prompt/compose.ts` (new)
- `tools/manual-story-studio/test/prompt-compose.test.ts` (new)

## Out of Scope

- Lint module implementation (ticket 008).
- Writing the assembled prompt to disk (ticket 009).
- HTTP routes (ticket 010).
- Frontend (tickets 011-013).
- Beat template selection UI / loading from SPEC-104 — `included_template_path` is an optional input here; SPEC-104 wires the picker.
- Loading the most recent segment from disk — implementation reads from `manual-stories/<slug>/segments/`; that directory may not yet exist (pre-SPEC-103). Graceful no-segments-yet behavior is required.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` passes — `prompt-compose.test.ts` included.
2. Fixture determinism test asserts byte-equal output across 5 invocations (SPEC-102 §Acceptance criterion 1).
3. Content-policy section in the assembled output matches `docs/prose-renderer-contract/content-policy.md` byte-for-byte (SPEC-102 §Acceptance criterion 2; verified in this ticket plus ticket 006 sections test).
4. Empty-moment-directive fixture returns a hard `PromptLintFinding` and empty Markdown.

### Invariants

1. Compose is deterministic: same input → same output across runs.
2. Content-policy and prose-craft-contract are read from disk at compose time, never bundled.
3. The 12 stages execute in fixed order; stage 1 (empty-directive validation) is unconditional and short-circuits when failing.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt-compose.test.ts` — fixture determinism + missing-input + segment-fallback + content-policy byte-equality.

### Commands

1. `cd tools/manual-story-studio && npm test`
