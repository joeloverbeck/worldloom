# SPEC106MANSTOSTU-002: Add recent_segment_required_but_unavailable hard rule

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` lint module (`src/prompt/lint.ts`), composer (`src/prompt/compose.ts`), default metadata writer, and prompt lint/compose/metadata test surfaces (`test/prompt-lint.test.ts`, `test/prompt-compose.test.ts`, `test/write/manual-story-metadata.test.ts`).
**Deps**: None

## Problem

Manual stories whose `prompt_policy.include_recent_segments > 0` (per `tools/manual-story-studio/src/schema/manual-story.ts:71`) currently fall through to an empty `## Recent Prose` section when the composer's `loadRecentSegmentLastParagraph` helper (`tools/manual-story-studio/src/prompt/compose.ts:354-392`) returns `null` (segments directory missing, no `SEG-<n>.md` files, file unreadable, or no paragraphs after parse). No lint finding fires for this case — the prompt silently ships to the external LLM with the recent-prose section absent under a policy that required it. Per SPEC-106 §2.5 and the report §26 finding (*"Recent segment unavailable: hard if policy requires it, soft if optional"*), the lint must emit a new `recent_segment_required_but_unavailable` finding at `hard` tier when `include_recent_segments > 0` and the composer's segment-availability check yields `null`. When `include_recent_segments === 0`, no finding is emitted for this surface.

## Assumption Reassessment (2026-06-01)

1. Codebase: `loadRecentSegmentLastParagraph` at `tools/manual-story-studio/src/prompt/compose.ts:354-392` returns `null` on every failure path (`!Number.isFinite`, segments dir missing, `readdirSync` throws, no `SEG-\d+\.md` files, file is not a regular file, `readFileSync` throws, no paragraphs after parse). Live drift from the draft: `PromptLintInput` is defined in `tools/manual-story-studio/src/prompt/lint.ts` (not `src/prompt/types.ts`) and currently has no `prompt_policy` or `latest_segment_available` field. `ManualStoryPromptPolicy.include_recent_segments` is defined at `tools/manual-story-studio/src/schema/manual-story.ts:71`.
2. Spec: `archive/specs/SPEC-106-manual-story-studio-prompt-leakage-hard-tier.md` §2.5 + §4 *Files to touch* — `PromptLintInput` extension and `compose.ts` thread are accurately scoped.
3. Cross-skill boundary: composer → lint shared input shape. The composer already calls `loadRecentSegmentLastParagraph` for the recent-prose section emission, so the boolean availability fact is already computed inside `compose.ts` at no extra cost; the change is to thread that boolean plus the relevant policy slice into the lint call.
4. FOUNDATIONS: Rule 2 (No Pure Cosmetics). Missing recent prose under a positive `include_recent_segments` policy is structurally meaningful to the prompt's intent (the author's policy says "include N segments") — silent fallthrough is a cosmetic-warning gap; hard-tier denial closes it.
5. Schema extension: `PromptLintInput` (interface at `tools/manual-story-studio/src/prompt/lint.ts`) is extended additively with two new required fields: `latest_segment_available: boolean` and `prompt_policy: Pick<ManualStoryPromptPolicy, "include_recent_segments">`. Consumers: a single production call site in `src/prompt/compose.ts` plus `test/prompt-lint.test.ts`. The extension is breaking for any direct external caller of `lintPrompt`, but `lintPrompt` has no external consumer (it is package-internal; routes call `composePrompt`, which calls `lintPrompt` internally). Tests `baseInput()` factory updated to default both fields.
6. Same-seam default-policy fallout: `makeDefaultManualStoryMetadata` currently defaults `prompt_policy.include_recent_segments` to `1`. Once positive policy hard-blocks when no segment is available, that default makes a brand-new Manual Story unable to save its first prompt. The default policy must be `0` so first-prompt workflows stay copyable; explicit positive policy still opts into the hard requirement.

## Architecture Check

1. The new rule's emission lives next to the four existing hard checks in `lint.ts`, reusing the existing `PromptLintFinding` shape and the existing `findings.some(f => f.tier === "hard")` derivation for `blockingForCopy`. The composer's existing segment-discovery work is reused (no second `existsSync`/`readdirSync` call in lint).
2. No backwards-compatibility shims: both new `PromptLintInput` fields are required; the single internal call site in `compose.ts` is updated in lockstep. No optional-with-default workaround.

