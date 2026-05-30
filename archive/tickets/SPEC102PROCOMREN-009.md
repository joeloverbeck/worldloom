# SPEC102PROCOMREN-009: Prompt write layer + `PROMPT-<n>` ID allocator

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — introduces `tools/manual-story-studio/src/write/prompts.ts` and extends `tools/manual-story-studio/src/write/id-allocator.ts` with prompt-id allocation. No impact on existing record-class writes.
**Deps**: 002

## Problem

The author "Save Prompt" action writes two files atomically per saved prompt: `worlds/<slug>/manual-stories/<ms-slug>/prompts/PROMPT-<n>.md` (the assembled Markdown) and `worlds/<slug>/manual-stories/<ms-slug>/prompt-runs/PROMPT-<n>.yaml` (the sidecar carrying provenance + `prompt_sha256` + optional `lint_override`). The `PROMPT-<n>` ID class is per-manual-story append-only and uses an uppercase prefix distinct from the lowercase `m*`-prefixed record classes already in `MANUAL_RECORD_CLASS_PREFIXES`. The sandbox guard (`assertInsideSandbox`) must continue to enforce writes inside `manualStoryRoot`.

## Assumption Reassessment (2026-05-30)

1. Verified `tools/manual-story-studio/src/write/id-allocator.ts` exists with `allocateNextId(manualStoryRoot, classDir, prefix)` (line 7) and `allocateNextIdForClass(manualStoryRoot, recordClass)` (uses `MANUAL_RECORD_CLASS_PREFIXES`). The existing pattern scans `records/<classDir>/<prefix>-<integer>.yaml` files for the max integer suffix and returns `<prefix>-(max+1)`. The same scanning shape applies to `PROMPT-<integer>.md` under `prompts/`. The sandbox helper `assertInsideSandbox` lives at `tools/manual-story-studio/src/write/sandbox.ts` and is the existing write-time integrity check.
2. SPEC-102 §Scope item 2 stage 12 enumerates the sidecar fields: `id, created_at, manual_story_slug, included_cast, included_records, included_template, moment_directive, prompt_sha256`. Plus `lint_override?: { findings: PromptLintFinding[], copied_anyway_at: string }` per SPEC-102 §Scope item 4 ("soft overrides log into the sidecar"). The `prompt_sha256` is informational only per SPEC-102 §3 Key Decisions ("prompt_sha256 is informational, never gating") and per the author's standing position [[feedback_author_rejects_hash_coupling]].
3. Cross-artifact shared boundary: the route layer (ticket 010) calls this module's exported `writePrompt(root, composeResult, lintOverride?)` to persist a save. The module returns the allocated `PROMPT-<n>` id + on-disk paths. It does NOT mutate compose output; the Markdown saved is byte-identical to compose output, and `prompt_sha256 = sha256(markdown)` records the hash at save time.

## Architecture Check

1. Adding `allocateNextPromptId(manualStoryRoot)` to the existing `id-allocator.ts` (rather than a new file) keeps allocation discipline in one place; the existing `allocateNextId` helper already takes `classDir` and `prefix` as parameters, so the new function is a thin wrapper specializing to `("prompts", "PROMPT")`. One diff line is cheaper to review than a parallel-allocator-file split.
2. A separate `write/prompts.ts` for the actual write coheres with the existing `write/records.ts` + `write/manual-story-metadata.ts` per-surface decomposition. Bundling prompt writes into `write/records.ts` would conflate the lowercase-record discipline (`mchar`, `mbel`, etc.) with the uppercase-prompt-id discipline.
3. No backwards-compatibility aliasing — prompts are a greenfield artifact class.

## Verification Layers

