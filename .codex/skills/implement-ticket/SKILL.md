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

Read `AGENTS.md`, `docs/FOUNDATIONS.md`, the target ticket, `tickets/_TEMPLATE.md`, and `tickets/README.md` before editing. Read `docs/archival-workflow.md` when archival is actually in scope for the active run: before archiving, when the user explicitly asked for full ticket completion or archival, or when the remaining owned work includes archive/update steps rather than incidental archival references in the ticket/spec prose. If the ticket changes skill HARD-GATE semantics, canon-write ordering, Mystery Reserve firewall enforcement/gate behavior, approval-token behavior, `validate_patch_plan`, `submit_patch_plan`, pre-apply validation, or other machine-facing validation signals used by HARD-GATE flows, also read `docs/HARD-GATE-DISCIPLINE.md` before finalizing reassessment. Read-only retrieval or visibility work that merely surfaces Mystery Reserve constraints does not require that extra read by default.

Reassess first, then implement. Do not treat the ticket as mechanically executable until its assumptions match the current repo.

## Execution Map

Use this as the default path, then apply the detailed rules below when the ticket's shape needs them:

1. Resolve the live ticket/spec paths and snapshot the worktree.
2. Read the required repo contracts (`AGENTS.md`, `docs/FOUNDATIONS.md`, ticket template/readme, ticket, and explicit references).
3. Classify the ticket and load only the focused reference docs needed for that class.
4. Reassess ticket claims against the live repo; patch low-risk factual drift before code edits.
5. State the owned implementation slice to the user, then make minimal edits.
6. Run the narrowest truthful proof first, then any required broader package/workflow gate.
7. Close out the ticket text, rerun final proof if closeout changed a checked contract, refresh dirty/ignored-artifact state, and report exactly what changed.

## Always First

- Resolve the exact live ticket path before trusting ticket wording.
- Snapshot the worktree with `git status --short` and classify unrelated dirty paths before coding.
- Load `references/dirty-worktree-ledger.md` and keep the dirty-worktree ledger current throughout the run, including initial overlap, mid-run same-file changes, same-family sibling scope, and ignored artifacts.
- For package/tool tickets, use `references/package-tooling.md` for detailed package command, dependency, fixture, generated-artifact, and public-surface checks. Keep new specialized package/tool guidance in that reference instead of expanding this top-level flow.
- In Worldloom, remember that many `worlds/<slug>/` artifacts are gitignored. If the ticket touches world content, do not treat `git status`, `git diff`, or tracked-only checks as exhaustive proof of what changed.
- For world-content writes, keep the write surface explicit:
  - `_source/*.yaml` atomic canon records are engine-only. Use `mcp__worldloom__submit_patch_plan` when it is exposed.
  - Hybrid world files such as `characters/*.md`, `diegetic-artifacts/*.md`, and `adjudications/*.md` may be direct-edited only when the ticket or live phase precedent proves that direct edit is currently permitted. Otherwise route through the corresponding engine op or escalate.
  - Derived artifacts such as `_index/world.db` are regenerated, not hand-edited.
- Read the current ticket contract from `tickets/_TEMPLATE.md` and `tickets/README.md`; do not rely on memory.
- Open every explicit `Deps` path, evidence-ticket path, or archived-ticket path named by the ticket before coding. For completed or archived dependencies, inspect closeout sections such as `## Outcome`, `## Verification Result`, and `## Deviations` for same-seam fallout that may already partially implement, narrow, or contradict the active ticket. If a named dependency is intentionally not authoritative for this run, record why in `Assumption Reassessment`.
- If the ticket names a CLI or package command, verify its `cwd` / repo-root assumptions before trusting it as a proof surface.
- For detailed package/tool command, fixture, workspace, dependency, and compile-gate checks, use `references/package-tooling.md` after classification instead of keeping those narrow rules in the top-level flow.
- Never run a producer command and its dependent proof command in parallel; treat build-then-test, generate-then-verify, and similar lanes as strictly sequential.
- If a verification command depends on a build, generated artifact, or other producer step, run the producer first and the dependent proof second; do not treat those lanes as parallel-safe.
- In Codex, do not use `multi_tool_use.parallel` for build-then-test, generate-then-verify, or similar producer/consumer lanes; wait for the producer command to finish before launching dependent commands.
- Prefer the strongest truthful verification surface available for the ticket's owned invariant.
- Update the ticket itself when reassessment changes scope, ownership, commands, or acceptance text.
- Archive only when the user explicitly asks for full ticket completion or archival.

