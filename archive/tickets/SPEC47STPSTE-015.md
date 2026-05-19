# SPEC47STPSTE-015: Add §9b + §9c page-plan template sections + update §8 preamble

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `.claude/skills/_shared-templates/story-state-contract.md` §8 page-plan minimum contract with §9b (STPLAN render) + §9c (STEMO render) per-page-computed sub-sections + preamble update (parallel to existing §10b "plus optional" framing)
**Deps**: `archive/tickets/SPEC47STPSTE-003.md`

## Problem

At intake, SPEC-47's STPLAN/STEMO records needed rendering surfaces in the page-plan template so the external prose renderer receives plan/emotion context structurally. Without page-plan §9b (active actor plans / tactical agency) and §9c (emotional causality / affective transition) sections, the external prose LLM would either ignore STPLAN/STEMO state (rendering pages where validated actor plans and affective states have no prose expression) or invent emotional transitions and tactical reasoning (which §5c discipline forbids — invented narrative-arc content rather than rendered present-causal state). This ticket adds both per-page-computed sections, parallel to §10b's pattern, and makes them omitted entirely when no active records of the respective class exist.

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified `.claude/skills/_shared-templates/story-state-contract.md` §8 (Page Plan Minimum Contract) currently states "19 numbered sections plus optional §10b when SPEC-42 story-state records are active or relevant" per the reassess-spec session's verification at line 335. §10b is the optional per-page-computed sub-section that renders active CLK / STSEC / STQ records added by SPEC-42; §9b and §9c follow the same pattern for STPLAN and STEMO.
2. Verified SPEC-47 §Approach §C D-C9 specifies the §8 preamble update ("19 numbered sections plus optional §9b, §9c, §10b when relevant story-state records are active or relevant" — parallel to the existing §10b "plus optional" framing per the reassessed I3/M1 finding) plus the §9b template (Active actor plans / tactical agency — STPLAN render) and §9c template (Emotional causality / affective transition — STEMO render).
3. Cross-skill boundary under audit: the page-plan template at story-state-contract.md §8 is consumed by every story-pipeline skill that authors page plans (`branching-story-bootstrap` at root-page commit; `branching-story-turn-cycle` at every page commit; `branching-story-prose-attach` for prose-validation against the rendered plan). Adding §9b and §9c extends the template's section enumeration; the §10b precedent confirms per-page-computed sub-sections are omitted entirely when no relevant records exist (no empty-section placeholder).
4. FOUNDATIONS §Story Bundles §5c (Present Causal State, Not Narrative Shape) — both new sections render *present causal state* (current STPLAN.objective + current_step + belief basis + resources + blockers; current STEMO.affect_kind + intensity + trigger + behavioral_pressure). Neither section asks the prose renderer to render narrative-shape framing ("act position", "expected climax", "planned resolution"); the rendered content is what the actor is presently trying / currently feeling, per §5c discipline. The "Prose must show / must not imply" / "Prose must render / must avoid" sub-bullets give the prose renderer specific guard rails preserving the present-causal framing.

## Architecture Check

1. Per-page-computed sub-sections (parallel to §10b) preserve the template's discipline: every page plan renders exactly the sections it has live state for, no empty placeholders. Adding §9b and §9c following the §10b pattern keeps the template's structure orthogonal and prevents §8 from growing top-level sections for every new optional record class.
2. The §8 preamble update ("19 numbered sections plus optional §9b, §9c, §10b") names the optional sub-sections explicitly per the reassess-spec session's M1 improvement — preserves the "plus optional" framing of §10b rather than misleadingly framing §9b/§9c as new top-level §20/§21 sections.
3. No backwards-compatibility aliasing/shims introduced — additions only. The 19 numbered top-level sections (§1-§19) are unchanged; §9b and §9c are new optional sub-sections (parallel to §10b).

## Verification Layers

1. §8 preamble updated to "19 numbered sections plus optional §9b, §9c, §10b when relevant story-state records are active or relevant" → codebase grep-proof
2. §9b (Active actor plans / tactical agency) and §9c (Emotional causality / affective transition) sub-section definitions added → codebase grep-proof
3. Both new sections follow the §10b per-page-computed pattern (omitted entirely when no relevant active records exist) → manual review against the current §10b precedent in story-state-contract.md
4. `branching-story-turn-cycle` skill prose owns the rendering procedure for both sections (parallel to its §10b rendering ownership) → covered by ticket 016 skill prose update

## Landed Changes

### 1. Updated §8 preamble at `.claude/skills/_shared-templates/story-state-contract.md`

Replaced the prior preamble:

> Each plan body has 19 numbered sections plus optional §10b when SPEC-42 story-state records are active or relevant:

With:

> Each plan body has 19 numbered sections plus optional §9b, §9c, §10b when relevant story-state records are active or relevant:

### 2. Added §9b definition (after §9 Relationship and belief context, before §10)

Inserted per the §10b precedent — table-row insertion in the §8 section table + a per-page-computed paragraph parallel to §10b's "**§10b is per-page-computed, not inlined verbatim**" prose:

Table row insertion (after the §9 row):

