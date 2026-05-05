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

Read `AGENTS.md`, `docs/FOUNDATIONS.md`, the target ticket, `tickets/_TEMPLATE.md`, and `tickets/README.md` before editing. Read `docs/archival-workflow.md` when archival is actually in scope for the active run: before archiving, when the user explicitly asked for full ticket completion or archival, or when the remaining owned work includes archive/update steps rather than incidental archival references in the ticket/spec prose. If the ticket will submit a patch plan or mutate engine-only source under `worlds/<slug>/_source/` or `worlds/<slug>/stories/<story-slug>/_source/`, read `docs/HARD-GATE-DISCIPLINE.md` before preparing or submitting the plan. If the ticket changes skill HARD-GATE semantics, canon-write ordering, Mystery Reserve firewall enforcement/gate behavior, approval-token behavior, `validate_patch_plan`, `submit_patch_plan`, pre-apply validation, or other machine-facing validation signals used by HARD-GATE flows, also read `docs/HARD-GATE-DISCIPLINE.md` before finalizing reassessment. A pure command substitution inside an unchanged gated sequence, such as replacing one bootstrap command with another while preserving order, approval, failure handling, and validation signals, does not require the extra read by itself. Read-only introspection of envelope, approval-token, pre-apply, `validate_patch_plan`, or `submit_patch_plan` contracts still counts as a machine-facing validation-signal change for reassessment; read-only retrieval or visibility work that merely surfaces Mystery Reserve constraints does not require that extra read by default. Retrieval-time error recovery or diagnostic audit fields also do not require the extra HARD-GATE read by themselves unless they alter `validate_patch_plan`, `submit_patch_plan`, approval-token behavior, pre-apply validation, or a canon-mutation gate.

Reassess first, then implement. Do not treat the ticket as mechanically executable until its assumptions match the current repo.

## Execution Map

Use this as the default path, then apply the detailed rules below when the ticket's shape needs them:

1. Resolve the live ticket/spec paths inside the active repo/worktree and snapshot the worktree.
2. Read the required repo contracts (`AGENTS.md`, `docs/FOUNDATIONS.md`, ticket template/readme, ticket, and explicit references).
3. Classify the ticket and load only the focused reference docs needed for that class. For validator or JSON Schema tickets, load `references/validator-schema-migrations.md` before reassessment edits.
4. Reassess ticket claims against the live repo; patch low-risk factual drift before code edits.
5. State the owned implementation slice to the user, then make minimal edits.
6. Run the narrowest truthful proof first, then any required broader package/workflow gate.
7. Close out the ticket text, rerun final proof if closeout changed a checked contract, refresh dirty/ignored-artifact state, and report exactly what changed. During closeout, explicitly re-check the active ticket's `Status`, `Verification Layers`, `Files to Touch`, `New/Modified Tests`, `Commands`, `Outcome`, `Verification Result`, and `Deviations` against the landed diff and commands.

### Mandatory References By Phase

Use this compact checklist so required references are not skipped:

1. Intake: `references/ticket-classification.md` and `references/dirty-worktree-ledger.md`.
2. Reassessment: `references/reassessment-checks.md` for non-trivial tickets, plus `references/mismatch-handling.md`.
3. Class-specific: `references/package-tooling.md`, `references/validator-schema-migrations.md`, `references/world-index.md`, or `references/patch-engine-codex-fallback.md` when the classification or proof surface calls for them.
4. Verification and closeout: `references/verification-closeout.md` before final proof and completed-ticket truthing.

Keep this top-level skill as the routing and hard-stop contract. When adding narrow package, proof, generated-artifact, or closeout guidance, prefer the focused reference files above instead of expanding `SKILL.md`.

## Always First

