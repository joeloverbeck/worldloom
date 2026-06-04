# SPEC101MANSTOMET-003: Reference-integrity validator for Manual Studio records

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small-Medium
**Engine Changes**: Yes — adds `tools/manual-story-studio/src/validate/refs.ts` ref-integrity validator module.
**Deps**: SPEC101MANSTOMET-001

## Problem

Manual Studio records reference each other extensively: `mbel-*.holder` points at `mchar-*`, `mrel-*.between` is a `mchar-*` pair, `mobl-*.owed_by/owed_to` are `mchar-*`, `mcnsq-*.caused_by_segment` is `SEG-*`, `martifact-*.current_holder` is `mchar-*` or `mloc-*`, `mobj-*.current_location` is `mloc-*`, plus every record's `refs.characters` / `refs.locations` / `refs.related_records`. Without a shallow ref-integrity check, the CRUD save flow would let authors write records pointing at IDs that don't exist, surfacing the dangling-ref bug only at prompt composition (SPEC-102) or prose paste (SPEC-103) time — far from the form-state recovery window. The validator must be shallow (one hop, not recursive) per SPEC-101 §3 Key decisions ("Reference closure is shallow (one hop, not recursive) — the goal is preventing obvious dangling refs, not enforcing engine-grade reference integrity").

## Assumption Reassessment (2026-05-30)

