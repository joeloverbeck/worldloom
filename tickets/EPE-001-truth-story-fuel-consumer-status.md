# EPE-001: Truth story_fuel consumer status after story siblings shipped

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/emergent-pressure-events/SKILL.md` (story_fuel consumer/status prose only)
**Deps**: archive/tickets/BSBOOT-001-delegate-bootstrap-seams-to-page-cycle.md; archive/tickets/MCPENH-012-register-story-page-cycle-task-type.md

## Problem

`emergent-pressure-events` still tells maintainers that `branching-story-bootstrap` and `branching-story-page-cycle` are not-yet-implemented brainstorming proposals, and that `story_fuel` cards remain inert until those siblings ship. That was true when EPE shipped, but post-review evidence now shows the story siblings exist and the page-cycle context-packet profile is registered.

Leaving this stale prose in Guardrails risks misleading future maintainers about the state of the story-fuel handoff. The `story_fuel` routing remains passive and does not invoke downstream skills, but its consumer status should be described as shipped-story-engine inputs rather than planned-only placeholders.

## Assumption Reassessment (2026-05-02)

1. Live stale prose appears in `.claude/skills/emergent-pressure-events/SKILL.md` §Guardrails: it says `branching-story-bootstrap` and `branching-story-page-cycle` exist as `brainstorming/*.md` proposals and that `story_fuel` cards are inert until those siblings ship.
2. Current shipped story siblings exist under `.claude/skills/branching-story-bootstrap/SKILL.md` and `.claude/skills/branching-story-page-cycle/SKILL.md`. Archived `BSBOOT-001` records bootstrap/page-cycle schema delegation, and archived `MCPENH-012` records the registered `story_page_cycle` context-packet task type.
3. Shared boundary under audit: EPE `downstream_routing: story_fuel` prose and its passive-consumer handoff to the story-engine skills. This ticket is prose-only; it does not change EPE card schema, routing values, generation phases, or downstream skill behavior.
4. FOUNDATIONS principle: Canon Layers and Change Control Policy remain unchanged. EPE cards are candidates, not accepted canon; story_fuel cards must still avoid asserting world-level truth or invoking canon mutation.
5. Not applicable — this ticket does not touch HARD-GATE semantics, canon-write ordering, approval tokens, validators, or Mystery Reserve firewall enforcement.
6. No schema extension. `downstream_routing` values remain `canonize | story_fuel | ambient`; `proposal_card_extract` stays null for story_fuel cards.
7. No skill / tool / hook / validator / schema field is renamed or removed.
8. Adjacent contradiction classification: this is separate skill-prose drift exposed during MCPENH-012 post-ticket review, not unfinished MCPENH-012 implementation work.

## Architecture Check

1. Truthing the EPE Guardrails prose keeps the passive handoff contract accurate without adding a direct skill chain or backwards-compatibility alias.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Stale planned-consumer wording removed -> codebase grep-proof over `.claude/skills/emergent-pressure-events/SKILL.md` for `not-yet-implemented`, `brainstorming/*.md proposals`, and `inert until those siblings ship`.
2. Passive routing invariant preserved -> manual review of EPE §Guardrails and downstream_routing phases to confirm `story_fuel` remains a label, not a callback.
3. FOUNDATIONS alignment -> manual review confirming EPE cards remain candidates and story_fuel cards do not assert accepted canon or emit canon-addition sidecars.

## What to Change

### 1. Truth EPE story_fuel consumer prose

Update `.claude/skills/emergent-pressure-events/SKILL.md` §Guardrails to say `branching-story-bootstrap` and `branching-story-page-cycle` now exist, and that `story_fuel` cards are passive inputs for separately invoked story-engine workflows.

### 2. Preserve passive-routing and non-canon constraints

Keep the current no-chaining rule, candidate-only framing, and sidecar conditionality intact.

## Files to Touch

- `.claude/skills/emergent-pressure-events/SKILL.md` (modify)

## Out of Scope

- Changing EPE card schema or templates.
- Adding direct invocation of story-engine skills.
- Changing `story_fuel` routing semantics.
- Auditing whether existing EPE cards are consumed correctly by story-engine skills.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n 'not-yet-implemented|brainstorming/\*\.md proposals|inert until those siblings ship' .claude/skills/emergent-pressure-events/SKILL.md` returns no hits.
2. Manual review confirms `.claude/skills/emergent-pressure-events/SKILL.md` still says skills do not chain and that `downstream_routing` is a passive label.
3. Manual review confirms story_fuel cards remain non-canon candidates and do not emit canonize sidecars.

### Invariants

1. EPE remains a canon-reading, candidate-emitting workflow; it does not mutate world canon.
2. `story_fuel` remains a passive routing label, not an automatic downstream invocation.

## Test Plan

### New/Modified Tests

1. `None — skill-prose truthing ticket; verification is grep/manual-review based and the affected workflow has no executable runner.`

### Commands

1. `rg -n 'not-yet-implemented|brainstorming/\*\.md proposals|inert until those siblings ship' .claude/skills/emergent-pressure-events/SKILL.md`
2. `rg -n 'Skills do not chain|downstream_routing|story_fuel|proposal_card_extract' .claude/skills/emergent-pressure-events/SKILL.md`