## Workflow

### 0. Classify the ticket shape

Load `references/ticket-classification.md` from this skill directory (`.codex/skills/implement-ticket/references/`).

Classify the ticket before coding:

- `docs-only / contract-truthing`
- `skill rewrite or skill-local behavior`
- `tool or script implementation`
- `cross-skill or cross-artifact contract`
- `schema or template extension`
- `archive / rejection / no-op validation`

Use the classification to choose which repo surfaces must be read and which verification layers are required.

If one primary class also changes a real shared contract, keep the primary classification but also apply the consumer and verification checks from `cross-skill or cross-artifact contract`.

If the primary class is `docs-only / contract-truthing` or `skill rewrite or skill-local behavior` but the strongest proof is a read-only package handler, CLI, or compiled artifact probe, keep the implementation boundary on docs/skills and apply only the relevant package-proof hygiene from `references/package-tooling.md` and `references/verification-closeout.md`. Do not widen the ticket into package code changes just because the proof route exercises a package artifact.

If the primary class is `tool or script implementation`, or the ticket changes a package manifest, package-local command, serializer, hash/checksum, public export, or package-local README/example contract, also load `references/package-tooling.md` from this skill directory and apply its focused reassessment and closeout checks. Keep specialized package behavior in that reference instead of expanding the top-level workflow.

For package/tool tickets, do a compact package checkpoint before coding: inspect the package manifest and test/build scripts, dry-run or otherwise verify drafted proof command shapes and their `cwd`, check whether drafted direct `mcp__worldloom__...` invocations are exposed in the active Codex session, locate existing same-seam tests before creating new files, and confirm live fixture/count assumptions when tests copy or assert against current world state.

If the ticket changes a validator, JSON Schema, hybrid frontmatter parser, validation registry, grandfathering/waiver matcher, live-corpus validator baseline, or validator-package capstone / verification-matrix coverage, also load `references/validator-schema-migrations.md` from this skill directory and apply its focused reassessment, verification, and closeout checks.

For staged validator/schema/parser details, prefer `references/validator-schema-migrations.md` as the detailed authority and keep this top-level workflow as the routing checklist.

When the ticket changes a user-facing tool inventory, command surface, package entrypoint, or registration list, inspect adjacent same-package README/example inventory during reassessment before the first code edit, not only during closeout.

For validator, audit, or live-corpus baseline tickets, run the smallest truthful live-corpus probe before coding when acceptance claims zero findings or a clean baseline. Classify every finding as validator/tool bug, current-ticket cleanup, or pre-existing corpus baseline for a named bootstrap/audit owner; do not suppress real findings or force stale zero-fail acceptance when the live corpus truthfully exposes existing defects. For schema/parser migration specifics, apply `references/validator-schema-migrations.md`.

For spec or validator capstone tickets whose verification matrix mixes package-mechanized surfaces with skill-flow-only scenarios, classify each scenario during reassessment as `mechanized`, `surrogate`, `manual/organic`, or `dropped from capstone`. Do not invoke expensive skill flows or fabricate skill harnesses unless the ticket explicitly owns that surface. Truth the active ticket and same-seam spec/status docs so the final closeout distinguishes validator/pre-apply proof from skill-flow/manual verification.

When a validator, audit, or live-corpus baseline ticket claims grandfathering, waiver rows, allowlists, or other disposition metadata can change the command's pass/fail result, verify the live validator/CLI actually consumes that mechanism before accepting it as an acceptance path. If the mechanism is only persisted audit data and emitted verdicts are recomputed independently, keep the findings visible, rewrite the active ticket to the truthful baseline/proof seam, and route real cleanup or policy implementation to a separate owner.

