# Creating spec-to-tickets skill

We're going to be decomposing specs into tickets soon, so we need a formalized spec-to-tickets skill in .claude/skills/* . I brought over .claude/skills/spec-to-tickets-worldwake/* , which comes from another repository. I need you to analyze it and adapt the core logic to a repo-local .claude/skills/spec-to-tickets/* without any extraneous material.

The referenced skill makes references to files such as tickets/README.md, which doesn't currently exist. I'll provide here the original files from the worldwake repository. You'll also need to create them locally but without adopting extraneous content.

## tickets/README.md
```
# Ticket Authoring Contract

This directory contains active implementation tickets.

To keep architecture clean, robust, and extensible, every new ticket must be created from `tickets/_TEMPLATE.md` and must satisfy the checks below.

All precision rules for technical claims — ordering, layer naming, coverage gaps, scenario isolation, and domain-specific requirements — are defined in `docs/precision-rules.md`. Apply those rules when writing any ticket section.
For golden-test tickets, treat `docs/generated/golden-e2e-inventory.md` as the canonical `golden_*` test-name inventory, `docs/generated/golden-scenario-index.md` as the gameplay-level scenario overview, and `docs/generated/golden-scenario-details/` for per-file test-name-level detail. Regenerate all with `python3 scripts/golden_inventory.py --write --check-docs`.
When a ticket depends on golden ordering or proof-surface choice, use `docs/golden-e2e-testing.md` as the canonical guide instead of reconstructing those rules from archived tickets.

## Core Architectural Contract

1. No backwards-compatibility shims or alias paths in new work.
2. If current code and ticket assumptions diverge, update the ticket first before implementation.

## Required Ticket Sections

1. `Assumption Reassessment (YYYY-MM-DD)`:
   - Validate ticket assumptions against current code/tests.
   - Explicitly call out mismatches and corrected scope.
   - Cite exact files, symbols, or tests for any non-trivial architectural claim.
   - For mixed-layer or cross-system tickets, name the exact shared abstraction boundary or data contract under audit before implementation.
   - For information-path refactors, state whether the same fact currently has multiple transport paths, which path is canonical after the change, and whether any duplicate path is removed in-scope or deferred to a named follow-up ticket.
   - If a failing golden or mixed-layer scenario is motivating the ticket, restate the intended invariant before trusting the scenario narrative.
   - Classify newly exposed adjacent contradictions as required consequences of the intended change, separate bugs uncovered during reassessment, or future cleanup that must become its own ticket.
   - Apply all domain-specific precision requirements from `docs/precision-rules.md` (ordering, political claims, stale requests, ControlSource, heuristic removal, cumulative arithmetic, scenario isolation, coverage gaps, layer precision).
   - For planner- or golden-driven tickets, name the live `GoalKind` under test and the exact current operator, affordance, or prerequisite surface the scenario depends on. If reassessment shows the live goal family or operator surface differs from the original narrative, correct the ticket scope before implementation.
   - For ranking-sensitive tickets, validate the live ranking arithmetic before claiming branch symmetry, equal motive scores, or "priority-class only" divergence. Equal weights alone are not enough; check the full active substrate such as pressure, weights, promotions, and caps.
2. `Architecture Check`:
   - Explain why the proposed design is cleaner than alternatives.
3. `Verification Layers`:
   - Required for any mixed-layer or cross-system ticket.
   - Map each important invariant to the exact verification surface that proves it.
   - Use one line per invariant, for example:
     - candidate absence / reasoning behavior -> decision trace or focused runtime coverage
     - action lifecycle ordering -> action trace
     - authoritative mutation ordering -> event-log delta and/or authoritative world state
   - Do not collapse multiple layers into one generic "trace" or scenario-level assertion surface.
4. `Tests`:
   - List new/modified tests and rationale per test.
   - Include targeted and full-suite verification commands.
   - Commands must be copy-paste runnable against real test names or real targets, not approximate file-name filters.

## Mandatory Pre-Implementation Checks

1. Dependency references point to existing repository files (active or archived paths are both valid when explicit).
2. Type and data contracts match current code.
3. Files-to-touch list matches current file layout and ownership.
4. Scope does not duplicate already-delivered architecture.
5. Test commands have been dry-run checked or verified against the current test binary layout.
6. Claimed helper/function usage is verified against the exact current symbol location, not inferred from a similarly named helper elsewhere in the repo.
7. For AI-test tickets, use `cargo test -p worldwake-ai -- --list` or an equivalently narrow real command to confirm the current test names/targets before writing verification steps.
8. For stale-request, contested-affordance, or start-failure tickets, verify whether the first live rejection occurs in the shared runtime request layer before assigning scope to domain-specific handlers.
9. For ranking-sensitive golden or AI tickets, verify any claimed tie, neutrality, or branch symmetry against the current live arithmetic and cite the exact compared tests, scenarios, or symbols rather than inferring symmetry from equal utility weights alone.
10. For mixed-layer or cross-system tickets, confirm the intended invariant, the exact shared boundary under audit, and whether adjacent contradictions belong to this ticket or a follow-up before implementation begins.
11. If traces prove the outcome but not enough provenance to explain the architecture, keep the immediate proof at the strongest available lower layer and open a follow-up traceability ticket instead of broadening weaker downstream assertions.
12. For information-path refactors, confirm whether current code still has multiple lawful transport paths for the same fact, name the canonical end-state path, and verify that the planned proof surface remains strong enough to debug that canonical path after the change.
13. For component registration tickets, verify that all macro expansion sites (`delta.rs`, `world.rs`, `component_tables.rs`) import the new types — the `with_component_schema_entries!` macro generates code using bare type names that must be in scope at each expansion site.

## Archival Reminder

Follow `docs/archival-workflow.md` as the canonical process.
```

