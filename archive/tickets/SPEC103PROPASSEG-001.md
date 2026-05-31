# SPEC103PROPASSEG-001: Schema extension — SegmentSidecar types + ManualStoryManuscriptPolicy.allow_reorder

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — extends `tools/manual-story-studio/src/schema/manual-story.ts` (backend), `tools/manual-story-studio/web/src/types/manual-story.ts` (web mirror), `tools/manual-story-studio/src/write/manual-story-metadata.ts` (default initializer), and the package-local metadata validator/tests that enforce `ManualStoryManuscriptPolicy`.
**Deps**: None

## Problem

SPEC-103 introduces a new `SegmentSidecar` shape that backend write/read code and frontend api/page components both need to type uniformly. The spec also adds `allow_reorder: boolean` to `ManualStoryManuscriptPolicy` — the Manuscript view's Reorder UI affordance gate (default `false` for MVP; reorder UI itself is M6). Both must be defined before any downstream consumer (ticket 004 save flow, ticket 006 compiler, ticket 011 PasteProse page, ticket 012 StateUpdateChecklist) can compile.

## Assumption Reassessment (2026-05-31)

1. Backend `ManualStoryManuscriptPolicy` exists at `tools/manual-story-studio/src/schema/manual-story.ts` with two fields (`compile_on_segment_save`, `include_segment_titles`); `allow_reorder` is absent. Web mirror exists at `tools/manual-story-studio/web/src/types/manual-story.ts` with matching two-field shape. Metadata-writer defaults at `tools/manual-story-studio/src/write/manual-story-metadata.ts` set the two existing fields; `allow_reorder` default missing. `SegmentSidecar` does not exist in either file.
2. SPEC-103 §2 item 3 sidecar schema enumerates 11 fields (including `updated_at` per reassessment finding I7); §2 item 7 references `manuscript.allow_reorder`; §4 Modify enumerates `src/schema/manual-story.ts`, `web/src/types/manual-story.ts`, and `src/write/manual-story-metadata.ts` (per reassessment findings I1 + I2).
3. Cross-skill boundary: `tools/manual-story-studio/src/schema/manual-story.ts` (backend) ↔ `tools/manual-story-studio/web/src/types/manual-story.ts` (web) is a hand-maintained mirror — per the web file header comment: *"Minimal mirror of tools/manual-story-studio/src/schema/manual-story.ts for the web bundle. The web frontend uses Vite (bundler) module resolution and cannot import from the backend's Node16 module tree"*. Every backend schema extension MUST also update the web mirror; otherwise frontend pages cannot type the segment sidecar shape.
4. Extension is additive-only at runtime: new types (`SegmentSidecar`, `SegmentSidecarIncludedRecordSummary`) + new required metadata policy boolean with default `false`; existing metadata creation remains valid through the initializer. Package validation in `tools/manual-story-studio/src/validate/schema.ts` must require and type-check `allow_reorder` so persisted `manual-story.yaml` files match the TypeScript contract. Existing test fixtures that construct `ManualStoryMetadata` directly must add `allow_reorder: false`. The `SegmentSidecar.id` field uses the unpadded `SEG-<integer>` format per FOUNDATIONS §Canonical Storage Layer "Per-class ID format conventions (FOUNDATIONS-002)".

## Architecture Check

1. Centralizing types in `schema/manual-story.ts` + mirroring to `web/types/manual-story.ts` keeps the type definitions in one canonical place per surface, parallel to all existing record types (`ManualCharacterRecord`, `ManualBeliefRecord`, etc.). The hand-maintained mirror is the established Manual Story Studio convention; introducing a third typing surface would diverge from it.
2. No backwards-compatibility aliasing or shims — additive type definitions and one additive boolean field with default `false`; existing `ManualStoryManuscriptPolicy` consumers continue to work with the two pre-existing fields without changes.

## Verification Layers

