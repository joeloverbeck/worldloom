# SPEC86CHAFITSEL-002: Skill anchor citations to §11a in 4 story-pipeline skills

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds one-paragraph §11a citation to each of 4 skill files: `story-character-profile/SKILL.md` (Story-State Derivation Guide section), `commitment-block-authoring/SKILL.md` (eligibility-predicate authoring section), `branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` (first-choice-generation section), `branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` (selection-rationale prose). Where pre-existing prose duplicates §11a content, the anchor REPLACES that prose verbatim per SPEC-86 §4.3 preamble; otherwise inserts at the section's start.
**Deps**: SPEC86CHAFITSEL-001

## Problem

Once §11a Character-Fit Selection Contract lands (ticket SPEC86CHAFITSEL-001), 4 story-pipeline skills that currently re-implement parts of the contract content must replace their scattered duplicated prose with single-paragraph citations to §11a. The §12 of the same contract states the discipline: *"Skills must not duplicate the contract's content. They cite it."* — applied here to the in-flight contract addition itself.

Without these anchor updates, each skill's SKILL.md (or referenced phase doc) will continue to re-state pieces of the four-layer mediation model, the global-vs-branch-scoped predicate discipline, or the CHC grounding criteria — and any future evolution of §11a will silently drift from the scattered restatements. The anchor citations make §11a the canonical source: the skill prose says "follow §11a" and points readers to the contract; vocabulary growth at §11a propagates automatically.

This ticket is the consumer half of SPEC-86 (ticket SPEC86CHAFITSEL-001 is the source half). It must land after 001 because the citation paragraphs reference §11a, which 001 introduces.

## Assumption Reassessment (2026-05-25)

<!-- Items 1-3 always required; items 4-7 conditional per template menu. -->

1. **Codebase reference**: 4 skill files with verified target sections (audit + reassessment phases this session):
   - `.claude/skills/story-character-profile/SKILL.md` line 279 `## Story-State Derivation Guide`
   - `.claude/skills/commitment-block-authoring/SKILL.md` line 141 `## Phase 1: Diagnose coverage gaps (` followed by `direct_batch`-then-`audit_repair` mode disambiguation (covers eligibility-predicate authoring for both modes)
   - `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` line 21 `## Phase 9: Generate first choices`
   - `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` line 3 `## Phase 2: Select or JIT-create a commitment block` (selection-rationale prose lives within Phase 2 body)
2. **Spec reference**: SPEC-86 §4.3 verbatim citation paragraphs (4 paragraphs, one per skill). The §4.3 preamble specifies the cite-and-replace pattern: *"The anchor replaces (rather than augments) any existing prose that duplicates §11a content. Where existing prose already cites parts of §11a's territory, the existing prose is replaced verbatim with a citation."* Companion triage file `docs/triage/2026-05-25-slt-chc-overhaul-fourth-iteration-triage.md` records the full iter-4 adjudication context.
3. **Cross-skill boundary**: this ticket coordinates a citation pattern across 4 skill files at story-pipeline scope. The shared boundary is §11a itself (added by ticket SPEC86CHAFITSEL-001); each anchor cites the same target. Per SPEC-86 §9 open question 1, future iterations may pressure the anchors to grow back into duplicate-content forms — the anchor-as-citation discipline (this ticket) is the canonical countermeasure. The other story-pipeline skills (`branching-story-prose-attach`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, `story-promotion-closeout`) are NOT currently scattered with §11a content beyond these 4 (verified during audit phase Agent 3 + this reassessment); SPEC-86 §2 Goals explicitly limits the anchor set to these 4 skills.
4. **FOUNDATIONS principle**: motivated by `story-state-contract.md` §12's general rule *"Skills must not duplicate the contract's content. They cite it."* — applied to §11a. The cite-and-replace discipline preserves the contract's authoritative role: vocabulary growth or refinement at §11a flows automatically through citations, where verbatim duplications would drift silently. Aligns with FOUNDATIONS §Story Bundles §5b in spirit (load-bearing content discipline: skill prose should be load-bearing for its own concern, not load-bearing for re-stating contract terminology).

## Architecture Check