- Resolve the exact live ticket path before trusting ticket wording.
- The target ticket path must resolve inside the active repo/worktree. If it does not, stop before implementation: report the missing path, the active repo root, and any diagnostic same-name hits found elsewhere, then ask the user to correct the cwd/path or explicitly retarget the run. Do not edit a sibling repository under this skill just because a matching ticket exists there.
- Searches outside the active repo/worktree are diagnostic only. Use them to identify likely cwd/path mistakes, not as authorization to switch repos. If the user explicitly supplies an absolute ticket path outside the current repo, re-root the run to that ticket's repository, reload that repo's `AGENTS.md` and applicable instructions, and use that repo's workflow rather than Worldloom-specific assumptions.
- Snapshot the worktree with `git status --short` and classify unrelated dirty paths before coding.
- Load `references/dirty-worktree-ledger.md` and keep the dirty-worktree ledger current throughout the run, including initial overlap, mid-run same-file changes, same-family sibling scope, and ignored artifacts.
- When a pre-existing dirty file must also be edited for the active ticket, track ownership at hunk or topic level from the start. Do not wait until final response to decide which same-file changes are ticket-owned, pre-existing, externally appeared, or sibling-scope.
- For package/tool tickets, use `references/package-tooling.md` for detailed package command, dependency, fixture, generated-artifact, and public-surface checks. Keep new specialized package/tool guidance in that reference instead of expanding this top-level flow.
- Before the first package command likely to create ignored artifacts, run a targeted ignored-aware status snapshot for the affected package directories. After package commands finish, refresh the same ignored-aware status and classify new or changed ignored artifacts in the dirty-worktree ledger.
- In Worldloom, remember that many `worlds/<slug>/` artifacts are gitignored. If the ticket touches world content, do not treat `git status`, `git diff`, or tracked-only checks as exhaustive proof of what changed.
- For world-content writes, keep the write surface explicit:
  - `worlds/<slug>/_source/*.yaml` atomic canon records are engine-only. Use `mcp__worldloom__submit_patch_plan` when it is exposed.
  - `worlds/<slug>/stories/<story-slug>/_source/<class>/*.yaml` story-bundle records are also engine-only. Story-bundle markdown surfaces such as `STORY_KERNEL.md`, `INDEX.md`, `pages-prose/`, `audits/`, `storylet-batches/`, `story-promotions/`, and remediation proposal cards remain direct-write surfaces unless the ticket or live workflow says otherwise.
  - Hybrid world files such as `characters/*.md`, `diegetic-artifacts/*.md`, and `adjudications/*.md` may be direct-edited only when the ticket or live phase precedent proves that direct edit is currently permitted. Otherwise route through the corresponding engine op or escalate.
  - Derived artifacts such as `_index/world.db` are regenerated, not hand-edited.
- Read the current ticket contract from `tickets/_TEMPLATE.md` and `tickets/README.md`; do not rely on memory.
- Open every explicit `Deps` path, evidence-ticket path, or archived-ticket path named by the ticket before coding. For completed or archived dependencies, inspect closeout sections such as `## Outcome`, `## Verification Result`, and `## Deviations` for same-seam fallout that may already partially implement, narrow, or contradict the active ticket. If a named dependency is intentionally not authoritative for this run, record why in `Assumption Reassessment`.
- If a `Deps` entry is a symbolic ticket/spec id rather than a path, resolve it with `rg --files` or an equivalent exact-path search before treating it as missing.
- When using `rg`, `grep`, or shell searches over markdown/code literals, quote shell-active patterns safely from the start. Prefer single-quoted literal patterns for backticks, `$`, pipes, and parentheses; for example: ``rg -n 'No `foo` entry' ticket.md``.
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
- `canon-mutating world-content cleanup`
- `archive / rejection / no-op validation`

Use the classification to choose which repo surfaces must be read and which verification layers are required.

If one primary class also changes a real shared contract, keep the primary classification but also apply the consumer and verification checks from `cross-skill or cross-artifact contract`.

If the primary class is `docs-only / contract-truthing` or `skill rewrite or skill-local behavior` but the strongest proof is a read-only package handler, CLI, or compiled artifact probe, keep the implementation boundary on docs/skills and apply only the relevant package-proof hygiene from `references/package-tooling.md` and `references/verification-closeout.md`. Do not widen the ticket into package code changes just because the proof route exercises a package artifact.

If the primary class is `tool or script implementation`, or the ticket changes a package manifest, package-local command, serializer, hash/checksum, public export, or package-local README/example contract, also load `references/package-tooling.md` from this skill directory and apply its focused reassessment and closeout checks. Keep specialized package behavior in that reference instead of expanding the top-level workflow.

For package/tool tickets, do the compact package checkpoint in `references/package-tooling.md` before coding.

