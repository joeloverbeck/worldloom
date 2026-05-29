# AUDREF-001: Health-audit reactivity-inertness scan reads dispositions from the retired page-plan §7a section instead of SE.turn_driver

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `branching-story-health-audit` SKILL prose (and supporting structural-audit logic if the disposition read is implemented in code); no record-schema change.
**Deps**: none (shares the retired-§7a root cause with the already-landed turn-cycle Phase 0 doc fix)

## Problem

`branching-story-health-audit`'s structural-mode reactivity-inertness pass instructs the auditor to read a page's **"§7a active-pressure disposition table"** to decide whether high-urgency non-player records were deferred/rejected/displaced while the committed `SE.turn_driver.kind` stayed player-driven. That `§7a` ("Turn driver / initiative trace") was a section of the **19-section page-plan contract, which is retired** (`story-state-contract.md` §8 "Retired Page-Plan Contract"; FOUNDATIONS §Story Bundles §4 — new PG-authoring skills no longer author page plans). New bundles (e.g. `red-bunny`) have no page plans at all, so the disposition table the audit is told to read does not exist.

The live home of selected/deferred/rejected driver dispositions is now the committed event itself: `branching-story-turn-cycle` Phase 0 records them in `SE.turn_driver` / the event's `world_logic_rationale` ("not in a markdown render table"). The audit must read dispositions from `SE.turn_driver` of the page-resolving event, not from a retired page-plan artifact. As written, the reactivity-inertness scan's documented input is stale and would either no-op or mislead on every modern bundle.

This is the cross-skill remainder of the same stale-`§7a` defect already corrected inline in `branching-story-turn-cycle` Phase 0 (which dropped the dangling "shared-contract §7a class-specific criteria table" citation in favor of FOUNDATIONS §5c + an inline candidate list).

## Assumption Reassessment (2026-05-29)

1. **Code/skill**: `.claude/skills/branching-story-health-audit/SKILL.md:370` ("A page counts for the inertness window when its **§7a active-pressure disposition table** shows one or more such records deferred, rejected, or displaced …") and `:372` (the finding "cites … their **§7a dispositions** …"). These are the only two live `§7a` references in the skill.
2. **Docs/spec**: `story-state-contract.md` §8 marks the page-plan contract (which carried `§7a`/`§9b`/`§9c`/`§16a` sub-sections) retired. `branching-story-turn-cycle` SKILL Phase 0 now states dispositions live in `SE.turn_driver` / validation rationale, "not in a markdown render table." FOUNDATIONS §Story Bundles §5c ("Driver salience is local") plus the turn-cycle Phase 0 inline candidate list are the current authority for what counts as an actively-pressuring non-player record.
3. **Shared boundary under audit**: the disposition record surface. Producer = turn-cycle (`SE.turn_driver` selected/deferred/rejected dispositions in the event + `world_logic_rationale`). Consumer = health-audit reactivity-inertness scan. The producer moved off page plans (SPEC-93); the consumer's documented read did not follow.
4. **FOUNDATIONS principle**: §Story Bundles §4 (page state is authoritative at `PG`/`SE` commit; no parallel page-plan state engine) and §5c (driver salience is local; dispositions are present-causal). Reading dispositions from the committed `SE.turn_driver` aligns the audit with the authoritative surface.
7. **Rename/removal blast radius**: grep of `§7a` across `.claude/skills/` shows live references only in `branching-story-health-audit` (this ticket) and `branching-story-bootstrap` (`:160`, which merely notes PG-1 `story_start` *omits* the shared-contract §7a initiative trace — descriptive, not a read; out of scope but should be re-checked on close). The turn-cycle Phase 0 reference was already corrected. `docs/triage/*` references are historical and not load-bearing.
8. **Adjacent contradiction**: the `branching-story-bootstrap:160` mention is a descriptive note, not a stale read; classify as "verify-on-close," not part of this fix.

## Architecture Check

