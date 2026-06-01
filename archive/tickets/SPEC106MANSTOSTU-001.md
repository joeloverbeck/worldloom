# SPEC106MANSTOSTU-001: Promote four leakage rules to hard tier

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` lint module (`src/prompt/lint.ts`), Manual Studio prose-craft prompt contract, and three test surfaces (`test/prompt-lint.test.ts`, `test/prompt/beat-template-lint.test.ts`, `test/prompt-compose.test.ts`).
**Deps**: None

## Problem

`tools/manual-story-studio/src/prompt/lint.ts` currently emits `no_internal_record_ids`, `no_engine_jargon`, `no_schema_validator_terms`, and `no_record_class_narrator_voice` at `tier: "soft"` (lines 211-215, 229-235, 247-252, 264-269 for the main lint; lines 309-314, 324-329, 336-342, 347-352 for the beat-template scan helper). The Prompt Preview page treats soft findings as author-judgment warnings and exposes a "copy anyway" override; in practice an external-LLM packet must never carry these surfaces, so the soft tier is the wrong choice for them. The four leakage rules are architectural denials, not stylistic warnings — they must hard-block clipboard copy and save. The beat-template scan helper additionally hardcodes `blockingForCopy: false` at line 359; its API must stay self-consistent with the main lint after the promotion.

## Assumption Reassessment (2026-06-01)

1. Codebase: the 8 emission sites are exhaustively at `tools/manual-story-studio/src/prompt/lint.ts` lines 211 / 230 / 248 / 265 (main `lintPrompt`) and 310 / 325 / 337 / 348 (`lintBeatTemplateGuidance`), with `tier: "soft"` on the immediately-following line (212 / 231 / 249 / 266 / 311 / 326 / 338 / 349). A repo-wide grep (`grep -rn 'rule: "no_internal_record_ids"\|rule: "no_engine_jargon"\|rule: "no_schema_validator_terms"\|rule: "no_record_class_narrator_voice"' tools/manual-story-studio/src/`) confirms no additional source-side emission sites.
2. Spec: `specs/SPEC-106-manual-story-studio-prompt-leakage-hard-tier.md` §2.1 + §4 + §3 *Beat-template scan helper mirrors main-lint discipline* — line citations match the codebase exactly.
3. Cross-skill boundary: the external-LLM prompt clipboard surface. `lintPrompt` and `lintBeatTemplateGuidance` both export `PromptLintResult.blockingForCopy`, consumed by `web/src/pages/PromptPreview.tsx:154/160` (`disabled={lint.blockingForCopy}`) and by `src/server/routes/prompts.ts:324` (`if (result.lint.blockingForCopy ...)`). Tier symmetry between the two helpers is a hard API contract.
4. FOUNDATIONS: Rule 2 (No Pure Cosmetics) and §Tooling Recommendation (least-agency LLM packets, "agents never operate on prose alone"). Leakage of internal IDs, engine jargon, schema/validator terms, or record-class narrator voice into the external prompt is structurally meaningless to the LLM and dangerous to the prose — soft tier is the cosmetic-warning gap; hard tier denies-by-default at the boundary.

## Architecture Check

1. The tier change is local to `lint.ts` plus the two test surfaces. UI behavior (Copy/Save disabled) and route behavior (`409 lint_blocks_save`) both already derive from `findings.some(f => f.tier === "hard")` — flipping the tier literal automatically cascades through the existing infrastructure. No new disable flags, no new gating logic.
2. `lintBeatTemplateGuidance` at line 359 currently hardcodes `blockingForCopy: false`; flipping to the same derivation as `lintPrompt` (line 289 — `findings.some((f) => f.tier === "hard")`) keeps the helper's API self-consistent after the promotion. No backwards-compatibility shims or alias paths introduced.

## Verification Layers

1. Soft tier vanishes from `lint.ts` → codebase grep: `grep -n 'tier: "soft"' tools/manual-story-studio/src/prompt/lint.ts` returns zero matches.
2. Each of the four rules emits `tier: "hard"` → acceptance test in `tools/manual-story-studio/test/prompt-lint.test.ts` (the existing rule 5 / 6 / 7 / 8 tests flipped from `tier === "soft"` to `tier === "hard"` and `blockingForCopy` from `false` to `true`).
3. Beat-template helper symmetry → acceptance test in `tools/manual-story-studio/test/prompt/beat-template-lint.test.ts` (existing lines 39/50/61/70 flipped; line 79's "never produces hard findings" test rewritten as a positive `blockingForCopy === true` guard).
4. UI behavior unchanged in source (tier flip cascades through the existing `disabled={lint.blockingForCopy}` discipline) → `cd tools/manual-story-studio && npm test` runs both backend tests and the web `tsc --noEmit`; both must pass green.

## What to Change

### 1. `tools/manual-story-studio/src/prompt/lint.ts` — main lint tier flips

Flip the four emission sites at lines 212 / 231 / 249 / 266 from `tier: "soft" as const,` (line 212) / `tier: "soft",` (lines 231 / 249 / 266) to `tier: "hard"` (drop the `as const` cast on line 212 since the literal already narrows correctly under the `PromptLintTier` union).

### 2. `tools/manual-story-studio/src/prompt/lint.ts` — beat-template scan helper tier flips + blockingForCopy derivation

Flip the four emission sites at lines 311 / 326 / 338 / 349 from `tier: "soft",` to `tier: "hard",`. Flip line 359 from `blockingForCopy: false,` to `blockingForCopy: findings.some((f) => f.tier === "hard"),` (mirrors line 289 in `lintPrompt`).

### 3. `tools/manual-story-studio/src/prompt/lint.ts` — header comment update

Replace the SPEC-102 4/4 documentation at lines 1-15 with a SPEC-106 note: 8 hard rules across both helpers; soft tier reserved for quality warnings (deferred to SPEC-111) or kept empty until then. Preserve the "Pure function" closing remark on lines 15-16.

### 4. `tools/manual-story-studio/test/prompt-lint.test.ts` — flip rule 5/6/7/8 assertions

Update the four existing "soft finding" tests at the rules-5-through-8 block:
- "rule 5: internal id leak ... → soft finding" → assert `f.tier === "hard"` and `result.blockingForCopy === true`.
- "rule 6: engine jargon ... → soft finding" → assert `f.tier === "hard"` (drop the explicit `tier === "soft"` literal).
- "rule 7: schema/validator term → soft finding" → assert `f.tier === "hard"`.
- "rule 8: record-class narrator-voice phrase → soft finding" → assert `f.tier === "hard"`.

Rewrite the "blockingForCopy is true iff any finding has tier=hard" test (currently using soft-only fixture) so the assertion remains structurally correct under the new tier distribution: the `onlySoft` half must use a fixture that produces no leakage hits (or remove the half entirely if no soft-tier rule remains in this spec's scope). Acceptable rewrite: replace the `onlySoft` half with a "clean fixture has `blockingForCopy === false`" check (already covered by the first test, so the half may be removed) and tighten the `hardPlus` half to assert that *any* of the four newly-promoted rules also flips `blockingForCopy` to `true`.

Per the spec §6 acceptance criterion *"all eight existing hard-tier tests (the four original plus the four newly-promoted) collectively assert `blockingForCopy === true` and `cleanForCopy === false`"*, add or extend assertions in each promoted-rule test to cover both flags.

### 5. `tools/manual-story-studio/test/prompt/beat-template-lint.test.ts` — flip lines 39/50/61/70; retire line 79

Update the four beat-template scan tests at lines 39 / 50 / 61 / 70: flip `tier === "soft"` assertions to `tier === "hard"`. Replace the line-79 test ("lintBeatTemplateGuidance: never produces hard findings (override always works)") with a positive guard: with any leakage surface in `beat_guidance.instruction`, the helper returns `blockingForCopy === true` and at least one finding at `tier === "hard"`. Add a Rule-6 retcon comment naming SPEC-106 as the source of the change.

## Files to Touch

- `tools/manual-story-studio/src/prompt/lint.ts` (modify)
- `tools/manual-story-studio/test/prompt-lint.test.ts` (modify)
- `tools/manual-story-studio/test/prompt/beat-template-lint.test.ts` (modify)
- `docs/manual-story-studio/prose-craft-contract.md` (modify — same-seam proof fallout: remove raw denylist terms from the fixed §13 prompt contract)
- `tools/manual-story-studio/test/prompt-compose.test.ts` (modify — regression guard that a clean composed prompt has no hard lint findings)

## Out of Scope

- Denylist content changes (`ENGINE_JARGON_DENYLIST`, `SCHEMA_VALIDATOR_DENYLIST`, `RECORD_CLASS_NARRATOR_PHRASES`, `INTERNAL_ID_REGEX`) — out of scope per spec §2 Out of scope.
- New soft-tier quality rules (prompt-too-long, weak-directive, too-many-records) — deferred to SPEC-111.
- The `recent_segment_required_but_unavailable` rule — covered by `archive/tickets/SPEC106MANSTOSTU-002.md`.
- `lint_override` write-path removal (backend) — covered by `archive/tickets/SPEC106MANSTOSTU-003.md`.
- `lint_override` clipboard-override path removal (frontend) — covered by `archive/tickets/SPEC106MANSTOSTU-004.md`.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'tier: "soft"' tools/manual-story-studio/src/prompt/lint.ts` returns zero matches.
2. The four newly-promoted rule tests in `tools/manual-story-studio/test/prompt-lint.test.ts` each assert `f.tier === "hard"` and that `blockingForCopy === true` and `cleanForCopy === false` when the rule fires.
3. `tools/manual-story-studio/test/prompt/beat-template-lint.test.ts` lines 39/50/61/70 assert `tier === "hard"`; the rewritten line-79 test asserts `blockingForCopy === true` when leakage is present.
4. `cd tools/manual-story-studio && npm test` is green.