If a validator grandfathering, waiver, baseline, or allowlist mechanism is implemented in a shared validator runner, also prove that pre-apply and other hard-gate paths remain fail-closed unless the ticket explicitly owns weakening that gate. A full-world bootstrap disposition must not accidentally downgrade engine pre-apply failures, Hook failures, or other canon-mutation gate verdicts.

For explicit validator grandfathering policies, require an auditable minimum shape before treating the policy as real: stable disposition id, human rationale, exact validator name, exact code, exact file path, optional node id, and exact original message or another equivalently collision-resistant finding key. The implementation must downgrade only exact matched findings, preserve the finding as a queryable emitted verdict such as `info`, avoid DB-only insertion as the source of truth, and leave unmatched/new findings as failures.

### 1. Load the ticket context

1. Read the target ticket file.
2. Read every directly relevant reference it names: spec files, docs, skill files, tool files, templates, examples, or archived tickets/specs.
3. Read any explicit user-supplied reference paths from the invocation, even if the ticket itself does not name them.
4. If an explicit user-supplied reference path uses a glob, shorthand, or near-match typo, resolve the first exact live path before trusting or reading it.
5. If an explicit user-supplied reference glob or shorthand resolves to zero live paths, do not block the run by default. Record the miss in `Assumption Reassessment`, name the fallback live authority surface you are using instead, and continue.
6. If the invocation uses a glob, shorthand, or near-match typo for the ticket path, resolve the first exact live ticket path before doing anything else.
7. If the ticket belongs to a numbered family, inspect sibling tickets only far enough to confirm current ownership boundaries.
8. Check whether the active ticket is tracked or untracked; keep that in mind during closeout.
9. Snapshot the worktree with `git status --short` before coding and keep unrelated paths out of ticket fallout unless the ticket truly owns them.
10. If dirty files overlap the active seam, inspect their diffs and any sibling ticket/archive move state before coding so same-seam in-flight work is classified truthfully.
11. If the ticket lives under a worktree path, treat that worktree root as the repo root for all reads and writes.

### 2. Reassess assumptions before coding

Validate the ticket against the live repo, not against the spec draft alone.

If a prior review reopened this same ticket by blocking archival on an owned issue, treat that review finding as current reassessment evidence. Resume the same ticket rather than creating a new one, fix the owned blocker, rerun the final proof, and only then restore `COMPLETED` / archive-ready closeout text.

If the user reports a same-seam omission or contradiction after a ticket has been marked `COMPLETED` but before archival, reopen the active ticket record in place. Update reassessment/outcome/deviations as needed, truth same-seam sibling/spec references, rerun the narrow proof, and keep archival out of scope unless explicitly requested.

For non-trivial tickets, load `references/reassessment-checks.md` after classification and apply the sections that match the ticket. At minimum, check:

- paths in `Deps`, `Files to Touch`, `Verification Layers`, `Test Plan`, and prose references
- named skills, tools, hooks, validators, schemas, docs, and FOUNDATIONS rules
- authoritative consumers of the claimed shared contract across code, tests, docs, and examples
- whether the ticket's owned boundary is still real, already landed, narrower than drafted, blocked, or widened by same-seam fallout
- whether the drafted proof surface is executable and strong enough for the owned invariant

For engine-only canon writes where `mcp__worldloom__submit_patch_plan` is unavailable in the Codex toolset, load `references/patch-engine-codex-fallback.md` and use the local patch-engine fallback only if it preserves the same source-write boundary. Do not direct-edit `_source/*.yaml` as a convenience fallback.

Load `references/mismatch-handling.md` from this skill directory (`.codex/skills/implement-ticket/references/`).

Low-risk factual drift should be corrected directly in the ticket during reassessment. Architectural ambiguity, scope growth, or contradictory ownership requires a short 1-3-1 escalation to the user.

