# SPEC105MANSTOSTU-007: Migrate `readManuscript` + callers (throw→typed-error behavior change in `manuscript/compile.ts`)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/manual-story-studio/src/read/manuscript.ts` (`readManuscript` signature change to `ReadResult<ManuscriptReadResult>`) plus 2 caller files (`src/manuscript/compile.ts` — replaces raw `readFileSync`+`YAML.parse` with typed reads, intentional throw→typed-error behavior change; `src/server/routes/manuscript.ts` — route adaptation). No impact on canon-pipeline surfaces.
**Deps**: archive/tickets/SPEC105MANSTOSTU-002.md, SPEC105MANSTOSTU-003

## Problem

`readManuscript` at `tools/manual-story-studio/src/read/manuscript.ts:15-32` returns `ManuscriptReadResult | null` on missing file / readFileSync exception — collapsing "absent before first compile" (valid) and "I/O failure" (invalid) into one return value. Worse, `tools/manual-story-studio/src/manuscript/compile.ts` does raw `readFileSync` + `YAML.parse` WITHOUT try/catch at lines 41–44, 52–54, 66–68 — corrupt metadata or a malformed segment sidecar throws an uncaught exception that the manuscript-compile route surfaces as an unhandled 500. Per SPEC-105 §3 Key decisions, this ticket explicitly converts the throw → typed-error path; the manuscript-compile route can then emit 409 with the `HealthReport` body when corruption is found, matching the rest of the package's fail-fast contract.

## Assumption Reassessment (2026-06-01)

1. Caller sites verified at HEAD via `grep -rn "readManuscript" tools/manual-story-studio/src/`:
   - `src/server/routes/manuscript.ts:50` — `const result = readManuscript({ manualStoryRoot: root.absolutePath });`.
   The `read/manuscript.ts` module itself defines `readManuscript`; no other callers.
   `src/manuscript/compile.ts` does NOT call `readManuscript` — it does its own raw `readFileSync` + `YAML.parse` for metadata and segment sidecars. This ticket's compile.ts edits are the throw→typed-error conversion at those raw read sites, not consumer adaptation of readManuscript.
2. SPEC-105 §4 Modify list `read/manuscript.ts → ReadResult<ManuscriptReadResult>` (note: backend type `ManuscriptReadResult` at `src/read/manuscript.ts:8-13`, not the frontend `ManuscriptResponse` at `web/src/api/manuscript.ts:16` — the reassessment edited the spec to distinguish them). SPEC-105 §3 Key decisions explicitly calls out the manuscript/compile.ts behavior change as intentional: *"`compileManuscript` previously threw on corrupt metadata/segment YAML; under SPEC-105 it returns a `ReadResult` error so the route can emit 409 with the HealthReport body."*
3. Cross-skill boundary: this is a package-internal migration. No cross-package import added.
4. Rule 6 retcon attribution: the migration changes two behaviors:
   (a) `readManuscript`'s public signature `T | null` → `ReadResult<T>` (the "absent before first compile" case becomes `ok: true` with a flag on `ManuscriptReadResult`, distinguishing it from the "read failed" case which becomes `ok: false`).
   (b) `compileManuscript`'s implicit throw-on-corrupt-YAML becomes an explicit `ReadResult` return. The route layer adapts: corrupt metadata or a malformed segment sidecar now produces a deterministic 409 + HealthReport rather than an unhandled 500. This is a deliberate change called out in SPEC-105 §3 Key decisions; it makes the failure visible-specific-repairable.
5. Blast-radius: 2 caller files (routes/manuscript.ts directly consumes readManuscript; routes/manuscript.ts also consumes compileManuscript via the manuscript-compile POST endpoint). The grep at acceptance time confirms no orphan callers.

## Architecture Check

1. Consolidating the readManuscript signature change with the compile.ts behavior change in one ticket is the smallest reviewable unit: both touch the manuscript subsystem and the spec calls them out as one coherent change. Splitting would leave a half-migrated subsystem.
2. `compileManuscript` is the only manuscript-write surface; converting it to return `ReadResult` is structurally consistent with the read-layer migration philosophy. The function continues to write `manuscript.md` via `safeWriteFile`; only the read-side error handling changes.
3. The "absent before first compile" semantic distinction matters: a manuscript that has never been compiled is NOT a failure — it's a valid empty state. The migrated `readManuscript` returns `ok: true` with a flag (`manuscript_present: false`) for this case, distinct from `ok: false` for I/O failures. This is a small explicit signal that callers (frontend Dashboard's manuscript word-count panel) consume to render "No manuscript yet" instead of an error banner.
4. No backwards-compatibility aliasing/shims.

## Verification Layers

1. Type signature change → codebase grep-proof: `grep -nE "readManuscript.*ReadResult" tools/manual-story-studio/src/read/manuscript.ts` returns the new signature.
2. `compileManuscript` no longer throws on corrupt metadata/segment YAML → unit test asserting `compileManuscript` with a fixture containing corrupt `manual-story.yaml` returns `ok: false` with `code: "yaml_parse_failed"`, not an uncaught exception.
3. Route 200 vs 404 vs 409 dispatch is correct → unit tests at routes/manuscript.ts assert 200 for valid manuscript, 404 only for genuinely-absent (the `manuscript_present: false` case where `result.ok` is true), 409 for compile-time corruption.

## What to Change

### 1. `tools/manual-story-studio/src/read/manuscript.ts`

Change signature; introduce the "absent vs failed" distinction:

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

Replace the raw `readFileSync` + `YAML.parse` at lines 41–44 + 52–54 + 66–68 with typed reads. Change `compileManuscript` to return `ReadResult<CompileManuscriptResult>`:

