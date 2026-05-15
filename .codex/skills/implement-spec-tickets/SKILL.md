---
name: implement-spec-tickets
description: "Run the standard Worldloom implementation loop for a spec: repeatedly select the next active ticket, invoke implement-ticket with the originating spec as authority, apply implement-ticket audit suggestions, post-review completed tickets, apply post-ticket-review audit suggestions when review creates follow-up work, commit each iteration, continue through follow-up tickets first, archive the originating spec, then create and push a final branch."
user-invocable: true
arguments:
  - name: spec_path
    description: "Path or glob for the originating spec in specs/ that the ticket family implements."
    required: true
  - name: ticket_path
    description: "Optional first ticket path or glob. If omitted, choose the first active tickets/*.md entry that belongs to the originating spec family."
    required: false
---

# Implement Spec Tickets

Run the full Worldloom ticket-family loop without making the user manually reissue the same skill commands.

This is an orchestration skill. Do not reimplement `implement-ticket`, `skill-audit`, or `post-ticket-review` inside this skill. Load and obey those skills at the moment each phase calls for them, and let their narrower guardrails control the phase they own.

Prefer a fresh context boundary between ticket iterations. The manual workflow uses `/new` for a reason: each ticket should start from the live repo, current spec, current ticket, and current child-skill guidance rather than from assumptions accumulated during the previous ticket. The harness may run several phases for one ticket in one context, but after an iteration commit it must write a repo-local state file, print a compact handoff summary, and request/perform context compaction or a fresh-session restart when the Codex surface supports it.

The persisted state file is the source of truth for resuming after `/new`; the printed handoff is only a readable mirror.

## Required Reads

Before the first loop iteration, read:

- `AGENTS.md`
- `docs/FOUNDATIONS.md`
- `docs/archival-workflow.md`
- `tickets/README.md`
- `tickets/_TEMPLATE.md`
- `.codex/skills/implement-ticket/SKILL.md`
- `.codex/skills/skill-audit/SKILL.md`
- `.codex/skills/post-ticket-review/SKILL.md`
- the resolved originating spec

When a phase invokes one of the child skills, read any focused references that child skill requires. Do not rely on this harness as a substitute for those reads.

## State File

Use `.codex/run-state/implement-spec-tickets.json` as the harness state file. Create `.codex/run-state/` if needed.

Keep the file small and machine-readable. Update it after intake, after every iteration commit, after blockers, and after final spec archival. A useful shape is:

```json
{
  "originating_spec": "specs/SPEC-31-example.md",
  "archived_spec": null,
  "last_ticket": "tickets/SPEC31EXAMPLE-001.md",
  "last_result": "completed_archived",
  "last_work_commit": "abc1234",
  "last_state_commit": "def5678",
  "next_target": "tickets/SPEC31EXAMPLE-002.md",
  "queue": [
    "tickets/SPEC31EXAMPLE-002.md"
  ],
  "blocked": false,
  "blocker": null,
  "dirty_state": "clean",
  "updated_at": "YYYY-MM-DD"
}
```

On resume after `/new`, read this state file first, then verify every important field against live repo state before continuing:

- `originating_spec` still exists unless `archived_spec` is set
- `next_target` exists and is still active, unless the next action is final spec archival
- queued ticket paths still exist and still belong to the originating spec family
- `last_work_commit` is reachable from `HEAD`
- `last_state_commit` is either `null` / `"none"`, `"self"`, or reachable from `HEAD`
- `git status --short` matches or safely supersedes `dirty_state`

If the state file conflicts with the live repo, trust the live repo and patch the state file before continuing. If the conflict changes the next target or archival readiness, state that explicitly before invoking a child skill.

`last_work_commit` means the commit that contains the ticket implementation, review/archive move, follow-up creation, and any applied child-skill hardening for the iteration. `last_state_commit` identifies how the state update was persisted: the same sha as `last_work_commit` when amended into that commit, `"self"` when committed separately as a state-file-only commit, or `"none"` when intentionally left uncommitted. Do not overload one field for both meanings. When `last_state_commit` is `"self"`, the printed handoff must report the actual state-only commit sha. On resume, validate `"self"` by checking the state file's containing commit or latest state-only commit in `git log`, not by expecting the JSON value to contain its own sha.

