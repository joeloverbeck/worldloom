# SPEC42STOSTADEB-012: branching-story-health-audit structural checks for CLK/STSEC/STQ

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `branching-story-health-audit` SKILL.md Phase 2 (structural mode) with three new structural checks: `stalled_clock_check`, `under_supported_critical_revelation_check`, `dropped_high_salience_setup_check`; surfaces findings as audit warnings (not engine HARD-REJECTs); no new audit modes introduced
**Deps**: archive/tickets/SPEC42STOSTADEB-001.md, archive/tickets/SPEC42STOSTADEB-002.md, archive/tickets/SPEC42STOSTADEB-003.md, archive/tickets/SPEC42STOSTADEB-005.md, archive/tickets/SPEC42STOSTADEB-006.md, archive/tickets/SPEC42STOSTADEB-007.md

## Problem

Once CLK/STSEC/STQ are in active use across bundles (per the foundation + validator + skill-integration tickets), audit detection of three new failure modes is needed: (a) **stalled clocks** (a high-salience active CLK with no tick across N pages — the pressure is supposedly building but the engine never advances it), (b) **under-supported critical revelations** (a STSEC.salience: high transitions to revealed with insufficient discovered clue carriers — distinct from the engine pre-apply `critical_secret_clue_coverage_when_revealed` validator from -006 which HARD-REJECTs at commit; the health-audit check is a retrospective bundle-wide diagnostic), and (c) **dropped high-salience setups** (a STQ.salience: high remains open at a terminal page without `terminal_rationale` — distinct from the per-commit `story_question_terminal_debt` validator from -007 which fires at the terminal-commit moment; the health-audit check is the bundle-wide retrospective). Without these checks, authors will not notice stalled mechanisms during health audits, and the new classes will rot in bundles.

## Assumption Reassessment (2026-05-18)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified on 2026-05-18: `.claude/skills/branching-story-health-audit/SKILL.md` exists; existing Phase 2 (structural mode) deterministic checks include 2a (replay/snapshot/choice-consequence), 2b (branch isolation), 2c (debt health), 2d (belief/visibility), 2x (DA health), 2e (mystery/canon), 2f (continuation/terminal proof), 2g (causal dependency), and 2h (canon baseline drift). The new checks land as a new Phase 2i so the existing debt, mystery, continuation, and canon-baseline checks remain unaltered.
2. Spec verified at `specs/SPEC-42-story-state-debt-secret-clock-records.md` §E Phase 1 ("stalled-clock check"), §E Phase 2 ("under-supported-revelation check"), §E Phase 3 ("dropped-setup check"); §Risks "Author abuse — clock proliferation" notes that health-audit should "warn (not block) when CLK count exceeds a threshold per bundle" — this ticket adds the per-bundle CLK-proliferation warning as a fourth Phase 2i sub-rule alongside the three named structural checks.
3. Cross-skill / cross-tool shared boundary: `branching-story-health-audit` is a Skill Category 2c skill. The three new checks complement the per-commit validators (-005 / -006 / -007) — validators run at commit time and HARD-REJECT malformed transitions; health-audit checks run at audit time and surface accumulated mechanism rot. The two surfaces compose: a bundle that never violates a per-commit validator can still accumulate stalled clocks (the engine never asked it to tick) or dropped setups (no terminal page was committed). The health-audit checks cite the same record classes and semantics from the shared story-state contract (`CLK`, `STSEC`, `STQ`; `tick_history[]`, `clue_carriers[]`, `terminal_rationale`) while remaining warning-only.
4. FOUNDATIONS §Rule 5 (No Consequence Evasion) motivates the three new checks. Stalled clocks: a clock whose `value` never advances despite being active represents accumulated consequence evasion (the pressure was named but never materialized). Under-supported revelations: a critical secret revealed without clue support represents revelation-from-nowhere, which violates the fair-revelation discipline that motivates Rule 5 + Mystery-Reserve preservation. Dropped setups: a high-salience open STQ at terminal represents an open consequence ignored.
5. HARD-GATE validator surface: not directly touched — this ticket's checks are health-audit WARNINGS, not engine HARD-REJECTs. The HARD-REJECTs are owned by -005 / -006 / -007 / -008. Mystery Reserve firewall: not directly touched. Hook 3 path-pattern coverage: unchanged.
6. Proof correction: the drafted "skill dry-run" fixture tests are not executable in the live repo because there is no skill-test runner or fixture harness for `.claude/skills/branching-story-health-audit/SKILL.md`. Acceptance is narrowed to the strongest truthful surface for this skill-only ticket: manual contract review plus grep proof over the skill text and unchanged package boundaries.