1. `tools/manual-story-studio/src/validate/` is created by SPEC101MANSTOMET-002; this ticket adds `refs.ts` alongside `schema.ts`. The validator depends on the type contract from `src/schema/manual-story.ts` (SPEC101MANSTOMET-001) to know per-class field shapes; no filesystem touch.
2. SPEC-101 §2.4 names this module: *"Validator at `tools/manual-story-studio/src/validate/refs.ts` returns a list of broken-ref violations per record; CRUD save flow refuses to write a record with broken refs unless the author confirms an override (UI: 'this record references missing IDs: <list>; save anyway?')."* SPEC-101 §2.4 also adds the in-session reassess-spec clarification (M4): *"The `source_world_character: CHAR-*` provenance field on Manual Character Profiles is informational and explicitly outside ref-validation scope — the validator does not inspect it (resolution against world canon is M6 deferral per §8 Risks)."*
3. Cross-artifact boundary under audit: ref validator consumes `ManualRecord` types from SPEC101MANSTOMET-001 and produces structured violations consumed by the write layer (SPEC101MANSTOMET-006). Boundary discipline: validator receives the full set of known IDs (per-class) as input — does NOT scan the filesystem itself; the write layer is responsible for assembling the ID set from the read layer (SPEC101MANSTOMET-005).
4. FOUNDATIONS principle / Validation Rule motivating this ticket: **Rule 5 No Consequence Evasion** at the authoring layer. A dangling ref is a second-order effect of editing-without-context (rename a character, fail to update a relationship; archive a location, fail to update an artifact's `current_location`); shallow ref-integrity surfaces the consequence at save time rather than at prompt-composition time. The shallow-not-recursive scoping is the deliberate Rule 5 minimum — engine-grade recursive closure is M6 deferral; shallow closure handles the obvious cases without authoring-layer drag.

## Architecture Check

1. A single validator function operating on (record, knownIds) is cleaner than per-class validator branches — the typed pointers (`belief.holder`, `relationship.between`, `obligation.owed_by`, `artifact.current_holder`) can be enumerated declaratively per class and checked uniformly. Shallow-one-hop scope keeps the validator O(refs-per-record), not O(records × refs).
2. No backwards-compatibility shims. SPEC-100 introduced no ref-integrity surface (its sandbox is realpath-only, not ID-aware); this ticket is the first ID-aware validator in the package.

## Verification Layers

1. Validator flags dangling `refs.characters` IDs → schema validation (test fixtures a record whose `refs.characters: [mchar-99]` references a missing character; asserts violation).
2. Validator flags dangling per-class typed pointers (`belief.holder`, `relationship.between`, etc.) → schema validation per-class.
3. Validator accepts refs to records marked `active: false` (archived but retained) → SPEC-101 §2.4 contract — codebase grep-proof + dedicated test.
4. Validator skips `source_world_character: CHAR-*` on Manual Character Profile records → SPEC-101 §2.4 M4 reassessment clarification — dedicated test asserting validator does not flag a CHAR-* value as dangling.

## What to Change

### 1. Create `tools/manual-story-studio/src/validate/refs.ts`

Module exports:

- **`RefViolation`** type — `{ field: string; missingId: string; recordId: string; recordClass: ManualRecordClass }`.
- **`KnownIds`** type — `Record<ManualRecordClass, Set<string>>` (per-class set of known IDs, including archived `active: false` records).
- **`validateRefs(record: ManualRecord, recordClass: ManualRecordClass, knownIds: KnownIds): RefViolation[]`** — returns array of violations (empty array means no broken refs).
- **`PER_CLASS_REF_SPECS`** const map — per-class declaration of typed-pointer fields:
  - `beliefs`: `{ holder: "cast" }`
  - `intentions`: `{ holder: "cast" }`
  - `plans`: `{ holder: "cast" }`
  - `emotions`: `{ holder: "cast" }`
  - `obligations`: `{ owed_by: "cast", owed_to: "cast" }`
  - `relationships`: `{ between: { kind: "pair", class: "cast" } }`
  - `objects`: `{ current_location: { class: "locations", nullable: true }, current_holder: { class: "cast", nullable: true } }`
  - `statuses`: `{ subject: { classes: ["cast", "locations", "objects"] } }`
  - `consequences`: `{ caused_by_segment: { class: "segments", nullable: true } }` — segments are referenced by `SEG-*` IDs; the validator treats `segments` as a known-ID set passed in `knownIds` (the write layer assembles it from `manual-story.yaml.segment_order` rather than from `records/segments/`)
  - `artifacts`: `{ current_holder: { classes: ["cast", "locations"], nullable: true } }`
  - `secrets`: `{ held_by: { kind: "list", class: "cast" } }`

### 2. Common-field ref validation

Every record's `refs.characters: string[]`, `refs.locations: string[]`, `refs.related_records: string[]` validates uniformly:

- `refs.characters` IDs must exist in `knownIds.cast`.
- `refs.locations` IDs must exist in `knownIds.locations`.
- `refs.related_records` IDs are class-untyped; each value's prefix determines its expected class (e.g., `mbel-3` → `knownIds.beliefs`; `mrel-7` → `knownIds.relationships`); use `MANUAL_RECORD_CLASS_PREFIXES` from SPEC101MANSTOMET-001 to derive the lookup.

### 3. `source_world_character` skip rule

When validating a `cast/mchar-*` record (Manual Character Profile), the validator does NOT inspect the `source_world_character: CHAR-*` field. Skipping is explicit in the implementation (not a side effect of "we only check m-prefixed IDs"); this is the M4 reassess-spec clarification and must be a dedicated code path the test fixture exercises.

### 4. Active vs archived records

`knownIds.<class>` includes IDs for records marked `active: false`. SPEC-101 §2.4: *"must point to existing records inside the same manual story OR to records marked `active: false` (archived but retained)"*. The write layer (SPEC101MANSTOMET-006) is responsible for assembling `knownIds` from all records on disk regardless of their `active` flag.

### 5. Tests

Create `tools/manual-story-studio/test/validate/refs.test.ts` covering:

- `refs.characters` dangling: fixture record with `refs.characters: [mchar-99]` and empty `knownIds.cast`; assert violation with `field: "refs.characters[0]"`, `missingId: "mchar-99"`.
- Each typed-pointer field tested per class: `mbel-*.holder`, `mrel-*.between[0]` + `between[1]`, `mobl-*.owed_by`, `mobj-*.current_location`, `martifact-*.current_holder`, `mstat-*.subject`, `mcnsq-*.caused_by_segment`, `msecret-*.held_by[i]`, `mint-*.holder`, `mplan-*.holder`, `memo-*.holder`.
- Active-vs-archived: fixture `knownIds.cast = Set(["mchar-3"])` where the cast record's `active: false`; assert no violation when referenced.
- `source_world_character: CHAR-*` skip: fixture Manual Character Profile with `source_world_character: "CHAR-99"` and empty world-canon access; assert no violation (validator did not inspect the field).
- Empty refs: fixture record with `refs.characters: []` and empty knownIds; assert empty violations array.
- Shallow-not-recursive scope: assert validator does NOT follow `refs.related_records[0] = "mrel-3"` into mrel-3's own refs.

## Files to Touch

- `tools/manual-story-studio/src/validate/refs.ts` (new)
- `tools/manual-story-studio/test/validate/refs.test.ts` (new)

## Out of Scope

- Schema-shape validation (required fields, enum values) — SPEC101MANSTOMET-002.
- Write-layer integration (ref validator invocation, override flag flow) — SPEC101MANSTOMET-006.
- Recursive ref closure — explicitly excluded per SPEC-101 §3 Key decisions; M6 deferral.
- World-canon resolution of `source_world_character: CHAR-*` — M6 deferral per SPEC-101 §2.4 M4 reassessment + §8 Risks.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` passes including the new `test/validate/refs.test.ts` (SPEC-101 AC #4: ref validator flags dangling refs).
2. `cd tools/manual-story-studio && npm run build:backend` succeeds.
3. `grep -n "source_world_character" tools/manual-story-studio/src/validate/refs.ts` returns at least 1 match (the explicit skip-rule code path), AND `grep -n "source_world_character" tools/manual-story-studio/test/validate/refs.test.ts` returns at least 1 match (the dedicated skip-rule test).

### Invariants

1. `PER_CLASS_REF_SPECS` key set is a subset of `ManualRecordClass` (only classes with typed pointers appear; classes without typed pointers like `facts`, `locations`, `entities`, `clocks`, `threads`, `questions` are absent).
2. The validator returns `RefViolation[]` always — never throws on missing knownIds entries (a missing class in `knownIds` is treated as an empty set).
3. `source_world_character` is skipped via explicit code path, not via implicit "we only check m-prefixed IDs" — the skip survives a future change to include world-canon `CHAR-*` IDs in `knownIds`.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/validate/refs.test.ts` — per-class typed-pointer dangling-ref tests, refs.* common-field dangling tests, active-vs-archived acceptance test, `source_world_character` skip test, empty-refs test, shallow-not-recursive scope test.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio && node --test dist/test/validate/refs.test.js` (after `npm run build:backend`)
