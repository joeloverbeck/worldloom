# Verification And Closeout

Run the narrowest honest proof first, then broaden only as needed.

## Verification surfaces

Choose the surface that proves the invariant:

- `codebase grep-proof`: path, symbol, reference, or removal confirmation
- `schema validation`: YAML/frontmatter/template field structure
- `skill dry-run`: invoke the skill with representative input and inspect the deliverable
- `targeted tool command`: run the relevant CLI/script/validator command
- `manual review`: prose quality, gate wording, or generated artifact inspection
- `FOUNDATIONS alignment check`: cite the exact principle/rule/schema section being preserved

For cross-skill or cross-artifact tickets, map each distinct invariant to a distinct proof surface.

## Verification discipline

- Verify exact command shapes before recording them in the ticket.
- For inverted expected-failure proof commands, inspect stderr/stdout and confirm the failure is the intended diagnostic. Do not accept no-input, parse, missing-file, unsupported-extension, shell-shape, or excluded-file failures as proof of the intended rejection.
- When a proof command counts matches across a file glob, dry-run the exact command and confirm it emits the scalar value the ticket claims. Some tools, such as `grep -c file-*`, emit one count per file unless forced through `grep -h`, `wc -l`, `awk`, or another explicit aggregation.
- For negative grep proofs, preserve the failure signal instead of hiding it behind `|| true`. Prefer an explicit command such as `if grep -R "needle" paths; then exit 1; fi` or `! grep -R "needle" paths`, then record that exact command and result in the ticket.
- When searching for markdown or code literals that contain shell-active characters such as backticks, wrap the pattern in single quotes or escape those characters before running `grep`, `rg`, or similar commands. Do not let the shell execute a literal from the proof pattern.
- For stale-anchor sweeps that include markdown code spans, first check whether the pattern contains backticks, `$`, pipes, parentheses, or other shell-active characters. Use a single-quoted literal pattern, escape the active characters, or split the search into simpler safe patterns; do not use double quotes. Example: `rg -n 'No \`foo\` entry' ticket.md`.
- If a stale-anchor sweep fails because the shell interpreted the search pattern, rerun it immediately with split, single-quoted literal patterns before treating the sweep as complete. Do not record the failed shell-shape command as proof.
- For negative stale-anchor sweeps, prefer the exact old phrase or command fragment over a broad positive phrase. When the active ticket records the sweep in `## Verification Result`, do not count that newly written proof prose as a stale hit unless you are intentionally checking the ticket text itself.
- When old failure terms are intentionally preserved in the completed ticket as labelled historical evidence, scope the negative grep to the consumer docs, skills, tests, or package surfaces that were meant to be cleaned. Record the active-ticket preservation separately instead of treating historical intake evidence as a stale consumer hit.
- When drafted proof literals contain Unicode punctuation but the landed repo prose uses ASCII equivalents, update the ticket's `Acceptance Criteria`, `Test Plan`, and verification result to the exact landed string before closeout.
- If a grep-count proof is brittle or counts incidental spelling rather than behavior, rewrite the ticket to a stronger truthful proof surface instead of adding marker text solely to satisfy the count. Prefer exported registries, list/dispatch tests, direct tool calls, or focused runtime probes when they better prove the invariant.
- Run dependent verification commands in dependency order, not in parallel. If a test command consumes compiled artifacts, generated files, or other build outputs, finish and confirm the producer step first, then run the dependent proof command.
- For `tool or script implementation` tickets, dry-run the exact package-local command form (`cd` into the package, repo-local binary path, real config path) before trusting drafted `Test Plan` commands.
- If verification uses an exported function or inline runtime probe, confirm the command is launched from a root where package-local modules actually resolve before treating any failure as ticket evidence.
- If verification uses compiled or generated artifacts such as `dist/src/...` or `dist/tests/...`, prove artifact freshness before trusting the result. Run the producer build first when that is the truthful lane. If you intentionally skip the build, compare the exercised source/generated seam or record the reason the existing artifact is an acceptable proof surface.
- For direct probes that write temp files outside the repo, use a unique temp directory and either clean it up before closeout or record why it was left behind. If a temp artifact becomes part of the proof story, name the artifact root in `## Verification Result` so later readers can distinguish it from live repo state.
- For TS packages that run tests from compiled output such as `dist/tests/*.test.js`, treat new test-time file reads as part of the proof contract: verify that fixtures, SQL files, and other disk reads resolve from the compiled test runtime, or anchor them explicitly from the source tree / repo root.
- For atomic-source `world-index` tickets, confirm `world-index verify` understands synthetic logical rows before using it as acceptance proof. If it treats retired root markdown paths as disk paths or otherwise reports atomic-mode drift, use `build`, focused validators, and direct DB checks as the truthful proof surface, then record the verify limitation.
- If a broader command fails, decide whether the failure is current-ticket fallout or unrelated pre-existing state.
- If a broad package suite rebuilds successfully and the owned focused compiled tests pass, but the broad suite still exits non-zero, classify the failure before closeout instead of forcing the broad lane. Name the exact unrelated failing test files or subtests, the diagnostic command used to isolate them, and the focused owned proof command that remains the ticket's truthful acceptance surface in `## Deviations` / `## Verification Result`.
- After the final edit, rerun the narrowest affected proof.
- Do not overclaim broad verification when only a narrower surface was honestly proved.