1. **Cite-and-replace over append-alongside**: per SPEC-86 §4.3 preamble, each anchor REPLACES any pre-existing duplicate-content prose verbatim rather than inserting alongside. This prevents the double-source pattern where the citation paragraph and the original duplicate co-exist — a reader updating either independently produces drift. The implementer must read each anchor target section before insertion, identify any duplicate-content prose, and REPLACE it with the citation paragraph; if no duplicate prose exists, the citation paragraph inserts at the section's start.
2. **No backwards-compatibility aliasing or shims introduced.** Each anchor is a fresh paragraph addition (or replacement); no symbol rename, no API surface change, no validator behavior change.
3. **Minimal anchor scope**: each anchor is one paragraph (~5 lines), citing §11a and naming the relevant operational surface (Story-State Derivation Guide for story-character-profile; `hard.preconditions[]` predicates for commitment-block-authoring; first-page CHC grounding for branching-story-bootstrap; selection rationale for branching-story-turn-cycle). The ticket does NOT introduce new ritual passes ("Specificity Pass" Phase 2, "Choice Stance Pass" Phase 8) — those are deferred per SPEC-86 §3 Non-goals pending validator consumers.

## Verification Layers

1. **§11a citation presence in story-character-profile** → codebase grep-proof (`grep -nE "§11a.*Character-Fit Selection Contract" .claude/skills/story-character-profile/SKILL.md` returns ≥1 match in the Story-State Derivation Guide section).
2. **§11a citation presence in commitment-block-authoring** → codebase grep-proof (`grep -nE "§11a.*Character-Fit Selection Contract" .claude/skills/commitment-block-authoring/SKILL.md` returns ≥1 match in or near the Phase 1 eligibility-predicate authoring section).
3. **§11a citation presence in branching-story-bootstrap phase-8-9 doc** → codebase grep-proof (`grep -nE "§11a.*Character-Fit Selection Contract" .claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` returns ≥1 match in the Phase 9 first-choice-generation section).
4. **§11a citation presence in branching-story-turn-cycle phase-2-3 doc** → codebase grep-proof (`grep -nE "§11a.*Character-Fit Selection Contract" .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` returns ≥1 match in the Phase 2 selection-rationale prose).
5. **Cite-and-replace fidelity** → manual review per anchor (the implementer confirms any pre-existing duplicate-content prose was REPLACED, not augmented; no double-source between the citation and a remaining duplicate).
6. **No behavior change** → existing test suites pass unchanged (`cd tools/validators && npm test`); skill-prose edits cannot affect compiled validator behavior.

## What to Change

### 1. `.claude/skills/story-character-profile/SKILL.md` — Story-State Derivation Guide anchor

Read the Story-State Derivation Guide section (line 279 onwards) before inserting. Identify any pre-existing prose that describes how STCHAR derivation feeds future skills' consumption of `STINT`/`STPLAN`/`STEMO`/etc. — that prose duplicates §11a's four-layer model (stable constraint layer → current-state derivation layer). Where found, REPLACE the duplicate with the citation paragraph from SPEC-86 §4.3 (verbatim). Where no duplicate exists, insert the citation paragraph at the section's start.

Verbatim citation paragraph (from SPEC-86 §4.3):

> When drafting the Story-State Derivation Guide, follow §11a "Character-Fit Selection Contract" in `.claude/skills/_shared-templates/story-state-contract.md`. The guide names *how* this character's stable authority generates or constrains current-state records (`STPLAN`, `STEMO`, `BEL`, `SREL`, `STINT`, `STSTAT`, `OBL` / `CNSQ` / `THR`, `CLK` / `STSEC` / `STQ`, `DA` / `STOBJ` / `STLOC`). Runtime selection skills consume those current-state records, not STCHAR vibes — the derivation guide is the bridge.

### 2. `.claude/skills/commitment-block-authoring/SKILL.md` — eligibility-predicate authoring anchor

Read Phase 1 (line 141 onwards — direct-batch + audit-repair eligibility-predicate authoring) before inserting. Identify any pre-existing prose that prescribes how `hard.preconditions[]` predicates relate to STCHAR — that prose duplicates §11a's global-vs-branch-scoped STCHAR predicate discipline. Where found, REPLACE with the citation paragraph. Where no duplicate exists, insert at the most relevant point near the eligibility prose (typically immediately under the Phase 1 header or just before the eligibility examples).

Verbatim citation paragraph (from SPEC-86 §4.3):

> When choosing `hard.preconditions[]` predicates, follow §11a "Character-Fit Selection Contract" in `.claude/skills/_shared-templates/story-state-contract.md`. Global-author-pool SLTs (`scope.visibility: global_author_pool`) express character relevance through existential current-state predicates (`any_plan_active`, `any_emotion_active`, `any_relationship_axis`, `any_belief`, `affordance_available_to`), role-keyed predicates, or driver-record overlap — never through direct `record_active(STCHAR-<integer>)`. The direct-STCHAR form is reserved for `branch_scoped` and `branch_prefix_scoped` visibility, where a specific character's stable authority is the reason the block exists.

### 3. `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` — first-choice-generation anchor

