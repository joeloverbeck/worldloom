# SPEC44STOSTAAPP-002: Remove 7 patch-engine lifecycle ops — enforce append-only supersession at the engine op-vocabulary level

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — removes 7 patch-engine ops (`tick_pressure_clock`, `resolve_pressure_clock`, `append_secret_clue_carrier`, `mark_secret_clue_discovered`, `reveal_story_secret`, `answer_story_question`, `abandon_story_question`); narrows `OPERATION_KINDS` and `PatchOperation` in `tools/patch-engine/src/envelope/schema.ts`; removes the corresponding routing cases from `tools/patch-engine/src/commit/temp-file.ts` at TWO sites (lines 147-155 + 279-291); deletes 7 op-test files under `tools/patch-engine/tests/ops/`; removes the same explicit operation-schema cases and capstone expectations from `tools/world-mcp`.
**Deps**: None

## Problem

At intake, `tools/patch-engine/src/ops/tick-pressure-clock.ts`, `resolve-pressure-clock.ts`, `append-secret-clue-carrier.ts`, `mark-secret-clue-discovered.ts`, `reveal-story-secret.ts`, `answer-story-question.ts`, and `abandon-story-question.ts` all followed the same pattern: load an existing record's YAML file via `loadExistingRecordFile`, modify fields in memory, then call `stageExistingRecordFile` to stage a write to the **same path**. For example, `tick-pressure-clock.ts:96-101` directly assigned `loaded.record.value = nextValue` and pushed to `loaded.record.tick_history`, then staged the same `CLK-<N>.yaml` file. There was no new record id; the prior CLK state was overwritten on disk.

This intake state violated FOUNDATIONS §Story Bundles §8 ("atomic YAML records remain append-only at the filesystem level, following the same record-append-only discipline that governs `_source/<world-subdir>/*.yaml`") and the story-state-contract §7 Gate 5 ("append-only delta — All changes in `SE.state_delta` are creates / supersessions / closes. No in-place mutation of a prior record"). The 7 ops were advertised to LLM callers via `describe_envelope_schema` because their schemas appeared in `OPERATION_KINDS`, so an LLM authoring story moves could choose them over the supersession path.

Removal closed the only engine operation surface that bypassed the append-only gate. The correct authoring shape for CLK/STSEC/STQ lifecycle transitions uses the existing `supersede_clk_record` / `supersede_stsec_record` / `supersede_stq_record` ops, which route to `stageCreateStoryRecord` and call `stageNewRecordFile` — they create a new record file with `supersedes: <prior_id>` set on the body; they do not mutate the prior record.

## Assumption Reassessment (2026-05-18)

1. All 7 op files exist at `tools/patch-engine/src/ops/` and follow the `stageExistingRecordFile` pattern; verified by the SPEC-44 brainstorm Agent 2 verbatim quote of each op's mutation logic. The shared helper `stageExistingRecordFile` is defined in `tools/patch-engine/src/ops/shared.ts`. All 7 paired op tests exist at `tools/patch-engine/tests/ops/{tick-pressure-clock,resolve-pressure-clock,append-secret-clue-carrier,mark-secret-clue-discovered,reveal-story-secret,answer-story-question,abandon-story-question}.test.ts` — verified by direct `ls`.
2. SPEC-44 §Problem Statement Defect 1 + §Approach Phase 2 + §Out of Scope (post-removal supersession only) drive the removal scope. `tools/patch-engine/src/envelope/schema.ts:61-107` enumerates `OPERATION_KINDS` with the 7 lifecycle ops appearing as `tick_pressure_clock`, `resolve_pressure_clock`, `append_secret_clue_carrier`, `mark_secret_clue_discovered`, `reveal_story_secret`, `answer_story_question`, `abandon_story_question`. `tools/patch-engine/src/commit/temp-file.ts` has the 7-op dispatch at TWO sites: lines 147-155 (likely validation/staging) AND lines 279-291 (likely application/commit).
3. **Cross-skill / cross-artifact boundary under audit**: `.claude/skills/branching-story-turn-cycle/SKILL.md` consumes the patch-engine op vocabulary in its documented authoring path; removing the 7 ops invalidates any skill-prose reference to those op kinds. Ticket SPEC44STOSTAAPP-005 owns the corresponding skill-prose updates. Live reassessment corrected the drafted `tools/world-mcp` assumption: `tools/world-mcp/src/tools/describe-envelope-schema.ts` imports `OPERATION_KINDS`, but also has explicit `operationSchema` cases for all 7 removed ops, and `tools/world-mcp/tests/integration/spec42-capstone.test.ts` asserts they remain exposed. Those same-seam consumer/proof surfaces move with this ticket.
4. **FOUNDATIONS principle**: §Story Bundles §8 (atomic YAML records append-only at the filesystem level) — the 7 ops are the only patch-engine surface that contradicts this rule; removal closes the bypass. §Story Bundles §7 Gate 5 (append-only delta — no in-place mutation) — the 7 ops are the only ops that produce in-place-mutation patch plans; their removal makes Gate 5 satisfiable by construction.
5. **Canon Safety surface touched**: `tools/patch-engine/src/ops/*` ops are part of the patch-engine that gates story-bundle record writes at engine pre-apply time. Per the per-ticket-type granularity rule, modifications to patch-engine op wiring (`tools/patch-engine/src/`) trigger item 5. The change does NOT weaken the Mystery Reserve firewall — secret-reveal, secret-clue-discovery, and pressure-clock-resolution will still be authorable via supersession; the firewall continues to gate forbidden-status `M` resolution at the canon-addition layer.
6. **Rename/remove blast radius** (renumbered from template item 7 — this is the 6th surviving Assumption Reassessment item): removing 7 op kinds from `OPERATION_KINDS` and the `PatchOperation` union, removing the two `temp-file.ts` dispatch tables, deleting 7 op source files, and deleting 7 op test files. Downstream blast: (a) remove the 7 explicit schema cases from `tools/world-mcp/src/tools/describe-envelope-schema.ts`; (b) update `tools/world-mcp/tests/integration/spec42-capstone.test.ts` so SPEC-42 continues to prove CLK/STSEC/STQ create/supersede surfaces while SPEC-44 removes lifecycle mutation ops; (c) turn-cycle skill prose remains covered by ticket SPEC44STOSTAAPP-005; (d) any helper imports of the 7 op modules in `tools/patch-engine/src/` need cleanup.

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
7. **World-MCP schema consumer succeeds** → `npm test --prefix tools/world-mcp` exits 0 after the explicit `describe_envelope_schema` cases and SPEC-42 capstone expectations are narrowed to create/supersede operation surfaces.

