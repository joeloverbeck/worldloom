# SPEC20SCECOM-007: STORY_KERNEL Extensions — cadence_policy + menu_policy Blocks (Bootstrap)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/SKILL.md` STORY_KERNEL.md template gains two new optional YAML blocks (`cadence_policy`, `menu_policy`); `.claude/skills/branching-story-bootstrap/references/phase-X-story-kernel.md` (or equivalent — document the new blocks).
**Deps**: None (bootstrap-side changes; independent of page-cycle phase chain)

## Problem

The scene-commitment-arc pivot needs per-bundle authorial controls for menu cadence and menu policy — when a menu is required, how often menus emerge across arcs, and what choice-validation discipline applies. SPEC-20 §H specifies two new optional blocks on STORY_KERNEL.md: `cadence_policy` (arc-units only — no word-count fields per Prose Craft Contract Rule 11) and `menu_policy`. Defaults are inlined; per-bundle overrides allowed. The blocks live on STORY_KERNEL.md (not on individual arcs) because they describe per-bundle authorial taste, not per-arc structure.

## Assumption Reassessment (2026-05-07)

1. Verified `.claude/skills/branching-story-bootstrap/SKILL.md` exists and houses the current STORY_KERNEL.md template prose. Verified `.claude/skills/branching-story-bootstrap/references/` directory exists; the spec names a file `phase-X-story-kernel.md (or equivalent)` — at implementation time, the implementer either creates a dedicated `phase-X-story-kernel.md` file or extends an existing reference (the `(or equivalent)` clause in the spec acknowledges the ambiguity). Existing reference files: `pre-flight-and-prerequisites.md`, `phases-1-3-premise-cast-facts.md`, `phase-4-firewall-and-invariant-audit.md`, `phase-5-threads-and-obligations.md`, `phase-6-storylet-pool-seed.md`, `phase-7-root-page-render.md`, `phase-7-5-visible-affordance-extraction.md`, `phase-8-choice-generation.md`, `phase-9-validation-gates.md`, `phase-9-5-bootstrap-discipline-validator.md`, `engine-envelope-shape.md`, `governance-and-foundations.md`. None is dedicated to STORY_KERNEL composition; recommend extending `phases-1-3-premise-cast-facts.md` (which covers premise → kernel composition) or creating a new `phase-X-story-kernel.md`. Implementer's choice.
2. Verified SPEC-20 §H specifies the two block schemas:
   - `cadence_policy`: `max_arcs_without_menu_soft: 2`, `max_arcs_without_player_commitment_soft: 4`, `allow_continue_only_pages: true`, `force_menu_only_on_interrupt_hinge: false`. NOTE: post-reassessment `cadence_policy` contains arc-units only — `default_min_words_between_menus`, `preferred_words_per_arc`, `max_words_without_player_commitment_soft` were removed during SPEC-20 reassessment 2026-05-07 to honor Prose Craft Contract Rule 11.
   - `menu_policy`: `min_distinct_commitments: 2`, `max_displayed_choices: 4`, `require_likely_effects: true`, `require_strong_axis_difference: true`, `require_choice_worthiness: true`.
3. Cross-skill boundary: STORY_KERNEL.md is consumed by `branching-story-page-cycle` Phase 4 (JIT expansion threshold), Phase 8 (menu_policy validation), Phase 11 (commit). The blocks are bundle-config — additive only, with hardcoded defaults for backwards-compat with v1 STORY_KERNEL.md files.
4. FOUNDATIONS Rule 6 (No Silent Retcons) — renumbered from template item 4: this ticket preserves the b28aead Rule 11 contract (commit `b28aead` 2026-05-06 removed word-per-page guidelines) by structurally preventing word-count fields from re-entering `cadence_policy`. Explicit attribution in the rejection paragraph names the commit and the pathology.
5. Schema extension (renumbered from template item 6): adds 2 new optional blocks to STORY_KERNEL.md template. Consumers: `branching-story-page-cycle` (multiple phases). Additive-only — when blocks are absent, hardcoded defaults apply (no consumer-side breakage).

## Architecture Check

1. Per-bundle authorial controls on STORY_KERNEL.md (not per-arc) is the right surface because cadence/menu discipline is a bundle-level taste setting, not a per-arc structural property. Per-arc fields would force every arc author to set them; STORY_KERNEL.md sets them once per bundle.
2. Arc-units only (no word-count fields) preserves the b28aead Rule 11 contract. Reintroducing word-count fields would re-trigger the padding pathology.
3. No backwards-compatibility aliasing/shims: existing v1 STORY_KERNEL.md files lack these blocks; runtime applies hardcoded defaults when absent. The hardcoded defaults are documented as part of this ticket so a future reader can grep them without spelunking.

## Verification Layers

1. STORY_KERNEL.md template gains both blocks → codebase grep-proof in `branching-story-bootstrap/SKILL.md` for block YAML.
2. Hardcoded defaults documented → codebase grep-proof for the default values.
3. "No word-count fields" rejection paragraph → codebase grep-proof for the rejection paragraph attributing commit `b28aead`.
4. Reference doc documents the blocks → codebase grep-proof in the chosen reference file (either new `phase-X-story-kernel.md` or extension of `phases-1-3-premise-cast-facts.md`).