## Intake

1. Resolve `spec_path` to exactly one live file under `specs/`. If it is missing, ambiguous, or already archived, stop and ask for the exact active spec path.
2. Snapshot the worktree with `git status --short`.
3. Classify pre-existing dirty paths before doing any work:
   - ticket/spec family state for the active run
   - existing user work that the run must not absorb silently
   - unrelated noise
4. If `.codex/run-state/implement-spec-tickets.json` already exists, read and validate it even on a normal first invocation. If it conflicts with live repo state, trust the live repo and refresh the state file before invoking child skills.
5. If unrelated dirty paths exist and the invocation expects this harness to stage and commit all uncommitted files, stop and ask whether those paths should be included in the harness commits. Do not silently commit unrelated user work.
6. Resolve the first ticket:
   - if `ticket_path` is supplied, resolve it to exactly one active ticket under `tickets/`
   - otherwise inspect active `tickets/*.md`, choose the first ticket in lexical order whose filename, `Deps`, problem statement, or explicit spec reference ties it to the originating spec, and state the selection
7. Build the initial pending queue from active tickets that clearly belong to the same originating spec family. Keep the queue lexical and append-only; do not jump ahead of a follow-up created by the current iteration.
8. Write or refresh `.codex/run-state/implement-spec-tickets.json` with the resolved spec, initial target, initial queue, dirty-state classification, and `blocked: false`.

## Loop

Repeat until there is no active ticket left in the queue and no newly created follow-up ticket takes priority.

### 1. Implement The Target Ticket

Invoke the implementation phase as if the user had said:

```text
$implement-ticket <ticket> . Rely on <originating-spec>
```

Use the live `implement-ticket` skill exactly. The child skill owns reassessment, implementation, proof, closeout wording, and any decision to create a follow-up ticket needed for an honest closeout.

If implementation ends blocked:

- if a concrete follow-up ticket was created or named as the next owner, put that follow-up at the front of the queue and continue the loop
- if no follow-up exists, stop the harness and report the blocker, current ticket, proof gap, and next required action

### 2. Audit And Apply Implement-Ticket Suggestions

Run the audit phase as if the user had said:

```text
$skill-audit .codex/skills/implement-ticket
```

Then apply every audit suggestion that is specific, evidence-backed, and compatible with `AGENTS.md` and `docs/FOUNDATIONS.md`. This harness is the user's explicit authorization to implement those suggestions; do not wait for a separate "Implement suggestions" prompt.

Reject or defer only suggestions that are clearly wrong, speculative, duplicate already-live guidance, or would weaken Worldloom's hard gates, canon discipline, or ticket truthing.

Before applying or rejecting suggestions, print a compact visible audit result for the child-skill phase:

```text
Child skill audit:
- Target skill: .codex/skills/implement-ticket
- Findings: <N issues, N improvements, N features>
- Apply: <specific suggestions to patch, or "none">
- Reject/defer: <specific suggestions and reason, or "none">
```

If the audit has no findings or no applicable suggestions, still print the block with `Apply: none` and continue.

After editing the skill, rerun a focused hygiene check over changed skill files, usually `git diff --check -- .codex/skills/implement-ticket`.

### 3. Review Completed Tickets

If the target ticket is marked `COMPLETED`, run the review phase as if the user had said:

```text
$post-ticket-review <completed-ticket>
```

Use the live `post-ticket-review` skill exactly. The child skill owns closeout truthing, archival, dependency/path repairs, and follow-up ticket creation.

After the review phase, print a compact visible review result:

```text
Post-ticket review:
- Target ticket: <ticket path or archived path>
- Archival status: <archived | already archived | blocked>
- Closeout truthing: <validated unchanged | factually corrected | blocked>
- Reference sweep: <paths repaired or "no stale active-path refs found">
- Follow-ups: <created/updated ticket paths or "none">
- Verification: <rerun proof command/result or why rerun was not needed>
```

