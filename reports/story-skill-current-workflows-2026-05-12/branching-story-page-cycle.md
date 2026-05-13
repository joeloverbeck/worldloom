# Branching Story Page Cycle - Current Workflow Report

This report is self-contained. It inlines the important workflow, schema, validator, prose-craft, and handoff details so a reviewer does not need repository access.

## Purpose

`branching-story-page-cycle` advances an existing branching story by one causal tick. It consumes a parent page and either an emitted choice or a free-form write-in, produces a new page state transaction and a comprehensive prose plan, and leaves rendered prose to `branching-story-page-prose-finalize`.

Forking is modeled as the same operation as continuation: point `parent_page_id` at a non-leaf page and the new tick creates a new branch.

## Embedded Source Details

The underlying skill is split across one orchestration document, phase write-ups, record schemas, and prose guidance. The important embedded details are:

- Required inputs are `world_slug`, `story_slug`, `parent_page_id`, and exactly one of `chosen_choice_id` or `manual_action_text`.
- Parent page prose must already be rendered for non-root continuation. This is the hard block that ensures the new plan can include recent prose continuity rather than planning from an unrendered parent.
- Standard choices are structured `CHC` records. Write-ins are parsed into a proposed event and must be routed through world logic. The routing set is: accept, accept-but-transform, treat-as-attempt, or refuse-only-through-world-logic. Silent rejection is forbidden.
- Page-cycle uses scene-commitment arcs. Arc selection filters by hard preconditions, scores eligible arcs, weighted-picks from top candidates, and can request a one-off branch-scoped JIT arc when no eligible arc can satisfy continuation.
- Mystery resolution claims have three authorities: apparent, branch-local counterfactual, and canon candidate. Canon candidates pause the page cycle and route to the promotion workflow under a separate hard gate.
- State mutation is append-only. Updating an obligation, branch, relationship, or intention means creating a new record that supersedes the prior logical record, not editing the old record.
- Page records carry `state_snapshot`, state hashes, emitted choices, narrative health, selected arc/effect metadata, prose plan path, pending prose status, and deferred validation trace. Event records carry the structured operation applied this turn. Choice records carry operation, target, likely effects, success policies, and rendered surface label.
- The plan template is machine/frontmatter plus human prose instructions. It includes state anchors, recent prose continuity, selected arc translation, required effect translation, governor nudge, scene direction, declared affordances, forbidden mystery resolutions, intended beats, stopping point, and render-time instructions. It is not the final prose.
- The prose-craft guidance emphasizes psychic distance, free indirect discourse, strong verbs, sensory grounding, no engine jargon, non-repetitive rhythm, and letting length follow content.
- ARC_TRACE is split: page-cycle performs only Layer 1 structural validation over the plan and selected arc. Post-render trace extraction and semantic conformance are deferred to finalize.
- Phase 8 choice generation classifies the narrative point, composes exits from native seeds and state-driven needs, validates choice-worthiness, enforces strong-axis difference, renders surface labels, and adds the write-in slot. Menus should appear at commitment hinges, not every inert beat.
- Patch submit is staged: build envelope from zero, dry-run validate, sign approval token, submit, then write the plan and edit index last. Temporary envelope/token files are deleted only after full success and preserved for triage on failure.

## Current End-to-End Workflow