## Landed Changes

### 1. Deleted 7 lifecycle op source files

Deleted from `tools/patch-engine/src/ops/`:
- `tick-pressure-clock.ts`
- `resolve-pressure-clock.ts`
- `append-secret-clue-carrier.ts`
- `mark-secret-clue-discovered.ts`
- `reveal-story-secret.ts`
- `answer-story-question.ts`
- `abandon-story-question.ts`

### 2. Removed 7 op kinds from `OPERATION_KINDS` and `PatchOperation`

`tools/patch-engine/src/envelope/schema.ts` no longer includes the 7 ops in `OPERATION_KINDS`, their payload interfaces, or their `PatchOperation` union variants. The remaining op kinds preserve their existing order.

### 3. Removed 7 routing cases from `temp-file.ts` at both sites

`tools/patch-engine/src/commit/temp-file.ts` no longer imports the 7 deleted op handlers, maps their target-record metadata, or dispatches them through `stageOne`.

### 4. Deleted 7 op test files

Deleted from `tools/patch-engine/tests/ops/`:
- `tick-pressure-clock.test.ts`
- `resolve-pressure-clock.test.ts`
- `append-secret-clue-carrier.test.ts`
- `mark-secret-clue-discovered.test.ts`
- `reveal-story-secret.test.ts`
- `answer-story-question.test.ts`
- `abandon-story-question.test.ts`

### 5. Audited for orphan imports

Final source/test grep over the owned package paths returned no matches for the 7 retired op names or file basenames.

### 6. Audited for fixture-level references

Final source/test grep over `tools/patch-engine/tests/` returned no retired lifecycle-op references.

### 7. Truthed the world-mcp schema-introspection consumer

Removed the seven explicit lifecycle-op schema cases from `tools/world-mcp/src/tools/describe-envelope-schema.ts`. Updated `tools/world-mcp/tests/integration/spec42-capstone.test.ts` so it still proves the SPEC-42 record classes and create/supersede op exposure, but no longer expects retired lifecycle mutation ops to be present.

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
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify — remove 7 retired op schema cases)
- `tools/world-mcp/tests/integration/spec42-capstone.test.ts` (modify — narrow SPEC-42 operation expectations to create/supersede surfaces)
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
- Turn-cycle skill-prose updates in `.claude/skills/branching-story-turn-cycle/` (ticket SPEC44STOSTAAPP-005 owns the operational authoring documentation).

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build --prefix tools/patch-engine` exits 0 — no compilation errors from orphan imports.
2. `npm test --prefix tools/patch-engine` exits 0 — the 7 deleted test files are removed; remaining tests pass.
3. `npm test --prefix tools/world-mcp` exits 0 — `describe-envelope-schema.ts` and the SPEC-42 capstone reflect the narrowed operation vocabulary.

### Invariants

1. `OPERATION_KINDS` (in `tools/patch-engine/src/envelope/schema.ts`) contains no entry matching `^(tick_pressure_clock|resolve_pressure_clock|append_secret_clue_carrier|mark_secret_clue_discovered|reveal_story_secret|answer_story_question|abandon_story_question)$`.
2. `tools/patch-engine/src/ops/` contains no file whose name matches the 7 deleted op kinds.
3. `tools/patch-engine/src/commit/temp-file.ts` contains no `case "<deleted_op_kind>":` entry for any of the 7 op kinds at either of the two dispatch sites.
4. `describe_envelope_schema` MCP tool, when called, returns an `op_kinds` list that does not include the 7 deleted op kinds.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/ops/{7 op-test files}.test.ts` — deleted alongside the source files.
2. `tools/world-mcp/tests/integration/spec42-capstone.test.ts` — updated to prove create/supersede op exposure for CLK/STSEC/STQ without the retired lifecycle mutation ops.
3. No new tests in this ticket — the new `no_story_state_in_place_mutation` validator (ticket SPEC44STOSTAAPP-003) provides positive coverage for the post-deletion contract.