## Architecture Check

1. **Health-audit checks as audit warnings, not engine HARD-REJECTs**: this distinction is load-bearing. The three new checks are retrospective bundle diagnostics; they cannot HARD-REJECT new commits (that's the per-commit validators' job). Surfacing them as audit warnings preserves the existing health-audit warning semantics (parallel to existing 2c "unactionable" / "invalidated" / "saliency_starvation" debt warnings).
2. **Three new checks compose with existing validators**: per-commit validators (-005 / -006 / -007) catch single-commit violations; health-audit checks catch bundle-accumulated stagnation. The two-layer pattern parallels existing 2c (per-commit OBL/CNSQ status validators + health-audit `ignored_debt_beyond_urgency` accumulation check).
3. **Author-abuse CLK warning is the fourth check**: per SPEC-42 §Risks. Added as a sibling sub-check rather than a separate ticket.
4. **No new audit modes**: this ticket extends Phase 2 (structural) only. The 4-mode taxonomy (structural / prose / remediation / cross_story) is preserved.

## Verification Layers

1. `stalled_clock_check` guidance names the exact CLK condition (`salience: high`, `status: active`, no recent `tick_history[]` within default `N=5` pages), exclusions, severity, repair kind, and required cited evidence → manual contract review + grep-proof
2. `under_supported_critical_revelation_check` guidance names the exact STSEC condition (`salience: high`, `status: revealed`, fewer than 2 discovered `clue_carriers[]` before or at `reveal_event`), severity, repair kind, and required cited evidence → manual contract review + grep-proof
3. `dropped_high_salience_setup_check` guidance names the exact STQ condition (`salience: high`, `status: open | complicated`, terminal page, missing `terminal_rationale` coverage), severity, repair kind, and required cited evidence → manual contract review + grep-proof
4. `clock_proliferation_warning` guidance names the active/paused CLK count threshold (default 5), severity, `bundle_advice` repair kind, and required cited evidence → manual contract review + grep-proof
5. The structural-mode inventory is updated from 9 to 10 sub-phases and includes Phase 2i without changing existing Phase 2a-2h semantics → grep-proof + manual review

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
- Shared validator extensions — owned by archive/tickets/SPEC42STOSTADEB-008.md
- Turn-cycle integration — landed in `archive/tickets/SPEC42STOSTADEB-009.md`
- Bootstrap optional seeding — owned by SPEC42STOSTADEB-010
- Commitment-block-authoring extension — owned by archive/tickets/SPEC42STOSTADEB-011.md
- Prose-attach verification — owned by SPEC42STOSTADEB-013
- Cross-class contract doc updates — owned by SPEC42STOSTADEB-014
- **`backfill_proposal` mode** (per SPEC-42 §Phase 5): deferred to a follow-up spec per SPEC-42 §Risks recommendation (pattern-recognition complexity is substantial: 3 distinct backfill flows — THR→STQ, DA/BEL/SF→STSEC, THR/CNSQ/OBL→CLK — each requiring its own pattern-recognition logic). The §Step 6 cross-spec follow-ups list flags this for follow-up-spec drafting.

## Acceptance Criteria

### Tests That Must Pass

