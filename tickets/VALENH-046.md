# VALENH-046: Align §16a inline voice-authority template prose with validator acceptance

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` and/or `tools/validators/` parser/tests, depending on reassessment choice
**Deps**: `archive/tickets/VALENH-045.md`

## Problem

Post-review of `VALENH-045` found a same-seam working-tree edit in `.claude/skills/_shared-templates/story-state-contract.md` that clarifies the §16a voice-authority ambiguity but overstates the landed validator contract.

The template now says inline voice authority is accepted when phrased as either `Voice Bible` or `Voice/Dialogue Authority` inside `- Stable STCHAR seed used:` or `- Page-local projection:`. The validator landed by `VALENH-045` accepts inline `Voice Bible` only via `\bvoice\s+bible\b`; it does not accept inline `Voice/Dialogue Authority` unless it appears as the dedicated `- Voice/dialogue authority:` bullet. That leaves active authoring guidance broader than the machine validation signal.

## Assumption Reassessment (2026-05-25)

1. `archive/tickets/VALENH-045.md` completed the §16a parser relaxation and recorded that inline `Voice Bible` is the accepted non-dedicated-bullet signal. Its verification passed with `cd tools/validators && npm test` at 1033/1033 tests and the red-bunny receipt smoke at `summary.fail_count: 0`.
2. `.claude/skills/_shared-templates/story-state-contract.md` currently documents two inline examples, `Voice Bible` and `Voice/Dialogue Authority`, and states "The validator accepts either." That statement is broader than the current source.
3. `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` currently computes `hasVoiceBlock` from a non-empty dedicated `- Voice/dialogue authority:` bullet OR `/\bvoice\s+bible\b/i`. No current test proves inline `Voice/Dialogue Authority` without `Voice Bible`.
4. **Shared boundary under audit**: the §16a page-plan authoring contract and the structural validator's accepted voice-authority signal. The ticket must choose one canonical contract and make the template prose, parser, and focused regression tests agree.
5. **FOUNDATIONS principle**: Story-local character authority must remain machine-checkable at the §16a packet boundary. The fix must not weaken voice-required packet enforcement; voice-requiring labels with no accepted voice-authority signal must still fail.

## Architecture Check

1. The clean fix is to pick one acceptance contract and make producer guidance plus validator proof match it. Either narrow the template to inline `Voice Bible` only, or intentionally widen the validator to also accept inline `Voice/Dialogue Authority` with focused tests.
2. No backwards-compatibility aliasing should be added unless reassessment chooses `Voice/Dialogue Authority` as a deliberate equivalent authoring phrase and proves the negative path remains fail-closed.

## Verification Layers

1. Template/parser parity -> manual review of `.claude/skills/_shared-templates/story-state-contract.md` plus codebase grep-proof of the accepted inline phrase(s).
2. Voice-required enforcement remains fail-closed -> focused `page_plan_stchar_packet_integrity` regression test where voice-requiring labels without any accepted voice-authority signal still emit `missing_voice_block`.
3. Accepted inline signal works -> focused `page_plan_stchar_packet_integrity` regression test for whichever inline phrase(s) the final contract keeps.

## What to Change

### 1. Choose the canonical inline phrase boundary

During reassessment, decide whether the intended contract is:

- **Narrow template**: inline `Voice Bible` is the only non-dedicated-bullet signal; remove or reword `Voice/Dialogue Authority` as a descriptive section title rather than a validator-accepted inline phrase.
- **Widen validator**: inline `Voice/Dialogue Authority` is a deliberate equivalent phrase; update `hasVoiceBlock` and add positive and negative tests.

### 2. Align prose, parser, and tests

Patch only the surfaces required by the chosen boundary. Do not leave `.claude/skills/_shared-templates/story-state-contract.md` documenting an accepted phrase that the validator rejects, and do not widen the parser without documenting the accepted phrase.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify) — align §16a voice-authority prose to the selected parser contract.
- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (modify if widening validator) — accept the selected inline phrase(s).
- `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` (modify if widening validator or adding parity coverage) — prove accepted and rejected voice-authority shapes.

## Out of Scope

- Reopening `VALENH-045`; its implemented `Voice Bible` relaxation and receipt smoke proof remain valid.
- Restamping or editing red-bunny page plans or receipts.
- Broader bootstrap or turn-cycle emitter standardization beyond making their shared template guidance truthful.

## Acceptance Criteria

### Tests That Must Pass

1. Focused compiled validator test: `cd tools/validators && npm run build && node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js`.
2. If validator source changes, full validator package suite: `cd tools/validators && npm test`.
3. Manual review confirms `.claude/skills/_shared-templates/story-state-contract.md` no longer claims a validator-accepted inline phrase that `page_plan_stchar_packet_integrity` rejects.

### Invariants

1. Voice-requiring labels (`speaker`, `viewpoint`, `voice_shapes_page`) without any accepted voice-authority signal still fail with `page_plan_stchar_packet_integrity.missing_voice_block`.
2. The shared-template prose and validator implementation name the same accepted inline voice-authority signal(s).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` — add or adjust tests only if the selected contract requires parser behavior beyond the current `Voice Bible` coverage.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js`.
2. `cd tools/validators && npm test` if validator source changes.
3. Manual review / grep proof over `.claude/skills/_shared-templates/story-state-contract.md` and `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` for the accepted inline phrase(s).
