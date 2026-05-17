# SPEC40STOPIPELE-003: Add `hook6-guard-story-markdown-hash` for PG plan-hash integrity at write time

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — introduces new Hook 6 (`tools/hooks/src/hook6-guard-story-markdown-hash.ts` + paired test); registers it in `.claude/settings.json.example`; updates `tools/hooks/README.md` for the new gate; adds cross-references in `.claude/skills/_shared-templates/story-state-contract.md` and `.claude/skills/branching-story-prose-attach/SKILL.md`. No impact on Hooks 1-5.
**Deps**: None

## Problem

At intake, D3 of SPEC-40 identified a write-path gap: `tools/hooks/src/hook3-guard-direct-edit.ts:39-43` allowed all paths outside `_source/` (returned `{ decision: "allow" }` for any path that was neither `worlds/<slug>/_source/` nor `stories/<slug>/_source/`), and `tools/hooks/README.md:15` explicitly enumerated `pages-prose/`, `pages-prose-plans/`, `INDEX.md`, `storylet-batches/`, `story-promotions/` as permitted markdown surfaces. No sibling hook in `tools/hooks/src/` (Hooks 1, 2, 4, 5) intercepted markdown writes. Skill-level plan-hash verification at `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 2 read both the plan body and the PG record, computed fresh hashes via `tools/world-mcp/dist/src/cli/compute-pg-hashes.js`, and recorded FAIL in the receipt's `checks.hash_integrity` field — but the check fired only when `branching-story-prose-attach` was explicitly invoked and detected drift rather than blocking the INDEX update. Before this ticket, a direct write to `pages-prose-plans/PG-<integer>.md` followed by a manual `INDEX.md` update could bypass verification entirely; the PG plan-hash audit bridge between machine state and rendered prose could drift before any later check fired.

## Assumption Reassessment (2026-05-17)

1. Codebase: `tools/hooks/src/hook3-guard-direct-edit.ts:39-43` confirms the fail-open path for non-`_source/` markdown; `tools/hooks/README.md:15` confirms the explicit allow; `tools/hooks/src/lib/` exports `hook-io.ts` (`readHookInput`, `emitPermissionDecision`), `logging.ts` (`logDecision`), `pathing.ts` — these are the helpers Hook 6 will mirror from Hook 3's pattern. `tools/world-mcp/src/cli/compute-pg-hashes.ts` declares CLI args `--plan <plan-md-path> --pg <pg-record-path>` and computes `sha256` of the plan file's raw bytes per its inline help text (lines 15-40) and `computePlanHash(planResult.bytes)` call. `PG.plan.plan_hash` is a declared field at `tools/validators/src/schemas/story-page.schema.json:148` and documented at `.claude/skills/_shared-templates/story-state-contract.md:277` Phase 5a.
2. Spec: SPEC-40 §D3 names the hook source + test + settings registration + 3 cross-reference updates. The auditor's recommendation covers both the plan-file gate and the INDEX update gate; the spec's §Key design decisions explicitly chose to cover both surfaces.
3. Cross-skill boundary: the new hook intercepts at the Claude Code PreToolUse tool-invocation boundary (same boundary as Hooks 1-5); it does NOT live inside the patch engine or the MCP server. The shared contract under audit is the PG plan-hash audit bridge — the hash stamped on `PG.plan.plan_hash` must equal the SHA-256 of the bytes at `pages-prose-plans/PG-<integer>.md` for replay/audit reproducibility. The hook enforces this at write time as a fail-closed gate; the skill-level check in `branching-story-prose-attach` remains as a belt-and-suspenders post-discovery check.
4. FOUNDATIONS principle: §Story Bundles §4a Plan-Authority Boundary at `docs/FOUNDATIONS.md:590` motivates the gate — the page plan is the authoritative engine artifact; any drift between `PG.plan.plan_hash` and the on-disk plan body breaks the boundary the rule establishes. The hook is the structural enforcement of the boundary the prose has documented since SPEC-05 Part B (Phase 2).
5. Canon Safety surface: Hook 6 is a write-path gate parallel to Hook 3 (which blocks raw Edit/Write on `_source/*.yaml`). Hook 6 blocks raw Edit/Write on `pages-prose-plans/PG-*.md` and bundle `INDEX.md` when the on-disk hash diverges from the stamped `PG.plan.plan_hash`. It strengthens the canon-safety perimeter; it does NOT weaken the Mystery Reserve firewall (the hook is content-agnostic — it verifies hash equality, not record content). The hook explicitly allows: fresh-bootstrap writes (no PG record yet), authorized re-stamping ceremony via `compute-pg-hashes` CLI, and any write whose post-edit hash matches the stamped value. HARD-GATE discipline (per `docs/HARD-GATE-DISCIPLINE.md`) governs canon-mutating skill invocations; Hook 6 governs the orthogonal write-path drift surface.

## Architecture Check

1. Implementing this as a Claude Code PreToolUse hook (mirroring Hook 3's pattern) is structurally cleaner than a CLI gate (pre-commit hook): the PreToolUse hook fires at the assistant-tool-invocation boundary where the failure mode actually occurs (LLM-driven direct Edit/Write between PG-stamping and INDEX update); a CLI gate would only fire at git-commit time, which is too late to prevent the assistant from leaving the working tree in a drifted state. The hook pattern is the same surface every other write protection rides on; no new infrastructure required.
2. No backwards-compatibility aliasing or shims — Hook 6 is net-new; Hook 3's allowance of story-markdown surfaces continues to be correct for non-PG markdown (rendered prose, storylets, etc.). The two hooks compose by domain rather than by override.

## Verification Layers

1. Hook source compiles and dispatches → codebase grep-proof + build: `cd tools/hooks && npm run build` succeeds; `tools/hooks/dist/src/hook6-guard-story-markdown-hash.js` exists; `grep -n 'hook6-guard-story-markdown-hash' .claude/settings.json.example` returns the new PreToolUse entry.
2. Hook test coverage → test run: `cd tools/hooks && npm test` passes with the 6 new test cases (block / allow / fresh-bootstrap / INDEX block / INDEX allow / unrelated-markdown).
3. Hash formula synchronization → manual review: the hook's hash-computation logic mirrors the live `compute-pg-hashes.ts` / `computePlanHash(planResult.bytes)` contract with a docstring at the hook's hash site pointing to the canonical source. The two surfaces compute identical SHA-256 values for the same raw plan bytes.

## Landed Changes

### 1. New hook source

Created `tools/hooks/src/hook6-guard-story-markdown-hash.ts`, following the structural pattern of `tools/hooks/src/hook3-guard-direct-edit.ts`:

- Import `readHookInput`, `emitPermissionDecision`, `type PreToolUseReadInput` from `./lib/hook-io.js`; import `logDecision` from `./lib/logging.js`; import `path` from `node:path`.
- `classifyPath(filePath)` returns one of three classifications:
  - `{ decision: "block" }` if the path matches `worlds/<slug>/stories/<story-slug>/pages-prose-plans/PG-<integer>.md` AND a corresponding `_source/pages/PG-<integer>.yaml` exists AND that PG record has a non-empty `plan.plan_hash` field that does NOT match the SHA-256 of the new file body. For `Edit` ops, compute the SHA-256 of the post-edit body the assistant intends to write (derive from `tool_input` parameters where the Edit's `new_string` replaces `old_string` in the current file body); for `Write` ops, compute the SHA-256 of `tool_input.content` directly.
  - `{ decision: "block" }` if the path matches `worlds/<slug>/stories/<story-slug>/INDEX.md` AND any referenced `PG-<integer>` plan in the corresponding bundle's `pages-prose-plans/` has a body whose SHA-256 does not match the corresponding `_source/pages/PG-<integer>.yaml` `plan.plan_hash`.
  - `{ decision: "allow" }` otherwise (including all fresh-bootstrap cases where no PG record exists yet, all matches between on-disk hash and stamped hash, and any path outside the two intercepted patterns).
- On `block`, the deny prose redirects to `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan <plan-path> --pg <pg-path>` for re-stamping, citing `.claude/skills/_shared-templates/story-state-contract.md:277` Phase 5a as the canonical write-order discipline.
- The hash computation mirrors the live `compute-pg-hashes.ts` contract (SHA-256 over the plan file's raw bytes, with no normalization or trimming) — either by importing a shared helper if one is available to the hooks package, OR by replicating the formula in the hook with a docstring at the hash site naming `compute-pg-hashes.ts` as the canonical source.

### 2. New hook test

Created `tools/hooks/tests/hook6-guard-story-markdown-hash.test.ts` following the structural pattern of `tools/hooks/tests/hook3-guard-direct-edit.test.ts` and using `_shared.ts` test helpers. Six test cases:

- `hook6_blocks_pg_plan_write_when_hash_mismatches` — fixture: PG record with `plan.plan_hash: "<H1>"`; pending Edit to the plan file would produce bytes whose SHA-256 is `<H2>`. Expect `decision: "deny"` with a redirect message naming `compute-pg-hashes.js`.
- `hook6_allows_pg_plan_write_when_hash_matches` — fixture: PG record with `plan.plan_hash: "<H1>"`; pending Edit produces bytes whose SHA-256 is `<H1>`. Expect no permission decision (allow).
- `hook6_allows_pg_plan_first_write_when_no_pg_record_exists` — fixture: write to `pages-prose-plans/PG-7.md` with no corresponding `_source/pages/PG-7.yaml`. Expect allow (fresh-bootstrap path).
- `hook6_blocks_index_update_when_referenced_plan_hash_mismatches` — fixture: bundle INDEX references `PG-1`; `PG-1`'s stamped `plan_hash` does not match the on-disk plan body. Expect deny.
- `hook6_allows_index_update_when_all_referenced_plan_hashes_match` — fixture: bundle INDEX references `PG-1` and `PG-2`; both stamped hashes match on-disk bytes. Expect allow.
- `hook6_allows_unrelated_markdown_writes` — fixture: write to `worlds/<slug>/stories/<story-slug>/pages-prose/PG-1.md` (rendered prose, not plan). Expect allow.

### 3. Settings registration

In `.claude/settings.json.example`, appended a new `PreToolUse` entry following the Hook 3 pattern:

```jsonc
{
  "_phase": 2,
  "_spec": "SPEC-40 Hook 6",
  "_purpose": "Block direct Edit/Write to pages-prose-plans/PG-*.md and bundle INDEX.md when stamped PG.plan.plan_hash does not match on-disk plan-body SHA-256. Redirect to compute-pg-hashes re-stamping CLI.",
  "matcher": "Edit|Write",
  "hooks": [
    {
      "type": "command",
      "command": "node tools/hooks/dist/src/hook6-guard-story-markdown-hash.js"
    }
  ]
}
```

### 4. Cross-reference updates

- `tools/hooks/README.md`: amend the Hook 3 description (or its accompanying allow-list paragraph) to clarify that story-markdown surfaces (`pages-prose-plans/`, bundle `INDEX.md`) are now hash-guarded by Hook 6 rather than unconditionally allowed; add a Hook 6 entry summarizing the new gate, its allowed-vs-blocked surfaces, and the canonical re-stamping CLI.
- `.claude/skills/_shared-templates/story-state-contract.md`: in the Phase 5a write-order discipline section (around line 277), add a note that direct-edit attempts on `pages-prose-plans/PG-*.md` and bundle `INDEX.md` are now Hook-6-blocked at the tool-invocation boundary; the existing skill-level plan-hash verification remains as a belt-and-suspenders check.
- `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 2: add a one-line note that direct-edit drift between prose-attach invocations is now hook-blocked.

## Files to Touch

- `tools/hooks/src/hook6-guard-story-markdown-hash.ts` (new)
- `tools/hooks/tests/hook6-guard-story-markdown-hash.test.ts` (new)
- `.claude/settings.json.example` (modify) — append new PreToolUse entry.
- `tools/hooks/README.md` (modify) — amend Hook 3 allow-list paragraph + add Hook 6 entry.
- `docs/HARD-GATE-DISCIPLINE.md` (modify) — clarify that plan markdown and bundle INDEX remain direct-write surfaces subject to Hook 6's hash guard.
- `.claude/skills/_shared-templates/story-state-contract.md` (modify) — add Hook 6 cross-reference in Phase 5a write-order discipline.
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify) — add Hook 6 cross-reference in Phase 2.

## Out of Scope

- No changes to validators, MCP retrieval surfaces, or patch-engine ops.
- No changes to existing Hooks 1-5.
- No new schema fields (the hook reads existing `PG.plan.plan_hash` and computes existing-format SHA-256).
- No changes to the canonical hash CLI's argument shape (`compute-pg-hashes.ts:15-40` already documents `--plan <path> --pg <path>`).
- No changes to the rendered-prose surface at `pages-prose/PG-*.md` — that surface remains allowed by both Hook 3 and Hook 6 (prose receipts are content artifacts, not hash-stamped engine artifacts).
- No CI extension to verify deployed `tools/hooks/dist/` parity (deferred to a future hook-deployment-currency spec per SPEC-40 §Risks).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/hooks && npm test` passes with the 6 new test cases above; each test's expected `decision` field matches the actual hook output.
2. `cd tools/hooks && npm run build` succeeds; `tools/hooks/dist/src/hook6-guard-story-markdown-hash.js` is produced.
3. Manual smoke: simulating a direct-edit attempt on `pages-prose-plans/PG-1.md` with a stamped PG record and drifted bytes emits a `decision: "deny"` permission decision; the deny prose names the `compute-pg-hashes.js` CLI for re-stamping.

### Invariants

1. PG plan-hash audit bridge is fail-closed at the tool-invocation boundary — direct Edit/Write on `pages-prose-plans/PG-<integer>.md` with a stamped PG record is denied when on-disk bytes diverge from `PG.plan.plan_hash`.
2. Hook 6 does not block Hook 3's existing scope (`_source/*.yaml`) nor Hook 3's existing allow-list scope outside the hash-guarded surfaces (rendered prose at `pages-prose/`, storylets, story-promotions remain allowed). The two hooks compose by domain.
3. Hook 6 hash formula matches the live `compute-pg-hashes.ts` / `computePlanHash(planResult.bytes)` contract byte-for-byte; the two surfaces compute identical SHA-256 values for the same raw plan bytes.

## Test Plan

### New/Modified Tests

1. `tools/hooks/tests/hook6-guard-story-markdown-hash.test.ts` (new) — six test cases covering block/allow/fresh-bootstrap/INDEX-block/INDEX-allow/unrelated-markdown shapes against fixtures built via `_shared.ts` helpers.

### Commands

1. `cd tools/hooks && npm test` — runs the full hooks test suite including the new Hook 6 tests.
2. `cd tools/hooks && npm run build` — produces `dist/src/hook6-guard-story-markdown-hash.js` for use in `.claude/settings.json` runtime registration.
3. `grep -n 'hook6-guard-story-markdown-hash' .claude/settings.json.example` — confirms the new PreToolUse entry registers Hook 6 in the canonical settings example.

## Outcome

Completed: 2026-05-17.

Implemented Hook 6 as `tools/hooks/src/hook6-guard-story-markdown-hash.ts` with compiled-script coverage in `tools/hooks/tests/hook6-guard-story-markdown-hash.test.ts`. The hook blocks drifted pending writes to `pages-prose-plans/PG-*.md`, blocks bundle `INDEX.md` updates while referenced PG plans are drifted, allows first-write/bootstrap cases with no PG record yet, and leaves unrelated story markdown such as `pages-prose/` untouched. The canonical settings example now registers the hook, the hooks README describes the six-hook inventory, and the HARD-GATE / shared story-state / prose-attach prose all name the Hook 6 hash guard.

Deviations from the original plan: reassessment corrected the hash contract from the drafted `compute-pg-hashes.ts:178-214` / CRLF-normalized wording to the live raw-byte `computePlanHash(planResult.bytes)` contract. The hook mirrors that live package boundary rather than importing from `tools/world-mcp`, because `tools/hooks` compiles with `rootDir: "."` and does not currently expose a cross-package helper.

## Verification Result

- `cd tools/hooks && npm run build` — passed. Produced `tools/hooks/dist/src/hook6-guard-story-markdown-hash.js`.
- `cd tools/hooks && npm test` — passed. The suite reported 28 passing tests, including the six Hook 6 cases for mismatch block, matching allow, first-write allow, INDEX mismatch block, INDEX matching allow, and unrelated markdown allow.
- `grep -n 'hook6-guard-story-markdown-hash' .claude/settings.json.example` — passed with the new PreToolUse command entry.
- `test -f tools/hooks/dist/src/hook6-guard-story-markdown-hash.js` — passed, confirming the built runtime entrypoint exists.
- Manual review confirmed the hook's `computePlanHash` mirrors `tools/world-mcp/src/cli/compute-pg-hashes.ts` / `computePlanHash(planResult.bytes)` as SHA-256 over raw plan bytes, without normalization or trimming.

## Deviations

- The active spec and ticket both contained stale CRLF-normalization phrasing. This ticket corrected those same-seam references to the live raw-byte hash contract before implementing the hook.
