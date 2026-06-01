# SPEC105MANSTOSTU-007: Migrate `readManuscript` + callers (throw→typed-error behavior change in `manuscript/compile.ts`)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/manual-story-studio/src/read/manuscript.ts` (`readManuscript` signature change to `ReadResult<ManuscriptReadResult>`) plus 3 caller files (`src/manuscript/compile.ts` — replaces raw `readFileSync`+`YAML.parse` with typed reads, intentional throw→typed-error behavior change; `src/server/routes/manuscript.ts` — route adaptation; `src/write/segments.ts` — auto-compile call-site propagation) and adds a SPEC-105 implementation note. No impact on canon-pipeline surfaces.
**Deps**: archive/tickets/SPEC105MANSTOSTU-002.md, archive/tickets/SPEC105MANSTOSTU-003.md, archive/tickets/SPEC105MANSTOSTU-006.md

## Problem

At intake, `readManuscript` at `tools/manual-story-studio/src/read/manuscript.ts` returned `ManuscriptReadResult | null` on missing file / readFileSync exception, collapsing "absent before first compile" (valid) and "I/O failure" (invalid) into one return value. `tools/manual-story-studio/src/manuscript/compile.ts` also did raw `readFileSync` + `YAML.parse` without try/catch, so corrupt metadata or a malformed segment sidecar threw an uncaught exception that the manuscript-compile route surfaced as an unhandled error. Per SPEC-105 §3 Key decisions, this ticket converts that throw → typed-error path; the manuscript-compile route now emits 409 with the `HealthReport` body when corruption is found, matching the rest of the package's fail-fast contract.

## Assumption Reassessment (2026-06-01)

1. Caller sites verified during reassessment via `grep -rn "readManuscript" tools/manual-story-studio/src/`:
   - `src/server/routes/manuscript.ts` — `const result = readManuscript({ manualStoryRoot: root.absolutePath });`.
   The `read/manuscript.ts` module itself defines `readManuscript`; no other callers.
   At intake, `src/manuscript/compile.ts` did NOT call `readManuscript` — it did its own raw `readFileSync` + `YAML.parse` for metadata and segment sidecars. This ticket's compile.ts edits are the throw→typed-error conversion at those raw read sites, not consumer adaptation of readManuscript.
2. SPEC-105 §4 Modify lists `read/manuscript.ts → ReadResult<ManuscriptReadResult>` (note: backend type `ManuscriptReadResult`, not the frontend `ManuscriptResponse` at `web/src/api/manuscript.ts`). SPEC-105 §3 Key decisions explicitly calls out the manuscript/compile.ts behavior change as intentional: *"`compileManuscript` previously threw on corrupt metadata/segment YAML; under SPEC-105 it returns a `ReadResult` error so the route can emit 409 with the HealthReport body."*
3. Cross-skill boundary: this is a package-internal migration. No cross-package import added.
4. Rule 6 retcon attribution: the migration changes two behaviors:
   (a) `readManuscript`'s public signature `T | null` → `ReadResult<T>` (the "absent before first compile" case becomes `ok: true` with a flag on `ManuscriptReadResult`, distinguishing it from the "read failed" case which becomes `ok: false`).
   (b) `compileManuscript`'s implicit throw-on-corrupt-YAML becomes an explicit `ReadResult` return. The route layer adapts: corrupt metadata or a malformed segment sidecar now produces a deterministic 409 + HealthReport rather than an unhandled 500. This is a deliberate change called out in SPEC-105 §3 Key decisions; it makes the failure visible-specific-repairable.
5. Blast-radius: the direct caller of `readManuscript` is `server/routes/manuscript.ts`; direct callers of `compileManuscript` are `server/routes/manuscript.ts`, `write/segments.ts`, and tests. The source/test grep at closeout confirms those call sites now narrow `ReadResult`.
6. Live same-package caller sweep found `src/write/segments.ts` injects and invokes `compileManuscript` for auto-compile-on-save/delete. This ticket absorbed the narrow propagation by throwing the existing `SegmentReadFailureError` on `!ok`, which the segment routes already map through `mapReadErrorToHttpReply`.

## Architecture Check