1. `PROMPT-<n>` ids are per-manual-story append-only — schema validation (consecutive `writePrompt` calls produce `PROMPT-1.md`, `PROMPT-2.md`, ...).
2. Both files land inside `manualStoryRoot` — schema validation (`assertInsideSandbox` is invoked before each write).
3. `prompt_sha256` is `sha256(markdown)` byte-for-byte — schema validation (test asserts the sidecar's hash matches `crypto.createHash("sha256").update(markdown).digest("hex")`).
4. Sidecar carries all 8 mandatory fields + the optional `lint_override` — schema validation (test reads the sidecar and asserts field presence).

## What to Change

### 1. Extend `tools/manual-story-studio/src/write/id-allocator.ts`

Add `export function allocateNextPromptId(manualStoryRoot: string): string` that wraps the existing `allocateNextId(manualStoryRoot, "prompts", "PROMPT")`. The existing private `allocateNextId` already implements the scan-and-increment over `<prefix>-(\d+)\.yaml` patterns; the new wrapper passes `"PROMPT"` as the prefix. NOTE: the existing scan uses the `\.yaml` extension. Prompts use `\.md`. Refactor `allocateNextId` to accept an extension parameter (default `"yaml"` for backward compatibility) so the new wrapper can pass `"md"`. The single existing call site `allocateNextIdForClass` continues to pass `"yaml"` (the default).

### 2. Create `tools/manual-story-studio/src/write/prompts.ts`

Export:

```ts
import crypto from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { PromptComposeResult, PromptLintFinding, PromptRunSidecar } from "../prompt/types.js";
import { assertInsideSandbox, safeWriteFile, type ManualStoryRoot } from "./sandbox.js";
import { allocateNextPromptId } from "./id-allocator.js";

export interface WritePromptInput {
  root: ManualStoryRoot;
  composeResult: PromptComposeResult;
  lint_override?: { findings: PromptLintFinding[]; copied_anyway_at: string };
}

export interface WritePromptResult {
  id: string;
  markdown_path: string;
  sidecar_path: string;
  sidecar: PromptRunSidecar;
}

export function writePrompt(input: WritePromptInput): WritePromptResult { /* ... */ }
```

Implementation steps inside `writePrompt`:

1. `mkdirSync(path.join(root.absolutePath, "prompts"), { recursive: true })` and same for `prompt-runs/`. Verify with `assertInsideSandbox`.
2. Allocate id via `allocateNextPromptId(root.absolutePath)` (e.g., `PROMPT-1`).
3. Compute `prompt_sha256 = crypto.createHash("sha256").update(composeResult.markdown).digest("hex")`.
4. Build `sidecar: PromptRunSidecar`:
   - `id`, `created_at: new Date().toISOString()`, `manual_story_slug: root.manualStorySlug`.
   - Spread `composeResult.sidecar_draft`.
   - `prompt_sha256`.
   - Include `lint_override` field only if `input.lint_override` is provided (the soft-override copy-anyway path).
5. Write Markdown file via `safeWriteFile(root, "prompts/PROMPT-N.md", composeResult.markdown)`.
6. Write sidecar via `safeWriteFile(root, "prompt-runs/PROMPT-N.yaml", YAML.stringify(sidecar))`.
7. Return `{ id, markdown_path, sidecar_path, sidecar }`.

### 3. Tests

`test/write/prompts.test.ts` covers:
- Sequential `writePrompt` calls produce `PROMPT-1.md`, `PROMPT-2.md`, etc. (append-only id allocation).
- Sidecar contains all 8 mandatory fields + omits `lint_override` when not provided.
- `prompt_sha256` equals `sha256(markdown)` byte-for-byte.
- Sandbox enforcement: attempting a write outside `manualStoryRoot` throws.
- Soft-override path: `lint_override` field is persisted when provided.

## Files to Touch

- `tools/manual-story-studio/src/write/id-allocator.ts` (modify) — add `allocateNextPromptId` + refactor `allocateNextId` to accept extension parameter
- `tools/manual-story-studio/src/write/prompts.ts` (new)
- `tools/manual-story-studio/test/write/prompts.test.ts` (new)

## Out of Scope

- HTTP routes (ticket 010).
- Frontend Save-Prompt button wiring (ticket 013).
- Auto-archive / soft-delete semantics for prompts — not specified in SPEC-102; saved prompts are immutable append-only files per the existing record-class discipline.
- Verifying `prompt_sha256` against the saved Markdown after the fact — explicit non-goal per SPEC-102 §3 Key Decisions and [[feedback_author_rejects_hash_coupling]].

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` passes — write/prompts test included.
2. Sequential writes produce `PROMPT-1`, `PROMPT-2`, `PROMPT-3` (SPEC-102 §Acceptance criterion 5; allocation is append-only).
3. Sidecar YAML round-trips with the 8 mandatory fields per SPEC-102 §Scope item 2 stage 12.
4. `lint_override` field round-trips when supplied (SPEC-102 §Acceptance criterion 9).

### Invariants

1. Prompt id allocation is per-manual-story append-only — scan `prompts/PROMPT-<n>.md` files for max suffix.
2. Markdown is written byte-identical to compose output; no transformation.
3. Sandbox guard enforces all writes land inside `manualStoryRoot`.
4. `prompt_sha256` is informational; no downstream code path reads it as a precondition.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/write/prompts.test.ts` — id allocation, sidecar shape, hash correctness, sandbox enforcement, override field.

### Commands

1. `cd tools/manual-story-studio && npm test`