```text
| 9b | Active actor plans / tactical agency (optional) | per-page-computed from active `STPLAN` records; omitted entirely when no active STPLANs exist |
```

Per-page-computed paragraph (after the inlined-verbatim paragraph and before the §10b paragraph; parallel structure):

```text
**§9b is per-page-computed, not inlined verbatim.** When present, it renders the current page's relevant active `STPLAN` records — one entry per active plan with sub-bullets per the template below:

## 9b. Active actor plans / tactical agency

- STPLAN-<integer> — Holder: STENT-<integer>.
  - Objective:
  - Root intention:
  - Current step (action_family + target_records):
  - Belief basis:
  - Resources/leverage (resource_basis projection):
  - Blockers:
  - Fallbacks currently available:
  - This page's plan_relation: advances | tests | blocks | revises | fulfills | abandons | ignores
  - Prose must show:
  - Prose must not imply:

§9b is omitted entirely when no active STPLANs exist on the current branch.
```

### 3. Added §9c definition (after §9b, before §10)

Table row insertion:

```text
| 9c | Emotional causality / affective transition (optional) | per-page-computed from active `STEMO` records; omitted entirely when no active STEMOs exist |
```

Per-page-computed paragraph (after the §9b paragraph):

```text
**§9c is per-page-computed, not inlined verbatim.** When present, it renders the current page's relevant active `STEMO` records — one entry per active emotion with sub-bullets per the template below:

## 9c. Emotional causality / affective transition

- STEMO-<integer> — Holder: STENT-<integer>.
  - Affect (kind + intensity):
  - Trigger event:
  - Appraisal basis:
  - Behavioral pressure:
  - Transition this page (if any):
  - Prose must render:
  - Prose must avoid:

§9c is omitted entirely when no active STEMOs exist on the current branch. `branching-story-turn-cycle` owns the rendering procedure for both §9b and §9c (parallel to its existing §10b rendering ownership).
```

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify) — §8 preamble + §9b + §9c definitions; shared-file with tickets 002 + 010 (mechanical merge expected per §Step 6.5 shared-file overlaps — each ticket modifies a different section)

## Out of Scope

- STPLAN/STEMO record schemas — covered by ticket 001.
- Skill-side rendering implementation (turn-cycle, prose-attach) — covered by ticket 016.
- Section §3 record-class inventory + §5 predicate-DSL table + §5a tag-grammar prose updates — covered by tickets 002 + 010.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "9b\. Active actor plans|9c\. Emotional causality" .claude/skills/_shared-templates/story-state-contract.md` returns 2+ matches.
2. `grep -n "plus optional §9b, §9c, §10b" .claude/skills/_shared-templates/story-state-contract.md` returns the updated §8 preamble.
3. Manual review confirms both §9b and §9c follow the §10b per-page-computed pattern (omitted entirely when no relevant active records exist; not inlined verbatim).
4. Section numbering for top-level §1-§19 sections is unchanged.

### Invariants

1. The 19 numbered top-level sections (§1-§19) of the page-plan template are unchanged in name or position.
2. §10b's per-page-computed pattern is preserved as the precedent §9b and §9c parallel.
3. Each new sub-section's sub-bullet list mirrors SPEC-47 §Approach §C templates exactly.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "## 9b\.|## 9c\." .claude/skills/_shared-templates/story-state-contract.md` (returns 2 matches at expected positions)
2. `grep -n "plus optional §9b, §9c, §10b" .claude/skills/_shared-templates/story-state-contract.md` (returns updated preamble)
3. `awk '/^## 8\. Page Plan Minimum Contract/,/^## 9\. Branching and Rewind/' .claude/skills/_shared-templates/story-state-contract.md | grep -c "^| [0-9]"` (table row count — should reflect 19 top-level rows + 3 optional sub-rows = 22 if all sub-rows are in the table)

## Outcome

Completed 2026-05-19.

The page-plan minimum contract in `.claude/skills/_shared-templates/story-state-contract.md` now names optional §9b, §9c, and §10b sections in the §8 preamble. The §8 table now includes §9b (Active actor plans / tactical agency) and §9c (Emotional causality / affective transition) as optional per-page-computed rows, and the template text now provides concrete render sub-bullets for active `STPLAN` and active `STEMO` records. Both sections explicitly omit themselves when the current branch has no active records of the corresponding class, preserving the §10b precedent.

## Verification Result

1. `grep -nE "## 9b\.|## 9c\." .claude/skills/_shared-templates/story-state-contract.md` returned 2 matches: `## 9b. Active actor plans / tactical agency` and `## 9c. Emotional causality / affective transition`.
2. `grep -n "plus optional §9b, §9c, §10b" .claude/skills/_shared-templates/story-state-contract.md` returned the updated §8 preamble.
3. `awk '/^## 8\. Page Plan Minimum Contract/,/^## 9\. Branching and Rewind/' .claude/skills/_shared-templates/story-state-contract.md | grep -c "^| [0-9]"` returned `22`.
4. Manual review confirmed §9b and §9c are per-page-computed, not inlined verbatim; both are omitted entirely when no relevant active records exist, preserving the §10b optional-section pattern.

## Deviations

None.
