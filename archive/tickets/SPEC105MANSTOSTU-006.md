# SPEC105MANSTOSTU-006: Migrate `segments.ts` public reads + callers

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies `tools/manual-story-studio/src/read/segments.ts` (3 public read signatures: `listSegments`, `readSegmentSidecar`, `readSegmentBody`) plus 2 caller files (`server/routes/segments.ts`; `server/routes/prompts.ts`). No impact on canon-pipeline surfaces.
**Deps**: archive/tickets/SPEC105MANSTOSTU-002.md, archive/tickets/SPEC105MANSTOSTU-003.md

## Problem

At intake, the three public reads in `tools/manual-story-studio/src/read/segments.ts` (`listSegments`, `readSegmentSidecar`, `readSegmentBody`) silently swallowed parse failures: `listSegments` silently skipped invalid segment sidecars; `readSegmentSidecar` returned null for invalid-ID-shape + missing-sidecar + parse-failure; `readSegmentBody` returned null on file-read errors. Per SPEC-105 §2 item 3 + §1 Context, the public read surface migrated to `ReadResult<T>` so callers can distinguish "valid absence" from "corruption." This ticket also corrected the function-name drift caught by the SPEC-105 reassessment: an earlier spec draft named `listSegmentSidecars` and `readSegment`, neither of which exists in the live tree.

## Assumption Reassessment (2026-06-01)