If `post-ticket-review` blocks archival because same-seam work remains, put the active ticket back at the front of the queue and continue through `implement-ticket` unless the review says a user decision is required. Do not archive a blocked ticket.

### 4. Audit Post-Ticket Review When It Changes Handoff Surfaces

If `post-ticket-review` creates or materially updates a follow-up ticket, active spec, active ticket dependency, or current contract doc, run:

```text
$skill-audit .codex/skills/post-ticket-review
```

Apply every sound, evidence-backed suggestion under the same rules as the `implement-ticket` audit. Rerun focused hygiene over changed post-review skill files.

Before applying or rejecting suggestions, print the same compact visible child-audit result block for `.codex/skills/post-ticket-review`, even when there are no findings or no applicable suggestions.

Put any review-created follow-up ticket at the front of the queue, ahead of the original lexical next ticket. If review only truthed a spec, ticket dependency, or current contract doc and created no follow-up, keep the existing queue order.

### 5. Commit The Iteration

Before committing:

1. Refresh `git status --short`.
2. Verify all dirty paths are either owned by this iteration, previously approved for inclusion, or generated/ignored artifacts that should remain unstaged.
3. Run `git diff --check` or the child skills' stronger equivalent over tracked and newly created owned files.
4. Stage only approved owned paths plus any pre-existing dirty paths the user explicitly allowed this harness to include.
5. Commit with a message that names the ticket id and whether the iteration included implementation, review/archive, follow-up creation, and skill hardening.

When `post-ticket-review` archived a ticket with `git mv`, do not try to stage the now-missing active ticket path by name. Stage the archive destination and other edited owned paths, then confirm the source deletion or rename is staged with `git diff --cached --name-status` before committing.

If nothing changed after an iteration, do not create an empty commit. Record that there was no commit for that iteration and why.

### 6. Persist State And Prepare Context Reset

After each iteration work commit, update `.codex/run-state/implement-spec-tickets.json` before context compaction or a fresh-session restart. Include:

- originating spec path or archived spec path
- last ticket processed and result
- `last_work_commit`: the ticket iteration work commit sha, or `"none"` if no work commit was created
- `last_state_commit`: `"self"` when the state update is committed separately as a state-file-only commit, the same sha as `last_work_commit` when amended into the work commit, or `"none"` when the state file remains intentionally uncommitted
- next target, or `"final_spec_archive"` / `"blocked"`
- remaining queue
- blocker summary when blocked
- dirty-state classification
- `updated_at`

Normalize `dirty_state` after committing owned paths: refresh `git status --short` and record only remaining uncommitted paths. When package/tool commands ran, or prior state already names ignored artifacts, also refresh package-scoped ignored-aware status such as `git status --short --ignored <affected-package-dirs>` before writing `dirty_state`. Classify remaining paths as `unrelated dirty`, `expected ignored artifacts`, or `blocked owned leftovers`. Do not leave stale phrases such as `owned ticket-family edits` after those owned edits have already been committed. If blocked owned leftovers remain, set `next_target: "blocked"` and describe the blocker.

If the state file itself changes after the work commit, either:

- amend it into the work commit before reporting the sha, then set `last_work_commit` and `last_state_commit` to that amended commit sha; or
- commit it separately as a harness-state commit, then set `last_work_commit` to the implementation/archive commit and `last_state_commit` to `"self"`. Report the actual state-only commit sha in the handoff after the commit succeeds.

Do not create a chain of state-only commits just to update the previous state-only commit sha. A commit cannot embed its own final sha without changing that sha again, so do not try to make `last_state_commit` self-referential. One state-only commit per iteration is enough; if exact current `HEAD` matters, use the handoff's `State commit` line.

Then print a short handoff in the conversation that mirrors the state file:

```text
Harness handoff:
- Originating spec: <active or archived path>
- Last ticket processed: <ticket id and result>
- Work commit: <sha or "none">
- State commit: <sha or "none" | same as work commit>
- Next target: <follow-up ticket path | next queued ticket path | final spec archive | blocked>
- Queue: <remaining active ticket paths>
- Dirty state: <clean | expected ignored artifacts | owned/unrelated paths still present>
- State file: .codex/run-state/implement-spec-tickets.json
- Required next invocation: $implement-spec-tickets <spec> <next-target-if-any>
```

