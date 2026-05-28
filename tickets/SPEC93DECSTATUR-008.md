# SPEC93DECSTATUR-008: bootstrap — remove root page-plan authoring (state-only root)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/SKILL.md` + `references/{phase-7-root-event-and-page, phase-8-9-page-plan-and-choices, phase-10-validation, governance-and-foundations}.md`
**Deps**: archive/tickets/SPEC93DECSTATUR-001.md

## Problem

`branching-story-bootstrap` currently authors a root page plan (`pages-prose-plans/PG-1.md`) at Phase 8. SPEC-93 §2.2 removes root page-plan authoring so bootstrap creates story state only — the root branch, root `SE`/`PG`, seed records, and initial `CHC`s — with no page-plan render artifact. The root scene is created later by SPEC-92's `branching-story-scene-plan` when the author invokes scene planning.

## Assumption Reassessment (2026-05-28)

1. `branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` opens with "Phase 8: Author the root page plan — Draft ... `pages-prose-plans/PG-1.md` per shared contract §8 — the 19 numbered sections..."; bootstrap does NOT currently pass `page_plan_drafts` (verified during SPEC-93 reassessment, this session) — so no tool-argument coupling exists for bootstrap, unlike turn-cycle.
2. SPEC-93 §2.2 + §6 skills bullet: remove root page-plan authoring; state only; §8 AC1 (bootstrap produces no `pages-prose-plans/PG-1.md`).
3. Cross-artifact boundary: bootstrap produces the planless root `PG`, which must validate against the relaxed `story-page.schema.json` (Deps archive/tickets/SPEC93DECSTATUR-001.md); the reference file `phase-8-9-page-plan-and-choices.md` bundles page-plan authoring with choice generation, so the choice-generation content is retained while the page-plan content is removed.
4. FOUNDATIONS §Story Bundles §4 / §4a (Plan-Authority Boundary): state is authoritative at `PG`-record commit; no page-plan render artifact is part of bootstrap's state creation — the same Pipeline-shape amendment that §5 makes to FOUNDATIONS.

## Architecture Check

1. Removing root page-plan authoring (vs. keeping a trivial root plan) keeps bootstrap state-only and symmetric with turn-cycle; the root scene is the scene layer's responsibility (SPEC-92), invoked on demand.
2. No backwards-compatibility shim: the Phase 8 root page-plan authoring is removed; the reference file retains only its choice-generation content (renamed/rescoped accordingly).

## Verification Layers

1. No root page-plan authoring -> skill-contract grep-proof (`SKILL.md` + references produce no `pages-prose-plans/PG-1.md`).
2. Choice generation retained -> manual review (the `phase-8-9` reference's choice-generation content survives; only page-plan authoring removed).
3. Planless root PG validates -> schema validation (the root `PG` validates against the relaxed `story-page.schema.json`).

## What to Change

### 1. Remove root page-plan authoring

In `branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md`: remove the "Phase 8: Author the root page plan" content and its 19-section reference; retain the choice-generation (Phase 9) content. Rescope the reference file's framing to "root choices" (no page plan).

### 2. SKILL.md + supporting references

In `SKILL.md`, `references/phase-7-root-event-and-page.md`, `references/phase-10-validation.md`, and `references/governance-and-foundations.md`: remove references to authoring the root page plan and the page-plan HARD-GATE/validation expectations; the root output is state-only (root branch, root `SE`/`PG`, seed records, `CHC`s).

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-7-root-event-and-page.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-10-validation.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/governance-and-foundations.md` (modify)

## Out of Scope

- turn-cycle's page-plan removal (SPEC93DECSTATUR-007).
- The PG schema relaxation itself (archive/tickets/SPEC93DECSTATUR-001.md).
- Root scene creation (SPEC-92's `branching-story-scene-plan`, invoked on demand).
- Choice-generation logic (retained; only page-plan authoring removed).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "pages-prose-plans\|Author the root page plan\|root page plan" .claude/skills/branching-story-bootstrap/` returns no live authoring references.
2. The retained choice-generation content is intact (manual review).
3. bootstrap's documented root output is state-only (root branch, root `SE`/`PG`, seed records, `CHC`s) — manual review.

### Invariants

1. bootstrap produces no `pages-prose-plans/PG-1.md`.
2. The root `PG` is planless and validates against the relaxed schema.

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; verification is command-based (grep-proofs above) and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rn "pages-prose-plans\|root page plan" .claude/skills/branching-story-bootstrap/` — expect no live authoring references.
2. End-to-end planless bootstrap flow exercised in SPEC93DECSTATUR-013.
