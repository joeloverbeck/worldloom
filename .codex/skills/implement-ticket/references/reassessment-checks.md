# Reassessment Checks

Use this reference after ticket classification when a ticket has non-trivial code, tool, schema, workflow, package, validator, or cross-artifact assumptions. Keep the top-level `SKILL.md` focused on routing and always-first guardrails; put detailed reassessment probes here.

## General Contract Checks

- Check every path in `Deps`, `Files to Touch`, `Verification Layers`, `Test Plan`, and prose references.
- Check every authoritative consumer of the claimed shared contract across code, tests, and docs; do not stop at same-package files when the live contract is also asserted by repo-level docs, parsed examples, or spec-facing contract references.
- When correcting a ticket claim derived from an explicit user-supplied reference path, search that reference for the same stale claim and treat same-seam reference truthing as owned fallout before coding.
- When reassessment changes a staged-family shared contract, file name, schema surface, validator name, command name, or proof boundary, grep active sibling tickets in the same family for the stale claim before coding; truth same-seam sibling references in place or record why they remain outside the active boundary.
- If a `Deps` entry is a symbolic ticket/spec id rather than a resolvable live path, do not treat it as a missing-file blocker by default; resolve it against the live seam first and record the symbolic-id mismatch in `Assumption Reassessment`.
- Check every skill, tool, hook, validator, schema, or doc section named by the ticket.
- Check every FOUNDATIONS claim or rule reference the ticket relies on.
- Check whether a repo-level doc under `docs/` is the real authority or a tested consumer for the seam you are changing; if tests, helpers, or examples parse that doc directly, treat it as same-seam owned fallout even when the draft ticket excluded it.

## Enforcement And Gate Checks

- If a required gate, validator, hook, approval verifier, or other enforcement framework is specified but not implemented in the live repo, do not stub success to satisfy orchestration; either fail closed with a truthful structured unavailable/error result or escalate if multiple safe boundaries are plausible.
- For integration or capstone tickets blocked by an absent validator, gate, hook, or approval framework, a test-only injection seam is acceptable only when the production/default behavior still fails closed, the injection is explicit at the call site, and the ticket records why the seam proves integration behavior without bypassing the real hard gate.
- For engine-only canon writes where `mcp__worldloom__submit_patch_plan` is unavailable in the Codex toolset, load `patch-engine-codex-fallback.md` and use the local patch-engine fallback only if it preserves the same source-write boundary. Do not direct-edit `_source/*.yaml` as a convenience fallback.

## Tool, Schema, And Package Checks

- For tickets that depend on a third-party or vendor-owned API, hook system, protocol schema, or tool contract, verify the current primary documentation before trusting the ticket/spec wording; if the live contract differs, record that drift in reassessment and truth the local config/docs to the actual API.
- Verify every drafted algorithm, tree-shape, parser-behavior, or data-flow claim against the live substrate instead of trusting spec prose.
- For tickets where filesystem presence controls dispatch, mode selection, migration state, or feature activation, inspect whether existing fixtures, generated artifacts, ignored files, placeholders, or legacy worlds already contain that sentinel path before accepting the drafted condition; prefer the narrowest truthful marker, such as recognized record files, over bare directory existence.
- For cleanup/removal tickets, distinguish removing a live activation path, compatibility mode, or dispatch branch from deleting all related parser utilities, fixtures, or low-level helpers; if tests or hybrid surfaces still lawfully use those utilities, rewrite the ticket to the true removal seam before coding.
- For `world-index` / index-backed tickets, and for `world-mcp` tickets involving `stale_index`, `file_versions`, `_index/world.db`, atomic logical rows, or live-corpus index freshness, also load `world-index.md` and apply its focused reassessment and verification checks.
- For staged tool/schema tickets, verify every drafted enum member, union variant, persisted row field, and emitted artifact against the live type/module authority before trusting storage or emission claims.
- For staged tool/schema tickets, apply the focused parser, persistence, hash, generated-operation, and response-shape checks in `package-tooling.md`; keep those details out of the top-level workflow.
- For staged package, scaffold, public export, workspace-command, runnable CLI, package-consumer, fixture-backed, or script/test proof tickets, apply the focused reassessment checks in `package-tooling.md` instead of relying on the top-level workflow summary.

## Authority And Vocabulary Checks

- If a claimed schema authority is split across `docs/FOUNDATIONS.md`, live skill templates, and spec/docs, inspect the producer templates and record the true authority boundary in `Assumption Reassessment` before coding.
- For centralized vocabulary or enum tickets, compare the candidate list against authoritative doc taxonomies and paired concern names in `docs/FOUNDATIONS.md`, not only against the ticket's drafted enum members or current failing values; missing authoritative categories can be real same-seam fallout even when no current fixture uses them.
- For validator CLI or filter tickets, verify whether named rules/checks are actually mechanized before exposing them through command flags, help text, selectors, or tests; rules that remain skill-judgment-only must be rejected, omitted, or explicitly documented rather than silently accepted as empty selections.

## Ownership And Boundary Checks

- For contract-guard tickets that protect a field, pointer, invariant, error code, validator rule, or bidirectional relationship, search for every writer of the same protected surface before coding: direct ops, auto-add helpers, side-effecting convenience paths, generated operations, and tests/fixtures that mutate the same field. Treat any alternate writer that can bypass the new guard as same-seam required fallout, and re-run the search before closeout when the final implementation adds new helper paths.
- For staged package/tool/schema tickets that claim a downstream ticket, skill, or package can `import` an exported helper, constant, validator, type, or schema, inspect the producer package's `package.json` export map before accepting that claim. Choose and record the truthful boundary: public package subpath, same-package source-module import, generated declaration surface, or prose-only source-of-truth reference.
- For staged ticket families, check whether the active ticket is independently landable at its drafted acceptance boundary or whether live same-seam fallout makes the family decomposition false; if downstream consumers in the same package or seam must move together for `docs/FOUNDATIONS.md` closeout to stay truthful, widen the active ticket before coding.
- When dirty same-seam edits already exist in files the ticket would touch, determine whether those edits belong to an in-flight sibling ticket or broader family slice; if they do, narrow, widen, or rewrite the active ticket boundary before code edits instead of treating the seam as clean ownership.
- Check whether the ticket's owned boundary is still real, already landed, narrower than drafted, or blocked by another ticket.
- When reassessment narrows or rewrites a shared contract, check whether existing same-seam proof scripts, fixtures, or verification docs still encode the old contract; if they do, treat truthful proof-surface upkeep inside that seam as required consequence fallout rather than optional cleanup.

## Proof-Boundary Checks

- For end-to-end validation / composition tickets whose premise is that an existing live command or pipeline already works at scale, run that command or a minimal direct probe during reassessment before assuming the ticket is test-only or proof-only.
- For validator, audit, or live-corpus baseline tickets, keep any early live-corpus baseline classification current as implementation changes the validator/tool behavior; recompute the final baseline from the post-fix artifact before closeout.
- For fixture-backed command or integration tests, verify whether the assertion shape is still truthful before editing the test harness; if the live contract still matches the assertion, check whether the copied fixture source is stale and narrow the ticket to fixture-proof alignment instead of rewriting a still-correct test.