When reassessment cleanly narrows the owned delta before coding, patch the ticket's `Problem`, stale evidence-backed statements in `Assumption Reassessment`, `What to Change`, `Files to Touch`, and acceptance/proof text before the first code edit rather than waiting until closeout.

If early probing shows that a drafted broad package/workspace proof lane is already failing for reasons outside the owned seam, remove it from the active acceptance surface before implementation and rewrite the ticket to the strongest truthful narrower proof boundary. Keep the broader lane only as contextual noise or follow-up evidence, not as an active acceptance gate.

When a pre-apply validator emits failures during an engine-only patch reassessment, classify each failure before proceeding:

- `owned blocker`: the verdict is caused by this patch and must be fixed in this ticket.
- `validator overbreadth for this op class`: the verdict is real validator behavior but does not match the semantic scope of the operation being submitted; record the exact verdict and rationale in `Assumption Reassessment` / `## Deviations`.
- `separate validator bug or policy gap`: keep the current ticket honest and create or name a follow-up owner when the failure should be repaired but is not same-seam.

Ignoring or injecting around pre-apply verdicts is only acceptable after this classification, and only when the production/default path remains fail-closed.

Required-consequence fallout does **not** require escalation when all of the following are true:

- the added work stays inside the same architectural seam the ticket already owns
- the extra edit is necessary to make the ticket's stated outcome truthful or functional
- no new user-facing capability family, workflow boundary, or sibling ticket ownership is being claimed

If `docs/FOUNDATIONS.md` or the live package/test boundary makes the drafted split itself untruthful, same-seam widening is still allowed when all of the following are true:

- the active ticket and the immediate fallout live in one shared package, schema, or workflow seam
- downstream consumers must move together for the change to compile, run, or close out truthfully
- the widening does not cross into a separate user-facing capability family or unrelated sibling seam

When this happens, rewrite the active ticket as the truthful owner before code edits. Name any absorbed sibling tickets explicitly in `Assumption Reassessment`, then update or archive those sibling tickets during closeout if the user asked for full completion or archival.

Escalate with 1-3-1 when the fallout crosses a real ownership boundary even if it was discovered during reassessment.

Examples:

- same-seam / no escalation: a CLI ticket also needs the missing parser/helper module that the CLI path cannot function without
- boundary growth / escalate: a CLI ticket appears to require MCP wiring, hook orchestration, or a sibling validator/spec family that the active ticket did not already own

If the discovered fallout crosses into high-trust world canon or other canon-mutating cleanup, do not widen a package/tool/docs ticket into direct source cleanup just to make a broad gate green. When the current ticket can close truthfully by preserving visible failures, documenting the baseline, and creating a bounded follow-up for canon-addition-equivalent cleanup or an explicit grandfather policy, keep the active implementation on its original non-canon seam and create/update that follow-up instead.

### 3. Extract the real implementation slice

Before editing code or docs, name the actual owned delta:

- what changed in the live repo
- what still needs to change
- what the ticket no longer owns
- what follow-up ticket or spec owns adjacent remaining work, if any

Before the first file edit, give the user a concise checkpoint naming:

- the ticket classification / discrepancy class
- the authoritative boundary you are treating as the ticket's owner
- whether any sibling scope was absorbed, excluded, or left untouched

If a numbered family's decomposition failed during reassessment, also name:

- which sibling tickets are being absorbed into the active ticket
- why the original split was not independently landable
- which sibling tickets remain unabsorbed and why

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
- For manual code, docs, ticket, or skill edits, use `apply_patch`; do not use shell rewrite commands such as `perl -pi`, `sed -i`, or similar when replacement text contains markdown/code literals, backticks, `$`, quotes, or other shell-active characters.
- If reassessment proves required consequence fallout, keep the implementation inside the same owned seam and record the widened-but-still-owned boundary in the ticket before closeout.
- After package-manager, lockfile, formatter, generator, or codegen commands, re-read the touched contract files and confirm the generated diff still satisfies ticket invariants before closeout.
- If package-manager output reports audit vulnerabilities, deprecations, or funding notices outside the ticket's owned dependency-remediation scope, record the relevant warning in closeout instead of running broad audit fixes. Only run package-manager repair commands when the ticket explicitly owns dependency remediation or the user approves that scope.
- If the ticket touches world-level canon-writing workflows, preserve append-only canon discipline and documented gates.
- If the ticket only changes docs, tickets, or skills, do not invent runtime/tool changes just to satisfy the original draft.

