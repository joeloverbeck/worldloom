# SPEC43PRECAUSTO-015: NEW `mid-story-record-introduction.md` Per-Class Reference File

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — creates new `.claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md` (per-class creation thresholds, supersede thresholds, minimum grounding requirements, required turn-cycle handling, validator checks, anti-patterns, and worked examples for CLK / STSEC / STQ / THR / STENT / SREL — lifted from SPEC-43 §Approach C).
**Deps**: archive/tickets/SPEC43PRECAUSTO-001.md

## Problem

SPEC-43 §Approach C provides per-class introduction rules covering 6 record classes — each with creation threshold, supersede threshold, minimum grounding, required turn-cycle handling, validator checks, anti-patterns, and worked examples. This content is too large to inline in the turn-cycle SKILL.md (which is already at full capacity) or in any single phase reference file. The right architectural shape is a NEW reference file at `references/mid-story-record-introduction.md` that the phase amendments (ticket 014) cross-reference, the SKILL.md Output table (ticket 013) cross-references, and the per-class introduction validators (tickets 004-009) implicitly enforce. At intake, without this file, operators had to reconstruct the per-class rules from SPEC-43 §Approach C every time — defeating the skill's role as a self-contained authoring contract.

## Assumption Reassessment (2026-05-18)

1. `references/` directory under `branching-story-turn-cycle` exists (verified via directory listing) and contains 9 existing reference files (`governance-and-foundations.md`, `phase-1-action-resolution.md`, `phase-2-3-commitment-and-state-delta.md`, `phase-4-5-belief-and-mystery.md`, `phase-6-page-snapshot.md`, `phase-7-page-plan.md`, `phase-8-choice-generation.md`, `phase-9-validation-gates.md`, `pre-flight-and-prerequisites.md`). The new `mid-story-record-introduction.md` fits naturally as a 10th reference file alongside the phase guides.
2. SPEC-43 §Approach C provides the full per-class content for all 6 classes — creation threshold, supersede threshold, minimum grounding, required turn-cycle handling, validator checks, anti-patterns, and worked examples. The new reference file is a direct lift of §Approach C content with light editorial cleanup for the reference-file register.
3. Cross-skill boundary under audit: the new reference file is consumed by branching-story-turn-cycle operators at Phase 3 (introduction decision) + Phase 4 (post-creation propagation) + Phase 7 (§10b visibility). Cross-references from ticket 013's SKILL.md Output table + ticket 014's phase amendments point at this file.
4. FOUNDATIONS §Story Bundles §5c (Present Causal State, Not Narrative Shape) restated: the per-class creation thresholds are the operational expression of §5c — each class's threshold names a present-causal trigger (deadline declared, faction mobilized, first lie made hidden truth branch-relevant, alliance forms in front of witnesses) rather than a future-shape claim (the story needs tension, there should be a twist later, the protagonist's arc begins). The anti-patterns lists are §5c violations made explicit; the worked examples ground each class in concrete present-causal events.
5. Live reassessment found one same-seam transition note in `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` that says "Until `references/mid-story-record-introduction.md` lands, use SPEC-43 §Approach C." Creating the reference file makes that note stale, so this ticket owns replacing it with a direct pointer to the new reference. This is a same-seam reference repair, not a broader phase amendment.

## Architecture Check

1. Cleaner than alternative #1 (inline per-class rules in SKILL.md): the SKILL.md is a thin entry point; inlining 6×8 (=48) per-class rule sections would balloon SKILL.md beyond its current size and break the entry-point-vs-reference contract.
2. Cleaner than alternative #2 (split into 6 separate per-class reference files): the 6 classes share structural parallelism (each has creation threshold, supersede threshold, minimum grounding, etc.); a single reference file with 6 sub-sections lets readers scan the comparison cross-class at a glance.
3. Cleaner than alternative #3 (extend `governance-and-foundations.md` with the per-class rules): that file covers cross-cutting governance; mid-story-introduction is a phase-specific authoring rule, not a governance concern.
4. No backwards-compatibility aliasing/shims introduced: purely additive new reference file.

## Verification Layers

1. File creation → codebase grep-proof: `test -f .claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md` succeeds.
2. Per-class coverage completeness → codebase grep-proof: `grep -cE "^## (CLK|STSEC|STQ|THR|STENT|SREL)\b" .claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md` returns ≥6 (one H2 section per class).
3. Cross-reference resolution → codebase grep-proof: each per-class section names the corresponding validator from tickets 004-009 (e.g., CLK section names `clock_introduction_grounding_integrity`).
4. FOUNDATIONS §5c alignment → FOUNDATIONS alignment check: each per-class anti-patterns list cites §5c-prohibited patterns; no per-class section references future-shape predicates.

## Landed Changes

### 1. Created `references/mid-story-record-introduction.md`

Created `.claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md` with sections lifted from SPEC-43 §Approach C and edited into the turn-cycle reference style. The file includes `midstory-introduction-utils.ts` and phase-reference cross-references.

