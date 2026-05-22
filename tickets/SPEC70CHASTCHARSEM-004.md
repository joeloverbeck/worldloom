# SPEC70CHASTCHARSEM-004: Semantic Preservation Contract prose + §16a capabilities line

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/story-character-profile/SKILL.md`, `.claude/skills/branching-story-bootstrap/SKILL.md`, and `.claude/skills/_shared-templates/story-state-contract.md` (skill + shared-contract prose). No code/validator change.
**Deps**: archive/tickets/SPEC70CHASTCHARSEM-001.md, archive/tickets/SPEC70CHASTCHARSEM-002.md, archive/tickets/SPEC70CHASTCHARSEM-003.md

## Problem

SPEC-70 §2.1 + §2.5: the authoring surfaces must document the Semantic Preservation Contract (every structured operational `CHAR` fact must be copied / transformed / compressed / omitted-with-rationale / story-irrelevant, never surviving only in `## Source Distillation`) and add the §16a "Relevant capabilities / limits for this page" packet line. This is the human/skill-facing contract that the schema (001), subsections (002), and validator (003) enforce — it lands last so it references real, shipped surfaces rather than vaporware.

## Assumption Reassessment (2026-05-22)

1. `.claude/skills/story-character-profile/SKILL.md` Phase 1 (line ~183) names the source material to distill at the concept level ("identity, embodied constraints, voice, stable dispositions, relevant relationships, pressure behavior, known canon limits") and does NOT name `dramatic_core`, `## Capabilities`, or `## Signature Scene Behavior` (verified at SPEC-70 reassessment). `.claude/skills/_shared-templates/story-state-contract.md` §16a full-packet template has the line `- Agency and planning tendency:` (verified at line 472) — the §2.5 capabilities line inserts after it. `branching-story-bootstrap/SKILL.md` exists and has a cast-distillation phase.
2. Spec source: SPEC-70 §2.1 (contract text + the Phase 1 source-section update across `story-character-profile`, `branching-story-bootstrap`, and `story-state-contract.md`) and §2.5 (the single full-packet line + the offstage-causal conditional note). §4 explicitly rejects the broader §16a role taxonomy — only the one capabilities line is in scope; the closed `required_because` vocabulary stays unchanged.
3. Cross-artifact boundary under audit: this prose references surfaces created by sibling tickets — `source_operational_fact_map` (`archive/tickets/SPEC70CHASTCHARSEM-001.md`), the H3 operational-home subsections (`archive/tickets/SPEC70CHASTCHARSEM-002.md`), and the `stchar_source_fact_coverage` validator (`archive/tickets/SPEC70CHASTCHARSEM-003.md`). Declare the archived 001/002/003 tickets as dependencies so the prose only references shipped surfaces (Cross-Cutting Docs Ticket shape: enumerate every implementation ticket whose surface the docs reference). The §2.5 §16a line is itself contract-template content (not merely docs-about-other-tickets) and is independent of 001-003, but it is merged here because it shares `story-state-contract.md` with the §2.1 STCHAR-semantics contract edit.
4. FOUNDATIONS §Story Bundles §6.1 (Story-Local Character Authority) + §Tooling Recommendation: the contract restates §6.1 (STCHAR is runtime authority; operational facts must reach operational homes) and the deterministic/judgment split (§2.5's capabilities line is authoring judgment, not validator-graded — `page-plan-stchar-packet-integrity.ts` already governs §16a structure and capability-relevance-per-page is judgment, not deterministic). The prose must restate these principles accurately rather than trusting a paraphrase.

## Architecture Check

1. Landing the contract prose last (after 001-003) keeps every named surface real at write time — the contract names the `source_operational_fact_map` field, the H3 subsections, and the coverage validator, all of which exist once 001-003 ship. Merging §2.5's single §16a line with the §2.1 contract edit avoids a one-line ticket and co-locates both `story-state-contract.md` edits in one reviewable diff.
2. No backwards-compatibility shim: prose-only additions; no skill rule is renamed or aliased. The §16a line is additive to the full-packet template; the closed `required_because` vocabulary is untouched (no role-taxonomy expansion).

## Verification Layers

1. The Semantic Preservation Contract text appears in all three surfaces → codebase grep-proof (`grep -l "Semantic Preservation\|structured operational source fact" <three files>`).
2. `story-character-profile` Phase 1 source-section list now names `dramatic_core` + `## Capabilities` + `## Signature Scene Behavior` → codebase grep-proof.
3. §16a full-packet template carries `Relevant capabilities / limits for this page:` after `Agency and planning tendency:` → codebase grep-proof; the `required_because` closed vocabulary is unchanged → grep-proof (the enum line is byte-identical to pre-edit).

## What to Change

### 1. Semantic Preservation Contract (§2.1)

Add the contract text (SPEC-70 §2.1 blockquote) to `story-character-profile/SKILL.md` (Phase 1 + Phase 3), `branching-story-bootstrap/SKILL.md` (cast-distillation phase), and `story-state-contract.md` (STCHAR semantics). Update `story-character-profile` Phase 1's source-section list to explicitly name `dramatic_core` (all 10 engine fields), `## Capabilities`, and `## Signature Scene Behavior`.

### 2. §16a capabilities line (§2.5)

In `story-state-contract.md` §16a, add `- Relevant capabilities / limits for this page:` to the full packet after `- Agency and planning tendency:`. For the reduced `offstage_causal` packet, add the same line only when the offstage character's capability is the mechanism of their causal bearing (authoring judgment note, not a validator gate). Leave the closed `required_because` vocabulary unchanged.

## Files to Touch

- `.claude/skills/story-character-profile/SKILL.md` (modify) — Phase 1 source-section list + contract; Phase 3 contract reference
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify) — cast-distillation contract
- `.claude/skills/_shared-templates/story-state-contract.md` (modify) — STCHAR semantics contract (§2.1) + §16a capabilities line (§2.5)

