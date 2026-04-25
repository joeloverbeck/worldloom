# hooks

Claude Code hooks that make retrieval and mutation discipline structural rather than prose-asserted. Compiled from TypeScript in `src/` to `dist/` (gitignored); registered via `.claude/settings.json`.

**Design**: `specs/SPEC-05-hooks-discipline.md`
**Phase**: 1 (Hooks 1, 2, 4) + Phase 2 (Hooks 3, 5)
**Status**: All five hooks implemented. Hooks 1, 2, and 4 landed 2026-04-24; Hooks 3 and 5 landed 2026-04-26 per SPEC-05 Part B. Built hook entrypoints land at `dist/src/*.js`.

## Hook inventory

| # | Hook event | Purpose | Phase |
|---|---|---|---|
| 1 | `UserPromptSubmit` | Inject context preface (world slug, relevant nodes, size warnings) | 1 |
| 2 | `PreToolUse:Read` | Block wasteful reads of large world files; redirect to MCP | 1 |
| 3 | `PreToolUse:Edit\|Write` | Block direct mutation of `_source/*.yaml` records; redirect to `submit_patch_plan`. Allow `WORLD_KERNEL.md`, `ONTOLOGY.md`, `_source/<subdir>/README.md`, and hybrid artifacts (`characters/`, `diegetic-artifacts/`, `adjudications/`, `proposals/`, `audits/`). | 2 |
| 4 | `SubagentStart` | Bootstrap localization sub-agents with retrieval discipline | 1 |
| 5 | `PostToolUse:submit_patch_plan` | Auto-run `record_schema_compliance` + `id_uniqueness` + `cross_file_reference` + `touched_by_cf_completeness` against the just-written world; surface drift via `<system-reminder>` | 2 |

## Graceful degrade

If world index missing or MCP server unavailable, hooks pass through silently (with optional logging). No hook breaks Claude.

## Override

Hook 2 has an `ALLOW_FULL_READ` prompt-level override for human-driven review. Hook 3 has no override — engine writes bypass naturally via `fs.writeFile`.

## Logs

`tools/hooks/logs/` (gitignored). Decisions logged at info; failures at error.

## Testing

`npm test` builds the package and runs compiled-script tests for Hooks 1, 2, 3, 4, and 5 against synthetic hook payloads and fixture worlds. Hook 5 tests stub the `world-validate` CLI under a temp repo root so the validator runner is exercised without a real world index.