## tickets/_TEMPLATE.md

```
# <PREFIX-NNN>: <Ticket title>

**Status**: PENDING
**Priority**: <LOW|MEDIUM|HIGH>
**Effort**: <Small|Medium|Large>
**Engine Changes**: <None|Yes — list areas>
**Deps**: <ticket/spec dependencies that currently exist>

## Problem

<What user-facing or architecture problem this solves>

## Assumption Reassessment (<YYYY-MM-DD>)

<!-- Apply all domain-specific precision rules from docs/precision-rules.md -->

1. <Assumption checked against current code/test state, including exact existing focused/unit, runtime trace/integration, and golden/E2E coverage where relevant>
2. <Assumption checked against current specs/docs, with exact file reference>
3. <If this is a mixed-layer or cross-system ticket: name the exact shared abstraction boundary or data contract under audit before implementation>
4. <If a failing golden or mixed-layer scenario motivates this ticket: restate the intended invariant before trusting the scenario narrative>
5. <If this is a planner- or golden-driven ticket: name the live `GoalKind` under test and the exact current operator, affordance, or prerequisite surface the scenario relies on. If reassessment shows the live surface differs from the original narrative, correct the ticket scope here before implementation>
6. <If this is an AI regression: intended layer is candidate generation, runtime `agent_tick`, or golden E2E; if `agent_tick`, state whether local needs-only harness is sufficient or full action registries are required>
7. <If the ticket depends on ordering: name the ordering layer, whether the compared branches are symmetric in the current architecture, and whether the divergence depends on priority class, motive score, suppression/filtering, delayed system resolution, or a mixed-layer combination>
8. <If removing/weakening/bypassing a heuristic or filter: name the exact heuristic, the missing substrate it is standing in for today, whether this ticket adds that substrate, and why the change does not reopen unrelated regressions>
9. <If this is a stale-request, contested-affordance, or start-failure ticket: name the first failure boundary and the exact shared runtime symbols checked during reassessment>
10. <If this is a political office-claim ticket: name the exact closure boundary being asserted (support declaration / visible-vacancy loss / succession resolution / office-holder mutation) and the exact AI-layer + authoritative-layer symbols checked>
11. <If the ticket manipulates ControlSource, queued inputs, driver resets, or other runtime conditions: state whether retained runtime intent can still lawfully continue and which exact runtime/trace symbols prove that>
12. <If a golden scenario isolates one intended branch from lawful competing affordances: name the isolation choice and which unrelated lawful branches were intentionally excluded from setup>
13. <If reassessment exposes adjacent contradictions: classify them as required consequences of this ticket, separate bugs, or future cleanup that must become its own ticket>
14. <Mismatch + correction (if any)>
15. <If the scenario depends on authoritative arithmetic or cumulative state: state the concrete delta/cadence/threshold/capacity math that makes it reachable under current code, plus the survivability or failure envelope when repeated accumulation is material>

## Architecture Check

1. <Why this approach is cleaner/more robust than alternatives>
2. <No backwards-compatibility aliasing/shims introduced>

## Verification Layers

1. <Invariant> -> <decision trace | action trace | event-log delta | authoritative world state | focused unit/runtime test>
2. <Invariant> -> <verification layer>
3. <If this is a stale-request, contested-affordance, or start-failure ticket: map request resolution, authoritative start/abort, and AI recovery to distinct proof surfaces where applicable>
4. <If delayed authoritative effects exist, state why they are not being used as a proxy for earlier action/planning ordering, or justify why that later layer is itself the contract>
5. <If traces prove the outcome but not enough provenance, state the strongest lower-layer proof surface for this ticket and whether a follow-up traceability ticket is required>
6. <If single-layer ticket, state why additional layer mapping is not applicable>

## What to Change

### 1. <Change area>

<Details>

### 2. <Change area>

<Details>

## Files to Touch

- `<path>` (<new|modify>)

## Out of Scope

- <explicit non-goals>

## Acceptance Criteria

### Tests That Must Pass

1. <specific behavior test>
2. <specific behavior test>
3. Existing suite: `<command>`

### Invariants

1. <must-always-hold architectural invariant>
2. <must-always-hold data contract invariant>

## Test Plan

### New/Modified Tests

1. `<path/to/test>` — <short rationale>
2. `<path/to/test>` — <short rationale>
3. `None — documentation-only ticket; verification is command-based and existing runtime coverage is named in Assumption Reassessment.` <use this instead when no tests change>

### Commands

1. `<targeted test command>`
2. `<lint/typecheck/full test command>`
3. `scripts/verify.sh` <or explain why a narrower command is the correct verification boundary>
```

