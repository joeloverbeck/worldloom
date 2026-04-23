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
- In Worldloom, remember that many `worlds/<slug>/` artifacts are gitignored. If the ticket touches world content, do not treat `git status`, `git diff`, or tracked-only checks as exhaustive proof of what changed.
- Read the current ticket contract from `tickets/_TEMPLATE.md` and `tickets/README.md`; do not rely on memory.
- If the ticket names a CLI or package command, verify its `cwd` / repo-root assumptions before trusting it as a proof surface.
- If verification uses an exported function, inline `node -e` probe, or other package-local runtime entrypoint, run it from the package root when module resolution depends on package-local dependencies.
- If the ticket already records runnable verification commands, dry-run the drafted command shape early enough to correct the ticket before implementation, not only during final proof.
- For JS/TS package-local schema, type, or contract tickets, verify whether the drafted compile gate is package-wide (`src/**/*`, `tests/**/*`, or equivalent) before treating it as a narrow proof surface; if downstream consumers compile in the same lane, reassess the owned boundary before coding.
- Never run a producer command and its dependent proof command in parallel; treat build-then-test, generate-then-verify, and similar lanes as strictly sequential.
- If a verification command depends on a build, generated artifact, or other producer step, run the producer first and the dependent proof second; do not treat those lanes as parallel-safe.
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

### 1. Load the ticket context

1. Read the target ticket file.
2. Read every directly relevant reference it names: spec files, docs, skill files, tool files, templates, examples, or archived tickets/specs.
3. Read any explicit user-supplied reference paths from the invocation, even if the ticket itself does not name them.
4. If an explicit user-supplied reference path uses a glob, shorthand, or near-match typo, resolve the first exact live path before trusting or reading it.
5. If the invocation uses a glob, shorthand, or near-match typo for the ticket path, resolve the first exact live ticket path before doing anything else.
6. If the ticket belongs to a numbered family, inspect sibling tickets only far enough to confirm current ownership boundaries.
7. Check whether the active ticket is tracked or untracked; keep that in mind during closeout.
8. Snapshot the worktree with `git status --short` before coding and keep unrelated paths out of ticket fallout unless the ticket truly owns them.
9. If the ticket lives under a worktree path, treat that worktree root as the repo root for all reads and writes.

### 2. Reassess assumptions before coding

Validate the ticket against the live repo, not against the spec draft alone.

If a prior review reopened this same ticket by blocking archival on an owned issue, treat that review finding as current reassessment evidence. Resume the same ticket rather than creating a new one, fix the owned blocker, rerun the final proof, and only then restore `COMPLETED` / archive-ready closeout text.

Check:

- every path in `Deps`, `Files to Touch`, `Verification Layers`, `Test Plan`, and prose references
- every skill, tool, hook, validator, schema, or doc section named by the ticket
- every drafted algorithm, tree-shape, parser-behavior, or data-flow claim the ticket relies on; verify these against the live substrate instead of trusting spec prose
- for `world-index` content tickets that mention adjudication YAML placement or `unexpected_yaml_section`, inspect `tools/world-index/src/parse/yaml.ts` before trusting any ticket claim about a canonical adjudication YAML section; the live parser may treat all adjudication fenced YAML as out-of-section
- every FOUNDATIONS claim or rule reference the ticket relies on
- whether a claimed schema authority is actually split across `docs/FOUNDATIONS.md`, live skill templates, and spec/docs; if so, inspect the producer templates and record the true authority boundary in `Assumption Reassessment` before coding
- for staged tool/schema tickets, every drafted enum member, union variant, persisted row field, and emitted artifact named by the ticket; verify each against the live type/module authority before trusting storage or emission claims
- for staged ticket families, whether the active ticket is independently landable at its drafted acceptance boundary or whether live same-seam fallout makes the family decomposition false; if downstream consumers in the same package or seam must move together for `docs/FOUNDATIONS.md` closeout to stay truthful, widen the active ticket before coding
- whether the ticket's owned boundary is still real, already landed, narrower than drafted, or blocked by another ticket
- for end-to-end validation / composition tickets whose premise is that an existing live command or pipeline already works at scale, run that command or a minimal direct probe during reassessment before assuming the ticket is test-only or proof-only
- for end-to-end tests that copy a live world tree or fixture, inspect copied generated-state directories such as `_index/` before trusting a "fresh build" proof path; strip or account for inherited generated state so setup drift is not misdiagnosed as current-ticket fallout
- for index-backed build/sync/verify tickets, prefer temp-copy probes over live-world `_index/` state when proving rebuild behavior or unresolved-reference cleanup
- when replacing a drafted tool/index command with a manual probe, confirm the probe uses the same artifact root, package/module-resolution root, and source-node/filter boundary as the live producer path; do not scan a broader substrate ad hoc and treat that result as equivalent evidence
- when proof moves to a temp copy or alternate root, retarget all dependent readonly queries and follow-on commands to that same rebuilt artifact root instead of mixing live generated state with temp-copy proof

