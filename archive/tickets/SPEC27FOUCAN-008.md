# SPEC27FOUCAN-008: Mystery Accretion Discipline (story-scope Rule 7)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `docs/FOUNDATIONS.md` (§Story Bundles §5 Rule 7 clause), `.claude/skills/branching-story-health-audit` (Phase 2e), `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` (D8 implementation note).
**Deps**: None

## Problem

At intake, `PG.state_snapshot.unresolved_mystery_claims[].status` already carried an accretion-aware enum (`preserved | clue_added | narrowed | apparent_resolution | held_for_promotion`), but `branching-story-health-audit` checked only direct forbidden-mystery resolution. Nothing checked whether accumulated `clue_added` / `narrowed` statuses across a branch had effectively resolved a Mystery Reserve entry without any single page stating the answer — a Rule 7 integrity gap. This ticket closes that contract gap in FOUNDATIONS and the health-audit skill prose.

## Assumption Reassessment (2026-05-15)

1. `PG.state_snapshot.unresolved_mystery_claims[].status` carries the `preserved | clue_added | narrowed | apparent_resolution | held_for_promotion` enum in `.claude/skills/_shared-templates/story-state-contract.md` §4.2; no new story-state or `SLT` schema field is needed.
2. `docs/FOUNDATIONS.md` §Story Bundles §5 Rule 7 paragraph was the correct home for the new clause; the explicit SPEC-27 reference was truthed with a dated D8 implementation note after the clause landed.
3. Shared boundary under audit: the `PG.state_snapshot.unresolved_mystery_claims[]` schema (canonically `story-state-contract.md` §4.2) — the cumulative-narrowing check walks the per-branch page chain reading this existing field; no new field is added.
4. FOUNDATIONS principle under audit: Rule 7 (Preserve Mystery Deliberately) at story scope — a mystery accidentally solved by accumulated clues, with no single page stating the answer, violates Rule 7 even though no direct-resolution check fires.
5. Enforcement surface touched: `branching-story-health-audit` Phase 2e (the mystery / canon-safety sub-phase). The landed change adds `mystery_accretion_resolved` on top of the existing direct-resolution check, widens Phase 2e context loading from forbidden-only `M` records to whole-class Mystery Reserve context, and strengthens the Mystery Reserve firewall without weakening HARD-GATE approval or write discipline.
6. The drafted health-audit dry-run was not a truthful executable proof surface in this checkout because there are zero production story bundles and no standalone skill runner. Verification is therefore contract-and-prose conformance: grep proof over the two edited surfaces, manual review of the Phase 2e finding and Rule 7 alignment table, and the existing `tools/validators` package test lane confirming the story-state schema surface still accepts the unchanged status vocabulary.

## Architecture Check

1. A cumulative-narrowing check that walks the branch's page chain — reading the existing `unresolved_mystery_claims[].status` accretion vocabulary — is cleaner than adding the reviewer's proposed new `mystery_effect` SLT field: the accretion vocabulary already exists; the missing piece is the check, not new schema surface.
2. No backwards-compatibility aliasing — no new field; the check consumes existing `PG.state_snapshot` data.

## Verification Layers

1. `branching-story-health-audit` Phase 2e flags a branch whose accumulated `clue_added` / `narrowed` statuses have effectively resolved a Mystery Reserve entry with no single page stating the answer -> manual contract review + grep proof.
2. `docs/FOUNDATIONS.md` §Story Bundles §5 Rule 7 carries the Mystery Accretion clause -> FOUNDATIONS alignment check.
3. The SPEC-27 D8 reference records the completed current state -> explicit-reference truthing.
4. No new schema field — the unchanged `unresolved_mystery_claims[].status` vocabulary remains valid -> `tools/validators` package test lane.

## Landed Changes

### 1. FOUNDATIONS §Story Bundles §5 Rule 7 — Mystery Accretion clause

