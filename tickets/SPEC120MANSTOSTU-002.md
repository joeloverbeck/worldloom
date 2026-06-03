# SPEC120MANSTOSTU-002: Rename `includeArchived` → `includeInactive` end-to-end

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` web API clients, Fastify routes, read layer, health/prompt callers, and the HTTP query-param wire string. No canon record schema change.
**Deps**: None

## Problem

The internal `includeArchived` request param reinforces the wrong append-only / retirement mental model. Rename it to `includeInactive` end-to-end so the vocabulary is coherent with the user-facing "inactive" model. The rename is mechanical TypeScript everywhere except the HTTP query-param string, which is a client↔server contract that must change in lockstep — a half-rename breaks include-inactive filtering silently.

## Assumption Reassessment (2026-06-02)

1. Codebase: `includeArchived` spans **two parallel API surfaces** — records (`web/src/api/records.ts:72,76,94` → `src/server/routes/records.ts:78,97,98` → `src/read/records.ts:19,23,45,92,133`) and beat-templates (`web/src/api/beat-templates.ts:57,60` → `src/server/routes/beat-templates.ts:136,146,148,360`) — plus callers `src/health/compute.ts:88,163,194`, `src/prompt/compose.ts:513`, `web/src/components/CurrentStatePanel.tsx:62`, `web/src/components/RecordPicker.tsx:102`, `web/src/pages/CastAndProfiles.tsx:50`, `web/src/pages/Records.tsx` (state `includeArchived`/`setIncludeArchived` + call sites), `web/src/pages/BeatTemplates.tsx` (same), and `test/read/records.test.ts:119,129`. The URL query-param string `"includeArchived"` is set client-side (`url.searchParams.set("includeArchived", "true")`) and read server-side (`request.query.includeArchived === "true"`).
2. Specs/docs: SPEC-120 §2 in-scope item 2, §4 item-2 enumeration, Acceptance Criteria #2, and §8 Risks (wire-param lockstep; two-API-surface scope).
3. Cross-artifact boundary: the client↔server HTTP wire contract. The query-param string must rename on BOTH the web client (`searchParams.set`) and every Fastify route (`request.query`) in the same change, or the server reads a param the client no longer sends → defaults to `false` → inactive records stay hidden with no compile error.
4. FOUNDATIONS Rule 6 (No Silent Retcons): this renames param behavior that landed before SPEC-120; the change is attributed to SPEC-120 §2 item 2 (vocabulary coherence), not silently applied. No canon retcon — `tools/manual-story-studio` is the SPEC-100 canon-fenced package (its `package.json` excludes patch-engine/world-mcp and its write sandbox cannot reach `_source/`), so renaming a sidecar param touches no canon record.
5. (was template item 7 — rename blast radius): pipeline-wide grep confirms `includeArchived` is contained to `tools/manual-story-studio` — 0 hits across other `tools/`, `.claude/skills/`, `docs/`, `specs/`. Blast radius is the ~13 intra-package sites enumerated in item 1; no external consumer.

## Architecture Check

1. A single coherent rename keeps the vocabulary consistent end-to-end (SPEC-120 §3 goal). Keeping it one ticket — rather than splitting client and server — is deliberate: the wire-param string is a contract whose two halves must land together, so a split would risk the exact silent-filtering-break the spec's §8 Risks names.
2. No backwards-compatibility aliasing/shims — `includeArchived` is removed, not dual-supported; the wire-param string renames in lockstep rather than accepting both the old and new names.

## Verification Layers

1. Zero `includeArchived` occurrences remain -> codebase grep-proof (`grep -rn "includeArchived" tools/manual-story-studio --include=*.ts --include=*.tsx` returns 0 outside `dist/`).
2. Include-inactive filtering still works end-to-end -> backend test (`test/read/records.test.ts`) + manual review (toggle "include inactive"; inactive records still surface in both records and beat-templates lists).
3. Both API surfaces (records + beat-templates) renamed, not just one -> codebase grep-proof across `api/records.ts` + `api/beat-templates.ts` + both route files.
4. Wire-param client↔server lockstep -> manual review that `url.searchParams.set("includeInactive", ...)` is paired with `request.query.includeInactive` on every route.

## What to Change

### 1. records surface

Rename the option/param/searchParam across `web/src/api/records.ts`, `src/server/routes/records.ts`, and `src/read/records.ts` (the `ListRecordsOptions.includeArchived` field, the route querystring type + read, and the read-layer filter at `src/read/records.ts:45`).

### 2. beat-templates surface

Rename across `web/src/api/beat-templates.ts` and `src/server/routes/beat-templates.ts` (the client option + the route querystring type/read/filter at `:146,148`).

### 3. callers

Rename the option key at every call site: `src/health/compute.ts`, `src/prompt/compose.ts`, `web/src/components/CurrentStatePanel.tsx`, `web/src/components/RecordPicker.tsx`, `web/src/pages/CastAndProfiles.tsx`, `web/src/pages/Records.tsx` (state variable `includeArchived`/`setIncludeArchived` + dependency arrays + call sites), `web/src/pages/BeatTemplates.tsx` (same).

### 4. HTTP wire-param string (lockstep)

`"includeArchived"` -> `"includeInactive"` in the client `url.searchParams.set(...)` calls AND the server `request.query.includeArchived` reads — both halves in this single change.

### 5. test

`test/read/records.test.ts:119,129` — rename the `includeArchived` option references; the assertion semantics (default omits inactive; option returns all) are unchanged.

## Files to Touch

- `tools/manual-story-studio/web/src/api/records.ts` (modify)
- `tools/manual-story-studio/web/src/api/beat-templates.ts` (modify)
- `tools/manual-story-studio/src/server/routes/records.ts` (modify)
- `tools/manual-story-studio/src/server/routes/beat-templates.ts` (modify)
- `tools/manual-story-studio/src/read/records.ts` (modify)
- `tools/manual-story-studio/src/health/compute.ts` (modify)
- `tools/manual-story-studio/src/prompt/compose.ts` (modify)
- `tools/manual-story-studio/web/src/components/CurrentStatePanel.tsx` (modify)
- `tools/manual-story-studio/web/src/components/RecordPicker.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/CastAndProfiles.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/Records.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/BeatTemplates.tsx` (modify)
- `tools/manual-story-studio/test/read/records.test.ts` (modify)

## Out of Scope

- User-facing display strings (ticket SPEC120MANSTOSTU-001).
- `retired_reason` removal (ticket SPEC120MANSTOSTU-003).
- The `active` boolean field and filtering semantics — only the param NAME changes; the include/exclude behavior is byte-identical.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "includeArchived" tools/manual-story-studio --include=*.ts --include=*.tsx` returns 0 hits outside `dist/`.
2. `cd tools/manual-story-studio && npm test` (build:backend + `node --test` + web typecheck) passes — existing include-inactive filtering still works end-to-end.

### Invariants

1. Filtering behavior is identical to before the rename — only the identifier and the wire-param string change.
2. Client and server use the SAME wire-param string (`includeInactive`) — no half-rename leaves the contract split.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/read/records.test.ts` — update the `includeArchived` -> `includeInactive` option references (lines 119,129); assertion semantics unchanged (default omits inactive; option returns all).

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio && npm run test:backend` (faster backend-only loop while iterating on the route/read rename)
3. `grep -rn "includeArchived" tools/manual-story-studio --include=*.ts --include=*.tsx` (expect 0 outside `dist/`)