If the ticket changes a validator, JSON Schema, hybrid frontmatter parser, validation registry, grandfathering/waiver matcher, live-corpus validator baseline, or validator-package capstone / verification-matrix coverage, also load `references/validator-schema-migrations.md` from this skill directory and apply its focused reassessment, verification, and closeout checks.

For staged validator/schema/parser details, prefer `references/validator-schema-migrations.md` as the detailed authority and keep this top-level workflow as the routing checklist.

If the ticket mutates world canon, retcons canon history, reconciles `_source/*.yaml` records, or performs canon-safe cleanup through existing patch-engine ops, classify it as `canon-mutating world-content cleanup`. Read `docs/HARD-GATE-DISCIPLINE.md` before preparing or submitting a plan. If `mcp__worldloom__submit_patch_plan` is unavailable, load `references/patch-engine-codex-fallback.md`. If the proof uses `_index/world.db`, `world-index sync`, or `world-index verify`, also load `references/world-index.md`.

For package/tool user-facing surfaces, validator/audit/live-corpus surfaces, and world-index proof details, use the focused reference files rather than expanding this top-level router.

### 1. Load the ticket context

1. Read the target ticket file.
2. Read every directly relevant reference it names: spec files, docs, skill files, tool files, templates, examples, or archived tickets/specs.
3. If a named reference is historical provenance rather than the current authority, such as an archived brainstorming note for a live skill, you may use the live skill/tool/doc as the authority instead. Record the skipped provenance reference in `Assumption Reassessment` when it affects scope, proof, or ownership.
4. Read any explicit user-supplied reference paths from the invocation, even if the ticket itself does not name them.
5. If an explicit user-supplied reference path uses a glob, shorthand, or near-match typo, resolve the first exact live path before trusting or reading it.
6. If an explicit user-supplied reference glob or shorthand resolves to zero live paths, do not block the run by default. Record the miss in `Assumption Reassessment`, name the fallback live authority surface you are using instead, and continue.
7. If the invocation uses a glob, shorthand, or near-match typo for the ticket path, resolve the first exact live ticket path inside the active repo/worktree before doing anything else. If no target ticket resolves there, stop and ask for a corrected target instead of falling back to a sibling repo.
8. If ticket prose names a bare `references/<file>.md` path and the local-relative lookup fails, search `.codex/skills/*/references/` and `.claude/skills/*/references/` before treating it as missing. Prefer the skill context implied by the cited rule or section name, and record the resolved authority in `Assumption Reassessment` when it affects scope, proof, or ownership.
9. If the ticket belongs to a numbered family, inspect sibling tickets only far enough to confirm current ownership boundaries.
10. Check whether the active ticket is tracked or untracked; keep that in mind during closeout.
11. Snapshot the worktree with `git status --short` before coding and keep unrelated paths out of ticket fallout unless the ticket truly owns them.
12. If dirty files overlap the active seam, inspect their diffs and any sibling ticket/archive move state before coding so same-seam in-flight work is classified truthfully.
13. If the ticket lives under a worktree path, treat that worktree root as the repo root for all reads and writes.
14. Before the first edit, state a repo identity checkpoint: active repo root, active ticket path, instruction source (`AGENTS.md` path), and whether any sibling-repo hits were found and excluded as diagnostic-only.

If a `Deps` field explicitly says `None` and mentions prior ticket ids only to distinguish provenance or adjacent completed work, do not force archived-ticket reads for those ids by default. Record the non-dependency/provenance boundary in `Assumption Reassessment` when it affects scope, proof, or ownership.

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

If the user asks you to reassess options against `docs/FOUNDATIONS.md`, pause implementation and rerun the option analysis against the exact FOUNDATIONS rule, schema, or workflow section that controls the boundary. State the recommendation you are changing or preserving, why each viable option does or does not satisfy FOUNDATIONS, and patch the active ticket before source edits when the accepted option changes scope, proof, or owned files.

When reassessment cleanly narrows the owned delta before coding, patch the ticket's `Problem`, stale evidence-backed statements in `Assumption Reassessment`, `What to Change`, `Files to Touch`, and acceptance/proof text before the first code edit rather than waiting until closeout.

When a ticket presents implementation alternatives such as Option A / Option B / Option C, treat the option choice as reassessment when it changes the owned files, proof surface, or shared-contract boundary. Patch the active ticket to the chosen option before source edits, even if the code change itself is straightforward.

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

