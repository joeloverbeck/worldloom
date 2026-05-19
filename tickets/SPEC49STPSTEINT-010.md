# SPEC49STPSTEINT-010: Add 4 deterministic Phase 2k checks + migration documentation to branching-story-health-audit SKILL.md

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
**Deps**: None

## Problem

`.claude/skills/branching-story-health-audit/SKILL.md:296-303` (Phase 2k) currently has 4 deterministic STPLAN/STEMO checks: `bootstrap-drift`, `stale-active-plan`, `stale-active-emotion`, `SE-plan-relation consistency`. SPEC-49 §C.3 adds 4 more deterministic checks per the audit report's Priority 1 list item 3 (*"Health-audit checks for plan conflict, plan starvation, stale emotion, contradictory emotion stacks, and suppressed-emotion rendering"*). The 4 new checks are: `stplan-contradictory-cluster` (per-holder mutually-exclusive plan predicates), `stplan-long-blocked-no-fallback` (per-holder blocked plans without fallback over N consecutive pages), `stemo-contradictory-stack` (per-holder contradictory affect_kind pairs), `stemo-suppression-render-conflict` (suppressed STEMO rendered as openly expressed in prose). SPEC-49 also merges C-X.2 migration documentation into this ticket (same SKILL.md file).

## Assumption Reassessment (2026-05-19)

1. `.claude/skills/branching-story-health-audit/SKILL.md:296-303` confirmed via codebase grep during reassess-spec spot-checks — 4 existing Phase 2k checks named with their finding codes. The new 4 checks fit the same Phase 2k structure; the SKILL.md format already documents per-check rubrics (description + finding code + severity + repair_kind).
2. SPEC-49 §Approach §C.3 (per the reassess-spec-updated spec) defines each new check's rubric:
   - `stplan-contradictory-cluster`: per holder, flag pairs of active STPLANs whose `current_step.success_condition.predicates[]` carry mutually exclusive record-targeting predicates (e.g., `location(STENT-X, STLOC-A)` and `location(STENT-X, STLOC-B)` with `STLOC-A != STLOC-B`).
   - `stplan-long-blocked-no-fallback`: per holder, flag STPLANs continuously `blocked` across N consecutive pages (default N=3, configurable via `STORY_KERNEL.md` frontmatter) where `fallback_steps[]` is empty OR no fallback's trigger predicates evaluate true on the current page state.
   - `stemo-contradictory-stack`: per holder, flag pairs of active STEMOs whose `affect_kind` pair appears in a closed contradictory-affect lookup table (e.g., `affection`/`hatred` toward the same target; `trust`/`betrayal-anger`; `hope`/`despair`).
   - `stemo-suppression-render-conflict`: for each STEMO with `status: suppressed`, scan the most recent prose receipt (`pages-prose-receipts/PG-<integer>.yaml`) for the `affective_transition_undisclosed` subcheck; if the prose rendered the suppressed affect as openly expressed, flag. Skip with a `prose-not-attached` note when no prose receipt exists.
3. Cross-skill boundary under audit: the new health-audit checks consume STPLAN, STEMO, page-state, and prose-receipt records. The lookup table for `stemo-contradictory-stack` (small closed enum of contradictory affect_kind pairs) lives inline in the SKILL.md; the default-N=3 threshold for `stplan-long-blocked-no-fallback` declares a per-bundle override in `STORY_KERNEL.md` frontmatter. Neither modifies any existing record schema.
4. FOUNDATIONS §Story Bundles §5c Present Causal State, Not Narrative Shape: the 4 new checks all validate present-state coherence (contradictory plan clusters, plan starvation patterns, contradictory emotion stacks, suppressed-vs-rendered emotion conflicts) — not future dramatic obligations. SPEC-49 §FOUNDATIONS Alignment confirms §5c alignment.

## Architecture Check

