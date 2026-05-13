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
- For negative grep proofs over `worlds/<slug>/_source`, scope the searched paths to the record layer the ticket owns. World-canon atomic records and story-bundle records can intentionally use the same field names differently, so a broad `worlds/<slug>/_source` or `worlds/` sweep can produce false failures from a sibling layer. Prefer exact subtrees such as `worlds/<slug>/_source/canon` or `worlds/<slug>/stories/<story-slug>/_source/<class>` plus any checked fixtures that prove the owned invariant.
- If a drafted negative grep mixes stale anchors with legitimate sibling examples, do not force a zero-hit proof. Rewrite acceptance to a discovery grep plus manual classification of remaining legitimate hits, or split the search into narrower negative stale-anchor patterns and a separate positive classification review.
- When a non-world-content ticket runs a discovery `grep`, `rg`, or `find` under `worlds/`, do not automatically widen into world-content migration. Classify any hits first: owned migration blocker only if the ticket explicitly owns world-content cleanup; otherwise record the hits as local, historical, gitignored, or separate-follow-up evidence and keep the current ticket forward-only. Do not direct-edit `_source/*.yaml` records from a docs/skill/tool ticket just to make a broad discovery sweep clean.
- Before multi-path stale-anchor sweeps, resolve every historical, sibling, or archived path first with `rg --files`, `test -e`, or an equivalent exact-path check. Omit missing historical paths from the proof command and record them as stale/missing provenance or explicitly out-of-scope; do not let a broad `rg` fail with `No such file or directory` and then treat that noisy nonzero result as a completed stale-anchor proof.
- When searching for markdown or code literals that contain shell-active characters such as backticks, wrap the pattern in single quotes or escape those characters before running `grep`, `rg`, or similar commands. Do not let the shell execute a literal from the proof pattern.
- For stale-anchor sweeps that include markdown code spans, first check whether the pattern contains backticks, `$`, pipes, parentheses, or other shell-active characters. Use a single-quoted literal pattern, escape the active characters, or split the search into simpler safe patterns; do not use double quotes. Example: `rg -n 'No \`foo\` entry' ticket.md`.
- If a stale-anchor sweep fails because the shell interpreted the search pattern, rerun it immediately with split, single-quoted literal patterns before treating the sweep as complete. Do not record the failed shell-shape command as proof.
- For negative stale-anchor sweeps, prefer the exact old phrase or command fragment over a broad positive phrase. When the active ticket records the sweep in `## Verification Result`, do not count that newly written proof prose as a stale hit unless you are intentionally checking the ticket text itself.
- For stale enum, tuple, field-name, or label sweeps, make the grep boundary-aware when old members can appear inside new canonical members. Bare alternations such as `old|label|name` and suffix-only forms such as `label:` can false-match longer values like `new_old:` or `label_variant:`. Require a real delimiter or token boundary before and/or after the old member, such as `(^|[|[:space:]])(old_a|old_b):` for pipe-separated label lists, or use a parser/structured query when the surface is structured data.
- When old failure terms are intentionally preserved in the completed ticket as labelled historical evidence, scope the negative grep to the consumer docs, skills, tests, or package surfaces that were meant to be cleaned. Record the active-ticket preservation separately instead of treating historical intake evidence as a stale consumer hit.
- When removing or renaming public enum/input-schema values, old literals may remain intentionally in rejection tests. Do not force a single zero-hit grep over all tests. Split the proof into a zero-hit sweep over current-contract surfaces such as source, docs, skills, README, registered metadata, and positive fixtures, plus a separate test-scope discovery grep that identifies only the intentional rejection literals. Update the ticket's acceptance, `Verification Result`, and `Deviations` to name that split before final closeout.
- When drafted proof literals contain Unicode punctuation but the landed repo prose uses ASCII equivalents, update the ticket's `Acceptance Criteria`, `Test Plan`, and verification result to the exact landed string before closeout.
- If a grep-count proof is brittle or counts incidental spelling rather than behavior, rewrite the ticket to a stronger truthful proof surface instead of adding marker text solely to satisfy the count. Prefer exported registries, list/dispatch tests, direct tool calls, or focused runtime probes when they better prove the invariant.
- For prose workflow skills with no executable runner, validator, or fixture harness in the live repo, do not force a drafted end-to-end smoke just because the ticket names one. Rewrite acceptance to the strongest truthful proof available, usually manual contract review plus grep/stale-anchor proof over the edited skill and templates. Record the unavailable runner or validator in `## Deviations` so closeout does not imply an executable path was exercised.
- Run dependent verification commands in dependency order, not in parallel. If a test command consumes compiled artifacts, generated files, or other build outputs, finish and confirm the producer step first, then run the dependent proof command.
- For `tool or script implementation` tickets, dry-run the exact package-local command form (`cd` into the package, repo-local binary path, real config path) before trusting drafted `Test Plan` commands.
- In Codex, if a package or CLI proof fails with sandbox-looking child-process errors such as `EPERM` from spawning the built CLI, `git`, `node`, or another subprocess, treat the first failure as a possible environment restriction rather than immediate code evidence. If the failing command is only a wrapper/probe that spawns the actual CLI, first consider decomposing the proof into setup plus direct CLI invocation from the correct temp or package root when that preserves the same public proof boundary. If the direct invocation still hits sandbox restrictions, rerun the same command with the required escalation. Record the original sandbox failure and the successful/failed substitute or escalated result in closeout so verification history is truthful.
- For precondition failure, unsupported-mode, or rejection-path tickets, prove not only the exit code/message but also that the command fails before creating or mutating derived artifacts, indexes, caches, or other side-effect surfaces unless the ticket explicitly owns that mutation.
- If a filtered package command is intended as a narrow proof, verify the test output was actually filtered to the intended subtests or files. When a package wrapper still runs and reports the full package suite, record that command as broad verification and either add a genuinely narrow proof command or update the ticket's proof language to match the broad result.
- If verification uses an exported function or inline runtime probe, confirm the command is launched from a root where package-local modules actually resolve before treating any failure as ticket evidence.
- If verification uses compiled or generated artifacts such as `dist/src/...` or `dist/tests/...`, prove artifact freshness before trusting the result. Run the producer build first when that is the truthful lane. If you intentionally skip the build, compare the exercised source/generated seam or record the reason the existing artifact is an acceptable proof surface.
- When the fix changes a shared producer/parser/contract seam, recompute any ticket-stated live totals, reproduced witness lists, and neighboring same-seam assertions from the final post-fix artifact instead of carrying forward pre-fix probe values. If the final artifact truthfully changes an adjacent same-seam expectation, update that proof surface before closeout.
- For direct probes that write temp files outside the repo, use a unique temp directory and either clean it up before closeout or record why it was left behind. If a temp artifact becomes part of the proof story, name the artifact root in `## Verification Result` so later readers can distinguish it from live repo state.
- For capstone tests, keep the ticket's proof language aligned to the executable structure. If one `node:test` subtest covers several acceptance bullets, say so instead of implying there is a one-to-one match between acceptance sub-cases and test-run subtests.
- For TS packages that run tests from compiled output such as `dist/tests/*.test.js`, treat new test-time file reads as part of the proof contract: verify that fixtures, SQL files, and other disk reads resolve from the compiled test runtime, or anchor them explicitly from the source tree / repo root.
- For atomic-source `world-index` tickets, confirm `world-index verify` understands synthetic logical rows before using it as acceptance proof. If it treats retired root markdown paths as disk paths or otherwise reports atomic-mode drift, use `build`, focused validators, and direct DB checks as the truthful proof surface, then record the verify limitation.
- If a broader command fails, decide whether the failure is current-ticket fallout or unrelated pre-existing state.
- If verification reveals new same-seam fallout after initial implementation, stop before the next source edit and rerun the ticket reassessment loop for that fallout. Classify it as required same-seam fallout, separate bug, or boundary growth; patch the active ticket's `Assumption Reassessment`, `Files to Touch`, `Verification Layers`, `Acceptance Criteria`, and `Test Plan` to the new truthful scope; then make the follow-up source edit and rerun the affected proof.
- If a broad package suite rebuilds successfully and the owned focused compiled tests pass, but the broad suite still exits non-zero, classify the failure before closeout instead of forcing the broad lane. Name the exact unrelated failing test files or subtests, the diagnostic command used to isolate them, and the focused owned proof command that remains the ticket's truthful acceptance surface in `## Deviations` / `## Verification Result`.
- If a verification command passes but emits warnings, skipped-record diagnostics, deprecations, package-manager notices, or other visible non-fatal output, classify the output before closeout. Record relevant non-owned warnings in `## Verification Result` or `## Deviations` when omitting them would make the proof sound cleaner than the actual run.
- After the final edit, rerun the narrowest affected proof.
- Do not overclaim broad verification when only a narrower surface was honestly proved.