1. Caller sites verified at HEAD via `grep -rn "listSegments\|readSegmentSidecar\|readSegmentBody" tools/manual-story-studio/src/`:
   - `src/server/routes/segments.ts:98` (`listSegments({manualStoryRoot})` in GET segments list); line 121 (`readSegmentSidecar` in GET single segment); line 185 (`readSegmentSidecar` inside the delete handler's referrer check).
   - `src/server/routes/prompts.ts:30` (import of `listSegments, readSegmentSidecar`); subsequent call sites inside the prompts-history GET handler.
   - Note: `src/write/segments.ts` defines its OWN local `readSegmentSidecar` at line 324 and uses it at line 134 — that local function is unaffected by this migration (it's a private helper local to write/segments.ts).
2. The function-name correction is verified via reassessment: actual exports at `src/read/segments.ts:27,53,66` are `listSegments` / `readSegmentSidecar` / `readSegmentBody` (NOT the spec's earlier-draft names `listSegmentSidecars` / `readSegment`). The reassessment edited the spec's §4 Modify line and §7 AC#6 to use the actual names; this ticket implements against those corrected names.
3. Cross-skill boundary: `tools/manual-story-studio` is canon-pipeline-fenced per SPEC-100; this signature change is internal to the package. No cross-package import added or modified.
4. Rule 6 retcon attribution: 3 public function signatures change non-additively (`T | null` → `ReadResult<T>`). Each caller adapts. The behavior shift: a corrupt segment sidecar in `listSegments` iteration now surfaces as a 409 with a `segment-sidecar-malformed` finding rather than as a silent skip; a missing sidecar `.yaml` (with the `.md` body present) surfaces as a `segment-sidecar-missing` blocking finding, matching SPEC-105's acceptance test #4. No `T | null` overload retained.
5. Blast-radius: 2 caller files (routes/segments.ts, routes/prompts.ts). The local `readSegmentSidecar` in `write/segments.ts:324` is NOT a consumer of this migration — it's a private helper unrelated to the public `read/segments.ts` surface. The grep at acceptance time confirms no orphan call sites of the public reads.

## Architecture Check

1. The migration coheres at the segments.ts module boundary: three functions sharing the internal `parseSegmentSidecar` helper + the `isSegmentSidecar` type guard migrate together. Splitting per-function would over-decompose since `parseSegmentSidecar` is consumed by both `listSegments` and `readSegmentSidecar`.
2. The internal helper `parseSegmentSidecar` (line 81–89) and the type guard `isSegmentSidecar` (line 91–102) continue to return `T | null` / boolean inside the module — public callers translate their results to typed `ReadError`s. AC#6's grep target is public exports only.
3. The function-name correction is mechanical — implementers use the actual exported names; the spec text already cites the correct names verbatim.
4. No backwards-compatibility aliasing/shims — the three old `T | null` returns are removed outright.

## Verification Layers

1. Type signature changes → codebase grep-proof: `grep -nE "^export function (listSegments|readSegmentSidecar|readSegmentBody).*ReadResult" tools/manual-story-studio/src/read/segments.ts` returns 3 matches.
2. Caller-site adaptations leave build green → `cd tools/manual-story-studio && npm run build:backend` compiles cleanly.
3. The acceptance test scenario "missing segment sidecar (orphan `.md` without `.yaml`)" produces `blocked` status + `manuscript_compile` in `blocked_actions` per SPEC-105 §7 AC#4 → tested by SPEC105MANSTOSTU-014's integration fixture.

## Landed Changes

### 1. `tools/manual-story-studio/src/read/segments.ts` — migrated 3 public reads

Changed the three public signatures to `ReadResult<T>`. Sketch for `listSegments`:

```ts
export function listSegments(
  options: ListSegmentsOptions,
): ReadResult<SegmentListEntry[]> {
  const segmentsDir = path.join(options.manualStoryRoot, "segments");
  if (!existsSync(segmentsDir)) return ok([]);

  const entries: SegmentListEntry[] = [];
  for (const entry of readdirSync(segmentsDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const match = /^SEG-\d+\.yaml$/.exec(entry.name);
    if (!match) continue;

    const sidecarPath = path.join(segmentsDir, entry.name);
    const sidecar = parseSegmentSidecar(sidecarPath);
    if (!sidecar) {
      return err({
        code: "yaml_parse_failed",
        path: sidecarPath,
        repair_hint: `Fix YAML syntax or schema in segments/${entry.name}.`,
      });
    }
    entries.push({
      id: sidecar.id,
      title: sidecar.title,
      created_at: sidecar.created_at,
      updated_at: sidecar.updated_at,
      word_count: sidecar.word_count,
    });
  }

  entries.sort((a, b) => numericSegmentSuffix(a.id) - numericSegmentSuffix(b.id));
  return ok(entries);
}
```

For `readSegmentSidecar`: dispatch `invalid_id_shape` when the ID regex fails, `file_not_found` when the sidecar `.yaml` is absent, `yaml_parse_failed` when YAML parse fails, `schema_validation_failed` when the parsed value fails the `isSegmentSidecar` guard.

For `readSegmentBody`: dispatch `invalid_id_shape`, `file_not_found`, `io_error` when readFileSync throws.

### 2. `tools/manual-story-studio/src/server/routes/segments.ts`

- Line 98: `listSegments({manualStoryRoot})` returns `ReadResult`; dispatch via `mapReadErrorToHttpReply`.
- Line 121: `readSegmentSidecar(...)` returns `ReadResult`; dispatch.
- Line 185: `readSegmentSidecar(...)` inside delete handler; dispatch.

### 3. `tools/manual-story-studio/src/server/routes/prompts.ts`

- Update the import at line 30 (function names unchanged from the live tree).
- Update each call site inside the prompts-history GET handler to dispatch on `!result.ok`.

### 4. `tools/manual-story-studio/test/server/segments-routes.test.ts`

Added a route-level corrupt-sidecar assertion: GET `/segments` now returns 409 with a `HealthReport` body when an iterated sidecar fails YAML parsing.

## Files to Touch

- `tools/manual-story-studio/src/read/segments.ts` (modify)
- `tools/manual-story-studio/src/server/routes/segments.ts` (modify)
- `tools/manual-story-studio/src/server/routes/prompts.ts` (modify)

## Out of Scope

- The local `readSegmentSidecar` in `src/write/segments.ts:324` — that is a private helper unrelated to the public `read/segments.ts` surface; its narrow consumer at `write/segments.ts:134` is not migrated as part of this ticket.
- Migrating any other read function — archive/tickets/SPEC105MANSTOSTU-004.md (metadata), 005 (records), 007 (manuscript), 008 (enumerators).
- The compute pass that detects missing-`.yaml`-but-present-`.md` orphan sidecars — SPEC105MANSTOSTU-009 (the `segment-sidecar-missing` blocking finding is emitted by the compute pass, not by the read function; read functions only surface the per-call read failure).
- Frontend rendering — SPEC105MANSTOSTU-011 / SPEC105MANSTOSTU-012.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend` compiles cleanly.
2. `cd tools/manual-story-studio && npm test` runs and existing segments-route + prompts-route tests pass (adapted to `!result.ok` narrowing).
3. `grep -nE "^export function (listSegments|readSegmentSidecar|readSegmentBody).*ReadResult" tools/manual-story-studio/src/read/segments.ts` returns 3 matches.
4. `grep -rn "listSegmentSidecars\|readSegment\b" tools/manual-story-studio/src/` returns zero matches (the function-name drift fix sticks; no caller imports the non-existent names).

### Invariants

1. The 3 public reads return `ReadResult<T>` — never `T | null`.
2. `listSegments` produces fail-fast results: a single corrupt sidecar in iteration causes the entire call to return `ok: false`.
3. Internal helpers `parseSegmentSidecar` / `isSegmentSidecar` continue to return `T | null` / boolean inside the module; public callers translate their results.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/routes/segments.test.ts` (modify) — assert 404 for missing segment, 409 for corrupt sidecar, 200 for valid list.
2. `tools/manual-story-studio/test/server/routes/prompts.test.ts` (modify if affected) — assert 409 propagation when segments reads fail.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend` — compile check.
2. `cd tools/manual-story-studio && npm test` — full package test.

## Outcome

Completed on 2026-06-01.

This ticket migrated the public segment read surface to `ReadResult<T>`, adapted segment and prompt-history routes to dispatch read errors through `mapReadErrorToHttpReply`, and added focused coverage for corrupt sidecar propagation.

No deviations from the planned production scope. The private segment readers in `write/segments.ts` and `manuscript/compile.ts` remain out of scope.

## Verification Result

Commands run from the repo root unless a package directory is named:

1. `cd tools/manual-story-studio && npm run build:backend` — passed.
2. `cd tools/manual-story-studio && npm test` — passed; backend reported 363 tests passing and web `tsc --noEmit` passed.
3. `grep -nE "^export function (listSegments|readSegmentSidecar|readSegmentBody).*ReadResult" tools/manual-story-studio/src/read/segments.ts` — passed; returned 3 matches.
4. `grep -rn "listSegmentSidecars\\|readSegment\\b" tools/manual-story-studio/src/` — passed with zero matches.
