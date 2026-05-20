# SPEC52PROGRACHA-001: Shared protagonist-grade-character-engine reference

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — new shared reference `.claude/skills/_shared-references/protagonist-grade-character-engine.md` (new directory). No impact on existing skills until they cite it (tickets 002/003/004).
**Deps**: None

## Problem

The character pipeline is canon-safe but not memorability-driven. There is no shared doctrine defining what makes a character protagonist-grade, so `propose-new-characters`, `character-generation`, and the new `deepen-character-proposal` skill would each re-derive the engine inconsistently. SPEC-52 D1 establishes one canonical reference all three consume.

## Assumption Reassessment (2026-05-20)

1. `.claude/skills/_shared-references/` does not yet exist (only `.claude/skills/_shared-templates/` ships, holding the cross-skill `story-state-contract.md`); creating `_shared-references/` as a new shared directory was the explicit Q1=(b) decision at SPEC-52 reassessment. The three consuming skill directories exist at `.claude/skills/{propose-new-characters,character-generation,deepen-character-proposal}/` (the third is created by ticket 004).
2. SPEC-52 §Phase 1 work item 1 + Deliverable 1 name this file and its required content (protagonist-grade standard, engine fields, mutation rule, scoring rubric, rejection triggers, critic prompts).
3. Cross-skill boundary under audit: this reference is the shared contract consumed by `propose-new-characters` (002), `character-generation` (003), and `deepen-character-proposal` (004). The 10 engine field names defined here MUST match the NCP `memorability_profile` block (002) and CHAR `dramatic_core` block (003) byte-for-byte, or the schema validators in 005/006 will diverge from the doctrine.
4. FOUNDATIONS Rule 2 (No Pure Cosmetics): the reference must require every engine field to be world-produced (rooted in institutions, body/species condition, economy, geography, taboo, law, religion, history, or epistemic limits). Memorability is "world pressure made personal," never arbitrary eccentricity — this is the doctrine's load-bearing constraint.

## Architecture Check

1. A single shared reference prevents three-way drift; each skill cites it rather than re-deriving the engine. Cleaner than duplicating the doctrine across three SKILL.md files where it would drift independently.
2. No backwards-compatibility aliasing/shims — net-new file.

## Verification Layers

1. File exists with the full engine field set → codebase grep-proof.
2. Each engine field's prose requires world-producedness (Rule 2) → manual review (FOUNDATIONS alignment check).
3. Single-authoring ticket: downstream conformance (templates carry the fields, validators enforce them) is proven in 002/003/005/006, not here; this ticket proves only that the doctrine exists and is Rule-2-grounded.

## What to Change

### 1. Author `.claude/skills/_shared-references/protagonist-grade-character-engine.md`

Include: the protagonist-grade standard ("even a background figure feels like the protagonist of their own life — engine density, not screen time"); the 10 required engine fields (`world_produced_wound`, `active_appetite`, `self_mythology`, `irreconcilable_contradiction`, `pressure_behavior`, `relational_charge`, `moral_psychological_edge`, `signature_scene_behaviors`, `voice_under_pressure`, `cannot_be_swapped_out_because`) with a one-line definition each, every definition requiring world-producedness; the mutation rule (mutate the social/institutional/bodily/moral/epistemic engine, do not merely intensify adjectives); the single-seed mutation spread (darker / more pathetic-or-humiliating / more institutionally dangerous / more ordinary-but-sharper / canon-edge-or-requiring-if-world-valid / premise-reversal-preserving-essence); the rejection triggers; and the two-layer scoring rubric (world-validity + memorability) plus the blandness-executioner and protagonist-grade critic prompts.

## Files to Touch

- `.claude/skills/_shared-references/protagonist-grade-character-engine.md` (new)

## Out of Scope

- Editing any consuming skill (`propose-new-characters` / `character-generation` / `deepen-character-proposal` — tickets 002/003/004).
- Any schema or validator change (tickets 005/006).
- The NCP/CHAR template field blocks themselves (authored in 002/003).

## Acceptance Criteria

### Tests That Must Pass

1. `test -f .claude/skills/_shared-references/protagonist-grade-character-engine.md` succeeds.
2. All 10 engine field names appear in the file (grep-proof below).
3. Each engine field definition includes a world-producedness clause (manual review).

### Invariants

1. Engine field names in this reference match the NCP `memorability_profile` (002) and CHAR `dramatic_core` (003) field names exactly.
2. Every engine field's prose requires world-producedness (Rule 2); no field permits cosmetic eccentricity.

## Test Plan

### New/Modified Tests

1. `None — documentation/reference-only ticket; verification is command-based and downstream conformance is named in Assumption Reassessment.`

### Commands

1. `grep -nE "world_produced_wound|active_appetite|self_mythology|irreconcilable_contradiction|pressure_behavior|relational_charge|moral_psychological_edge|signature_scene_behaviors|voice_under_pressure|cannot_be_swapped_out_because" .claude/skills/_shared-references/protagonist-grade-character-engine.md`
2. A narrower command is the correct boundary: this is a new-file reference ticket with no pipeline wiring; full-pipeline verification happens in the consuming tickets (002/003/004/006).
