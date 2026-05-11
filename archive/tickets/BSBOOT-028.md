# BSBOOT-028: Single-source the `cadence_policy` / `menu_policy` documentation

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — documentation consolidation inside `.claude/skills/branching-story-bootstrap/`.
**Deps**: None.

## Problem

The `cadence_policy` and `menu_policy` block, its arc-unit-only rationale, and the commit-`b28aead`-anchored "no word-count fields" justification are documented in three places inside `.claude/skills/branching-story-bootstrap/`:

1. `templates/story-kernel.md` lines 22-33 — the actual yaml template (load-bearing; this is the source of the literal block bootstrap writes into STORY_KERNEL.md).
2. `SKILL.md` Phase 11 step 2 (lines 363-365) — restates the defaults, mentions the per-bundle-vs-per-arc placement justification, and copies the "No word-count fields" / commit-`b28aead` justification almost verbatim.
3. `references/phases-1-3-premise-cast-facts.md` lines 25-79 — a 50-line "STORY_KERNEL Cadence And Menu Policy" block restating the yaml literal, the tone-based derivation rules (slow-paced premises lower the values; action premises raise them), the per-bundle-vs-per-arc placement justification, and the full "No word-count fields" / commit-`b28aead` paragraph.

The yaml literal belongs in the template. The tone-derivation rules belong in the Phase 1 reference (`phases-1-3-premise-cast-facts.md`) because that's where Phase 1 produces them. The per-bundle-vs-per-arc placement and "no word-count fields" justification belong in exactly one of the three; restating them in all three is pure duplication. An edit to any one source today silently leaves the other two stale.

## Assumption Reassessment (2026-05-11)

1. `templates/story-kernel.md` lines 22-33 contain the canonical yaml literal for `cadence_policy` (4 keys) and `menu_policy` (5 keys). Confirmed by direct read.
2. `SKILL.md` Phase 11 step 2 prose (line 363-365) reads: `Defaults, when cadence_policy or menu_policy is absent in an older bundle, are the values shown in templates/story-kernel.md. These blocks live on STORY_KERNEL.md, not on individual arcs, because they describe per-bundle authorial taste rather than per-arc structure.` Immediately followed by the standalone `No word-count fields in cadence_policy` paragraph (lines 365) verbatim repeating the commit-`b28aead` justification.
3. `references/phases-1-3-premise-cast-facts.md` lines 25-79 restate the yaml literal in a code block (lines 31-44), the tone-derivation rules (lines 56-65), the per-bundle-vs-per-arc placement rationale (lines 52-54), and the "No word-count fields" paragraph (lines 71-79) verbatim.
4. The yaml-literal duplication is the most painful: an edit to add or rename a key in the template would require three coordinated updates. The yaml literal in `phases-1-3-premise-cast-facts.md` adds zero information beyond the template and should be replaced with a pointer.
5. The tone-derivation rules ("slow-paced literary premises lower the values; action premises raise them") belong in the Phase 1 reference — that's where Phase 1 derives them. Keep them there.
6. The "no word-count fields" justification is a single sentence's worth of substantive content; restating it in three places adds nothing. Pick one canonical home — the template, since the rule is about a yaml-block structural constraint.
7. Cross-skill consumer check: no sibling skill cites `phases-1-3-premise-cast-facts.md` or the SKILL.md Phase 11 step 2 prose by name. The triple-documentation is bootstrap-internal.
8. Mismatch + correction: the template stays as-is (with the existing inline comment about arc-units); SKILL.md Phase 11 step 2 shrinks; `phases-1-3-premise-cast-facts.md` keeps the tone-derivation rules and drops the duplicate yaml + duplicate "no word-count fields" paragraph.

## Architecture Check