## docs/archival-workflow.md

```
# Archival Workflow

Use this as the canonical, single-source archival policy for tickets, specs, brainstorming docs, and reports.

## Required Steps

1. Edit the document to mark final status at the top:
   - `**Status**: ✅ COMPLETED` or `**Status**: COMPLETED`
   - `**Status**: ❌ REJECTED` or `**Status**: REJECTED`
   - `**Status**: ⏸️ DEFERRED` or `**Status**: DEFERRED`
   - `**Status**: 🚫 NOT IMPLEMENTED` or `**Status**: NOT IMPLEMENTED`
2. For completed items, add an `Outcome` section at the bottom with:
   - completion date
   - what actually changed
   - deviations from original plan
   - verification results
3. If implementation is refined after archival and the archived `Outcome` becomes stale, amend the archived document before merge/finalization so ownership, behavior, and verification facts remain accurate.
   - Add `Outcome amended: YYYY-MM-DD` inside `## Outcome` for each post-completion refinement update.
   - Policy effective date: `2026-03-05` (forward-only enforcement; no mandatory historical backfill before this date).
4. Ensure destination archive directory exists:
   - `archive/tickets/`
   - `archive/specs/`
   - `archive/brainstorming/`
   - `archive/reports/`
5. Move the ticket.
6. If there is a filename collision, pass an explicit non-colliding destination filename.
7. Confirm the original path no longer exists in its source folder (`tickets/`, `specs/`, `brainstorming/`, or `reports/`).
```