1. Consolidating the readManuscript signature change with the compile.ts behavior change in one ticket is the smallest reviewable unit: both touch the manuscript subsystem and the spec calls them out as one coherent change. Splitting would leave a half-migrated subsystem.
2. `compileManuscript` is the only manuscript-write surface; converting it to return `ReadResult` is structurally consistent with the read-layer migration philosophy. The function continues to write `manuscript.md` via `safeWriteFile`; only the read-side error handling changes.
3. The "absent before first compile" semantic distinction matters: a manuscript that has never been compiled is NOT a failure — it's a valid empty state. The migrated `readManuscript` returns `ok: true` with a flag (`manuscript_present: false`) for this case, distinct from `ok: false` for I/O failures. The route converts that valid empty state to the explicit "not compiled yet" 404 response while preserving typed errors for real read failures.
4. No backwards-compatibility aliasing/shims.

## Verification Layers

1. Type signature change → codebase grep-proof: `grep -nE "ReadResult<ManuscriptReadResult>|ReadResult<CompileManuscriptResult>" tools/manual-story-studio/src/read/manuscript.ts tools/manual-story-studio/src/manuscript/compile.ts` returns the migrated signatures.
2. `compileManuscript` no longer throws on corrupt metadata/segment YAML → unit test asserting `compileManuscript` with a fixture containing corrupt `manual-story.yaml` returns `ok: false` with `code: "yaml_parse_failed"`, not an uncaught exception.
3. Route 200 vs 404 vs 409 dispatch is correct → unit tests at `test/server/manuscript-routes.test.ts` assert 200 for valid manuscript, 404 only for genuinely-absent (the `manuscript_present: false` case where `result.ok` is true), and 409 for compile-time corruption.

## Landed Changes

### 1. `tools/manual-story-studio/src/read/manuscript.ts`

Changed the signature and introduced the "absent vs failed" distinction:

```ts
export interface ManuscriptReadResult {
  manuscript_path: string;
  manuscript_present: boolean;     // false when manuscript.md is absent (valid before first compile)
  body: string;                    // empty string when not present
  byte_count: number;
  word_count: number;
}

export function readManuscript(
  options: ReadManuscriptOptions,
): ReadResult<ManuscriptReadResult> {
  const manuscript_path = path.join(options.manualStoryRoot, "manuscript.md");
  if (!existsSync(manuscript_path)) {
    return ok({
      manuscript_path,
      manuscript_present: false,
      body: "",
      byte_count: 0,
      word_count: 0,
    });
  }

  try {
    const body = readFileSync(manuscript_path, "utf8");
    return ok({
      manuscript_path,
      manuscript_present: true,
      body,
      byte_count: statSync(manuscript_path).size,
      word_count: countWords(body),
    });
  } catch (cause) {
    return err({
      code: "io_error",
      path: manuscript_path,
      cause,
      repair_hint: "Check file permissions on manuscript.md.",
    });
  }
}
```

### 2. `tools/manual-story-studio/src/manuscript/compile.ts`

Replaced the raw `readFileSync` + `YAML.parse` path with typed reads. `compileManuscript` now returns `ReadResult<CompileManuscriptResult>` and uses the migrated metadata and segment readers.

`compileManuscript` uses `readSegmentBody` + `readSegmentSidecar` from `src/read/segments.ts`, so archive/tickets/SPEC105MANSTOSTU-006.md is now a real landed dependency for this ticket.

### 3. `tools/manual-story-studio/src/server/routes/manuscript.ts`

- `readManuscript(...)` returns `ReadResult`; on `!result.ok`, the route dispatches through `mapReadErrorToHttpReply`. When `result.ok && result.value.manuscript_present === false`, the route returns 404 with `{ error: "manuscript_not_compiled_yet" }`.
- The manuscript-compile POST handler now narrows `compileManuscript(...)` and dispatches `!result.ok` through `mapReadErrorToHttpReply`.

### 4. `tools/manual-story-studio/src/write/segments.ts`

- Adapted the auto-compile helper to inspect `compileManuscript(...)`. If compilation returns `ok: false`, it throws `SegmentReadFailureError` with the read error so the existing segment route write-error path emits the same typed HTTP response as the manuscript route.

## Files to Touch

