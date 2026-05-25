# VALENH-046: Align §16a inline voice-authority template prose with validator acceptance

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` contract prose only; validator parser/tests remain unchanged after reassessment
**Deps**: `archive/tickets/VALENH-045.md`

## Problem

At intake, post-review of `VALENH-045` found a same-seam working-tree edit in `.claude/skills/_shared-templates/story-state-contract.md` that clarified the §16a voice-authority ambiguity but overstated the landed validator contract.

Before this ticket, the template said inline voice authority was accepted when phrased as either `Voice Bible` or `Voice/Dialogue Authority` inside `- Stable STCHAR seed used:` or `- Page-local projection:`. The validator landed by `VALENH-045` accepts inline `Voice Bible` only via `\bvoice\s+bible\b`; it does not accept inline `Voice/Dialogue Authority` unless it appears as the dedicated `- Voice/dialogue authority:` bullet. That left active authoring guidance broader than the machine validation signal.

## Assumption Reassessment (2026-05-25)

1. `archive/tickets/VALENH-045.md` completed the §16a parser relaxation and recorded that inline `Voice Bible` is the accepted non-dedicated-bullet signal. Its verification passed with `cd tools/validators && npm test` at 1033/1033 tests and the red-bunny receipt smoke at `summary.fail_count: 0`.
2. At intake, `.claude/skills/_shared-templates/story-state-contract.md` documented two inline examples, `Voice Bible` and `Voice/Dialogue Authority`, and stated "The validator accepts either." That statement was broader than the current source.
3. `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` computes `hasVoiceBlock` from a non-empty dedicated `- Voice/dialogue authority:` bullet OR `/\bvoice\s+bible\b/i`. No test proves inline `Voice/Dialogue Authority` without `Voice Bible`, and this ticket intentionally did not add that parser synonym.
4. **Shared boundary under audit**: the §16a page-plan authoring contract and the structural validator's accepted voice-authority signal. The ticket chose one canonical contract and made the template prose, parser, and focused regression tests agree.
5. **FOUNDATIONS principle**: Story-local character authority must remain machine-checkable at the §16a packet boundary. The fix must not weaken voice-required packet enforcement; voice-requiring labels with no accepted voice-authority signal must still fail.
6. **Chosen boundary**: narrow the shared template to the validator contract already landed by `VALENH-045`: a non-empty dedicated `- Voice/dialogue authority:` bullet OR substantive inline `Voice Bible` phrasing. Do not widen the parser to accept bare inline `Voice/Dialogue Authority`, because the archived dependency did not establish that synonym as a machine-accepted non-dedicated-bullet signal and no current producer requires it.

## Architecture Check

1. The clean fix is to keep the already-proved parser contract and narrow the template prose to it. This restores producer guidance / validator parity without adding a new synonym.
2. No backwards-compatibility aliasing or extra parser synonym is introduced. The existing `Voice Bible` positive test and missing-voice-block negative tests remain the proof surface.

## Verification Layers

1. Template/parser parity -> manual review of `.claude/skills/_shared-templates/story-state-contract.md` plus grep-proof that current operational prose no longer claims bare inline `Voice/Dialogue Authority` is validator-accepted.
2. Voice-required enforcement remains fail-closed -> focused `page_plan_stchar_packet_integrity` regression tests where voice-requiring labels without any accepted voice-authority signal still emit `missing_voice_block`.
3. Accepted inline signal works -> focused `page_plan_stchar_packet_integrity` regression test for inline `Voice Bible`.

## Landed Changes

### 1. Canonical inline phrase boundary

Narrowed the template: inline `Voice Bible` is the only non-dedicated-bullet signal. `Voice/Dialogue Authority` remains valid as the name of the STCHAR profile section and as part of the dedicated `- Voice/dialogue authority:` bullet, but not as a bare inline validator synonym.

### 2. Prose alignment with parser and tests

Patched the shared template prose only. `.claude/skills/_shared-templates/story-state-contract.md` no longer documents bare inline `Voice/Dialogue Authority` as a validator-accepted phrase that `page_plan_stchar_packet_integrity` rejects.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify) — align §16a voice-authority prose to the selected parser contract.
- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (inspect, no modify) — keep existing `Voice Bible` parser contract.
- `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` (inspect, no modify) — reuse existing inline `Voice Bible` positive and no-voice negative coverage.

## Out of Scope

- Reopening `VALENH-045`; its implemented `Voice Bible` relaxation and receipt smoke proof remain valid.
- Restamping or editing red-bunny page plans or receipts.
- Broader bootstrap or turn-cycle emitter standardization beyond making their shared template guidance truthful.

## Acceptance Criteria

### Tests That Must Pass

1. Focused compiled validator test: `cd tools/validators && npm run build && node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js`.
2. Manual review confirms `.claude/skills/_shared-templates/story-state-contract.md` no longer claims a validator-accepted inline phrase that `page_plan_stchar_packet_integrity` rejects.
3. Full validator package suite is not required because validator source/tests were unchanged after reassessment.

### Invariants

1. Voice-requiring labels (`speaker`, `viewpoint`, `voice_shapes_page`) without any accepted voice-authority signal still fail with `page_plan_stchar_packet_integrity.missing_voice_block`.
2. The shared-template prose and validator implementation name the same accepted inline voice-authority signal: `Voice Bible`.

## Test Plan

### New/Modified Tests

1. None — the selected contract keeps the existing parser behavior and existing focused tests for inline `Voice Bible` plus missing voice authority.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js`.
2. Manual review / grep proof over `.claude/skills/_shared-templates/story-state-contract.md` and `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` for the accepted inline phrase.

## Outcome

Completion date: 2026-05-25.

Completed. `.claude/skills/_shared-templates/story-state-contract.md` now matches the `VALENH-045` parser contract: voice-requiring §16a packets may satisfy voice authority with either a non-empty dedicated `- Voice/dialogue authority:` bullet or substantive inline `Voice Bible` phrasing in `- Stable STCHAR seed used:` / `- Page-local projection:`. The parser and tests were inspected but not modified.

Package README/docs/examples were inspected for same-seam public-surface drift; `tools/validators/README.md` only inventories the validator name and does not describe the inline voice-authority phrase contract.

## Verification Result

1. `cd tools/validators && npm run build` — PASS.
2. `cd tools/validators && node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js` — PASS, 26/26 tests.
3. `rg -n 'Voice authority is contract-conformant|validator accepts either|Voice/Dialogue Authority' .claude/skills/_shared-templates/story-state-contract.md` — PASS; no stale `Voice/Dialogue Authority` or `validator accepts either` claim remains in the shared template, and the remaining hit is the updated contract line naming dedicated `Voice/dialogue authority:` plus inline `Voice Bible`.
4. Manual review of `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` and `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` — PASS; `hasVoiceBlock` still accepts the dedicated bullet or `/\bvoice\s+bible\b/i`, and the focused test file still covers inline `Voice Bible` acceptance plus missing voice-authority failures.
5. `git diff --check -- .claude/skills/_shared-templates/story-state-contract.md archive/tickets/VALENH-046.md` — PASS after archival path repair.

## Deviations

- Reassessment selected the narrow-template option. No validator source or test edits were needed, so the full `cd tools/validators && npm test` suite was not run for this prose-only contract alignment.
- The grep/manual-review proof intentionally treats `Voice Bible / Dialogue Authority` in the existing focused test fixture as valid because the accepted inline signal is the `Voice Bible` token inside that phrase, not bare inline `Voice/Dialogue Authority`.