## Verification Layers

1. `recent_segment_required_but_unavailable` fires under policy + missing segments → acceptance test asserting one finding at `tier === "hard"` with `result.blockingForCopy === true`.
2. `include_recent_segments === 0` never fires the rule → acceptance test asserting no finding for the recent-segment surface even when segments are absent.
3. `PromptLintInput` extension is typesafe end-to-end → `cd tools/manual-story-studio && npm test` runs the backend `tsc` build before tests; type errors surface there.
4. Composer thread is correct → an integration-shaped assertion in `prompt-lint.test.ts` exercises `lintPrompt` with the new fields directly; the composer's own test surface (`prompt-compose.test.ts`, if it asserts on lint findings) inherits the behavior automatically once the call-site signature is updated.

## What to Change

### 1. `tools/manual-story-studio/src/prompt/lint.ts` — extend `PromptLintInput`

Add two new required fields to the live `PromptLintInput` interface:

```
latest_segment_available: boolean;
prompt_policy: Pick<ManualStoryPromptPolicy, "include_recent_segments">;
```

Import `ManualStoryPromptPolicy` from `../schema/manual-story.js` at the top of `lint.ts`.

### 2. `tools/manual-story-studio/src/prompt/lint.ts` — add `checkRecentSegmentAvailability`

Add a new check function alongside the existing eight:

```
function checkRecentSegmentAvailability(
  input: PromptLintInput,
): PromptLintFinding[] {
  if (input.prompt_policy.include_recent_segments <= 0) return [];
  if (input.latest_segment_available) return [];
  return [
    {
      rule: "recent_segment_required_but_unavailable",
      tier: "hard",
      message:
        "prompt_policy.include_recent_segments > 0 but no recent segment was available to render.",
      section: "§3 Current Situation",
    },
  ];
}
```

Add a spread call into the `lintPrompt` `findings` array (currently at lines 276-285) alongside the existing eight check spreads:

```
...checkRecentSegmentAvailability(input),
```

(Position after `checkNoRecordClassNarratorVoice(input)` to keep the hard-tier rules grouped logically.)

### 3. `tools/manual-story-studio/src/prompt/compose.ts` — thread new fields into `lintPrompt`