- `tools/manual-story-studio/src/read/manuscript.ts` (modify)
- `tools/manual-story-studio/src/manuscript/compile.ts` (modify — both the readManuscript-style migration of the internal metadata read AND the iteration loop that now uses 006's typed segment reads)
- `tools/manual-story-studio/src/server/routes/manuscript.ts` (modify)
- `tools/manual-story-studio/src/write/segments.ts` (modify — propagate auto-compile `ReadResult` failures instead of ignoring them)
- `tools/manual-story-studio/test/manuscript/compile.test.ts` (modify)
- `tools/manual-story-studio/test/server/manuscript-routes.test.ts` (modify)
- `tools/manual-story-studio/test/write/segments.test.ts` (modify)
- `specs/SPEC-105-manual-story-studio-fail-fast-state-integrity.md` (modify — dated implementation note for this slice)

## Out of Scope

- Migrating any other read function — archive/tickets/SPEC105MANSTOSTU-004.md (metadata at the prompt-compose level), 005 (records), 006 (segments), 008 (enumerators).
- Changing the `auto-compile-on-segment-save` policy decision itself — this ticket only adapts the existing auto-compile call-site to propagate `ReadResult` failures.
- Frontend rendering — SPEC105MANSTOSTU-011 / SPEC105MANSTOSTU-012.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend` compiles cleanly.
2. `cd tools/manual-story-studio && npm test` runs and existing manuscript-route + compile tests pass (adapted to `!result.ok` narrowing).
3. `grep -nE "ReadResult<ManuscriptReadResult>|ReadResult<CompileManuscriptResult>" tools/manual-story-studio/src/read/manuscript.ts tools/manual-story-studio/src/manuscript/compile.ts` returns the migrated signatures.
4. `! grep -nE "YAML\\.parse" tools/manual-story-studio/src/manuscript/compile.ts` passes — every raw YAML.parse from the old code path is gone from `compile.ts`.

### Invariants

1. `readManuscript` returns `ReadResult<ManuscriptReadResult>` — the "absent before first compile" case is `ok: true` with `manuscript_present: false`, distinct from `ok: false` for I/O failures.
2. `compileManuscript` returns `ReadResult<CompileManuscriptResult>` — corrupt metadata or segment sidecar produces `ok: false` with a typed error code, not an uncaught throw.
3. Route 404 is returned only when the manuscript is genuinely absent (`manuscript_present: false`); corrupt metadata produces 409 per the §2 item 4 dispatch table.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/manuscript/compile.test.ts` (modify) — added a corrupt `manual-story.yaml` assertion that `compileManuscript(...).ok === false` with `code: "yaml_parse_failed"`, not a thrown exception.
2. `tools/manual-story-studio/test/server/manuscript-routes.test.ts` (modify) — updated the missing-manuscript 404 body and added a 409 HealthReport assertion for corrupt-metadata compile attempt.
3. `tools/manual-story-studio/test/write/segments.test.ts` (modify) — updated compile stubs to the `ReadResult<CompileManuscriptResult>` shape.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend` — compile check.
2. `cd tools/manual-story-studio && npm test` — full package test.

## Outcome

Completed on 2026-06-01.

This ticket migrated `readManuscript` to `ReadResult<ManuscriptReadResult>` with an explicit `manuscript_present` flag, migrated `compileManuscript` to `ReadResult<CompileManuscriptResult>`, and routed corrupt metadata / segment read failures through the shared read-error HTTP adapter. The manuscript read route now distinguishes "not compiled yet" from read failure, and the auto-compile path in segment writes no longer ignores compile read failures.

The implementation absorbed one same-package caller found during reassessment: `tools/manual-story-studio/src/write/segments.ts`. SPEC-105 also received a dated implementation note marking its `manuscript/compile.ts` raw-read wording as historical intake context after this ticket.

## Verification Result

Commands run:

1. `cd tools/manual-story-studio && npm run build:backend` — passed.
2. `cd tools/manual-story-studio && node --test dist/test/manuscript/compile.test.js dist/test/server/manuscript-routes.test.js dist/test/write/segments.test.js` — passed; 20 focused tests.
3. `cd tools/manual-story-studio && npm test` — passed; backend reported 365 tests passing and web `tsc --noEmit` passed.
4. `grep -nE "ReadResult<ManuscriptReadResult>|ReadResult<CompileManuscriptResult>" tools/manual-story-studio/src/read/manuscript.ts tools/manual-story-studio/src/manuscript/compile.ts` — passed; returned the two migrated signatures.
5. `! grep -nE "YAML\\.parse" tools/manual-story-studio/src/manuscript/compile.ts` — passed; no raw YAML parse remains in `compile.ts`.
6. `git diff --check` — passed.

## Deviations

- The drafted signature grep used `readManuscript.*ReadResult|compileManuscript.*ReadResult`, but the live codebase formats those signatures across multiple lines. Closeout uses the equivalent `ReadResult<...>` signature grep instead.
- `write/segments.ts` was added to the touched file set after live caller reassessment found auto-compile uses `compileManuscript`.
- SPEC-105 is a large proposal spec, so same-seam truthing landed as a dated implementation note rather than a row-by-row rewrite of all historical raw-read references.
