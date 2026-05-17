# SPEC38STOLOCDIE-009: Amend `story-promotion-closeout` with DA-supersession worked examples

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — modifies `.claude/skills/story-promotion-closeout/SKILL.md`
**Deps**: archive/tickets/SPEC38STOLOCDIE-001.md

## Problem

`story-promotion-closeout` SKILL.md line 187 states: *"For `source_kind: artifact_canonization`, supersede story-local `DA` only if a §4.5.10 field changes. World-level DA linkage is recorded in the closeout ledger."* The rule is correct but compact; the worked-example set does not cover the common ambiguity cases that operators routinely face:

- canon-addition accepts the DA's central claim as a CF, but the DA's §4.5.10 fields are unchanged → supersession or ledger-only?
- canon-addition clarifies `truth_relation` (was `contested`, now `true`) or `circulation` (closeout reveals factional propagation) → supersession trigger?
- canon-addition rejects the DA's claim → does the DA itself stay active?

This ticket expands the existing rule with three worked-disposition examples per SPEC-38 §D9.

## Assumption Reassessment (2026-05-17)

1. Verified `.claude/skills/story-promotion-closeout/SKILL.md` line 187 (per brainstorm agent verification) states the DA-supersession-only-on-field-change rule with the World-level-DA-linkage clause. The rule is correct; the worked-example expansion does not change the rule.
2. Verified SPEC-38 §D9 prescribes 3 worked-disposition examples (NOT triggered when canon adds context without §4.5.10 field change; triggered when canon clarifies a field; NOT triggered when canon rejects the claim) — all consistent with the existing rule.
3. Cross-skill boundary: closeout's worked examples reference the DA schema fields enumerated in `story-record-schemas.md` §4.5.10 (12 fields: `title`, `author`, `genre`, `body`, `intended_audience`, `circulation`, `truth_relation`, `supersedes`, `derived_from`, plus `id`/`story_id`/`created_at_page`). The field list must match the schema; tickets in this batch make no schema changes (per SPEC-38 §Out of Scope), so the field enumeration remains stable.
4. FOUNDATIONS principles motivating this ticket: Rule 6 No Silent Retcons (supersession-with-cause vs ledger-only verdict — both are documented closeout outputs that preserve audit trail; the worked examples disambiguate which path applies per case); §Story Bundles §4 Write Discipline (DA supersession routes through `append_story_diegetic_artifact_record` per the patch engine).

## Architecture Check

1. Worked-example expansion (cleaner than re-stating the rule): the rule itself is correct and compact; operators understand WHEN they should think about supersession but routinely face ambiguity about WHICH case they're in. Three worked examples disambiguate the common cases without rule duplication.
2. No backwards-compatibility shims; examples are additive at line 187.

## Verification Layers

1. Three worked examples present at or adjacent to line 187 → codebase grep-proof: `grep -cE 'NOT triggered|Triggered' .claude/skills/story-promotion-closeout/SKILL.md` returns ≥3.
2. Each example names whether supersession is triggered and why → manual review.
3. Closeout-ledger-vs-supersession distinction explicit in each example → grep-proof.
4. Single-layer ticket: documentation-only; verification is grep-based.

## What to Change

### 1. Expand existing rule at line 187 with 3 worked-disposition examples

Per SPEC-38 §D9 §Change. Placement: immediately after the existing rule. Content:

```
Worked examples of when DA supersession is and is NOT triggered by closeout:

- **NOT triggered**: canon-addition accepts the DA's central claim as a CF,
  but the DA's §4.5.10 fields (`title`, `author`, `genre`, `body`,
  `intended_audience`, `circulation`, `truth_relation`, `supersedes`,
  `derived_from`) are unchanged. Record the verdict in the closeout ledger;
  do not supersede the DA. The CF's `source_basis.derived_from[]` includes
  the DA-id as audit trail.
- **Triggered**: canon-addition accepts the DA's claim AND clarifies a field
  the DA carried in an ambiguous state — e.g., `truth_relation` was
  `contested` at authoring and is now `true` per the accepted CF; or
  `circulation` shifts because the closeout reveals factional propagation
  the original DA did not record. Supersede the DA via
  `append_story_diegetic_artifact_record` with `supersedes: DA-<old>` and
  the corrected fields; record the supersession cause in the closeout
  ledger.
- **NOT triggered**: canon-addition rejects the DA's claim. The DA remains
  active with its original `truth_relation` (typically `contested` or
  `false`); the rejection is recorded in the closeout ledger. The DA
  continues to exist as branch-local in-world evidence even when its claim
  does not promote.
```

## Files to Touch

- `.claude/skills/story-promotion-closeout/SKILL.md` (modify)

## Out of Scope

- DA schema changes (deferred per SPEC-38 §Out of Scope)
- Changes to the supersession rule itself at line 187 (the rule is correct; only worked examples are added)
- Other closeout flows (non-`artifact_canonization` source kinds) — not modified
- `append_story_diegetic_artifact_record` op behavior (unchanged)

## Acceptance Criteria

### Tests That Must Pass

1. Three worked examples present at or adjacent to line 187.
2. Each example names whether supersession is triggered and why.
3. Closeout-ledger-vs-supersession distinction explicit.

### Invariants

1. The existing rule at line 187 is preserved; examples are additive.
2. The §4.5.10 field list cited in the worked examples matches the schema (12 fields per `story-record-schemas.md` §4.5.10 lines 554-571).
3. The first example's CF audit-trail clause (`source_basis.derived_from[]` includes the DA-id) is consistent with ticket 008's FOUNDATIONS §365 routing rule (parallel discipline).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-based against post-implementation file content and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -cE 'NOT triggered|Triggered' .claude/skills/story-promotion-closeout/SKILL.md`
2. `grep -nE 'append_story_diegetic_artifact_record|supersedes: DA' .claude/skills/story-promotion-closeout/SKILL.md`