1. The cleaner end-state has a clear ownership split: template owns the yaml literal + structural rules (arc-units only), Phase 1 reference owns the tone-derivation logic (Phase 1's product), SKILL.md Phase 11 step 2 names the write contract without re-stating the policy content.
2. No backwards-compatibility aliasing introduced. The duplicate paragraphs are removed outright; the template's inline comment about arc-units is the canonical statement of the rule.

## Verification Layers

1. The yaml literal `cadence_policy:` block appears in exactly one place — `templates/story-kernel.md` — across the bootstrap skill directory → codebase grep-proof (`grep -rn "^cadence_policy:" .claude/skills/branching-story-bootstrap/` returns exactly one match in the template).
2. The "No word-count fields" / commit-`b28aead` justification appears in exactly one place across the bootstrap skill directory → codebase grep-proof (`grep -rn "b28aead" .claude/skills/branching-story-bootstrap/` returns exactly one match).
3. The tone-derivation rules (slow-paced lowers / action raises) appear only in `phases-1-3-premise-cast-facts.md` → manual review.
4. SKILL.md Phase 11 step 2 references the canonical home for both the yaml literal and the justification, without restating them → manual review.

## What to Change

### 1. `SKILL.md` Phase 11 step 2 — shrink to a pointer

Current shape (lines 363-365): two paragraphs restating the defaults source + per-bundle placement + standalone "No word-count fields" justification block.

Replacement shape: one paragraph reading: `Write STORY_KERNEL.md per templates/story-kernel.md (premise + content_policy preamble verbatim + designing principle + cast bind list + themes + content_intensity baseline + POV mode + central dramatic question + mysteries_in_play[] + invariants_acknowledged[] + execution_mode_default + cadence_policy + menu_policy + validation_trace + STORY-NNNN frontmatter). The cadence_policy and menu_policy blocks default to the values shown in templates/story-kernel.md frontmatter when an older bundle omits them; see references/phases-1-3-premise-cast-facts.md §STORY_KERNEL Cadence And Menu Policy for premise-tone-derived overrides.` Remove the standalone "No word-count fields" paragraph entirely — the template's inline comment carries the rule.

### 2. `references/phases-1-3-premise-cast-facts.md` §STORY_KERNEL Cadence And Menu Policy — remove duplicate yaml and duplicate justification

Current shape (lines 25-79): yaml literal block (lines 31-44), prose explaining per-bundle-vs-per-arc placement (lines 46-54), tone-derivation rules (lines 56-65), then a separate "No word-count fields in cadence_policy" paragraph (lines 71-79).

Replacement shape:

- Replace the yaml literal block (lines 31-44) with one sentence: `The yaml shape for both blocks is defined in templates/story-kernel.md frontmatter; see that template for the exact default values and inline comments.`
- Keep the tone-derivation rules (Phase 1 product — load-bearing): `Phase 1 may derive arc-unit overrides from premise tone signals:` followed by the three bullet points (slow-paced lowers; action raises; ambiguous uses defaults). Keep the closing line: `These derivations are recommendations, not hidden engine law. Surface any derived override in the Phase 10 HARD-GATE summary so the user can accept, revise, or later edit the STORY_KERNEL block.`
- Remove the "No word-count fields in cadence_policy" paragraph (lines 71-79) entirely. The rule it states ("arc-units only, not word-units") is already in `templates/story-kernel.md` line 23 inline comment (`arc-units only; not a word-count budget`); restating the commit-`b28aead` justification here adds nothing material.
- Add one bridging sentence at the end of the section: `For the structural rule (cadence is expressed in arc-units, not word-units), see the inline comment at templates/story-kernel.md line 23.`

### 3. `templates/story-kernel.md` — verify the inline comment is sufficient

Line 23 currently reads `max_arcs_without_menu_soft: 2           # arc-units only; not a word-count budget`. This is the canonical structural statement of the rule. No change required to the template.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — Phase 11 step 2 shrinks)
- `.claude/skills/branching-story-bootstrap/references/phases-1-3-premise-cast-facts.md` (modify — duplicate yaml + duplicate justification removed)

## Out of Scope

- `.claude/skills/branching-story-bootstrap/templates/story-kernel.md` — the canonical home; no change.
- Removing the `cadence_policy` / `menu_policy` blocks themselves from STORY_KERNEL.md (the blocks are load-bearing; only the documentation duplication is the problem).
- Reworking the tone-derivation rules' content — only their location is being normalized; the rules themselves are correct.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "^cadence_policy:" .claude/skills/branching-story-bootstrap/` returns exactly one match — `templates/story-kernel.md`.
2. `grep -rn "b28aead" .claude/skills/branching-story-bootstrap/` returns at most one match (or zero if the inline template comment is judged sufficient documentation without naming the commit).
3. `grep -rn "max_arcs_without_menu_soft" .claude/skills/branching-story-bootstrap/` returns at most two matches: `templates/story-kernel.md` (canonical) plus optionally one reference in `phases-1-3-premise-cast-facts.md` describing tone derivations of the same field.
4. SKILL.md Phase 11 step 2 prose names `templates/story-kernel.md` as the defaults source and `references/phases-1-3-premise-cast-facts.md` as the tone-derivation source — manual review.

### Invariants

1. The literal yaml shape of `cadence_policy` and `menu_policy` lives in exactly one place (`templates/story-kernel.md`).
2. The per-bundle authorial-taste rule (cadence is per-bundle, not per-arc; arc-units only, not word-units) is stated in exactly one place.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rnE "(cadence_policy|menu_policy):" .claude/skills/branching-story-bootstrap/` — single yaml definition site confirmed; references that mention the block by name (not by yaml literal) are acceptable.
2. `wc -l .claude/skills/branching-story-bootstrap/references/phases-1-3-premise-cast-facts.md` — net line reduction (target: ~40 lines removed; pre-edit is 123 lines, post-edit target ~80-85).
3. `wc -l .claude/skills/branching-story-bootstrap/SKILL.md` — net line reduction (target: ~5-10 lines removed in the Phase 11 step 2 area; pre-edit is 399 lines).
