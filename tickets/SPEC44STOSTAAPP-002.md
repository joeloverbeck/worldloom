# SPEC44STOSTAAPP-002: Remove 7 patch-engine lifecycle ops — enforce append-only supersession at the engine op-vocabulary level

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — removes 7 patch-engine ops (`tick_pressure_clock`, `resolve_pressure_clock`, `append_secret_clue_carrier`, `mark_secret_clue_discovered`, `reveal_story_secret`, `answer_story_question`, `abandon_story_question`); narrows `OPERATION_KINDS` surface in `tools/patch-engine/src/envelope/schema.ts`; removes the corresponding routing cases from `tools/patch-engine/src/commit/temp-file.ts` at TWO sites (lines 147-155 + 279-291); deletes 7 op-test files under `tools/patch-engine/tests/ops/`. Downstream impact on `tools/world-mcp/src/tools/describe-envelope-schema.ts` auto-resolves via its `package-interop.js` import of `OPERATION_KINDS` — no edit required.
**Deps**: None

## Problem

`tools/patch-engine/src/ops/tick-pressure-clock.ts`, `resolve-pressure-clock.ts`, `append-secret-clue-carrier.ts`, `mark-secret-clue-discovered.ts`, `reveal-story-secret.ts`, `answer-story-question.ts`, and `abandon-story-question.ts` all follow the same pattern: load an existing record's YAML file via `loadExistingRecordFile`, modify fields in memory, then call `stageExistingRecordFile` to stage a write to the **same path**. For example, `tick-pressure-clock.ts:96-101` directly assigns `loaded.record.value = nextValue` and pushes to `loaded.record.tick_history`, then stages the same `CLK-<N>.yaml` file. There is no new record id; the prior CLK state is overwritten on disk.

This violates FOUNDATIONS §Story Bundles §8 ("atomic YAML records remain append-only at the filesystem level, following the same record-append-only discipline that governs `_source/<world-subdir>/*.yaml`") and the story-state-contract §7 Gate 5 ("append-only delta — All changes in `SE.state_delta` are creates / supersessions / closes. No in-place mutation of a prior record"). The 7 ops are advertised to LLM callers via `describe_envelope_schema` (their schemas appear in `OPERATION_KINDS`), so an LLM authoring story moves can — and the turn-cycle skill currently does — choose them over the supersession path.

Removal closes the only authoring surface that bypassed the append-only gate. The correct authoring shape for CLK/STSEC/STQ lifecycle transitions uses the existing `supersede_clk_record` / `supersede_stsec_record` / `supersede_stq_record` ops (which route to `stageCreateStoryRecord` via `commit/temp-file.ts:271-278` and call `stageNewRecordFile` — they create a new record file with `supersedes: <prior_id>` set on the body; they do not mutate the prior record).

## Assumption Reassessment (2026-05-18)

