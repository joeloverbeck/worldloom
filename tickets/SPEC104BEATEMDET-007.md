# SPEC104BEATEMDET-007: Prompts routes — accept selected_template ID + resolve to included_template_path

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `tools/manual-story-studio/src/server/routes/prompts.ts` (accept new optional `selected_template: mtemplate-<integer>` ID; resolve to template-file path; preserve back-compat with existing `included_template_path` callers)
**Deps**: 002

## Problem

SPEC-104 §2.6 wires the Moment Composer to pass an optional `selected_template: mtemplate-<integer>` ID through to `POST /api/.../prompts/preview` and `POST /api/.../prompts`. The landed SPEC-102 routes layer (`tools/manual-story-studio/src/server/routes/prompts.ts:45,94-95`) currently accepts `included_template_path: string` only; the frontend MomentComposer (ticket 012) will pass `selected_template` as the user-facing ID, but the composer-side compose.ts expects `included_template_path` (a path string) — the routes layer is where the ID→path resolution happens to preserve the existing internal contract.

## Assumption Reassessment (2026-05-31)

1. Codebase: `tools/manual-story-studio/src/server/routes/prompts.ts:45,94-95` defines the request body's `included_template_path?: string | null` field on both the `/preview` and (record-save) `/` POST handlers; the handler constructs a `BuiltComposeInput` with the path verbatim and delegates to `compose.ts` which reads the file at stage 5 (`tools/manual-story-studio/src/prompt/compose.ts:130-135`). The manual-story root resolution helper exists in the routes-layer code (per SPEC-100 sandbox discipline) for assembling per-manual-story file paths.
2. Spec: SPEC-104 §2.6 (after the reassess-spec correction) declares the ID-shaped public API alongside the existing path-shaped internal composer input: *"The prompt-routes layer (per §4 modify list) resolves the ID to `worlds/<world>/manual-stories/<msSlug>/records/beat-templates/<selected_template>.yaml` and passes the resolved path into the existing composer input field `included_template_path` ... SPEC-104 introduces the ID-shaped public API while preserving the path-shaped internal composer input."*
3. Cross-skill boundary: this ticket touches the routes API surface (HTTP request schema) consumed by the frontend MomentComposer (ticket 012). The routes-layer ID→path resolution is the seam that decouples the ID-shaped user-facing API from the path-shaped internal composer pipeline (preserves SPEC-102's `included_template_path` contract). The ID resolution depends on knowing the manual-story root (existing routes-layer helper) and on the beat-template filename convention `mtemplate-<integer>.yaml` (ticket 001's ID format).
4. Schema extension (was template item 6): this extends an existing output schema (the routes' request body shape) with a new optional `selected_template: string` field. The extension is additive (existing callers passing `included_template_path` directly continue to work; new callers may pass `selected_template` instead and the routes resolve to `included_template_path` server-side). No breaking changes to existing API consumers.

## Architecture Check

1. Routes-layer ID resolution preserves SPEC-102's existing composer contract (`included_template_path` flows through stage 5 unchanged) while exposing the user-facing ID shape the frontend naturally produces. Alternative considered and rejected: change `compose.ts` to accept `selected_template` ID directly — rejected because compose.ts is the deterministic composer with byte-identical-output discipline (SPEC-102 §3 key decision); coupling ID resolution into compose.ts would break test determinism (the path-shaped input is reproducible across runs even when the user-facing ID lookup depends on file-system state).
2. No backwards-compatibility aliasing or shims introduced. The route's existing `included_template_path` parameter remains a first-class input; the new `selected_template` parameter is an optional alternative that resolves to the same internal field. When both are provided, the validation rejects the request (mutually exclusive — pick one shape).

## Verification Layers

1. Existing `included_template_path` callers still work → targeted route test passing `included_template_path: "worlds/.../mtemplate-1.yaml"` directly; composer receives the path.
2. New `selected_template` callers resolve to the path → targeted route test passing `selected_template: "mtemplate-1"` against a fixture manual-story with `records/beat-templates/mtemplate-1.yaml` on disk; composer receives the resolved path (verified via the composer's `included_template_path` argument).
3. Mutual-exclusion validation: passing BOTH `selected_template` and `included_template_path` fails with a 400-equivalent error and a clear message → targeted route test.
4. Missing-template handling: when `selected_template` resolves to a path that doesn't exist on disk, the route returns a 404-equivalent error naming the template ID → targeted route test.

## What to Change

### 1. Extend `tools/manual-story-studio/src/server/routes/prompts.ts`

- Extend the request body type (around lines 45 + 94-95) to accept `selected_template?: string | null` alongside `included_template_path?: string | null`.
- Apply validation in the route handler:
  - If both `selected_template` and `included_template_path` are present, return 400 with a message like `"Pass exactly one of selected_template or included_template_path; both received"`.
  - If `selected_template` is present, resolve it to `<manual-story-root>/records/beat-templates/<selected_template>.yaml`; assert the file exists; if not, return 404 with `"Beat template <selected_template> not found"`; on success, populate `built.included_template_path` with the resolved path.
  - If neither is present, leave `built.included_template_path` as `null` (no template selected — section 6 emitter emits `(none selected)` per the landed SPEC-102 behavior).
- The resolution helper may live inline or be extracted to a small utility (operator's call); name the resolver clearly (e.g., `resolveBeatTemplatePath`) so future readers can grep for the seam.

### 2. Extend `tools/manual-story-studio/test/server/prompts-routes.test.ts`

Apply the test extension via the existing SPEC-103-landed test file (extending in place, not rewriting). Add cases for: (a) `included_template_path` direct pass-through (back-compat), (b) `selected_template` ID resolution to path, (c) mutual-exclusion 400, (d) missing-template 404.

## Files to Touch

- `tools/manual-story-studio/src/server/routes/prompts.ts` (modify)
- `tools/manual-story-studio/test/server/prompts-routes.test.ts` (modify — extend existing SPEC-103 file)

## Out of Scope

- The composer's stage 5 extension (parse template YAML body, render beat_guidance into section 6) — ticket 008.
- The frontend MomentComposer that passes `selected_template` — ticket 012.
- The CRUD routes for beat-templates (this ticket only touches the prompt-composer routes) — ticket 006.

## Acceptance Criteria

### Tests That Must Pass

1. `POST /api/worlds/:slug/manual-stories/:msSlug/prompts/preview` with `included_template_path: "..."` continues to work as in SPEC-102 (back-compat).
2. `POST /api/worlds/:slug/manual-stories/:msSlug/prompts/preview` with `selected_template: "mtemplate-1"` resolves to the path `<manual-story-root>/records/beat-templates/mtemplate-1.yaml` and the composer receives that path as `included_template_path`.
3. Both `selected_template` and `included_template_path` in the same request → 400 with the mutual-exclusion error.
4. `selected_template: "mtemplate-99"` when the file does not exist on disk → 404 with the missing-template error.
5. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/server/prompts-routes.test.js"` succeeds.

### Invariants

1. The composer's internal contract (`compose.ts` accepts `included_template_path`) is unchanged — the routes layer is the only place ID resolution happens.
2. Mutual exclusion: a single request cannot pass both `selected_template` AND `included_template_path` — the user-facing API has one shape per request.
3. ID format: `selected_template` follows the `mtemplate-<integer>` pattern (per ticket 001); no validation is needed at the routes layer (the file-existence check at the resolved path is sufficient — non-conforming IDs simply won't resolve to a file on disk).

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/prompts-routes.test.ts` (modify) — extend the existing test file with 4 new cases (back-compat path, ID resolution, mutual-exclusion 400, missing-template 404). Fixture manual stories under `test/fixtures/` should include a `records/beat-templates/mtemplate-1.yaml` for the success-case test.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/server/prompts-routes.test.js"` (targeted verification).
2. `cd tools/manual-story-studio && npm test` (full-pipeline verification).
3. The targeted command above is the correct verification boundary because this ticket's edits are scoped to the routes file + its test; the composer pipeline (ticket 008) is exercised by its own ticket's tests.
