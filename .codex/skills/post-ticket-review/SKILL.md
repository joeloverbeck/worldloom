---
name: post-ticket-review
description: "Review a just-finished worldloom ticket, validate that its closeout is truthful against the live repo and `docs/FOUNDATIONS.md`, archive it when ready, and create or update bounded follow-up tickets when the implementation exposes real remaining work."
user-invocable: true
arguments:
  - name: ticket_path
    description: "Optional path to the completed ticket file (for example `tickets/SPEC-01-003.md`). If omitted, use the single unambiguous just-finished ticket from the current session/worktree; otherwise ask for the exact path. Globs or obvious near-matches must be resolved to the exact live path before use."
    required: false
---

# Post-Ticket Review

Review a completed Worldloom ticket against the live repository, fix factual closeout drift, archive it when ready, and capture real follow-up work without importing unrelated cleanup.

Read `AGENTS.md`, `docs/FOUNDATIONS.md`, `tickets/README.md`, `tickets/_TEMPLATE.md`, the target ticket, and `docs/archival-workflow.md` before making changes. If the ticket touches canon-mutating workflows, approval gates, or Mystery Reserve / validation enforcement, also read `docs/HARD-GATE-DISCIPLINE.md`.

**Allowed actions**:
- update the completed ticket's closeout fields when the edits are factual and unambiguous
- archive the reviewed ticket when its handoff is actually complete
- create new tickets in `tickets/`
- update existing active tickets when the completed work makes their current wording stale or their dependency chain wrong

**Forbidden**:
- modifying skills, tools, hooks, validators, or world content as part of the review
- rewriting ticket scope or acceptance criteria except where factual closeout truthing requires it

## Always First

- Resolve the exact live ticket path before trusting ticket wording.
- Snapshot the worktree with `git status --short` and note unrelated dirty paths before review.
- Classify dirty paths into: reviewed-ticket implementation state, review-created edits, and unrelated noise. Only the reviewed-ticket implementation state should drive archival readiness unless another dirty path changes the ticket's factual closeout.
- Treat follow-up tickets created during the review as `review-created edits`. Report them explicitly in the handoff, but do not let their presence block archival unless they prove unfinished owned work inside the reviewed ticket.
- Review the local implementation state as it exists now, committed or not.
- Compare the ticket's closeout against what actually landed, not against the original plan.
- Keep follow-up creation evidence-backed and tightly bounded.

## Workflow

### 1. Resolve the target ticket

1. Use the provided `ticket_path`.
2. If `ticket_path` is omitted, first look for one unambiguous just-finished ticket in the current session/worktree and use that exact live path. If there is no single unambiguous candidate, stop and ask the user for the exact ticket path instead of guessing.
3. If the path is a glob, shorthand, or near-match typo, resolve it to the exact live ticket path before continuing.
4. If the ticket already lives under `archive/tickets/`, review the archived handoff in place rather than recreating it.
5. If the ticket lives under a worktree path, treat that worktree root as the repo root for all reads and writes.
6. Record whether the ticket is tracked or untracked so archival reporting stays truthful.

### 2. Check closeout and archival readiness

1. Read the target ticket and confirm its current status and owned boundary.
2. Confirm the ticket header summary is truthful for the landed state:
   - `Status`
   - summary fields such as `Engine Changes` and `Deps` when reassessment or partial implementation changed the real owned boundary
3. Confirm the ticket's closeout sections truthfully describe what landed:
   - `Assumption Reassessment`
   - `What to Change` / `Files to Touch` when reassessment changed scope
   - `Acceptance Criteria` / `Test Plan` when the real proof surface changed
   - `## Outcome`
   - `## Verification Result`
   - optional `## Deviations`
4. Fix factual, unambiguous handoff drift directly in the ticket.
5. If in-scope deliverables are still missing, stop and report archival as blocked. Do not hide unfinished owned work inside a follow-up ticket.
6. If the ticket is already archived, validate the archived handoff content instead of reopening it.
7. Archive only when the handoff is actually complete. Follow `docs/archival-workflow.md` exactly.
8. After archival, confirm the original active ticket path no longer exists and record whether the move appeared as a tracked rename or an untracked archive file created from an untracked source.

### 3. Establish the review surface

Review the real local implementation state, not an idealized committed state.

Start with:
- the completed ticket
- the files it actually touched
- directly relevant docs, templates, skills, hooks, tools, or validators named by the ticket
- the verification commands or review surfaces used for closeout

Broaden only when the implementation crosses an important shared boundary:
- shared ticket or output schema
- cross-skill contract
- canon-mutating workflow boundary
- HARD-GATE / approval / validation enforcement surface
- archival or dependency-chain handoff

### 4. Audit against FOUNDATIONS and repo contracts

Assess whether the completed work:
- aligns with `docs/FOUNDATIONS.md`
- preserves the repo rules in `AGENTS.md`
- leaves the touched workflow or contract surface clean, robust, and extensible

