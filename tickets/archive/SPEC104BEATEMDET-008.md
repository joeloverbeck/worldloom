# SPEC104BEATEMDET-008: Composer stage 5 extension — parse template YAML, emit beat_guidance into section 6, thread forbidden_inventions into section 12

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/manual-story-studio/src/prompt/compose.ts` (stage 5 parses YAML body into beat_guidance Markdown + forbidden_inventions array); extends `tools/manual-story-studio/src/prompt/sections/section-6-optional-beat-template-guidance.ts` (now receives an assembled body instead of raw file content); extends `tools/manual-story-studio/src/prompt/sections/section-12-forbidden-inventions-and-reveals.ts` (consumes a new optional `template_forbidden_inventions` input)
**Deps**: 007

## Problem

The landed SPEC-102 composer has a stage 5 that loads the optional beat template from `input.included_template_path` and exposes the raw file body via `input.included_template_body` (`tools/manual-story-studio/src/prompt/compose.ts:130-135,183`). The existing section-6 emitter (`tools/manual-story-studio/src/prompt/sections/section-6-optional-beat-template-guidance.ts`) emits the raw body or `(none selected)` when empty.

SPEC-104 §2.6 requires stage 5 to: (a) parse the template YAML body; (b) render the parsed `beat_guidance` array as a Markdown enumerated list keyed by `function` (for section 6); (c) thread the parsed `forbidden_inventions[]` into the section-12 emitter alongside the existing per-cast `prose_constraints.forbidden_inventions` assembly. The section-6 emitter receives the assembled Markdown body; the section-12 emitter gains a new optional input field for the template-level forbidden_inventions.

## Assumption Reassessment (2026-05-31)

1. Codebase: `tools/manual-story-studio/src/prompt/compose.ts:59,130-135,183` defines the stage-5 template loading (currently reads the file's raw text and passes it via `input.included_template_body` to the section emitters); `tools/manual-story-studio/src/prompt/sections/section-6-optional-beat-template-guidance.ts` exports `emitSection6(input)` returning `(none selected)` when `input.included_template_body` is null/empty (verified during /reassess-spec session); `tools/manual-story-studio/src/prompt/sections/section-12-forbidden-inventions-and-reveals.ts:15-19` currently iterates per-cast `c.prose_constraints.prose_must_not_imply` and `c.prose_constraints.forbidden_inventions` (verified by spot-check grep — has no template-level forbidden_inventions input yet). The `yaml` package is already a runtime dependency (per SPEC-100 §2 in-scope item 1: `yaml@2.9.0`).
2. Spec: SPEC-104 §2.6 (after the reassess-spec correction) declares: *"The composer's stage 5 (load optional selected beat template) reads the template file at `included_template_path` and includes its `beat_guidance` and `forbidden_inventions` in §6 of the composed prompt — extending the existing stage-5 loader at `tools/manual-story-studio/src/prompt/compose.ts:130-135,183` whose output already flows into the existing §6 emitter via the `included_template_body` field."* §2.7's lint-extension (ticket 009) catches engine-jargon in `beat_guidance.instruction` at CRUD save time, complementing the composer-time prompt-body lint that catches violations in the assembled prompt.
3. Cross-skill boundary: the composer-side change touches three files (compose.ts + section-6 emitter + section-12 emitter) and consumes ticket 002's `BeatTemplate` type (when parsing the YAML) + ticket 007's routes-layer ID→path resolution (which sets the `included_template_path` for stage 5 to load). The composed prompt body's section 6 contains the template's `beat_guidance.instruction` strings, which the existing SPEC-102 prompt-body lint (`tools/manual-story-studio/src/prompt/lint.ts`) catches at composer time as a secondary surface to ticket 009's CRUD-time lint.
4. Schema extension (was template item 6): the section-12 emitter's input gains a new optional `template_forbidden_inventions: string[]` field. The extension is additive (existing callers passing only the per-cast prose_constraints continue to work; new caller — compose.ts stage 5 — passes the field when a template is selected). No breaking changes to existing emitter callers.

## Architecture Check

1. Stage-5 YAML parsing keeps the assembly responsibility in compose.ts (the deterministic composer with byte-identical-output discipline per SPEC-102 §3 key decision) rather than pushing it into the section emitters (which are intentionally thin per the same key decision). The section-6 emitter continues to emit its `input.included_template_body` unchanged — the change is that compose.ts now assembles a Markdown beat_guidance list as the body rather than passing raw file content. Alternative considered and rejected: restructure section-6 emitter to accept a parsed `BeatTemplate` object and render the beat_guidance inline — rejected because it couples the emitter to the schema (ticket 002's `BeatTemplate` type) and breaks the existing thin-emitter pattern.
2. The section-12 emitter's new optional field is additive — existing callers continue to work; only compose.ts stage 5 (when a template is selected) populates the new field. The two forbidden_inventions surfaces (per-cast and template-level) are assembled into the same section 12 output without ordering ambiguity (per-cast first, template second, or vice versa per a documented convention chosen at implementation time).
3. No backwards-compatibility aliasing or shims introduced. The composer's `included_template_path` → `included_template_body` flow is unchanged; only the body's content shifts from raw file to assembled Markdown.

## Verification Layers

1. Stage 5 parses a valid template YAML and renders `beat_guidance` as a Markdown enumerated list → targeted test against a fixture template asserting the assembled `included_template_body` matches the expected Markdown.
2. Stage 5 threads `forbidden_inventions` into section 12 → targeted test asserting the section-12 output contains the template's forbidden_inventions lines alongside per-cast prose_constraints.
3. No-template case: `included_template_path: null` → section 6 emits `(none selected)` (existing behavior preserved); section 12 contains only per-cast prose_constraints (no template-level additions).
4. Determinism: fixture inputs → byte-identical composed prompt body across runs (the existing SPEC-102 §3 key-decision discipline; extension preserves it).
5. Invalid template YAML: when stage 5 fails to parse the YAML, the composer returns a lint violation citing the malformed template (rather than crashing or silently producing an empty body) → targeted test.

## What to Change

### 1. Extend `tools/manual-story-studio/src/prompt/compose.ts`

Modify stage 5 (around lines 130-135):

- After loading the raw template file body (existing behavior), parse it as YAML using the existing `yaml` package import.
- Validate the parsed object against `validateBeatTemplate` (ticket 002); if invalid, return a lint violation citing the template's malformed-schema failure.
- Assemble the section-6 body as a Markdown enumerated list:
  ```
  - **setup**: <beat_guidance[0].instruction>
  - **pressure**: <beat_guidance[1].instruction>
  - **turn**: <beat_guidance[2].instruction>
  - **exit**: <beat_guidance[3].instruction>
  - **aftermath**: <beat_guidance[4].instruction>
  ```
  (Only emit the beats actually present per the 1-5 length range; the `**function**` label is the beat's `function` field.)
- Pass the assembled Markdown body via `input.included_template_body` to the section-6 emitter (existing flow at line 183).
- Add a new field to the composer's section-emitter input: `template_forbidden_inventions: string[]` (from the parsed `template.forbidden_inventions`).
- Thread `template_forbidden_inventions` into the section-12 emitter's input (existing assembly flow gains the new field).

### 2. Section-6 emitter — no structural change

`tools/manual-story-studio/src/prompt/sections/section-6-optional-beat-template-guidance.ts` continues to emit `input.included_template_body` unchanged. The body's CONTENT shifts from raw file content to assembled Markdown, but the emitter's contract is unchanged. No code edit needed in the emitter file beyond a comment update clarifying the body's new content shape.

### 3. Extend `tools/manual-story-studio/src/prompt/sections/section-12-forbidden-inventions-and-reveals.ts`

Add an optional `template_forbidden_inventions?: string[]` input field. When present, emit each entry on its own line in the section-12 body alongside the existing per-cast prose_constraints assembly (per-cast entries first, template entries second — pick a documented ordering and stick with it for determinism).

### 4. Create `tools/manual-story-studio/test/prompt/section-6-template-guidance.test.ts`

Covers the verification layers: stage-5 YAML parsing → section-6 Markdown rendering; stage-5 forbidden_inventions threading → section-12; no-template case preserves existing emitter behavior; invalid YAML → lint violation; determinism check.

## Files to Touch

- `tools/manual-story-studio/src/prompt/compose.ts` (modify)
- `tools/manual-story-studio/src/prompt/sections/section-6-optional-beat-template-guidance.ts` (modify — comment-only or contract clarification; no code change to the emitter itself per architecture check item 1)
- `tools/manual-story-studio/src/prompt/sections/section-12-forbidden-inventions-and-reveals.ts` (modify)
- `tools/manual-story-studio/test/prompt/section-6-template-guidance.test.ts` (new)

## Out of Scope

- The routes-layer ID→path resolution that populates `included_template_path` — ticket 007.
- The CRUD-time beat-template lint — ticket 009.
- The frontend MomentComposer that passes `selected_template` — ticket 012.
- The beat-template schema itself — ticket 002.

## Acceptance Criteria

### Tests That Must Pass

1. Stage 5 against a fixture template with 3 beat_guidance entries (setup, pressure, exit) renders section 6 as the expected Markdown enumerated list.
2. Stage 5 against the same fixture threads `forbidden_inventions` into section 12; the composed section-12 output contains both the per-cast prose_constraints and the template-level forbidden_inventions.
3. Stage 5 with `included_template_path: null` emits section 6 as `(none selected)` (existing behavior); section 12 contains only per-cast prose_constraints.
4. Composer determinism: fixture inputs → byte-identical composed prompt body across two consecutive invocations.
5. Stage 5 with malformed-YAML template body returns a lint violation citing the template's schema failure; the composer does not crash.
6. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/prompt/section-6-template-guidance.test.js"` succeeds.
7. The existing SPEC-102 prompt-body lint catches engine-jargon in the section-6 assembled body (since the body is part of the composed prompt) → covered by the existing lint test surface; this ticket's tests assert the assembled body's content shape but rely on the existing lint for engine-jargon coverage.

### Invariants

1. The section-6 emitter's contract is unchanged: emit `input.included_template_body` or `(none selected)`. The body's content shape shifts (raw → assembled Markdown) but the emitter remains thin per SPEC-102 §3.
2. The section-12 emitter's new input is optional and additive; existing callers (without a selected template) continue to work unchanged.
3. Composer determinism: same inputs → same composed prompt body (SPEC-102 §3 key decision preserved).
4. Stage 5 validates the template body before assembling — malformed YAML never produces a silent empty body.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt/section-6-template-guidance.test.ts` (new) — covers each acceptance criterion using fixture template files + composer input objects.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/prompt/section-6-template-guidance.test.js"` (targeted verification).
2. `cd tools/manual-story-studio && npm test` (full-pipeline verification).
3. The targeted command above is the correct verification boundary because this ticket's edits are scoped to compose.ts stage 5 + section-12 emitter + the new test; the existing prompt-compose and section-emitter test suites (per SPEC-102's test layout) continue to exercise the composer's overall behavior unchanged.