1. All 7 op files exist at `tools/patch-engine/src/ops/` and follow the `stageExistingRecordFile` pattern; verified by the SPEC-44 brainstorm Agent 2 verbatim quote of each op's mutation logic. The shared helper `stageExistingRecordFile` is defined in `tools/patch-engine/src/ops/shared.ts`. All 7 paired op tests exist at `tools/patch-engine/tests/ops/{tick-pressure-clock,resolve-pressure-clock,append-secret-clue-carrier,mark-secret-clue-discovered,reveal-story-secret,answer-story-question,abandon-story-question}.test.ts` — verified by direct `ls`.
2. SPEC-44 §Problem Statement Defect 1 + §Approach Phase 2 + §Out of Scope (post-removal supersession only) drive the removal scope. `tools/patch-engine/src/envelope/schema.ts:61-107` enumerates `OPERATION_KINDS` with the 7 lifecycle ops appearing as `tick_pressure_clock`, `resolve_pressure_clock`, `append_secret_clue_carrier`, `mark_secret_clue_discovered`, `reveal_story_secret`, `answer_story_question`, `abandon_story_question`. `tools/patch-engine/src/commit/temp-file.ts` has the 7-op dispatch at TWO sites: lines 147-155 (likely validation/staging) AND lines 279-291 (likely application/commit).
3. **Cross-skill boundary under audit**: `.claude/skills/branching-story-turn-cycle/SKILL.md` consumes the patch-engine op vocabulary in its documented authoring path; removing the 7 ops invalidates any skill-prose reference to those op kinds. Ticket SPEC44STOSTAAPP-005 owns the corresponding skill-prose updates. `tools/world-mcp/src/tools/describe-envelope-schema.ts` imports `OPERATION_KINDS` from `package-interop.js` (per Agent 2 verbatim quote of the import line) — the removal propagates automatically without a direct edit to the world-mcp source.
4. **FOUNDATIONS principle**: §Story Bundles §8 (atomic YAML records append-only at the filesystem level) — the 7 ops are the only patch-engine surface that contradicts this rule; removal closes the bypass. §Story Bundles §7 Gate 5 (append-only delta — no in-place mutation) — the 7 ops are the only ops that produce in-place-mutation patch plans; their removal makes Gate 5 satisfiable by construction.
5. **Canon Safety surface touched**: `tools/patch-engine/src/ops/*` ops are part of the patch-engine that gates story-bundle record writes at engine pre-apply time. Per the per-ticket-type granularity rule, modifications to patch-engine op wiring (`tools/patch-engine/src/`) trigger item 5. The change does NOT weaken the Mystery Reserve firewall — secret-reveal, secret-clue-discovery, and pressure-clock-resolution will still be authorable via supersession; the firewall continues to gate forbidden-status `M` resolution at the canon-addition layer.
6. **Rename/remove blast radius** (renumbered from template item 7 — this is the 6th surviving Assumption Reassessment item): removing 7 op kinds from `OPERATION_KINDS` AND from the two `temp-file.ts` dispatch tables AND deleting 7 op source files AND deleting 7 op test files. Downstream blast: (a) `tools/world-mcp/src/tools/describe-envelope-schema.ts` auto-resolves via `package-interop` re-export — no direct edit needed; (b) turn-cycle skill prose covered by ticket SPEC44STOSTAAPP-005; (c) any test fixture under `tools/patch-engine/tests/` that referenced the 7 ops needs deletion alongside the op tests; (d) any helper imports of the 7 op modules in `tools/patch-engine/src/` (none expected — agent verification shows each op is self-contained), grep proof at acceptance time.

## Architecture Check

1. **Removal is preferable to deprecation or feature-flagging.** The 7 ops have no legitimate use case under the new contract; preserving them behind a "legacy mode" flag would invite continued in-place mutation and force the new validators to special-case both code paths. The clean removal is also recoverable: the deleted files remain in git history if a future reader needs to understand the prior shape.
2. **No backwards-compatibility shims or aliases introduced.** The new authoring path uses pre-existing ops (`supersede_clk_record` / `supersede_stsec_record` / `supersede_stq_record`), which were already routed through `stageCreateStoryRecord`. No alias path or fallback handler from the deleted op kinds to their supersession replacements — patch plans referencing the deleted ops fail at envelope schema validation (op kind not in `OPERATION_KINDS`).

## Verification Layers

