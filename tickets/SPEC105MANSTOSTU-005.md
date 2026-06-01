# SPEC105MANSTOSTU-005: Migrate `records.ts` public reads + callers

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies `tools/manual-story-studio/src/read/records.ts` (4 public read signatures: `listRecords`, `readRecord`, `scanReferences`, `listAllKnownIds`) plus 6 caller files (`prompt/compose.ts` stages 3+4+5; `state-update-checklist.ts`; `write/records.ts`; `write/segments.ts` scanReferences callsite; `server/routes/records.ts`; `server/routes/beat-templates.ts` listRecords + readRecord callsites). No impact on canon-pipeline surfaces.
**Deps**: archive/tickets/SPEC105MANSTOSTU-002.md, SPEC105MANSTOSTU-003

## Problem

The four public reads in `tools/manual-story-studio/src/read/records.ts` (`listRecords` at line 20, `readRecord` at line 50, `listAllKnownIds` at line 71, `scanReferences` at line 102) silently swallow parse failures: `listRecords` continues past records with `parsed === null` (line 37–38); `readRecord` returns null on invalid-ID-shape + missing-file + parse-exception; `scanReferences` silently calls `readRecord` and `continue`s on null, making any unreadable record invisible to write-time integrity checks; `listAllKnownIds` parses the metadata's segment_order list silently. Per SPEC-105 §2 item 3, the public read surface migrates to `ReadResult<T>` so callers can distinguish absence from corruption. This ticket is larger than ticket 004 because `records.ts` is the package's most-used read module (6 caller files versus metadata's 3).

## Assumption Reassessment (2026-06-01)

1. Caller sites verified at HEAD via `grep -rn "listRecords\|readRecord\|scanReferences\|listAllKnownIds" tools/manual-story-studio/src/`:
   - `src/prompt/compose.ts:93` (`readRecord` for cast loop stage 3); line 120 (`readRecord` for records loop stage 4); line 290 (`listRecords` for lazy cast-title cache); line 313 (`readRecord` inside the translator-context closure); plus stage 5 template raw `readFileSync` + `YAML.parse` at lines 153–158 that the spec §M1 names for migration.
   - `src/state-update-checklist.ts:54` (`listRecords` inside the class-iteration loop); line 58 (`readRecord` in the per-class records loop).
   - `src/write/records.ts:149` (`listAllKnownIds` for ID-collision check); line 182 (`readRecord` for update existence check); line 187 (`scanReferences` for ref-integrity check).
   - `src/write/segments.ts:209` (`scanReferences` for segment-removal referrer check).
   - `src/server/routes/records.ts:95` (`listRecords` in the records-list GET handler); line 119 (`readRecord` in the per-record GET handler).
   - `src/server/routes/beat-templates.ts:344` (`listRecords` for candidate-generation by class); line 314 (`readRecord` for cast resolution in candidates); line 356 (`readRecord` for secrets resolution in candidates).
2. SPEC-105 §M1 + §4 Modify list the stage 5 template read conversion explicitly — the current `try { rawText = readFileSync(tplPath, ...) } catch { rawText = ""; }` silently swallows file-read errors. Migrating it produces a structured `selected_template_valid` lint finding instead of silently rendering an empty template body.
3. Cross-skill boundary: this ticket's `compose.ts` and `routes/beat-templates.ts` edits SHARE the files with SPEC105MANSTOSTU-004 (which converts `compose.ts` stage 2 metadata read and `routes/beat-templates.ts:306` readManualStoryMetadata call). Different line ranges — mechanical merge if landed in different commits; if implementers prefer they can land 004 + 005 as a coordinated patch sequence with 004 first.
4. Rule 6 retcon attribution: 4 public function signatures change non-additively (`T | null` → `ReadResult<T>`). Each caller adapts. The behavior shift is structurally visible: a corrupt single record file in a `listRecords` invocation now surfaces as a `HealthReport`-bearing 409 rather than as a silent skip, matching SPEC-105 §1 Context's *"biggest correctness failure"* framing. No `T | null` overload retained.
5. Blast-radius: 6 caller files (compose, state-update-checklist, write/records, write/segments, routes/records, routes/beat-templates). The grep at acceptance time confirms no orphan call sites. Note that `compose.ts`'s `listRecords` call at line 290 is inside a lazy-load callback inside the translator context — that call site needs ReadResult narrowing too, even though it's not on the "hot" read path.

## Architecture Check

1. The migration coheres at the records.ts module boundary: four functions sharing the same internal `parseYamlFile` helper migrate together, plus all callers. Splitting into per-function tickets (one each for listRecords / readRecord / scanReferences / listAllKnownIds) would over-decompose because the four functions share internal helpers and the caller surface overlaps heavily (e.g., `write/records.ts` calls 3 of the 4).
2. The internal helpers `parseYamlFile` (line 227–234), `toSummary` (line 205–225), and `escapeRegex` are private to the module and continue to return `unknown | null` / `ManualRecordSummary | null` internally — per the spec's `§9 Risks` carve-out, public reads return `ReadResult<T>` but private helpers may still use null inside the module as long as the public callers translate the null to a `ReadError`. AC#6's grep target is `^export (async )?function.*: .*\| null`, which catches public exports only.
3. The `compose.ts` stage 5 template raw-read conversion is in scope here (not deferred) because it's part of the same "convert the records-and-template read path" coherent unit — separating it would leave a half-converted compose.ts.
4. No backwards-compatibility aliasing/shims — the four old `T | null` returns are removed outright.

## Verification Layers

1. Type signature changes for the 4 public reads → codebase grep-proof: `grep -nE "^export function (listRecords|readRecord|scanReferences|listAllKnownIds).*ReadResult" tools/manual-story-studio/src/read/records.ts` returns 4 matches.
2. Caller-site adaptations leave build green → `cd tools/manual-story-studio && npm run build:backend` compiles cleanly across the 6 modified caller files.
3. Route 404 vs 409 dispatch is correct → integration tests in SPEC105MANSTOSTU-014 cover the corrupt-single-record case end-to-end. For this ticket, unit tests at the route layer assert that a corrupt record file produces 409 with a `record-yaml-parse-failed` finding, and a missing record ID produces 404.
4. `scanReferences` no longer silently drops referrers from corrupt records → unit test fixture with one corrupt record asserts the result is `ok: false` with `yaml_parse_failed`, not a partial list missing the corrupt record's references.

## What to Change

### 1. `tools/manual-story-studio/src/read/records.ts` — migrate 4 public reads

Change the four public signatures to `ReadResult<T>`. The internal `parseYamlFile` helper continues to return `unknown | null`; each public read translates the null to a typed `ReadError`. For `listRecords` and `scanReferences`, a corruption in any single record under iteration produces `ok: false` for the entire call (the spec's intent: fail-fast on corruption, not partial results).

Sketched conversion for `listRecords`:

```ts
export function listRecords(
  manualStoryRoot: string,
  recordClass: ManualRecordClass,
  opts: ListRecordsOptions = {},
): ReadResult<ManualRecordSummary[]> {
  const includeArchived = opts.includeArchived === true;
  const targetDir = path.join(manualStoryRoot, "records", recordClass);
  if (!existsSync(targetDir)) return ok([]);
  const prefix = MANUAL_RECORD_CLASS_PREFIXES[recordClass];
  const filenamePattern = new RegExp(`^${escapeRegex(prefix)}-(\\d+)\\.yaml$`);
  const out: ManualRecordSummary[] = [];

  for (const entry of readdirSync(targetDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const match = filenamePattern.exec(entry.name);
    if (!match) continue;
    const fullPath = path.join(targetDir, entry.name);
    const parsed = parseYamlFile(fullPath);
    if (parsed === null) {
      return err({
        code: "yaml_parse_failed",
        path: fullPath,
        repair_hint: `Fix YAML syntax in records/${recordClass}/${entry.name}.`,
      });
    }
    const summary = toSummary(parsed);
    if (!summary) {
      return err({
        code: "schema_validation_failed",
        path: fullPath,
        repair_hint: `Record at records/${recordClass}/${entry.name} is missing required fields (id, title).`,
      });
    }
    if (!includeArchived && summary.active === false) continue;
    out.push(summary);
  }
  out.sort((a, b) => extractNumericSuffix(a.id) - extractNumericSuffix(b.id));
  return ok(out);
}
```

Apply analogous conversions for `readRecord` (file_not_found / invalid_id_shape / yaml_parse_failed / schema_validation_failed), `listAllKnownIds` (yaml_parse_failed for metadata.yaml; propagate `listRecords` errors), and `scanReferences` (propagate `listRecords` + `readRecord` errors).

### 2. `tools/manual-story-studio/src/prompt/compose.ts` — stages 3, 4, 5

- **Stage 3 cast loop** (line 92–104): change `const rec = readRecord(..., "cast", id);` to a `ReadResult`-aware loop. When `!result.ok`, push a hard lint finding with the `ReadError.code` as the lint code's basis (e.g., `selected_cast_exists` for `file_not_found`, `selected_cast_valid` for `yaml_parse_failed`); when `result.ok && result.value.active === false`, the existing skip semantics apply.
- **Stage 4 records loop** (line 109–132): same shape as stage 3.
- **Stage 5 template read** (lines 152–158): replace the raw `readFileSync` + `catch { rawText = ""; }` with a `ReadResult`-aware read. On `!result.ok`, push a hard lint finding `selected_template_valid` with the read-error message. The current behavior (silent empty body) is replaced.
- **Stage 8 translator context** (line 290): the `listRecords(manualStoryRoot, "cast", ...)` call inside `loadCastSummariesOnce` adapts to `ReadResult`. A corruption here triggers a silent fallback (the translator can survive without the lazy cache because the cast titles cached at stage 3 cover the pinned set); log a warning and continue.

### 3. `tools/manual-story-studio/src/state-update-checklist.ts`

- `listRecords` at line 54: adapt to `ReadResult`. On corruption, propagate the error upward (the checklist builder's caller — the segment-save route — surfaces 409).
- `readRecord` at line 58: adapt to `ReadResult`. On corruption, propagate.

The function's return type changes from `StateUpdateChecklistPayload` to `ReadResult<StateUpdateChecklistPayload>`.

### 4. `tools/manual-story-studio/src/write/records.ts`

- `listAllKnownIds` at line 149: adapt to `ReadResult`. On corruption, the ID-collision check returns `broken_refs` to the route layer (signal: cannot validate IDs while reads are corrupt).
- `readRecord` at line 182: adapt to `ReadResult`. On corruption during an update operation, propagate.
- `scanReferences` at line 187: adapt to `ReadResult`. On corruption during ref-integrity check, propagate.

### 5. `tools/manual-story-studio/src/write/segments.ts` — line 209

`scanReferences` callsite: adapt to `ReadResult`. On corruption during segment-removal referrer check, propagate the error (the segment-deletion route then returns 409 + HealthReport via `mapReadErrorToHttpReply`).

### 6. `tools/manual-story-studio/src/server/routes/records.ts`

- Line 95: `listRecords` returns `ReadResult`; dispatch via `mapReadErrorToHttpReply` on `!result.ok`.
- Line 119: `readRecord` returns `ReadResult`; dispatch.

### 7. `tools/manual-story-studio/src/server/routes/beat-templates.ts`

- Line 314: `readRecord("cast", id)` returns `ReadResult`; dispatch.
- Line 344: `listRecords(cls, ...)` returns `ReadResult`; dispatch.
- Line 356: `readRecord("secrets", id)` returns `ReadResult`; dispatch.

## Files to Touch

- `tools/manual-story-studio/src/read/records.ts` (modify)
- `tools/manual-story-studio/src/prompt/compose.ts` (modify — stages 3+4+5 + stage 8 translator-context callback)
- `tools/manual-story-studio/src/state-update-checklist.ts` (modify)
- `tools/manual-story-studio/src/write/records.ts` (modify)
- `tools/manual-story-studio/src/write/segments.ts` (modify — line 209 `scanReferences` callsite only; the `readSegmentSidecar` local helper at line 324 is unaffected)
- `tools/manual-story-studio/src/server/routes/records.ts` (modify)
- `tools/manual-story-studio/src/server/routes/beat-templates.ts` (modify — lines 314, 344, 356; the `readManualStoryMetadata` call at line 306 is SPEC105MANSTOSTU-004's scope)

## Out of Scope

- The `readManualStoryMetadata` migration — SPEC105MANSTOSTU-004.
- Migrating `read/segments.ts` public reads — SPEC105MANSTOSTU-006.
- Migrating `readManuscript` — SPEC105MANSTOSTU-007.
- Migrating the enumerators (`read/manual-stories.ts`, `read/worlds.ts`) — SPEC105MANSTOSTU-008.
- Frontend rendering of the resulting 409 bodies — SPEC105MANSTOSTU-011 / SPEC105MANSTOSTU-012.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend` compiles cleanly — all caller sites narrow on `result.ok` before accessing `.value`.
2. `cd tools/manual-story-studio && npm test` runs and existing records-route + compose + state-update-checklist tests pass (any test asserting `null` returns is updated to assert `!result.ok`).
3. `grep -nE "^export function (listRecords|readRecord|scanReferences|listAllKnownIds).*ReadResult" tools/manual-story-studio/src/read/records.ts` returns 4 matches.
4. `grep -rn "readRecord\|listRecords\|scanReferences\|listAllKnownIds" tools/manual-story-studio/src/` against caller files shows zero unguarded `.ok`-less accesses (no `readRecord(...).id` or `listRecords(...).length` pattern; every callsite narrows first).

### Invariants

1. The 4 public reads return `ReadResult<T>` — never `T | null`.
2. `listRecords` and `scanReferences` produce fail-fast results: a single corrupt record in iteration causes the entire call to return `ok: false`, never a partial list. The spec's fail-fast model treats corruption as a blocking condition, not a silently-dropped record.
3. Internal helpers `parseYamlFile` / `toSummary` continue to return `unknown | null` / `ManualRecordSummary | null` inside the module — they are not part of the public read-layer contract. Public callers translate their null returns to a typed `ReadError`.
4. The stage 5 template read no longer silently produces an empty template body; a corrupt template file produces a hard lint finding `selected_template_valid` with the read-error message.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/routes/records.test.ts` (modify) — assert 404 for missing record, 409 + HealthReport for corrupt YAML, 200 for valid list.
2. `tools/manual-story-studio/test/server/routes/beat-templates.test.ts` (modify) — assert 409 propagation when records reads fail during candidate generation.
3. `tools/manual-story-studio/test/state-update-checklist.test.ts` (modify) — assert checklist returns `!result.ok` when an iterated class contains a corrupt record.
4. `tools/manual-story-studio/test/prompt/compose.test.ts` (modify) — assert stage 5 template-corruption produces a `selected_template_valid` hard lint finding instead of silent empty body.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend` — compile check.
2. `cd tools/manual-story-studio && npm test` — full package test.