Update the `lintPrompt(...)` call site to pass `latest_segment_available` (derived from the composer's existing `loadRecentSegmentLastParagraph` return value — `latest_segment_available = recent_segment_last_paragraph !== null`) and `prompt_policy: { include_recent_segments: metadata.prompt_policy.include_recent_segments }`. The composer already reads `metadata` to access `prompt_policy.include_recent_segments` for the recent-prose section; reuse that read.

### 4. `tools/manual-story-studio/test/prompt-lint.test.ts` — extend `baseInput()` and add four new cases

Update the `baseInput()` factory (currently at lines 37-48) to default `latest_segment_available: true` and `prompt_policy: { include_recent_segments: 0 }` so existing tests stay green under the type extension. Add four new test cases covering the matrix:

- `include_recent_segments: 1` with `latest_segment_available: false` → asserts one finding with `rule === "recent_segment_required_but_unavailable"` and `tier === "hard"`, and `result.blockingForCopy === true`.
- `include_recent_segments: 0` with `latest_segment_available: false` → asserts no `recent_segment_required_but_unavailable` finding.
- `include_recent_segments: 2` with `latest_segment_available: true` → asserts no finding for this surface (positive policy, segments available).
- `include_recent_segments: 0` with `latest_segment_available: true` → asserts no finding for this surface (negative policy, segments available).

### 5. `tools/manual-story-studio/src/write/manual-story-metadata.ts` — default recent segments to optional

Change `makeDefaultManualStoryMetadata(...).prompt_policy.include_recent_segments` from `1` to `0` so a new Manual Story can save its first prompt before any segment exists. Keep explicit positive policy as the hard requirement.

## Files to Touch

- `tools/manual-story-studio/src/prompt/lint.ts` (modify)
- `tools/manual-story-studio/src/prompt/compose.ts` (modify)
- `tools/manual-story-studio/src/write/manual-story-metadata.ts` (modify)
- `tools/manual-story-studio/test/prompt-lint.test.ts` (modify)
- `tools/manual-story-studio/test/prompt-compose.test.ts` (modify — composer-thread regression guard)
- `tools/manual-story-studio/test/write/manual-story-metadata.test.ts` (modify — default policy regression guard)

## Out of Scope

- Other soft-tier quality rules from the report §26 lint table (Overlong prompt, Weak directive, Too many selected records) — deferred to SPEC-111 per spec §3 *Key decisions*.
- Denylist content changes — out of scope per SPEC-106 §2 Out of scope.
- Tier flips for the four leakage rules — covered by `archive/tickets/SPEC106MANSTOSTU-001.md`.
- `lint_override` write-path removal — covered by `archive/tickets/SPEC106MANSTOSTU-003.md` (backend) and `archive/tickets/SPEC106MANSTOSTU-004.md` (frontend).

## Acceptance Criteria

### Tests That Must Pass

1. The new test "`include_recent_segments: 1` + no segments → hard finding" passes: one `recent_segment_required_but_unavailable` finding at `tier === "hard"` and `result.blockingForCopy === true`.
2. The new test "`include_recent_segments: 0` + no segments → no recent-segment finding" passes: zero findings for the `recent_segment_required_but_unavailable` rule.
3. All existing `prompt-lint.test.ts` assertions continue to pass under the `PromptLintInput` extension (the `baseInput()` factory defaults the two new fields correctly).
4. `cd tools/manual-story-studio && npm test` is green.

### Invariants

1. `recent_segment_required_but_unavailable` is only emitted when `prompt_policy.include_recent_segments > 0` AND `latest_segment_available === false`.
2. `PromptLintInput.latest_segment_available` is the boolean image of `loadRecentSegmentLastParagraph(...) !== null` — the composer's existing segment-discovery work, reused.
3. New Manual Story metadata defaults `include_recent_segments` to `0`; authors opt into required recent prose by setting a positive value.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt-lint.test.ts` (modify) — extend `baseInput()` factory; add four new test cases for the policy × segments matrix.
2. `tools/manual-story-studio/test/prompt-compose.test.ts` (modify) — assert a composed prompt with `include_recent_segments > 0` and no segment files emits the new hard finding, proving the composer threads the availability boolean into lint.
3. `tools/manual-story-studio/test/write/manual-story-metadata.test.ts` (modify) — assert default metadata keeps `include_recent_segments === 0`.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. The package's `npm test` is the correct verification boundary — backend build + node --test + web tsc cover the entire change surface; no narrower command is needed.

## Outcome

Completed: 2026-06-01

Implemented `recent_segment_required_but_unavailable` as a hard lint finding. `lintPrompt` now receives `prompt_policy.include_recent_segments` and `latest_segment_available`, and `composePrompt` threads the boolean image of `loadRecentSegmentLastParagraph(...) !== null` into lint.

Same-seam reassessment corrected the drafted `PromptLintInput` path: the interface lives in `tools/manual-story-studio/src/prompt/lint.ts`, not `src/prompt/types.ts`. Full-suite proof also exposed a default-policy issue: new Manual Story metadata defaulted `include_recent_segments` to `1`, which would block the first prompt before any segment exists. The default is now `0`; explicit positive policy still opts into the hard requirement.

Updated tests cover the direct lint policy matrix, composer-thread behavior, and the first-prompt-safe default metadata policy.

Verification:

1. `cd tools/manual-story-studio && npm run build:backend` — green.
2. `cd tools/manual-story-studio && node --test dist/test/prompt-lint.test.js dist/test/prompt-compose.test.js` — green, 26 tests passed.
3. `cd tools/manual-story-studio && node --test dist/test/prompt-lint.test.js dist/test/prompt-compose.test.js dist/test/write/manual-story-metadata.test.js dist/test/capstone-spec103.test.js dist/test/capstone-spec104.test.js` — green, 41 tests passed.
4. `cd tools/manual-story-studio && npm test` — green; 387 backend tests passed and web `tsc --noEmit` passed.
5. `git diff --check` — clean.

Deviations: the ticket originally named `src/prompt/types.ts` as the `PromptLintInput` owner; live code places the interface in `src/prompt/lint.ts`. The implementation follows the live path. The default metadata change was added as same-seam fallout so the new hard rule does not make the first prompt of a new Manual Story impossible to save.
