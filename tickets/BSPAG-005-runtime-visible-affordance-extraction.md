# BSPAG-005: Add runtime visible-affordance extraction before page-cycle choice generation

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — downstream branching-story skill contract prose only. Expected owner is `branching-story-page-cycle`; no package code, validator, schema, world content, `storylet-pool-authoring`, `story-fact-promotion-to-canon`, or health-audit implementation change unless reassessment proves a direct consumer contract.
**Deps**: archive/tickets/BSBOOT-014.md

## Problem

BSBOOT-014 added bootstrap Phase 7.5: a memory-only Visible Affordance Map extracted from rendered PG-0001 prose after Phase 7 and before Phase 8. That closed the bootstrap gap where choices could be generated from `PG-0001.state_snapshot` and storylet `choice_templates` while ignoring objects, actors, exits, tensions, or questions made salient by the rendered prose itself.

The runtime `branching-story-page-cycle` has the same structural risk on later pages. Its Phase 7 renders prose to a working buffer, then Phase 8 collects affordances deterministically from `state_snapshot` and uses the realized storylet's `choice_templates` as anchors. The rendered page prose is not currently an explicit Phase 8 input. A runtime page can therefore make an object, line of dialogue, exit, question, or emotional rupture salient in prose while the emitted CHCs ignore it.

## Assumption Reassessment (2026-05-06)

1. `archive/tickets/BSBOOT-014.md` — verified the bootstrap-side contract: Phase 7.5 is memory-only, runs after prose render and before choice generation, feeds Phase 8 as additional anchors, and routes ungrounded actors/objects/locations/exits back to Phase 7 re-prompts.
2. `.claude/skills/branching-story-page-cycle/references/phase-7-page-render.md` — verified runtime Phase 7 writes prose to a working buffer before Phase 11, already performs post-render prose critic and post-render claim classification, and shares a 3-re-prompt budget across critic/cross-check/fail-fast checks.
3. Cross-skill / cross-artifact boundary: `branching-story-page-cycle` is the runtime CHC producer and owns the later-page Phase 7 → Phase 8 handoff. `branching-story-bootstrap` now owns the PG-0001 version of the same handoff. The intended invariant is parity: every page-cycle choice-generation pass should see both state-derived affordances and prose-emphasized affordances before emitting CHCs.
4. FOUNDATIONS principle: Rule 1 / No Floating Facts supports the same closed-loop prose-state discipline here as in BSBOOT-014. A prose-emphasized affordance should either map to existing/newly-created story state or route back to Phase 7 as a re-prompt before Phase 8 choices are emitted.
5. HARD-GATE / Canon Safety Check surface: this ticket should not weaken Phase 4.5 canon-promotion handoff, Mystery Reserve firewall behavior, Phase 9 PASS-with-rationale discipline, approval-token behavior, `validate_patch_plan`, or `submit_patch_plan`. The likely change is an in-memory step before Phase 8, not a persisted schema or validator change.
6. Downstream consumer reflection:
   - `.claude/skills/branching-story-page-cycle` is the warranted owner because it renders later-page prose and emits later-page CHCs.
   - `.claude/skills/branching-story-health-audit` is not a direct consumer of the memory-only map. It audits persisted story state and prose after the fact; it may remain unchanged unless implementation chooses to add a separate post-hoc "ignored salient affordance" diagnostic, which would be a separate audit feature if warranted.
   - `.claude/skills/storylet-pool-authoring` is not a direct consumer. It records `choice_templates` as runtime-overridable scaffolds and produces SLT/JIT storylets, not emitted CHCs or page-prose affordance maps.
   - `.claude/skills/story-fact-promotion-to-canon` is not a direct consumer. Its authority is canon-promotion provenance and firewalling, not choice generation from rendered prose.
7. Existing active-ticket scan: no active `BSPAG-*` ticket owns this runtime visible-affordance parity concern. Archived `BSPAG-004` handled CHC `continuation_capacity` parity and explicitly classified non-owner skills for that separate contract; this ticket is a new Phase 7/8 handoff parity issue.

## Architecture Check

1. The clean design is to give runtime page-cycle the same explicit prose-affordance handoff that bootstrap now has, while adapting it to later pages where Phase 7 can legitimately emit new story-local records this turn. This keeps the page's rendered prose and offered choices coupled without turning storylet `choice_templates` into prescriptions.
2. No backwards-compatibility aliasing/shims. The Visible Affordance Map should remain a working-buffer artifact; existing persisted pages are not migrated.

## Verification Layers

