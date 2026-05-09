# SPEC20SCECOM-007: STORY_KERNEL Extensions — cadence_policy + menu_policy Blocks (Bootstrap)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/templates/story-kernel.md` gains two new optional YAML blocks (`cadence_policy`, `menu_policy`); `.claude/skills/branching-story-bootstrap/SKILL.md` names the template/default contract; `.claude/skills/branching-story-bootstrap/references/phases-1-3-premise-cast-facts.md` documents the new blocks.
**Deps**: None (bootstrap-side changes; independent of page-cycle phase chain)

## Problem

The scene-commitment-arc pivot needs per-bundle authorial controls for menu cadence and menu policy — when a menu is required, how often menus emerge across arcs, and what choice-validation discipline applies. SPEC-20 §H specifies two new optional blocks on STORY_KERNEL.md: `cadence_policy` (arc-units only — no word-count fields per Prose Craft Contract Rule 11) and `menu_policy`. Defaults are inlined; per-bundle overrides allowed. The blocks live on STORY_KERNEL.md (not on individual arcs) because they describe per-bundle authorial taste, not per-arc structure.

## Assumption Reassessment (2026-05-07)

1. Verified `.claude/skills/branching-story-bootstrap/SKILL.md` exists and points STORY_KERNEL.md to `.claude/skills/branching-story-bootstrap/templates/story-kernel.md`; the current template is not inlined in `SKILL.md`. Verified `.claude/skills/branching-story-bootstrap/references/` exists. The spec's `phase-X-story-kernel.md (or equivalent)` clause resolves to extending `phases-1-3-premise-cast-facts.md`, because that reference already owns premise normalization and initial STORY_KERNEL composition.
2. Verified SPEC-20 §H specifies the two block schemas:
   - `cadence_policy`: `max_arcs_without_menu_soft: 2`, `max_arcs_without_player_commitment_soft: 4`, `allow_continue_only_pages: true`, `force_menu_only_on_interrupt_hinge: false`. NOTE: post-reassessment `cadence_policy` contains arc-units only — `default_min_words_between_menus`, `preferred_words_per_arc`, `max_words_without_player_commitment_soft` were removed during SPEC-20 reassessment 2026-05-07 to honor Prose Craft Contract Rule 11.
   - `menu_policy`: `min_distinct_commitments: 2`, `max_displayed_choices: 4`, `require_likely_effects: true`, `require_strong_axis_difference: true`, `require_choice_worthiness: true`.
3. Cross-skill boundary: STORY_KERNEL.md is consumed by `branching-story-page-cycle` Phase 4 (JIT expansion threshold), Phase 8 (menu_policy validation), Phase 11 (commit). The blocks are bundle-config — additive only, with hardcoded defaults for backwards-compat with v1 STORY_KERNEL.md files.
4. FOUNDATIONS Rule 6 (No Silent Retcons) — renumbered from template item 4: this ticket preserves the b28aead Rule 11 contract (commit `b28aead` 2026-05-06 removed word-per-page guidelines) by structurally preventing word-count fields from re-entering `cadence_policy`. Explicit attribution in the rejection paragraph names the commit and the pathology.
5. Schema extension (renumbered from template item 6): adds 2 new optional blocks to STORY_KERNEL.md template. Consumers: `branching-story-page-cycle` (multiple phases). Additive-only — when blocks are absent, hardcoded defaults apply (no consumer-side breakage).
6. Same-seam spec truthing: `archive/specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md` still described the bootstrap deliverable as `SKILL.md` housing the STORY_KERNEL template; the live repo uses `templates/story-kernel.md`, so the SPEC-20 deliverables table was updated to the live template, `SKILL.md`, and reference-file split.

## Architecture Check

1. Per-bundle authorial controls on STORY_KERNEL.md (not per-arc) is the right surface because cadence/menu discipline is a bundle-level taste setting, not a per-arc structural property. Per-arc fields would force every arc author to set them; STORY_KERNEL.md sets them once per bundle.
2. Arc-units only (no word-count fields) preserves the b28aead Rule 11 contract. Reintroducing word-count fields would re-trigger the padding pathology.
3. No backwards-compatibility aliasing/shims: existing v1 STORY_KERNEL.md files lack these blocks; runtime applies hardcoded defaults when absent. The hardcoded defaults are documented as part of this ticket so a future reader can grep them without spelunking.