## What to Change

### 1. STORY_KERNEL.md template (in branching-story-bootstrap/SKILL.md)

Locate the STORY_KERNEL.md template prose in `branching-story-bootstrap/SKILL.md`; append the two new optional blocks:

```yaml
cadence_policy:
  max_arcs_without_menu_soft: 2
  max_arcs_without_player_commitment_soft: 4
  allow_continue_only_pages: true
  force_menu_only_on_interrupt_hinge: false

menu_policy:
  min_distinct_commitments: 2
  max_displayed_choices: 4
  require_likely_effects: true
  require_strong_axis_difference: true
  require_choice_worthiness: true
```

### 2. Defaults documentation

Add an inline comment in the SKILL.md prose: "Defaults (when blocks are absent): the values shown above. The blocks live on STORY_KERNEL.md, not on individual arcs, because they describe per-bundle authorial taste, not per-arc structure."

### 3. "No word-count fields in cadence_policy" rejection paragraph (NEW)

Append a paragraph (in SKILL.md and/or the chosen reference file):

> **No word-count fields in `cadence_policy`**: pacing is deliberately expressed in arc-units (`max_arcs_without_menu_soft`, `max_arcs_without_player_commitment_soft`) rather than word-units. This honors Prose Craft Contract Rule 11 — length follows content, not a per-bundle word budget — and prevents the padding pathology that drove commit `b28aead` (2026-05-06) to remove word-per-page guidelines from the rendering instructions in `branching-story-page-cycle/references/phase-7-page-render.md` and `branching-story-bootstrap/references/phase-7-root-page-render.md`. The engine-side `arc.stop_policy.safety_valves.max_words` (defined in archived SPEC-19 §A) remains as a runaway-defense termination trigger only; it is engine-internal and never surfaces to the LLM or to per-bundle config.

### 4. Reference doc (phase-X-story-kernel.md OR extension of phases-1-3-premise-cast-facts.md)

Document the new STORY_KERNEL.md blocks in a reference file. Recommended: extend `phases-1-3-premise-cast-facts.md` with a new section §STORY_KERNEL Cadence and Menu Policy that walks through each field and its default. Implementer may instead create a dedicated `phase-X-story-kernel.md` file if the bootstrap-skill convention favors per-phase reference files (precedent: existing phase-N-*.md files).

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — STORY_KERNEL.md template + rejection paragraph)
- `.claude/skills/branching-story-bootstrap/references/phases-1-3-premise-cast-facts.md` OR `.claude/skills/branching-story-bootstrap/references/phase-X-story-kernel.md` (modify or new — reference doc)

## Out of Scope

- `branching-story-page-cycle` consumer-side wiring (Phase 4 JIT threshold; Phase 8 menu_policy validation) — these are documentation-only references that the page-cycle phases already point at; this ticket lands the schema, not the consumer wiring.
- Phase 1 premise-derivation heuristic for cadence_policy / menu_policy defaults from premise tone (SPEC-22 §Track 4 — sibling-skill alignment).
- Storylet template comment edit (SPEC20SCECOM-010 — different skill: storylet-pool-authoring).
- Page-cycle SKILL.md updates (SPEC20SCECOM-009).

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run: `branching-story-bootstrap` produces a STORY_KERNEL.md template that contains the two new optional blocks with their default values; the template parses as valid YAML.
2. Defaults applicability: a v1 STORY_KERNEL.md file lacking the blocks still bootstraps cleanly; runtime applies hardcoded defaults.
3. Rejection paragraph attribution: `git log` for commit `b28aead` is referenced verbatim in the rejection paragraph (audit-trail attribution per FOUNDATIONS Rule 6).

### Invariants

1. `cadence_policy` block contains NO word-count fields (`default_min_words_between_menus`, `preferred_words_per_arc`, `max_words_without_player_commitment_soft` MUST be absent).
2. The hardcoded defaults shown in the template match the values runtime applies when the blocks are absent (consistency between docs and runtime).

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment. Full-pipeline empirical verification owned by SPEC20SCECOM-011 capstone.

### Commands

1. `grep -nE "cadence_policy:|menu_policy:" .claude/skills/branching-story-bootstrap/SKILL.md` — confirms both new blocks land.
2. `grep -nE "default_min_words_between_menus|preferred_words_per_arc|max_words_without_player_commitment_soft" .claude/skills/branching-story-bootstrap/SKILL.md | grep -v "rejection paragraph\|removed\|honors Prose Craft Contract Rule 11"` — should return zero matches outside the deliberate rejection paragraph (audit-trail retention exception per `reassess-spec/references/spec-writing-rules.md` §Audit-trail retention exception).
3. `grep -n "b28aead" .claude/skills/branching-story-bootstrap/SKILL.md` — confirms commit attribution lands in rejection paragraph.
4. `grep -n "max_arcs_without_menu_soft\|max_arcs_without_player_commitment_soft" .claude/skills/branching-story-bootstrap/SKILL.md` — confirms arc-unit fields land.