Look for:
- direct FOUNDATIONS contradictions
- weakened hard gates or canon-mutation discipline
- duplicate or competing information paths
- stale ticket or schema handoff
- fragile verification that does not actually prove the owned invariant
- adjacent roadmap drift exposed by the implementation

Separate findings into:
- problems solved
- residual concerns
- newly exposed concerns

### 5. Decide whether follow-up work is warranted

Create or update follow-up tickets only when the concern is concrete, evidenced, and materially improves FOUNDATIONS alignment, workflow integrity, traceability, schema cleanliness, or dependency accuracy.

Do not create tickets for:
- vague stylistic preferences
- speculative cleanup
- work already fully owned by an active ticket

Decision rule:
- if an active ticket already owns the concern, cite it and do not duplicate
- if an active ticket partially owns it but is now stale, update that ticket factually
- if no active ticket owns it, create one bounded follow-up ticket
- if the reviewed ticket's owned invariant is complete but a broader shared proof surface is stale because adjacent family work changed the contract, archive the reviewed ticket and create a separate bounded follow-up instead of treating the stale proof lane as unfinished owned work
- if downstream tickets depend on a user-owned commit, release, manual approval, or other post-review gate that the reviewed ticket intentionally did not perform, update those dependency chains to name both the archived/completed ticket state and the remaining user-owned gate

Before creating a new ticket:
1. inspect adjacent active tickets in the same family
2. inspect nearby active specs or plans only if the completed ticket changed their live assumptions unambiguously
3. confirm the concern is not already owned elsewhere
4. if the concern is a regression in a shared proof surface or family-wide workflow lane, archived sibling tickets may be inspected as evidence that the surface previously worked or previously carried a different truthful status

### 6. Author follow-up tickets

When a new ticket is warranted:
1. Create it from `tickets/_TEMPLATE.md` and follow `tickets/README.md`.
2. Reassess the concern against the live repo before finalizing the draft.
3. Name exact files, skills, schemas, docs, validators, hooks, or workflow boundaries.
4. Keep the ticket to one coherent concern.
5. Set `Deps` only for real blockers or strong sequencing dependencies.

Create high-confidence tickets directly. If scope or dependency ordering is genuinely ambiguous, use the 1-3-1 rule instead of guessing.

### 7. Present the report

Use this structure. In `Verification And Handoff`, use severity-shaped entries only when a real handoff gap remains; if verification is clean, concise evidence bullets are acceptable.

```markdown
# Post-Ticket Review: <ticket-id>

**Ticket**: <path>
**Review date**: YYYY-MM-DD
**Implementation state reviewed**: <working tree / index / committed summary, including tracked vs untracked ticket state when relevant>

## Archival Status

- <archived / already archived / blocked>
- <Outcome and verification closeout check result>
- <validated unchanged / factually corrected>
- <any ticket updates made before archival>

## What This Ticket Solved

- <completed concerns>

## FOUNDATIONS And Contract Alignment

- <aligned summary or concrete findings with file references>

## Review Findings

### Residual Concerns

1. **[SEVERITY]** <title>
   - **Evidence**: <ticket / doc / skill / tool / validator evidence>
   - **Why it matters**: <contract, robustness, or workflow impact>
   - **Recommended follow-up**: <ticket id or no new ticket needed>

### Newly Exposed Concerns

1. **[SEVERITY]** <title>
   - **Evidence**: <ticket / doc / skill / tool / validator evidence>
   - **Why it matters**: <architectural impact>
   - **Recommended follow-up**: <ticket id or planned action>

## Verification And Handoff

1. **[SEVERITY]** <title>
   - **Evidence**: <verification surface or handoff evidence>
   - **Gap**: <what remains weak or confirm no gap>
   - **Follow-up**: <ticket id or no ticket needed>

Or, when there is no remaining gap:

- <verification or handoff evidence confirmed>

## Ticket Actions

- **Created**: <ticket ids with one-line rationale and deps>
- **Updated**: <ticket ids with one-line rationale>
- **Covered by existing tickets**: <ticket ids and why no new ticket was created>

## 1-3-1 Decisions

- <only include when used>

## Summary

**Result**: <ticket archived / archival blocked / already archived>
**Follow-up**: <N new tickets, N updated tickets, N covered by existing tickets>
```

If no follow-up tickets are warranted, still report the reviewed surfaces and state that no new ticket was needed.

## Guardrails

- `docs/FOUNDATIONS.md` wins over stale ticket prose, planning drift, and convenience.
- Do not modify skills, tools, validators, hooks, or world content during post-ticket review.
- Only change the completed ticket where closeout truthing or archival mechanics require it.
- Every finding must cite concrete ticket, doc, skill, tool, validator, or grep evidence.
- Do not let post-ticket review weaken hard gates, canon discipline, or Mystery Reserve protections.
- When archival readiness or ticket ownership is genuinely ambiguous, use the 1-3-1 rule instead of improvising.

## Example Usage

```text
/post-ticket-review tickets/SPEC-01-003.md
/post-ticket-review tickets/SPEC-01-00*
/post-ticket-review .claude/worktrees/my-branch/tickets/SPEC-04-002.md
```
