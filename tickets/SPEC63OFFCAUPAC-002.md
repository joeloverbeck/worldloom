# SPEC63OFFCAUPAC-002: Authoring-skill §16a guidance for the offstage tier

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `branching-story-bootstrap` SKILL.md §16a authoring guidance + `branching-story-turn-cycle` phase-7 reference. Prose-only; no code change.
**Deps**: SPEC63OFFCAUPAC-001

## Problem

With the offstage-causal tier defined in the §16a contract (001), the two authoring skills that produce page plans must learn when to emit it. Without guidance, authors keep using the binary full-packet-or-omit posture, leaving offstage causal authority either over-authored (a full voice-bearing packet for a character not on the page) or lost (the character dropped from `active_records`).

## Assumption Reassessment (2026-05-21)

1. `branching-story-bootstrap/SKILL.md` documents §16a authoring (Phase 1-9 page-plan drafting + the Phase-10 §16a packet check, one of the 5 bootstrap-additional checks); `branching-story-turn-cycle/references/phase-7-page-plan.md` carries the §16a authoring paragraph. Both confirmed present this session.
2. The packet shape these skills emit is defined by SPEC63OFFCAUPAC-001 (§16a contract §2.1). This ticket consumes that contract; it must not redefine the shape.
3. Cross-skill boundary under audit: both skills emit against the SAME §16a shared contract (`_shared-templates/story-state-contract.md`). The guidance added here must match the contract's reduced-shape definition (carries hashes + appraisal/pressure/causal-relevance; omits the voice block) so bootstrap, turn-cycle, and the validator (003) stay mutually consistent.
4. FOUNDATIONS §6.1 (Story-Local Character Authority) — the emitted offstage packet keeps authority STCHAR-sourced with no `CHAR-*` leak. §9 (Prose Length Discipline) — the guidance must not introduce a word budget for the reduced packet. Restated; both hold.

## Architecture Check

1. Teaching the offstage tier at both authoring sites (not only one) keeps bootstrap's root page and turn-cycle's continuation pages consistent — a character offstage at root and offstage mid-story gets the same reduced posture either way.
2. No backwards-compatibility shim: present-character authoring is unchanged (full packet, voice block when speaker/viewpoint); the offstage tier is added guidance.

## Verification Layers

1. bootstrap §16a guidance names the `offstage_causal` tier + reduced shape -> codebase grep-proof.
2. phase-7 §16a paragraph names the `offstage_causal` tier + reduced shape -> codebase grep-proof.
3. Cross-skill consistency: both sites describe the same reduced shape as the §16a contract (001) -> manual review against `story-state-contract.md` §16a.
4. Present-character full-packet guidance is unchanged at both sites -> manual review.

## What to Change

### 1. bootstrap §16a authoring guidance

In `branching-story-bootstrap/SKILL.md`, extend the §16a authoring guidance (and the Phase-10 self-contained-page-plan check that names §16a packets) to: emit an `offstage_causal` packet (reduced shape per 001) for an active offstage character whose activity causally bears on the page; omit non-causal offstage characters; keep present-character authoring unchanged.

### 2. turn-cycle phase-7 §16a paragraph

In `branching-story-turn-cycle/references/phase-7-page-plan.md`, extend the §16a authoring paragraph with the same offstage-tier guidance.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (modify)

## Out of Scope

- Defining the offstage packet shape (owned by SPEC63OFFCAUPAC-001).
- Validator enforcement (SPEC63OFFCAUPAC-003).
- Any change to present-character (full-packet) authoring.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "offstage_causal" .claude/skills/branching-story-bootstrap/SKILL.md` returns the new guidance.
2. `grep -n "offstage_causal" .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` returns the new guidance.
3. Both sites describe the reduced shape consistently with `story-state-contract.md` §16a (manual review).

### Invariants

1. Present-character full-packet authoring guidance is unchanged at both sites.
2. The offstage-tier guidance introduces no word-count budget (FOUNDATIONS §9).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "offstage_causal\|offstage causal" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`
2. `grep -n "offstage_causal" .claude/skills/_shared-templates/story-state-contract.md` (confirm the contract this guidance references — 001 — is in place)
3. Skill-prose-only change; verification is grep-based — the offstage tier's runtime enforcement is tested in SPEC63OFFCAUPAC-003.