## Common narrowings

- If a broad JS/TS `node --test <file>` lane fails opaquely, isolate the failing seam with a narrower reporter or `--test-name-pattern` before treating the full-file failure as ticket evidence.
- If isolated subtests pass but the broad lane still fails opaquely, run the compiled test file directly from the same package root when that exposes clearer TAP output or assertion traces.
- If `node --test dist/path/to/test.js` reports only a wrapper failure for a compiled test module that itself uses `node:test`, run `node dist/path/to/test.js` as a diagnostic command to expose nested TAP/subtest assertion details. Still rerun the accepted `node --test ...` proof before closeout if the ticket records that command.
- If a compiled TS test imports runtime data or reads files from disk, check the emitted test's runtime location before assuming the implementation is wrong; `dist/tests/...` often changes the relative path contract.
- If an MCP, stdio, or transport-client lane is noisy, first prove whether the instability is outside the owned seam; keep acceptance on the strongest truthful in-process or package-local surface unless a known-good end-to-end lane exists.
- For `tools/world-mcp` tickets where direct `mcp__worldloom__...` invocation is unavailable in the Codex toolset, choose the proof surface that matches the claim: use a built-artifact in-memory MCP client/server smoke for registration, input-schema, or wrapped-tool behavior; use a direct compiled handler probe for pure handler behavior. Record which substitute was used so the closeout does not imply a direct external MCP invocation.
- For child-process lifecycle tests, prefer the child `close` event's `(code, signal)` result over reading `child.exitCode` immediately after a close or signal path. `exitCode` can remain unset during signal-driven shutdown even when the close event carries the proof signal.

## Ticket closeout

Before finishing, re-read the ticket and make it truthful:

- `Status` reflects reality
- `Assumption Reassessment` captures the final boundary
- `Files to Touch` matches the landed diff
- `Acceptance Criteria` and `Test Plan` match the proof you actually ran
- completed implementation tickets convert planned sections such as `What to Change` to landed facts; if preserving the section as the final implementation record, prefer renaming it to `Landed Changes`
- re-read the entire ticket top-to-bottom so earlier authored sections such as `Problem`, `What to Change`, `Architecture Check`, `Files to Touch`, `Verification Layers`, `Acceptance Criteria`, `Test Plan`, and `Invariants` do not still contain stale pre-reassessment wording
- rewrite fixed current-state claims in `## Problem` as historical intake evidence (`At intake`, `Before this ticket`, or equivalent) so the completed record does not imply the defect still exists
- when preserving original failure evidence, label it as historical intake evidence (`At intake`, `Observed before this ticket`, or equivalent) so the completed record does not still read as if the fixed failure is current
- convert planned work in `What to Change`, `Acceptance Criteria`, and `Test Plan` to landed facts, or explicitly label those sections as the historical plan if preserving the original plan is necessary
- grep or scan for draft/future-tense planning markers such as `After this ticket lands`, `should be updated`, `verify exact`, `or current`, `if applicable`, `or extend existing`, and similar placeholder phrases; rewrite same-seam hits to landed facts or remove them before final response
- if any explicit user-supplied reference spec/doc was used as the ticket's authority, grep that reference for corrected counts, enum members, command names, paths, default tables, proof commands, risk summaries, or other reassessed claims before final closeout; update same-seam stale reference lines or record why they are outside the active ticket boundary
- when reassessment replaces a central proof surface, run a targeted grep over the active ticket and explicit reference specs/docs for a few old anchor phrases such as stale command names, fixture names, expected error codes, count claims, zero-fail or baseline claims, old command fragments, old tool boundaries, manual-smoke lines, and verification prose; truth any same-seam hits or record why they are intentionally outside the active ticket
- when the proof command shape changes, treat old-command cleanup as a hard closeout stop: grep the active ticket for the previous command fragment and update every same-seam occurrence in `Verification Layers`, `Acceptance Criteria`, `Test Plan`, `## Verification Result`, and `## Deviations` before final response
- when an explicit reference spec/doc contains remaining stale same-seam claims that are intentionally outside the active ticket boundary, record the boundary explicitly in closeout rather than leaving the reference check implicit
- re-read the ticket again after completed-ticket truth edits so the final record is internally consistent
- draft alternatives such as `A or B`, `and/or`, or placeholder proof options have been collapsed to the exact landed file and command set
- illustrative code snippets, helper names, and scenario sketches still match the landed seam or have been replaced with prose
- `## Outcome` states what changed
- `## Verification Result` lists commands/reviews actually completed
- `## Deviations` is present when reassessment or verification changed the intended shape
- dirty-worktree state has been refreshed using `references/dirty-worktree-ledger.md`, including hunk-level classification for mid-run changes in files you also touched and likely sibling-ticket ownership for same-family edits

## Archival

Archive only when the user asked for it.

When archiving:

- follow `docs/archival-workflow.md`
- make the ticket truthful before moving it
- update any active specs, docs, or roadmap files that still reference the old active ticket path