1. Page-cycle `SKILL.md` process flow and procedure list include the new post-Phase-7 / pre-Phase-8 visible-affordance step -> codebase grep-proof.
2. A page-cycle reference documents the runtime Visible Affordance Map inputs, mapping table, routing, and re-prompt behavior -> codebase grep-proof + manual review.
3. Page-cycle Phase 8 reference treats the map as an additional choice-generation anchor alongside `state_snapshot`, storylet `choice_templates`, and governor/closure nudges -> codebase grep-proof.
4. The map remains memory-only and not persisted to PG/CHC/SLT schemas -> manual review.
5. Non-owner skills remain unchanged or are explicitly justified if reassessment discovers a direct consumer contract -> codebase grep-proof / manual review.

## What to Change

### 1. `.claude/skills/branching-story-page-cycle/SKILL.md`

- Insert a new step between Phase 7 and Phase 8 in the process flow.
- Add a corresponding procedure-list step.
- Keep Phase 9 and Phase 10 numbering truthful after the insertion.
- Preserve the existing Phase 7 critic/cross-check re-prompt budget and Phase 4.5 canon-promotion HARD-GATE wording.

### 2. NEW or updated page-cycle reference

- Add a runtime page-cycle reference, likely `.claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md`.
- Adapt the bootstrap Phase 7.5 contract to later pages:
  - inputs include the rendered page prose working buffer, current/next `state_snapshot`, newly-created records from Phase 5/Phase 7 claim classification, selected storylet, and existing `choice_templates`;
  - grounded affordances become additional Phase 8 anchors;
  - ungrounded actors/objects/locations/exits route back to Phase 7 re-prompt or to the existing Phase 7 claim-classification path when a load-bearing record should be created this turn;
  - the map is memory-only and discarded after Phase 8.

### 3. `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md`

- Update Step 1 / Step 2 prompt inputs so Phase 8 receives the Visible Affordance Map as an additional anchor source.
- Add a diversification/scoring rule parallel to bootstrap: when a grounded visible affordance is not engaged by any surviving CHC, prefer a valid CHC anchored on that affordance over a purely storylet-template-driven option, without weakening `choice_contract` or `continuation_capacity`.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md` (new, unless reassessment chooses to fold this into an existing reference)
- `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` (modify)

## Out of Scope

- Editing `.claude/skills/branching-story-bootstrap`; BSBOOT-014 already landed the bootstrap side.
- Persisting the Visible Affordance Map in PG, CHC, SLT, or audit schemas.
- Adding JSON Schema, validator, patch-engine, or MCP code.
- Migrating existing stories or pages.
- Editing `storylet-pool-authoring` unless reassessment finds a direct runtime-affordance consumer claim.
- Editing `story-fact-promotion-to-canon` unless reassessment finds a direct choice-generation or visible-affordance claim.
- Editing `branching-story-health-audit` unless reassessment finds that the audit already claims to evaluate prose-emphasized affordances ignored by CHCs.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "Phase 7\.5|Visible Affordance" .claude/skills/branching-story-page-cycle/SKILL.md` returns matches in both the process flow and the procedure list.
2. `ls .claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md` succeeds, or the ticket closeout explains the exact existing reference used instead.
3. `grep -nE "Visible Affordance Map" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` returns matches.
4. Manual review confirms ungrounded visible affordances route to Phase 7 re-prompt or the existing load-bearing claim-record path before Phase 8 emits choices.
5. `rg -n "Visible Affordance Map" .claude/skills/storylet-pool-authoring .claude/skills/story-fact-promotion-to-canon .claude/skills/branching-story-health-audit` is either empty or every hit is explicitly justified as a real consumer update in the completed ticket.

### Invariants

1. Runtime Phase 7.5 runs after page prose is rendered and before Phase 8 choice generation.
2. The Visible Affordance Map remains memory-only.
3. Runtime Phase 8 continues to enforce `choice_contract`, `continuation_capacity`, diversification, and Phase 9 validation gates.
4. Canon-promotion and Mystery Reserve HARD-GATE behavior remains unchanged.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and manual contract review unless reassessment uncovers a runnable validator or parsed-doc consumer.

### Commands

1. `grep -nE "Phase 7\.5|Visible Affordance" .claude/skills/branching-story-page-cycle/SKILL.md`
2. `ls .claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md`
3. `grep -nE "Visible Affordance Map" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md`
4. `rg -n "Visible Affordance Map" .claude/skills/storylet-pool-authoring .claude/skills/story-fact-promotion-to-canon .claude/skills/branching-story-health-audit`
5. Manual cross-read against `archive/tickets/BSBOOT-014.md` and `docs/FOUNDATIONS.md` Rule 1 / No Floating Facts.
