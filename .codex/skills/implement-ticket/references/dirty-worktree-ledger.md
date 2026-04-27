# Dirty Worktree Ledger

Use this reference whenever the implementation ticket runs in a dirty worktree or package commands may create ignored artifacts.

## Ledger Categories

Maintain a compact ledger with these categories:

- `pre-existing unrelated`: dirty paths present in the initial snapshot and outside the ticket seam.
- `pre-existing same-seam`: dirty paths present in the initial snapshot that overlap the active ticket, sibling-ticket family, or shared contract.
- `owned edits`: tracked paths intentionally changed for the active ticket.
- `new/untracked owned files`: untracked files intentionally created for the active ticket.
- `externally appeared unrelated`: paths that were clean at the initial snapshot but appear dirty later outside the active ticket seam.
- `expected ignored artifacts`: ignored build/test/generated artifacts expected from verification commands.

Refresh the ledger before final response using both `git status --short` and any package/world ignored-aware status needed for the ticket. Do not rely on `git diff --name-only` alone; untracked ticket files and generated ignored artifacts can be invisible there.

## Initial Overlap Check

If dirty paths overlap the active ticket seam, inspect their diffs before coding and classify them as:

- unrelated local edits
- partial implementation of the active ticket
- in-flight sibling-ticket work

If the overlap belongs to an in-flight sibling ticket, narrow, widen, or rewrite the active ticket boundary before code edits instead of treating the seam as clean ownership.

## Mid-Run Changes

If a path that was clean at the initial snapshot becomes dirty later, inspect it before closeout.

When mid-run dirt appears in a file you also touched, classify at hunk level:

- `owned edits`: hunks required by the active ticket
- `externally appeared unrelated`: hunks outside the active ticket seam
- `sibling-ticket scope`: hunks that match an active sibling ticket or same-family follow-up

Do not revert externally appeared or sibling-scope hunks unless the user explicitly asks. Work around them, and record the classification in the ticket closeout or final response when it affects the proof story.

## Same-Family Sibling Check

When externally appeared edits or untracked files share a ticket prefix, numbered family, package, skill, or spec seam with the active ticket:

1. Inspect sibling ticket titles and scope only far enough to identify likely ownership.
2. Record whether the active ticket absorbed, excluded, or merely coexisted with that sibling scope.
3. If sibling-scope edits affect files you touched, state the boundary in `Assumption Reassessment`, `## Deviations`, or the final dirty-worktree ledger.

Do not silently attribute same-family sibling work to the active ticket just because it appeared during the run.

## Ignored Artifacts

For package/tool tickets, run an ignored-aware targeted status check for affected package directories before the first package command likely to create ignored artifacts and again before final response. Classify `node_modules/`, `dist/`, coverage output, caches, compiled tests, secret files, and rebuilt indexes as pre-existing, expected generated artifacts, cleaned state, or unexpected fallout.
