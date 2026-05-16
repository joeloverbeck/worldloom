# SPEC33STOPIPSEV-004: Fix closeout proposal-package field paths

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/story-promotion-closeout/SKILL.md` skill-prose updates across multiple sections; `specs/SPEC-33-story-pipeline-seventh-iteration-fixes.md` D4 implementation note.
**Deps**: None

## Problem

At intake, `.claude/skills/story-promotion-closeout/SKILL.md` references the proposal package fields `source_records[]`, `source_kind`, and `branch_path` as if they were top-level fields. The proposal package produced by `.claude/skills/story-fact-promotion-to-canon/SKILL.md` Phase 6 and `templates/proposal-package.yaml` nests these under `proposal_evidence`:

```yaml
proposal_evidence:
  story_branch: BR-<integer>
  source_kind: <source_kind>
  source_records: [<source record ids>]
```

Closeout would fail to find `source_records[]` at the top level and silently mark disposition completeness on an empty set. Confirmed touch sites: lines 138, 154-155, ~230 (Phase 3 gate 6). Reassessment corrected the drafted D4 overreach: `contradiction_preference` and `downstream_impact_report` are top-level proposal-package fields in the live producer template, so this ticket preserves those top-level paths.

## Assumption Reassessment (2026-05-16)

1. **Codebase verification of nesting mismatch**: live grep of `story-promotion-closeout/SKILL.md` confirms top-level references at lines 138 ("source of truth for the promotion's `source_records` / `source_kind` / `branch_path` / `contradiction_preference` / `downstream_impact_report`"), 155 ("Load all source records from the proposal package's `source_records[]`"), and ~230 (Phase 3 gate 6 disposition completeness check). Live read of `story-fact-promotion-to-canon/SKILL.md` Phase 6 and `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` confirms `proposal_evidence.story_branch`, `proposal_evidence.source_kind`, and `proposal_evidence.source_records[]` are nested, while `downstream_impact_report` and `contradiction_preference` remain top-level.
2. **Specs/docs cross-reference**: SPEC-33 §D4 names the touch sites, but overstates the nesting for `downstream_impact_report` and `contradiction_preference`; the live proposal-package shape in promotion-to-canon Phase 6 and the package template are authoritative. This ticket updates SPEC-33 with a D4 implementation note rather than rewriting the whole proposal spec.
3. **Cross-skill boundary**: the shared boundary under audit is the proposal-package YAML schema produced by `story-fact-promotion-to-canon` Phase 6 and consumed by `story-promotion-closeout` Phase 1+ pre-flight and Phase 3 gate 6. The closeout's prose must name the canonical nested paths (`proposal_evidence.source_records[]`, `proposal_evidence.story_branch`, `proposal_evidence.source_kind`) while preserving the canonical top-level paths (`contradiction_preference`, `downstream_impact_report`). The package shape itself is correct and authoritative.
4. **FOUNDATIONS principle restatement**: §5 Validation Rules at Story Scope (Rule 1 — No Floating Facts: schema-named field paths must resolve to real YAML locations in the proposal package).

## Architecture Check

1. The replacements add the `proposal_evidence.` prefix only to fields that the producer actually nests, matching the actual proposal-package schema. Cleaner than alternatives that would (a) flatten the proposal package by removing the `proposal_evidence` wrapper, (b) invent nested copies of top-level `contradiction_preference` / `downstream_impact_report`, or (c) leave the prose ambiguous.
2. No backwards-compatibility aliasing/shims introduced — top-level references are corrected without legacy-path support.

## Verification Layers

1. Every `source_records[]` reference is preceded by `proposal_evidence.` (or names closeout's local `source_record_dispositions:` disposition map) → codebase grep-proof.
2. Every `branch_path` reference is replaced with `proposal_evidence.story_branch` → codebase grep-proof.
3. Top-level `contradiction_preference` and `downstream_impact_report` references remain top-level and match the producer template → manual review against `story-fact-promotion-to-canon/SKILL.md` Phase 6 and `templates/proposal-package.yaml`.
4. Phase 3 gate 6 disposition completeness wording correctly references nested paths → manual review against `_shared-templates/story-state-contract.md` and `story-fact-promotion-to-canon/SKILL.md` Phase 6 proposal-package shape.

## Landed Changes

### 1. Replace top-level field references with nested forms in closeout SKILL.md

In `.claude/skills/story-promotion-closeout/SKILL.md`, proposal-package references now use:

- `source_records[]` (when referring to the proposal package field) → `proposal_evidence.source_records[]`
- `branch_path` (when referring to the proposal package field) → `proposal_evidence.story_branch`
- `source_kind` (when referring to the proposal package field) → `proposal_evidence.source_kind`
- Preserve `contradiction_preference` as a top-level proposal-package field.
- Preserve `downstream_impact_report` as a top-level proposal-package field.

Touched sites include the HARD-GATE inventory sentence, process flow, World-State Prerequisites, Pre-flight step 6, Phase 1 loaded-record summary, Phase 2 disposition map, Phase 3 gate 6, and Phase 4 closeout-ledger prose.

Preserve closeout's own LOCAL disposition map references — the `source_record_dispositions:` key set is a closeout-internal disposition map, NOT the proposal-package field. Do not prefix it with `proposal_evidence.`.

### 2. Phase 3 gate 6 disposition completeness wording

The disposition completeness check at Phase 3 gate 6 must explicitly state:

```
The `source_record_dispositions:` key set MUST exactly equal
`proposal_evidence.source_records[]`.
```

### 3. SP ledger template check

No `.claude/skills/story-promotion-closeout/templates/story-promotion-ledger.md` file exists; the live skill defines the closeout ledger inline.

### 4. Cross-file legacy-string sweep

Final grep:

```
grep -n 'source_records\|branch_path\|source_kind\|contradiction_preference\|downstream_impact_report' .claude/skills/story-promotion-closeout/
```

Every `source_records` / `branch_path` / proposal-package `source_kind` match is now either preceded by `proposal_evidence.` OR names the closeout-internal `source_record_dispositions:` map / verdict `source_kind` values. `contradiction_preference` and `downstream_impact_report` remain top-level and align with the producer template.

## Files to Touch

- `.claude/skills/story-promotion-closeout/SKILL.md` (modify)
- `specs/SPEC-33-story-pipeline-seventh-iteration-fixes.md` (modify — D4 implementation note)

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
5. `grep -n 'proposal_evidence\\.contradiction_preference\\|proposal_evidence\\.downstream_impact_report' .claude/skills/story-promotion-closeout/SKILL.md` returns zero matches; historical SPEC-33 D4 text is labelled by the implementation note.

### Invariants

1. Every closeout reference to a proposal-package field uses the canonical live path: `proposal_evidence.source_records[]`, `proposal_evidence.story_branch`, and `proposal_evidence.source_kind` for nested evidence fields; top-level `contradiction_preference` and `downstream_impact_report` for package-level decision/report fields.
2. The closeout-internal `source_record_dispositions:` disposition map is preserved as a local map, not conflated with the proposal-package field.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n 'source_records\|branch_path\|source_kind\|contradiction_preference\|downstream_impact_report' .claude/skills/story-promotion-closeout/SKILL.md` — every nested evidence-field match uses `proposal_evidence.` or names the local disposition map; top-level `contradiction_preference` and `downstream_impact_report` are preserved.
2. `grep -n 'proposal_evidence\.story_branch' .claude/skills/story-promotion-closeout/SKILL.md` — must return matches at the previously-`branch_path` reference sites.
3. `grep -n 'proposal_evidence\.contradiction_preference\|proposal_evidence\.downstream_impact_report' .claude/skills/story-promotion-closeout/SKILL.md` — must return zero matches.
4. Manual review of `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` against closeout wording and the SPEC-33 D4 note.

