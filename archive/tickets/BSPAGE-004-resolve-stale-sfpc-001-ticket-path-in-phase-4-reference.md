# BSPAGE-004: Resolve stale SFPC-001 ticket path in `phase-4-storylet-and-mystery-authority.md`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — documentation fix inside `.claude/skills/branching-story-page-cycle/references/`.
**Deps**: None.

## Problem

`references/phase-4-storylet-and-mystery-authority.md:89` reads:

> A future delegation refactor is tracked at `tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md`; until that lands, this pause shape is the correct posture.

The cited path `tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md` does NOT exist — the file is at `archive/tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md` (verified by `find tickets archive/tickets -name "SFPC-001*"`). The reference is unresolvable at the documented path, and the ticket has presumably either completed or been re-scoped (it lives in the archive, not active tickets).

Two valid fixes:

- **Option A (path correction)**: update the citation to `archive/tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md` if the archived ticket's content remains relevant to the documented pause-and-prompt protocol.
- **Option B (citation removal)**: remove the second clause of the sentence entirely if the archived ticket is obsolete and the pause-and-prompt protocol no longer needs a "until that lands" qualifier.

Option B is recommended pending a quick read of the archived ticket's status — if the refactor it tracks has shipped or been re-scoped, the qualifier is misleading. If it's still pending future work, Option A keeps the audit trail.

## Assumption Reassessment (2026-05-11)

1. `references/phase-4-storylet-and-mystery-authority.md:89` cites `tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md`. Confirmed by direct read.
2. File search: `find tickets archive/tickets -name "SFPC-001*"` returns only `archive/tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md`. Confirmed.
3. Shared boundary: the cited ticket is page-cycle-internal context for the Phase 4.5 pause-and-prompt seam. No sibling skill cites this same path or the ticket itself (verified by `grep -rn "SFPC-001" .claude/skills/ docs/`). Fix is local.
4. Resolution decision: implementer should `Read archive/tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md` first to determine whether the refactor is (i) already shipped (→ Option B: remove the qualifier), (ii) re-scoped to a different ticket (→ Option A with a path swap to the replacement), or (iii) still genuinely future work (→ Option A: archive-path correction).
5. Mismatch + correction: one-sentence edit depending on the archived ticket's current state.

## Architecture Check

1. Fixing broken citations is a discipline-maintenance edit, not a contract change. The page-cycle Phase 4.5 pause-and-prompt protocol contract is governed by SKILL.md HARD-GATE block clause (a) and the per-claim routing table at line 80; the citation is documentation context, not the protocol itself.
2. No backwards-compatibility aliasing introduced.

## Verification Layers

1. Post-edit, the line either (a) cites `archive/tickets/SFPC-001-...` if Option A is taken, or (b) omits the citation if Option B is taken → manual review.
2. `grep -rn "tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands" .claude/skills/branching-story-page-cycle/` returns `0` matches for the unresolvable `tickets/` path → codebase grep-proof.
3. If Option A taken: `grep -rn "archive/tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands" .claude/skills/branching-story-page-cycle/` returns ≥1.

## What to Change

### 1. Read the archived ticket first

Read `archive/tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md` and decide whether the refactor it tracks is shipped, re-scoped, or genuinely future-pending. Document the decision in the implementing commit message.

### 2. `.claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md`

Per the decision in step 1:

- **If Option A (refactor still future-pending or re-scoped)**: update line 89's citation from `tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md` to either `archive/tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md` (archive-path correction) or to the replacement ticket's active path.
- **If Option B (refactor already shipped)**: remove the second clause of the sentence (`"A future delegation refactor is tracked at tickets/...; until that lands, this pause shape is the correct posture."` → `"This pause shape is the correct posture."` or equivalent simplification).

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md` (one-sentence edit on line 89; specific shape per decision in step 1).

## Acceptance Criteria

- `grep -c "tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md" .claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md` returns `0` (the unresolvable `tickets/` path).
- If Option A: `grep -c "archive/tickets/SFPC-001" .claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md` returns ≥1.
- The implementing commit message names the option chosen and the rationale (which the implementer derived from reading the archived ticket body).

## Test Plan

- Confirm the cited path resolves via `test -f <path>` after the edit (Option A) or that the qualifier no longer exists (Option B).
- A future skill-audit re-running this same drift scan no longer reports the stale ticket path.

## Outcome

Completed on 2026-05-11. **Option B (citation removal)** was chosen after reading `archive/tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md`, which has `Status: COMPLETED` (closed 2026-05-03). The refactor it tracked has shipped, so the "until that lands, this pause shape is the correct posture" qualifier was stale — it implied a future migration that no longer exists. The pause-and-prompt protocol described in `phase-4-storylet-and-mystery-authority.md` is now the steady-state shape, not an interim posture, so removing the qualifier is the correct cleanup.

### Landed change

`.claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md:89` — removed the trailing clause `A future delegation refactor is tracked at \`tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md\`; until that lands, this pause shape is the correct posture.` The sentence now ends at `Pause-and-tell-the-user (rather than silent degrade to \`apparent\`) preserves the canon-mutation HARD-GATE invariant.`

## Verification Result

1. `grep -c "tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md" .claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md` returns `0` — the unresolvable `tickets/` path is gone (Acceptance Criterion 1 ✓).
2. `grep -rn "SFPC-001" .claude/skills/branching-story-page-cycle/` returns no matches — the citation removal is local and complete; no other site references it.
3. The remaining `SFPC-001` mentions in `docs/triage/2026-05-11-branching-story-page-cycle-audit-triage.md` refer to BSPAGE-004 itself, not to the unresolvable ticket path.
