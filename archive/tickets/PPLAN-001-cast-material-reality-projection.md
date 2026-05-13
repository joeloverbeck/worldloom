# PPLAN-001: Add `body.Material Reality` to CHAR-dossier projection in page-plan pre-flight

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — edits `branching-story-bootstrap`, `branching-story-page-cycle`, and the shared canonical plan template `.claude/skills/_shared-templates/page-plan.md`. No tool / hook / package changes.
**Deps**: None. Blocks PPLAN-003 (clothing-consistency check depends on the projection landing first) and PPLAN-004 (storylet-author discipline references the projected section).

## Problem

At intake, the comprehensive prose plan at `worlds/<slug>/stories/<slug>/pages-prose-plans/PG-NNNN.md` §8 (Cast in this scene) was the renderer's only authoritative source for what each character looks like, wears, owns, and physically inhabits, but the page-plan skill references did not consistently require the CHAR dossier's Material Reality section to be projected before plan authoring.

Before this ticket, the projection list in `.claude/skills/branching-story-bootstrap/references/pre-flight-and-prerequisites.md` was:
> `frontmatter` + `body.Goals and Pressures` + `body.Capabilities` + `body.Voice and Perception`

The character-dossier template (`.claude/skills/character-generation/templates/character-dossier.md`) places clothing, body, possessions, and physical condition inside the **`Material Reality`** body section (per `.claude/skills/character-generation/SKILL.md:38`: *"Phase 1: Material Reality (food, shelter, injuries, possessions...)"*). `Material Reality` is **not projected**.

The intake witness on `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-3.md`: §8 Ane Arrieta's "Biographical kernel" prose paragraph mentions clothing (`pink off-shoulder crop top, pink short flared skirt, white thigh-high socks with pink hearts, white platform sneakers`) only because the user's premise text carried it — there was no structural projection of the dossier's own canonical clothing/body data. The same plan then asserts in `frontmatter.declared_visible_affordances[0]` *"Ane on the bench, sleeve angling to cover the bruise"* and in §8 cast intentions *"pull sleeve, angle the body away"* — both inconsistent with the crop top. The renderer faithfully wrote *"Her sleeve moved"* at line 1 of `worlds/erotica-world/stories/red-bunny/pages-prose/PG-3.md`.

Before this ticket, `branching-story-page-cycle/references/pre-flight-and-prerequisites.md` had no equivalent explicit CHAR-projection line; it relied on the `story_page_cycle` context-packet profile (per `docs/CONTEXT-PACKET-CONTRACT.md:246`) plus named-entity-neighbor resolution. The page-cycle prompt-assembly comment block at `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` declared the §8 cast-bound source as *"full CHAR dossier (when world_character_id set)"*, but "full" was documentary aspiration — there was no enforced projection that guaranteed Material Reality reached the LLM author.

## Assumption Reassessment (2026-05-12)

1. **CHAR-dossier section `Material Reality` exists and houses clothing/body/possessions.** Verified: `.claude/skills/character-generation/templates/character-dossier.md:58` defines the section; `.claude/skills/character-generation/SKILL.md:38` documents its scope ("food, shelter, injuries, possessions"); `worlds/erotica-world/characters/ane-arrieta.md:81` carries the section header `## Material Reality` and `worlds/erotica-world/characters/ane-arrieta.md:89` is the exact line containing the crop-top wardrobe.
2. **Bootstrap pre-flight projection list is explicit and editable.** Verified: `.claude/skills/branching-story-bootstrap/references/pre-flight-and-prerequisites.md:15` carries the literal projection enumeration *"`frontmatter` + `body.Goals and Pressures` + `body.Capabilities` + `body.Voice and Perception`"*. Adding `body.Material Reality` is a single-line edit.
3. **Page-cycle pre-flight has no parallel explicit projection line — CHAR loading is implicit through the `story_page_cycle` context-packet profile.** Verified: grep for `body.|character|section_path|projection|dossier` in `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` returns no explicit CHAR-projection enumeration. Shared boundary under audit: the §8 prompt-assembly comment in `phase-7-page-plan.md:37-42` claims "full CHAR dossier" but no upstream loading rule guarantees it.
4. **Material Reality is not a FOUNDATIONS-defined enforcement surface** — this ticket touches a skill-internal projection list, not Rule 1-7 surfaces, not HARD-GATE semantics, not Canon Safety Check enforcement. The change is additive (one new section in a projection list); it does not affect canon mutation, Mystery Reserve firewall, or any validator gate.
5. **Adjacent contradictions exposed during reassessment**: (a) `_shared-templates/page-plan.md:129` describes §8 source as *"World-level CHAR dossier verbatim (essence, niche, voice signature, relationships, visible/hidden traits)"* — "visible/hidden traits" implicitly covers clothing/body, but the categorization vocabulary does not match the dossier's actual section names. This is a separate clarification (cleanup, not bug) handled in this ticket's §3 change to keep the template/pre-flight surfaces consistent.
6. **Proof boundary narrowed at implementation**: AGENTS.md says this repo has no conventional build/lint/test runner, and no executable `branching-story-page-cycle` harness is present in the live repo. The drafted full-pipeline dry-run remains a future/manual operator exercise, not an automated gate for this ticket. The completed proof is grep-based contract verification plus manual review of the edited skill/template surfaces.

