# SPEC42STOSTADEB-012: branching-story-health-audit structural checks for CLK/STSEC/STQ

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `branching-story-health-audit` SKILL.md Phase 2 (structural mode) with three new structural checks: `stalled_clock_check`, `under_supported_critical_revelation_check`, `dropped_high_salience_setup_check`; surfaces findings as audit warnings (not engine HARD-REJECTs); no new audit modes introduced
**Deps**: archive/tickets/SPEC42STOSTADEB-001.md, archive/tickets/SPEC42STOSTADEB-002.md, archive/tickets/SPEC42STOSTADEB-003.md, archive/tickets/SPEC42STOSTADEB-005.md, archive/tickets/SPEC42STOSTADEB-006.md, SPEC42STOSTADEB-007

## Problem

Once CLK/STSEC/STQ are in active use across bundles (per the foundation + validator + skill-integration tickets), audit detection of three new failure modes is needed: (a) **stalled clocks** (a high-salience active CLK with no tick across N pages — the pressure is supposedly building but the engine never advances it), (b) **under-supported critical revelations** (a STSEC.salience: high transitions to revealed with insufficient discovered clue carriers — distinct from the engine pre-apply `critical_secret_clue_coverage_when_revealed` validator from -006 which HARD-REJECTs at commit; the health-audit check is a retrospective bundle-wide diagnostic), and (c) **dropped high-salience setups** (a STQ.salience: high remains open at a terminal page without `terminal_rationale` — distinct from the per-commit `story_question_terminal_debt` validator from -007 which fires at the terminal-commit moment; the health-audit check is the bundle-wide retrospective). Without these checks, authors will not notice stalled mechanisms during health audits, and the new classes will rot in bundles.

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at Step 2 codebase validation (2026-05-17): `.claude/skills/branching-story-health-audit/SKILL.md` exists; existing Phase 2 (structural mode) deterministic checks include 2a (replay/snapshot/choice-consequence), 2b (branch isolation), 2c (debt health), 2d (belief/visibility), 2x (DA health), 2e (mystery/canon), 2f (continuation/terminal proof), 2g (causal dependency), 2h (canon baseline drift) — verified in SPEC-42 brainstorm agent reports. The three new checks fit naturally as sub-checks under existing Phase 2 categories or as net-new sub-checks (decision deferred to implementer based on existing structure).
2. Spec verified at `specs/SPEC-42-story-state-debt-secret-clock-records.md` §E Phase 1 ("stalled-clock check"), §E Phase 2 ("under-supported-revelation check"), §E Phase 3 ("dropped-setup check"); §Risks "Author abuse — clock proliferation" notes that health-audit should "warn (not block) when CLK count exceeds a threshold per bundle" — this ticket adds the per-bundle CLK-proliferation warning as a fourth check sub-rule alongside the three named structural checks.
3. Cross-skill / cross-tool shared boundary: `branching-story-health-audit` is a Skill Category 2c skill. The three new checks complement the per-commit validators (-005 / -006 / -007) — validators run at commit time and HARD-REJECT malformed transitions; health-audit checks run at audit time and surface accumulated mechanism rot. The two surfaces compose: a bundle that never violates a per-commit validator can still accumulate stalled clocks (the engine never asked it to tick) or dropped setups (no terminal page was committed). The health-audit predicates use the same predicate DSL from -005 / -006 / -007 (`any_clock_active`, `revelation_ready`, `any_story_question_open`, `promise_due`).
4. FOUNDATIONS §Rule 5 (No Consequence Evasion) motivates the three new checks. Stalled clocks: a clock whose `value` never advances despite being active represents accumulated consequence evasion (the pressure was named but never materialized). Under-supported revelations: a critical secret revealed without clue support represents revelation-from-nowhere, which violates the fair-revelation discipline that motivates Rule 5 + Mystery-Reserve preservation. Dropped setups: a high-salience open STQ at terminal represents an open consequence ignored.
5. HARD-GATE validator surface: not directly touched — this ticket's checks are health-audit WARNINGS, not engine HARD-REJECTs. The HARD-REJECTs are owned by -005 / -006 / -007 / -008. Mystery Reserve firewall: not directly touched. Hook 3 path-pattern coverage: unchanged.

## Architecture Check

1. **Health-audit checks as audit warnings, not engine HARD-REJECTs**: this distinction is load-bearing. The three new checks are retrospective bundle diagnostics; they cannot HARD-REJECT new commits (that's the per-commit validators' job). Surfacing them as audit warnings preserves the existing health-audit warning semantics (parallel to existing 2c "unactionable" / "invalidated" / "saliency_starvation" debt warnings).
2. **Three new checks compose with existing validators**: per-commit validators (-005 / -006 / -007) catch single-commit violations; health-audit checks catch bundle-accumulated stagnation. The two-layer pattern parallels existing 2c (per-commit OBL/CNSQ status validators + health-audit `ignored_debt_beyond_urgency` accumulation check).
3. **Author-abuse CLK warning is the fourth check**: per SPEC-42 §Risks. Added as a sibling sub-check rather than a separate ticket.
4. **No new audit modes**: this ticket extends Phase 2 (structural) only. The 4-mode taxonomy (structural / prose / remediation / cross_story) is preserved.

## Verification Layers