### Invariants

1. `lintPrompt` and `lintBeatTemplateGuidance` derive `blockingForCopy` identically: `findings.some((f) => f.tier === "hard")`.
2. The denylist contents are unchanged (ENGINE_JARGON_DENYLIST.length === 44, SCHEMA_VALIDATOR_DENYLIST.length === 15, RECORD_CLASS_NARRATOR_PHRASES.length === 10).

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt-lint.test.ts` (modify) — flip the four rule-5-through-8 soft-tier assertions to hard-tier; extend assertions to cover `blockingForCopy` and `cleanForCopy` per spec §6 AC.
2. `tools/manual-story-studio/test/prompt/beat-template-lint.test.ts` (modify) — flip four soft assertions to hard; rewrite the line-79 "never hard" test as a positive `blockingForCopy === true` guard.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `grep -n 'tier: "soft"' tools/manual-story-studio/src/prompt/lint.ts` (must return zero matches)
3. The package's `npm test` is the correct verification boundary — it runs `npm run build:backend && node --test "dist/test/**/*.test.js" && npm --prefix web test`, which covers backend tests AND the web `tsc -p tsconfig.json --noEmit` typecheck; this ticket's changes are backend-only but the web step is included in the same script and stays green incidentally.

## Outcome

Completed: 2026-06-01

The four prompt-leakage rules now emit `tier: "hard"` from both `lintPrompt` and `lintBeatTemplateGuidance`. `lintBeatTemplateGuidance` now derives `blockingForCopy` with the same `findings.some((f) => f.tier === "hard")` predicate as the main prompt lint, and the lint module header documents the SPEC-106 8-hard-rule posture with soft tier reserved for future quality warnings.

Updated tests in `tools/manual-story-studio/test/prompt-lint.test.ts` and `tools/manual-story-studio/test/prompt/beat-template-lint.test.ts` assert hard-tier findings, `blockingForCopy === true`, and `cleanForCopy === false` for the promoted leakage surfaces.

Full package proof exposed same-seam fallout: the fixed Manual Studio §13 prose-craft contract itself contained raw denylist terms (`validator`, `supersession`) and therefore self-blocked otherwise clean prompt saves after the tier promotion. `docs/manual-story-studio/prose-craft-contract.md` now expresses the same rule without those raw terms, and `tools/manual-story-studio/test/prompt-compose.test.ts` asserts a clean composed prompt has no lint findings.

Verification:

1. `cd tools/manual-story-studio && npm test` — green before implementation baseline.
2. `cd tools/manual-story-studio && npm run build:backend` — green after implementation.
3. `cd tools/manual-story-studio && node --test dist/test/prompt-lint.test.js dist/test/prompt/beat-template-lint.test.js` — green, 20 tests passed after implementation.
4. `grep -n 'tier: "soft"' tools/manual-story-studio/src/prompt/lint.ts` — zero matches after implementation.
5. `rg -n 'validator|supersession|patch_plan|submit_patch_plan|state_snapshot|validation_trace|append_only|schema_version|record_version|provenance.origin|bootstrap|mystery_policy|superseded|state_delta|state_hash' docs/manual-story-studio/prose-craft-contract.md` — zero matches after same-seam contract cleanup.
6. `cd tools/manual-story-studio && npm run build:backend` — green after same-seam contract cleanup.
7. `cd tools/manual-story-studio && node --test dist/test/prompt-lint.test.js dist/test/prompt/beat-template-lint.test.js dist/test/prompt-compose.test.js dist/test/capstone-spec103.test.js dist/test/capstone-spec104.test.js` — green, 38 tests passed after same-seam contract cleanup.
8. `cd tools/manual-story-studio && npm test` — green after same-seam contract cleanup; 382 backend tests passed and web `tsc --noEmit` passed.
9. `git diff --check` — clean.

Deviations: the full package suite initially failed in SPEC-103/SPEC-104 capstone save paths with `409 lint_blocks_save` because the fixed Manual Studio §13 contract contained newly hard-denied raw terms. This was treated as same-seam fallout and repaired in this ticket because a clean composed prompt must remain copyable under the promoted hard-tier rules.