## Architecture Check

1. Single-line additive projection edit on each existing CHAR-loading site. No new code, no new tools, no new packages. The change extends the documented loading discipline; it does not replace any current behavior.
2. No backwards-compatibility shims introduced. CHAR dossiers authored before this ticket already have `Material Reality` (per `character-generation` SKILL.md, the section is mandatory); the change is purely about whether the loading layer projects it for plan-authoring consumption.

## Verification Layers

1. **Bootstrap projection enumeration includes `body.Material Reality`** → codebase grep-proof: `grep -n 'body.Material Reality' .claude/skills/branching-story-bootstrap/references/pre-flight-and-prerequisites.md` returns a hit on the projection list line.
2. **Page-cycle pre-flight has an explicit CHAR-projection block listing the same five sections** → codebase grep-proof: `grep -n 'body.Material Reality' .claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` returns a hit.
3. **Canonical plan template §8 instruction comment names Material Reality / body / clothing / possessions explicitly** → codebase grep-proof: `grep -n 'Material Reality' .claude/skills/_shared-templates/page-plan.md` returns a hit on the §8 comment block.
4. **Skill/template contract review**: inspect the updated pre-flight and Phase 7 prompt-assembly references to confirm the same CHAR-dossier projection order is named across bootstrap, page-cycle, and the shared page-plan template. A live `branching-story-page-cycle` run is not claimed because the repo has no executable skill harness.

## Landed Changes

### 1. `.claude/skills/branching-story-bootstrap/references/pre-flight-and-prerequisites.md` (line 15)

The CHAR projection enumeration now reads `frontmatter` + `body.Material Reality` + `body.Goals and Pressures` + `body.Capabilities` + `body.Voice and Perception`. Material Reality is first among body sections because it grounds physical anchors that other sections reference.

### 2. `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md`

Added an explicit CHAR-dossier projection block parallel to bootstrap's, immediately after the `story_page_cycle` context-packet retrieval bullet, and mirrored it in the Pre-flight Check steps.

> `worlds/<world-slug>/characters/<char-slug>.md` per CHAR-bound STENT in cast_present — retrieved via `mcp__worldloom__get_record('CHAR-NNNN', section_path=...)` with `frontmatter` + `body.Material Reality` + `body.Goals and Pressures` + `body.Capabilities` + `body.Voice and Perception` projections (per `docs/CONTEXT-PACKET-CONTRACT.md`). The Material Reality projection grounds §8 cast clothing / body / possessions as authoritative facts the plan-authoring LLM and downstream renderer can rely on; without it the §8 cast block falls back to whatever physical detail the premise text mentioned, which is structurally unreliable.

### 3. `.claude/skills/_shared-templates/page-plan.md` §8 instruction comment (lines 128-133)

Updated the inline-source list to make Material Reality explicit:

> For each STENT in cast_present, INLINE in this order:
> - World-level CHAR dossier verbatim — Material Reality (clothing, body, possessions, condition), Goals and Pressures, Capabilities, Voice and Perception — when world_character_id is set;
> - Story-local STENT record (role_in_story, current narrative function);
> - Current STINT (goals, fears, current_pressure, beliefs, emotional_state);
> - Relevant SREL records (axes between this character and other cast in scene).

