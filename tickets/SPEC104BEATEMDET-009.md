# SPEC104BEATEMDET-009: Lint extension — scan beat-template guidance strings

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `tools/manual-story-studio/src/prompt/lint.ts` (apply existing denylist + regex surfaces to beat-template `beat_guidance.instruction` strings)
**Deps**: 002

## Problem

SPEC-104 §2.7 mandates that beat-template `beat_guidance.instruction` strings are subject to the same engine-jargon and Manual-Studio-internal-ID denylist as other prompt sections. The landed SPEC-102 lint (`tools/manual-story-studio/src/prompt/lint.ts`) exposes `ENGINE_JARGON_DENYLIST` (line 23), `SCHEMA_VALIDATOR_DENYLIST` (line 70), `INTERNAL_ID_REGEX = /\bm[a-z]+-[0-9]+\b/g` (line 88), and `RECORD_CLASS_NARRATOR_PHRASES` (line 90), each enforced on the composed prompt body via tier-tagged rules (hard vs soft, per SPEC-102 §3 key decision). The §2.7 extension reuses these existing surfaces — a beat-template author writing engine jargon, internal IDs, schema/validator/patch terms, or narrator-voice record-class phrases in `beat_guidance.instruction` triggers the same lint violations as the prompt body, with the same author override path.

## Assumption Reassessment (2026-05-31)

1. Codebase: `tools/manual-story-studio/src/prompt/lint.ts:23-88` exports the four denylist/regex surfaces (`ENGINE_JARGON_DENYLIST`, `SCHEMA_VALIDATOR_DENYLIST`, `INTERNAL_ID_REGEX`, `RECORD_CLASS_NARRATOR_PHRASES`); the lint runs at composer-time on the composed prompt body. The tier system (`tier: "hard" | "soft"`) is set per-rule (line 129+); soft tier supports the `"copy anyway"` override (per SPEC-102 §3 key decision). The CRUD save flow for beat-templates (ticket 006) is the natural enforcement point for guidance-string lint — preventing engine-jargon violations from being persisted in the template before they reach prompt composition.
2. Spec: SPEC-104 §2.7 declares the lint extension applies the same denylist as other prompt sections; the override path (SPEC-102 §3 key decision: lint hard-fail by default, soft-fail with author override) applies here too. The lint regex `INTERNAL_ID_REGEX = /\bm[a-z]+-[0-9]+\b/g` catches `mtemplate-<integer>` (and all other `m`-prefix IDs) because ticket 001 enforces the integer-only convention — slug-form IDs would have slipped through this regex, but that variant is dropped per the reassess-spec correction.
3. Cross-skill boundary: the lint extension applies to beat-template body content at CRUD save time (ticket 006 consumer) AND at composer-time when the template's `beat_guidance.instruction` strings are inlined into section 6 (ticket 008 consumer — the composed prompt body's section 6 contains the template strings, so the existing prompt-body lint catches violations there too as a secondary surface). The lint surfaces themselves (denylists, regex, narrator phrases) are unchanged — this ticket adds a new entry point that runs the lint on raw beat-template strings independent of the composed prompt.

## Architecture Check

1. Reuse-not-rebuild: the existing four lint surfaces are the canonical engine-jargon / schema-term / internal-ID / narrator-voice catalogs; introducing a parallel beat-template-specific denylist would fragment the discipline. The extension is "apply the existing surfaces to a new input type" rather than "add new content rules." Alternative considered and rejected: only run the lint at composer-time on the composed prompt body (where beat-template strings end up inlined in section 6 anyway) — rejected because a lint violation in a saved beat-template would surface only at first-use (when the template is selected and the composer assembles a prompt), forcing the author to discover the violation in a different context than where they authored it; CRUD-time lint catches it at save.
2. No backwards-compatibility aliasing or shims introduced. The new lint entry point is a thin function wrapping the existing rules; no duplication of denylist content.

## Verification Layers