## Outcome

Completed on 2026-05-16.

- `.claude/skills/story-promotion-closeout/SKILL.md` now points closeout source-record loading and disposition completeness at `proposal_evidence.source_records[]`, names `proposal_evidence.source_kind`, and replaces the old `branch_path` wording with `proposal_evidence.story_branch`.
- `contradiction_preference` and `downstream_impact_report` remain top-level proposal-package fields because the live producer skill and proposal-package template define them that way.
- `specs/SPEC-33-story-pipeline-seventh-iteration-fixes.md` now carries a D4 implementation note documenting the corrected live contract and labelling the over-broad nested-field prose as historical intake context.
- No closeout template file was updated because `.claude/skills/story-promotion-closeout/templates/story-promotion-ledger.md` does not exist; the ledger template is inline in `SKILL.md`.

## Verification Result

- `grep -n 'source_records\|branch_path\|source_kind\|contradiction_preference\|downstream_impact_report' .claude/skills/story-promotion-closeout/SKILL.md` — passed by manual classification: nested evidence-field matches use `proposal_evidence.*` or local disposition/verdict `source_kind`; `contradiction_preference` and `downstream_impact_report` remain top-level.
- `grep -n 'proposal_evidence\.story_branch' .claude/skills/story-promotion-closeout/SKILL.md` — passed with the World-State Prerequisites source-of-truth line.
- `grep -n 'proposal_evidence\.contradiction_preference\|proposal_evidence\.downstream_impact_report' .claude/skills/story-promotion-closeout/SKILL.md` — passed with zero matches.
- `git diff --check -- .claude/skills/story-promotion-closeout/SKILL.md specs/SPEC-33-story-pipeline-seventh-iteration-fixes.md archive/tickets/SPEC33STOPIPSEV-004.md` — passed after archival path repair.
- Manual review confirmed `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` nests `proposal_evidence.story_branch`, `proposal_evidence.source_kind`, and `proposal_evidence.source_records[]`, while `downstream_impact_report` and `contradiction_preference` are top-level.

## Deviations

- SPEC-33 D4 and the draft ticket originally instructed `proposal_evidence.contradiction_preference` and `proposal_evidence.downstream_impact_report`; live reassessment proved those fields are top-level. The implementation preserves the live producer contract and adds a spec note instead of changing the producer schema.