### 4. `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` (LLM prompt assembly block, line 40-41)

Updated the `[cast bound — ...]` line to enumerate the Material Reality section explicitly so the LLM author knows the dossier projection includes physical detail.

### 5. `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` (LLM prompt assembly block, line 37-42)

Made the same update as item 4: the page-cycle prompt assembly now names the CHAR-dossier projection set instead of "full CHAR dossier."

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/pre-flight-and-prerequisites.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` (modify)
- `.claude/skills/_shared-templates/page-plan.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` (modify)

## Out of Scope

- Validator changes (PPLAN-003 adds the clothing-consistency check that catches plans that nevertheless contradict the projected Material Reality).
- Storylet-author discipline (PPLAN-004 covers character-agnostic gestural language in storylet `notes:`).
- Re-projecting existing rendered plans. Existing `pages-prose-plans/PG-NNNN.md` files remain valid under the old shape; the change applies to plans authored by future invocations.
- Adding Material Reality to non-page-plan skills that already explicitly project a CHAR dossier with their own scoped intent.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'body.Material Reality' .claude/skills/branching-story-bootstrap/references/pre-flight-and-prerequisites.md` returns the new projection line.
2. `grep -n 'body.Material Reality' .claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` returns the new projection line.
3. `grep -n 'Material Reality' .claude/skills/_shared-templates/page-plan.md` returns a hit on the §8 comment.
4. Manual review: the edited pre-flight and Phase 7 references name the same CHAR-dossier projection order across bootstrap, page-cycle, and the shared page-plan template. No live `branching-story-page-cycle` dry-run was claimed because the repo has no executable skill runner.

### Invariants

1. CHAR projection enumeration is identical across bootstrap and page-cycle pre-flight surfaces (so plan-authoring shape stays uniform across root and runtime pages).
2. The canonical plan template's §8 source enumeration matches the projection enumeration in both pre-flight surfaces (so the LLM author and the loading layer agree on what §8 contains).

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is grep-based plus manual contract review per Acceptance Criteria.

### Commands

1. `grep -rn 'body.Material Reality' .claude/skills/branching-story-bootstrap/references/ .claude/skills/branching-story-page-cycle/references/ .claude/skills/_shared-templates/` (verifies the explicit pre-flight projection sites name the new section).
2. `rg -n 'full CHAR dossier|visible/hidden traits' .claude/skills/branching-story-bootstrap .claude/skills/branching-story-page-cycle .claude/skills/_shared-templates` (verifies stale skill/template wording is absent).

## Outcome

Completion date: 2026-05-12.

Completed. The page-plan pre-flight and prompt-assembly contracts now project CHAR dossier Material Reality alongside the existing frontmatter, Goals and Pressures, Capabilities, and Voice and Perception sections. The shared page-plan template's §8 source comment now names Material Reality clothing/body/possessions/condition explicitly, so the renderer-facing cast block and the loading instructions agree.

## Verification Result

1. `grep -rn 'body.Material Reality' .claude/skills/branching-story-bootstrap/references/ .claude/skills/branching-story-page-cycle/references/ .claude/skills/_shared-templates/` — PASS; hits found in bootstrap pre-flight and page-cycle pre-flight.
2. `grep -n 'Material Reality' .claude/skills/_shared-templates/page-plan.md` — PASS; §8 source comment names Material Reality.
3. `rg -n 'full CHAR dossier|visible/hidden traits' .claude/skills/branching-story-bootstrap .claude/skills/branching-story-page-cycle .claude/skills/_shared-templates` — PASS; no stale hits remain in the edited skill/template surfaces.
4. Manual review — PASS; bootstrap pre-flight, page-cycle pre-flight, both Phase 7 prompt-assembly blocks, and the shared page-plan template now use the same projection boundary.

## Deviations

- The drafted full-pipeline `branching-story-page-cycle` dry-run was not executed. This repo has no conventional build/lint/test runner and no executable skill harness for invoking `.claude/skills/branching-story-page-cycle` as a command. The truthful proof surface for this docs/skill contract ticket is grep proof plus manual contract review.
- Same-family tickets `PPLAN-002` through `PPLAN-007` remain active/untracked sibling scope and were not implemented by this ticket.
