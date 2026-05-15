# SPEC31STOCONHAR-012: Split deterministic vs. judgment-assisted prose invention

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-prose-attach/SKILL.md`
**Deps**: `specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

`branching-story-prose-attach/SKILL.md:193` partially distinguishes deterministic and judgment-assisted cases for `invented_structural_fact`, but the current wording overstates determinism. Some structural inventions (implied faction alignment, new capability, institutional rule not present in the plan) require semantic judgment — regex patterns cannot catch them. Overclaiming determinism creates false confidence or brittle regex validators.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: prose-attach `:193` confirmed at quoted location.
2. **Spec assumptions verified**: `specs/SPEC-31-story-contract-hardening-iii.md` §D12 specifies the explicit split.
3. **Cross-skill / cross-artifact boundary under audit**: prose-attach Phase 3 check ↔ receipt schema (`pages-prose-receipts/PG-<integer>.yaml`). No structured schema change; the `invented_structural_fact` field's value semantics are clarified.
4. **FOUNDATIONS principle under audit (restated)**: §Story Bundles §6b (Information / Observer Firewall) — invented structural facts that violate the firewall must be deterministic FAILs; semantic inventions (alignment, capability, institutional rule) are judgment-assisted because regex cannot reliably detect them.

## Architecture Check

1. **Cleaner than alternative**: explicit deterministic/judgment-assisted split prevents implementers from writing brittle regex validators for cases that fundamentally need semantic review.
2. **No backwards-compatibility shims**: prose-attach receipt schema unchanged; only the field's value-source documentation is sharpened.

## Verification Layers

1. **Prose-attach prose explicitly splits the cases** → codebase grep-proof.
2. **Prose-attach dry-run on dead-actor-speaks invention** → skill dry-run (deterministic FAIL).
3. **Prose-attach dry-run on new faction alignment invention** → skill dry-run (judgment-assisted finding with `notes` flag).

## What to Change

### 1. Prose-attach `branching-story-prose-attach/SKILL.md` Phase 3 `:193` area

Replace `invented_structural_fact` wording with:
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

### 2. Optional follow-up (defer)

If the prose-attach receipt schema does not already carry a `subcategory: deterministic | judgment` field on each finding, an optional schema extension could surface the split in machine-readable form. Out of scope for D12 v1; defer to a follow-up if needed after first-real-bundle pressure.

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify — `:193` area)

## Out of Scope

- Prose-attach receipt schema extension to add `subcategory` field — deferred.
- Other prose-attach checks (`hash_integrity`, `engine_jargon_leak`, etc.) — not in scope.

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run on prose with dead-actor-speaks invention → deterministic FAIL.
2. Skill dry-run on prose introducing a new faction alignment → judgment-assisted finding with `notes` flagging the case for user review.

### Invariants

1. Prose-attach never overclaims determinism for cases that semantically require judgment.
2. The roll-up receipt field aggregates both sub-categories transparently.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "invented_structural_fact" .claude/skills/branching-story-prose-attach/SKILL.md` → match shows the explicit split.
2. Prose-attach dry-run on fixture prose with dead-actor-speaks → emits deterministic FAIL.