1. `SegmentSidecar` + `SegmentSidecarIncludedRecordSummary` types defined in both backend and web mirror with byte-equivalent field shape → codebase grep-proof
2. `allow_reorder: boolean` field added to `ManualStoryManuscriptPolicy` in both files → codebase grep-proof
3. Metadata-writer default initializer at `src/write/manual-story-metadata.ts:83-85` sets `allow_reorder: false` → codebase grep-proof
4. Metadata validator requires and type-checks `manuscript.allow_reorder` so persisted metadata cannot silently omit the policy gate → schema validation / backend build

## Landed Changes

### 1. Added SegmentSidecar types to backend schema

In `tools/manual-story-studio/src/schema/manual-story.ts`, after the `ManualStoryMetadata` interface, added the two new interfaces:

```typescript
export interface SegmentSidecarIncludedRecordSummary {
  characters: string[]; // [mchar-*] from prompt sidecar's included_cast
  records: string[]; // [m*-*] from prompt sidecar's included_records
}

export interface SegmentSidecar {
  id: string; // SEG-<integer>
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601 — refreshed on every in-place edit per SPEC-103 §3 item 7
  title: string;
  prompt_id: string | null; // PROMPT-<integer>, or null when authored without prompt round-trip
  prompt_sha256: string | null; // informational only; never gates any subsequent flow (per [[feedback_author_rejects_hash_coupling]])
  moment_directive: string; // copied from prompt sidecar if prompt_id is set, else empty
  selected_template: string | null; // mtemplate-<integer> or null (SPEC-104 wires this)
  included_record_summary: SegmentSidecarIncludedRecordSummary;
  author_note: string;
  word_count: number; // computed at save time; advisory
}
```

Extended `ManualStoryManuscriptPolicy` to add the third field:

```typescript
export interface ManualStoryManuscriptPolicy {
  compile_on_segment_save: boolean;
  include_segment_titles: boolean;
  allow_reorder: boolean;
}
```

### 2. Mirrored SegmentSidecar types to web

In `tools/manual-story-studio/web/src/types/manual-story.ts`, after `ManualStoryMetadata`, added the same `SegmentSidecar` + `SegmentSidecarIncludedRecordSummary` interfaces verbatim. Added `allow_reorder: boolean` to `ManualStoryManuscriptPolicy` in parallel to the backend edit.

### 3. Set allow_reorder default in metadata-writer and validator

In `tools/manual-story-studio/src/write/manual-story-metadata.ts` at the `manuscript:` block, added `allow_reorder: false` as the third field alongside the existing `compile_on_segment_save: true` and `include_segment_titles: false` defaults. The MVP default disables the M6-deferred reorder UI per SPEC-103 §2 Out of scope.

In `tools/manual-story-studio/src/validate/schema.ts`, added `allow_reorder` to the required manuscript policy fields and boolean scalar checks. Updated existing metadata fixtures in the same package so direct `ManualStoryMetadata` construction remains type-valid and validation-valid.

## Files to Touch

- `tools/manual-story-studio/src/schema/manual-story.ts` (modify)
- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify)
- `tools/manual-story-studio/src/write/manual-story-metadata.ts` (modify)
- `tools/manual-story-studio/src/validate/schema.ts` (modify)
- `tools/manual-story-studio/test/validate/schema.test.ts` (modify existing metadata fixture)
- `tools/manual-story-studio/test/read/manual-story-metadata.test.ts` (modify existing metadata fixture)
- `tools/manual-story-studio/test/prompt-compose.test.ts` (modify existing metadata fixture)
- `tools/manual-story-studio/test/prompt-sections.test.ts` (modify existing metadata fixture)

## Out of Scope

