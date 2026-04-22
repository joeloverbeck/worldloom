---
name: implement-ticket
description: "Implement or reassess a worldloom ticket. Use when asked to work from a ticket in `tickets/`, `archive/tickets/`, or a worktree ticket path: read the ticket, validate its assumptions against the live repo and `docs/FOUNDATIONS.md`, correct mismatches before coding, implement the owned change, verify it at the right boundary, and close out the ticket honestly."
user-invocable: true
arguments:
  - name: ticket_path
    description: "Path to the ticket file (for example `tickets/SPEC-01-004.md`). Globs or obvious near-matches must be resolved to the exact live path before use."
    required: true
---

# Implement Ticket

Implement a worldloom ticket against the live repository, not against stale assumptions.

Read `AGENTS.md`, `docs/FOUNDATIONS.md`, the target ticket, `tickets/_TEMPLATE.md`, and `tickets/README.md` before editing. Read `docs/archival-workflow.md` before archiving or when the ticket mentions archival. If the ticket touches a skill HARD-GATE, canon-write ordering, or Mystery Reserve firewall behavior, also read `docs/HARD-GATE-DISCIPLINE.md` before finalizing reassessment.

Reassess first, then implement. Do not treat the ticket as mechanically executable until its assumptions match the current repo.

## Always First

- Resolve the exact live ticket path before trusting ticket wording.
- Snapshot the worktree with `git status --short` and classify unrelated dirty paths before coding.
- Read the current ticket contract from `tickets/_TEMPLATE.md` and `tickets/README.md`; do not rely on memory.
- Prefer the strongest truthful verification surface available for the ticket's owned invariant.
- Update the ticket itself when reassessment changes scope, ownership, commands, or acceptance text.
- Archive only when the user explicitly asks for full ticket completion or archival.

## Workflow

### 0. Classify the ticket shape

Load `references/ticket-classification.md`.

Classify the ticket before coding:

- `docs-only / contract-truthing`
- `skill rewrite or skill-local behavior`
- `tool or script implementation`
- `cross-skill or cross-artifact contract`
- `schema or template extension`
- `archive / rejection / no-op validation`

Use the classification to choose which repo surfaces must be read and which verification layers are required.

If one primary class also changes a real shared contract, keep the primary classification but also apply the consumer and verification checks from `cross-skill or cross-artifact contract`.

### 1. Load the ticket context

1. Read the target ticket file.
2. Read every directly relevant reference it names: spec files, docs, skill files, tool files, templates, examples, or archived tickets/specs.
3. Read any explicit user-supplied reference paths from the invocation, even if the ticket itself does not name them.
4. If the invocation uses a glob, shorthand, or near-match typo, resolve the first exact live ticket path before doing anything else.
5. If the ticket belongs to a numbered family, inspect sibling tickets only far enough to confirm current ownership boundaries.
6. Check whether the active ticket is tracked or untracked; keep that in mind during closeout.
7. Snapshot the worktree with `git status --short` before coding and keep unrelated paths out of ticket fallout unless the ticket truly owns them.
8. If the ticket lives under a worktree path, treat that worktree root as the repo root for all reads and writes.

### 2. Reassess assumptions before coding

Validate the ticket against the live repo, not against the spec draft alone.

Check:

- every path in `Deps`, `Files to Touch`, `Verification Layers`, `Test Plan`, and prose references
- every skill, tool, hook, validator, schema, or doc section named by the ticket
- every drafted algorithm, tree-shape, parser-behavior, or data-flow claim the ticket relies on; verify these against the live substrate instead of trusting spec prose
- every FOUNDATIONS claim or rule reference the ticket relies on
- whether a claimed schema authority is actually split across `docs/FOUNDATIONS.md`, live skill templates, and spec/docs; if so, inspect the producer templates and record the true authority boundary in `Assumption Reassessment` before coding
- for staged tool/schema tickets, every drafted enum member, union variant, persisted row field, and emitted artifact named by the ticket; verify each against the live type/module authority before trusting storage or emission claims
- whether the ticket's owned boundary is still real, already landed, narrower than drafted, or blocked by another ticket

Load `references/mismatch-handling.md`.

Low-risk factual drift should be corrected directly in the ticket during reassessment. Architectural ambiguity, scope growth, or contradictory ownership requires a short 1-3-1 escalation to the user.

### 3. Extract the real implementation slice

Before editing code or docs, name the actual owned delta:

- what changed in the live repo
- what still needs to change
- what the ticket no longer owns
- what follow-up ticket or spec owns adjacent remaining work, if any

For shared schemas, templates, or cross-skill contracts, inspect consumers before assuming the change is local.

For skill tickets, verify:

- `SKILL.md` trigger text still matches the skill's real purpose
- required reads and prerequisites are truthful
- HARD-GATE behavior still matches repo policy
- bundled references/templates/examples remain aligned with the behavior you are changing

### 4. Implement with minimal, truthful edits

- Keep changes surgical and aligned with the ticket's owned boundary.
- Prefer existing repo contracts over ad hoc patterns.
- Do not broaden into unrelated cleanup unless reassessment proves it is required consequence fallout.
- After package-manager, lockfile, formatter, generator, or codegen commands, re-read the touched contract files and confirm the generated diff still satisfies ticket invariants before closeout.
- If the ticket touches world-level canon-writing workflows, preserve append-only canon discipline and documented gates.
- If the ticket only changes docs, tickets, or skills, do not invent runtime/tool changes just to satisfy the original draft.

### 5. Verify at the right boundary

Load `references/verification-closeout.md`.

Run the narrowest correct verification first, then broaden as needed.

Worldloom verification surfaces usually include:

- codebase grep-proof
- schema validation
- skill dry-run
- targeted tool command
- manual review of generated output
- FOUNDATIONS alignment check

Pick the surface that actually proves the owned invariant. A command that merely touches the area does not count as proof.

### 6. Close out the ticket honestly

Update the active ticket before finishing:

- `Status`
- `Assumption Reassessment`
- `What to Change` / `Files to Touch` if reassessment changed scope
- `Acceptance Criteria` / `Test Plan` if the real proof surface changed
- `## Outcome`
- `## Verification Result`
- optional `## Deviations`
- after the final verification rerun, re-read the entire ticket top-to-bottom so earlier authored sections such as `What to Change`, `Architecture Check`, `Acceptance Criteria`, and `Invariants` do not still contain stale pre-reassessment wording

If the ticket's premise was disproved, keep it as a truthful rejection or not-implemented record instead of forcing a fake completion.

If archival is in scope, follow `docs/archival-workflow.md` exactly and update any roadmap/spec references that still point at the active ticket path.

## Guardrails

- `docs/FOUNDATIONS.md` wins over ticket prose, spec drift, and convenience.
- Never bypass a documented hard gate or canon-mutation approval checkpoint.
- Never silently retcon canon or overwrite world content as a shortcut.
- Never leave the ticket text stale after reassessment changed the real boundary.
- Never claim verification you did not actually run.
- Never archive by default; archival requires explicit user intent.
- For implementation-only requests, finish with the active ticket updated in place.

## Example Usage

```text
/implement-ticket tickets/SPEC-01-004.md
/implement-ticket tickets/SPEC-01-00*
/implement-ticket .claude/worktrees/my-branch/tickets/SPEC-04-002.md
```
