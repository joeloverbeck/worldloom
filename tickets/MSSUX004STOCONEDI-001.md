# MSSUX004STOCONEDI-001: Widen `updateMetadata` error shape

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio/web/src/api/records.ts` frontend API wrapper (widens `MetadataUpdateResult` return type and `updateMetadata` body)
**Deps**: None

## Problem

The Manual Story Studio frontend API wrapper `updateMetadata` at
`tools/manual-story-studio/web/src/api/records.ts:194-214` returns
`MetadataUpdateResult = { ok: true } | { ok: false; error: "validation_failed"; errors: ValidationError[] }`
(per the `MetadataUpdateResult` type at `records.ts:46-48`). The backend
route at `tools/manual-story-studio/src/server/routes/metadata.ts:40-79`
can return three distinct error responses — `404 not_found`,
`400 bad_request` (with `message`), `400 validation_failed` (with
`errors[]`) — but the existing wrapper coerces all non-200 responses
into `validation_failed` (records.ts:209-213), losing the `not_found`
and `bad_request` distinctions at the seam.

Per `specs/MSSUX-004-story-contract-editing.md` §Design "API client",
widen the wrapper to return the richer shape so the upcoming EditContract
page (MSSUX004STOCONEDI-002) can surface the actual backend error to
the author. The wrapper has zero existing callers, so the widening is
fully additive at the consumer level.

## Assumption Reassessment (2026-05-31)

1. Codebase: verified `tools/manual-story-studio/web/src/api/records.ts:46-48`
   defines the existing thin `MetadataUpdateResult` type. The
   `updateMetadata` implementation at `records.ts:194-214` coerces all
   non-200 responses into `validation_failed` (lines 209-213). Backend
   route at `tools/manual-story-studio/src/server/routes/metadata.ts:40-79`
   returns `404 not_found` (line 40, line 67), `400 bad_request` with
   `message` (lines 71-73), and `400 validation_failed` with `errors[]`
   (lines 77-79).
2. Doc/spec: per `specs/MSSUX-004-story-contract-editing.md` §Design
   "API client (already landed; small widening required)" + §Files to
   touch records.ts row. The original wrapper landed via SPEC-101 commit
   `133dcf32` (SPEC101MANSTOMET-008..012); the widening retcons the
   thin shape that landed there with Rule 6 attribution.
3. Cross-artifact boundary: frontend `MetadataUpdateResult` ↔ backend
   HTTP error-shape contract at `routes/metadata.ts:40-79`. The widening
   preserves the backend's three distinct error shapes through the
   wrapper without information loss; the seam is preserved as a
   single-source-of-truth on the backend route.
4. FOUNDATIONS: per `specs/MSSUX-004-story-contract-editing.md`
   §FOUNDATIONS Alignment, `tools/manual-story-studio/` is canon-fenced
   per SPEC-100 §3 — its `package.json` excludes
   `@worldloom/patch-engine` and `@worldloom/world-mcp`, and its
   realpath-based write sandbox is bounded to
   `worlds/<slug>/manual-stories/`. Downstream-consumer +
   write-enabled-but-canon-fenced carve-outs apply per SPEC-104
   precedent. This ticket introduces no new canon-mediation surface.

## Architecture Check

1. Widening a wrapper's return type with new fields is additive when
   zero consumers exist — verified at Step 2 that `MetadataUpdateResult`
   is consumed only inside `records.ts` line 198, and `updateMetadata`
   has zero external callers. The widening preserves the backend's
   distinct error shapes through the wrapper without information loss
   or a duplicate "thin" variant.
2. No backwards-compatibility aliasing/shims introduced. The prior
   `error: "validation_failed"` literal-type narrowing is dropped in
   favor of a general `error: string` plus optional `message` /
   `errors` — consumers handle the union form directly.

## Verification Layers

1. Wrapper preserves backend's three error shapes → codebase grep-proof
   (verify `updateMetadata` body branches on `response.status` and
   returns `{ status, error, message?, errors? }` for non-200 cases;
   verify `MetadataUpdateResult`'s non-ok union member includes
   `status: number`, `error: string`, `message?: string`,
   `errors?: ValidationError[]`).
2. tsc passes after the type widening → schema validation via
   `cd tools/manual-story-studio/web && npm test` (TypeScript
   `--noEmit` check per web/package.json:9).

## What to Change

### 1. Widen `MetadataUpdateResult` type

Replace the type definition at `tools/manual-story-studio/web/src/api/records.ts:46-48`:

```ts
export type MetadataUpdateResult =
  | { ok: true }
  | {
      ok: false;
      status: number;
      error: string;
      message?: string;
      errors?: ValidationError[];
    };
