# SPEC116MANSTOSTU-001: Contain template selection; remove raw-path body field

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` (prompts route, compose pipeline, write sandbox, web request types). No impact on canon pipeline (the package is canon-fenced; this strengthens the read-side fence).
**Deps**: None

## Problem

The prompts compose route reads an author-supplied template path with no sandbox containment, creating an arbitrary-file-read vulnerability that breaches the SPEC-100 package fence:

- `composePrompt` (`src/prompt/compose.ts:177-180`) reads the template from disk via `path.isAbsolute(...) ? included_template_path : path.join(repoRoot, included_template_path)` with **no** `assertInsideSandbox` and accepts **absolute paths** directly. A request body `{"included_template_path": "/etc/passwd"}` (or `"../../some/secret"`) surfaces an arbitrary file's contents into the composed prompt and persisted sidecar.
- The SPEC-104 logical-id field `selected_template` shares the hole: `resolveBeatTemplatePath` (`src/server/routes/prompts.ts:76-86`) builds `records/beat-templates/<id>.yaml` with no id-pattern check and no containment, gated only by `existsSync` (line 127). `selected_template: "../../../_source/canon/CF-1"` resolves outside the manual-story root and reads a canon `_source/` YAML — the very surface the SPEC-100 fence protects.

The logical-id form an earlier SPEC-116 draft proposed as new (`included_template_id`) already shipped as `selected_template`, and the frontend (`web/src/pages/MomentComposer.tsx:210`) already sends it. So the fix is removal of the raw-path body field plus containment of the id-resolved read, not a new field.

## Assumption Reassessment (2026-06-02)

1. `composePrompt` reads the template uncontained — confirmed at `src/prompt/compose.ts:177-180` (`path.isAbsolute` branch + `path.join(repoRoot, ...)`, no `assertInsideSandbox`). `resolveBeatTemplatePath` (`src/server/routes/prompts.ts:76-86`) applies no id-pattern validation; `buildComposeInput` (`prompts.ts:113-131`) gates `selected_template` only by `existsSync`. `assertInsideSandbox(targetPath, root)` exists at `src/write/sandbox.ts:50-80` and is path-shape-agnostic (realpath containment + forbidden-subdir/tool denylists), reusable for read containment.
2. SPEC-116 §2 item 1 (as reassessed 2026-06-02) directs: remove the `included_template_path` body-field acceptance, validate+contain `selected_template`, contain the compose-time read. `docs/ID-ALLOCATION.md:70` documents `mtemplate-<integer>` (schema landed SPEC-104), backing the `^mtemplate-\d+$` id pattern. No global template library exists (templates are story-local under `records/beat-templates/`).
3. Cross-artifact boundary under audit: the prompts route contract (`ComposeBody`) ↔ the compose pipeline's internal `PromptComposeInput.included_template_path` ↔ the persisted `PromptRunSidecar` ↔ the web request type. The **body-field** `included_template_path` is removed; the **internal** `PromptComposeInput.included_template_path` (compose.ts:64, `src/prompt/types.ts:17,60`), the **persisted sidecar** field (`src/write/prompts.ts:55-56`, web `PromptRunSidecarDraft` at `web/src/types/manual-story.ts:299`), and the `src/write/segments.ts:331` `deriveTemplateIdFromPath(sidecar.included_template_path)` derivation all stay — only the request-input surface is removed.
4. FOUNDATIONS §Canonical Storage Layer / write-discipline: the package promises all filesystem access stays inside the manual-story sandbox. This ticket extends that promise to the one read path that currently bypasses it; defense-in-depth analog of canon-layer write discipline at the tooling layer. The traversal currently reachable through `selected_template` can read `worlds/<slug>/_source/` canon records, so closing it directly protects the FOUNDATIONS-governed canon surface.
5. (was template item 7 — rename/remove blast radius) Removing the `included_template_path` **request-body** field touches: `ComposeBody` + `buildComposeInput` (`src/server/routes/prompts.ts:48,110-123`); the web `PromptComposeRequestInput` field (`web/src/types/manual-story.ts:324` + comments 325-327); and two back-compat route tests (`test/server/prompts-routes.test.ts:444` "accepts legacy included_template_path", `:469` "rejects both selected_template AND included_template_path"). Grep confirms the **internal/sidecar** occurrences (compose.ts:64, prompt/types.ts:17/60, write/prompts.ts:55-56, write/segments.ts:331, web `PromptRunSidecarDraft`:299, capstone-spec104.test.ts:408-414, section-6-template-guidance.test.ts internal uses, write/prompts.test.ts:41/110) are NOT affected — they consume the resolved path internally, not the request body.

## Architecture Check

1. Reusing `assertInsideSandbox` for the read keeps a single containment primitive across read and write paths rather than introducing a parallel check that could drift. Validating `selected_template` at the route (`^mtemplate-\d+$`) plus containing at compose time is defense-in-depth: even if a future caller repopulates the internal field, the read still cannot escape. Making `selected_template` the sole public template API removes the raw-path attack surface entirely rather than trying to sanitize free-form paths.
2. No backwards-compatibility aliasing/shims: the `included_template_path` body field is removed outright (no deprecation alias); the two back-compat tests are migrated to `selected_template`, not retained against a shimmed field.

## Verification Layers

1. Absolute path rejected, no out-of-sandbox read → new test `test/server/prompt-template-path-containment.test.ts` (asserts a read outside the manual-story root never occurs).
2. `..`-traversal `selected_template` rejected → same test (`selected_template: "../../../_source/canon/CF-1"` → structured 4xx, no file read).
3. Valid `mtemplate-N` still composes → same test (positive case).
4. `included_template_path` body field gone end to end → codebase grep-proof (zero `included_template_path` in `ComposeBody`/`buildComposeInput` and in `web/src/types/manual-story.ts` `PromptComposeRequestInput`; `npm --prefix web test` `tsc --noEmit` green).
5. Read-side containment preserves SPEC-100 fence → FOUNDATIONS alignment check (§Canonical Storage Layer / write-discipline: no read resolves under `_source/`, `stories/`, `characters/`, `diegetic-artifacts/`, `_index/`, or the forbidden tool prefixes).

## What to Change

### 1. Remove the `included_template_path` request-body field (`src/server/routes/prompts.ts`)

Drop `included_template_path?: string | null` from `ComposeBody` (line 48) and its handling in `buildComposeInput` (the `pathProvided` branch, lines 110-123, plus the mutual-exclusivity error). `selected_template` becomes the sole public template field. The internal `built.included_template_path = resolved` assignment (line 130) stays — it carries the route-resolved path into the compose pipeline.

### 2. Validate and contain `selected_template` (`src/server/routes/prompts.ts`)

Pattern-validate the id with `^mtemplate-\d+$` (or reuse `classifyManualRecordId`) in `buildComposeInput` before resolution; reject a non-matching id with a structured 400 (`badRequest`). After `resolveBeatTemplatePath`, run `assertInsideSandbox(resolved, root)` (or the helper from §3) before the `existsSync` check so a traversal id is rejected even if a matching `.yaml` exists outside the root.

### 3. Contain the compose-time read (`src/prompt/compose.ts`, `src/write/sandbox.ts`)

In `composePrompt` stage 5 (lines 177-223), `assertInsideSandbox` the resolved template path before `readFileSync`, regardless of which field populated `input.included_template_path`. If a clean read-side entry point is wanted, export `assertReadableInsideSandbox(targetPath, root)` from `src/write/sandbox.ts` (a thin wrapper over the existing `assertInsideSandbox`) so compose reconstructs a `ManualStoryRoot` from `input.manualStoryRoot` + `input.repoRoot` and reuses the same realpath check; no behavior change to existing write containment.

### 4. Remove the dead web request-input field (`web/src/types/manual-story.ts`)

Delete `included_template_path?: string | null` from `PromptComposeRequestInput` (line 324) and its comments (325-327). Keep `PromptRunSidecarDraft.included_template_path` (line 299) — the persisted sidecar still stores the resolved path, and the GET `/prompts/:promptId` response surfaces it.

### 5. Migrate the back-compat route tests (`test/server/prompts-routes.test.ts`)

Rewrite the two `included_template_path` body-field tests (line 444 "accepts legacy included_template_path"; line 469 "rejects both selected_template AND included_template_path") to the new contract: a request still sending `included_template_path` is now rejected (field unknown / no template applied), and the mutual-exclusivity test is removed or replaced by the `selected_template` invalid-id rejection.

## Files to Touch

- `tools/manual-story-studio/src/server/routes/prompts.ts` (modify)
- `tools/manual-story-studio/src/prompt/compose.ts` (modify)
- `tools/manual-story-studio/src/write/sandbox.ts` (modify)
- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify)
- `tools/manual-story-studio/test/server/prompts-routes.test.ts` (modify)
- `tools/manual-story-studio/test/server/prompt-template-path-containment.test.ts` (new)

## Out of Scope

- Any change to the write-scope guard or to `assertInsideSandbox`'s existing write-side behavior (correct; this ticket reuses them on a read surface).
- The 5-value `prompt_mode` redesign and the inclusion ledger (SPEC-113).
- Frontend template-picker UX (SPEC-112 / SPEC-113); the frontend already composes via `selected_template`.
- Dependency-scoped health gating and compose-doc presence checks (SPEC116MANSTOSTU-002).

## Acceptance Criteria

### Tests That Must Pass

1. A compose request sending `included_template_path` (now unknown) or `selected_template: "/etc/passwd"` is rejected with a structured 4xx and reads no file outside the manual-story root — `test/server/prompt-template-path-containment.test.ts` fails if any read occurs outside the root.
2. A compose request whose `selected_template` is a `..`-traversal value (e.g. `../../../_source/canon/CF-1`) is rejected identically and reads no file.
3. A valid `selected_template` logical id (e.g. `mtemplate-1`) still composes successfully.
4. `cd tools/manual-story-studio && npm test` is green end to end (backend `node --test` + `npm --prefix web test` `tsc --noEmit`); `web/src/types/manual-story.ts` no longer declares `included_template_path` on `PromptComposeRequestInput`.

### Invariants

1. No request-body value may cause a read outside the manual-story sandbox (plus the package's denylisted forbidden destinations). `selected_template` is the sole public template API.
2. The internal `PromptComposeInput.included_template_path` and the persisted-sidecar field remain intact — only the request-body and web request-input surfaces are removed.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/prompt-template-path-containment.test.ts` (new) — asserts absolute-path and `..`-traversal `selected_template` are rejected and never read; asserts a valid `mtemplate-N` id resolves and composes.
2. `tools/manual-story-studio/test/server/prompts-routes.test.ts` (modify) — migrate the two `included_template_path` body-field tests to the `selected_template`-only contract.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend` (backend `node --test` over the new + migrated suites)
2. `cd tools/manual-story-studio && npm test` (full: backend + `npm --prefix web test` `tsc --noEmit`)
3. `cd tools/manual-story-studio && npm run build` (chains web build + `tsc -p tsconfig.json`)
