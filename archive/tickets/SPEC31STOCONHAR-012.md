# SPEC31STOCONHAR-012: Split deterministic vs. judgment-assisted prose invention

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-prose-attach/SKILL.md`; spec truthing in `specs/SPEC-31-story-contract-hardening-iii.md`
**Deps**: `specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

At intake, `branching-story-prose-attach/SKILL.md` Phase 3 partially distinguished deterministic and judgment-assisted cases for `invented_structural_fact`, but the wording overstated determinism. Some structural inventions (implied faction alignment, new capability, institutional rule not present in the plan) require semantic judgment — regex patterns cannot catch them. Overclaiming determinism creates false confidence or brittle regex validators.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: prose-attach `:193` confirmed at quoted location.
2. **Spec assumptions verified**: `specs/SPEC-31-story-contract-hardening-iii.md` §D12 specifies the explicit split.
3. **Cross-skill / cross-artifact boundary under audit**: prose-attach Phase 3 check ↔ receipt schema (`pages-prose-receipts/PG-<integer>.yaml`). No structured schema change; the `invented_structural_fact` field's value semantics are clarified.
4. **FOUNDATIONS principle under audit (restated)**: §Story Bundles §6b (Information / Observer Firewall) — invented structural facts that violate the firewall must be deterministic FAILs; semantic inventions (alignment, capability, institutional rule) are judgment-assisted because regex cannot reliably detect them.
5. **HARD-GATE read**: `docs/HARD-GATE-DISCIPLINE.md` was read because this ticket changes validation-signal wording in a content-generating skill. The change preserves the existing HARD-GATE approval boundary and write routing; it clarifies how Phase 3 classifies prose defects before the Phase 6 approval/write step.
6. **Proof boundary corrected**: no executable prose-attach dry-run runner exists in the repo surface. The drafted dry-run acceptance is replaced with manual contract review plus focused grep proof over `.claude/skills/branching-story-prose-attach/SKILL.md`.

## Architecture Check

1. **Cleaner than alternative**: explicit deterministic/judgment-assisted split prevents implementers from writing brittle regex validators for cases that fundamentally need semantic review.
2. **No backwards-compatibility shims**: prose-attach receipt schema unchanged; only the field's value-source documentation is sharpened.

## Verification Layers

1. **Prose-attach prose explicitly splits the cases** → codebase grep-proof.
2. **Dead-actor-speaks and forbidden mystery examples remain deterministic FAIL cases** → manual contract review + grep-proof.
3. **Faction alignment, capability, and institutional-rule examples are judgment-assisted with `notes` review guidance** → manual contract review + grep-proof.

## Landed Changes

### 1. Prose-attach `branching-story-prose-attach/SKILL.md` Phase 3

Replaced `invented_structural_fact` wording with:
```
`invented_structural_fact` has deterministic and judgment-assisted subchecks.

Deterministic FAIL cases (regex or state-projection-driven):
- prose contradicts active STSTAT life/agency/location (e.g., dead actor
  speaks; located actor appears in a different STLOC; incapacitated actor
  performs a complex action);
- prose asserts a named record id or canon-fact id absent from the plan's
  §4 / §7 / state snapshot;
- prose states a mystery resolution that the plan's §11 marks as forbidden.

Judgment-assisted WARN/FAIL cases (semantic):
- implied faction alignment shifts not present in the plan;
- new capability or magical/technological affordance not present in the
  plan's §4 or active state;
- institutional rule or law invoked but not present in active canon
  (CF / INV) or plan §4.

The roll-up `invented_structural_fact` receipt field records the worst
verdict across both sub-categories. Judgment-assisted findings are flagged
in `notes` so the user can review and decide on `revise_prose` vs.
`run_turn_cycle_repair` vs. canon-promotion.
```

### 2. Optional follow-up (deferred)

If the prose-attach receipt schema does not already carry a `subcategory: deterministic | judgment` field on each finding, an optional schema extension could surface the split in machine-readable form. Out of scope for D12 v1; defer to a follow-up if needed after first-real-bundle pressure.

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify — `:193` area)
- `specs/SPEC-31-story-contract-hardening-iii.md` (modify — D12 implementation note)

## Out of Scope

- Prose-attach receipt schema extension to add `subcategory` field — deferred.
- Other prose-attach checks (`hash_integrity`, `engine_jargon_leak`, etc.) — not in scope.

## Acceptance Criteria

### Tests That Must Pass

1. Focused grep/manual review confirms dead-actor-speaks and forbidden-mystery examples are deterministic FAIL cases.
2. Focused grep/manual review confirms new faction alignment, capability, and institutional-rule cases are judgment-assisted findings with `notes` flagging the case for user review.

### Invariants

1. Prose-attach never overclaims determinism for cases that semantically require judgment.
2. The roll-up receipt field aggregates both sub-categories transparently.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "invented_structural_fact" .claude/skills/branching-story-prose-attach/SKILL.md` → match shows the explicit split.
2. `grep -n "Deterministic FAIL cases\\|Judgment-assisted WARN/FAIL cases\\|notes" .claude/skills/branching-story-prose-attach/SKILL.md` → matches show the proof anchors for the split.

## Outcome

Completed: 2026-05-15

`branching-story-prose-attach` Phase 3 now distinguishes deterministic `invented_structural_fact` FAIL cases from judgment-assisted WARN/FAIL cases. Deterministic examples cover state-projection contradictions, absent record/canon-fact ids, and forbidden mystery resolutions. Judgment-assisted examples cover faction alignment shifts, new capabilities/affordances, and institutional rules/laws absent from active canon or the plan. The roll-up still records the worst verdict, and judgment-assisted findings are flagged in receipt `notes` for user review.

SPEC-31 D12 was annotated with a dated implementation note so the remaining proposal prose is clearly historical intake context.

## Verification Result

1. `grep -n "invented_structural_fact" .claude/skills/branching-story-prose-attach/SKILL.md` — passed; the edited Phase 3 block contains the split and roll-up guidance.
2. `grep -n "Deterministic FAIL cases\\|Judgment-assisted WARN/FAIL cases\\|notes" .claude/skills/branching-story-prose-attach/SKILL.md` — passed; the proof anchors show deterministic cases, judgment-assisted cases, and `notes` review guidance.
3. Manual contract review — passed; the HARD-GATE approval/write boundary remains unchanged, and the edit only clarifies validation-signal classification before receipt writing.

## Deviations

- Drafted skill dry-runs were not executed because the repo has no executable prose-attach runner. The accepted proof surface is manual contract review plus focused grep over the edited skill.
- The optional receipt `subcategory: deterministic | judgment` schema extension remains out of scope, matching SPEC-31 D12's defer-if-scope-expanding guidance.
