# MSSUX-010: Guarantee a well-formed record `id` on create, and fail validation closed on malformed ids

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None for canon/MCP/patch-engine. Touches the Manual Story Studio package only (`tools/manual-story-studio`): the record write path and the schema validator, plus their tests. No public HTTP-route signature change.
**Deps**: None. (MSSUX-011 repairs the already-corrupt data this ticket prevents going forward; MSSUX-012 adds a read-side guard for the same invariant. The three are independent and may land in any order, though 010→011→012 is the natural sequence.)

## Problem

At intake, a cast record had been written to disk with an **empty `id` field** while its filename was correct:

```
worlds/erotica-world/manual-stories/red-bunny/records/cast/mchar-1.yaml
  id: ""              # ← should be "mchar-1"
  title: Ane Arrieta
```

That single corrupt field was the upstream cause of every reported Manual Story Studio symptom for this cast member: `EditPromptWorkingSet` showed `Invalid cast IDs:` (empty), the cast card and the records card no-oped on click, and `moment-composer` → `template-candidates` returned **HTTP 400** `{"error":"bad_request","reason":"invalid_id_shape"}`. The front end was not at fault — every consumer correctly keyed off the record's `id`, which was `""`.

Two backend defects let this happen, and this ticket fixes both:

1. **Write path clobbers the allocated id.** `createRecord` (`src/write/records.ts`) composes the record as `const composed = { id, ...body };`. Because `...body` is spread **last**, a client-supplied `id` in the request body (the `RecordForm` "New" path initializes `id: ""`) overwrites the freshly-allocated `mchar-1` with `""`. The sibling `updateRecord` already does the correct `{ ...body, id }` (id last); `createRecord` is the asymmetric, buggy one.

2. **Validation is not fail-closed on id shape.** `validateRecord` → `MANUAL_RECORD_SCHEMAS` declares `id` as a plain `string` scalar. An empty `""` is a valid string and there is no `^<prefix>-[0-9]+$` / non-empty check, so the malformed record passes validation and is persisted. This is the "why was the file allowed to be created at all?" gap. Notably, **beat-templates already enforce `^mtemplate-\d+$`** via `BEAT_TEMPLATE_ID_PATTERN` in `src/validate/beat-template-schema.ts`; the 18 generic `SchemaDef` classes (cast + 17 others) lack the equivalent guard. This ticket brings them to parity.

## Assumption Reassessment (2026-06-04)

1. Write-path defect confirmed at `src/write/records.ts` `createRecord`: `const composed = { id, ...body } as ManualRecordOfClass<C>;`. `updateRecord` in the same file uses `const composed = { ...body, id }` (id last) — the asymmetry is the bug. The POST route `registerRecordsWriteRoutes` (`src/server/routes/records.ts`) passes `body.record` straight through as `Omit<ManualRecord, "id">`, but the runtime object carries the form's `id: ""`, so `Omit` provides no runtime protection.
2. Validation gap confirmed at `src/validate/schema.ts`: `COMMON_SCALARS.id = "string"`; no `pattern` entry for `id` and no post-schema id-shape assertion in `validateRecord`. `validateAgainstSchema` accepts `""` for any `string` scalar. Beat-templates are the only class that validates id shape today (`BEAT_TEMPLATE_ID_PATTERN = /^mtemplate-\d+$/` per `src/validate/beat-template-schema.ts:346`).
3. Cross-artifact boundary under audit: the per-class id prefix lives in one place — `MANUAL_RECORD_CLASS_PREFIXES` (`src/schema/manual-story.ts:181`, `cast: "mchar"`). The new validation check must derive the pattern from that same map so prefix and check never drift. `readRecord`/`deleteRecord`/`id-allocator` already build `^${prefix}-\\d+$` from this map; the validator should use the identical construction.
4. FOUNDATIONS principle motivating this ticket: **FOUNDATIONS-002 "Per-class ID format conventions"** (`docs/FOUNDATIONS.md` §Canonical Storage Layer) — "Filenames match the `id` field exactly" and "Engine schemas and allocation checks use `^<CLASS>-[0-9]+$` patterns." The Manual Story Studio mirrors this convention (`mchar-N`, `mtemplate-N`, etc.); an empty `id` on a `mchar-1.yaml` file is a direct violation. The **Validator Framework** bullet (§Machine-Facing Layer) names "id uniqueness, attribution compliance, and anchor integrity" as structural invariants validators must enforce fail-closed; an empty/malformed id is exactly such a structural invariant.
5. Schema-change blast radius (the `id`-shape check is additive validation, not a field add/remove): the check is internal to `validateRecord`; no record class gains or loses a field, and no frontend `recordSchemas.ts` mirror change is needed. Existing valid records (`id` matching `^<prefix>-\d+$`) continue to validate unchanged. The only records newly rejected are ones with a malformed/empty id — which are corrupt by definition.
6. Adjacent contradiction classification: the `createRecord` `{ id, ...body }` asymmetry and the missing validation are **both required consequences** of this ticket (two halves of one "well-formed id on write" guarantee), not separate bugs. The already-corrupt on-disk record is a **separate, data-only fix** filed as MSSUX-011. The read-path silent propagation is **defense-in-depth** filed as MSSUX-012.

## Architecture Check

