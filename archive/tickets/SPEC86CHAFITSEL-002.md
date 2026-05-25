# SPEC86CHAFITSEL-002: Skill anchor citations to §11a in 4 story-pipeline skills

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds one-paragraph §11a citation to each of 4 skill files: `story-character-profile/SKILL.md` (Story-State Derivation Guide section), `commitment-block-authoring/SKILL.md` (eligibility-predicate authoring section), `branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` (first-choice-generation section), `branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` (selection-rationale prose). Where pre-existing prose duplicates §11a content, the anchor REPLACES that prose verbatim per SPEC-86 §4.3 preamble; otherwise inserts at the section's start.
**Deps**: archive/tickets/SPEC86CHAFITSEL-001.md

## Problem

At intake, after §11a Character-Fit Selection Contract landed in ticket SPEC86CHAFITSEL-001, 4 story-pipeline skills still re-implemented parts of the contract content and needed single-paragraph citations to §11a. The §12 of the same contract states the discipline: *"Skills must not duplicate the contract's content. They cite it."* — applied here to the in-flight contract addition itself.

Before this ticket, each skill's SKILL.md (or referenced phase doc) re-stated pieces of the four-layer mediation model, the global-vs-branch-scoped predicate discipline, or the CHC grounding criteria. The landed anchor citations make §11a the canonical source: the skill prose says "follow §11a" and points readers to the contract; vocabulary growth at §11a propagates automatically.

This ticket is the consumer half of SPEC-86 (ticket SPEC86CHAFITSEL-001 is the source half). It landed after 001 because the citation paragraphs reference §11a, which 001 introduced.

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
5. **HARD-GATE read**: `docs/HARD-GATE-DISCIPLINE.md` and implement-ticket's hard-gate triage reference were read before the same-seam wording update inside `commitment-block-authoring`'s existing `<HARD-GATE>`. The edit preserves gate order, approval timing, failure handling, operator approval scope, validation semantics, and submit/approval-token behavior; it only removes duplicate STCHAR predicate discipline from the gate summary by pointing to the Character-Fit Selection Contract.

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

## Landed Changes

### 1. `.claude/skills/story-character-profile/SKILL.md` — Story-State Derivation Guide anchor

Inserted the SPEC-86 §4.3 citation paragraph at the section-requirements start and removed the old one-line duplicate `Story-State Derivation Guide` derivation summary so the contract is the source for the STCHAR/current-state bridge.

### 2. `.claude/skills/commitment-block-authoring/SKILL.md` — eligibility-predicate authoring anchor

Inserted the SPEC-86 §4.3 citation paragraph under Phase 1. Replaced duplicate STCHAR predicate-discipline prose in the existing HARD-GATE summary, prerequisites, predicate DSL section, FOUNDATIONS alignment row, and guardrail with short references to the Character-Fit Selection Contract while preserving the existing gate semantics.

### 3. `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` — first-choice-generation anchor

Inserted the SPEC-86 §4.3 citation paragraph under Phase 9. Replaced the duplicated CHC grounding-category prose with schema-specific grounding instructions that keep the active-record union, affordance-ordinal, and `target_or_action_families` boundaries without restating §11a's character-fit criteria.

### 4. `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` — selection-rationale anchor

Inserted the SPEC-86 §4.3 citation paragraph under Phase 2 before the MCP selection workflow.

## Files to Touch

- `.claude/skills/story-character-profile/SKILL.md` (modify)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` (modify)

## Out of Scope

- No behavioral content addition beyond the citation paragraphs and same-seam duplicate-prose narrowing (no "Specificity Pass" Phase 2 ritual, no "Choice Stance Pass" Phase 8 ritual — per SPEC-86 §3 Non-goals; both deferred pending validator consumers).
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
2. Pre-existing behavior of each skill file is unchanged: frontmatter, section ordering, HARD-GATE approval/validation semantics, World-State Prerequisites, Validation Rules, and Output remain intact. `commitment-block-authoring` also had duplicate predicate-discipline prose narrowed to refer to the Character-Fit Selection Contract.
3. Each citation paragraph reads verbatim from SPEC-86 §4.3 (no operator paraphrase or restatement).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `for f in .claude/skills/story-character-profile/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md; do echo "--- $f ---"; grep -nE "§11a.*Character-Fit Selection Contract" "$f"; done` (presence check across all 4 anchors)
2. `cd tools/validators && npm test` (regression sanity check)
3. Manual review per anchor — confirm cite-and-replace pattern was applied where duplicate content was found, and that the citation paragraph reads verbatim from SPEC-86 §4.3.

## Outcome

Completed: 2026-05-25

- Added the SPEC-86 §4.3 §11a citation paragraphs to all 4 named story-pipeline skill surfaces.
- Replaced same-seam duplicate character-fit discipline in `story-character-profile`, `commitment-block-authoring`, and `branching-story-bootstrap` while preserving non-duplicative schema / gate / retrieval requirements.
- Made no schema, validator, MCP, world-index, fixture, or story/world content changes.

## Verification Result

- `grep -R -nE "§11a.*Character-Fit Selection Contract" .claude/skills/story-character-profile/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` -> one match in each touched file.
- Same command piped to `wc -l` -> `4`, confirming exactly one §11a citation paragraph per touched file.
- Manual review of the edited sections confirmed duplicate character-fit prose was replaced or narrowed to non-duplicative schema / gate / retrieval references.
- `git diff --check -- .claude/skills/story-character-profile/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` -> PASS.
- `npm test` in `tools/validators/` -> PASS, 1021/1021 tests.

## Deviations

- The `commitment-block-authoring` update touched one sentence inside the existing `<HARD-GATE>` summary to remove duplicate STCHAR predicate wording. This did not change gate order, approval timing, failure handling, validation semantics, or submit/approval-token behavior; it keeps the same branch-scope legality requirement and points the discipline to the Character-Fit Selection Contract.
