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

Read `AGENTS.md`, `docs/FOUNDATIONS.md`, the target ticket, `tickets/_TEMPLATE.md`, and `tickets/README.md` before editing. Read `docs/archival-workflow.md` when archival is actually in scope for the active run: before archiving, when the user explicitly asked for full ticket completion or archival, or when the remaining owned work includes archive/update steps rather than incidental archival references in the ticket/spec prose. If the ticket changes skill HARD-GATE semantics, canon-write ordering, or Mystery Reserve firewall enforcement/gate behavior, also read `docs/HARD-GATE-DISCIPLINE.md` before finalizing reassessment. Read-only retrieval or visibility work that merely surfaces Mystery Reserve constraints does not require that extra read by default.

Reassess first, then implement. Do not treat the ticket as mechanically executable until its assumptions match the current repo.

## Always First

- Resolve the exact live ticket path before trusting ticket wording.
- Snapshot the worktree with `git status --short` and classify unrelated dirty paths before coding.
- Keep a compact dirty-worktree ledger while working: `pre-existing unrelated`, `pre-existing same-seam`, `owned edits`, and `new/untracked owned files`. Refresh it before final response so untracked ticket/code files are not silently omitted.
- If dirty paths overlap the ticket's seam, inspect the live diffs before coding and classify them as unrelated local edits, partial implementation of the active ticket, or in-flight sibling-ticket work.
- In Worldloom, remember that many `worlds/<slug>/` artifacts are gitignored. If the ticket touches world content, do not treat `git status`, `git diff`, or tracked-only checks as exhaustive proof of what changed.
- Read the current ticket contract from `tickets/_TEMPLATE.md` and `tickets/README.md`; do not rely on memory.
- If the ticket names a CLI or package command, verify its `cwd` / repo-root assumptions before trusting it as a proof surface.
- If a drafted proof command uses a workspace filter or root package-manager command (`pnpm --filter ...`, `npm --workspace ...`, `turbo ...`, etc.), verify the root workspace manifests and lockfiles exist before trusting it. If the repo has only package-local manifests, rewrite the proof to package-local commands during reassessment.
- When a ticket mixes package-local build/test commands with a CLI that reads repo-root state via `process.cwd()` or a similar ambient root, split the proof surface truthfully: keep build/type/test commands at the package root, but run the CLI smoke check from the repo root that owns the world/artifact state. Do not force both onto one `cwd`.
- If verification uses an exported function, inline `node -e` probe, or other package-local runtime entrypoint, run it from the package root when module resolution depends on package-local dependencies.
- If the ticket already records runnable verification commands, dry-run the drafted command shape early enough to correct the ticket before implementation, not only during final proof.
- When a package script wraps `node --test`, inspect `package.json` before trusting extra positional args; `pnpm test <path>`, `npm test -- <path>`, or similar passthrough can end up executing a source `.ts` path directly instead of the compiled `dist/...` test and produce misleading `ERR_UNKNOWN_FILE_EXTENSION` failures.
- If the ticket claims it will add or expand a script/test proof surface, verify whether the named file or package-script already exists and already runs before treating that proof work as live delta.
- If the ticket names a checked-in fixture path for proof, verify that the fixture actually exists. When the drafted fixture is missing but the package already has a live temp-seeded or generated-fixture harness, rewrite the ticket to that truthful proof surface before coding instead of treating proof as absent.
- For DB-backed or migration-sensitive package tickets, inspect same-package test helpers and fixture builders that create temp repos, temp DBs, or apply raw migrations before freezing `Files to Touch` or `Test Plan`; stale bootstrap schema, seed contracts, schema-version assertions, table-inventory assertions, and migration-upgrade tests count as same-seam proof fallout when the package's real verification depends on them.
- If a drafted inventory or count proof relies on grep over inline literals, verify whether the live implementation routes those names through exported constants, registries, or helper tables first. When registration is indirect, prefer a runtime probe or exported introspection helper over stale grep-count proof.
- For JS/TS package-local schema, type, or contract tickets, verify whether the drafted compile gate is package-wide (`src/**/*`, `tests/**/*`, or equivalent) before treating it as a narrow proof surface; if downstream consumers compile in the same lane, reassess the owned boundary before coding.
- For JS/TS package-local tickets, treat missing declaration-package compile failures caused by newly typed code as package-manifest fallout when the runtime dependency is already part of the package contract. Add the narrow `@types/*` dependency and lockfile change, then record any package-manager audit/funding warnings in closeout when dependency remediation is outside scope.
- Never run a producer command and its dependent proof command in parallel; treat build-then-test, generate-then-verify, and similar lanes as strictly sequential.
- If a verification command depends on a build, generated artifact, or other producer step, run the producer first and the dependent proof second; do not treat those lanes as parallel-safe.
- In Codex, do not use `multi_tool_use.parallel` for build-then-test, generate-then-verify, or similar producer/consumer lanes; wait for the producer command to finish before launching dependent commands.
- For local sibling package or `file:` dependency proof, use `references/package-tooling.md` for the dependency-refresh and installed-artifact checks; do not assume a consumer is exercising a changed producer until that reference's checks pass.
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