1. Fixing both the write composition and the validator (belt-and-suspenders) is cleaner than fixing only one. The composition fix alone stops the studio's own create path from corrupting data, but validation is the fail-closed backstop the user explicitly asked for ("why was the file able to be created at all?") and the only guard against future write paths, imports, or hand edits. Validation is where FOUNDATIONS-002's `^<CLASS>-[0-9]+$` invariant belongs.
2. Deriving the id pattern from the existing `MANUAL_RECORD_CLASS_PREFIXES` map (not a hard-coded literal) prevents prefix/pattern drift and matches how `readRecord`/`deleteRecord`/`id-allocator` already build the same regex.
3. No backwards-compatibility shim: `createRecord` flips to `{ ...body, id }` outright (matching `updateRecord`); the validator gains an unconditional id-shape check for the `SchemaDef` classes. No alias, no opt-out flag.

## Verification Layers

1. Allocated id always wins on create -> unit/route test: POST a cast record whose body contains `id: ""` (and one with `id: "garbage"`) and assert the persisted/returned record has the allocated `mchar-N`, never the body value.
2. Malformed id rejected fail-closed -> validator unit test: `validateRecord("cast", {…, id: ""})` and `{…, id: "wrong-1"}` return `{ ok: false }` with an id-field error; `{…, id: "mchar-1"}` returns `{ ok: true }`.
3. Pattern derives from the canonical prefix map -> grep-proof that the validator references `MANUAL_RECORD_CLASS_PREFIXES` rather than a literal `"mchar"`.
4. No regression for valid records -> existing `test/server/records.test.ts` happy-path (POST → 201) and `test/validate/schema.test.ts` suites pass unchanged.

## Landed Changes

### 1. Make the allocated id authoritative in `createRecord`

`src/write/records.ts` now spreads the request body before the allocated `id`, so the engine-allocated value always wins:

```ts
const composed = { ...body, id } as ManualRecordOfClass<C>;
```

### 2. Add a fail-closed id-shape check to `validateRecord`

`src/validate/schema.ts` imports `MANUAL_RECORD_CLASS_PREFIXES`, derives `^<prefix>-\d+$` for every non-beat-template class, and appends an `invalid_id_shape` error when `id` is empty, missing, non-string, or wrong-prefix. Beat-templates remain on their dedicated validator.

## Files to Touch

- `tools/manual-story-studio/src/write/records.ts` (modify)
- `tools/manual-story-studio/src/validate/schema.ts` (modify)
- `tools/manual-story-studio/test/server/records.test.ts` (modify — add body-id-clobber regression case)
- `tools/manual-story-studio/test/validate/schema.test.ts` (modify — add id-shape accept/reject cases)

## Out of Scope

- Repairing the already-corrupt `mchar-1.yaml` (data-only; MSSUX-011).
- Read-path filename-authoritative id handling (MSSUX-012).
- Beat-template id validation (already enforced via `BEAT_TEMPLATE_ID_PATTERN`; no change).
- `manual-story.yaml` `cast_order` / `segment_order` reference validation (separate concern; not implicated in this bug).
- Any frontend change — the React layer correctly uses `summary.id` and needs no fix.

## Acceptance Criteria

### Tests That Must Pass

1. New regression in `test/server/records.test.ts`: POST a cast record whose body includes `id: ""` → response `record.id` equals the allocated `mchar-N` and the persisted file's `id` field is non-empty and matches `^mchar-\d+$`.
2. New cases in `test/validate/schema.test.ts`: `validateRecord("cast", rec)` rejects `id: ""` and `id: "wrong-1"`, accepts `id: "mchar-1"`.
3. `npm test` from `tools/manual-story-studio/` passes (backend `node --test` over `dist/test/**` + web tests).

### Invariants

1. After create, the persisted record's `id` field always equals the engine-allocated id (`^<prefix>-[0-9]+$`) regardless of any `id` value present in the request body.
2. `validateRecord` rejects any non-beat-template record whose `id` does not match `^<prefix>-[0-9]+$`, deriving `<prefix>` from `MANUAL_RECORD_CLASS_PREFIXES`.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/records.test.ts` — add a POST case proving a body-supplied `id: ""` cannot clobber the allocated id.
2. `tools/manual-story-studio/test/validate/schema.test.ts` — add id-shape accept/reject cases for a generic (`cast`) class.

### Commands

1. From `tools/manual-story-studio/`: `npm run build:backend`
2. From `tools/manual-story-studio/`: `node --test dist/test/server/records.test.js dist/test/validate/schema.test.js`
3. From `tools/manual-story-studio/`: `npm test`

## Outcome

Completed on 2026-06-04.

- `createRecord` now composes records as `{ ...body, id }`, matching `updateRecord` and preventing request-body `id` values from clobbering the engine-allocated id.
- `validateRecord` now enforces the per-class id pattern for all generic Manual Story Studio record classes, deriving the prefix from `MANUAL_RECORD_CLASS_PREFIXES` and returning an `invalid_id_shape` error for malformed ids.
- Added a route regression proving cast POST bodies with `id: ""` or `id: "garbage"` cannot clobber allocated ids.
- Added validator regressions proving `cast` accepts `mchar-1` and rejects `""` / `wrong-1`.

## Verification Result

- Pre-edit baseline: `npm test` from `tools/manual-story-studio/` passed with 496 backend tests plus the web TypeScript gate.
- `npm run build:backend` from `tools/manual-story-studio/` passed.
- `node --test dist/test/server/records.test.js dist/test/validate/schema.test.js` from `tools/manual-story-studio/` passed: 25 tests, including the new allocated-id and id-shape regressions.
- `npm test` from `tools/manual-story-studio/` passed after the change: 498 backend tests plus the web TypeScript gate.

## Deviations

- None. The data repair remains MSSUX-011, and the read-side guard remains MSSUX-012.
