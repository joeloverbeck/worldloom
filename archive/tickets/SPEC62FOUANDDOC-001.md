# SPEC62FOUANDDOC-001: FOUNDATIONS — add §Artifact Authority and Maturity + §World Generativity vs Story-Bundle State

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `docs/FOUNDATIONS.md` (two new authoritative-contract sections); no code, schema, or world-data change.
**Deps**: None

## Problem

At intake, FOUNDATIONS defined Canon Layers but did not state that **a file may discuss canon without being canon** — the proposal/diegetic/audit/canon authority boundary lived only in scattered skill prose and `skill-audit/references/cross-skill-consistency.md`'s skill-category classification. Separately, story-facing terms (`intended_narrative_role`, `desired_arc_type`, `likely_story_scale`, `creates_new_story_engines`, EPE `story_fuel`) were used on world-system artifacts with no FOUNDATIONS statement of where world generativity ends and story-bundle execution state begins. This ticket added SPEC-62 §2.1 + §2.2's two concise authoritative paragraphs.

## Assumption Reassessment (2026-05-21)

1. Insertion anchors verified against current `docs/FOUNDATIONS.md`: `## Canon Layers` at line 30; `## Artifact Authority and Maturity` and `## World Generativity vs Story-Bundle State` landed at lines 97 and 101 after the Canon Layers block; `Natural Story Engines` remains a live §World Kernel template field at line 154; the `direct_user_approval` reservation §2.1 cross-references is at lines 363–368 (`source_basis.direct_user_approval` is accepted-CF provenance...). All confirmed present this session.
2. SPEC-62 §2.1 (lines 23–39) and §2.2 (lines 41–63) are the source deliverables; the report §7.1 / §7.5 text they adapt is in `archive/reports/world-system-consolidation-first-iteration.md`; triage verdicts A5 (Fault 1) + A6 (Fault 6) in `docs/triage/2026-05-21-world-system-consolidation-triage.md` route both here with the no-renames / no-ladder-file constraints.
3. Cross-artifact boundary under audit: the maturity-class enumeration in §2.1 names ID prefixes owned by sibling skills (`NWP`/`PR`/`RP`/`NCP`/`CHAR`/`DA`/`PA`/`AU`/`EPE`) and `_source/` records — this ticket only describes their authority tier in FOUNDATIONS prose; it does NOT alter any skill, schema, or allocator. The §2.2 sanctioned-vocabulary list (`Natural Story Engines` / `Native Story Procedures`) must match the live §World Kernel term to avoid introducing a second name.
4. FOUNDATIONS principle restated before trusting the spec narrative: §Canon Layers (canon is record authority, not file existence or review approval) motivates §2.1; the world-generativity-vs-story-bundle-execution boundary (a refinement of §World Kernel "what kinds of stories the world naturally generates" + §Story Bundles distinctness) motivates §2.2. Both sections sharpen existing principles without changing any layer definition or validator — SPEC-62 §3 records both as "aligns."

## Architecture Check

1. Two paragraphs in the single authoritative contract are cleaner than the report's proposed 9-level shared-reference "ladder" file every skill would have to cite — single source of truth, no per-skill citation churn, no schema/data migration (per triage, user-directed).
2. No backwards-compatibility aliasing/shims — both are net-new prose sections; no existing FOUNDATIONS text is deleted or renamed (§2.1 cross-references the existing `direct_user_approval` reservation rather than duplicating it).

## Verification Layers

1. §Artifact Authority and Maturity exists after §Canon Layers and enumerates the maturity classes + the "only accepted world-canon records claim world-canon authority" close → codebase grep-proof (`grep -n "Artifact Authority and Maturity" docs/FOUNDATIONS.md`).
2. §World Generativity vs Story-Bundle State exists and names `Natural Story Engines` as sanctioned generativity vocabulary + forbids story-bundle execution state (page/choice/storylet ids, act beats) on world artifacts → codebase grep-proof.
3. §2.1 cross-references rather than duplicates the `direct_user_approval` reservation → manual review of the inserted text against lines 363–368.
4. No layer definition or validator changed → FOUNDATIONS alignment check (the five Canon Layers and the 7 Validation Rules read identically pre/post; only two new sections are added).

## Landed Changes

### 1. Inserted §Artifact Authority and Maturity after §Canon Layers (§2.1)

Added a concise section stating: canon is record authority, not file existence or review approval. It enumerates the maturity classes already in play — pre-world proposal (`NWP`), candidate canon proposal (`PR`/`RP`/EPE-sidecar), candidate character proposal (`NCP`), realized canon-reading hybrid (`CHAR`/`DA`), accepted world canon (`_source/` records), adjudication/provenance (`PA`), audit (`AU`), pressure affordance (`EPE`), downstream story record. It closes with: only accepted world-canon records claim world-canon authority; proposal review, artifact-write, audit-recommendation approval, pressure-event approval, and story-bundle acceptance are not canon acceptance. It cross-references the §Canon Fact Record Schema `direct_user_approval` reservation without duplicating the reservation block.