### Commands

1. `npm run build --prefix tools/patch-engine` — compilation regression.
2. `npm test --prefix tools/patch-engine` — full patch-engine test suite.
3. `npm test --prefix tools/world-mcp` — full world-mcp test suite (catches any describe-envelope-schema-related regressions from the OPERATION_KINDS narrowing).
4. `grep -nE "tick_pressure_clock|resolve_pressure_clock|append_secret_clue_carrier|mark_secret_clue_discovered|reveal_story_secret|answer_story_question|abandon_story_question" tools/patch-engine/src/envelope/schema.ts tools/patch-engine/src/commit/temp-file.ts` — verification grep returns no matches.

## Outcome (2026-05-18)

Completed. The 7 in-place story-state lifecycle operations were removed from the patch-engine public operation vocabulary, typed envelope union, staging dispatch, source modules, and package-local op tests. The remaining CLK/STSEC/STQ lifecycle path is create-with-`supersedes` through `create_*_record` / `supersede_*_record`, preserving the append-only story-bundle file discipline.

Live reassessment found that `tools/world-mcp/src/tools/describe-envelope-schema.ts` had explicit schema cases for the retired ops, contrary to the draft ticket's "auto-resolves" assumption. This ticket absorbed that same-seam consumer cleanup and narrowed the SPEC-42 capstone expectations to the surviving create/supersede operation surfaces. The operational turn-cycle skill prose remains active sibling work under `tickets/SPEC44STOSTAAPP-005.md`.

## Verification Result

Commands run, all passing:

1. `npm run clean --prefix tools/patch-engine`
2. `npm run clean --prefix tools/world-mcp`
3. `npm run build --prefix tools/patch-engine`
4. `npm test --prefix tools/patch-engine` — 82 tests passed.
5. `npm run build --prefix tools/world-mcp`
6. `npm test --prefix tools/world-mcp` — 399 tests passed.
7. `rg -n "tick_pressure_clock|resolve_pressure_clock|append_secret_clue_carrier|mark_secret_clue_discovered|reveal_story_secret|answer_story_question|abandon_story_question|tick-pressure-clock|resolve-pressure-clock|append-secret-clue-carrier|mark-secret-clue-discovered|reveal-story-secret|answer-story-question|abandon-story-question" tools/patch-engine/src tools/patch-engine/tests tools/world-mcp/src tools/world-mcp/tests` — no matches.
8. `node -e "import('./tools/patch-engine/dist/src/envelope/schema.js').then(({ OPERATION_KINDS }) => console.log(OPERATION_KINDS.filter(k => /^(tick_pressure_clock|resolve_pressure_clock|append_secret_clue_carrier|mark_secret_clue_discovered|reveal_story_secret|answer_story_question|abandon_story_question)$/.test(k))))"` — printed `[]`.

Ignored generated artifacts refreshed by proof commands: `tools/patch-engine/dist/` and `tools/world-mcp/dist/`. Existing package-local ignored artifacts remained ignored: `tools/patch-engine/node_modules/`, `tools/world-mcp/node_modules/`, and `tools/world-mcp/.secret`.

## Deviations

- The draft ticket claimed `tools/world-mcp/src/tools/describe-envelope-schema.ts` required no direct edit because it imports `OPERATION_KINDS`. Live source inspection showed explicit retired-op schema cases and a SPEC-42 capstone test expecting those ops, so the same-seam consumer/test cleanup was included.
- `.claude/skills/branching-story-turn-cycle/` still contains references to the retired lifecycle op names. That mismatch is intentionally left to active follow-up `tickets/SPEC44STOSTAAPP-005.md`, which owns the authoring-skill rewrite.