1. Pointing the scan at `SE.turn_driver` (the authoritative, already-walked event record) is cleaner than reconstructing a retired page-plan section: the audit's structural-replay phases already load committed `SE`/`PG` records, so the dispositions are in hand with no new retrieval. It also removes the audit's last dependence on the retired page-plan layer, consistent with SPEC-93.
2. No backwards-compatibility shim: the `§7a` read is replaced, not dual-pathed. Legacy bundles that still carry page plans are read-only publication artifacts (§8) and are not a second disposition source the audit must reconcile.

## Verification Layers

1. Reactivity-inertness scan reads dispositions from `SE.turn_driver` → skill dry-run of `branching-story-health-audit` structural mode on a bundle with a player-driven chain over available non-player pressure (e.g. a constructed `red-bunny` continuation); expect the finding to cite `SE.turn_driver` dispositions, not a `§7a` table.
2. No live `§7a` page-plan read remains in the skill → codebase grep-proof: `§7a` no longer appears in `branching-story-health-audit/SKILL.md` except (if retained) as a historical note explicitly marked retired.
3. FOUNDATIONS alignment → §4 / §5c cited; the audit reads only committed `SE`/`PG` state.
4. No false dependency on page-plan presence → audit produces the same reactivity finding on a bundle that has never had page plans.

## What to Change

### 1. Repoint the reactivity-inertness disposition read

In `branching-story-health-audit/SKILL.md` (the reactivity-inertness pass, ~lines 365-372), replace "its §7a active-pressure disposition table" with "the page-resolving event's `SE.turn_driver` selected/deferred/rejected dispositions (and the event `world_logic_rationale`)" as the source for whether high-urgency non-player records were deferred/rejected/displaced. Update the finding-citation sentence (`:372`) from "their §7a dispositions" to "their `SE.turn_driver` dispositions."

### 2. Align the candidate-criteria wording

Ensure the non-player pressure candidate list in this pass matches FOUNDATIONS §5c and the turn-cycle Phase 0 inline list (STPLAN due `current_step`, high-intensity STEMO with behavioral pressure, CLK at threshold, active high-urgency THR, reveal-ready STSEC, OBL falling due, pending CNSQ, active high-urgency STINT). The existing list is close; reconcile any drift.

### 3. Verify the bootstrap note on close

Confirm `branching-story-bootstrap/SKILL.md:160`'s §7a mention remains accurate as a descriptive "PG-1 `story_start` omits the initiative trace" note (it is not a disposition read); leave as-is or annotate "retired page-plan section" if it reads as live.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/references/*` (modify — only if the reactivity-inertness logic prose lives in a reference file)

## Out of Scope

- Any change to how `branching-story-turn-cycle` records dispositions (already correct: `SE.turn_driver` + rationale).
- Re-introducing page plans or a `§7a` artifact.
- Other health-audit passes that do not read driver dispositions.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "§7a" .claude/skills/branching-story-health-audit/SKILL.md` returns no line describing a *read* of a page-plan disposition table (only, at most, a note explicitly marking it retired).
2. Dry-run: `branching-story-health-audit` structural mode on a bundle with a 3+ page player-driven chain over available high-urgency non-player pressure emits `reactivity_inertness_sequence` citing `SE.turn_driver` dispositions.
3. Dry-run: the same scan on a bundle that has never had page plans still produces the finding (no page-plan dependency).

### Invariants

1. The reactivity-inertness scan's disposition source is the committed `SE.turn_driver` of the page-resolving event, never a page-plan section.
2. The audit has no remaining live dependency on the retired page-plan layer.

## Test Plan

### New/Modified Tests

1. `None — skill-documentation/behavioral ticket; verification is the grep-proof plus the two structural-mode audit dry-runs named below.`

### Commands

1. `grep -n "§7a\|active-pressure disposition" .claude/skills/branching-story-health-audit/SKILL.md` — confirms the stale read is gone.
2. `/branching-story-health-audit --world_slug erotica-world --story_slug red-bunny --mode structural` — dry-run; inspect the reactivity-inertness finding's cited disposition source.
