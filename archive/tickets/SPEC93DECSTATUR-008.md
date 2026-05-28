# SPEC93DECSTATUR-008: bootstrap — remove root page-plan authoring (state-only root)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/SKILL.md` + `references/{phase-7-root-event-and-page, phase-8-9-page-plan-and-choices, phase-10-validation, governance-and-foundations}.md`
**Deps**: archive/tickets/SPEC93DECSTATUR-001.md

## Problem

`branching-story-bootstrap` currently authors a root page plan (`pages-prose-plans/PG-1.md`) at Phase 8. SPEC-93 §2.2 removes root page-plan authoring so bootstrap creates story state only — the root branch, root `SE`/`PG`, seed records, and initial `CHC`s — with no page-plan render artifact. The root scene is created later by SPEC-92's `branching-story-scene-plan` when the author invokes scene planning.

## Assumption Reassessment (2026-05-28)

1. At intake, `branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` opened with "Phase 8: Author the root page plan — Draft ... `pages-prose-plans/PG-1.md` per shared contract §8 — the 19 numbered sections..."; bootstrap did NOT pass `page_plan_drafts` (verified during SPEC-93 reassessment, this session) — so no tool-argument coupling existed for bootstrap, unlike turn-cycle.
2. SPEC-93 §2.2 + §6 skills bullet: remove root page-plan authoring; state only; §8 AC1 (bootstrap produces no `pages-prose-plans/PG-1.md`).
3. Cross-artifact boundary: bootstrap produces the planless root `PG`, which must validate against the relaxed `story-page.schema.json` (Deps archive/tickets/SPEC93DECSTATUR-001.md); the reference file `phase-8-9-page-plan-and-choices.md` bundles page-plan authoring with choice generation, so the choice-generation content is retained while the page-plan content is removed.
4. FOUNDATIONS §Story Bundles §4 / §4a (Plan-Authority Boundary): state is authoritative at `PG`-record commit; no page-plan render artifact is part of bootstrap's state creation — the same Pipeline-shape amendment that §5 makes to FOUNDATIONS.
5. Implementation found same-seam stale bootstrap references outside the initially drafted file list: pre-flight sources, STCHAR/distillation routing, belief/debt/seed-block references, and governance guardrails still described root page-plan or page-plan-hash behavior. These were required fallout because the acceptance sweep covers the whole bootstrap skill directory and operators would otherwise still receive live plan-authoring instructions.

## Architecture Check

1. Removing root page-plan authoring (vs. keeping a trivial root plan) keeps bootstrap state-only and symmetric with turn-cycle; the root scene is the scene layer's responsibility (SPEC-92), invoked on demand.
2. No backwards-compatibility shim: the Phase 8 root page-plan authoring is removed; the reference file retains only its choice-generation content (renamed/rescoped accordingly).

## Verification Layers

1. No root page-plan authoring -> skill-contract grep-proof (`SKILL.md` + references produce no `pages-prose-plans/PG-1.md`).
2. Choice generation retained -> manual review (the `phase-8-9` reference's choice-generation content survives; only page-plan authoring removed).
3. Planless root PG validates -> schema validation (the root `PG` validates against the relaxed `story-page.schema.json`).

## Landed Changes

### 1. Removed root page-plan authoring

In `branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md`: removed the root page-plan body and its 19-section/hash workflow; retained the choice-generation content and rescoped the reference to first choices.

### 2. Rescoped SKILL.md and supporting references

In `SKILL.md`, `references/phase-7-root-event-and-page.md`, `references/phase-10-validation.md`, `references/governance-and-foundations.md`, and same-seam bootstrap references: removed root page-plan deliverables, `plan_hash`/`prose_plan_path` stamping, page-plan validation checks, and prose-quality source preloads from bootstrap. The root output is state-only (root branch, root `SE`/`PG`, seed records, `CHC`s), plus `STORY_KERNEL.md` and indexes.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/pre-flight-and-prerequisites.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-3-4-facts-beliefs-da.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-5-debts-and-optional-seeds.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md` (modify)
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

1. `rg -n "pages-prose-plans|Author the root page plan|root page plan" .claude/skills/branching-story-bootstrap` returns no matches, proving no live root plan authoring reference remains.
2. The retained choice-generation content is intact (manual review).
3. bootstrap's documented root output is state-only (root branch, root `SE`/`PG`, seed records, `CHC`s) — manual review.

### Invariants

1. bootstrap produces no `pages-prose-plans/PG-1.md`.
2. The root `PG` is planless and validates against the relaxed schema.

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; verification is command-based (grep-proofs above) and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `rg -n "pages-prose-plans|Author the root page plan|root page plan" .claude/skills/branching-story-bootstrap` — expect no matches.
2. End-to-end planless bootstrap flow exercised in SPEC93DECSTATUR-013.

## Outcome

Completed: 2026-05-28

Landed changes:

1. `branching-story-bootstrap/SKILL.md` now describes bootstrap as state-only: it drafts `SE-1`, a planless `PG-1`, seed records, `CHC`s, `STORY_KERNEL.md`, and indexes; it no longer lists `pages-prose-plans/PG-1.md` as a deliverable or user-approved preview surface.
2. The bootstrap HARD-GATE now requires planless `PG-1` state and first choices, not a 19-section root page plan; validation now computes only `PG-1.state_hash` via `compute-pg-hashes --pg`.
3. `phase-8-9-page-plan-and-choices.md` now contains only first-choice generation guidance.
4. Same-seam bootstrap references now route transient presentation facts to records, choices, and downstream scene-plan guidance instead of a root page plan.

Deviations from plan:

- Added four same-seam bootstrap reference files beyond the drafted `Files to Touch` list because the whole-skill stale-anchor sweep exposed live root plan guidance there too.
- Kept `branching-story-prose-attach` retirement out of scope; SPEC93DECSTATUR-009 owns that cross-skill deletion and downstream roster reconcile.

## Verification Result

1. `rg -n "pages-prose-plans|Author the root page plan|root page plan" .claude/skills/branching-story-bootstrap` — PASS; no matches.
2. Manual review of `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` — PASS; retained 3-5 concrete `CHC` generation, `grounded_in.records`, affordance ordinal grounding, no placeholder write-in CHC, and no root plan authoring body.
3. Manual review of `.claude/skills/branching-story-bootstrap/SKILL.md` and `references/phase-7-root-event-and-page.md` — PASS; bootstrap root output is planless `PG-1` plus state records/choices, with `plan.plan_hash` and `prose_plan_path` explicitly omitted.
4. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance-story-page.test.js` — PASS; 25 tests passed, including `record_schema_compliance accepts a planless SPEC-93 PG record`.