- Added a "Mystery Accretion" clause to `docs/FOUNDATIONS.md` §Story Bundles §5: story-pipeline skills must check cumulative narrowing of a Mystery Reserve entry across a branch's pages, not merely direct answer statements — repeated clues can resolve a mystery by accumulation.

### 2. health-audit Phase 2e — cumulative-narrowing check

- Added a `mystery_accretion_resolved` Phase 2e finding to `.claude/skills/branching-story-health-audit/SKILL.md`. The audit walks a branch's page chain and evaluates accumulated `unresolved_mystery_claims[].status` values (`clue_added` / `narrowed`) against whole-class Mystery Reserve context. The existing `unresolved_mystery_claims[].status` vocabulary is reused; no new `SLT` field was added.

### 3. SPEC-27 D8 truthing

- Added a dated implementation note to `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` recording the landed D8 surfaces and historicalizing the remaining D8 intake prose.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` (modify)

## Out of Scope

- The reviewer's proposed new `mystery_effect` field on `SLT` records — the check reuses the existing `PG.state_snapshot.unresolved_mystery_claims[].status` vocabulary.
- Modifying the direct forbidden-mystery-resolution check (turn-cycle Phase 5 / Phase 9 gate 3; health-audit Phase 2e direct check) — the cumulative check is added alongside it.

## Acceptance Criteria

### Tests That Must Pass

1. Manual contract review confirms `branching-story-health-audit` Phase 2e now includes a `mystery_accretion_resolved` finding over branch page-chain accumulation of `clue_added` / `narrowed` statuses and routes effective resolution to promotion or branch-flag findings.
2. `grep -rn "Mystery Accretion\|cumulative narrowing" docs/FOUNDATIONS.md .claude/skills/branching-story-health-audit/SKILL.md` returns the clause and the check.
3. `cd tools/validators && npm test` passes, confirming the unchanged story-state schema status vocabulary remains valid.

### Invariants

1. The cumulative-narrowing check adds no new schema field — it reads existing `unresolved_mystery_claims[].status` data.
2. The existing direct forbidden-mystery-resolution check is unchanged; the cumulative check is additive.

## Test Plan

### New/Modified Tests

1. None — skill-prose + FOUNDATIONS-doc ticket; verification is manual contract review, grep-proof, explicit-reference truthing, and the existing `tools/validators` package test lane. Zero production story bundles exist, so no story-bundle replay fixture was added.

### Commands

1. `grep -rn "Mystery Accretion\|cumulative narrowing" docs/FOUNDATIONS.md .claude/skills/branching-story-health-audit/SKILL.md`
2. `cd tools/validators && npm test` — confirms no story-state-contract schema regression.

## Outcome

Completion date: 2026-05-15.

Completed. `docs/FOUNDATIONS.md` now states the story-scope Mystery Accretion Rule 7 clause. `branching-story-health-audit` now loads whole-class Mystery Reserve context for Phase 2e and includes `mystery_accretion_resolved` in its mystery / canon safety finding set and alignment table. SPEC-27 D8 now has a dated implementation note recording the landed surface.

## Verification Result

1. `grep -rn "Mystery Accretion\|cumulative narrowing" docs/FOUNDATIONS.md .claude/skills/branching-story-health-audit/SKILL.md` — passed; returned the FOUNDATIONS clause and the Phase 2e health-audit check.
2. Manual review — passed; the direct forbidden-mystery-resolution check remains intact, the cumulative check is additive, and no new `SLT` or story-state schema field was added.
3. `cd tools/validators && npm test` — passed; package built and 217 Node tests passed.
4. `git diff --check` — passed.

## Deviations

- Replaced the drafted `branching-story-health-audit` dry-run with manual contract review plus grep proof because there are zero production story bundles and no executable skill runner in this checkout.
- Expanded the health-audit pre-flight context from forbidden-only `M` records to whole-class Mystery Reserve records. This is same-seam required fallout for cumulative accretion review: a forbidden-only packet cannot judge accumulated narrowing for active/passive mysteries.