- Segment write flow itself (covered by ticket 004 — consumes `SegmentSidecar` for shape-typed writes)
- Reorder UI implementation (M6 deferral per SPEC-103 §2 Out of scope; `allow_reorder` only gates the future feature, doesn't implement it)
- Manuscript compiler honoring `allow_reorder` (compiler reads `segment_order` only; allow_reorder governs UI affordance, not compile behavior)
- Any frontend rendering of `SegmentSidecar` (covered by tickets 011-014)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend` — TypeScript compilation succeeds with new types
2. `cd tools/manual-story-studio && npm --prefix web install --no-audit --no-fund && npm --prefix web run build` — web bundle builds with mirrored types
3. `grep -nE 'SegmentSidecar|allow_reorder' tools/manual-story-studio/src/schema/manual-story.ts tools/manual-story-studio/web/src/types/manual-story.ts tools/manual-story-studio/src/write/manual-story-metadata.ts tools/manual-story-studio/src/validate/schema.ts` — new types/field appear in the type/default/validator surfaces

### Invariants

1. `SegmentSidecar` definition is semantically byte-equivalent between backend (`src/schema/manual-story.ts`) and web mirror (`web/src/types/manual-story.ts`); field names, optional/required status, and value types match exactly.
2. `ManualStoryManuscriptPolicy.allow_reorder` defaults to `false` in newly-created `manual-story.yaml` metadata files (MVP — reorder deferred to M6).
3. `SegmentSidecar.id` field's expected runtime value follows the unpadded `SEG-<integer>` format per FOUNDATIONS-002 (e.g., `SEG-1`, `SEG-2`; never `SEG-0001`).

## Test Plan

### New/Modified Tests

1. Existing metadata/schema fixtures updated in `tools/manual-story-studio/test/validate/schema.test.ts`, `tools/manual-story-studio/test/read/manual-story-metadata.test.ts`, `tools/manual-story-studio/test/prompt-compose.test.ts`, and `tools/manual-story-studio/test/prompt-sections.test.ts` so the package-local validation/build lane exercises the new required `allow_reorder` policy field.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend` — backend type-check + dist emit
2. `cd tools/manual-story-studio && npm --prefix web install --no-audit --no-fund && npm --prefix web run build` — web bundle build
3. Full backend+web build chain (`cd tools/manual-story-studio && npm test`) is exercised at ticket 016 capstone; this ticket's scope is purely the type-extension surface, so package-local build invocations are the correct narrow verification boundary.

## Outcome

Completed: 2026-05-31

Implemented the SPEC-103 segment sidecar type contract on both Manual Story Studio type surfaces and added `manuscript.allow_reorder` to the backend and web metadata policy mirrors. The metadata initializer now writes `allow_reorder: false`, and the package-local metadata validator requires `allow_reorder` as a boolean so persisted `manual-story.yaml` files match the TypeScript contract.

Deviation from the original plan: reassessment widened the owned file set to include `tools/manual-story-studio/src/validate/schema.ts` and existing metadata fixtures. Without that same-seam validator/test update, the new required policy field would compile only in isolated types while persisted metadata validation could still omit it.

## Verification Result

1. `npm run build:backend` from `tools/manual-story-studio` — PASS; backend TypeScript compilation succeeded.
2. `npm --prefix web install --no-audit --no-fund` from `tools/manual-story-studio` — PASS; web dependencies were already available and npm completed without tracked lockfile/package changes.
3. `npm --prefix web run build` from `tools/manual-story-studio` — PASS; web TypeScript + Vite build succeeded.
4. `node --test dist/test/validate/schema.test.js dist/test/read/manual-story-metadata.test.js dist/test/prompt-compose.test.js dist/test/prompt-sections.test.js` from `tools/manual-story-studio` — PASS; 32 tests passed, covering the changed validator and direct metadata fixture surfaces.
5. `grep -nE 'SegmentSidecar|allow_reorder' tools/manual-story-studio/src/schema/manual-story.ts tools/manual-story-studio/web/src/types/manual-story.ts tools/manual-story-studio/src/write/manual-story-metadata.ts tools/manual-story-studio/src/validate/schema.ts` — PASS; the new type/default/validator surfaces are present.

## Deviations

- `allow_reorder` is a required metadata policy field, not an optional field. The runtime compatibility path is the default metadata initializer plus fixture updates, matching SPEC-103's intent that the field exists and defaults to `false`.