```ts
export function compileManuscript(
  options: CompileManuscriptOptions,
): ReadResult<CompileManuscriptResult> {
  const metadataResult = readMetadata(options.manualStoryRoot.absolutePath);
  if (!metadataResult.ok) return metadataResult;
  const metadata = metadataResult.value;
  // ...iterate segment_order; for each, call readSegmentBody + readSegmentSidecar via the migrated 006 reads
  // (cross-ticket consumer: this is the only consumer in 007's scope that depends on 006's segments migration)
  const fragments: string[] = [];
  for (const segmentId of metadata.segment_order) {
    const bodyResult = readSegmentBody({ manualStoryRoot: options.manualStoryRoot.absolutePath, segmentId });
    if (!bodyResult.ok) return bodyResult;
    // ...render with optional sidecar title via readSegmentSidecar
  }
  // ...write manuscript.md via safeWriteFile
  return ok({ manuscript_path, segments_compiled, byte_count });
}

function readMetadata(manualStoryRoot: string): ReadResult<ManualStoryMetadata> {
  const metadataPath = path.join(manualStoryRoot, "manual-story.yaml");
  if (!existsSync(metadataPath)) {
    return err({ code: "file_not_found", path: metadataPath, repair_hint: "Create manual-story.yaml." });
  }
  let text: string;
  try {
    text = readFileSync(metadataPath, "utf8");
  } catch (cause) {
    return err({ code: "io_error", path: metadataPath, cause, repair_hint: "Check file permissions." });
  }
  let parsed: unknown;
  try {
    parsed = YAML.parse(text);
  } catch (cause) {
    return err({ code: "yaml_parse_failed", path: metadataPath, cause, repair_hint: "Fix YAML syntax in manual-story.yaml." });
  }
  return ok(parsed as ManualStoryMetadata);
}
```

This implementation note: `compileManuscript`'s use of `readSegmentBody` + `readSegmentSidecar` (from `src/read/segments.ts`) means 007 has an implicit ordering dependency on 006 having landed. The spec's `Deps: 002, 003` on this ticket is structurally sufficient at type-foundation time (the discriminated union + helper exist), but at implementation time the implementer should land 006 before 007 OR adapt compile.ts to use the still-local-helper variant until 006's migration lands. Recommended landing order: 006 then 007. (This is documented in §Step 6 §5 shared-file overlaps as a coordination note, not a structural `Deps` declaration, since both tickets compile cleanly against the foundations alone.)

### 3. `tools/manual-story-studio/src/server/routes/manuscript.ts`

- Line 50: `readManuscript(...)` returns `ReadResult`; on `!result.ok` dispatch via `mapReadErrorToHttpReply` (typically 500 for `io_error`). When `result.ok && result.value.manuscript_present === false`, return 404 with `{ error: "manuscript_not_compiled_yet" }` — this preserves the spec §2 item 4 *"404 only for genuinely-absent manuscript"* semantic.
- Adapt the manuscript-compile POST handler: `compileManuscript(...)` returns `ReadResult`; on `!result.ok` dispatch via `mapReadErrorToHttpReply` (typically 409 for `yaml_parse_failed` on metadata / segment sidecars).

## Files to Touch

- `tools/manual-story-studio/src/read/manuscript.ts` (modify)
- `tools/manual-story-studio/src/manuscript/compile.ts` (modify — both the readManuscript-style migration of the internal metadata read AND the iteration loop that now uses 006's typed segment reads)
- `tools/manual-story-studio/src/server/routes/manuscript.ts` (modify)

## Out of Scope

- Migrating any other read function — SPEC105MANSTOSTU-004 (metadata at the prompt-compose level), 005 (records), 006 (segments), 008 (enumerators).
- The `auto-compile-on-segment-save` policy logic (which lives at the segment-save route in 006's scope) — that route adapts to compileManuscript's ReadResult return as part of the route's own ReadResult dispatch.
- Frontend rendering — SPEC105MANSTOSTU-011 / SPEC105MANSTOSTU-012.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend` compiles cleanly.
2. `cd tools/manual-story-studio && npm test` runs and existing manuscript-route + compile tests pass (adapted to `!result.ok` narrowing).
3. `grep -nE "readManuscript.*ReadResult|compileManuscript.*ReadResult" tools/manual-story-studio/src/` returns the migrated signatures.
4. `grep -nE "YAML.parse" tools/manual-story-studio/src/manuscript/compile.ts` returns zero matches outside of the helpers' try/catch blocks — every raw YAML.parse from the old code path is wrapped in typed-read structure.

### Invariants

1. `readManuscript` returns `ReadResult<ManuscriptReadResult>` — the "absent before first compile" case is `ok: true` with `manuscript_present: false`, distinct from `ok: false` for I/O failures.
2. `compileManuscript` returns `ReadResult<CompileManuscriptResult>` — corrupt metadata or segment sidecar produces `ok: false` with a typed error code, not an uncaught throw.
3. Route 404 is returned only when the manuscript is genuinely absent (`manuscript_present: false`); corrupt metadata produces 409 per the §2 item 4 dispatch table.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/manuscript/compile.test.ts` (modify) — add a fixture with corrupt `manual-story.yaml` and assert `compileManuscript(...).ok === false` with `code: "yaml_parse_failed"`, not a thrown exception.
2. `tools/manual-story-studio/test/server/routes/manuscript.test.ts` (modify) — assert 200 for valid manuscript, 404 for `manuscript_present: false`, 409 for corrupt-metadata compile attempt.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend` — compile check.
2. `cd tools/manual-story-studio && npm test` — full package test.