```

### 2. Rewrite `updateMetadata` body

Replace the function body at `records.ts:194-214` so non-200 responses
preserve all three backend shapes:

```ts
export async function updateMetadata(
  worldSlug: string,
  msSlug: string,
  metadata: ManualStoryMetadata,
): Promise<MetadataUpdateResult> {
  const response = await fetch(metadataBase(worldSlug, msSlug), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata }),
  });
  if (response.status === 200) return { ok: true };
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
    errors?: ValidationError[];
  };
  return {
    ok: false,
    status: response.status,
    error: body.error ?? "error",
    message: body.message,
    errors: body.errors,
  };
}
```

Notes:
- `metadataBase` helper at `records.ts:56-58` is preserved.
- `message` and `errors` remain optional on the wire — `validation_failed`
  populates `errors[]` but not `message`; `bad_request` and `not_found`
  populate `message` but not `errors[]`.

## Files to Touch

- `tools/manual-story-studio/web/src/api/records.ts` (modify)

## Out of Scope

- New `web/src/api/metadata.ts` module — explicitly rejected in spec
  §Design "API client" (would force 3 importer-site updates across
  `Dashboard.tsx`, `MomentComposer.tsx`, `Manuscript.tsx` for zero
  functional gain; the wrapper stays in `records.ts`).
- Any UI consumer of the widened shape — that work lives in
  MSSUX004STOCONEDI-002.
- Backend route changes — the backend's three error shapes are already
  in place at `routes/metadata.ts:40-79` and are unchanged by this
  ticket.
- Concurrent-edit protection (`If-Match` / `updated_at`) — spec §Risks
  acknowledges last-write-wins; out of scope.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm test` — tsc --noEmit
   passes after the type widening.
2. `cd tools/manual-story-studio && npm run test:backend` — backend
   regression guard; no behavior change expected since the backend
   route is unchanged.
3. `grep -n "status: number" tools/manual-story-studio/web/src/api/records.ts`
   returns a match inside the `MetadataUpdateResult` type body
   (verifies the new `status` field landed).

### Invariants

1. `MetadataUpdateResult`'s `{ ok: true }` shape is preserved bit-for-bit;
   consumers branching on `ok` continue to work without lexical changes.
2. Non-200 responses carry `status: number` and `error: string`, plus
   optional `message?: string` and `errors?: ValidationError[]` —
   the backend's three error shapes (404 / bad_request /
   validation_failed) round-trip through the wrapper without
   information loss.
3. No backwards-compatibility shim: the prior
   `error: "validation_failed"` literal-type narrowing is dropped
   outright; consumers handle the general `error: string` form.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based
   (tsc --noEmit) and existing pipeline coverage is named in
   Assumption Reassessment. The web bundle's test suite is tsc-only
   per `tools/manual-story-studio/web/package.json:9`.

### Commands

1. `cd tools/manual-story-studio/web && npm test`
2. `cd tools/manual-story-studio && npm run test:backend`
3. The tsc check is the correct verification boundary — the wrapper
   has no runtime tests today, and the widening is a pure type-shape
   plus parse-body-once refactor whose correctness is structurally
   captured by the TypeScript discriminated-union check.