### 5. Verify at the right boundary

Load `references/verification-closeout.md` from this skill directory (`.codex/skills/implement-ticket/references/`).

Run the narrowest correct verification first, then broaden as needed.

For end-to-end validation tickets, if the drafted acceptance story assumes the composed command already passes, the first narrow proof may be the real package-local command itself or a minimal direct probe of that command's failing seam.

If the drafted narrow proof fails without enough detail to expose the real seam, capture a minimal reproducer or direct probe of the affected function before editing. Use that narrower evidence to confirm the actual bug boundary, then rerun the honest ticket proof after the fix.

For shared package-export tickets, use this quick pre-proof checklist before trusting the consumer lane:

1. producer exports are truthful in `package.json`
2. producer build emits the runtime file and declaration file named by that export
3. consumer proof runs from the real package root after refreshing any local sibling dependency link/install state
4. the consumer's installed dependency artifact contains the new or changed symbols that the proof is meant to exercise
5. existing public-surface tests with import-time IO or side-effect guards still pass, or are extended to cover the new export

If an initial broad package/workspace lane fails and the failure is already clearly outside the owned seam, do not leave that lane in `Acceptance Criteria` or `Test Plan` while implementing. Rewrite the ticket immediately to the honest narrower proof boundary, then continue.

If the symptom is already reproduced but multiple same-seam fixes remain plausible, run a narrow source-to-emission probe before editing so the patch stays minimal and the ticket does not overclaim a broader implementation shape.

If a broader proof copies a live world tree or fixture and inherits generated state, clean or account for that copied state before treating the failure as ticket evidence. Record that harness correction in `Assumption Reassessment` or `## Deviations` when it materially changes the proof story.

If a fixture-backed command or integration test fails after a contract shift, first decide whether the assertion itself is stale or whether the fixture no longer declares the authority source that the assertion expects. When the assertion still matches the live contract, prefer fixing the fixture input and record the ticket as fixture-proof alignment rather than test-harness logic change.

If the drafted proof uses a CLI, confirm the command's working-directory contract before recording it in the ticket. If the CLI resolves paths from `process.cwd()` or another ambient root, either run it from the truthful root or switch to a narrower direct probe that exercises the same owned seam.

If the ticket adds a runnable shell script or npm-script proof surface, apply the same package-root discipline inside the script itself: embedded `node`, `node -e`, or similar package-local probes must launch from the root where local dependencies actually resolve, even when the artifact under inspection lives elsewhere in the repo.

If any ticket classification uses a compiled artifact under `dist/` or another generated output as proof, verify artifact freshness before trusting the result. Prefer running the package build first. If a rebuild is intentionally skipped, compare the exercised source/generated seam or record why the existing generated artifact is the intended proof surface, especially in a dirty worktree with same-package source edits.

In Codex, if a package or CLI proof fails with sandbox-looking child-process errors such as `EPERM` from spawning the built CLI, `git`, `node`, or another subprocess, treat the first failure as a possible environment restriction rather than immediate code evidence. Rerun the same command with the required escalation, then record both the sandbox failure and the successful/failed escalated result in closeout so verification history is truthful.

For precondition failure, unsupported-mode, or rejection-path tickets, prove not only the exit code/message but also that the command fails before creating or mutating derived artifacts, indexes, caches, or other side-effect surfaces unless the ticket explicitly owns that mutation.

Worldloom verification surfaces usually include:

- codebase grep-proof
- schema validation
- skill dry-run
- targeted tool command
- manual review of generated output
- FOUNDATIONS alignment check