## Verification Layers

1. STORY_KERNEL.md template gains both blocks → codebase grep-proof in `.claude/skills/branching-story-bootstrap/templates/story-kernel.md` for block YAML.
2. Hardcoded defaults documented → codebase grep-proof for the default values in the template, `SKILL.md`, and reference doc.
3. "No word-count fields" rejection paragraph → codebase grep-proof for the rejection paragraph attributing commit `b28aead`.
4. Reference doc documents the blocks → codebase grep-proof in `phases-1-3-premise-cast-facts.md`.

## Landed Changes

### 1. STORY_KERNEL.md template

Added the two new optional blocks to `.claude/skills/branching-story-bootstrap/templates/story-kernel.md`:

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

Documented in `SKILL.md`, `templates/story-kernel.md`, and `phases-1-3-premise-cast-facts.md`: defaults, when blocks are absent, are the values shown in the template. The blocks live on STORY_KERNEL.md, not on individual arcs, because they describe per-bundle authorial taste, not per-arc structure.

### 3. "No word-count fields in cadence_policy" rejection paragraph (NEW)

Added the rejection paragraph to `SKILL.md` and the Phase 1-3 reference:

> **No word-count fields in `cadence_policy`**: pacing is deliberately expressed in arc-units (`max_arcs_without_menu_soft`, `max_arcs_without_player_commitment_soft`) rather than word-units. This honors Prose Craft Contract Rule 11 — length follows content, not a per-bundle word budget — and prevents the padding pathology that drove commit `b28aead` (2026-05-06) to remove word-per-page guidelines from the rendering instructions in `branching-story-page-cycle/references/phase-7-page-render.md` and `branching-story-bootstrap/references/phase-7-root-page-render.md`. The engine-side `arc.stop_policy.safety_valves.max_words` (defined in archived SPEC-19 §A) remains as a runaway-defense termination trigger only; it is engine-internal and never surfaces to the LLM or to per-bundle config.

### 4. Reference doc

Documented the new STORY_KERNEL.md blocks in `phases-1-3-premise-cast-facts.md` with a new section §STORY_KERNEL Cadence and Menu Policy that walks through each field and its default.

### 5. SPEC-20 deliverables table

Updated SPEC-20's deliverables table so the implementation target is the live `templates/story-kernel.md` file, with `SKILL.md` and `phases-1-3-premise-cast-facts.md` as contract/reference consumers.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/templates/story-kernel.md` (modify — STORY_KERNEL.md template blocks)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — template/default contract + rejection paragraph)
- `.claude/skills/branching-story-bootstrap/references/phases-1-3-premise-cast-facts.md` (modify — reference doc)
- `archive/specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md` (modify — deliverables-table path truthing for the live template file)

## Out of Scope

- `branching-story-page-cycle` consumer-side wiring (Phase 4 JIT threshold; Phase 8 menu_policy validation) — these are documentation-only references that the page-cycle phases already point at; this ticket lands the schema, not the consumer wiring.
- Phase 1 premise-derivation heuristic for cadence_policy / menu_policy defaults from premise tone (SPEC-22 §Track 4 — sibling-skill alignment).
- Storylet template comment edit (SPEC20SCECOM-010 — different skill: storylet-pool-authoring).
- Page-cycle SKILL.md updates (SPEC20SCECOM-009).

## Acceptance Criteria

### Tests That Must Pass

1. Template proof: `.claude/skills/branching-story-bootstrap/templates/story-kernel.md` contains the two new optional blocks with their default values, and the frontmatter parses as YAML.
2. Defaults applicability: a v1 STORY_KERNEL.md file lacking the blocks remains accepted by contract; runtime applies hardcoded defaults.
3. Rejection paragraph attribution: `git show --no-patch --pretty=fuller b28aead` confirms commit `b28aead` is the 2026-05-06 "Removed word-per-page considerations" commit referenced in the rejection paragraph.

### Invariants