#### Header
The header states that this reference is consumed during turn-cycle Phase 3 (introduction decision), Phase 4 (post-creation propagation), and Phase 7 (§10b visibility). It cross-references `_shared-templates/story-state-contract.md` §5a for tag grammar and closed trigger vocabularies.

#### Per-class sections (6 H2 sub-sections; one per class)

For each of CLK / STSEC / STQ / THR / STENT / SREL, the file includes this shared sub-structure:

- **Creation threshold** — when to create a fresh record.
- **Supersede/advance threshold** — when to update an existing record vs. create a new one.
- **Minimum grounding** — required fields for a fresh mid-story-created record.
- **Required turn-cycle handling** — which phase the creation lands in, and what propagation hooks fire.
- **Validator checks** — names the corresponding per-class validator.
- **Anti-patterns** — examples of §5c-prohibited usage.
- **Examples** — worked examples showing lawful vs. lawful-existing-record-advance vs. rejected cases.
- **§5c safety statement** — one-sentence summary of how this class's introduction respects §5c.

#### Closing cross-references

The closing cross-references point to:
- `_shared-templates/story-state-contract.md` §5a for `intro:<CLASS>(...)` tag grammar
- `tools/validators/src/structural/midstory-introduction-utils.ts` for the parser + closed trigger vocabulary constants
- `references/phase-2-3-commitment-and-state-delta.md` for the Phase 3 introduction rule
- `references/phase-4-5-belief-and-mystery.md` for Phase 4 propagation
- `references/phase-7-page-plan.md` for §10b visibility
- `references/phase-9-validation-gates.md` for Gates 12-15

### 2. Repaired temporary Phase 3 fallback wording

Updated `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` so Phase 3 points directly at `references/mid-story-record-introduction.md` as the per-class threshold authority instead of saying to use SPEC-43 until the file lands.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md` (new)
- `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` (modify — replace the temporary SPEC-43 fallback note with the landed reference pointer)
- `archive/tickets/SPEC43PRECAUSTO-015.md` (modify — closeout and same-seam reassessment truthing)

## Out of Scope

- SKILL.md amendments — handled by ticket 013.
- Phase reference amendments — handled by ticket 014.
- Tag grammar specification — handled by ticket 001.
- Validator implementations — handled by tickets 003-011.

## Acceptance Criteria

### Tests That Must Pass

1. `test -f .claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md` succeeds.
2. `grep -cE "^## (CLK|STSEC|STQ|THR|STENT|SREL)\b" .claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md` returns ≥6.
3. `grep -E "clock_introduction_grounding_integrity|secret_introduction_anchor_integrity|story_question_introduction_grounding_integrity|thread_introduction_grounding_integrity|entity_introduction_status_pairing|relationship_introduction_grounding_integrity" .claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md` returns ≥6 (one validator name per class section).

### Invariants

1. Each per-class section follows the same sub-structure (creation threshold, supersede threshold, minimum grounding, required turn-cycle handling, validator checks, anti-patterns, examples, §5c safety statement) — readers should be able to cross-class compare at a glance.
2. Every anti-pattern listed is a §5c violation; no anti-pattern criticizes a §5c-compliant but otherwise unusual usage.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -cE "^## (CLK|STSEC|STQ|THR|STENT|SREL)\b" .claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md` (per-class section count).
2. `grep -nE "(Creation threshold|Supersede/advance threshold|Minimum grounding|Required turn-cycle handling|Validator checks|Anti-patterns|Examples|§5c safety)" .claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md | wc -l` (per-section sub-structure completeness — expected ≥48 = 8 sub-sections × 6 classes, allowing for some classes to share extra sub-sections).
3. `grep -n "Until .*mid-story-record-introduction.md lands" .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` returns no hits.

## Outcome

Completed: 2026-05-18

Created `.claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md` with six per-class sections for `CLK`, `STSEC`, `STQ`, `THR`, `STENT`, and `SREL`. Each section contains the required creation threshold, supersede/advance threshold, minimum grounding, required turn-cycle handling, validator checks, anti-patterns, examples, and §5c safety statement.

Updated `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` to point directly at the landed reference file instead of preserving the temporary SPEC-43 fallback note.

## Verification Result

- `grep -cE '^## (CLK|STSEC|STQ|THR|STENT|SREL)\b' .claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md` returned `6`.
- `grep -nE '(Creation threshold|Supersede/advance threshold|Minimum grounding|Required turn-cycle handling|Validator checks|Anti-patterns|Examples|§5c safety)' .claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md` returned 48 lines, proving the 8-part structure across 6 classes.
- `grep -E 'clock_introduction_grounding_integrity|secret_introduction_anchor_integrity|story_question_introduction_grounding_integrity|thread_introduction_grounding_integrity|entity_introduction_status_pairing|relationship_introduction_grounding_integrity' .claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md` returned all six per-class validator references.
- `grep -n 'Until .*mid-story-record-introduction.md lands' .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` returned no hits; the command exited 1 as the expected no-match stale-anchor proof.

## Deviations

- The live implementation also updated `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` because creating the new reference made its temporary fallback note stale. This is a same-seam reference repair, not a broader phase amendment.
