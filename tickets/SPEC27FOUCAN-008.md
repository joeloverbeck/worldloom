# SPEC27FOUCAN-008: Mystery Accretion Discipline (story-scope Rule 7)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `docs/FOUNDATIONS.md` (§Story Bundles §5 Rule 7 clause), `.claude/skills/branching-story-health-audit` (Phase 2e).
**Deps**: None

## Problem

`PG.state_snapshot.unresolved_mystery_claims[].status` already carries an accretion-aware enum (`preserved | clue_added | narrowed | apparent_resolution | held_for_promotion`), but `branching-story-turn-cycle` and `branching-story-health-audit` check only direct forbidden-mystery resolution. Nothing checks whether accumulated `clue_added` / `narrowed` statuses across a branch have effectively resolved a Mystery Reserve entry without any single page stating the answer — a Rule 7 integrity gap.

## Assumption Reassessment (2026-05-14)

1. `PG.state_snapshot.unresolved_mystery_claims[].status` carries the `preserved | clue_added | narrowed | apparent_resolution | held_for_promotion` enum (confirmed in `story-state-contract.md` §4.2 via the SPEC-27 brainstorm verification pass); `branching-story-health-audit` Phase 2e ("Mystery / canon safety") checks only direct forbidden-mystery resolution, not cumulative narrowing.
2. `docs/FOUNDATIONS.md` §Story Bundles §5 Rule 7 paragraph is the home for the new clause; the spec's D8 adds a "Mystery Accretion" clause there.
3. Shared boundary under audit: the `PG.state_snapshot.unresolved_mystery_claims[]` schema (canonically `story-state-contract.md` §4.2) — the cumulative-narrowing check walks the per-branch page chain reading this existing field; no new field is added.
4. FOUNDATIONS principle under audit: Rule 7 (Preserve Mystery Deliberately) at story scope — a mystery accidentally solved by accumulated clues, with no single page stating the answer, violates Rule 7 even though no direct-resolution check fires.
5. Enforcement surface touched: `branching-story-health-audit` Phase 2e (the mystery / canon-safety sub-phase). The change adds a cumulative-narrowing check on top of the existing direct-resolution check — it strengthens the Mystery Reserve firewall, it does not weaken it.

## Architecture Check

1. A cumulative-narrowing check that walks the branch's page chain — reading the existing `unresolved_mystery_claims[].status` accretion vocabulary — is cleaner than adding the reviewer's proposed new `mystery_effect` SLT field: the accretion vocabulary already exists; the missing piece is the check, not new schema surface.
2. No backwards-compatibility aliasing — no new field; the check consumes existing `PG.state_snapshot` data.

## Verification Layers

1. `branching-story-health-audit` Phase 2e flags a branch whose accumulated `clue_added` / `narrowed` statuses have effectively resolved a Mystery Reserve entry with no single page stating the answer -> skill dry-run.
2. `docs/FOUNDATIONS.md` §Story Bundles §5 Rule 7 carries the Mystery Accretion clause -> FOUNDATIONS alignment check.
3. Single skill + single doc; no new schema field — the cumulative-narrowing logic is the only new surface, mapped to the health-audit dry-run above. Additional cross-skill layer mapping is not applicable because no other skill or schema changes.

## What to Change

### 1. FOUNDATIONS §Story Bundles §5 Rule 7 — Mystery Accretion clause

- In the Rule 7 story-scope paragraph of `docs/FOUNDATIONS.md` §Story Bundles §5, add a "Mystery Accretion" clause: story-pipeline skills must check cumulative narrowing of a Mystery Reserve entry across a branch's pages, not merely direct answer statements — repeated clues can resolve a mystery by accumulation.

### 2. health-audit Phase 2e — cumulative-narrowing check

- In `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2e, add a cumulative-narrowing check that walks a branch's page chain and evaluates the accumulation of `unresolved_mystery_claims[].status` values (`clue_added` / `narrowed`) against the Mystery Reserve firewall. Reuse the existing `unresolved_mystery_claims[].status` vocabulary — add no new `SLT` field.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- The reviewer's proposed new `mystery_effect` field on `SLT` records — the check reuses the existing `PG.state_snapshot.unresolved_mystery_claims[].status` vocabulary.
- Modifying the direct forbidden-mystery-resolution check (turn-cycle Phase 5 / Phase 9 gate 3; health-audit Phase 2e direct check) — the cumulative check is added alongside it.

## Acceptance Criteria

### Tests That Must Pass

1. A `branching-story-health-audit` dry-run flags a multi-page branch whose `clue_added` / `narrowed` accumulation has effectively resolved a Mystery Reserve entry with no single page stating the answer.
2. `grep -rn "Mystery Accretion\|cumulative narrowing" docs/FOUNDATIONS.md .claude/skills/branching-story-health-audit/SKILL.md` returns the clause and the check.

### Invariants

1. The cumulative-narrowing check adds no new schema field — it reads existing `unresolved_mystery_claims[].status` data.
2. The existing direct forbidden-mystery-resolution check is unchanged; the cumulative check is additive.

## Test Plan

### New/Modified Tests

1. `None — skill-prose + FOUNDATIONS-doc ticket; verification is skill dry-run + grep-proof. Zero production story bundles exist, so verification is contract-and-prose conformance (per spec §Verification).`

### Commands

1. `grep -rn "Mystery Accretion" docs/FOUNDATIONS.md .claude/skills/branching-story-health-audit/SKILL.md`
2. `cd tools/validators && npm test` — confirms no story-state-contract schema regression.
