# BSBOOT-006: Align Phase 7 prose cross-check with Phase 9 gate 10 (allow offstage mention)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — `branching-story-bootstrap/references/phase-7-root-page-render.md` only.
**Deps**: none

## Problem

At intake, two surfaces in the same skill enforced two different prose constraints around offstage characters:

- `references/phase-7-root-page-render.md:74` (the deterministic post-LLM cross-check):

  > "Does the prose mention any character not in `cast_present`? → re-prompt with explicit constraint."

- `references/phase-9-validation-gates.md:18` (the canon-safety gate that gates the HARD-GATE):

  > "PG-0001 prose introduces no entity as physically present unless in `cast_present`; load-bearing factual claims are state-snapshot-grounded; resolves no mystery"

Before this ticket, the cross-check forbade any *mention*; the gate forbade only *physical staging*. The gate's wording is the better contract: a PG should be able to mention an absent father, a remembered rival, a dead saint, a name on a letter, or a rumored antagonist without staging them physically in the room. The cross-check's stricter form forced re-prompts on legitimate offstage references and degraded opening-prose quality.

## Assumption Reassessment (2026-05-06)

1. `references/phase-7-root-page-render.md:74` — at intake, verified the cross-check forbade mention.
2. `references/phase-9-validation-gates.md:18` — verified the gate forbids physical staging only.
3. Cross-skill / cross-artifact boundary: the same prose-ledger semantics also appear in `branching-story-page-cycle`. Live page-cycle wording already allows offstage references to absent characters and forbids only depicting an entity as physically present unless included in `cast_present`, so no page-cycle edit is owned by this ticket.
4. FOUNDATIONS principle: Rule 1 (No Floating Facts) requires every fact to declare its scope and prerequisites; offstage mentions are governed by `state_snapshot.belief_state_by_actor` / `reader_known_facts` / DA content / POV-accessible state. The fix preserves Rule 1 by requiring offstage mentions to be *grounded* in state, not by forbidding them outright.
5. HARD-GATE-semantics check: the change relaxes a Phase 7 cross-check (a re-prompt trigger), not a Phase 9 gate. The HARD-GATE itself is unchanged; gate 10 already forbids the actually-canon-unsafe behavior (introducing an entity as physically present without basis).

## Architecture Check

1. **Why cleaner**: a single contract (gate 10's physical-staging form) governs both the cross-check and the gate. Re-prompts trigger on the same condition the gate enforces, so cross-check re-prompts now catch failures the gate would otherwise catch — no false positives, no behavior gap.
2. No backwards-compatibility shim. The cross-check wording changes wholesale; nothing else references the old phrasing as a contract surface.

## Verification Layers

1. Phase 7 cross-check wording matches Phase 9 gate 10 semantics → codebase grep-proof + manual review (compare phrasing).
2. Mystery-firewall preservation — relaxing the mention-forbid does not weaken Rule 7 (Mystery Reserve) → FOUNDATIONS alignment check (the gate that forbids resolving any M in `mysteries_in_play[]` is on a different cross-check line and remains untouched).

## Landed Changes

### 1. `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md`

- Replaced the stale mention-forbid cross-check with:

  ```
  ## Cross-check (deterministic, post-LLM)

  - Does the prose stage any entity as physically present, acting, speaking, being perceived directly, or available for immediate interaction unless in `cast_present`? → re-prompt with explicit constraint. Mere mention, memory, rumor, inscription, or offstage reference is allowed if grounded in `reader_known_facts`, `belief_state_by_actor`, DA content, or POV-accessible state.
  - Does the prose imply any fact not in state context? → flag for review.
  - Does the prose resolve any M-NNNN in `mysteries_in_play[]`? → hard reject, re-prompt.

  Up to 3 re-prompts before escalating to user with the constraint failures inlined in the message.
  ```

  This aligns the cross-check semantics to gate 10 while keeping the gate as the canon-safety backstop. The other two cross-check items (state-context-implied facts; mystery-resolution) are unchanged.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` (modify)
- `archive/tickets/BSBOOT-006.md` (modify closeout / archive handoff)

## Out of Scope

- Editing `branching-story-page-cycle`'s analogous critic. If a follow-up audit identifies the same divergence in page-cycle, that becomes its own ticket.
- Adding a programmatic check that the cross-check and gate stay aligned over time. The fix is documentation-level; structural alignment is a manual-review concern at skill-edit time.
- Loosening gate 10. Gate 10's wording is correct; only the cross-check is being aligned to it.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "physically present|stage any entity" .claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` returns the cross-check match.
2. `grep -nE "Does the prose mention any character" .claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` returns no matches (the old wording is gone).
3. The other two cross-check items (state-implied facts, mystery resolution) still appear in the file.

### Invariants

1. The cross-check and gate 10 use the same physical-staging contract.
2. Mystery-resolution forbid (`Does the prose resolve any M-NNNN in mysteries_in_play[]?`) remains unchanged — Rule 7 firewall preserved.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -nE "cast_present|physically present" .claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` — confirms the two surfaces use compatible language.
2. `grep -n "mention any character" .claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` — expected: empty (old phrasing removed).

## Outcome

Completed: 2026-05-06.

Completed. `branching-story-bootstrap` Phase 7 now rejects ungrounded physical staging outside `cast_present` instead of rejecting every offstage mention. Offstage references are allowed only when grounded in `reader_known_facts`, `belief_state_by_actor`, DA content, or POV-accessible state. Phase 9 gate 10 and the HARD-GATE contract were not changed.

## Verification Result

Passed on 2026-05-06:

1. `grep -nE 'physically present|stage any entity' .claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` — returned the updated cross-check at line 74.
2. `grep -nE 'cast_present|physically present' .claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` — confirmed the Phase 7 cross-check and Phase 9 gate 10 use compatible physical-staging semantics.
3. `grep -n 'mention any character' .claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` — returned no matches, as expected.
4. `grep -nE 'imply any fact|resolve any M-NNNN' .claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` — confirmed the state-context and Mystery Reserve checks remain present.
5. Manual review against `docs/FOUNDATIONS.md` Rule 1 and Rule 7 — the new wording keeps offstage references state-grounded and leaves mystery-resolution rejection intact.
6. `git diff --check -- .claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md archive/tickets/BSBOOT-006.md docs/triage/2026-05-06-branching-story-bootstrap-fixes-triage.md` — passed after archive handoff.

## Deviations

None.