If the primary class is `tool or script implementation`, or the ticket changes a package manifest, package-local command, serializer, hash/checksum, public export, or package-local README/example contract, also load `references/package-tooling.md` from this skill directory and apply its focused reassessment and closeout checks.

When the ticket changes a user-facing tool inventory, command surface, package entrypoint, or registration list, inspect adjacent same-package README/example inventory during reassessment before the first code edit, not only during closeout.

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

Check:

- every path in `Deps`, `Files to Touch`, `Verification Layers`, `Test Plan`, and prose references
- every authoritative consumer of the claimed shared contract across code, tests, and docs; do not stop at same-package files when the live contract is also asserted by repo-level docs, parsed examples, or spec-facing contract references
- when correcting a ticket claim that was derived from an explicit user-supplied reference path, search that reference for the same stale claim and treat same-seam reference truthing as owned fallout before coding
- if a `Deps` entry is a symbolic ticket/spec id rather than a resolvable live path, do not treat it as a missing-file blocker by default; resolve it against the live seam first (code, active specs, archived specs, or sibling tickets) and record the symbolic-id mismatch in `Assumption Reassessment`
- every skill, tool, hook, validator, schema, or doc section named by the ticket
- if a required gate, validator, hook, approval verifier, or other enforcement framework is specified but not implemented in the live repo, do not stub success to satisfy orchestration; either fail closed with a truthful structured unavailable/error result or escalate if multiple safe boundaries are plausible
- for tickets that depend on a third-party or vendor-owned API, hook system, protocol schema, or tool contract, verify the current primary documentation before trusting the ticket/spec wording; if the live contract differs, record that drift in reassessment and truth the local config/docs to the actual API
- every drafted algorithm, tree-shape, parser-behavior, or data-flow claim the ticket relies on; verify these against the live substrate instead of trusting spec prose
- for tickets where filesystem presence controls dispatch, mode selection, migration state, or feature activation, inspect whether existing fixtures, generated artifacts, ignored files, placeholders, or legacy worlds already contain that sentinel path before accepting the drafted condition; prefer the narrowest truthful marker, such as recognized record files, over bare directory existence when placeholders would misroute the live seam
- for cleanup/removal tickets, distinguish removing a live activation path, compatibility mode, or dispatch branch from deleting all related parser utilities, fixtures, or low-level helpers; if tests or hybrid surfaces still lawfully use those utilities, rewrite the ticket to the true removal seam before coding
- for `world-index` / index-backed tickets, and for `world-mcp` tickets involving `stale_index`, `file_versions`, `_index/world.db`, atomic logical rows, or live-corpus index freshness, also load `references/world-index.md` from this skill directory and apply its focused reassessment and verification checks
- every FOUNDATIONS claim or rule reference the ticket relies on
- whether a repo-level doc under `docs/` is the real authority or a tested consumer for the seam you are changing; if tests, helpers, or examples parse that doc directly, treat it as same-seam owned fallout even when the draft ticket excluded it
- whether a claimed schema authority is actually split across `docs/FOUNDATIONS.md`, live skill templates, and spec/docs; if so, inspect the producer templates and record the true authority boundary in `Assumption Reassessment` before coding
- for staged tool/schema tickets, every drafted enum member, union variant, persisted row field, and emitted artifact named by the ticket; verify each against the live type/module authority before trusting storage or emission claims
- for staged tool/schema tickets that translate authored record fields into parser/index rows, graph edges, synthetic nodes, or other derived artifacts, verify the producer-emitted row/edge/type names directly from the parser or persistence code; do not assume the prose field name is the persisted contract
- for staged tool/schema tickets that compare persisted hashes, checksums, canonical serialization, or drift markers across packages, inspect the producer of the stored value and reuse its canonicalization algorithm or record the intentional difference before coding
- for staged tool/schema tickets that emit derived rows into an existing table, inspect the live schema for foreign keys and companion-artifact requirements before coding; if the row must also emit a backing `nodes` record, alias row, cleanup path, or other dependent artifact to satisfy the current contract, treat that as same-seam owned fallout and record it in reassessment
- for staged tool/schema tickets, every drafted structured error code, error taxonomy table, and error enum named by the ticket or spec; verify the live authority (`errors.ts`, shared error docs, or package-local contract surface) before assuming malformed-input or sentinel-error behavior is already representable
- for staged tool/schema or retrieval tickets that emit backing `nodes` rows as implementation detail, verify whether default user-facing tools should surface those backing nodes directly, suppress them, or surface only their source records; record the intended visibility contract in reassessment before coding so synthetic nodes do not leak into default result sets by accident
- for staged tool/schema tickets whose public API omits a scope parameter but whose current helper layer is scope-bound (for example: a world-agnostic public tool over a world-scoped DB opener), verify whether the missing scope can be derived internally before broadening the public contract; if it can, keep the public API stable and record the helper-vs-tool mismatch in reassessment
- for scaffold, package, or build-surface tickets, every drafted built-artifact path, compiled entrypoint, or registration/config target named by the ticket or spec; verify it against the package's actual `tsconfig.json`, build script, and emitted output shape before implementation so example config and acceptance text do not point at a speculative path
- for scaffold, package, or build-surface tickets that draft workspace-level package commands, verify the repo root actually has the claimed package-manager workspace (`package.json`, `pnpm-workspace.yaml`, lockfile, or equivalent). If it does not, correct the ticket to the live package-local command surface before coding.
- for scaffold or package-consumer tickets that import an existing package export map, inspect at least one existing sibling consumer's `tsconfig.json` / resolver settings before choosing the new package's `module` and `moduleResolution`; do not assume default Node resolution can consume an existing export-map path.
- for tickets that name runnable package commands or CLIs, inspect adjacent same-package usage docs/examples early enough to confirm command shape and `cwd` expectations before treating the drafted proof lane as truthful
- for package public-surface tickets that add or change `package.json` `exports`, verify the full producer-consumer contract before trusting the drafted snippet: `require` / `import` / `default` / `types` conditions match the real emitted module format, the producer build actually emits the advertised runtime artifact and `.d.ts` artifact, and the intended consumer package's resolver settings (`moduleResolution`, export-map support, package root) can import that public entry without falling back to a private path
- for new consumer packages that depend on an existing exported public surface, apply the same producer-consumer checks even when the producer export map is not changing: match the consumer resolver settings to the live producer export contract, build the producer if declarations are generated, refresh the local dependency, and confirm the consumer is not compiling against stale installed artifacts
- for tickets that claim to add or expand a script/test proof surface, whether the named script file, shell entrypoint, or package-script already exists and already runs; if it does, narrow the ticket to tightening the existing proof surface before code edits
- for tickets that claim a checked-in fixture-backed proof surface, whether the named fixture file actually exists and whether the package already uses a different live seeding harness; if the fixture path is stale but the harness is real, rewrite the ticket to the live harness before code edits
- for staged ticket families, whether the active ticket is independently landable at its drafted acceptance boundary or whether live same-seam fallout makes the family decomposition false; if downstream consumers in the same package or seam must move together for `docs/FOUNDATIONS.md` closeout to stay truthful, widen the active ticket before coding
- when dirty same-seam edits already exist in files the ticket would touch, whether those edits belong to an in-flight sibling ticket or broader family slice; if they do, narrow, widen, or rewrite the active ticket boundary before code edits instead of treating the seam as clean ownership
- whether the ticket's owned boundary is still real, already landed, narrower than drafted, or blocked by another ticket
- when reassessment narrows or rewrites a shared contract, whether existing same-seam proof scripts, fixtures, or verification docs still encode the old contract; if they do, treat truthful proof-surface upkeep inside that seam as required consequence fallout rather than optional cleanup
- for end-to-end validation / composition tickets whose premise is that an existing live command or pipeline already works at scale, run that command or a minimal direct probe during reassessment before assuming the ticket is test-only or proof-only
- for fixture-backed command or integration tests, verify whether the assertion shape is still truthful before editing the test harness; if the live contract still matches the assertion, check whether the copied fixture source is stale and narrow the ticket to fixture-proof alignment instead of rewriting a still-correct test
Load `references/mismatch-handling.md` from this skill directory (`.codex/skills/implement-ticket/references/`).