Read Phase 9 "Generate first choices" (line 21 onwards) before inserting. Identify any pre-existing prose that prescribes CHC grounding categories (which active records a CHC must cite, the trap of "first three options that differ only by verb"). That prose duplicates §11a's CHC quality discipline. Where found, REPLACE with the citation paragraph. Where no duplicate exists, insert near the existing first-choice-generation guidance (typically under the Phase 9 header or near the CHC-emission examples).

Verbatim citation paragraph (from SPEC-86 §4.3):

> When emitting first-page CHCs, follow §11a "Character-Fit Selection Contract" in `.claude/skills/_shared-templates/story-state-contract.md`. Each non-write-in CHC grounds in at least one active record class — stable STCHAR is lawful but bare-STCHAR grounding is usually weak; pair STCHAR with one or more of `STEMO` / `STPLAN` / `BEL` / `SREL` / `OBL` / `CLK` / `STSEC` / `STQ` / `DA` to give the choice operational specificity. Bootstrap's "first three options that differ only by verb" failure mode is exactly what §11a's CHC quality discipline targets.

### 4. `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` — selection-rationale anchor

Read Phase 2 "Select or JIT-create a commitment block" (line 3 onwards) before inserting. Identify any pre-existing prose that describes selection-rationale construction — what records justify selecting an SLT, how STCHAR enters the rationale. That prose duplicates §11a's four-layer model (eligibility / ranking layer + rendering / surface layer). Where found, REPLACE with the citation paragraph. Where no duplicate exists, insert at the point where selection-rationale is first described (typically near the SLT-selection workflow within Phase 2 body).

Verbatim citation paragraph (from SPEC-86 §4.3):

> Selection rationale follows §11a "Character-Fit Selection Contract" in `.claude/skills/_shared-templates/story-state-contract.md`. The selected `SLT` is justified through the active current-state records that make it specific to this actor on this branch right now — `STPLAN` blockage, `STEMO` appraisal, `BEL` knowledge, `SREL` axis pressure, `OBL` / `CLK` / `STSEC` / `STQ` pressure, or `DA` / `STOBJ` / `STLOC` affordance. Where STCHAR appears in the rationale, it explains *why* the current-state record matters to this actor — not as a replacement for the current-state record. Branch-scoped SLTs with direct `record_active(STCHAR-<integer>)` predicates are the one lawful exception: there the STCHAR identity is the eligibility predicate itself.

## Files to Touch

- `.claude/skills/story-character-profile/SKILL.md` (modify)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` (modify)

## Out of Scope

- No content addition beyond the citation paragraphs (no "Specificity Pass" Phase 2 ritual, no "Choice Stance Pass" Phase 8 ritual — per SPEC-86 §3 Non-goals; both deferred pending validator consumers).
- No new validators / schema fields / MCP changes / fixtures (all deferred per SPEC-86 §3).
- No changes to any skill file beyond the 4 listed (other story-pipeline skills — `branching-story-prose-attach`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, `story-promotion-closeout` — are not currently scattered with §11a content per SPEC-86 §2 Goals).
- No modification to the §11a contract section itself (that's ticket SPEC86CHAFITSEL-001's scope).
- No operator paraphrase of the citation paragraphs — each anchor reads verbatim from SPEC-86 §4.3.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "§11a.*Character-Fit Selection Contract" .claude/skills/story-character-profile/SKILL.md` returns ≥1 match.
2. `grep -nE "§11a.*Character-Fit Selection Contract" .claude/skills/commitment-block-authoring/SKILL.md` returns ≥1 match.
3. `grep -nE "§11a.*Character-Fit Selection Contract" .claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` returns ≥1 match.
4. `grep -nE "§11a.*Character-Fit Selection Contract" .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` returns ≥1 match.
5. Manual review per anchor confirms no pre-existing duplicate-content prose remains alongside the citation (no double-source).
6. `cd tools/validators && npm test` passes with no regressions (regression sanity check).

### Invariants

1. Each of the 4 skill files carries exactly one §11a citation paragraph in the section §4.3 specifies (no double-citation, no duplicate-content remnant).
2. Pre-existing structure of each skill file (frontmatter, section ordering, HARD-GATE, World-State Prerequisites, Validation Rules, Output) is unchanged — only the cited section gains the paragraph addition or replacement.
3. Each citation paragraph reads verbatim from SPEC-86 §4.3 (no operator paraphrase or restatement).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `for f in .claude/skills/story-character-profile/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md; do echo "--- $f ---"; grep -nE "§11a.*Character-Fit Selection Contract" "$f"; done` (presence check across all 4 anchors)
2. `cd tools/validators && npm test` (regression sanity check)
3. Manual review per anchor — confirm cite-and-replace pattern was applied where duplicate content was found, and that the citation paragraph reads verbatim from SPEC-86 §4.3.