1. Extending Phase 2k inline (4 new check definitions paralleling the 4 existing) is the minimal-blast-radius approach. Alternative (introducing per-check reference files under `branching-story-health-audit/references/`) would over-engineer 4 small additions to a single existing phase. The inline approach matches the existing 4 checks' shape.
2. No backwards-compatibility aliasing introduced. Existing bundles will be flagged by the new checks on next health-audit run; this is the intended behavior. The new checks emit findings at WARN or ERROR severity (per the rubric in each check), not at a FAIL-the-pipeline level — health-audit findings are advisory.
3. The merged C-X.2 migration documentation is content-coupled to C.3: the migration docs describe how `bootstrap-drift` (existing Phase 2k check) can identify legacy bundles needing repair for the new SPEC-49 constraints (A.1, A.3, B.3, B.4 — the surfaces covered by SPEC-49 D-CX.1's distributed migration-posture contract). Adding the migration prose alongside the new checks in the same SKILL.md is structurally clean.

## Verification Layers

1. Phase 2k check enumeration: after SPEC-49 lands, Phase 2k contains exactly 8 deterministic checks (the original 4 + the new 4). Validator surface: grep-proof on the SKILL.md.
2. Finding-code uniqueness: each new check has a finding code distinct from the existing 4. Validator surface: codebase grep-proof for the finding-code strings.
3. Skill dry-run: health-audit on a bundle containing the new check's failure pattern produces the expected finding with the expected severity. Validator surface: skill dry-run with controlled fixtures.

## What to Change

### 1. Add 4 new Phase 2k check definitions to `.claude/skills/branching-story-health-audit/SKILL.md` (after line 303)

For each new check, follow the format of the existing 4 (description + finding code + severity + repair_kind):

- `stplan-contradictory-cluster` (`stplan_contradictory_cluster`) — full rubric per SPEC-49 §C.3.1.
- `stplan-long-blocked-no-fallback` (`stplan_long_blocked_no_fallback`) — full rubric per SPEC-49 §C.3.2, including the default-N=3 + STORY_KERNEL.md override.
- `stemo-contradictory-stack` (`stemo_contradictory_stack`) — full rubric per SPEC-49 §C.3.3, including the inline closed lookup table.
- `stemo-suppression-render-conflict` (`stemo_suppression_render_conflict`) — full rubric per SPEC-49 §C.3.4, including the `prose-not-attached` skip behavior.

### 2. Add the closed contradictory-affect lookup table inline

Enumerate the small starting set of contradictory affect_kind pairs (5-7 entries per SPEC-49 risk R-49-5):

```yaml
contradictory_affect_pairs:
  - { a: "affection", b: "hatred", same_target_required: true }
  - { a: "trust", b: "betrayal-anger", same_target_required: true }
  - { a: "hope", b: "despair", same_target_required: true }
  - { a: "grief", b: "joy", same_target_required: false }
  - { a: "love", b: "contempt", same_target_required: true }
```

Document the `same_target_required: bool` flag per SPEC-49 R-49-5.

### 3. Add the default-N=3 threshold + STORY_KERNEL.md override mechanism

Document that `stplan-long-blocked-no-fallback` uses N=3 consecutive blocked pages as the default trigger threshold, configurable via a `stplan_long_blocked_threshold: <integer>` field in the bundle's `STORY_KERNEL.md` frontmatter.

### 4. Add C-X.2 migration documentation section

Add a new sub-section (positioned after Phase 2k or in the SKILL.md's appropriate maintenance section) describing how `bootstrap-drift` (existing Phase 2k check) identifies legacy bundles needing repair for the new SPEC-49 constraints:

- Legacy bundles with active STPLAN/STEMO records that omit the new active_records keys (per SPEC-49 A.1) are flagged by `bootstrap-drift` with `repair_kind: bundle_advice`.
- Legacy bundles with active STPLANs that have empty `belief_basis` (per SPEC-49 B.3) are flagged by `bootstrap-drift`.
- Legacy bundles with STPLAN records containing unparseable predicates (per SPEC-49 B.4 — once that ticket lands) are flagged by `bootstrap-drift`.
- The migration timeline: legacy bundles run under WARN-mode for one revision cycle, then the new validators enforce FAIL.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — extend Phase 2k + add migration docs section)

## Out of Scope

- Modifying the existing 4 Phase 2k checks — preserved unchanged.
- Adding new Phase 2 sub-phases (2l, 2m, etc.). All 4 new checks land in Phase 2k.
- Implementing the lookup table as a separate JSON/YAML file — the inline declaration in SKILL.md is the canonical form per SPEC-49 §C.3.2.
- Modifying any structural validator code (the health-audit checks are advisory and run at audit time, not at engine pre-apply time).
- Adding repetitive-emotional-rendering or prose-subtlety checks — explicitly out of scope per SPEC-49 §Out of Scope D1 (judgment-based, not deterministic).
- Modifying `STORY_KERNEL.md` template files — the per-bundle override field is opt-in; no template change required.

## Acceptance Criteria

### Tests That Must Pass

1. `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2k section enumerates exactly 8 checks (the original 4 + the 4 new ones). Grep-proof: `grep -nE "(bootstrap-drift|stale-active-plan|stale-active-emotion|SE-plan-relation consistency|stplan-contradictory-cluster|stplan-long-blocked-no-fallback|stemo-contradictory-stack|stemo-suppression-render-conflict)" .claude/skills/branching-story-health-audit/SKILL.md` should return 8+ matches (one per check name, possibly multiple per check for the description blocks).
2. Each new finding code (`stplan_contradictory_cluster`, `stplan_long_blocked_no_fallback`, `stemo_contradictory_stack`, `stemo_suppression_render_conflict`) appears exactly once as the canonical finding-code declaration.
3. The closed contradictory-affect lookup table is present inline with 5-7 starting entries.
4. The default-N=3 threshold for `stplan-long-blocked-no-fallback` is documented alongside the STORY_KERNEL.md override mechanism.
5. The C-X.2 migration documentation section is present and references the existing `bootstrap-drift` check as the legacy-bundle identification surface.

### Invariants

1. The 4 new Phase 2k checks are deterministic (computable from `_source/plans/`, `_source/emotions/`, the page chain, and optionally the prose-receipts surface) — no judgment calls. Judgment-laden checks (repetitive emotional rendering, prose subtlety, dramatic-irony quality) remain explicitly out of scope.
2. The closed contradictory-affect lookup table is small enough to maintain (≤10 entries to start, per SPEC-49 R-49-5). Expansion requires sample-story evidence of missed contradictions.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-based against the modified SKILL.md.`

This ticket modifies skill prose only — no test code changes. The check implementations live in the operator's interpretation of the SKILL.md prose when invoking `/branching-story-health-audit`. Verification is grep-proof against the post-implementation tree.

### Commands

1. Phase 2k check enumeration grep: `grep -nE "^- \`(bootstrap-drift|stale-active-plan|stale-active-emotion|SE-plan-relation|stplan-contradictory-cluster|stplan-long-blocked-no-fallback|stemo-contradictory-stack|stemo-suppression-render-conflict)" .claude/skills/branching-story-health-audit/SKILL.md` should return 8 distinct check bullets.
2. Finding-code uniqueness grep: `grep -nE "(stplan_contradictory_cluster|stplan_long_blocked_no_fallback|stemo_contradictory_stack|stemo_suppression_render_conflict)" .claude/skills/branching-story-health-audit/SKILL.md` should return at least 4 matches (one per new finding code).
3. Lookup table presence grep: `grep -n "contradictory_affect_pairs" .claude/skills/branching-story-health-audit/SKILL.md` should return at least 1 match.
4. Migration documentation grep: `grep -n "legacy bundles needing repair" .claude/skills/branching-story-health-audit/SKILL.md` should return at least 1 match.