Load `references/mismatch-handling.md` from this skill directory (`.codex/skills/implement-ticket/references/`).

Low-risk factual drift should be corrected directly in the ticket during reassessment. Architectural ambiguity, scope growth, or contradictory ownership requires a short 1-3-1 escalation to the user.

When reassessment cleanly narrows the owned delta before coding, patch the ticket's `What to Change`, `Files to Touch`, and acceptance/proof text before the first code edit rather than waiting until closeout.

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
- If the ticket touches world-level canon-writing workflows, preserve append-only canon discipline and documented gates.
- If the ticket only changes docs, tickets, or skills, do not invent runtime/tool changes just to satisfy the original draft.

### 5. Verify at the right boundary

Load `references/verification-closeout.md` from this skill directory (`.codex/skills/implement-ticket/references/`).

Run the narrowest correct verification first, then broaden as needed.

For end-to-end validation tickets, if the drafted acceptance story assumes the composed command already passes, the first narrow proof may be the real package-local command itself or a minimal direct probe of that command's failing seam.

If the drafted narrow proof fails without enough detail to expose the real seam, capture a minimal reproducer or direct probe of the affected function before editing. Use that narrower evidence to confirm the actual bug boundary, then rerun the honest ticket proof after the fix.

If the symptom is already reproduced but multiple same-seam fixes remain plausible, run a narrow source-to-emission probe before editing so the patch stays minimal and the ticket does not overclaim a broader implementation shape.

If a broader proof copies a live world tree or fixture and inherits generated state, clean or account for that copied state before treating the failure as ticket evidence. Record that harness correction in `Assumption Reassessment` or `## Deviations` when it materially changes the proof story.

If the drafted proof uses a CLI, confirm the command's working-directory contract before recording it in the ticket. If the CLI resolves paths from `process.cwd()` or another ambient root, either run it from the truthful root or switch to a narrower direct probe that exercises the same owned seam.

Worldloom verification surfaces usually include:

- codebase grep-proof
- schema validation
- skill dry-run
- targeted tool command
- manual review of generated output
- FOUNDATIONS alignment check

Pick the surface that actually proves the owned invariant. A command that merely touches the area does not count as proof.

For tool/index/schema tickets, package-local readonly DB queries and inline `node -e` probes count as `targeted tool command` proof when they directly assert the owned invariant against the real artifact or a truthful temp-copy rebuild.

If a broad JS/TS `node --test <file>` lane fails opaquely, isolate the failing seam with a narrower reporter or `--test-name-pattern` before treating the full-file failure as ticket evidence. Use the isolated result to decide whether the broad lane is current-ticket fallout or unrelated noise.

If the broad `node --test <file>` lane remains file-opaque but isolated subtests pass, run the compiled test file directly from the same package root before classifying the broad lane as noisy. Direct execution can expose subtest-local TAP output or assertion traces that the harness-level invocation did not surface.

If an isolated JS/TS `node --test` lane still fails without surfacing the owned seam, rerun the exact assertion logic outside the test harness with a direct package-local probe that exercises the same invariant against the same rebuilt artifact root. When that direct probe is the clearest truthful boundary, record it as the acceptance surface and classify the still-opaque harness lane as noisy/non-acceptance proof instead of overclaiming it.

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
- compare the landed diff against `Files to Touch` and `Test Plan` / `New/Modified Tests`, then patch the ticket if any touched file or exercised proof surface is still missing
- compare the edited ticket against `tickets/_TEMPLATE.md` and fix any malformed structure exposed during reassessment or closeout (for example: non-sequential numbering, stale placeholder alternatives, or sections whose shape no longer matches the template contract)
- if the ticket touched `worlds/<slug>/` content, do not rely on git-tracked diff alone for the previous check; confirm the touched world files directly or with ignored-path-aware checks so closeout stays truthful even when world content is gitignored
- after the final verification rerun, re-read the entire ticket top-to-bottom so earlier authored sections such as `What to Change`, `Architecture Check`, `Acceptance Criteria`, and `Invariants` do not still contain stale pre-reassessment wording

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