Before the first source edit, if reassessment changed the file set, proof surface, docs consumers, or shared-contract boundary, patch the active ticket now. Do not wait for closeout to add newly discovered same-seam docs, tests, or command substitutions to `Files to Touch`, `Verification Layers`, `Acceptance Criteria`, or `Test Plan`.

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
- when editing `.claude/skills/<skill>/references/*`, `.claude/skills/<skill>/templates/*`, or another skill-local reference for a command, tool, fallback, or contract shape, inspect the parent `.claude/skills/<skill>/SKILL.md` summary, process-flow, prerequisite, gate, and pointer language before the first source edit. If those parent sections still state the old shape, add the parent `SKILL.md` to the active ticket's `Files to Touch` and proof surface during reassessment instead of waiting for closeout to discover the stale summary.

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

Use `references/verification-closeout.md` for detailed proof-narrowing rules, including failed broad lanes, stale fixtures, generated artifacts, shell-safe stale-anchor sweeps, and compiled-output probes.

For package/tool proof details, use `references/package-tooling.md`: package roots, build/test scripts, local dependency freshness, public export checks, ignored artifact snapshots, same-package docs/examples, and direct-MCP substitution rules all live there.

In Codex, if a package or CLI proof fails with sandbox-looking child-process errors such as `EPERM` from spawning the built CLI, `git`, `node`, or another subprocess, treat the first failure as a possible environment restriction rather than immediate code evidence. If the failing command is only a wrapper/probe that spawns the actual CLI, first consider decomposing the proof into setup plus direct CLI invocation from the correct temp or package root when that preserves the same public proof boundary. If the direct invocation still hits sandbox restrictions, rerun the same command with the required escalation. Record the original sandbox failure and the successful/failed substitute or escalated result in closeout so verification history is truthful.

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

If acceptance names a CLI command but the implementation lands in a shared handler or library path, prove the CLI surface intentionally. Either add/run a focused CLI assertion for the new success or failure mode, or rewrite the ticket acceptance to state the truthful proof boundary: handler proof plus existing CLI-delegation coverage.

When the fix changes a shared producer/parser/contract seam, recompute any ticket-stated live totals, reproduced witness lists, and neighboring same-seam assertions from the final post-fix artifact instead of carrying forward pre-fix probe values. If the final artifact truthfully changes an adjacent same-seam expectation, update that proof surface before closeout.

### 6. Close out the ticket honestly

Update the active ticket before finishing:

- title / H1 and summary metadata such as `Status`, `Priority`, `Effort`, `Engine Changes`, and `Deps`
- `Status`
- `Engine Changes`
- `Assumption Reassessment`
- `What to Change` / `Files to Touch` if reassessment changed scope
- `Verification Layers` if the real proof surface changed
- `Acceptance Criteria` / `Test Plan` if the real proof surface changed
- `## Outcome`
- `## Verification Result`
- optional `## Deviations`

Then run the closeout hard stops from the focused references:

- Use `references/verification-closeout.md` for completed-ticket truthing, stale-anchor sweeps, historicalized problem text, exact proof-command wording, shell-safe grep patterns, and final-proof timing.
- Use `references/package-tooling.md` for package/tool public-surface sweeps, package docs/examples, `describe_capabilities` metadata, local dependency refresh, and generated/ignored package artifacts.
- Use `references/dirty-worktree-ledger.md` for final ownership classification, including untracked owned files, pre-existing dirt, externally appeared changes, sibling scope, and expected ignored artifacts.
- If world content or ignored world artifacts were touched, verify the exact paths directly; git-tracked status is not enough.
- If the ticket changed a shared contract, proof fixture, same-seam doc, or authoritative registry, re-check the corresponding same-seam consumers before finishing.
- Run `git diff --check` or an equivalent whitespace/patch hygiene check before final response when the ticket edited code, docs, tickets, or skill files. If owned edited files are still untracked, remember that plain `git diff --check` will not inspect them; run a real equivalent such as `git add -N <owned-untracked-paths>` followed by `git diff --check -- <owned-paths>`, or another explicit untracked-file whitespace check, and record which method covered the untracked files. If you used `git add -N` only for hygiene coverage, clear those intent-to-add entries with `git reset -- <owned-untracked-paths>` after the check and refresh `git status --short`.

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