Low-risk factual drift should be corrected directly in the ticket during reassessment. Architectural ambiguity, scope growth, or contradictory ownership requires a short 1-3-1 escalation to the user.

When reassessment cleanly narrows the owned delta before coding, patch the ticket's `Problem`, stale evidence-backed statements in `Assumption Reassessment`, `What to Change`, `Files to Touch`, and acceptance/proof text before the first code edit rather than waiting until closeout.

If early probing shows that a drafted broad package/workspace proof lane is already failing for reasons outside the owned seam, remove it from the active acceptance surface before implementation and rewrite the ticket to the strongest truthful narrower proof boundary. Keep the broader lane only as contextual noise or follow-up evidence, not as an active acceptance gate.

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
- `Acceptance Criteria` / `Test Plan` if the real proof surface changed
- `## Outcome`
- `## Verification Result`
- optional `## Deviations`
- compare the landed file set against `Files to Touch` and `Test Plan` / `New/Modified Tests`, using both `git diff --name-only` and `git status --short` so newly-created untracked files are not missed; then patch the ticket if any touched file or exercised proof surface is still missing
- if the ticket changed a shared contract or canonical authority surface, re-check same-seam proof scripts/fixtures referenced by the repo or adjacent tests and make their expectations truthful before finishing
- if the ticket changed a shared producer/parser/contract seam, recompute any ticket-stated live totals, reproduced witness sets, and neighboring same-seam assertions from the final post-fix artifact so the closeout does not preserve stale pre-fix evidence
- compare the edited ticket against `tickets/_TEMPLATE.md` and fix any malformed structure exposed during reassessment or closeout (for example: non-sequential numbering, stale placeholder alternatives, or sections whose shape no longer matches the template contract)
- if the ticket contains embedded code snippets, pseudocode, or literal algorithm sketches, compare them against the landed seam before finishing; update or remove any snippet that no longer matches the truthful final implementation boundary
- if the ticket touched `worlds/<slug>/` content, do not rely on git-tracked diff alone for the previous check; confirm the touched world files directly or with ignored-path-aware checks so closeout stays truthful even when world content is gitignored
- if verification rebuilt a live-world index or other derived artifact, classify the resulting dirty state explicitly as expected derived dirt, cleaned state, or unexpected source fallout before finalizing
- if package-manager commands emitted security, deprecation, or funding warnings that were not repaired because they were outside scope, mention them in `## Verification Result` or `## Deviations` so closeout does not imply a cleaner dependency state than was observed
- after the final verification rerun, re-read the entire ticket top-to-bottom so earlier authored sections such as `What to Change`, `Architecture Check`, `Acceptance Criteria`, and `Invariants` do not still contain stale pre-reassessment wording
- when preserving original failure evidence in a completed ticket, label it as historical intake evidence (`At intake`, `Observed before this ticket`, or equivalent) so the completed record does not still read as if the fixed failure is current
- if any explicit user-supplied reference spec/doc was used as the ticket's authority, grep that reference for corrected counts, enum members, command names, paths, or other reassessed claims before final closeout; update same-seam stale reference lines or record why they are outside the active ticket boundary
- when the explicit reference spec/doc contains remaining stale same-seam claims that are intentionally outside the active ticket boundary, record the boundary explicitly in closeout rather than leaving the reference check implicit
- after the final verification rerun, also re-read any edited non-generated docs or READMEs that the ticket touched so same-seam truthing is complete and partially corrected paths, statuses, or design references do not survive closeout
- for `tool or script implementation` tickets whose landed behavior changes a package-local contract, perform the package/tool closeout hard stop in `references/package-tooling.md`: inspect adjacent same-package user-facing docs and examples even if the ticket did not name them explicitly, then either truth them or record why they are outside the active seam
- for shared-contract tickets, also inspect repo-level authoritative docs or examples outside the package when the live repo treats them as schema authority, generated input, or test-parsed contract fixtures
- refresh the dirty-worktree ledger and explicitly distinguish pre-existing unrelated dirt from owned edits and new/untracked owned files in the final response or ticket closeout
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