1. `stalled_clock_check` flags a CLK with `salience: high`, `status: active`, and no `tick_history[]` entries across the last N pages (default N: configurable per-bundle, suggest 5 pages); does NOT flag low/medium-salience or paused/resolved clocks → audit dry-run test
2. `under_supported_critical_revelation_check` flags a STSEC with `salience: high`, `status: revealed`, and `clue_carriers[].status: discovered` count below the configured minimum (default 2 per -006) at the time of reveal → audit dry-run test
3. `dropped_high_salience_setup_check` flags a STQ with `salience: high`, `status: open | complicated`, at a terminal page snapshot without `terminal_rationale` naming the STQ → audit dry-run test
4. `clock_proliferation_warning` (per §Risks) flags a bundle with CLK count exceeding a per-bundle threshold (default: 5 active CLKs; configurable) → audit dry-run test
5. Audit reports correctly attribute each warning to the responsible record IDs and pages → grep-proof against rendered audit report

## What to Change

### 1. Phase 2 extension — `stalled_clock_check` (CLK)

Modify `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2 (structural mode). Add a new sub-check (placement: under existing 2c "debt health" OR as new 2i "new-class debt accumulation" — confirm at edit time based on existing structure). The check:
- Iterates all active CLK records (`status ∈ {active, paused}`) in the bundle
- For each high-salience CLK (`salience: high`), checks whether any `tick_history[]` entry has been added within the last N pages (default N: 5; configurable via the skill's existing tuning surface if present, else hard-coded)
- Surfaces stalled clocks as audit warnings with repair_kind: branch_flag

### 2. Phase 2 extension — `under_supported_critical_revelation_check` (STSEC)

Add a new sub-check. The check:
- Iterates all revealed STSEC records (`status: revealed`)
- For each high-salience STSEC (`salience: high`), counts `clue_carriers[].status: discovered` entries preceding `reveal_event` in the branch path
- Surfaces under-supported revelations (discovered count < 2 by default) as audit warnings with repair_kind: branch_flag

### 3. Phase 2 extension — `dropped_high_salience_setup_check` (STQ)

Add a new sub-check. The check:
- Iterates all terminal page snapshots
- For each terminal, finds all active STQ records (`status ∈ {open, complicated}`)
- Filters to high-salience (`salience: high`)
- Surfaces dropped setups (high-salience open STQ at terminal with `terminal_rationale` NOT naming the STQ) as audit warnings with repair_kind: branch_flag

### 4. Phase 2 extension — `clock_proliferation_warning` (per SPEC-42 §Risks)

Add a fourth check for CLK over-modeling. The check:
- Counts active CLK records per bundle (`status ∈ {active, paused}`)
- Surfaces a per-bundle warning when the count exceeds the threshold (default: 5; configurable)
- WARNING repair_kind: bundle_advice (this is an authoring-concern warning, not a per-page repair)

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — Phase 2 sub-check additions; the four new sub-checks may land as new 2i sub-section or distributed under existing 2c/2e — implementer judgment based on existing structure)

## Out of Scope

- CLK/STSEC/STQ class foundations — owned by SPEC42STOSTADEB-001 / -002 / -003
- Per-class validators — owned by SPEC42STOSTADEB-005 / -006 / -007
- Shared validator extensions — owned by SPEC42STOSTADEB-008
- Turn-cycle integration — owned by SPEC42STOSTADEB-009
- Bootstrap optional seeding — owned by SPEC42STOSTADEB-010
- Commitment-block-authoring extension — owned by SPEC42STOSTADEB-011
- Prose-attach verification — owned by SPEC42STOSTADEB-013
- Cross-class contract doc updates — owned by SPEC42STOSTADEB-014
- **`backfill_proposal` mode** (per SPEC-42 §Phase 5): deferred to a follow-up spec per SPEC-42 §Risks recommendation (pattern-recognition complexity is substantial: 3 distinct backfill flows — THR→STQ, DA/BEL/SF→STSEC, THR/CNSQ/OBL→CLK — each requiring its own pattern-recognition logic). The §Step 6 cross-spec follow-ups list flags this for follow-up-spec drafting.

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run on a fixture bundle with a stalled high-salience CLK: `branching-story-health-audit structural` flags it via `stalled_clock_check` warning
2. Skill dry-run on a fixture bundle with a revealed high-salience STSEC and fewer than 2 discovered carriers: audit flags it via `under_supported_critical_revelation_check` warning
3. Skill dry-run on a fixture bundle with a terminal page leaving a high-salience open STQ unaccounted: audit flags it via `dropped_high_salience_setup_check` warning
4. Skill dry-run on a fixture bundle with 6+ active CLKs: audit flags it via `clock_proliferation_warning` (per SPEC-42 §Risks default threshold 5)
5. Skill dry-run on a fixture bundle with NO instances of the four failure modes: audit produces no false-positive warnings for the new checks

### Invariants

1. The three named structural checks + the §Risks proliferation warning compose with existing Phase 2 sub-checks — no existing check's logic is altered
2. Warnings use the existing health-audit warning shape (repair_kind: branch_flag for per-page issues; repair_kind: bundle_advice for proliferation)
3. The checks fire only when their corresponding classes exist in the bundle (no false positives on bundles that don't use the new classes)
4. The `backfill_proposal` mode is NOT introduced in this ticket — deferred to a follow-up spec per §Out of Scope

## Test Plan

### New/Modified Tests

1. Skill-level fixture tests (path depends on existing health-audit test structure; confirm at edit time) — fixtures covering: stalled CLK, under-supported critical STSEC reveal, dropped high-salience STQ at terminal, clock proliferation, and a clean bundle (no false positives)

### Commands

1. Skill dry-run (manual or via skill-test harness if available): invoke `branching-story-health-audit structural` on each fixture bundle and inspect the produced audit report for the expected warnings (or their absence in the clean bundle)
2. `npm test --prefix tools/validators` (regression — confirms the existing per-commit validators continue to fire correctly; health-audit checks are a different surface)
3. The full-pipeline verification command lands in SPEC42STOSTADEB-015 capstone