## Common narrowings

- If a broad JS/TS `node --test <file>` lane fails opaquely, isolate the failing seam with a narrower reporter or `--test-name-pattern` before treating the full-file failure as ticket evidence.
- If `--test-name-pattern` or an equivalent selector appears to pass but the TAP summary still includes unrelated subtests or the full suite, do not describe it as a targeted subtest lane. Treat the selector as ineffective for that package wrapper and use the full-suite result only as broad proof.
- If isolated subtests pass but the broad lane still fails opaquely, run the compiled test file directly from the same package root when that exposes clearer TAP output or assertion traces.
- If `node --test dist/path/to/test.js` reports only a wrapper result for a compiled test module that itself uses `node:test`, run `node dist/path/to/test.js` as a diagnostic command to expose nested TAP/subtest assertion details. This applies when the wrapper fails opaquely and when it passes but only proves the file wrapper instead of the meaningful subtests. Still rerun the accepted `node --test ...` proof before closeout if the ticket records that command; if the direct module run becomes the stronger accepted proof, update the ticket's `Acceptance Criteria`, `Test Plan`, and `## Verification Result` to that exact command.
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
- `Acceptance Criteria` contains only gates that were actually run or intentionally remain as future/spec-level goals; move non-run goals out of active "Tests That Must Pass" language or label them explicitly in `## Deviations` / out-of-scope proof
- Every `Verification Layers` row is represented in `## Verification Result` by a matching command or manual-review entry, or is explicitly marked not exercised in `## Deviations` with the reason. Do not let a layer remain only in the plan after closeout.
- completed implementation tickets convert planned sections such as `What to Change` to landed facts; if preserving the section as the final implementation record, prefer renaming it to `Landed Changes`
- completed implementation tickets must not leave unperformed optional plan items in active plan sections; delete them, historicalize them as not performed, or move them to `Out of Scope` / `## Deviations` with a clear boundary
- re-read the entire ticket top-to-bottom so earlier authored sections such as `Problem`, `What to Change`, `Architecture Check`, `Files to Touch`, `Verification Layers`, `Acceptance Criteria`, `Test Plan`, and `Invariants` do not still contain stale pre-reassessment wording
- rewrite fixed current-state claims in `## Problem` as historical intake evidence (`At intake`, `Before this ticket`, or equivalent) so the completed record does not imply the defect still exists
- when preserving original failure evidence, label it as historical intake evidence (`At intake`, `Observed before this ticket`, or equivalent) so the completed record does not still read as if the fixed failure is current
- After historicalizing `## Problem`, remaining old-defect phrases are allowed only when explicitly scoped by `At intake`, `Before this ticket`, `Observed before this ticket`, or equivalent wording. Otherwise rewrite them as landed/current facts or remove them.
- convert planned work in `What to Change`, `Acceptance Criteria`, and `Test Plan` to landed facts, or explicitly label those sections as the historical plan if preserving the original plan is necessary
- grep or scan for draft/future-tense planning markers such as `After this ticket lands`, `should be updated`, `verify exact`, `or current`, `if applicable`, `or extend existing`, and similar placeholder phrases; rewrite same-seam hits to landed facts or remove them before final response
- if any explicit user-supplied reference spec/doc was used as the ticket's authority, grep that reference for corrected counts, enum members, command names, paths, default tables, proof commands, risk summaries, or other reassessed claims before final closeout; update same-seam stale reference lines or record why they are outside the active ticket boundary
- For large proposal specs, implementation-order docs, or brainstorm-style workstream references where the active ticket completes one slice but rewriting every historical row would exceed the ticket boundary, add a dated implementation note near the status/frontmatter instead of doing a broad rewrite. The note should name the completed ticket, the exact landed surface, and state that remaining old-surface prose is historical intake context unless a later ticket owns it.
- when reassessment replaces a central proof surface, run a targeted grep over the active ticket and explicit reference specs/docs for a few old anchor phrases such as stale command names, fixture names, expected error codes, count claims, zero-fail or baseline claims, old command fragments, old tool boundaries, manual-smoke lines, and verification prose; truth any same-seam hits or record why they are intentionally outside the active ticket
- when reassessment discovers a missing or stale reference path, grep the active ticket for that exact path before closeout. Replace active authority/proof references with the resolved live path or parent-section authority, and preserve the stale path only as explicitly labelled historical reassessment or deviation evidence.
- when the ticket cites source locations as `path:line` or line ranges in `Deps`, `Problem`, `Assumption Reassessment`, or proof prose, re-check those citations after source edits; update them to current lines, remove brittle line numbers, or mark them explicitly as historical intake evidence
- when the proof command shape changes, treat old-command cleanup as a hard closeout stop: grep the active ticket for the previous command fragment and update every same-seam occurrence in `Verification Layers`, `Acceptance Criteria`, `Test Plan`, `## Verification Result`, and `## Deviations` before final response
- old command strings may remain only as explicitly labelled historical reassessment or deviation evidence. For example, if `npm test -- allocate-next-id` was the drafted command but the live package requires `npm run build` plus `node --test dist/...`, remove the old command from active `Acceptance Criteria` and `Test Plan`; preserve it only under `Assumption Reassessment` or `## Deviations` as the stale drafted command that was corrected.
- when adding, removing, or renaming enum/tuple/registry members, sweep same-seam tests, docs, ticket text, helper names, and test titles for stale member counts, old member lists, and old descriptive labels; update same-seam hits before final proof so passing assertions do not hide contradicted prose
- when the active ticket completes a prerequisite for an active follow-up, dependency, or known-debt ticket, update that follow-up's direct dependency/status wording if it now describes completed work; do not edit the follow-up's owned implementation prose unless the active ticket truly owns that implementation
- when the active ticket completes a numbered spec track, tier, or implementation-order row, include `specs/IMPLEMENTATION-ORDER.md` in the same-seam stale-status/count sweep. Truth current counts, completion state, and active/archive ticket references there before final proof.
- when dependency/follow-up stale-ref sweeps are likely to produce tracked prose edits, run them before the final broad proof when practical; if only ticket or prose closeout changes after a broad package proof, rerun `git diff --check` and any checked-contract proof that the prose change affects rather than reflexively rerunning the broad package lane
- when an explicit reference spec/doc contains remaining stale same-seam claims that are intentionally outside the active ticket boundary, record the boundary explicitly in closeout rather than leaving the reference check implicit
- If a reference doc was truthed with a dated implementation note rather than row-by-row edits, record that note path in `Files to Touch` and explain in `## Deviations` or `Assumption Reassessment` why the remaining stale wording is historical context, not current acceptance text. If that note adds a tracked spec or doc to the landed file set, also update summary metadata such as `Engine Changes` so the ticket header matches the final touched files.
- if final closeout review adds or removes a proof file, docs file, generated fixture, command smoke, or other same-seam artifact after verification, update `Files to Touch`, `New/Modified Tests`, `Acceptance Criteria`, `Test Plan`, and `## Verification Result` to the new landed file set and rerun the affected final proof before responding
- re-read the ticket again after completed-ticket truth edits so the final record is internally consistent
- draft alternatives such as `A or B`, `and/or`, or placeholder proof options have been collapsed to the exact landed file and command set
- illustrative code snippets, helper names, and scenario sketches still match the landed seam or have been replaced with prose
- `## Outcome` states what changed
- `## Verification Result` lists commands/reviews actually completed
- `## Deviations` is present when reassessment or verification changed the intended shape
- after adding `## Outcome`, `## Verification Result`, or `## Deviations`, re-read the active ticket one more time for stale file names, proof paths, required-field claims, and test-command fragments introduced or preserved by closeout edits
- dirty-worktree state has been refreshed using `references/dirty-worktree-ledger.md`, including hunk-level classification for mid-run changes in files you also touched and likely sibling-ticket ownership for same-family edits
- if `git add -N` was used only to make untracked owned files visible to `git diff --check`, clear the intent-to-add entries before final status. In Codex sandboxed runs, a `git reset -- <path>` cleanup can fail with index-lock or read-only-filesystem symptoms; rerun the same cleanup with the required approval/escalation, then refresh status rather than leaving hygiene-only index state behind.

