# PEENH-013: Correct story-skill `approval_replayed` prose to token-hash semantics

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/commitment-block-authoring/SKILL.md` (skill prose truthing only; no patch-engine runtime change).
**Deps**: `archive/tickets/PEENH-012.md` (the completed engine-side recovery hint for `approval_replayed`).

## Problem

At intake, post-ticket review for PEENH-012 found uncommitted edits in three story-skill HARD-GATE submit sections that tried to warn operators not to infer submit status from tail-truncated CLI output, but their last sentence gave the wrong replay mechanism:

> A submit that succeeded but whose success header was missed will return `approval_replayed` on the next submit attempt with a freshly-signed token, because the engine's replay gate is keyed on patch-hashes-already-applied rather than on token uniqueness.

The intake hit set was:

- `.claude/skills/branching-story-bootstrap/SKILL.md` Phase 10 step 5
- `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 10 step 5
- `.claude/skills/commitment-block-authoring/SKILL.md` Phase 6 step 5

Live code did not match that claim. `tools/patch-engine/src/approval/verify-token.ts` computes `tokenHash = sha256Hex(token)` and checks `approval_tokens_consumed WHERE token_hash = ?`; it does not check whether the patch hashes have already applied. The signing CLI in `tools/world-mcp/src/cli/sign-approval-token.ts` includes `issued_at` and `expires_at` in the signed payload, so a later freshly signed token for the same envelope is a different token string and therefore a different token hash.

The operational advice now still says not to resubmit blindly after missing the success header, but it no longer teaches a false engine invariant. A true fresh-token resubmit of an already-applied plan is described as unsafe and likely to hit later engine/write protections or duplicate-record/id-allocation failures, not as the `approval_replayed` token-consumption gate.

## Assumption Reassessment (2026-05-17)

1. **Live replay verifier authority** — `tools/patch-engine/src/approval/verify-token.ts` verifies patch-hash correspondence before replay, then computes `sha256Hex(token)` and checks `approval_tokens_consumed.token_hash`. The replay gate is token-string consumption, not an already-applied-patch-hash ledger.
2. **Live signer authority** — `tools/world-mcp/src/cli/sign-approval-token.ts` signs `plan_id`, `world_slug`, `patch_hashes`, `issued_at`, and `expires_at`; a token reissued later over the same envelope can differ because issuance timestamps differ.
3. **Shared boundary under audit** — the three dirty skill sections named above are operator-facing HARD-GATE submit guidance. They must align with `docs/HARD-GATE-DISCIPLINE.md` §Approval token discipline and PEENH-012's engine-side hint without inventing a different replay mechanism.
4. **FOUNDATIONS / gate principle** — HARD-GATE recovery prose must preserve append-only canon discipline by telling operators to inspect the target world after uncertain submit output, not to re-submit until they understand whether the approved plan already applied.
5. **Adjacent contradiction classification** — the newly exposed issue is separate skill-prose drift, not unfinished PEENH-012 engine work. PEENH-012 correctly landed the engine hint; this ticket owns the story-skill wording that currently overstates the replay mechanism.
6. **Claude Code edit reassessment** — the Claude Code additions warning that tail-truncated CLI output can hide the top-level submit `ok` status are directionally correct and were preserved. Only the final explanatory sentence was faulty: it described a fresh-token replay keyed on patch hashes rather than the live token-hash single-use gate.

## Architecture Check

1. Correcting the prose in the skill is cleaner than changing patch-engine behavior: the engine's token-hash replay gate is already documented and tested, and changing it to patch-hash replay would be a runtime contract change with broader consequences.
2. No backwards-compatibility aliases or shims. This is a wording correction only.

## Verification Layers

1. Skill prose matches live verifier semantics -> manual review of the three named skill sections against `tools/patch-engine/src/approval/verify-token.ts`.
2. No false patch-hash replay claim remains in current operational surfaces -> grep proof over the three named skill files for `patch-hashes-already-applied` and `freshly-signed token`.
3. HARD-GATE recovery guidance remains conservative -> manual review against `docs/HARD-GATE-DISCIPLINE.md` §Approval token discipline and §Validating and submitting the plan.

## Landed Changes

### 1. Truth the story-skill replay wording

Replaced the false "freshly-signed token" / "patch-hashes-already-applied" explanation in all three named skill sections with wording that says:

- inspect the top-level CLI JSON status before deciding whether submit succeeded
- do not re-run a submit just to inspect a lost receipt
- reusing the same consumed token returns `approval_replayed`
- if the first submit may have succeeded, inspect the target story `_source/` records and receipt/log output before any further submit attempt
- a genuinely fresh token over an already-applied plan is not the replay gate and should still be avoided because it can attempt a duplicate write or hit later engine protections

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)

## Out of Scope

- Changing patch-engine replay semantics.
- Adding new `approval_replayed` tests; PEENH-012 already covers verifier and submit-path detail forwarding.
- Editing other skills unless reassessment finds they contain the same false "patch-hashes-already-applied" replay claim.

## Acceptance Criteria

### Tests That Must Pass

1. Manual review confirms the three named skill sections no longer claim `approval_replayed` is keyed on already-applied patch hashes.
2. `rg -n 'patch-hashes-already-applied|freshly-signed token' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md` returns no current operational false replay claim.
3. `git diff --check -- .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md archive/tickets/PEENH-013.md` passes, with untracked-ticket coverage handled explicitly while the archived ticket remains untracked.

### Invariants

1. Skill guidance must preserve HARD-GATE discipline: uncertain submit status means inspect evidence, not blindly resubmit.
2. Skill guidance must not contradict `verify-token.ts` token-hash replay semantics.

## Test Plan

### New/Modified Tests

1. None — skill-prose correction; verification is manual review plus grep/hygiene.

### Commands

1. `rg -n 'patch-hashes-already-applied|freshly-signed token' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md`
2. `git diff --check -- .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md archive/tickets/PEENH-013.md`

## Outcome

PEENH-013 is implemented. The three story-skill HARD-GATE submit sections keep the valid CLI-output warning from the Claude Code edits, but no longer claim that `approval_replayed` is keyed on already-applied patch hashes or triggered by a freshly signed token.

The corrected guidance says to inspect the top-level CLI JSON status, avoid re-running submit just to recover a receipt, treat reuse of the same consumed token as the `approval_replayed` path, and inspect target story `_source/` records plus receipt/log output before any further submit attempt when success status is uncertain.

## Verification Result

Passed on 2026-05-17:

- Manual review of `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, and `.claude/skills/commitment-block-authoring/SKILL.md` against `tools/patch-engine/src/approval/verify-token.ts`, `tools/world-mcp/src/cli/sign-approval-token.ts`, and `docs/HARD-GATE-DISCIPLINE.md` confirmed the corrected prose matches token-hash replay semantics and preserves conservative submit recovery.
- `rg -n 'patch-hashes-already-applied|freshly-signed token' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md` — returned no matches, as expected.
- `git diff --check -- .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md archive/tickets/PEENH-013.md` — passed after making the untracked archived ticket visible with temporary intent-to-add and clearing that index marker afterward.

## Deviations

- The Claude Code edits were not wholly wrong. Their tail-truncated CLI-output warning and top-level `ok` inspection guidance were preserved; only the false replay-mechanism sentence was corrected.
- No patch-engine code or tests were changed by this ticket. The existing dirty patch-engine files are PEENH-012 engine-side work, not PEENH-013 owned edits.
