# SPEC33STOPIPSEV-004: Fix closeout proposal-package field paths

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/story-promotion-closeout/SKILL.md` skill-prose updates across multiple sections; possibly `templates/story-promotion-ledger.md` if present.
**Deps**: None

## Problem

`.claude/skills/story-promotion-closeout/SKILL.md` references the proposal package fields `source_records[]` and `branch_path` (plus `source_kind`, `contradiction_preference`, `downstream_impact_report`) as if they were top-level fields. The proposal package produced by `.claude/skills/story-fact-promotion-to-canon/SKILL.md` Phase 6 (lines 285–288) nests these under `proposal_evidence`:

```yaml
proposal_evidence:
  story_branch: BR-<integer>
  source_kind: <source_kind>
  source_records: [<source record ids>]
```

Closeout would fail to find `source_records[]` at the top level and silently mark disposition completeness on an empty set. Confirmed touch sites: lines 138, 154-155, ~230 (Phase 3 gate 6).

## Assumption Reassessment (2026-05-16)

1. **Codebase verification of nesting mismatch**: live grep of `story-promotion-closeout/SKILL.md` confirms top-level references at lines 138 ("source of truth for the promotion's `source_records` / `source_kind` / `branch_path` / `contradiction_preference` / `downstream_impact_report`"), 155 ("Load all source records from the proposal package's `source_records[]`"), and ~230 (Phase 3 gate 6 disposition completeness check); live read of `story-fact-promotion-to-canon/SKILL.md` Phase 6 (lines 285-288) confirms the proposal package nests these fields under `proposal_evidence`.
2. **Specs/docs cross-reference**: SPEC-33 §D4 names the touch sites and the corrected nesting; the proposal-package shape in promotion-to-canon Phase 6 is authoritative.
3. **Cross-skill boundary**: the shared boundary under audit is the proposal-package YAML schema produced by `story-fact-promotion-to-canon` Phase 6 and consumed by `story-promotion-closeout` Phase 1+ pre-flight and Phase 3 gate 6. The closeout's prose must name the canonical nested paths (`proposal_evidence.source_records[]`, `proposal_evidence.story_branch`, etc.); the package shape itself is correct and authoritative.
4. **FOUNDATIONS principle restatement**: §5 Validation Rules at Story Scope (Rule 1 — No Floating Facts: schema-named field paths must resolve to real YAML locations in the proposal package).

## Architecture Check

1. The replacements add the `proposal_evidence.` prefix to every top-level reference in closeout prose, matching the actual proposal-package schema. Cleaner than alternatives that would (a) flatten the proposal package by removing the `proposal_evidence` wrapper (would force a sibling-skill change for cosmetic relief) or (b) leave the prose ambiguous (continues silent disposition-on-empty-set failure).
2. No backwards-compatibility aliasing/shims introduced — top-level references are corrected without legacy-path support.

## Verification Layers

1. Every `source_records[]` reference is preceded by `proposal_evidence.` (or names closeout's local `source_record_dispositions:` disposition map) → codebase grep-proof.
2. Every `branch_path` reference is replaced with `proposal_evidence.story_branch` → codebase grep-proof.
3. Phase 3 gate 6 disposition completeness wording correctly references nested paths → manual review against `_shared-templates/story-state-contract.md` and `story-fact-promotion-to-canon/SKILL.md` Phase 6 proposal-package shape.

## What to Change

### 1. Replace top-level field references with nested forms in closeout SKILL.md

In `.claude/skills/story-promotion-closeout/SKILL.md`, apply find-and-replace across all occurrences:

- `source_records[]` (when referring to the proposal package field) → `proposal_evidence.source_records[]`
- `branch_path` (when referring to the proposal package field) → `proposal_evidence.story_branch`
- `source_kind` (when referring to the proposal package field) → `proposal_evidence.source_kind`
- `contradiction_preference` (when referring to the proposal package field) → `proposal_evidence.contradiction_preference`
- `downstream_impact_report` (when referring to the proposal package field) → `proposal_evidence.downstream_impact_report`

Confirmed touch sites from codebase grep: lines 138, 154-155, ~230 (Phase 3 gate 6). Implementer must read the full file and apply at every occurrence — the line numbers are landmarks, not exhaustive.

Preserve closeout's own LOCAL disposition map references — the `source_record_dispositions:` key set is a closeout-internal disposition map, NOT the proposal-package field. Do not prefix it with `proposal_evidence.`.

### 2. Phase 3 gate 6 disposition completeness wording

The disposition completeness check at Phase 3 gate 6 must explicitly state:

```
The `source_record_dispositions:` key set MUST exactly equal
`proposal_evidence.source_records[]`.
```

### 3. SP ledger template (conditional — if file exists)

If `.claude/skills/story-promotion-closeout/templates/story-promotion-ledger.md` exists, verify whether it references the proposal-package fields by top-level name and apply the same prefix correction. If the template does not exist or does not reference these fields, no change needed.

### 4. Cross-file legacy-string sweep

Run a final grep at the end of implementation:

```
grep -n 'source_records\|branch_path\|source_kind\|contradiction_preference\|downstream_impact_report' .claude/skills/story-promotion-closeout/
```

Confirm every match is either preceded by `proposal_evidence.` OR names the closeout-internal `source_record_dispositions:` map. Any unprefixed top-level reference is a miss and must be corrected.

## Files to Touch

- `.claude/skills/story-promotion-closeout/SKILL.md` (modify)
- `.claude/skills/story-promotion-closeout/templates/story-promotion-ledger.md` (modify, conditional on existence)

## Out of Scope

- The proposal-package YAML schema itself at `story-fact-promotion-to-canon/SKILL.md` Phase 6 — already canonical and authoritative; not modified.
- Other closeout SKILL.md changes (STSTAT propagation, "now landed" provenance) — covered by SPEC33STOPIPSEV-005 (D5) and SPEC33STOPIPSEV-009 (D9). Same-file co-location requires landing-order awareness with 005 (which touches Phase 5 op list line 297 region) and 009 (which touches line 297 inline PEENH-007 citation).
- Patch-engine ops — no engine changes required.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'source_records\[' .claude/skills/story-promotion-closeout/SKILL.md` returns matches that are each preceded by `proposal_evidence.` OR refer to the closeout-internal `source_record_dispositions:` map.
2. `grep -n 'branch_path' .claude/skills/story-promotion-closeout/SKILL.md` returns zero matches (replaced by `proposal_evidence.story_branch`).
3. `grep -n 'proposal_evidence\.' .claude/skills/story-promotion-closeout/SKILL.md` returns matches at the previously-top-level reference sites (lines 138, 154-155, ~230).
4. Phase 3 gate 6 disposition completeness check explicitly states the `source_record_dispositions:` key set must equal `proposal_evidence.source_records[]`.

### Invariants

1. Every closeout reference to a proposal-package field uses the canonical nested path (`proposal_evidence.<field>`).
2. The closeout-internal `source_record_dispositions:` disposition map is preserved as a local map, not conflated with the proposal-package field.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n 'source_records\|branch_path\|source_kind\|contradiction_preference\|downstream_impact_report' .claude/skills/story-promotion-closeout/SKILL.md` — every match preceded by `proposal_evidence.` or naming the local disposition map.
2. `grep -n 'proposal_evidence\.story_branch' .claude/skills/story-promotion-closeout/SKILL.md` — must return matches at the previously-`branch_path` reference sites.
3. A narrower per-skill grep is the right verification boundary because the proposal-package schema is owned by promotion-to-canon (not modified here) and the closeout's prose is the only mutating surface.
