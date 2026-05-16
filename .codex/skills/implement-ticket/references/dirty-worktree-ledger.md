# Dirty Worktree Ledger

Use this reference whenever the implementation ticket runs in a dirty worktree or package commands may create ignored artifacts.

## Ledger Categories

Maintain a compact ledger with these categories:

- `pre-existing unrelated`: dirty paths present in the initial snapshot and outside the ticket seam.
- `pre-existing same-seam`: dirty paths present in the initial snapshot that overlap the active ticket, sibling-ticket family, or shared contract.
- `pre-existing untracked same-seam`: untracked paths present in the initial snapshot that overlap the active ticket, sibling-ticket family, or shared contract.
- `owned edits`: tracked paths intentionally changed for the active ticket.
- `new/untracked owned files`: untracked files intentionally created for the active ticket.
- `externally appeared unrelated`: paths that were clean at the initial snapshot but appear dirty later outside the active ticket seam.
- `expected ignored artifacts`: ignored build/test/generated artifacts expected from verification commands.

Refresh the ledger before final response using both `git status --short` and any package/world ignored-aware status needed for the ticket. Do not rely on `git diff --name-only` alone; untracked ticket files and generated ignored artifacts can be invisible there.

When the worktree has unrelated dirt, use full `git status --short` for ownership discovery, then use path-scoped `git diff -- <owned paths>` and `git diff --stat -- <owned paths>` for the active ticket's change summary once owned paths are known. Keep unrelated dirty paths in the ledger, but do not let broad diff/stat output inflate the active ticket's file list.

If `git status --short` collapses an untracked directory that overlaps the active ticket, spec family, or shared contract, expand it to exact paths before closeout. Use `git status --short --untracked-files=all <dir>` or `rg --files <dir>` to distinguish the active ticket file from sibling tickets/specs that were only read, then classify each path separately in the ledger.

## Final Response Template

Use a compact ledger in the final response when the worktree was dirty or ignored artifacts matter:

- `Pre-existing unrelated`: `<paths>`; left untouched.
- `Pre-existing same-seam`: `<paths>`; ticket-owned hunks were `<summary>`.
- `Pre-existing untracked same-seam`: `<paths>`; this run changed `<summary>`.
- `Owned edits`: `<paths>`.
- `New/untracked owned files`: `<paths>`.
- `Externally appeared unrelated`: `<paths>`; left untouched.
- `Expected ignored artifacts`: `<paths>`; produced or refreshed by `<command>`.

Omit categories that are empty. For same-file or same-seam paths, describe ownership by hunk or topic rather than claiming the whole file.

## Initial Overlap Check

If dirty paths overlap the active ticket seam, inspect their diffs before coding and classify them as:

- unrelated local edits
- partial implementation of the active ticket
- in-flight sibling-ticket work

If the overlap belongs to an in-flight sibling ticket, narrow, widen, or rewrite the active ticket boundary before code edits instead of treating the seam as clean ownership.

When a file is already dirty before the run and the active ticket also needs to edit that same file, record final ownership at hunk or topic level in the ticket closeout or final response. Distinguish the ticket-owned hunks from pre-existing same-file edits instead of describing the whole file as owned or unrelated.

When a same-seam file lives under a path that was already untracked at initial snapshot, normal `git diff` and path-specific tracked diffs will not show its content. Re-read the file directly, or use an explicit no-index/status-aware inspection, before and after editing. Classify the path as `pre-existing untracked same-seam` and distinguish the active ticket's hunks from the pre-existing untracked directory or sibling-ticket work; do not describe the whole untracked directory as newly created by the active ticket unless this run created it.

If the active ticket edits an already-untracked skill directory, ticket file, template, or same-seam docs path, carry that classification through to closeout instead of collapsing it into `new/untracked owned files`. Final wording should name the path as `pre-existing untracked same-seam` and summarize only the hunks or topics changed by the active ticket.

When the active ticket file itself was already untracked at the initial snapshot, do not rely on `git diff`, `git diff --stat`, or path-specific tracked diffs to verify closeout content. Use direct file reads plus `git status --short` to confirm the ticket remains present, updated, and correctly classified as `pre-existing untracked same-seam`.

## Mid-Run Changes

If a path that was clean at the initial snapshot becomes dirty later, inspect it before closeout.

MCP connector discovery, tool approval, or local session configuration can create or modify files such as `.codex/config.toml` while a ticket is in progress. Treat that as `externally appeared unrelated` unless the active ticket explicitly owns Codex/MCP configuration. Do not include those changes in the ticket file set; remove only the incidental hunks you created yourself, and never revert user-authored config changes.

If instruction-source files such as `AGENTS.md`, `CLAUDE.md`, or active `.codex/skills/` / `.claude/skills/` files become dirty after the initial snapshot, classify ownership normally and also decide whether the changed guidance affects the active run before final response. If it is unrelated, leave it out of the ticket file set but name it as externally appeared instruction-source dirt when reporting the ledger.

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

When same-family tickets, specs, reports, or triage files are untracked, compare the initial and final exact path lists before closeout. Classify paths that appear only at the end as `externally appeared same-family` or as `pre-existing collapsed directory contents` when the initial status collapsed a whole untracked directory. Do this before final wording so newly visible sibling tickets are not accidentally described as active-ticket owned work.

## Ignored Artifacts

For package/tool tickets, run an ignored-aware targeted status check for affected package directories before the first package command likely to create ignored artifacts and again before final response. Classify `node_modules/`, `dist/`, coverage output, caches, compiled tests, secret files, and rebuilt indexes as pre-existing, expected generated artifacts, cleaned state, or unexpected fallout.

When a ticket names an ignored generated artifact in `Files to Touch`, such as `tools/<package>/dist/...`, prove freshness by direct read, grep, or another artifact-specific check after the producer command. Classify the containing ignored path as an `expected ignored artifact`, not a tracked owned edit, and make the final ledger distinguish the tracked source/ticket edits from the refreshed ignored output.

When the tracked worktree is otherwise clean for the active ticket but the affected package already has ignored artifacts, keep the final wording explicit about provenance and refresh behavior. Example: `Pre-existing ignored package artifacts: tools/world-mcp/.secret, tools/world-mcp/node_modules/; expected ignored generated artifact: tools/world-mcp/dist/ refreshed by npm run build / npm test; left in place.`