1. **7 op files removed** → codebase grep-proof: `ls tools/patch-engine/src/ops/{tick-pressure-clock,resolve-pressure-clock,append-secret-clue-carrier,mark-secret-clue-discovered,reveal-story-secret,answer-story-question,abandon-story-question}.ts` returns "No such file or directory" for each.
2. **7 op kinds removed from `OPERATION_KINDS`** → codebase grep-proof: `grep -nE "tick_pressure_clock|resolve_pressure_clock|append_secret_clue_carrier|mark_secret_clue_discovered|reveal_story_secret|answer_story_question|abandon_story_question" tools/patch-engine/src/envelope/schema.ts` returns no matches.
3. **7 routing cases removed from `temp-file.ts` (both blocks)** → codebase grep-proof: `grep -nE "tick_pressure_clock|resolve_pressure_clock|append_secret_clue_carrier|mark_secret_clue_discovered|reveal_story_secret|answer_story_question|abandon_story_question" tools/patch-engine/src/commit/temp-file.ts` returns no matches at lines 147-155 or 279-291.
4. **`describe_envelope_schema` no longer advertises the 7 op kinds** → skill dry-run / schema validation: `node -e "const { OPERATION_KINDS } = require('./tools/patch-engine/dist/src/envelope/schema.js'); console.log(OPERATION_KINDS.filter(k => /^(tick_pressure_clock|resolve_pressure_clock|append_secret_clue_carrier|mark_secret_clue_discovered|reveal_story_secret|answer_story_question|abandon_story_question)$/.test(k)))"` returns `[]`.
5. **Patch-engine build succeeds** → `npm run build --prefix tools/patch-engine` exits 0 (no leftover imports of the 7 deleted op modules).
6. **Patch-engine test suite passes** → `npm test --prefix tools/patch-engine` exits 0 (the 7 op-test deletions remove the entire failing tests, not just orphan them).

## What to Change

### 1. Delete 7 lifecycle op source files

Delete from `tools/patch-engine/src/ops/`:
- `tick-pressure-clock.ts`
- `resolve-pressure-clock.ts`
- `append-secret-clue-carrier.ts`
- `mark-secret-clue-discovered.ts`
- `reveal-story-secret.ts`
- `answer-story-question.ts`
- `abandon-story-question.ts`

### 2. Remove 7 op kinds from `OPERATION_KINDS`

Edit `tools/patch-engine/src/envelope/schema.ts:61-107`. The `OPERATION_KINDS` array currently includes the 7 ops as string literals. Remove each of the 7 entries; preserve the remaining 39 op kinds in their current order.

### 3. Remove 7 routing cases from `temp-file.ts` at both sites

Edit `tools/patch-engine/src/commit/temp-file.ts`:
- Lines 147-155: remove the 7 `case "tick_pressure_clock":` ... `case "abandon_story_question":` entries from the first dispatch block. Preserve all other case entries and their fall-through handlers.
- Lines 279-291: remove the 7 `case "tick_pressure_clock":` ... `case "abandon_story_question":` entries from the second dispatch block. Same preservation rule.

If either block ends up empty after the removal, delete the block entirely (with its leading switch/branch label, if any).

### 4. Delete 7 op test files

Delete from `tools/patch-engine/tests/ops/`:
- `tick-pressure-clock.test.ts`
- `resolve-pressure-clock.test.ts`
- `append-secret-clue-carrier.test.ts`
- `mark-secret-clue-discovered.test.ts`
- `reveal-story-secret.test.ts`
- `answer-story-question.test.ts`
- `abandon-story-question.test.ts`

### 5. Audit for orphan imports

After step 1 deletions, grep `tools/patch-engine/src/` for any `import` statement referencing the 7 deleted op modules. None are expected (each op is self-contained per the agent verification), but the grep is the safety check: `grep -rn "from.*['\"].*ops/\\(tick-pressure-clock\\|resolve-pressure-clock\\|append-secret-clue-carrier\\|mark-secret-clue-discovered\\|reveal-story-secret\\|answer-story-question\\|abandon-story-question\\)" tools/patch-engine/src/`. Any match needs cleanup (remove the import + any usage).

### 6. Audit for fixture-level references

After step 4 deletions, grep `tools/patch-engine/tests/` for any fixture file (YAML, JSON, JS) referencing the 7 op kinds as string literals. Match → delete or update the fixture per its purpose.

## Files to Touch