For long tickets, use this expedited stale-anchor pass before final response:

- Before running stale-anchor sweep commands, inspect each literal for markdown code spans, backticks, `$`, pipes, parentheses, or other shell-active characters. Use single-quoted literals, split safer patterns, or escape the active characters before the command reaches the shell.
- `Status`: final state, not intended state.
- `Problem`: fixed defects are labelled as intake or pre-ticket evidence.
- `Files to Touch`: exact landed file set, including same-seam docs/tests discovered during reassessment.
- `What to Change` / `Landed Changes`: no future-tense implementation plan unless explicitly labelled historical.
- `Verification Layers`, `Acceptance Criteria`, and `Test Plan`: exact proof commands or manual review surfaces actually used.
- Stale-anchor proof commands recorded in the ticket have been rerun with shell-safe quoting; use single-quoted literals, escaped active characters, or split patterns for backticks, `$`, pipes, and parentheses.
- Missing reference paths discovered during reassessment have been removed from active authority/proof prose or preserved only as labelled historical/deviation evidence.
- `Outcome`, `Verification Result`, and `Deviations`: current closeout facts, with stale drafted commands and superseded assumptions labelled as historical evidence.
- stale command fragments, old fixture names, placeholder alternatives, and old proof options have been grepped or manually scanned and resolved.

## Archival

Archive only when the user asked for it.

When archiving:

- follow `docs/archival-workflow.md`
- make the ticket truthful before moving it
- update any active specs, docs, or roadmap files that still reference the old active ticket path