Then prefer one of these reset paths:

- If Codex exposes context compaction or the user can issue `/new`, request it before starting the next ticket.
- If compaction is unavailable but the context is still small and the next target is an immediate follow-up from the just-finished ticket, continuing in the same context is acceptable.
- If the context is large, proof output was noisy, or the next queued ticket is not a direct same-seam follow-up, stop after the handoff instead of starting the next ticket in a saturated context.

The next session must reload this skill and the child skills from disk, then resume from the state file and live repo state. Do not rely on remembered queue state without rechecking active `tickets/*.md` and `git status --short`.

## Queue And Follow-Up Rules

- A follow-up ticket created by `implement-ticket` or `post-ticket-review` is always the next target.
- If multiple follow-ups are created in one iteration, choose the one explicitly identified as the next owner. If none is identified, choose the lowest lexical path and record the ordering.
- Do not skip active tickets in the originating spec family unless their `Deps`, status, or review result proves they are no longer valid next work.
- If a sibling ticket is absorbed into the current ticket, update the queue after the child skill has made that sibling truthful.
- If a ticket is archived, remove its old active path from the queue and replace dependency references according to `post-ticket-review`.

## Final Spec Archive

When all originating-spec tickets are completed, reviewed, archived, and committed:

1. Re-read the originating spec.
2. Confirm no active `tickets/*.md` still names the spec as active implementation work.
3. Update the spec status and `## Outcome` according to `docs/archival-workflow.md`.
4. Move the spec to `archive/specs/`, preferring `git mv` when tracked and plain `mv` when untracked.
5. Confirm the original `specs/` path no longer exists.
6. Sweep active tickets, docs, and specs for stale active-spec path references. Repair actionable references to the archived path; leave historical references only when clearly harmless.
7. Run hygiene over the spec archive move and reference repairs.
8. Commit the spec archive as its own finalization commit unless it is already included in the last ticket-family commit for a clear reason.
9. Update `.codex/run-state/implement-spec-tickets.json` with `archived_spec`, `next_target: null`, an empty queue, `blocked: false`, the final commit sha, and clean dirty-state classification.

## Branch And Push

After the final archive commit:

1. Refresh `git status --short`. Stop if uncommitted owned changes remain.
2. Create a new branch from the current HEAD with a concise family name derived from the spec id or filename, for example `spec-31-story-contract-hardening`.
3. Push the new branch to the configured remote.
4. Report the branch name, pushed remote, commits created by the harness, archived spec path, archived ticket paths, and any follow-up tickets left active.

Do not create or push a branch if the implementation loop stopped blocked or if the worktree still contains unapproved dirty paths.

After a successful push, either leave the final state file as a durable run record or remove it in a final housekeeping commit only if the user wants ephemeral harness state excluded from the branch. Do not delete it silently if it is the only record of the harness queue and decisions.

## Hard Stops

- `docs/FOUNDATIONS.md` wins over spec prose, ticket prose, and this harness.
- Do not bypass `implement-ticket`, `skill-audit`, or `post-ticket-review` guardrails.
- Do not commit unrelated pre-existing dirty paths unless the user explicitly approves their inclusion.
- Do not treat a blocked ticket as completed just to let the loop continue.
- Do not archive the originating spec while any active ticket still owns required work for it.
- Do not push a branch with uncommitted owned changes or unresolved blockers.
- Do not start a new non-follow-up ticket in a context that is already carrying substantial implementation, proof, review, or audit history from a previous ticket; write the handoff and reset first.
- Do not use the printed handoff as the only resume record. Persist or refresh `.codex/run-state/implement-spec-tickets.json` before asking for `/new`.

## Final Report

End with:

- originating spec path and archived path, if archived
- tickets implemented, blocked, archived, or left active
- follow-up retargeting decisions
- skill audit suggestions applied or rejected
- commits created
- final branch and push result, if reached
- verification commands or review surfaces that proved the final state
- final state-file status