Pick the surface that actually proves the owned invariant. A command that merely touches the area does not count as proof.

For tool/index/schema tickets, package-local readonly DB queries and inline `node -e` probes count as `targeted tool command` proof when they directly assert the owned invariant against the real artifact or a truthful temp-copy rebuild.

For `world-index` / index-backed proof, apply the focused checks in `references/world-index.md`.

For compiled TS packages, opaque `node --test` lanes, and transport-client noise, apply the narrowing guidance in `references/verification-closeout.md` instead of expanding the acceptance boundary blindly.

When the fix changes a shared producer/parser/contract seam, recompute any ticket-stated live totals, reproduced witness lists, and neighboring same-seam assertions from the final post-fix artifact instead of carrying forward pre-fix probe values. If the final artifact truthfully changes an adjacent same-seam expectation, update that proof surface before closeout.

### 6. Close out the ticket honestly

Update the active ticket before finishing:

- `Status`
- `Engine Changes`
- `Assumption Reassessment`
- `What to Change` / `Files to Touch` if reassessment changed scope
- `Verification Layers` if the real proof surface changed
- `Acceptance Criteria` / `Test Plan` if the real proof surface changed
- `## Outcome`
- `## Verification Result`
- optional `## Deviations`
- compare the landed file set against `Files to Touch` and `Test Plan` / `New/Modified Tests`, using both `git diff --name-only` and `git status --short` so newly-created untracked files are not missed; then patch the ticket if any touched file or exercised proof surface is still missing. Do not rely on `git diff --stat` or `git diff --name-only` alone for file-set summaries when new files may still be untracked; `git status --short` is the authoritative added-file surface in that case.
- if the ticket changed a shared contract or canonical authority surface, re-check same-seam proof scripts/fixtures referenced by the repo or adjacent tests and make their expectations truthful before finishing
- if the ticket changed a shared producer/parser/contract seam, recompute any ticket-stated live totals, reproduced witness sets, and neighboring same-seam assertions from the final post-fix artifact so the closeout does not preserve stale pre-fix evidence
- compare the edited ticket against `tickets/_TEMPLATE.md` and fix any malformed structure exposed during reassessment or closeout (for example: non-sequential numbering, stale placeholder alternatives, or sections whose shape no longer matches the template contract)
- if the ticket contains embedded code snippets, pseudocode, or literal algorithm sketches, compare them against the landed seam before finishing; update or remove any snippet that no longer matches the truthful final implementation boundary
- if `What to Change`, `Architecture Check`, or another completed-ticket section contains illustrative code or scenario sketches, either update them to landed helper names and command shapes or replace them with prose; do not leave contradicted examples under a completed ticket
- if the ticket touched `worlds/<slug>/` content, do not rely on git-tracked diff alone for the previous check; confirm the touched world files directly or with ignored-path-aware checks so closeout stays truthful even when world content is gitignored
- if the ticket created or changed an ignored `worlds/<slug>/` artifact, verify the exact owned path directly, not just the ignored parent directory; use a direct read, parser probe, count check, or other path-specific assertion that proves the intended file exists and has the expected shape
- if verification rebuilt a live-world index or other derived artifact, classify the resulting dirty state explicitly as expected derived dirt, cleaned state, or unexpected source fallout before finalizing
- if package-manager, build, test, formatter, generator, or codegen commands created or changed ignored package/tool artifacts such as `node_modules/`, `dist/`, coverage output, caches, or compiled test output, classify that ignored state explicitly as expected generated ignored artifacts, cleaned state, or unexpected fallout before finalizing
- if a local sibling package or `file:` dependency was refreshed for proof, record whether the consumer's installed dependency was a symlink or copied install and cite the consumer-resolved artifact check used to prove the consumer saw the changed producer surface
- if package-manager commands emitted security, deprecation, or funding warnings that were not repaired because they were outside scope, mention them in `## Verification Result` or `## Deviations` so closeout does not imply a cleaner dependency state than was observed
- after the final verification rerun, re-read the entire ticket top-to-bottom so earlier authored sections such as `What to Change`, `Architecture Check`, `Verification Layers`, `Acceptance Criteria`, and `Invariants` do not still contain stale pre-reassessment wording
- for completed tickets, re-read `## Problem` specifically and rewrite fixed current-state claims as historical intake evidence (`At intake`, `Before this ticket`, or equivalent) so the completed record does not imply the defect still exists
- when preserving original failure evidence in a completed ticket, label it as historical intake evidence (`At intake`, `Observed before this ticket`, or equivalent) so the completed record does not still read as if the fixed failure is current
- if any explicit user-supplied reference spec/doc was used as the ticket's authority, grep that reference for corrected counts, enum members, command names, paths, default tables, proof commands, risk summaries, or other reassessed claims before final closeout; update same-seam stale reference lines or record why they are outside the active ticket boundary
- when reassessment replaces a central proof surface, run a targeted grep over the active ticket and explicit reference specs/docs for a few old anchor phrases such as stale command names, fixture names, expected error codes, count claims, zero-fail or baseline claims, old command fragments, old tool boundaries, manual-smoke lines, and verification prose; truth any same-seam hits or record why they are intentionally outside the active ticket. If the search pattern contains backticks or other shell-active characters, single-quote or escape the pattern so the shell cannot execute the literal.
- when the proof command shape changes, treat old-command cleanup as a hard closeout stop: grep the active ticket for the previous command fragment and update every same-seam occurrence in `Verification Layers`, `Acceptance Criteria`, `Test Plan`, `## Verification Result`, and `## Deviations` before final response
- when the explicit reference spec/doc contains remaining stale same-seam claims that are intentionally outside the active ticket boundary, record the boundary explicitly in closeout rather than leaving the reference check implicit
- after the final verification rerun, also re-read any edited non-generated docs or READMEs that the ticket touched so same-seam truthing is complete and partially corrected paths, statuses, or design references do not survive closeout
- for `tool or script implementation` tickets whose landed behavior changes a package-local contract, perform the package/tool closeout hard stop in `references/package-tooling.md`: inspect adjacent same-package user-facing docs and examples even if the ticket did not name them explicitly, then either truth them or record why they are outside the active seam
- for tickets that add or change a user-facing CLI, workflow command, or machine-layer command surface, inspect repo-level quick-reference docs such as `docs/WORKFLOWS.md` and `docs/MACHINE-FACING-LAYER.md` when they mention that command surface; truth stale same-seam references or record why another ticket owns them
- for shared-contract tickets, also inspect repo-level authoritative docs or examples outside the package when the live repo treats them as schema authority, generated input, or test-parsed contract fixtures
- when a ticket belongs to an active spec family, check implementation-order or roadmap/status tables such as `specs/IMPLEMENTATION-ORDER.md` for same-seam pending/completed wording even when archival is not in scope
- apply `references/dirty-worktree-ledger.md` before final response; explicitly distinguish owned edits, untracked owned files, pre-existing dirt, externally appeared changes, same-family sibling scope, and expected ignored artifacts in the final response or ticket closeout
- run `git diff --check` or an equivalent whitespace/patch hygiene check before final response when the ticket edited tracked code, docs, or skill files
- when the ticket claims wholesale replacement, removal, or rename of an old implementation path, confirm the superseded files are actually deleted or moved before finishing; if the live seam was removal of an activation path rather than deletion of shared utilities, make the ticket truthfully say which utilities, fixtures, or low-level parsers remain and why

If the ticket's premise was disproved, keep it as a truthful rejection or not-implemented record instead of forcing a fake completion.

If reassessment widened the active ticket by absorbing sibling tickets, make the sibling records truthful too:

- update each absorbed sibling ticket to state that its work landed via the active ticket
- archive absorbed siblings when archival is in scope and the user asked for full completion or archival
- leave unabsorbed siblings active and untouched except for reference fixes that are necessary to keep ownership truthful

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