1. Beat-template guidance strings with engine jargon (e.g., `"advance PG-2"`) trigger soft-tier violations on the `ENGINE_JARGON_DENYLIST` rule → targeted test against a fixture template with each denylist token in `beat_guidance.instruction`.
2. Beat-template guidance strings with internal IDs (`mtemplate-1`, `mchar-2`, `mbel-3`) trigger soft-tier violations on the `INTERNAL_ID_REGEX` rule → targeted test.
3. Beat-template guidance strings with schema/validator/patch terms (e.g., `"submit_patch_plan"`, `"validator"`, `"state_snapshot"`) trigger soft-tier violations on the `SCHEMA_VALIDATOR_DENYLIST` rule → targeted test.
4. Beat-template guidance strings with narrator-voice record-class phrases trigger soft-tier violations on the `RECORD_CLASS_NARRATOR_PHRASES` rule → targeted test.
5. Override path works as in SPEC-102: a soft-tier violation in a beat-template doesn't block save when the author confirms override → targeted test asserting the override flag bypasses soft violations but not hard violations (in this case the lint produces only soft violations, so the override always succeeds for these denylists).

## What to Change

### 1. Extend `tools/manual-story-studio/src/prompt/lint.ts`

Add a function `lintBeatTemplateGuidance(template: BeatTemplate): PromptLintResult` that:

- Concatenates all `beat_guidance[].instruction` strings into a single scan body.
- Applies the existing four rules to that body using the same tier tagging as the prompt-body lint (each rule contributes its own findings with `tier: "soft"` and the same `rule` / `message` shape).
- Returns a `PromptLintResult` consistent with the existing prompt-body `lintPrompt` result type (so callers — ticket 006's CRUD save flow — can render violations in the same UI shape).

Note: the existing prompt-body `lintPrompt` already catches violations when the composed prompt's section 6 is assembled from a selected template (ticket 008). This new function is the CRUD-time complement that catches violations at template save, before any composer run.

### 2. Create `tools/manual-story-studio/test/prompt/beat-template-lint.test.ts`

Cover each of the five acceptance criteria with fixture templates that carry each denylist token in `beat_guidance.instruction`.

## Files to Touch

- `tools/manual-story-studio/src/prompt/lint.ts` (modify)
- `tools/manual-story-studio/test/prompt/beat-template-lint.test.ts` (new)

## Out of Scope

- The CRUD save flow that calls `lintBeatTemplateGuidance` — ticket 006.
- The composer-time prompt-body lint (existing SPEC-102 surface; runs over the composed body which includes section 6 with inlined template strings) — already in place, no change needed.
- The denylist content itself (the lint denylists are inherited verbatim from SPEC-102) — no change.

## Acceptance Criteria

### Tests That Must Pass

1. `lintBeatTemplateGuidance` against a clean fixture template returns `{ findings: [], blockingForCopy: false }`.
2. `lintBeatTemplateGuidance` against a fixture with `beat_guidance[0].instruction = "advance PG-2 to next scene"` returns a soft-tier finding citing `ENGINE_JARGON_DENYLIST` for `PG-`.
3. `lintBeatTemplateGuidance` against a fixture with `beat_guidance[0].instruction = "the actor in mchar-7 should respond"` returns a soft-tier finding citing `INTERNAL_ID_REGEX` for `mchar-7`.
4. `lintBeatTemplateGuidance` against a fixture with `beat_guidance[0].instruction = "use submit_patch_plan to save"` returns a soft-tier finding citing `SCHEMA_VALIDATOR_DENYLIST` for `submit_patch_plan`.
5. `lintBeatTemplateGuidance` against a fixture with `beat_guidance[0].instruction` containing a narrator-voice record-class phrase returns a soft-tier finding citing `RECORD_CLASS_NARRATOR_PHRASES`.
6. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/prompt/beat-template-lint.test.js"` succeeds.

### Invariants

1. The four lint surfaces (`ENGINE_JARGON_DENYLIST`, `SCHEMA_VALIDATOR_DENYLIST`, `INTERNAL_ID_REGEX`, `RECORD_CLASS_NARRATOR_PHRASES`) are the single source of truth — no parallel denylist content introduced.
2. All beat-template-lint findings are soft-tier (overridable per SPEC-102's discipline); hard-tier reservation stays for structural input-presence rules on the composed prompt body (directive present, content policy present verbatim, selected cast exists, selected records exist).
3. The CRUD-time lint and the composer-time prompt-body lint catch violations at two complementary surfaces; both surfaces reach the same denylist content via the same exported rules.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt/beat-template-lint.test.ts` (new) — covers each acceptance criterion using fixture beat templates with each denylist token in `beat_guidance.instruction`.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/prompt/beat-template-lint.test.js"` (targeted verification).
2. `cd tools/manual-story-studio && npm test` (full-pipeline verification).
3. The targeted command above is the correct verification boundary because this ticket's edits are scoped to the lint module + its new test file; integration with the CRUD save flow is covered by ticket 006's tests.