1. Pre-flight resolves the story bundle, validates the parent page belongs to it, enforces the section-14 hard block requiring rendered parent prose, pre-allocates IDs for all classes this tick will create, validates exactly one of `chosen_choice_id` or `manual_action_text`, resolves execution mode, loads `docs/FOUNDATIONS.md`, loads content policy, loads story/world context, and records canon revision for the new page.
2. Choice resolution accepts either a structured CHC or a write-in. Write-ins are parsed into a `ProposedEvent`, validated against state, and routed as accept, accept-but-transform, treat-as-attempt, or refuse-only-through-world-logic. Silent rejection is forbidden.
3. Impact analysis computes fact, obligation, intention, thread, relationship, storylet eligibility, and required-aftermath effects.
4. Continuation feasibility checks whether the state can still produce coherent continuation, aftermath handling, mystery preservation, invariant preservation, or terminal closure.
5. Arc selection filters eligible scene-commitment arcs, scores them, picks from top-K, and can invoke `storylet-pool-authoring mode=jit` when no candidate satisfies continuation needs.
6. Effect-variant selection picks the concrete effect variant before plan authoring.
7. Mystery resolution authority routes claims as apparent, branch-local counterfactual, or canon candidate. Canon candidates pause for `story-fact-promotion-to-canon` under a separate non-elidable hard gate.
8. State mutation applies chosen variant required effects as append-only records, computes the next snapshot, persists aftermath consequences, and enforces branch isolation by `created_at_page`.
9. Narrative governor recomputes health metrics and generates a homeostatic nudge.
10. Closure readiness detects whether branch ending or pausing options should be present without forcing termination.
11. Multi-beat page-plan authoring populates the shared plan template with content policy, story kernel, selected arc, chosen effects, scene context, recent rendered prose along branch path, governor nudge, and scene direction. It writes a plan, not prose.
12. Declared-affordance validation checks that plan-frontmatter affordances resolve to actual state records.
13. ARC_TRACE Layer 1 structural validation runs at plan-commit; Layer 2/3 defer to finalize.
14. Choice-surface gate generates the next menu by narrative point, exit portfolio, choice-worthiness, strong-axis pair distance, surface label rendering, and write-in slot.
15. Phase 9 validation records pass/fail/deferred outcomes for 19 gates. Prose-ledger and arc-trace evidence gates defer to finalize.
16. Phase 10 approval is shown in authoring mode and hidden in some runtime/batch modes after validation passes. The canon-promotion gate is never hidden.
17. Phase 11 submits story `_source` records through the patch engine, writes `pages-prose-plans/PG-NNNN.md`, ensures `pages-prose/.gitkeep`, edits bundle `INDEX.md` last, and cleans temp envelope files only after full success.

## Write Surface

The skill may create or supersede story-local records for pages, events, facts, obligations, consequences, threads, relationships, intentions, JIT storylets, locations, objects, artifacts, branches, and choices. It also writes the page prose plan and updates bundle index. It never writes rendered prose and never mutates world canon directly.

## Primary Contracts And Handoffs

- Consumes rendered parent prose produced by finalize.
- Consumes storylets authored by storylet-pool-authoring.
- Invokes storylet-pool-authoring as no-write `mode=jit` when needed.
- Hands canon-candidate mystery or fact promotion to story-fact-promotion-to-canon.
- Produces pending rendered-prose pages for finalize.
- Shares envelope-shape conventions with bootstrap.

## Hard Gates And Safety Boundaries

The page-cycle hard gate has two layers:

- Story-bundle write approval is execution-mode dependent.
- Canon-promotion handoff is absolute in every mode.

The skill also blocks direct story `_source` writes, forbids sibling-branch prose reads, requires append-only supersession, forbids rendered-prose writes, and treats temp envelope files as run-scoped.

## Current Complexity Hotspots

- This is the central runtime skill and currently owns parsing, validation, arc selection, JIT generation, state mutation, plan authoring, choice generation, engine submit, and index maintenance.
- Several phase outputs are deferred to finalize, but page-cycle still has to prepare their placeholders correctly.
- Branching, continuation, write-in, terminal, JIT, and canon-candidate paths are all described in one workflow.
- Execution modes affect approval flow but not all safety gates, making mode semantics easy to misapply.
- The engine submit section is operationally heavy and overlaps with bootstrap/storylet envelope guidance.

## Streamlining Questions For Review

- Should page-cycle be split into planner/state-transition and write/submit phases?
- Should write-in parsing and choice-surface generation be extracted into smaller stable contracts?
- Should finalize-owned fields be represented by a shared pending-prose schema rather than repeated prose?
- Should JIT storylet generation be expressed as a single API contract instead of embedded sub-routine details?
