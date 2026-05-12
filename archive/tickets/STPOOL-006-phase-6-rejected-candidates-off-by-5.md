# STPOOL-006: Expand Phase 6 HARD-GATE rejected-candidates summary to 14 categories

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — SKILL.md edit only.
**Deps**: None

## Problem

At intake, `.claude/skills/storylet-pool-authoring/SKILL.md:304-313` enumerated only 9 of the 14 Phase 4 gate-failure categories in the Phase 6 HARD-GATE deliverable's "REJECTED CANDIDATES (info)" block. Phase 4 has 14 gates (per `SKILL.md:57` HARD-GATE block and `references/phase-4-5-canon-safety-checks.md:9-30`); the deliverable summary shown to the user at the HARD-GATE was missing 5 categories:

- arc-envelope-conformance (gate 10)
- stop-policy-parsability (gate 11)
- effect-model-legality (gate 12)
- exit-portfolio-completeness (gate 13)
- Rule 11 spectator-caste leverage (gate 14)

`templates/storylet-batch-manifest.md:32-45` already enumerated all 14, so the persisted SLB manifest carried the full rejection accounting — but the user-facing HARD-GATE summary lagged. Before this ticket, rejections from the missing 5 categories could show as 0 in the user-facing summary even when they occurred, undermining the user's ability to calibrate the HARD-GATE decision against the validator's actual rejection profile.

This was uncovered by storylet-pool-authoring streamlining audit 2026-05-12 finding F-05.

## Assumption Reassessment (2026-05-12)

1. At intake, verified `SKILL.md:304-313` enumerated 9 rejection categories (mystery-firewall, resolution-authority, invariant-compatibility, consequence-capacity, dedup, content-intensity, predicate-DSL, branch-contamination, schema-completeness).
2. Verified `references/phase-4-5-canon-safety-checks.md:9-30` enumerates 14 Phase 4 gates with the 5 missing categories named at gates 10-14.
3. Verified `templates/storylet-batch-manifest.md:32-45` already includes the full 14-row rejection breakdown (the persisted manifest is correct).
4. FOUNDATIONS Rule 6 (No Silent Retcons) framing applies analogously at the HARD-GATE deliverable surface: silently masking 5 rejection categories from the user-facing summary is a structural information-leak that the manifest persists correctly but the gate display does not.
5. The originally drafted `diff` proof compared plain `<count>` rows in `SKILL.md` against backtick-wrapped manifest-template rows, so closeout uses normalized extraction that strips backticks before comparing category text.

## Architecture Check

1. Single-source the rejection enumeration. The cleanest fix is to make the SKILL.md Phase 6 summary's REJECTED CANDIDATES block mirror `templates/storylet-batch-manifest.md`'s breakdown exactly — both should derive from `references/phase-4-5-canon-safety-checks.md`'s 14-gate enumeration.
2. STPOOL-009 (separate ticket from audit F-08) addresses the broader Phase 6 inline section's parallel-enumeration drift hazard architecturally; this ticket is the immediate correctness fix while the architectural refactor matures.

## Verification Layers

1. **Within-skill consistency** — count of rejection categories in `SKILL.md:304-318` REJECTED CANDIDATES block equals 14 → `awk '/REJECTED CANDIDATES/,/VALIDATION VERDICTS/' .claude/skills/storylet-pool-authoring/SKILL.md | grep -c '^- '` returns 14.
2. **Cross-document agreement** — the 14 categories at SKILL.md:304-318 match (by name and order) the 14 categories at `templates/storylet-batch-manifest.md:32-45` and the 14 gates at `references/phase-4-5-canon-safety-checks.md:9-30`.

## Landed Changes

### 1. Expand the Phase 6 REJECTED CANDIDATES block

In `.claude/skills/storylet-pool-authoring/SKILL.md`, the Phase 6 `REJECTED CANDIDATES (info)` block now includes all 14 Phase 4 rejection categories. The full corrected block is:

```
REJECTED CANDIDATES (info):
- <count> mystery-firewall rejects (forbidden M resolution attempted)
- <count> resolution-authority rejects (canon_candidate on author-pool storylet)
- <count> invariant-compatibility rejects
- <count> consequence-capacity rejects
- <count> dedup rejects
- <count> content-intensity rejects
- <count> predicate-DSL rejects
- <count> branch-contamination rejects
- <count> schema-completeness drops (after 2 revise retries)
- <count> arc-envelope-conformance rejects
- <count> stop-policy-parsability rejects
- <count> effect-model-legality rejects
- <count> exit-portfolio-completeness rejects
- <count> Rule 11 spectator-caste leverage rejects
```

Order matches `templates/storylet-batch-manifest.md:32-45` (which is gate-order 1-14).

## Files to Touch

- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify)
- `archive/tickets/STPOOL-006-phase-6-rejected-candidates-off-by-5.md` (modify closeout)

## Out of Scope

- The broader architectural refactor of the Phase 6 inline section to derive from the manifest template rather than duplicating it — that is STPOOL-009 (audit F-08).
- Adding rejection-counter telemetry beyond the deliverable summary (the 14 counters are already populated by the validators internally; this ticket only surfaces them).

## Acceptance Criteria

### Tests That Must Pass

1. `awk '/REJECTED CANDIDATES \(info\):/,/VALIDATION VERDICTS:/' .claude/skills/storylet-pool-authoring/SKILL.md | grep -cE "^- <count>"` returns 14.
2. The 14 category names at SKILL.md:304-318 match the 14 at `templates/storylet-batch-manifest.md:32-45` line-for-line (visual diff).

### Invariants

1. The Phase 6 HARD-GATE rejection summary, the SLB manifest's rejection table, and the Phase 4 gate enumeration all reference the same 14 categories in the same order.

## Test Plan

### New/Modified Tests

1. None — SKILL.md prose edit; the validator counters already populate these rejection categories internally.

### Commands

1. `diff <(awk '/REJECTED CANDIDATES \(info\):/,/VALIDATION VERDICTS:/' .claude/skills/storylet-pool-authoring/SKILL.md | grep -oE '<count>.*$') <(awk '/## Rejected candidates/,/## Dropped at HARD-GATE/' .claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md | grep -oE '<count>`? .*$' | sed 's/`//g')` — confirms the two enumerations are aligned after normalizing manifest-template backticks.

## Outcome

`.claude/skills/storylet-pool-authoring/SKILL.md` now lists the missing Phase 4 rejection categories in the Phase 6 HARD-GATE `REJECTED CANDIDATES (info)` block:

- arc-envelope-conformance
- stop-policy-parsability
- effect-model-legality
- exit-portfolio-completeness
- Rule 11 spectator-caste leverage

The Phase 6 user-facing summary now has 14 rejection rows and matches the manifest template's rejected-candidates enumeration after normalizing the template's markdown backticks.

## Verification Result

1. `awk '/REJECTED CANDIDATES \(info\):/,/VALIDATION VERDICTS:/' .claude/skills/storylet-pool-authoring/SKILL.md | grep -cE '^- <count>'` returned `14`.
2. `diff <(awk '/REJECTED CANDIDATES \(info\):/,/VALIDATION VERDICTS:/' .claude/skills/storylet-pool-authoring/SKILL.md | grep -oE '<count>.*$') <(awk '/## Rejected candidates/,/## Dropped at HARD-GATE/' .claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md | grep -oE '<count>`? .*$' | sed 's/`//g')` exited `0`.

## Deviations

The originally drafted comparison command was normalized during reassessment because the manifest template wraps `<count>` in markdown backticks while the SKILL.md HARD-GATE summary does not. No source scope changed.