1. Grep-proof confirms `.claude/skills/branching-story-health-audit/SKILL.md` contains `stalled_clock_check`, `under_supported_critical_revelation_check`, `dropped_high_salience_setup_check`, and `clock_proliferation_warning`.
2. Grep-proof confirms the skill now names Phase 2i and "10 structural sub-phases" in its structural-mode inventory.
3. Manual review confirms each new check is warning-only and emits existing health-audit repair kinds (`branch_flag` for per-branch mechanism rot, `bundle_advice` for clock proliferation), not a HARD-REJECT or new audit mode.
4. Manual review confirms each new check is conditional on the corresponding record class being present, so bundles without CLK/STSEC/STQ records are not flagged for absence.
5. `git diff --check -- .claude/skills/branching-story-health-audit/SKILL.md archive/tickets/SPEC42STOSTADEB-012.md` passes.

### Invariants

1. The three named structural checks + the §Risks proliferation warning compose with existing Phase 2 sub-checks — no existing check's logic is altered
2. Warnings use the existing health-audit warning shape (repair_kind: branch_flag for per-page issues; repair_kind: bundle_advice for proliferation)
3. The checks fire only when their corresponding classes exist in the bundle (no false positives on bundles that don't use the new classes)
4. The `backfill_proposal` mode is NOT introduced in this ticket — deferred to a follow-up spec per §Out of Scope

## Test Plan

### New/Modified Tests

1. None — skill-only guidance change with no executable skill-test harness in the live repo. Verification is manual contract review plus grep-proof over the changed skill and ticket.

### Commands

1. `rg -n 'stalled_clock_check|under_supported_critical_revelation_check|dropped_high_salience_setup_check|clock_proliferation_warning|Phase 2i|10 structural sub-phases|bundle_advice' .claude/skills/branching-story-health-audit/SKILL.md`
2. `git diff --check -- .claude/skills/branching-story-health-audit/SKILL.md archive/tickets/SPEC42STOSTADEB-012.md`
3. Manual contract review against `docs/FOUNDATIONS.md` §Story Bundles §5 / §5c, `.claude/skills/_shared-templates/story-state-contract.md`, and `.claude/skills/_shared-templates/story-record-schemas.md` confirms the added warning guidance matches the landed CLK/STSEC/STQ schemas and does not alter HARD-GATE or validator behavior.
4. The full-pipeline executable verification remains owned by `tickets/SPEC42STOSTADEB-015.md`.

## Outcome

Completed: 2026-05-18

What changed:
- `.claude/skills/branching-story-health-audit/SKILL.md` now treats structural mode as 10 sub-phases and adds Phase 2i for CLK / STSEC / STQ mechanism health.
- Phase 2i defines warning-only audit checks for stalled high-salience clocks, under-supported high-salience secret revelations, dropped high-salience open setups at terminal pages, and clock proliferation.
- The health-audit prerequisites now include CLK, STSEC, and STQ records in the class set read by Phase 2.

Deviations from original plan:
- No executable skill dry-run or fixture harness exists for this prose skill in the live repo. Verification was narrowed to manual contract review plus grep/hygiene proof.
- No `tools/validators` regression run was needed because the ticket changed only `.claude/skills/branching-story-health-audit/SKILL.md`; per-commit validators are owned by earlier tickets and unchanged here.

Verification results:
- `rg -n 'stalled_clock_check|under_supported_critical_revelation_check|dropped_high_salience_setup_check|clock_proliferation_warning|Phase 2i|10 structural sub-phases|bundle_advice' .claude/skills/branching-story-health-audit/SKILL.md` showed the four new warning ids, Phase 2i, the updated 10-sub-phase inventory, and `bundle_advice`.
- `git diff --check -- .claude/skills/branching-story-health-audit/SKILL.md archive/tickets/SPEC42STOSTADEB-012.md` passed.
- Manual review against `docs/FOUNDATIONS.md` §Story Bundles §5 / §5c and the shared story record schemas confirmed the checks are warning-only, conditional on record presence, and use landed CLK/STSEC/STQ fields.