## Out of Scope

- Any validator / schema / code change (those are 001/002/003) — this is prose-only.
- Expanding the §16a `required_because` closed vocabulary or adding new role flags (SPEC-70 §4 rejects the broad role taxonomy).
- Free-prose `## Capabilities` parsing discipline (covered by authoring direction only; not gated).

## Acceptance Criteria

### Tests That Must Pass

1. `grep` confirms the contract text is present in all three surfaces.
2. `grep` confirms `story-character-profile` Phase 1 names `dramatic_core` / `## Capabilities` / `## Signature Scene Behavior`.
3. `grep` confirms `story-state-contract.md` §16a full packet carries `Relevant capabilities / limits for this page:` and the `required_because` enum line is unchanged.

### Invariants

1. Prose-only: no `.ts`, `.json` schema, or test file is touched by this ticket.
2. The §16a `required_because` closed vocabulary is byte-identical to its pre-edit form (no role-taxonomy expansion).

## Test Plan

### New/Modified Tests

1. `None — documentation/skill-prose ticket; verification is grep-based against the post-edit skill + contract files, and the enforcement coverage is provided by archive/tickets/SPEC70CHASTCHARSEM-001.md, archive/tickets/SPEC70CHASTCHARSEM-002.md, and archive/tickets/SPEC70CHASTCHARSEM-003.md.`

### Commands

1. `grep -n "Relevant capabilities / limits for this page" .claude/skills/_shared-templates/story-state-contract.md` — confirms §2.5 line landed.
2. `grep -ln "structured operational source fact" .claude/skills/story-character-profile/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/_shared-templates/story-state-contract.md` — confirms the contract is in all three surfaces.
3. `grep -n "required because: viewpoint" .claude/skills/_shared-templates/story-state-contract.md` — confirms the closed `required_because` vocabulary is unchanged (narrower than a full diff because the only invariant to prove is non-modification of the enum line).