- `tools/patch-engine/src/ops/tick-pressure-clock.ts` (delete)
- `tools/patch-engine/src/ops/resolve-pressure-clock.ts` (delete)
- `tools/patch-engine/src/ops/append-secret-clue-carrier.ts` (delete)
- `tools/patch-engine/src/ops/mark-secret-clue-discovered.ts` (delete)
- `tools/patch-engine/src/ops/reveal-story-secret.ts` (delete)
- `tools/patch-engine/src/ops/answer-story-question.ts` (delete)
- `tools/patch-engine/src/ops/abandon-story-question.ts` (delete)
- `tools/patch-engine/src/envelope/schema.ts` (modify — remove 7 OPERATION_KINDS entries)
- `tools/patch-engine/src/commit/temp-file.ts` (modify — remove 7 routing cases at two sites)
- `tools/patch-engine/tests/ops/tick-pressure-clock.test.ts` (delete)
- `tools/patch-engine/tests/ops/resolve-pressure-clock.test.ts` (delete)
- `tools/patch-engine/tests/ops/append-secret-clue-carrier.test.ts` (delete)
- `tools/patch-engine/tests/ops/mark-secret-clue-discovered.test.ts` (delete)
- `tools/patch-engine/tests/ops/reveal-story-secret.test.ts` (delete)
- `tools/patch-engine/tests/ops/answer-story-question.test.ts` (delete)
- `tools/patch-engine/tests/ops/abandon-story-question.test.ts` (delete)

## Out of Scope

- The new `no_story_state_in_place_mutation` validator that backstops this ticket at the pre-apply gate (ticket SPEC44STOSTAAPP-003).
- Renaming `supersede_clk_record` / `supersede_stsec_record` / `supersede_stq_record` to honestly reflect their create-with-supersedes semantics (per SPEC-44 §Out of Scope — cosmetic clarity at high downstream cost; documented in SPEC-44 §Key design decisions).
- Skill-prose updates in turn-cycle (ticket SPEC44STOSTAAPP-005).
- Touching `tools/world-mcp/src/tools/describe-envelope-schema.ts` (auto-resolves via `package-interop` re-export of `OPERATION_KINDS`).

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build --prefix tools/patch-engine` exits 0 — no compilation errors from orphan imports.
2. `npm test --prefix tools/patch-engine` exits 0 — the 7 deleted test files are removed; remaining tests pass.
3. `npm test --prefix tools/world-mcp` exits 0 — `describe-envelope-schema.ts` auto-resolves the OPERATION_KINDS narrowing via its `package-interop` import.

### Invariants

1. `OPERATION_KINDS` (in `tools/patch-engine/src/envelope/schema.ts`) contains no entry matching `^(tick_pressure_clock|resolve_pressure_clock|append_secret_clue_carrier|mark_secret_clue_discovered|reveal_story_secret|answer_story_question|abandon_story_question)$`.
2. `tools/patch-engine/src/ops/` contains no file whose name matches the 7 deleted op kinds.
3. `tools/patch-engine/src/commit/temp-file.ts` contains no `case "<deleted_op_kind>":` entry for any of the 7 op kinds at either of the two dispatch sites.
4. `describe_envelope_schema` MCP tool, when called, returns an `op_kinds` list that does not include the 7 deleted op kinds.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/ops/{7 op-test files}.test.ts` — deleted alongside the source files.
2. No new tests in this ticket — the new `no_story_state_in_place_mutation` validator (ticket SPEC44STOSTAAPP-003) provides positive coverage for the post-deletion contract.

### Commands

1. `npm run build --prefix tools/patch-engine` — compilation regression.
2. `npm test --prefix tools/patch-engine` — full patch-engine test suite.
3. `npm test --prefix tools/world-mcp` — full world-mcp test suite (catches any describe-envelope-schema-related regressions from the OPERATION_KINDS narrowing).
4. `grep -nE "tick_pressure_clock|resolve_pressure_clock|append_secret_clue_carrier|mark_secret_clue_discovered|reveal_story_secret|answer_story_question|abandon_story_question" tools/patch-engine/src/envelope/schema.ts tools/patch-engine/src/commit/temp-file.ts` — verification grep returns no matches.