### 2. Inserted §World Generativity vs Story-Bundle State (§2.2)

Added a paragraph stating that worldbuilding may describe the kinds of conflicts, procedures, pressures, revelations, and affordances a world structurally produces; world-canon and world-proposal artifacts must not encode downstream story-bundle execution state — page ids, choice ids, storylet ids, act beats, plot destiny, companion quests, story-local clocks, or story-local state transitions. The inserted section fences the existing terms (`intended_narrative_role`, `desired_arc_type`, `likely_story_scale`, `creates_new_story_engines`, EPE `story_fuel`) as sanctioned world-generativity language while drawing the bright line forbidding true story-bundle leakage. It names `Natural Story Engines` / `Native Story Procedures` as sanctioned generativity vocabulary.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `archive/specs/SPEC-62-foundations-and-docs-world-system-reconciliation.md` (modified while active; line-reference truthing after insertion shifted the `Natural Story Engines` anchor)

## Out of Scope

- Any field rename of story-facing terms (`intended_narrative_role` → `world_affordance_role`, etc.) — rejected at triage (no functional bug, would churn schemas + CHAR/NCP/CH records with no validator consumer).
- A separate shared-reference maturity-ladder file every skill cites — replaced by §2.1 per user direction.
- The §Mystery Reserve `passive_depth` + forbidden-relaxation edits (SPEC62FOUANDDOC-002) and any skill/template change (003).
- Any code, schema, validator, or world-data change.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "## Artifact Authority and Maturity" docs/FOUNDATIONS.md` returns one match positioned after `## Canon Layers` (line 30) and before §Mandatory World Files.
2. `grep -n "World Generativity vs Story-Bundle State" docs/FOUNDATIONS.md` returns one match; the section names `Natural Story Engines` and forbids page/choice/storylet ids on world artifacts.
3. `grep -n "direct_user_approval" docs/FOUNDATIONS.md` shows the §2.1 cross-reference is a single pointer and does not introduce a duplicate reservation block (the canonical reservation remains the paragraph now at lines 363–368).

### Invariants

1. The five Canon Layers (Hard / Derived / Soft / Contested / Mystery Reserve) and the Validation Rules (1–7, 11, 12) are unchanged — both edits are additive new sections.
2. No new ID prefix, schema field, validator, or allocator class was introduced; the maturity-class enumeration only describes existing classes.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification was command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "Artifact Authority and Maturity\|World Generativity vs Story-Bundle State" docs/FOUNDATIONS.md`
2. `grep -n "Natural Story Engines\|Native Story Procedures" docs/FOUNDATIONS.md` — confirm the sanctioned-vocabulary names match the existing §World Kernel term (line 154).
3. `grep -n "direct_user_approval" docs/FOUNDATIONS.md` — confirm the inserted cross-reference is only a pointer and the canonical reservation paragraph remains unique.
4. Narrower-command rationale: this is a documentation insertion plus active-spec line-reference truthing; grep-proof of the two new section headers plus manual review of the `direct_user_approval` reference is the correct verification boundary — there is no code path to exercise.

## Outcome

Completed: 2026-05-21.

`docs/FOUNDATIONS.md` now contains `## Artifact Authority and Maturity` and `## World Generativity vs Story-Bundle State` after the Canon Layers block. The first section separates canon authority from file/artifact maturity and points to the existing Canon Fact Record `direct_user_approval` reservation. The second section sanctions world-generativity language while forbidding story-bundle execution state in world-canon and world-proposal artifacts.

`archive/specs/SPEC-62-foundations-and-docs-world-system-reconciliation.md` was also truthed while active for the shifted `Natural Story Engines` line anchor caused by the insertion.

## Verification Result

1. `grep -n "Artifact Authority and Maturity\|World Generativity vs Story-Bundle State" docs/FOUNDATIONS.md` returned the two inserted section headers at lines 97 and 101.
2. `grep -n "Natural Story Engines\|Native Story Procedures" docs/FOUNDATIONS.md` returned the new sanctioned-vocabulary sentence and the existing §World Kernel template field.
3. `grep -n "direct_user_approval" docs/FOUNDATIONS.md` showed one new cross-reference pointer plus the existing schema example and the canonical reservation paragraph; no duplicate reservation block was added.
4. Manual review of `docs/FOUNDATIONS.md` lines 75–105 confirmed the new sections are placed after Canon Layers and before Mandatory World Files.

## Deviations

- The drafted `grep -c "direct_user_approval"` proof was replaced with `grep -n "direct_user_approval"` plus manual review because the landed cross-reference intentionally increases the literal match count while preserving a single canonical reservation paragraph.