1. `cadence_policy` block contains NO word-count fields (`default_min_words_between_menus`, `preferred_words_per_arc`, `max_words_without_player_commitment_soft` MUST be absent).
2. The hardcoded defaults shown in the template match the values runtime applies when the blocks are absent (consistency between docs and runtime).

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment. Runtime validator/package proof remains owned by SPEC-22; non-production empirical capstone proof was rejected by `archive/tickets/SPEC20SCECOM-011.md`.

### Commands

1. `grep -nE 'cadence_policy:|menu_policy:' .claude/skills/branching-story-bootstrap/templates/story-kernel.md`
2. `bash -lc "grep -nE 'default_min_words_between_menus|preferred_words_per_arc|max_words_without_player_commitment_soft' .claude/skills/branching-story-bootstrap/templates/story-kernel.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/phases-1-3-premise-cast-facts.md | grep -v 'No word-count fields\|word-units\|removed\|honors Prose Craft Contract Rule 11'"` — expected exit 1 with no output; zero stale word-count fields outside the deliberate rejection paragraph.
3. `grep -n "b28aead" .claude/skills/branching-story-bootstrap/SKILL.md` — confirms commit attribution lands in rejection paragraph.
4. `grep -n "max_arcs_without_menu_soft\|max_arcs_without_player_commitment_soft" .claude/skills/branching-story-bootstrap/templates/story-kernel.md .claude/skills/branching-story-bootstrap/references/phases-1-3-premise-cast-facts.md` — confirms arc-unit fields land.
5. `python3 -c "import pathlib, re, yaml; s=pathlib.Path('.claude/skills/branching-story-bootstrap/templates/story-kernel.md').read_text(); m=re.search(r'\n---\n(.*?)\n---', s, re.S); assert m, 'no frontmatter'; yaml.safe_load(m.group(1)); print('frontmatter parsed')"` — confirms the template frontmatter parses.

## Outcome

Completion date: 2026-05-07.

Implemented the SPEC-20 §H bootstrap-side STORY_KERNEL extension. The live template now includes `cadence_policy` and `menu_policy` with arc-unit defaults only, `SKILL.md` documents the Phase 11 write/default contract and `b28aead` no-word-budget guardrail, and the Phase 1-3 reference documents each field for bootstrap authors. SPEC-20's deliverables table was truthed to the live template/reference split.

## Verification Result

1. `grep -nE 'cadence_policy:|menu_policy:' .claude/skills/branching-story-bootstrap/templates/story-kernel.md` — passed; found both frontmatter blocks.
2. `bash -lc "grep -nE 'default_min_words_between_menus|preferred_words_per_arc|max_words_without_player_commitment_soft' .claude/skills/branching-story-bootstrap/templates/story-kernel.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/phases-1-3-premise-cast-facts.md | grep -v 'No word-count fields\|word-units\|removed\|honors Prose Craft Contract Rule 11'"` — passed by returning exit 1 with no output; no stale word-budget fields exist in the edited skill/template/reference surfaces outside deliberate audit wording.
3. `grep -n 'b28aead' .claude/skills/branching-story-bootstrap/SKILL.md` — passed; the rejection paragraph references the commit.
4. `grep -n 'max_arcs_without_menu_soft\|max_arcs_without_player_commitment_soft' .claude/skills/branching-story-bootstrap/templates/story-kernel.md .claude/skills/branching-story-bootstrap/references/phases-1-3-premise-cast-facts.md` — passed; arc-unit fields are present in the template and reference.
5. `python3 -c "import pathlib, re, yaml; s=pathlib.Path('.claude/skills/branching-story-bootstrap/templates/story-kernel.md').read_text(); m=re.search(r'\n---\n(.*?)\n---', s, re.S); assert m, 'no frontmatter'; yaml.safe_load(m.group(1)); print('frontmatter parsed')"` — passed; frontmatter parsed.

## Deviations

- The drafted ticket assumed `SKILL.md` housed the current STORY_KERNEL template. Live repo state uses `templates/story-kernel.md`; the ticket and SPEC-20 deliverables table were updated before source edits.
- The first YAML parse probe used Node's `yaml` package, but that package is not installed in this checkout; Ruby is also unavailable. Final YAML proof used Python/PyYAML already available in the environment.
