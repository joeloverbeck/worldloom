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
- When drafted proof literals contain Unicode punctuation but the landed repo prose uses ASCII equivalents, update the ticket's `Acceptance Criteria`, `Test Plan`, and verification result to the exact landed string before closeout.
- If a grep-count proof is brittle or counts incidental spelling rather than behavior, rewrite the ticket to a stronger truthful proof surface instead of adding marker text solely to satisfy the count. Prefer exported registries, list/dispatch tests, direct tool calls, or focused runtime probes when they better prove the invariant.
- Run dependent verification commands in dependency order, not in parallel. If a test command consumes compiled artifacts, generated files, or other build outputs, finish and confirm the producer step first, then run the dependent proof command.
- For `tool or script implementation` tickets, dry-run the exact package-local command form (`cd` into the package, repo-local binary path, real config path) before trusting drafted `Test Plan` commands.
- If verification uses an exported function or inline runtime probe, confirm the command is launched from a root where package-local modules actually resolve before treating any failure as ticket evidence.
- For direct probes that write temp files outside the repo, use a unique temp directory and either clean it up before closeout or record why it was left behind. If a temp artifact becomes part of the proof story, name the artifact root in `## Verification Result` so later readers can distinguish it from live repo state.
- For TS packages that run tests from compiled output such as `dist/tests/*.test.js`, treat new test-time file reads as part of the proof contract: verify that fixtures, SQL files, and other disk reads resolve from the compiled test runtime, or anchor them explicitly from the source tree / repo root.
- For atomic-source `world-index` tickets, confirm `world-index verify` understands synthetic logical rows before using it as acceptance proof. If it treats retired root markdown paths as disk paths or otherwise reports atomic-mode drift, use `build`, focused validators, and direct DB checks as the truthful proof surface, then record the verify limitation.
- If a broader command fails, decide whether the failure is current-ticket fallout or unrelated pre-existing state.
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
- draft alternatives such as `A or B`, `and/or`, or placeholder proof options have been collapsed to the exact landed file and command set
- illustrative code snippets, helper names, and scenario sketches still match the landed seam or have been replaced with prose
- preserved original failure evidence is clearly historical, not phrased as a current-state claim after the ticket is complete
- for completed tickets, `## Problem` no longer presents fixed intake conditions as current repo state; convert those claims to `At intake...`, `Before this ticket...`, or equivalent historical wording
- `## Outcome` states what changed
- `## Verification Result` lists commands/reviews actually completed
- `## Deviations` is present when reassessment or verification changed the intended shape

## Archival

Archive only when the user asked for it.

When archiving:

- follow `docs/archival-workflow.md`
- make the ticket truthful before moving it
- update any active specs, docs, or roadmap files that still reference the old active ticket path
