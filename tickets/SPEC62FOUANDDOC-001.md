# SPEC62FOUANDDOC-001: FOUNDATIONS — add §Artifact Authority and Maturity + §World Generativity vs Story-Bundle State

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `docs/FOUNDATIONS.md` (two new authoritative-contract sections); no code, schema, or world-data change.
**Deps**: None

## Problem

FOUNDATIONS defines Canon Layers but never states that **a file may discuss canon without being canon** — the proposal/diegetic/audit/canon authority boundary lives only in scattered skill prose and `skill-audit/references/cross-skill-consistency.md`'s skill-category classification. Separately, story-facing terms (`intended_narrative_role`, `desired_arc_type`, `likely_story_scale`, `creates_new_story_engines`, EPE `story_fuel`) are used on world-system artifacts with no FOUNDATIONS statement of where world generativity ends and story-bundle execution state begins. SPEC-62 §2.1 + §2.2 close both boundary ambiguities with two concise authoritative paragraphs.

## Assumption Reassessment (2026-05-21)

1. Insertion anchors verified against current `docs/FOUNDATIONS.md`: `## Canon Layers` at line 30 (§2.1 inserts after it); `Natural Story Engines` is a live §World Kernel template field at line 146 (§2.2 promotes it to a sanctioned-generativity term); the `direct_user_approval` reservation §2.1 cross-references is at lines 355–361 (`source_basis.direct_user_approval` is accepted-CF provenance...). All confirmed present this session.
2. SPEC-62 §2.1 (lines 23–39) and §2.2 (lines 41–63) are the source deliverables; the report §7.1 / §7.5 text they adapt is in `reports/world-system-consolidation-first-iteration.md`; triage verdicts A5 (Fault 1) + A6 (Fault 6) in `docs/triage/2026-05-21-world-system-consolidation-triage.md` route both here with the no-renames / no-ladder-file constraints.
3. Cross-artifact boundary under audit: the maturity-class enumeration in §2.1 names ID prefixes owned by sibling skills (`NWP`/`PR`/`RP`/`NCP`/`CHAR`/`DA`/`PA`/`AU`/`EPE`) and `_source/` records — this ticket only describes their authority tier in FOUNDATIONS prose; it does NOT alter any skill, schema, or allocator. The §2.2 sanctioned-vocabulary list (`Natural Story Engines` / `Native Story Procedures`) must match the live §World Kernel term to avoid introducing a second name.
4. FOUNDATIONS principle restated before trusting the spec narrative: §Canon Layers (canon is record authority, not file existence or review approval) motivates §2.1; the world-generativity-vs-story-bundle-execution boundary (a refinement of §World Kernel "what kinds of stories the world naturally generates" + §Story Bundles distinctness) motivates §2.2. Both sections sharpen existing principles without changing any layer definition or validator — SPEC-62 §3 records both as "aligns."

## Architecture Check

1. Two paragraphs in the single authoritative contract are cleaner than the report's proposed 9-level shared-reference "ladder" file every skill would have to cite — single source of truth, no per-skill citation churn, no schema/data migration (per triage, user-directed).
2. No backwards-compatibility aliasing/shims — both are net-new prose sections; no existing FOUNDATIONS text is deleted or renamed (§2.1 cross-references the existing `direct_user_approval` reservation rather than duplicating it).

## Verification Layers

1. §Artifact Authority and Maturity exists after §Canon Layers and enumerates the maturity classes + the "only accepted world-canon records claim world-canon authority" close → codebase grep-proof (`grep -n "Artifact Authority and Maturity" docs/FOUNDATIONS.md`).
2. §World Generativity vs Story-Bundle State exists and names `Natural Story Engines` as sanctioned generativity vocabulary + forbids story-bundle execution state (page/choice/storylet ids, act beats) on world artifacts → codebase grep-proof.
3. §2.1 cross-references rather than duplicates the `direct_user_approval` reservation → manual review of the inserted text against lines 355–361.
4. No layer definition or validator changed → FOUNDATIONS alignment check (the five Canon Layers and the 7 Validation Rules read identically pre/post; only two new sections are added).

## What to Change

### 1. Insert §Artifact Authority and Maturity after §Canon Layers (§2.1)

Add a concise section (≈8–12 lines) stating: canon is record authority, not file existence or review approval. Enumerate the maturity classes already in play — pre-world proposal (`NWP`), candidate canon proposal (`PR`/`RP`/EPE-sidecar), candidate character proposal (`NCP`), realized canon-reading hybrid (`CHAR`/`DA`), accepted world canon (`_source/` records), adjudication/provenance (`PA`), audit (`AU`), pressure affordance (`EPE`), downstream story record. Close with: only accepted world-canon records claim world-canon authority; proposal review, artifact-write, and audit-recommendation approval are not canon acceptance. Adapt report §7.1, trimmed to a paragraph (not a 9-level ladder). Cross-reference (do not duplicate) the §Canon Fact Record Schema `direct_user_approval` reservation at lines 355–361.

### 2. Insert §World Generativity vs Story-Bundle State (§2.2)

Add a paragraph (per report §7.5, trimmed): worldbuilding may describe the kinds of conflicts, procedures, pressures, and revelations a world structurally produces; world-canon and world-proposal artifacts must NOT encode downstream story-bundle execution state — page ids, choice ids, storylet ids, act beats, plot destiny, companion quests, or story-local clocks. Fence the existing terms (`intended_narrative_role`, `desired_arc_type`, `likely_story_scale`, `creates_new_story_engines`, EPE `story_fuel`) as sanctioned world-generativity language (no renames) while drawing the bright line forbidding true story-bundle leakage. Name `Natural Story Engines` / `Native Story Procedures` as the sanctioned generativity vocabulary. Include the §2.2 "No renames" rationale callout.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)

## Out of Scope

- Any field rename of story-facing terms (`intended_narrative_role` → `world_affordance_role`, etc.) — rejected at triage (no functional bug, would churn schemas + CHAR/NCP/CH records with no validator consumer).
- A separate shared-reference maturity-ladder file every skill cites — replaced by §2.1 per user direction.
- The §Mystery Reserve `passive_depth` + forbidden-relaxation edits (SPEC62FOUANDDOC-002) and any skill/template change (003).
- Any code, schema, validator, or world-data change.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "## Artifact Authority and Maturity" docs/FOUNDATIONS.md` returns one match positioned after `## Canon Layers` (line 30) and before §Mandatory World Files.
2. `grep -n "World Generativity vs Story-Bundle State" docs/FOUNDATIONS.md` returns one match; the section names `Natural Story Engines` and forbids page/choice/storylet ids on world artifacts.
3. `grep -c "direct_user_approval" docs/FOUNDATIONS.md` shows the §2.1 cross-reference does not introduce a duplicate reservation block (the canonical reservation remains the lines 355–361 paragraph).

### Invariants

1. The five Canon Layers (Hard / Derived / Soft / Contested / Mystery Reserve) and the Validation Rules (1–7, 11, 12) are unchanged — both edits are additive new sections.
2. No new ID prefix, schema field, validator, or allocator class is introduced; the maturity-class enumeration only describes existing classes.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "Artifact Authority and Maturity\|World Generativity vs Story-Bundle State" docs/FOUNDATIONS.md`
2. `grep -n "Natural Story Engines\|Native Story Procedures" docs/FOUNDATIONS.md` — confirm the sanctioned-vocabulary names match the existing §World Kernel term (line 146).
3. Narrower-command rationale: this is a single-file documentation insertion; grep-proof of the two new section headers plus the no-duplicate `direct_user_approval` check is the correct verification boundary — there is no code path to exercise.
